//! Servidor relay WebSocket del Modo Aula.
//!
//! Modelo: la máquina del servidor (host) aloja este relay. La lógica de negocio
//! (aceptar solicitudes, asignar recursos, fusionar el proyecto) vive en el
//! cliente del host (React). Este relay solo enruta:
//!
//! - `identify`       → consumido por el relay (designa al host / registra clientes).
//! - `broadcast`      → host → envía `payload` a todos los clientes.
//! - `to-client`      → host → envía `payload` a un cliente concreto.
//! - `close-session`  → host → difunde `session-closed` y cierra a los clientes.
//! - Cualquier otro   → cliente → se reenvía al host tal cual.
//!
//! Un único servidor por sesión (un puerto por sala). Solo un host a la vez.

use std::collections::HashMap;

use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, watch, Mutex};
use tokio_tungstenite::tungstenite::Message as WsMessage;

type ConnMap = Mutex<HashMap<u64, mpsc::UnboundedSender<WsMessage>>>;
type ClientIdMap = Mutex<HashMap<String, u64>>;

fn log_to_file(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    let path = "C:\\Users\\bello\\.gemini\\antigravity-cli\\brain\\d2e47e50-b88d-41eb-bd40-b84ba8464866\\scratch\\classroom_rust.log";
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{}", msg);
    }
}

static RUNNING: Lazy<std::sync::atomic::AtomicBool> = Lazy::new(|| std::sync::atomic::AtomicBool::new(false));
static NEXT_ID: Lazy<std::sync::atomic::AtomicU64> = Lazy::new(|| std::sync::atomic::AtomicU64::new(1));
static HOST_ID: Lazy<Mutex<Option<u64>>> = Lazy::new(|| Mutex::new(None));
static CONNECTIONS: Lazy<ConnMap> = Lazy::new(|| Mutex::new(HashMap::new()));
static CLIENT_IDS: Lazy<ClientIdMap> = Lazy::new(|| Mutex::new(HashMap::new()));
static SHUTDOWN_TX: Lazy<Mutex<Option<watch::Sender<bool>>>> = Lazy::new(|| Mutex::new(None));

enum HandleResult {
    Continue,
    CloseConn,
    CloseSession,
}

/// Inicia el relay en `0.0.0.0:port`. Devuelve la dirección local.
pub async fn start_classroom_server(port: u16) -> Result<String, String> {
    if RUNNING.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("El servidor de aula ya está en ejecución.".to_string());
    }
    let listener = TcpListener::bind(("0.0.0.0", port))
        .await
        .map_err(|e| format!("No se pudo escuchar en el puerto {port}: {e}"))?;
    let addr = listener
        .local_addr()
        .map_err(|e| format!("Error obteniendo dirección: {e}"))?;

    // Reset de estado compartido
    {
        let mut conns = CONNECTIONS.lock().await;
        conns.clear();
    }
    {
        let mut ids = CLIENT_IDS.lock().await;
        ids.clear();
    }
    *HOST_ID.lock().await = None;
    NEXT_ID.store(1, std::sync::atomic::Ordering::SeqCst);

    let (shutdown_tx, shutdown_rx) = watch::channel(false);
    *SHUTDOWN_TX.lock().await = Some(shutdown_tx);
    RUNNING.store(true, std::sync::atomic::Ordering::SeqCst);

    tokio::spawn(accept_loop(listener, shutdown_rx));
    Ok(format!("{addr}"))
}

/// Detiene el relay y cierra todas las conexiones.
pub async fn stop_classroom_server() -> Result<(), String> {
    RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
    let mut guard = SHUTDOWN_TX.lock().await;
    if let Some(tx) = guard.take() {
        let _ = tx.send(true);
    }
    drop(guard);
    let conns = CONNECTIONS.lock().await;
    for (_, tx) in conns.iter() {
        let _ = tx.send(WsMessage::Close(None));
    }
    Ok(())
}

/// ¿Está el relay activo?
pub async fn is_classroom_running() -> bool {
    RUNNING.load(std::sync::atomic::Ordering::SeqCst)
}

async fn accept_loop(listener: TcpListener, mut shutdown_rx: watch::Receiver<bool>) {
    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => break,
            res = listener.accept() => {
                match res {
                    Ok((stream, _)) => {
                        let id = NEXT_ID.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                        log_to_file(&format!("[Rust Classroom] Connection accepted, id={}", id));
                        tokio::spawn(handle_conn(id, stream));
                    }
                    Err(_) => break,
                }
            }
        }
    }
    RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
}

async fn handle_conn(id: u64, stream: TcpStream) {
    let ws = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => {
            log_to_file(&format!("[Rust Classroom] WebSocket handshake success for id={}", id));
            ws
        }
        Err(e) => {
            log_to_file(&format!("[Rust Classroom] WebSocket handshake failed for id={}: {:?}", id, e));
            return;
        }
    };
    let (mut writer, mut reader) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<WsMessage>();
    CONNECTIONS.lock().await.insert(id, tx);

    let writer_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if writer.send(msg).await.is_err() {
                break;
            }
        }
    });

    let mut is_host = false;
    let mut client_id: Option<String> = None;

    while let Some(msg) = reader.next().await {
        match msg {
            Ok(WsMessage::Text(text)) => {
                let result = handle_incoming(id, &text, &mut is_host, &mut client_id).await;
                if matches!(result, HandleResult::CloseConn | HandleResult::CloseSession) {
                    break;
                }
            }
            Ok(WsMessage::Close(_)) => break,
            Err(_) => break,
            _ => {}
        }
    }

    log_to_file(&format!("[Rust Classroom] Cleaning up id={}", id));
    // Cleanup
    CONNECTIONS.lock().await.remove(&id);
    if let Some(cid) = &client_id {
        CLIENT_IDS.lock().await.remove(cid);
    }
    if is_host {
        *HOST_ID.lock().await = None;
        broadcast_to_clients(&json!({ "type": "session-closed" }).to_string()).await;
    } else if let Some(cid) = &client_id {
        send_to_host(&json!({ "type": "leave", "clientId": cid }).to_string()).await;
    }
    writer_task.abort();
}

async fn handle_incoming(
    id: u64,
    text: &str,
    is_host: &mut bool,
    client_id: &mut Option<String>,
) -> HandleResult {
    log_to_file(&format!("[Rust Classroom] id={} msg: {}", id, text));
    let value: Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return HandleResult::Continue,
    };
    let mtype = value.get("type").and_then(|t| t.as_str()).unwrap_or("");
    match mtype {
        "identify" => {
            let role = value.get("role").and_then(|r| r.as_str()).unwrap_or("");
            let cid = value
                .get("clientId")
                .and_then(|c| c.as_str())
                .unwrap_or("")
                .to_string();
            if role == "servidor" {
                let mut host = HOST_ID.lock().await;
                if host.is_some() {
                    return HandleResult::CloseConn; // solo un host por sesión
                }
                *host = Some(id);
                *is_host = true;
            } else if !cid.is_empty() {
                CLIENT_IDS.lock().await.insert(cid.clone(), id);
                *client_id = Some(cid);
            }
            HandleResult::Continue
        }
        "broadcast" => {
            if *is_host {
                if let Some(payload) = value.get("payload") {
                    broadcast_to_clients(&payload.to_string()).await;
                }
            }
            HandleResult::Continue
        }
        "to-client" => {
            if *is_host {
                let target = value
                    .get("clientId")
                    .and_then(|c| c.as_str())
                    .unwrap_or("")
                    .to_string();
                if let Some(payload) = value.get("payload") {
                    send_to_client(&target, &payload.to_string()).await;
                }
            }
            HandleResult::Continue
        }
        "close-session" => {
            if *is_host {
                broadcast_to_clients(&json!({ "type": "session-closed" }).to_string()).await;
                let conns = CONNECTIONS.lock().await;
                let to_close: Vec<u64> = conns
                    .keys()
                    .cloned()
                    .filter(|k| *k != id)
                    .collect();
                for cid2 in to_close {
                    if let Some(tx) = conns.get(&cid2) {
                        let _ = tx.send(WsMessage::Close(None));
                    }
                }
                return HandleResult::CloseSession;
            }
            HandleResult::Continue
        }
        _ => {
            // Mensaje de cliente → reenviar al host. Los mensajes del host de
            // tipo desconocido se ignoran.
            if !*is_host {
                send_to_host(text).await;
            }
            HandleResult::Continue
        }
    }
}

async fn broadcast_to_clients(text: &str) {
    let host_id = *HOST_ID.lock().await;
    let conns = CONNECTIONS.lock().await;
    for (cid, tx) in conns.iter() {
        if Some(*cid) == host_id {
            continue;
        }
        let _ = tx.send(WsMessage::Text(text.to_string().into()));
    }
}

async fn send_to_client(client_id: &str, text: &str) {
    let conns = CONNECTIONS.lock().await;
    let id = CLIENT_IDS.lock().await.get(client_id).cloned();
    if let Some(id) = id {
        if let Some(tx) = conns.get(&id) {
            let _ = tx.send(WsMessage::Text(text.to_string().into()));
        }
    }
}

async fn send_to_host(text: &str) {
    let host_id = *HOST_ID.lock().await;
    if let Some(id) = host_id {
        let conns = CONNECTIONS.lock().await;
        if let Some(tx) = conns.get(&id) {
            let _ = tx.send(WsMessage::Text(text.to_string().into()));
        }
    }
}

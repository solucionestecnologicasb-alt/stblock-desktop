# Guía de Compilación, Instalación y Actualización de STBlock en Chromebook

Esta guía documenta el flujo de trabajo completo para generar, instalar y actualizar **STBlock** en computadoras **Chromebook (ChromeOS)** sin afectar la versión de Windows.

---

## 1. ¿Cómo compilar el instalador para Chromebook?

Debido a que el entorno de desarrollo principal es Windows, la compilación de paquetes Linux (`.deb`) se realiza de manera automatizada y gratuita a través de **GitHub Actions**.

### Opción A: Compilación en la nube con GitHub CLI (Recomendado)
Desde tu terminal de PowerShell en `C:\stb`, ejecuta:

```powershell
# 1. Asegúrate de tener los últimos cambios subidos
git push origin main

# 2. Disparar el flujo de compilación en GitHub
gh workflow run "Build STBlock Chromebook (.deb)"
```

Para ver el progreso de la compilación en vivo:
```powershell
gh run watch
```

Una vez completada la compilación (aproximadamente 3-5 minutos), descarga el instalador generado a tu máquina local:
```powershell
gh run download --name stblock-chromebook-deb --dir dist-chromebook
```
El archivo quedará disponible en: `C:\stb\dist-chromebook\STBlock_<version>_amd64.deb`.

---

### Opción B: Compilación manual desde la web de GitHub
1. Ingresa a tu repositorio en GitHub: `https://github.com/solucionestecnologicasb-alt/stblock-desktop`.
2. Ve a la pestaña **Actions**.
3. En el menú lateral izquierdo, selecciona **Build STBlock Chromebook (.deb)**.
4. Haz clic en el botón desplegable **Run workflow** > **Run workflow**.
5. Al finalizar, entra en la ejecución y en la sección **Artifacts** descarga `stblock-chromebook-deb`.

---

### Opción C: Compilación local dentro de una máquina Linux o Chromebook
Si deseas compilar directamente dentro de la terminal de Linux de una Chromebook:
```bash
git clone https://github.com/solucionestecnologicasb-alt/stblock-desktop.git
cd stblock-desktop
chmod +x scripts/build-chromebook.sh
pnpm run build:chromebook
```
El archivo `.deb` se generará en `src-tauri/target/release/bundle/deb/`.

---

## 2. ¿Cómo instalar STBlock en la Chromebook?

Las Chromebooks ejecutan aplicaciones de escritorio a través de su entorno seguro de desarrollo Linux (*Crostini*).

### Paso 1: Activar el entorno Linux en la Chromebook
1. Abre **Configuración** de ChromeOS.
2. En el panel izquierdo, haz clic en **Avanzado** > **Desarrolladores**.
3. En la sección **Entorno de desarrollo Linux**, haz clic en **Activar**.
4. Asigna un nombre de usuario y selecciona el tamaño de disco recomendado (10 GB o más).
5. Espera a que termine la instalación.

### Paso 2: Instalar el paquete `.deb`
1. Transfiere el archivo `STBlock_<version>_amd64.deb` a la Chromebook (mediante pendrive USB, Google Drive o descarga directa).
2. Abre la aplicación **Archivos** de ChromeOS.
3. Mueve el archivo descargado a la carpeta **"Archivos de Linux"**.
4. Haz **doble clic** sobre el archivo `.deb`.
5. Se abrirá una ventana emergente: *«Instalar aplicación con Linux»*. Haz clic en **Instalar**.
6. ChromeOS mostrará una barra de progreso en la esquina inferior derecha.

### Paso 3: Abrir STBlock
1. Presiona la tecla **Buscar** (o el botón circular de inicio) para abrir el lanzador de aplicaciones.
2. Abre la carpeta **"Aplicaciones de Linux"**.
3. Haz clic en el icono de **STBlock**.
4. La aplicación abrirá como una ventana nativa independiente y funcionará **100% offline sin conexión a internet**.

---

## 3. Conexión de Hardware (Arduino / ESP32) en Chromebook

A diferencia de Windows, ChromeOS gestiona los dispositivos USB a través de un diálogo de seguridad:

1. Conecta la placa Arduino o ESP32 al puerto USB de la Chromebook.
2. En la esquina inferior derecha aparecerá una notificación:
   > **«Dispositivo USB detectado. ¿Conectar a Linux?»**
3. Haz clic en **Conectar a Linux** (o ve a *Configuración > Avanzado > Desarrolladores > Linux > Gestionar dispositivos USB* y activa la casilla de tu placa).
4. El script de post-instalación de STBlock ya configuró los permisos de usuario y reglas udev para:
   - Chips CH340 / CH341
   - Chips Silicon Labs CP210x
   - Chips FTDI
   - Microcontroladores Arduino Uno, Mega, Nano y ESP32
5. En STBlock, ve al **Modo Electrónica / Dispositivos**. El puerto `/dev/ttyUSB0` o `/dev/ttyACM0` aparecerá en la lista y podrás enviar código y abrir la consola serie normalmente.

---

## 4. Estructura de Archivos del Soporte Chromebook

```
C:\stb
├── .github/workflows/
│   └── build-chromebook.yml       # Compilación automática del .deb en GitHub
├── scripts/
│   ├── build-backends-linux.sh    # Compilador de Node SEA backend para Linux
│   └── build-chromebook.sh        # Script maestro de compilación Linux
├── src-tauri/
│   ├── linux/
│   │   └── postinstall.sh         # Configura permisos udev y grupo dialout
│   └── tauri.conf.json            # Configuración bundle.linux.deb agregada
└── dist-chromebook/               # Carpeta local con el .deb generado
```

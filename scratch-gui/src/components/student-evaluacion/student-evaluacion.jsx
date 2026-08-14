import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import styles from './student-evaluacion.css';

const StudentEvaluacionPlayer = ({onSetDeviceMode}) => {
    const [evalData, setEvalData] = useState(null);
    const fileInputRef = useRef(null);
    const iframeRef = useRef(null);

    // URL fija con versión para evitar bucles infinitos de renderizado
    const iframeUrl = "static/velxio/gears/editor/index.html?mode=student&v=0.1.13";

    // Cargar archivo desde el selector
    const handleFileLoad = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.ejercicios || !Array.isArray(data.ejercicios)) {
                    alert('El archivo no parece ser un JSON de Evaluación válido.');
                    return;
                }
                setEvalData(data);
            } catch (err) {
                alert('Error al leer el archivo JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Cargar archivo mediante arrastre y soltar (dropzone)
    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.ejercicios || !Array.isArray(data.ejercicios)) {
                    alert('El archivo no es un JSON de Evaluación válido.');
                    return;
                }
                setEvalData(data);
            } catch (err) {
                alert('Error al leer el archivo JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Registrar la evaluación activa en el objeto window para que el MenuBar aplique reglas de salida
    useEffect(() => {
        if (evalData) {
            window.stblockActiveEvaluation = {
                id: evalData.id,
                reglaSalida: evalData.reglaSalida || 'continuar',
                running: true
            };
            
        } else {
            window.stblockActiveEvaluation = null;
        }
        return () => {
            window.stblockActiveEvaluation = null;
        };
    }, [evalData]);

    // Escuchar mensajes provenientes del iframe
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'student-evaluacion-finished') {
                
                onSetDeviceMode('game');
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSetDeviceMode]);

    // Transmitir los datos cargados al iframe Gears cuando este cargue
    const handleIframeLoad = () => {
        if (iframeRef.current && evalData) {
            
            iframeRef.current.contentWindow.postMessage({
                type: 'load-student-evaluation',
                evaluation: evalData
            }, '*');
        }
    };

    // 1. Mostrar pantalla de carga con el Dropzone si no hay datos cargados
    if (!evalData) {
        return (
            <div className={styles.playerContainer}>
                <div className={styles.card} style={{textAlign: 'center', marginTop: '80px'}}>
                    <div style={{fontSize: '64px', marginBottom: '16px'}}>🎓</div>
                    <h1 className={styles.title}>Evaluaciones STBlock</h1>
                    <p className={styles.description}>
                        Bienvenido a la sección de evaluaciones. Carga el archivo JSON que te ha proporcionado tu tutor para iniciar tu prueba interactiva.
                    </p>

                    <div
                        className={styles.dropzone}
                        onClick={() => fileInputRef.current.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className={styles.dropzoneIcon}>📥</div>
                        <p className={styles.dropzoneText}>Arrastra y suelta tu archivo JSON aquí</p>
                        <p className={styles.dropzoneSubtext}>o haz clic para buscarlo en tu dispositivo</p>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{display: 'none'}}
                        accept=".json"
                        onChange={handleFileLoad}
                    />

                    <button
                        className={styles.btnSecondary}
                        onClick={() => onSetDeviceMode('game')}
                        style={{marginTop: '20px'}}
                    >
                        ← Volver al Panel Principal
                    </button>
                </div>
            </div>
        );
    }

    // 2. Cargar el iframe del alumno a pantalla completa
    return (
        <div style={{width: '100%', height: 'calc(100vh - 48px)', border: 'none', overflow: 'hidden'}}>
            <iframe
                ref={iframeRef}
                src={iframeUrl}
                style={{width: '100%', height: '100%', border: 'none'}}
                onLoad={handleIframeLoad}
            />
        </div>
    );
};

StudentEvaluacionPlayer.propTypes = {
    onSetDeviceMode: PropTypes.func.isRequired
};

export default StudentEvaluacionPlayer;

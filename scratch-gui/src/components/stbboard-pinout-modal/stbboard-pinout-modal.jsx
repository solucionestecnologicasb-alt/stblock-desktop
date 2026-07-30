import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './stbboard-pinout-modal.css';

// Import all individual component closeup images from src/branding/stbboard_v2
import imgFront from './branding/tarjeta adelante.png';
import imgBack from './branding/tarjeta atras.png';

import imgMpu6050 from './branding/6050.png';
import imgBateria from './branding/bateria.png';
import imgBoton1 from './branding/boton 1.png';
import imgBoton2 from './branding/boton 2.png';
import imgBoton3 from './branding/boton 3.png';
import imgBoton4 from './branding/boton 4.png';
import imgBoton5 from './branding/boton 5.png';
import imgBoton6 from './branding/boton 6.png';
import imgBuzzer from './branding/buzzer.png';
import imgEmisorIf from './branding/emisor if.png';
import imgEncendido from './branding/encendido-apagado.png';
import imgEntrada from './branding/entrada.png';
import imgHc05 from './branding/hc05.png';
import imgIna219 from './branding/ina219.png';
import imgLdr from './branding/ldr.png';
import imgMicrofono from './branding/microfono.png';
import imgMotorA1 from './branding/motor a1.png';
import imgMotorA2 from './branding/motor a2.png';
import imgMotorB3 from './branding/motor b3.png';
import imgMotorB4 from './branding/motor b4.png';
import imgOled from './branding/oled.png';
import imgPines from './branding/pines.png';
import imgPotenciometro from './branding/potenciometro.png';
import imgReceptorIf from './branding/receptor if.png';
import imgReset from './branding/reset.png';
import imgSensorTemp from './branding/sensor temperatura.png';
import imgUsb from './branding/usb.png';

// Import block images
import imgBlkBluetooth from './branding/bloque bluetooth.png';
import imgBlkBotones from './branding/bloque botones.png';
import imgBlkBuzzer from './branding/bloque buzzer.png';
import imgBlkGiroscopio from './branding/bloque giroscopio.png';
import imgBlkInfrarrojo from './branding/bloque infrarrojo.png';
import imgBlkLuz from './branding/bloque luz.png';
import imgBlkMicrofono from './branding/bloque microfono.png';
import imgBlkMotores from './branding/bloque motores.png';
import imgBlkOled from './branding/bloque oled.png';
import imgBlkPines from './branding/bloque pines.png';
import imgBlkTemperatura from './branding/bloque temperatura.png';

// Front hotspots definition
const frontHotspots = [
    { 
        id: 'oled', 
        name: 'Pantalla OLED', 
        labelName: 'OLED', 
        x: 79.8, 
        y: 58.2, 
        image: imgOled, 
        description: 'Pantalla gráfica OLED integrada de alta definición y bajo consumo. Es ideal para dibujar formas, mostrar estados, lecturas de sensores, depurar código o reproducir animaciones personalizadas.',
        pinDesc: 'Comunicación I2C, pines digitales 20 (SDA) y 21 (SCL).',
        blockName: 'OLED',
        blockImage: imgBlkOled
    },
    { 
        id: 'gyro', 
        name: 'Giroscopio MPU6050', 
        labelName: 'MPU6050', 
        x: 48.2, 
        y: 69.2, 
        image: imgMpu6050, 
        description: 'Unidad de medición inercial (IMU) de 6 ejes que integra giroscopio y acelerómetro. Te permite leer de manera sumamente precisa la orientación, ángulos de inclinación y aceleración del robot.',
        pinDesc: 'Comunicación I2C, pines digitales 20 (SDA) y 21 (SCL).',
        blockName: 'Giroscopio',
        blockImage: imgBlkGiroscopio
    },
    { 
        id: 'ldr', 
        name: 'Sensor de Luz LDR', 
        labelName: 'LDR', 
        x: 36.4, 
        y: 83.7, 
        image: imgLdr, 
        description: 'Fotorresistencia (LDR) de alta sensibilidad que varía su resistencia de acuerdo a la intensidad de luz ambiental. Es excelente para proyectos interactivos de control de luz, sombras y seguimiento de linternas.',
        pinDesc: 'Pin Analógico A15 (Lectura analógica).',
        blockName: 'Luz',
        blockImage: imgBlkLuz
    },
    { 
        id: 'temp', 
        name: 'Sensor Temp LM335', 
        labelName: 'LM335', 
        x: 45.1, 
        y: 82.8, 
        image: imgSensorTemp, 
        description: 'Sensor de temperatura analógico lineal de precisión. Entrega una señal de tensión de salida linealmente proporcional a la temperatura ambiental real.',
        pinDesc: 'Pin Analógico A14 (Lectura analógica).',
        blockName: 'Temperatura',
        blockImage: imgBlkTemperatura
    },
    { 
        id: 'mic', 
        name: 'Micrófono Analógico', 
        labelName: 'MIC', 
        x: 53.4, 
        y: 82.6, 
        image: imgMicrofono, 
        description: 'Módulo micrófono analógico integrado. Mide el volumen y la amplitud de las ondas sonoras circundantes, permitiendo que tu robot reaccione ante palmadas, sonidos fuertes o comandos de voz.',
        pinDesc: 'Pin Analógico A13 (Lectura analógica).',
        blockName: 'Microfono',
        blockImage: imgBlkMicrofono
    },
    { 
        id: 'pot', 
        name: 'Potenciómetro Analógico', 
        labelName: 'Potenciómetro', 
        x: 61.5, 
        y: 82.3, 
        image: imgPotenciometro, 
        description: 'Regulador mecánico para el arranque seguro y control de temporización de encendido en placa. Actúa como protección de corriente, permitiendo alargar o acortar el retardo de inicio de la tarjeta.',
        pinDesc: 'Sin pin de control (gestiona directamente la línea de alimentación de la tarjeta).',
        blockName: 'sin bloque de programación',
        blockImage: null
    },
    { 
        id: 'ir_emit', 
        name: 'Emisor Infrarrojo', 
        labelName: 'Emisor IR', 
        x: 39.1, 
        y: 130.0, 
        image: imgEmisorIf, 
        description: 'Diodo emisor de luz infrarroja (IR). Ideal para transmitir datos, emitir códigos de control remoto y controlar a distancia otros dispositivos receptores.',
        pinDesc: 'Pin de salida digital 44.',
        blockName: 'infrarrojo',
        blockImage: imgBlkInfrarrojo
    },
    { 
        id: 'ir_recv', 
        name: 'Receptor Infrarrojo', 
        labelName: 'TSOP (IR)', 
        x: 54.2, 
        y: 130.0, 
        image: imgReceptorIf, 
        description: 'Módulo receptor de luz infrarroja (TSOP) integrado. Altamente sensible a las señales de controles remotos comunes, perfecto para automatizar secuencias de control a distancia.',
        pinDesc: 'Pin de entrada digital 13.',
        blockName: 'infrarrojo',
        blockImage: imgBlkInfrarrojo
    },
    { 
        id: 'b1', 
        name: 'Botón B1', 
        labelName: 'B1', 
        x: 21.0, 
        y: 33.6, 
        image: imgBoton1, 
        description: 'Botón pulsador físico integrado B1. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 38.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'b2', 
        name: 'Botón B2', 
        labelName: 'B2', 
        x: 21.0, 
        y: 43.8, 
        image: imgBoton2, 
        description: 'Botón pulsador físico integrado B2. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 39.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'b3', 
        name: 'Botón B3', 
        labelName: 'B3', 
        x: 21.3, 
        y: 54.5, 
        image: imgBoton3, 
        description: 'Botón pulsador físico integrado B3. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 40.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'b4', 
        name: 'Botón B4', 
        labelName: 'B4', 
        x: 21.8, 
        y: 65.8, 
        image: imgBoton4, 
        description: 'Botón pulsador físico integrado B4. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 41.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'b5', 
        name: 'Botón B5', 
        labelName: 'B5', 
        x: 21.8, 
        y: 75.0, 
        image: imgBoton5, 
        description: 'Botón pulsador físico integrado B5. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 42.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'b6', 
        name: 'Botón B6', 
        labelName: 'B6', 
        x: 22.1, 
        y: 83.1, 
        image: imgBoton6, 
        description: 'Botón pulsador físico integrado B6. Permite la interacción directa de entrada con el usuario, ideal para arrancar programas, cambiar animaciones OLED o depurar estados.',
        pinDesc: 'Pin de entrada digital 43.',
        blockName: 'Botones',
        blockImage: imgBlkBotones
    },
    { 
        id: 'bluetooth', 
        name: 'Módulo Bluetooth', 
        labelName: 'Bluetooth', 
        x: 48.5, 
        y: 40.3, 
        image: imgHc05, 
        description: 'Módulo inalámbrico Bluetooth HC-05 de alta fiabilidad. Permite enviar y recibir información o telemetría bidireccional, y controlar el robot remotamente desde celulares o computadoras.',
        pinDesc: 'Pines digitales 17 (RX2) y 16 (TX2) por bus Serial2.',
        blockName: 'bluetooth',
        blockImage: imgBlkBluetooth
    },
    { 
        id: 'usb', 
        name: 'Puerto USB Tipo C', 
        labelName: 'USB C', 
        x: 21.3, 
        y: 130.0, 
        image: imgUsb, 
        description: 'Puerto de conexión USB Tipo C reforzado. Suministra alimentación general al circuito e integra la línea de programación de software de la tarjeta.',
        pinDesc: 'Sin pin asignado (conecta directo al microcontrolador a través del chip conversor serial CH340).',
        blockName: 'sin bloque asignado',
        blockImage: null
    }
];

// Back hotspots definition with duplicate Pines de Expansión
const backHotspots = [
    { 
        id: 'power', 
        name: 'Interruptor Encendido', 
        labelName: 'ON/OFF', 
        x: 67.3, 
        y: -10.0, 
        image: imgEncendido, 
        description: 'Switch deslizante físico de alimentación. Permite cortar o habilitar la corriente principal de la tarjeta de forma rápida, práctica y segura.',
        pinDesc: 'Sin pin asignado (controla mecánicamente la línea física de alimentación de la placa).',
        blockName: 'sin bloque de programación',
        blockImage: null
    },
    { 
        id: 'buzzer', 
        name: 'Zumbador Activo', 
        labelName: 'Zumbador', 
        x: 50.3, 
        y: 97.6, 
        image: imgBuzzer, 
        description: 'Zumbador activo piezoeléctrico de alta sonoridad. Genera alertas sonoras, beeps del sistema, melodías y efectos de sonido personalizados en tus rutinas de programación.',
        pinDesc: 'Pin de salida digital 12 (con soporte de modulación PWM para tonos).',
        blockName: 'Buzzer',
        blockImage: imgBlkBuzzer
    },
    { 
        id: 'ina219', 
        name: 'Monitor INA219', 
        labelName: 'INA219', 
        x: 51.6, 
        y: 65.5, 
        image: imgIna219, 
        description: 'Sensor inteligente de potencia INA219. Realiza el monitoreo dinámico del consumo de corriente de la placa y mide de forma precisa el nivel de voltaje de tu batería en tiempo real.',
        pinDesc: 'Comunicación I2C, pines digitales 20 (SDA) y 21 (SCL).',
        blockName: 'sin bloques asignados',
        blockImage: null
    },
    { 
        id: 'reset', 
        name: 'Botón de Reset', 
        labelName: 'RESET', 
        x: 24.2, 
        y: -10.0, 
        image: imgReset, 
        description: 'Botón físico para resetear la tarjeta. Detiene la ejecución del microcontrolador ATmega2560 de manera inmediata y vuelve a arrancar el programa desde el inicio.',
        pinDesc: 'Pin físico de Reset interno del ATmega2560.',
        blockName: 'sin bloque de programación',
        blockImage: null
    },
    { 
        id: 'motor_a1', 
        name: 'Puerto de Motor A1', 
        labelName: 'A1', 
        x: 23.4, 
        y: 112.0, 
        image: imgMotorA1, 
        description: 'Conector rápido para motor DC de corriente continua con encoder de retroalimentación integrado. Proporciona tracción de alta potencia al motor A1 con control de velocidad y trayectoria precisa.',
        pinDesc: 'Operación digital mediante bus de comunicación Serial (secundado por coprocesador ATtiny328).',
        blockName: 'motores',
        blockImage: imgBlkMotores
    },
    { 
        id: 'motor_a2', 
        name: 'Puerto de Motor A2', 
        labelName: 'A2', 
        x: 32.5, 
        y: 112.0, 
        image: imgMotorA2, 
        description: 'Conector rápido para motor DC de corriente continua con encoder de retroalimentación integrado. Proporciona tracción de alta potencia al motor A2 con control de velocidad y trayectoria precisa.',
        pinDesc: 'Operación digital mediante bus de comunicación Serial (secundado por coprocesador ATtiny328).',
        blockName: 'motores',
        blockImage: imgBlkMotores
    },
    { 
        id: 'motor_b3', 
        name: 'Puerto de Motor B3', 
        labelName: 'B3', 
        x: 66.0, 
        y: 112.0, 
        image: imgMotorB3, 
        description: 'Conector rápido para motor DC de corriente continua con encoder de retroalimentación integrado. Proporciona tracción de alta potencia al motor B3 con control de velocidad y trayectoria precisa.',
        pinDesc: 'Operación digital mediante bus de comunicación Serial (secundado por coprocesador ATtiny328).',
        blockName: 'motores',
        blockImage: imgBlkMotores
    },
    { 
        id: 'motor_b4', 
        name: 'Puerto de Motor B4', 
        labelName: 'B4', 
        x: 76.1, 
        y: 112.0, 
        image: imgMotorB4, 
        description: 'Conector rápido para motor DC de corriente continua con encoder de retroalimentación integrado. Proporciona tracción de alta potencia al motor B4 con control de velocidad y trayectoria precisa.',
        pinDesc: 'Operación digital mediante bus de comunicación Serial (secundado por coprocesador ATtiny328).',
        blockName: 'motores',
        blockImage: imgBlkMotores
    },
    { 
        id: 'bateria_back', 
        name: 'Puerto Batería Lipo', 
        labelName: 'BATERÍA', 
        x: 49.5, 
        y: -5.0, 
        image: imgBateria, 
        description: 'Puerto de alimentación principal diseñado para baterías LiPo de celdas recargables (voltaje recomendado de entrada 8.4V). Provee el suministro energético necesario para mover tus motores y sensores.',
        pinDesc: 'Sin pin asignado (conector físico directo al bus de energía de la tarjeta).',
        blockName: 'sin bloque de programación',
        blockImage: null
    },
    { 
        id: 'pines_back', 
        name: 'Pines de Expansión', 
        labelName: 'EXPANSIÓN', 
        x: 21.0, 
        y: 53.0, 
        image: imgPines, 
        description: 'Zócalo de expansión izquierdo para la integración de sensores analógicos/digitales y actuadores adicionales. Organizado por puertos configurables de fácil conexión.',
        pinDesc: 'Múltiples entradas y salidas digitales y analógicas agrupadas.',
        blockName: 'Diferentes bloques, interactúa por su pin o por el número del puerto',
        blockImage: imgBlkPines,
        ports: [
            { number: 1, pins: '1(VCC) / 2(RX0) / 3(TX0) / 4(SCL) / 5(SDA) / 6(D25) / 7(D26) / 8(GND)' },
            { number: 2, pins: '1(VCC) / 2(A14) / 3(A15) / 4(D46) / 5(D37) / 6(SCL) / 7(SDA) / 8(GND)' },
            { number: 3, pins: '1(VCC) / 2(A12) / 3(A13) / 4(D45) / 5(D36) / 6(SCL) / 7(SDA) / 8(GND)' },
            { number: 4, pins: '1(VCC) / 2(A10) / 3(A11) / 4(D9)  / 5(D35) / 6(SCL) / 7(SDA) / 8(GND)' },
            { number: 5, pins: '1(VCC) / 2(A8)  / 3(A9)  / 4(D8)  / 5(D34) / 6(SCL) / 7(SDA) / 8(GND)' }
        ]
    },
    { 
        id: 'pines_back_2', 
        name: 'Pines de Expansión', 
        labelName: 'EXPANSIÓN', 
        x: 80.0, 
        y: 53.0, 
        image: imgPines, 
        description: 'Zócalo de expansión derecho para la integración de sensores analógicos/digitales y actuadores adicionales. Organizado por puertos configurables de fácil conexión.',
        pinDesc: 'Múltiples entradas y salidas digitales y analógicas agrupadas.',
        blockName: 'Diferentes bloques, interactúa por su pin o por el número del puerto',
        blockImage: imgBlkPines,
        ports: [
            { number: 6, pins: '1(GND) / 2(D28) / 3(D27) / 4(SDA) / 5(SCL) / 6(RX2) / 7(TX2) / 8(VCC)' },
            { number: 7, pins: '1(GND) / 2(SDA) / 3(SCL) / 4(D29) / 5(D4)  / 6(A1)  / 7(A0)  / 8(VCC)' },
            { number: 8, pins: '1(GND) / 2(SDA) / 3(SCL) / 4(D49) / 5(D5)  / 6(A0)  / 7(A2)  / 8(VCC)' },
            { number: 9, pins: '1(GND) / 2(SDA) / 3(SCL) / 4(D32) / 5(D6)  / 6(A5)  / 7(A4)  / 8(VCC)' },
            { number: 10, pins: '1(GND) / 2(SDA) / 3(SCL) / 4(D33) / 5(D7)  / 6(A7)  / 7(A6)  / 8(VCC)' }
        ]
    }
];

const StbBoardPinoutModal = ({onClose}) => {
    const [view, setView] = useState('front');
    const [selectedId, setSelectedId] = useState(null);

    const hotspots = view === 'front' ? frontHotspots : backHotspots;
    const selectedHotspot = hotspots.find(hs => hs.id === selectedId);

    const handleViewChange = (newView) => {
        setView(newView);
        setSelectedId(null);
    };

    const handleOutsideClick = () => {
        setSelectedId(null);
    };

    const portColors = ['#1ebb58', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

    return (
        <div className={styles.modalOverlay} onClick={handleOutsideClick}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerTitle}>
                        <span className={styles.headerTag}>STBoard V2</span>
                        <h2 className={styles.headerMainTitle}>Mapa de Pines</h2>
                    </div>

                    {/* Centered Switcher */}
                    <div className={styles.viewTabs}>
                        <button 
                            className={classNames(styles.tabBtn, {[styles.tabBtnActive]: view === 'front'})}
                            onClick={() => handleViewChange('front')}
                        >
                            Vista Delante
                        </button>
                        <button 
                            className={classNames(styles.tabBtn, {[styles.tabBtnActive]: view === 'back'})}
                            onClick={() => handleViewChange('back')}
                        >
                            Vista Atrás
                        </button>
                    </div>

                    <button className={styles.closeBtn} onClick={onClose} title="Cerrar">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className={styles.modalBody}>
                    
                    {/* Board Image view */}
                    <div className={classNames(styles.boardColumn, {[styles.boardColumnFull]: !selectedHotspot})}>
                        
                        <div className={styles.boardFrame}>
                            
                            {/* Scale-unified Board Wrapper */}
                            <div className={styles.boardWrapper}>
                                <img 
                                    src={view === 'front' ? imgFront : imgBack} 
                                    alt="STBoard V2"
                                    className={styles.boardImg}
                                    draggable="false"
                                />
                                
                                {/* Overlay container for hotspots */}
                                <div className={styles.hotspotsOverlay}>
                                    {hotspots.map((hs) => {
                                        const isActive = selectedId === hs.id;
                                        return (
                                            <div 
                                                key={hs.id}
                                                className={classNames(styles.hotspot, {
                                                    [styles.hotspotActive]: isActive
                                                })}
                                                style={{left: `${hs.x}%`, top: `${hs.y}%`}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedId(hs.id);
                                                }}
                                            >
                                                <div className={styles.pulsar}></div>
                                                <div className={styles.dot}>
                                                    <span className={styles.dotLabel}>{hs.labelName}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* Sidebar Inspector Panel */}
                    {selectedHotspot && (
                        <div className={styles.sidebarColumn} onClick={(e) => e.stopPropagation()}>
                            
                            <div className={styles.inspectorContainer}>
                                
                                <div className={styles.inspectorHeader}>
                                    <h3 className={styles.inspectorTitle}>{selectedHotspot.name}</h3>
                                    <button className={styles.miniCloseBtn} onClick={() => setSelectedId(null)} title="Ocultar panel">
                                        ✕
                                    </button>
                                </div>

                                {/* Closeup image */}
                                <div className={styles.closeupFrame}>
                                    <img 
                                        src={selectedHotspot.image} 
                                        alt={selectedHotspot.name}
                                        className={styles.closeupImg}
                                        draggable="false"
                                    />
                                </div>

                                {/* Cleaned Detailed Description */}
                                <p className={styles.inspectorDesc}>
                                    {selectedHotspot.description}
                                </p>

                                {/* Structured Ports rendering for expansion pins */}
                                {selectedHotspot.ports && (
                                    <div className={styles.portsContainer}>
                                        {selectedHotspot.ports.map((port, idx) => {
                                            const accentColor = portColors[idx % portColors.length];
                                            return (
                                                <div 
                                                    key={port.number} 
                                                    className={styles.portBlock}
                                                    style={{ borderLeftColor: accentColor }}
                                                >
                                                    <div className={styles.portHeader}>
                                                        <span 
                                                            className={styles.portBadge}
                                                            style={{ 
                                                                backgroundColor: `${accentColor}12`, 
                                                                color: accentColor, 
                                                                borderColor: `${accentColor}30` 
                                                            }}
                                                        >
                                                            PUERTO {port.number}
                                                        </span>
                                                    </div>
                                                    <div className={styles.portPins}>
                                                        {port.pins.split(' / ').map((pinStr, i) => (
                                                            <span key={i} className={styles.pinDetailBadge}>
                                                                {pinStr}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Specs List */}
                                <div className={styles.specsList}>
                                    
                                    {/* Pin ATmega2560 */}
                                    <div className={styles.detailItem}>
                                        <div className={styles.detailLabel}>Pin ATmega2560:</div>
                                        <div className={styles.detailValue}>
                                            {selectedHotspot.pinDesc}
                                        </div>
                                    </div>

                                    {/* Nombre en bloque */}
                                    {selectedHotspot.blockName && !selectedHotspot.blockName.toLowerCase().includes('sin bloque') && (
                                        <div className={styles.detailItem}>
                                            <div className={styles.detailLabel}>Nombre en bloque:</div>
                                            <div className={styles.detailValue}>
                                                {selectedHotspot.blockName}
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Block Image container */}
                                {selectedHotspot.blockImage && (
                                    <div className={styles.blockImageFrame}>
                                        <div className={styles.blockImageHeader}>Bloque en STBlock</div>
                                        <img 
                                            src={selectedHotspot.blockImage} 
                                            alt="Bloque de programación"
                                            className={styles.blockImage}
                                            draggable="false"
                                        />
                                    </div>
                                )}

                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

StbBoardPinoutModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default StbBoardPinoutModal;

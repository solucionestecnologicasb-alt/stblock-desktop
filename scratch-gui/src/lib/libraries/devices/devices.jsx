import unselectDeviceIconURL from './unselectDevice/unselectDevice.png';
import arduinoUnoIconURL from './arduinoUno/arduinoUno.png';
import arduinoNanoIconURL from './arduinoNano/arduinoNano.png';
import arduinoLeonardoIconURL from './arduinoLeonardo/arduinoLeonardo.png';
import arduinoMega2560IconURL from './arduinoMega2560/arduinoMega2560.png';
import arduinoUnoR4MinimaIconURL from './arduinoUnoR4Minima/arduinoUnoR4Minima.png';
import arduinoUnoR4WifiIconURL from './arduinoUnoR4Wifi/arduinoUnoR4Wifi.png';
import microbitIconURL from './microbit/microbit.png';
import microbitV2IconURL from './microbitV2/microbitV2.png';
import esp32IconURL from './esp32/esp32.png';
import esp32S3IconURL from './esp32S3/esp32S3.png';
import esp8266NodeMCUIconURL from './esp8266NodeMCU/esp8266NodeMCU.png';
import k210MaixDockIconURL from './k210MaixDock/k210MaixDock.png';
import k210MaixduinoIconURL from './k210Maixduino/k210Maixduino.png';
import raspberryPiPicoIconURL from './raspberryPiPico/raspberryPiPico.png';
import raspberryPiPicoWIconURL from './raspberryPiPicoW/raspberryPiPicoW.png';
import raspberryPiPico2IconURL from './raspberryPiPico2/raspberryPiPico2.png';
import raspberryPiPico2WIconURL from './raspberryPiPico2W/raspberryPiPico2W.png';
import stBoardExtensionIconURL from './stBoardExtension/stboard-extension.jpg';
import stbBoardV2IconURL from './stbBoardV2/stbboard-v2.png';

const DEVICE_TYPES = {
    arduino: 'arduino',
    microbit: 'microbit',
    microPython: 'microPython'
};

const deviceData = [
    {
        name: 'Deseleccionar dispositivo',
        deviceId: 'null',
        iconURL: unselectDeviceIconURL,
        description: 'Volver al modo Scratch puro.',
        type: null,
        featured: true
    },
    {
        name: 'Arduino Uno',
        deviceId: 'arduinoUno',
        manufactor: 'arduino.cc',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoUnoIconURL,
        description: 'Una gran placa para comenzar con electrónica y programación.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['realtime', 'upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'STBoard Extension',
        deviceId: 'stBoardExtension',
        manufactor: 'STB',
        type: DEVICE_TYPES.arduino,
        iconURL: stBoardExtensionIconURL,
        description: 'Extensión STBoard basada en Arduino Uno.',
        featured: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['realtime', 'upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Arduino Nano',
        deviceId: 'arduinoNano',
        manufactor: 'arduino.cc',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoNanoIconURL,
        description: 'Placa pequeña clásica para tus proyectos.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['realtime', 'upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Arduino Leonardo',
        deviceId: 'arduinoLeonardo',
        manufactor: 'arduino.cc',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoLeonardoIconURL,
        description: 'Puede actuar como ratón o teclado.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Arduino Mega 2560',
        deviceId: 'arduinoMega2560',
        manufactor: 'arduino.cc',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoMega2560IconURL,
        description: '54 pines digitales, 16 entradas analógicas, 4 puertos serie.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['realtime', 'upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'STBoard V2',
        deviceId: 'stbBoardV2',
        manufactor: 'STB',
        type: DEVICE_TYPES.arduino,
        iconURL: stbBoardV2IconURL,
        description: 'STBoard V2 basada en Arduino Mega 2560.',
        featured: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['realtime', 'upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Arduino Uno R4 Minima',
        deviceId: 'arduinoUnoR4Minima',
        manufactor: 'arduino',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoUnoR4MinimaIconURL,
        description: 'Rendimiento mejorado, memoria expandida.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Arduino Uno R4 WiFi',
        deviceId: 'arduinoUnoR4Wifi',
        manufactor: 'arduino',
        type: DEVICE_TYPES.arduino,
        iconURL: arduinoUnoR4WifiIconURL,
        description: 'Wi-Fi, Bluetooth, matriz LED 12x8 integrada.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'ESP32',
        deviceId: 'arduinoEsp32',
        manufactor: 'espressif',
        type: DEVICE_TYPES.arduino,
        iconURL: esp32IconURL,
        description: 'Placa de control con Wi-Fi y Bluetooth.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'ESP32-S3',
        deviceId: 'arduinoEsp32S3',
        manufactor: 'espressif',
        type: DEVICE_TYPES.arduino,
        iconURL: esp32S3IconURL,
        description: 'Acelerador de IA, periféricos avanzados, IoT de bajo consumo.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'NodeMCU',
        deviceId: 'arduinoEsp8266NodeMCU',
        manufactor: 'espressif',
        type: DEVICE_TYPES.arduino,
        iconURL: esp8266NodeMCUIconURL,
        description: 'Placa de control Wi-Fi SoC de bajo costo.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '76800',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'MaixDock',
        deviceId: 'arduinoK210MaixDock',
        manufactor: 'sipeed',
        type: DEVICE_TYPES.arduino,
        iconURL: k210MaixDockIconURL,
        description: 'Placa básica con chip K210 RISC-V.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Maixduino',
        deviceId: 'arduinoK210Maixduino',
        manufactor: 'sipeed',
        type: DEVICE_TYPES.arduino,
        iconURL: k210MaixduinoIconURL,
        description: 'Placa K210 RISC-V con ESP32 integrado.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Raspberry Pi Pico',
        deviceId: 'arduinoRaspberryPiPico',
        manufactor: 'Raspberry Pi Foundation',
        type: DEVICE_TYPES.arduino,
        iconURL: raspberryPiPicoIconURL,
        description: 'Placa microcontroladora amigable y fácil de usar.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Raspberry Pi Pico W',
        deviceId: 'arduinoRaspberryPiPicoW',
        manufactor: 'Raspberry Pi Foundation',
        type: DEVICE_TYPES.arduino,
        iconURL: raspberryPiPicoWIconURL,
        description: 'Pico con Wi-Fi y Bluetooth 5.2 integrados.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Raspberry Pi Pico 2',
        deviceId: 'arduinoRaspberryPiPico2',
        manufactor: 'Raspberry Pi Foundation',
        type: DEVICE_TYPES.arduino,
        iconURL: raspberryPiPico2IconURL,
        description: 'MCU dual-core de alto rendimiento.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Raspberry Pi Pico 2 W',
        deviceId: 'arduinoRaspberryPiPico2W',
        manufactor: 'Raspberry Pi Foundation',
        type: DEVICE_TYPES.arduino,
        iconURL: raspberryPiPico2WIconURL,
        description: 'Wi-Fi y Bluetooth integrados para IoT.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '9600',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['arduino']
    },
    {
        name: 'Micro:bit',
        deviceId: 'microbit',
        manufactor: 'microbit.org',
        type: DEVICE_TYPES.microbit,
        iconURL: microbitIconURL,
        description: 'El ordenador de bolsillo que transforma habilidades digitales.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['microPython']
    },
    {
        name: 'Micro:bit V2',
        deviceId: 'microbitV2',
        manufactor: 'microbit.org',
        type: DEVICE_TYPES.microbit,
        iconURL: microbitV2IconURL,
        description: 'Procesador mejorado, altavoz, micrófono, logo táctil.',
        featured: true,
        serialportRequired: true,
        defaultBaudRate: '115200',
        programMode: ['upload'],
        defaultProgramMode: 'upload',
        tags: ['microPython']
    }
];

// Device startup event block mapping
const eventBlock = {
    [DEVICE_TYPES.arduino]: '<block type="arduino_whenArduinoBegin"/>',
    [DEVICE_TYPES.microPython]: '<block type="event_whenmicropythonbegin"/>',
    [DEVICE_TYPES.microbit]: '<block type="microbit_whenmicrobitbegin"/>'
};

export {
    deviceData as default,
    DEVICE_TYPES,
    eventBlock
};

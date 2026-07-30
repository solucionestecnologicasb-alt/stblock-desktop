const DEVICE_PROFILES = {
    arduinoUno: {platform: 'arduino:avr', fqbn: 'arduino:avr:uno'},
    stBoardExtension: {platform: 'arduino:avr', fqbn: 'arduino:avr:uno'},
    arduinoNano: {platform: 'arduino:avr', fqbn: 'arduino:avr:nano:cpu=atmega328old'},
    arduinoLeonardo: {platform: 'arduino:avr', fqbn: 'arduino:avr:leonardo'},
    arduinoMega2560: {platform: 'arduino:avr', fqbn: 'arduino:avr:mega:cpu=atmega2560'},
    stbBoardV2: {platform: 'arduino:avr', fqbn: 'arduino:avr:mega:cpu=atmega2560'},
    arduinoUnoR4Minima: {platform: 'arduino:renesas_uno', fqbn: 'arduino:renesas_uno:minima'},
    arduinoUnoR4Wifi: {platform: 'arduino:renesas_uno', fqbn: 'arduino:renesas_uno:unor4wifi'},
    arduinoEsp32: {platform: 'esp32:esp32', fqbn: 'esp32:esp32:esp32'},
    arduinoEsp32S3: {platform: 'esp32:esp32', fqbn: 'esp32:esp32:esp32s3'},
    arduinoEsp8266NodeMCU: {platform: 'esp8266:esp8266', fqbn: 'esp8266:esp8266:generic:baud=921600'},
    arduinoK210MaixDock: {
        platform: 'Maixduino:k210',
        fqbn: 'Maixduino:k210:m1:toolsloc=default,clksrc=400,burn_baudrate=2000000,burn_tool_firmware=dan'
    },
    arduinoK210Maixduino: {
        platform: 'Maixduino:k210',
        fqbn: 'Maixduino:k210:mduino:toolsloc=default,clksrc=400,burn_baudrate=1500000,burn_tool_firmware=mduino'
    },
    arduinoRaspberryPiPico: {platform: 'rp2040:rp2040', fqbn: 'rp2040:rp2040:rpipico'},
    arduinoRaspberryPiPicoW: {platform: 'rp2040:rp2040', fqbn: 'rp2040:rp2040:rpipicow'},
    arduinoRaspberryPiPico2: {platform: 'rp2040:rp2040', fqbn: 'rp2040:rp2040:rpipico2'},
    arduinoRaspberryPiPico2W: {platform: 'rp2040:rp2040', fqbn: 'rp2040:rp2040:rpipico2w'},
    microbit: {platform: 'microbit', fqbn: null},
    microbitV2: {platform: 'microbit', fqbn: null}
};

const getDeviceProfile = device => {
    if (!device || device.deviceId === 'null') return null;
    const build = DEVICE_PROFILES[device.deviceId];
    if (!build) return null;

    return {
        ...device,
        generator: device.type === 'arduino' ? 'arduino' : 'microPython',
        platform: build.platform,
        fqbn: build.fqbn,
        baudRate: Number(device.defaultBaudRate) || 9600,
        defaultProgramMode: device.defaultProgramMode || device.programMode[0],
        capabilities: {
            compile: Boolean(build.fqbn),
            serial: Boolean(device.serialportRequired),
            realtime: device.programMode.includes('realtime'),
            upload: device.programMode.includes('upload')
        }
    };
};

export {
    DEVICE_PROFILES,
    getDeviceProfile
};

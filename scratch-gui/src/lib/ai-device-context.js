// Contexto de placa/tarjeta para el asistente de IA en modo Electrónica.
// A partir del `deviceId` seleccionado en STBlock, resuelve:
//  - las notas específicas de la placa (pines, familia, voltaje)
//  - la lista real de bloques de dispositivo DISPONIBLES para esa placa
//    (tomada de la misma librería que usa el toolbox de bloques).
import {BLOCKS} from './ai-block-library';

// Notas por placa: pines, familia de MCU y particularidades relevantes.
var BOARD_NOTES = {
    arduinoUno: 'Arduino UNO (ATmega328P, 5V). Digitales 2-13; analógicos A0-A5; PWM: 3,5,6,9,10,11.',
    stBoardExtension: 'STBoard Extension (compatible Arduino UNO, 5V). Digitales 2-13; analógicos A0-A5; PWM: 3,5,6,9,10,11.',
    arduinoNano: 'Arduino Nano (ATmega328P, 5V). Digitales 2-13; analógicos A0-A7; PWM: 3,5,6,9,10,11.',
    arduinoLGT8F328P: 'Arduino Nano clon LGT8F328P (Logic Green, 32 MHz, 5V). Digitales 2-13; analógicos A0-A7; PWM: 3,5,6,9,10,11. Usa firmware Firmata específico para LGT8F328P.',
    arduinoLeonardo: 'Arduino Leonardo (ATmega32u4, 5V, puede actuar como HID). Digitales 2-13; analógicos A0-A5; PWM: 3,5,6,9,10,11.',
    arduinoMega2560: 'Arduino Mega 2560 (ATmega2560, 5V). 54 digitales (2-53); 16 analógicos (A0-A15); PWM: 2-13,44,45,46.',
    stbBoardV2: 'STBoard V2 (Arduino Mega 2560, 5V). 54 digitales; 16 analógicos; PWM: 2-13,44,45,46.',
    arduinoUnoR4Minima: 'Arduino UNO R4 Minima (Renesas RA4M1, 5V). Digitales 2-13; analógicos A0-A5; PWM en casi todos los digitales.',
    arduinoUnoR4Wifi: 'Arduino UNO R4 WiFi (RA4M1 + ESP32-S3, 5V). Digitales 2-13; analógicos A0-A5; matriz LED 12x8; Wi-Fi/Bluetooth.',
    arduinoEsp32: 'ESP32 (Wi-Fi + Bluetooth, 3.3V). ADC en GPIO 32-39; DAC en GPIO 25/26; PWM (LEDC) en casi cualquier GPIO; toque táctil en T0-T9.',
    arduinoEsp32S3: 'ESP32-S3 (Wi-Fi + Bluetooth LE, 3.3V). ADC en GPIO 1-10; PWM (LEDC) en casi cualquier GPIO; toque táctil.',
    arduinoEsp8266NodeMCU: 'NodeMCU ESP8266 (Wi-Fi, 3.3V). ADC en A0; PWM en cualquier pin digital.',
    arduinoK210MaixDock: 'MaixDock K210 (RISC-V, 3.3V). Programable con MicroPython/K210 SDK.',
    arduinoK210Maixduino: 'Maixduino K210 (RISC-V + ESP32, 3.3V).',
    arduinoRaspberryPiPico: 'Raspberry Pi Pico (RP2040, 3.3V). GPIO 0-25; ADC en GP26-GP29; PWM en casi cualquier GPIO.',
    arduinoRaspberryPiPicoW: 'Raspberry Pi Pico W (RP2040 + Wi-Fi, 3.3V). GPIO 0-25.',
    arduinoRaspberryPiPico2: 'Raspberry Pi Pico 2 (RP2350, 3.3V). GPIO 0-25.',
    arduinoRaspberryPiPico2W: 'Raspberry Pi Pico 2 W (RP2350 + Wi-Fi, 3.3V). GPIO 0-25.',
    microbit: 'Micro:bit (nRF51/v1, 3.3V). Matriz LED 5x5; botones A/B; acelerómetro, brújula, temperatura y nivel de luz; pines 0-20.',
    microbitV2: 'Micro:bit V2 (nRF52, 3.3V). Matriz LED 5x5; botones A/B; acelerómetro, brújula, temperatura, luz, altavoz, micrófono y logo táctil.'
};

var ESP32_IDS = ['arduinoEsp32', 'arduinoEsp32S3', 'arduinoEsp8266NodeMCU'];
var MICROBIT_IDS = ['microbit', 'microbitV2'];

// Devuelve las categorías de bloques cuya extensión aplica a la placa.
function getDeviceCategories(deviceId) {
    if (!deviceId) return ['arduino'];
    if (MICROBIT_IDS.indexOf(deviceId) !== -1) return ['microbit'];
    if (ESP32_IDS.indexOf(deviceId) !== -1) return ['arduino', 'esp32'];
    return ['arduino'];
}

function getBoardNotes(deviceId) {
    return BOARD_NOTES[deviceId] || '';
}

// Lista compacta de bloques (mismo formato que getCompactPromptLines) filtrada
// por las categorías de la placa.
function getDeviceBlockLines(categories) {
    var lines = [];
    for (var op in BLOCKS) {
        if (!Object.prototype.hasOwnProperty.call(BLOCKS, op)) continue;
        var b = BLOCKS[op];
        if (b.c === 'internal') continue;
        if (categories.indexOf(b.c) === -1) continue;
        var parts = [op + '[' + b.t + ']'];
        parts.push(b.d);
        if (b.f && b.f.length > 0) parts.push('(f:' + b.f.join(',') + ')');
        if (b.i && b.i.length > 0) parts.push('(v:' + b.i.join(',') + ')');
        if (b.st && b.st.length > 0) parts.push('{st:' + b.st.join(',') + '}');
        lines.push(' ' + parts.join(' | '));
    }
    return lines;
}

// Construye el texto de contexto de la placa (nombre + notas + bloques
// disponibles) para inyectar en el system prompt del modo Electrónica.
function buildDeviceBoardContext(deviceId) {
    if (!deviceId) return '';
    var categories = getDeviceCategories(deviceId);
    var lines = [];
    lines.push('=== PLACA SELECCIONADA EN STBlock ===');
    lines.push('deviceId: ' + deviceId);
    var notes = getBoardNotes(deviceId);
    if (notes) lines.push(notes);
    lines.push('Bloques de dispositivo DISPONIBLES para esta placa (usá SOLO estos):');
    var blockLines = getDeviceBlockLines(categories);
    for (var i = 0; i < blockLines.length; i++) lines.push(blockLines[i]);
    return lines.join('\n');
}

export {buildDeviceBoardContext, getDeviceCategories, getBoardNotes, BOARD_NOTES};

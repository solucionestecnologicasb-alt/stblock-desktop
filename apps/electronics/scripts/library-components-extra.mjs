// Ampliación electrónica y mecánica del catálogo real de SketchForge.
export const FREECAD_REVISION = "be5e71491051cef75da46831b6fd77c6313cb497";
const ADAFRUIT_REVISION = "ab3dfc47c32468ba87e7652556cab25efd906eb0";

const raw = (repo, revision, path) => `https://raw.githubusercontent.com/${repo}/${revision}/${path}`;
const page = (repo, revision, folder) => `https://github.com/${repo}/tree/${revision}/${folder}`;

function adafruit({ id, name, category, productId, folder, stl, step, preview, color, tags, format = "stl", dimensions }) {
  return { id, name, category, manufacturer: "Adafruit", partNumber: String(productId), color, tags, modelFormat: format,
    modelUrl: raw("adafruit/Adafruit_CAD_Parts", ADAFRUIT_REVISION, `${folder}/${stl}`), cadUrl: step ? raw("adafruit/Adafruit_CAD_Parts", ADAFRUIT_REVISION, `${folder}/${step}`) : undefined,
    previewUrl: preview ? raw("adafruit/Adafruit_CAD_Parts", ADAFRUIT_REVISION, `${folder}/${preview}`) : undefined,
    license: "MIT", attribution: "Adafruit Industries — Adafruit CAD Parts (MIT)", source: "Adafruit_CAD_Parts", sourceUrl: page("adafruit/Adafruit_CAD_Parts", ADAFRUIT_REVISION, folder), dimensions };
}

function freecad({ id, name, category, partNumber, path, step, color, tags }) {
  const folder = path.slice(0, path.lastIndexOf("/"));
  return { id, name, category, manufacturer: "Genérico", partNumber, color, tags, modelFormat: "stl",
    modelUrl: raw("FreeCAD/FreeCAD-library", FREECAD_REVISION, path), cadUrl: step ? raw("FreeCAD/FreeCAD-library", FREECAD_REVISION, `${folder}/${step}`) : undefined,
    license: "CC BY 3.0", attribution: "FreeCAD-library contributors — autor individual en el historial del archivo (CC BY 3.0)", source: "FreeCAD-library", sourceUrl: page("FreeCAD/FreeCAD-library", FREECAD_REVISION, folder) };
}

export const EXTRA_COMPONENT_MANIFEST = [
  // Placas y microcontroladores.
  adafruit({ id: "adafruit-3382-metro-m4", name: "Metro M4 Express", category: "placas", productId: 3382, folder: "3382 Metro M4", stl: "3382 Metro M4.stl", step: "3382 Metro M4.step", color: "#176f8f", tags: ["placa", "arduino compatible", "metro", "samd51", "microcontrolador"] }),
  adafruit({ id: "adafruit-4775-metro-esp32-s2", name: "Metro ESP32-S2", category: "placas", productId: 4775, folder: "4775 Metro ESP32-S2", stl: "4775 Metro ESP32-S2.stl", step: "4775 Metro ESP32-S2.step", color: "#176f8f", tags: ["placa", "arduino compatible", "metro", "esp32", "wifi"] }),
  adafruit({ id: "adafruit-5723-feather-rp2040-host", name: "Feather RP2040 USB Host", category: "placas", productId: 5723, folder: "5723 Feather RP2040 USB Host", stl: "5723 Feather RP2040 USB Host.stl", step: "5723 Feather RP2040 USB Host.step", color: "#176f8f", tags: ["placa", "rp2040", "feather", "usb host"] }),
  freecad({ id: "freecad-arduino-uno", name: "Arduino UNO", category: "placas", partNumber: "UNO", path: "Electronics Parts/Boards/Arduino/freaduino-uno.stl", step: "freaduino-uno.step", color: "#16869d", tags: ["arduino", "uno", "atmega328", "microcontrolador"] }),
  freecad({ id: "freecad-arduino-mega", name: "Arduino Mega", category: "placas", partNumber: "MEGA", path: "Electronics Parts/Boards/Arduino/arduino-mega.stl", step: "arduino-mega.step", color: "#16869d", tags: ["arduino", "mega", "atmega2560", "microcontrolador"] }),
  freecad({ id: "freecad-arduino-nano", name: "Arduino Nano Rev3", category: "placas", partNumber: "NANO-R3", path: "Electronics Parts/Boards/Arduino/Nano-Rev3_0.stl", step: "Nano-Rev3_0.step", color: "#16869d", tags: ["arduino", "nano", "atmega328", "microcontrolador"] }),

  // Sensores comunes y ambientales.
  freecad({ id: "freecad-hcsr04", name: "Sensor ultrasónico HC-SR04", category: "sensores", partNumber: "HC-SR04", path: "Electronics Parts/Ultrasonic Sensors/HC-SR04.stl", step: "HC-SR04.step", color: "#6d56a5", tags: ["sensor", "ultrasonico", "distancia", "sonar", "arduino"] }),
  freecad({ id: "freecad-maxsonar-mb1010", name: "Sensor ultrasónico MaxSonar MB1010", category: "sensores", partNumber: "MB1010", path: "Electronics Parts/Ultrasonic Sensors/MaxSonar/MB1010/MaxSonar-MB1010.stl", step: "MaxSonar-MB1010.step", color: "#6d56a5", tags: ["sensor", "ultrasonico", "distancia", "sonar"] }),
  adafruit({ id: "adafruit-3595-apds9960", name: "Sensor APDS9960", category: "sensores", productId: 3595, folder: "3595 APDS9960 Sensor", stl: "3595 APDS9960 Sensor.stl", step: "3595 APDS9960 Sensor.step", color: "#6d56a5", tags: ["sensor", "gestos", "proximidad", "color", "luz"] }),
  adafruit({ id: "adafruit-3967-vl53l1x", name: "Sensor ToF VL53L1X", category: "sensores", productId: 3967, folder: "3967 VL5SL1X TOF Sensor", stl: "3967 VL5SL1X TOF Sensor.stl", step: "3967 VL5SL1X TOF Sensor.step", color: "#6d56a5", tags: ["sensor", "distancia", "laser", "tof"] }),
  adafruit({ id: "adafruit-4026-soil", name: "Sensor capacitivo de suelo", category: "sensores", productId: 4026, folder: "4026 STEMMA Soil Sensor", stl: "4026 STEMMA Soil Sensor.stl", step: "4026 STEMMA Soil Sensor.step", color: "#6d56a5", tags: ["sensor", "suelo", "humedad", "capacitivo"] }),
  adafruit({ id: "adafruit-4089-adt7410", name: "Sensor de temperatura ADT7410", category: "sensores", productId: 4089, folder: "4089 ADT7410 Sensor", stl: "4089 ADT7410 Sensor.stl", step: "4089 ADT7410 Sensor.step", color: "#6d56a5", tags: ["sensor", "temperatura", "i2c"] }),
  adafruit({ id: "adafruit-4494-dps310", name: "Sensor barométrico DPS310", category: "sensores", productId: 4494, folder: "4494 DPS310 Sensor", stl: "4494-DPS310-Sensor.stl", step: "4494-DPS310-Sensor.step", color: "#6d56a5", tags: ["sensor", "presion", "barometro", "altitud"] }),
  adafruit({ id: "adafruit-4566-aht20", name: "Sensor AHT20", category: "sensores", productId: 4566, folder: "4566 AHT20 Sensor", stl: "4566-AHT20-Sensor.stl", step: "4566-AHT20-Sensor.step", color: "#6d56a5", tags: ["sensor", "temperatura", "humedad"] }),
  adafruit({ id: "adafruit-4698-as7341", name: "Sensor espectral AS7341", category: "sensores", productId: 4698, folder: "4698 AS7341 Light Color Sensor", stl: "4698 AS7341 Light Color Sensor.stl", step: "4698 AS7341 Light Color Sensor.step", color: "#6d56a5", tags: ["sensor", "luz", "color", "espectral"] }),
  adafruit({ id: "adafruit-4829-sgp40", name: "Sensor de calidad de aire SGP40", category: "sensores", productId: 4829, folder: "4829 SGP40 Sensor", stl: "4829 SGP40 Sensor.stl", step: "4829 SGP40 Sensor.step", color: "#6d56a5", tags: ["sensor", "gas", "voc", "aire"] }),
  adafruit({ id: "adafruit-4867-scd30", name: "Sensor CO₂ SCD-30", category: "sensores", productId: 4867, folder: "4867 SCD-30 C02 Sensor", stl: "4867 Adafruit SCD30.stl", step: "4867 Adafruit SCD30.step", color: "#6d56a5", tags: ["sensor", "co2", "aire", "temperatura", "humedad"] }),
  adafruit({ id: "adafruit-4885-sht40", name: "Sensor SHT40", category: "sensores", productId: 4885, folder: "4885 SHT40 Sensor", stl: "4485 SHT40.stl", step: "4485 SHT40.step", color: "#6d56a5", tags: ["sensor", "temperatura", "humedad"] }),
  adafruit({ id: "adafruit-5187-scd40", name: "Sensor CO₂ SCD-40", category: "sensores", productId: 5187, folder: "5187 SCD-40 C02 Sensor", stl: "5187 SCD-40 C02 Sensor.stl", step: "5187 SCD-40 C02 Sensor.step", color: "#6d56a5", tags: ["sensor", "co2", "aire"] }),
  adafruit({ id: "adafruit-5378-veml7700", name: "Sensor de luz VEML7700", category: "sensores", productId: 5378, folder: "5378 VEML7700 Lux Sensor", stl: "5378 VEML7700 Lux Sensor.stl", step: "5378 VEML7700 Lux Sensor.step", color: "#6d56a5", tags: ["sensor", "luz", "lux", "ambiente"] }),
  adafruit({ id: "adafruit-5396-vl53l4cd", name: "Sensor ToF VL53L4CD", category: "sensores", productId: 5396, folder: "5396 VL53L4CD Sensor", stl: "5396 Adafruit VL53L4CD.stl", step: "5396 Adafruit VL53L4CD.step", color: "#6d56a5", tags: ["sensor", "distancia", "laser", "tof"] }),
  adafruit({ id: "adafruit-5606-ens160", name: "Sensor de aire ENS160", category: "sensores", productId: 5606, folder: "5606 ENS160 Sensor", stl: "5606 ENS160 Sensor.stl", step: "5606 ENS160 Sensor.step", color: "#6d56a5", tags: ["sensor", "aire", "gas", "voc"] }),
  adafruit({ id: "adafruit-5913-tcrt1000", name: "Sensor reflectivo TCRT1000", category: "sensores", productId: 5913, folder: "5913 TCRT1000 Sensor", stl: "5913 TCRT1000 Sensor.stl", step: "5913 TCRT1000 Sensor.step", color: "#6d56a5", tags: ["sensor", "infrarrojo", "reflectivo", "linea"] }),
  adafruit({ id: "adafruit-5939-ir-receiver", name: "Receptor infrarrojo", category: "sensores", productId: 5939, folder: "5939 IR Remote Receiver", stl: "5939 IR Remote Receiver.stl", step: "5939 IR Remote Receiver.step", color: "#6d56a5", tags: ["sensor", "infrarrojo", "ir", "control remoto"] }),

  // Motores, sonido y actuadores.
  adafruit({ id: "adafruit-3777-tt-motor", name: "Motorreductor TT", category: "actuadores", productId: 3777, folder: "3777 TT Motor", stl: "3777 TT Motor.stl", step: "3777 TT Motor.step", color: "#707984", tags: ["motor", "dc", "motorreductor", "tt", "robotica"] }),
  adafruit({ id: "adafruit-3802-tt-metal", name: "Motorreductor TT metálico", category: "actuadores", productId: 3802, folder: "3802 TT Motor Metal Gear", stl: "3802 TT Motor Metal Gear.stl", step: "3802 TT Motor Metal Gear.step", color: "#707984", tags: ["motor", "dc", "motorreductor", "engranaje", "robotica"] }),
  adafruit({ id: "adafruit-413-solenoid", name: "Solenoide grande", category: "actuadores", productId: 413, folder: "413 Large Solenoid", stl: "413 Large Solenoid.stl", step: "413 Large Solenoid.step", color: "#707984", tags: ["solenoide", "electroiman", "actuador"] }),
  adafruit({ id: "adafruit-3885-stemma-speaker", name: "Altavoz STEMMA", category: "audio", productId: 3885, folder: "3885 STEMMA Speaker", stl: "3885 STEMMA Speaker rev A.stl", step: "3885 STEMMA Speaker rev A.step", color: "#4d7185", tags: ["audio", "altavoz", "speaker", "stemma"] }),
  adafruit({ id: "adafruit-4346-pdm-mic", name: "Micrófono PDM", category: "audio", productId: 4346, folder: "4346 PDM Mic Breakout", stl: "PDM Mic with JST SH.stl", step: "PDM Mic with JST SH.step", color: "#4d7185", tags: ["audio", "microfono", "pdm", "sensor"] }),
  freecad({ id: "freecad-buzzer", name: "Zumbador electrónico", category: "audio", partNumber: "BUZZER", path: "Electronics Parts/Buzzers/Buzzer.stl", color: "#4d7185", tags: ["audio", "buzzer", "zumbador", "alarma"] }),

  // Energía y baterías.
  adafruit({ id: "adafruit-1321-battery-9v", name: "Batería de 9 V", category: "energia", productId: 1321, folder: "1321 Battery 9V", stl: "1321 Battery 9V.step", color: "#d59c30", tags: ["energia", "bateria", "9v", "6f22"], format: "step", dimensions: { width: 26.5, depth: 17.5, height: 48.5 } }),
  adafruit({ id: "adafruit-354-lipo-4400", name: "Batería LiPo 4400 mAh", category: "energia", productId: 354, folder: "354 4400mah battery", stl: "354 4400mah battery.stl", step: "354 4400mah battery.step", color: "#d59c30", tags: ["energia", "bateria", "lipo", "litio", "4400mah"] }),
  adafruit({ id: "adafruit-3898-lipo-400", name: "Batería LiPo 400 mAh", category: "energia", productId: 3898, folder: "3898 400mah Battery", stl: "3898 400mAh Battery.stl", step: "3898 400mAh Battery.step", color: "#d59c30", tags: ["energia", "bateria", "lipo", "litio", "400mah"] }),
  adafruit({ id: "adafruit-727-holder-3aaa", name: "Portabaterías 3×AAA", category: "energia", productId: 727, folder: "727 3x AAA Battery Holder", stl: "727 3xAAA JST Battery Holder.stl", step: "727 3xAAA JST Battery Holder.step", color: "#d59c30", tags: ["energia", "bateria", "portapilas", "aaa", "jst"] }),
  adafruit({ id: "adafruit-4410-microlipo-usbc", name: "Cargador MicroLipo USB-C", category: "energia", productId: 4410, folder: "4410 Micro Lipo USBC", stl: "4410 Micro Lipo USBC.stl", step: "4410 Micro Lipo USBC.step", color: "#d59c30", tags: ["energia", "cargador", "lipo", "usb c"] }),
  adafruit({ id: "adafruit-4755-solar-charger", name: "Cargador solar USB", category: "energia", productId: 4755, folder: "4755 USB Solar Charger", stl: "4755 USB Solar Charger.stl", step: "4755 USB Solar Charger.step", color: "#d59c30", tags: ["energia", "cargador", "solar", "lipo", "usb"] }),
  adafruit({ id: "adafruit-5397-lipo-bff", name: "Cargador LiPo BFF", category: "energia", productId: 5397, folder: "5397 Lipo Charger BFF", stl: "5397 Lipo Charger BFF.stl", step: "5397 Lipo Charger BFF.step", color: "#d59c30", tags: ["energia", "cargador", "lipo", "bff"] }),
  freecad({ id: "freecad-battery-aa", name: "Batería AA", category: "energia", partNumber: "AA", path: "Electrical Parts/Batteries/battery-AA.stl", step: "battery-AA.step", color: "#d59c30", tags: ["energia", "bateria", "pila", "aa"] }),
  freecad({ id: "freecad-battery-aaa", name: "Batería AAA", category: "energia", partNumber: "AAA", path: "Electrical Parts/Batteries/battery-AAA.stl", step: "battery-AAA.step", color: "#d59c30", tags: ["energia", "bateria", "pila", "aaa"] }),

  // Controladores eléctricos y puentes H.
  adafruit({ id: "adafruit-3190-drv8871", name: "Puente H DRV8871", category: "controladores", productId: 3190, folder: "3190 DRV8871 Breakout", stl: "3190 DRV8871 Breakout.stl", step: "3190 DRV8871 Breakout.step", preview: "3190 DRV8871 Breakout.jpg", color: "#8a5a9b", tags: ["puente h", "h bridge", "motor", "driver", "drv8871"] }),
  adafruit({ id: "adafruit-2348-motor-hat", name: "Controlador Motor HAT", category: "controladores", productId: 2348, folder: "2348 Adafruit Motor HAT", stl: "2348 Adafruit Motor HAT.stl", step: "2348 Adafruit Motor HAT.step", preview: "2348 Adafruit Motor HAT.jpg", color: "#8a5a9b", tags: ["motor", "controlador", "hat", "puente h"] }),
  adafruit({ id: "adafruit-1455-tlc59711", name: "Controlador LED TLC59711", category: "controladores", productId: 1455, folder: "1455 LED driver TLC59711", stl: "1455 LED-Driver-TLC59711.stl", step: "1455 LED-Driver-TLC59711.step", color: "#8a5a9b", tags: ["led", "controlador", "driver", "tlc59711"] }),
  adafruit({ id: "adafruit-3191-power-relay", name: "Relé de potencia FeatherWing", category: "controladores", productId: 3191, folder: "3191 Power Relay FeatherWing", stl: "3191 Power Relay FeatherWing.stl", step: "3191 Power Relay FeatherWing.step", color: "#8a5a9b", tags: ["rele", "relay", "potencia", "featherwing"] }),
  adafruit({ id: "adafruit-5648-mosfet-driver", name: "Controlador MOSFET", category: "controladores", productId: 5648, folder: "5648 MOSFET Driver", stl: "5648 MOSFET Driver.stl", step: "5648 MOSFET Driver.step", color: "#8a5a9b", tags: ["mosfet", "potencia", "driver", "motor"] }),
  adafruit({ id: "adafruit-6109-a4988", name: "Controlador de pasos A4988", category: "controladores", productId: 6109, folder: "6109 A4988 Driver", stl: "6109 A4988 Driver.stl", step: "6109 A4988 Driver.step", color: "#8a5a9b", tags: ["motor", "pasos", "stepper", "driver", "a4988"] }),
  adafruit({ id: "adafruit-6121-tmc2209", name: "Controlador de pasos TMC2209", category: "controladores", productId: 6121, folder: "6121 TMC2209 Driver", stl: "6121 TMC2209 Driver.stl", step: "6121 TMC2209 Driver.step", color: "#8a5a9b", tags: ["motor", "pasos", "stepper", "driver", "tmc2209"] }),
  adafruit({ id: "adafruit-815-servo-driver", name: "Controlador de 16 servos", category: "controladores", productId: 815, folder: "815 Servo Driver 16 Channel", stl: "815 Servo Driver 16 Channel.stl", step: "815 Servo Driver 16 Channel.step", color: "#8a5a9b", tags: ["servo", "pwm", "controlador", "16 canales"] }),

  // Componentes electrónicos básicos.
  freecad({ id: "freecad-resistor-1k", name: "Resistencia 1 kΩ 1/4 W", category: "componentes", partNumber: "1K-0.25W", path: "Electronics Parts/Resistors/res-1_4w-1K.stl", step: "res-1_4w-1K.step", color: "#b98532", tags: ["resistencia", "resistor", "1k", "tht", "componente"] }),
  freecad({ id: "freecad-resistor-220", name: "Resistencia 220 Ω 1/4 W", category: "componentes", partNumber: "220R-0.25W", path: "Electronics Parts/Resistors/res-1_4w-220ohm.stl", step: "res-1_4w-220ohm.step", color: "#b98532", tags: ["resistencia", "resistor", "220 ohm", "tht", "componente"] }),
  freecad({ id: "freecad-capacitor-470uf", name: "Capacitor electrolítico 470 µF", category: "componentes", partNumber: "470UF-25V", path: "Electronics Parts/Capacitors/CO21_470microF_25V.stl", color: "#4e6f88", tags: ["capacitor", "condensador", "electrolitico", "470uf"] }),
  freecad({ id: "freecad-capacitor-film", name: "Capacitor de película", category: "componentes", partNumber: "MKT", path: "Electronics Parts/Capacitors/MKT_3steps.stl", color: "#4e6f88", tags: ["capacitor", "condensador", "pelicula", "mkt"] }),
  freecad({ id: "freecad-led-5mm", name: "LED de 5 mm", category: "componentes", partNumber: "LED-5MM", path: "Electronics Parts/LEDs/led-5mm.stl", color: "#ce4650", tags: ["led", "diodo", "luz", "5mm", "tht"] }),
  freecad({ id: "freecad-rgb-led-5mm", name: "LED RGB de 5 mm", category: "componentes", partNumber: "RGB-LED-5MM", path: "Electronics Parts/LEDs/RGB-LED-5mm.stl", color: "#ce4650", tags: ["led", "rgb", "luz", "5mm", "tht"] }),
  freecad({ id: "freecad-diode-sod323", name: "Diodo SMD SOD-323", category: "componentes", partNumber: "SOD-323", path: "Electronics Parts/Diodes/SMD/SOD-323.stl", color: "#414850", tags: ["diodo", "smd", "sod323", "componente"] }),
  freecad({ id: "freecad-transistor-to92", name: "Transistor TO-92", category: "componentes", partNumber: "TO-92", path: "Electronics Parts/Transistors/TO-92.stl", color: "#414850", tags: ["transistor", "to92", "tht", "componente"] }),
  freecad({ id: "freecad-mosfet-p55", name: "MOSFET P55NF06L", category: "componentes", partNumber: "P55NF06L", path: "Electronics Parts/Transistors/mosfet-P55NF06L.stl", color: "#414850", tags: ["mosfet", "transistor", "potencia", "to220"] }),
  freecad({ id: "freecad-dip8", name: "Circuito integrado DIP-8", category: "componentes", partNumber: "DIP-8", path: "Electronics Parts/Microcontroller/IntCirc-DIL/DIP8.stl", color: "#414850", tags: ["integrado", "ic", "dip8", "chip", "tht"] }),
  freecad({ id: "freecad-photoresistor", name: "Fotoresistencia LDR", category: "componentes", partNumber: "LDR", path: "Electronics Parts/Photoresistor/Photoresistor.stl", step: "Photoresistor.step", color: "#8b6c42", tags: ["fotoresistencia", "ldr", "sensor", "luz"] }),
  freecad({ id: "freecad-potentiometer", name: "Potenciómetro rotatorio", category: "componentes", partNumber: "POT", path: "Electronics Parts/Potentiometer/Potentiometer.stl", color: "#567489", tags: ["potenciometro", "resistencia variable", "control"] }),
  freecad({ id: "freecad-electronic-button", name: "Pulsador electrónico THT", category: "componentes", partNumber: "TACT-SW", path: "Electronics Parts/Buttons/THT/Electronic_Button.stl", color: "#567489", tags: ["boton", "pulsador", "switch", "tht"] }),

  // Mecánica y transmisión.
  freecad({ id: "freecad-bearing-608zz", name: "Rodamiento 608ZZ", category: "mecanica", partNumber: "608ZZ", path: "Mechanical Parts/Bearings/608ZZ_Ball_Bearing.stl", step: "608ZZ_Ball_Bearing.step", color: "#8d969f", tags: ["rodamiento", "bearing", "608zz", "mecanica"] }),
  freecad({ id: "freecad-bearing-623zz", name: "Rodamiento 623ZZ", category: "mecanica", partNumber: "623ZZ", path: "Mechanical Parts/Bearings/623ZZ_Ball_Bearing.stl", step: "623ZZ_Ball_Bearing.step", color: "#8d969f", tags: ["rodamiento", "bearing", "623zz", "mecanica"] }),
  freecad({ id: "freecad-bearing-624zz", name: "Rodamiento 624ZZ", category: "mecanica", partNumber: "624ZZ", path: "Mechanical Parts/Bearings/624ZZ_Ball_Bearing.stl", step: "624ZZ_Ball_Bearing.stp", color: "#8d969f", tags: ["rodamiento", "bearing", "624zz", "mecanica"] }),
  freecad({ id: "freecad-bearing-lm8uu", name: "Rodamiento lineal LM8UU", category: "mecanica", partNumber: "LM8UU", path: "Mechanical Parts/Bearings/linear_bearings/LM8uu.stl", step: "LM8uu.stp", color: "#8d969f", tags: ["rodamiento", "lineal", "lm8uu", "riel"] }),
  freecad({ id: "freecad-gt2-pulley-16t", name: "Polea GT2 de 16 dientes", category: "transmision", partNumber: "GT2-16T", path: "Mechanical Parts/Pulleys/GT2_16T.stl", color: "#9a7448", tags: ["polea", "pulley", "gt2", "16 dientes", "correa"] }),
  freecad({ id: "freecad-gt2-pulley-v2", name: "Polea dentada GT2 V2", category: "transmision", partNumber: "GT2-V2", path: "Mechanical Parts/Pulleys/GT2Pulley-V2.stl", color: "#9a7448", tags: ["polea", "pulley", "gt2", "correa", "transmision"] }),
  freecad({ id: "freecad-gearmotor-37mm", name: "Motorreductor DC de 37 mm", category: "transmision", partNumber: "GEARMOTOR-37", path: "Electronics Parts/Motors/DC motor/Gear-Motor-37mm/DC_Gear_Motor_37mm.stl", color: "#9a7448", tags: ["motor", "motorreductor", "engranaje", "37mm"] }),
  freecad({ id: "freecad-yellow-gearmotor", name: "Motorreductor amarillo recto", category: "transmision", partNumber: "TT-STRAIGHT", path: "Electronics Parts/Motors/DC motor/Yellow_gearmotor/straight/Yellow_gearmotor_straight.stl", step: "Yellow_gearmotor_straight.step", color: "#9a7448", tags: ["motor", "motorreductor", "engranaje", "tt", "robotica"] }),
  freecad({ id: "freecad-yellow-wheel-65", name: "Rueda robótica de 65 mm", category: "transmision", partNumber: "WHEEL-65", path: "Electronics Parts/Motors/DC motor/Yellow_wheel_65mm/Yellow_wheel_65mm.stl", step: "Yellow_wheel_65mm.step", color: "#9a7448", tags: ["rueda", "robotica", "motor", "65mm"] }),
  freecad({ id: "freecad-nema17-40", name: "Motor paso a paso NEMA 17", category: "actuadores", partNumber: "NEMA17-40", path: "Electronics Parts/Motors/Stepper/NEMA/Old/NEMA-17_Stepper_Motor_40mm_with_connector.stl", color: "#707984", tags: ["motor", "pasos", "stepper", "nema17", "cnc"] }),

  // Conectores frecuentes.
  freecad({ id: "freecad-dupont-1x3", name: "Conector Dupont hembra 1×3", category: "conexion", partNumber: "DUPONT-1X3", path: "Electronics Parts/Connectors/dupont-connectors/dupont-2_54mm-female-conn-1x3.stl", color: "#3978a8", tags: ["conector", "dupont", "2.54mm", "hembra"] }),
  freecad({ id: "freecad-terminal-1x2", name: "Bornera PCB 1×2", category: "conexion", partNumber: "TERMINAL-1X2", path: "Electronics Parts/Connectors/power-connectors/pcb-terminal-block-female-1x2.stl", color: "#3978a8", tags: ["conector", "bornera", "terminal", "pcb"] }),
  freecad({ id: "freecad-rj45", name: "Conector RJ45 con LED", category: "conexion", partNumber: "RJ45", path: "Electronics Parts/Connectors/Ethernet-connectors/rj45-ethernet-PCB-with-leds.stl", color: "#3978a8", tags: ["conector", "ethernet", "rj45", "red"] }),
  freecad({ id: "freecad-dc-jack", name: "Jack DC 2.1 mm", category: "conexion", partNumber: "DC-2.1MM", path: "Electronics Parts/Connectors/power-connectors/jack_DC_2.1mm_PCB.stl", color: "#3978a8", tags: ["conector", "jack", "dc", "energia", "2.1mm"] }),
];

// Piezas generadas localmente. Los engranajes y cremalleras con el mismo módulo
// comparten paso y ángulo de presión de 20°, por lo que pueden combinarse.
export const PARAMETRIC_MOTION_PARTS = [
  // Engranajes rectos: módulos 0.5, 1, 1.5 y 2.
  { kind: "gear", id: "gear-spur-m05-z12", name: "Engranaje recto M0.5 Z12", teeth: 12, module: 0.5, thickness: 4, bore: 2 },
  { kind: "gear", id: "gear-spur-m05-z20", name: "Engranaje recto M0.5 Z20", teeth: 20, module: 0.5, thickness: 4, bore: 3 },
  { kind: "gear", id: "gear-spur-m05-z36", name: "Engranaje recto M0.5 Z36", teeth: 36, module: 0.5, thickness: 5, bore: 3 },
  { kind: "gear", id: "gear-spur-m1-z8", name: "Piñón recto M1 Z8", teeth: 8, module: 1, thickness: 5, bore: 3 },
  { kind: "gear", id: "gear-spur-m1-z12", name: "Engranaje recto M1 Z12", teeth: 12, module: 1, thickness: 6, bore: 3 },
  { kind: "gear", id: "gear-spur-m1-z16", name: "Engranaje recto M1 Z16", teeth: 16, module: 1, thickness: 6, bore: 4 },
  { kind: "gear", id: "gear-spur-m1-z20", name: "Engranaje recto M1 Z20", teeth: 20, module: 1, thickness: 6, bore: 5 },
  { kind: "gear", id: "gear-spur-m1-z24", name: "Engranaje recto M1 Z24", teeth: 24, module: 1, thickness: 7, bore: 5 },
  { kind: "gear", id: "gear-spur-m1-z36", name: "Engranaje recto M1 Z36", teeth: 36, module: 1, thickness: 8, bore: 6 },
  { kind: "gear", id: "gear-spur-m1-z48", name: "Engranaje recto M1 Z48", teeth: 48, module: 1, thickness: 8, bore: 8 },
  { kind: "gear", id: "gear-spur-m15-z12", name: "Engranaje recto M1.5 Z12", teeth: 12, module: 1.5, thickness: 8, bore: 5 },
  { kind: "gear", id: "gear-spur-m15-z20", name: "Engranaje recto M1.5 Z20", teeth: 20, module: 1.5, thickness: 8, bore: 6 },
  { kind: "gear", id: "gear-spur-m15-z32", name: "Engranaje recto M1.5 Z32", teeth: 32, module: 1.5, thickness: 10, bore: 8 },
  { kind: "gear", id: "gear-spur-m2-z12", name: "Engranaje recto M2 Z12", teeth: 12, module: 2, thickness: 8, bore: 5 },
  { kind: "gear", id: "gear-spur-m2-z16", name: "Engranaje recto M2 Z16", teeth: 16, module: 2, thickness: 9, bore: 6 },
  { kind: "gear", id: "gear-spur-m2-z24", name: "Engranaje recto M2 Z24", teeth: 24, module: 2, thickness: 10, bore: 8 },
  { kind: "gear", id: "gear-spur-m2-z32", name: "Engranaje recto M2 Z32", teeth: 32, module: 2, thickness: 12, bore: 8 },
  { kind: "gear", id: "gear-spur-m2-z40", name: "Engranaje recto M2 Z40", teeth: 40, module: 2, thickness: 12, bore: 10 },

  // Cremalleras compatibles con los engranajes M1 y M2.
  { kind: "rack", id: "gear-rack-m1-z20", name: "Cremallera M1 de 20 dientes", teeth: 20, module: 1, thickness: 8, baseHeight: 5 },
  { kind: "rack", id: "gear-rack-m2-z12", name: "Cremallera M2 de 12 dientes", teeth: 12, module: 2, thickness: 12, baseHeight: 8 },

  // Poleas planas con pestaña para correa y volantes.
  { kind: "pulley", id: "pulley-flat-d20-bore5", name: "Polea con pestaña D20 eje 5 mm", outerDiameter: 20, beltDiameter: 16, width: 10, bore: 5, flangeThickness: 1.5 },
  { kind: "pulley", id: "pulley-flat-d30-bore8", name: "Polea con pestaña D30 eje 8 mm", outerDiameter: 30, beltDiameter: 24, width: 12, bore: 8, flangeThickness: 2 },
  { kind: "pulley", id: "pulley-flat-d40-bore8", name: "Polea con pestaña D40 eje 8 mm", outerDiameter: 40, beltDiameter: 32, width: 14, bore: 8, flangeThickness: 2 },
  { kind: "pulley", id: "flywheel-d60-bore8", name: "Volante de inercia D60 eje 8 mm", outerDiameter: 60, beltDiameter: 60, width: 10, bore: 8, flangeThickness: 0 },

  // Acoples rígidos para combinaciones de ejes habituales.
  { kind: "coupler", id: "coupler-rigid-3-5", name: "Acople rígido eje 3 a 5 mm", outerDiameter: 14, length: 22, boreA: 3, boreB: 5 },
  { kind: "coupler", id: "coupler-rigid-5-5", name: "Acople rígido eje 5 a 5 mm", outerDiameter: 16, length: 25, boreA: 5, boreB: 5 },
  { kind: "coupler", id: "coupler-rigid-5-8", name: "Acople rígido eje 5 a 8 mm", outerDiameter: 20, length: 30, boreA: 5, boreB: 8 },
  { kind: "coupler", id: "coupler-rigid-8-8", name: "Acople rígido eje 8 a 8 mm", outerDiameter: 22, length: 30, boreA: 8, boreB: 8 },

  // Ejes y collares que encajan entre sí por diámetro nominal.
  { kind: "shaft", id: "shaft-d3-l60", name: "Eje liso 3 × 60 mm", diameter: 3, length: 60 },
  { kind: "shaft", id: "shaft-d5-l100", name: "Eje liso 5 × 100 mm", diameter: 5, length: 100 },
  { kind: "shaft", id: "shaft-d8-l120", name: "Eje liso 8 × 120 mm", diameter: 8, length: 120 },
  { kind: "collar", id: "shaft-collar-d3", name: "Collar para eje de 3 mm", outerDiameter: 9, bore: 3, length: 5 },
  { kind: "collar", id: "shaft-collar-d5", name: "Collar para eje de 5 mm", outerDiameter: 12, bore: 5, length: 6 },
  { kind: "collar", id: "shaft-collar-d8", name: "Collar para eje de 8 mm", outerDiameter: 16, bore: 8, length: 8 },

  // Conversión de movimiento circular a alternativo y barras articuladas.
  { kind: "crank", id: "crank-disc-d40-bore5", name: "Disco de manivela D40 eje 5 mm", diameter: 40, thickness: 6, bore: 5, pinBore: 3, pinOffset: 12 },
  { kind: "cam", id: "cam-eccentric-40x30-bore5", name: "Leva excéntrica 40 × 30 eje 5 mm", width: 40, height: 30, thickness: 8, bore: 5, boreOffset: -6 },
  { kind: "link", id: "link-bar-30-hole3", name: "Biela 30 mm agujero 3 mm", centers: 30, barWidth: 8, thickness: 4, bore: 3 },
  { kind: "link", id: "link-bar-50-hole5", name: "Biela 50 mm agujero 5 mm", centers: 50, barWidth: 12, thickness: 5, bore: 5 },
  { kind: "link", id: "link-bar-80-hole5", name: "Biela 80 mm agujero 5 mm", centers: 80, barWidth: 12, thickness: 5, bore: 5 },
];

export const PARAMETRIC_GEARS = PARAMETRIC_MOTION_PARTS.filter((part) => part.kind === "gear");

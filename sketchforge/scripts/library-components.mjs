// Catálogo fuente de componentes CAD reales.
//
// Todos los archivos proceden de Adafruit_CAD_Parts (MIT) y están fijados a
// una revisión concreta. El script download-library-stls.mjs valida cada STL,
// calcula dimensiones/checksum y genera el catálogo TypeScript consumido por
// la aplicación. Los modelos no se copian al bundle: se descargan al usarlos y
// quedan en la Cache API del navegador.

export const ADAFRUIT_REVISION = "ab3dfc47c32468ba87e7652556cab25efd906eb0";

const raw = (path) =>
  `https://raw.githubusercontent.com/adafruit/Adafruit_CAD_Parts/${ADAFRUIT_REVISION}/${path}`;
const source = (folder) =>
  `https://github.com/adafruit/Adafruit_CAD_Parts/tree/${ADAFRUIT_REVISION}/${folder}`;

function component({ id, name, category, productId, folder, stl, step, preview, color, tags }) {
  return {
    id,
    name,
    category,
    manufacturer: "Adafruit",
    partNumber: String(productId),
    color,
    tags,
    modelUrl: raw(`${folder}/${stl}`),
    cadUrl: step ? raw(`${folder}/${step}`) : undefined,
    previewUrl: preview ? raw(`${folder}/${preview}`) : undefined,
    license: "MIT",
    attribution: "Adafruit Industries — Adafruit CAD Parts (MIT)",
    source: "Adafruit_CAD_Parts",
    sourceUrl: source(folder),
  };
}

export const COMPONENT_MANIFEST = [
  component({ id: "adafruit-2821-feather-esp8266", name: "Feather HUZZAH ESP8266", category: "placas", productId: 2821, folder: "2821 Feather HUZZAH ESP8266", stl: "2821 Adafruit ESP8266 Feather.stl", step: "2821 Adafruit ESP8266 Feather.step", preview: "2821-Adafruit-ESP8266-Feather.gif", color: "#176f8f", tags: ["placa", "wifi", "esp8266", "feather", "microcontrolador"] }),
  component({ id: "adafruit-3010-feather-m0-wifi", name: "Feather M0 WiFi", category: "placas", productId: 3010, folder: "3010 Adafruit Feather M0 WiFi", stl: "3010 Adafruit Feather M0 WiFi.stl", step: "3010 Adafruit Feather M0 WiFi.step", preview: "3010-Adafruit-Feather-M0-WiFi.jpg", color: "#176f8f", tags: ["placa", "wifi", "feather", "samd21", "microcontrolador"] }),
  component({ id: "adafruit-2590-metro-mini-v2", name: "Metro Mini V2", category: "placas", productId: 2590, folder: "2590 Metro Mini V2", stl: "2590 Metro Mini V2.stl", step: "2590 Metro Mini V2.step", color: "#176f8f", tags: ["placa", "arduino compatible", "metro", "atmega328"] }),
  component({ id: "adafruit-2995-feather-bluefruit", name: "Feather M0 Bluefruit LE", category: "placas", productId: 2995, folder: "2995 Feather M0 Bluefruit LE", stl: "2995 Feather M0 Bluefruit LE.stl", step: "2995 Feather M0 Bluefruit LE.step", color: "#176f8f", tags: ["placa", "bluetooth", "ble", "feather", "samd21"] }),
  component({ id: "adafruit-2471-huzzah-esp8266", name: "HUZZAH ESP8266 Breakout", category: "placas", productId: 2471, folder: "2471 HUZZAH ESP8266 Breakout", stl: "2471 HUZZAH-ESP8266-Breakout.stl", step: "2471 HUZZAH ESP8266 Breakout.step", color: "#176f8f", tags: ["placa", "wifi", "esp8266", "breakout"] }),

  component({ id: "adafruit-2472-bno055", name: "Sensor BNO055", category: "sensores", productId: 2472, folder: "2472 BNO055 Breakout", stl: "2472 BNO055 Breakout.stl", step: "2472 BNO055 Breakout.step", preview: "2472 BNO055 Breakout.jpg", color: "#6d56a5", tags: ["sensor", "imu", "orientacion", "acelerometro", "giroscopio"] }),
  component({ id: "adafruit-2652-bme280", name: "Sensor BME280 STEMMA QT", category: "sensores", productId: 2652, folder: "2652 Adafruit BME280", stl: "2652 BMP280 STEMMA QT.stl", step: "2652 BMP280 STEMMA QT.step", preview: "2652 BMP280 STEMMA QT.jpg", color: "#6d56a5", tags: ["sensor", "temperatura", "humedad", "presion", "stemma"] }),
  component({ id: "adafruit-2809-lis3dh", name: "Acelerómetro LIS3DH", category: "sensores", productId: 2809, folder: "2809 LIS3DH", stl: "2809 LIS3DH.stl", step: "2809 LIS3DH.step", preview: "2809-LIS3DH.jpg", color: "#6d56a5", tags: ["sensor", "acelerometro", "movimiento", "i2c", "spi"] }),
  component({ id: "adafruit-2857-sht31", name: "Sensor SHT31-D", category: "sensores", productId: 2857, folder: "2857 SHT31-D", stl: "2857 SHT31-D.stl", step: "2857 SHT31-D.step", preview: "2857 SHT31-D.gif", color: "#6d56a5", tags: ["sensor", "temperatura", "humedad", "i2c"] }),
  component({ id: "adafruit-3013-ds3231", name: "RTC DS3231", category: "sensores", productId: 3013, folder: "3013 DS3231 RTC", stl: "3013 DS3231 RTC.stl", step: "3013 DS3231 RTC.step", preview: "3013 DS3231 RTC.jpg", color: "#6d56a5", tags: ["sensor", "reloj", "rtc", "tiempo", "i2c"] }),

  component({ id: "adafruit-1143-micro-servo-metal", name: "Microservo de engranajes metálicos", category: "actuadores", productId: 1143, folder: "1143 Micro Servo - High Torque Metal Gear", stl: "1143 Micro Servo High Torque Metal Gear.stl", step: "1143 Micro Servo High Torque Metal Gear.step", color: "#707984", tags: ["servo", "motor", "actuador", "robotica", "alto torque"] }),
  component({ id: "adafruit-2201-submicro-servo", name: "Submicroservo SG51R", category: "actuadores", productId: 2201, folder: "2201 Submicro servo", stl: "2201 Submicro Servo SG51R.stl", step: "2201 Submicro Servo SG51R.step", color: "#707984", tags: ["servo", "motor", "actuador", "robotica", "sg51r"] }),
  component({ id: "adafruit-2307-microservo-mg923b", name: "Microservo MG923B", category: "actuadores", productId: 2307, folder: "2307 MicroServo MG923B", stl: "2307 MicroServo MG923B.stl", step: "2307 MicroServo MG923B.step", color: "#707984", tags: ["servo", "motor", "actuador", "robotica", "mg923b"] }),
  component({ id: "adafruit-1054-laser-diode", name: "Diodo láser", category: "actuadores", productId: 1054, folder: "1054 Laser Diode", stl: "Laser Diode.stl", step: "Laser Diode.step", color: "#707984", tags: ["laser", "diodo", "emisor", "actuador", "optica"] }),

  component({ id: "adafruit-1048-matrix-8x8", name: "Matriz LED 8×8 de 1.2 pulgadas", category: "pantallas", productId: 1048, folder: "1048 1.2in 8x8 Matrix Backpack", stl: "1048 1.2in 8x8 matrix backpack.stl", step: "1048 1.2in 8x8 matrix backpack.step", preview: "1048-1.2in-8x8-matrix-backpack.jpg", color: "#c34d55", tags: ["pantalla", "display", "led", "matriz", "8x8"] }),
  component({ id: "adafruit-1264-seven-segment", name: "Display de 7 segmentos 1.2 pulgadas", category: "pantallas", productId: 1264, folder: "1264 1.2in 7 Segment Display", stl: "1.2in 7 Segment Display.stl", step: "1.2in 7 Segment Display.step", preview: "1.2in 7 Segment Display.jpg", color: "#c34d55", tags: ["pantalla", "display", "led", "7 segmentos"] }),
  component({ id: "adafruit-1463-neopixel-ring-16", name: "Anillo NeoPixel 16", category: "pantallas", productId: 1463, folder: "1463 16x NeoPixel Ring", stl: "Adafruit NeoPixel Ring 16 B.stl", step: "1463 16x NeoPixel Ring.step", color: "#c34d55", tags: ["led", "neopixel", "anillo", "rgb", "16"] }),
  component({ id: "adafruit-2088-tft-144", name: "Pantalla TFT 1.44 pulgadas", category: "pantallas", productId: 2088, folder: "2088 1.44in TFT Display", stl: "2088 1.44in TFT Display-revC.stl", step: "2088 1.44in TFT Display-revC.step", preview: "2088-1.44in-TFT-Display-revC.jpg", color: "#c34d55", tags: ["pantalla", "display", "tft", "spi", "1.44"] }),
  component({ id: "adafruit-2643-neopixel-ring-12", name: "Anillo NeoPixel 12", category: "pantallas", productId: 2643, folder: "2643 NeoPixel Ring 12", stl: "2643 NeoPixel Ring 12.stl", step: "2643 NeoPixel Ring 12.step", preview: "2643 NeoPixel Ring 12.jpg", color: "#c34d55", tags: ["led", "neopixel", "anillo", "rgb", "12"] }),

  component({ id: "adafruit-1304-microlipo", name: "Cargador MicroLipo V2", category: "energia", productId: 1304, folder: "1304 MicroLipo Charger", stl: "1304 MicroLipo Charger V2.stl", step: "1304 MicroLipo Charger V2.step", preview: "1304 MicroLipo Charger V2.jpg", color: "#d59c30", tags: ["energia", "cargador", "lipo", "bateria", "usb"] }),
  component({ id: "adafruit-1870-cr2032", name: "Batería CR2032", category: "energia", productId: 1870, folder: "1870 Coin Cell CR2032", stl: "1870 Coin Cell CR2032.stl", step: "1870 Coin Cell CR2032.step", preview: "1870-Coin-Cell-CR2032.jpg", color: "#d59c30", tags: ["energia", "bateria", "pila", "cr2032", "coin cell"] }),
  component({ id: "adafruit-1904-microusb-lipo", name: "Cargador LiPo MicroUSB", category: "energia", productId: 1904, folder: "1904 MicroUSB Lipo Charger", stl: "1904 MicroUSB Lipo Charger.stl", step: "1904 MicroUSB Lipo Charger.step", color: "#d59c30", tags: ["energia", "cargador", "lipo", "bateria", "micro usb"] }),
  component({ id: "adafruit-258-lipo-1200", name: "Batería LiPo 1200 mAh", category: "energia", productId: 258, folder: "258 1200mAh lipo", stl: "258 1200mAh lipo.stl", step: "258 1200mAh lipo.step", color: "#d59c30", tags: ["energia", "bateria", "lipo", "1200mah"] }),

  component({ id: "adafruit-1119-tactile-switch", name: "Pulsador táctil 12 mm", category: "controles", productId: 1119, folder: "1119 Tactile Switch 12mm (B3F-40XX)", stl: "1119-12mm-TactileSwitch.stl", step: "1119-12mm-TactileSwitch.step", preview: "1119-12mm-TactileSwitch.jpg", color: "#2e8b78", tags: ["boton", "pulsador", "switch", "tactil", "12mm"] }),
  component({ id: "adafruit-1145-button-16mm", name: "Pulsador de 16 mm", category: "controles", productId: 1145, folder: "1145 16mm button", stl: "1445 16mm button.stl", step: "1445 16mm button.step", color: "#2e8b78", tags: ["boton", "pulsador", "switch", "16mm"] }),
  component({ id: "adafruit-2925-eight-way-switch", name: "Interruptor de 8 direcciones", category: "controles", productId: 2925, folder: "2925 8-Way Switch", stl: "2925-8-way-switch.stl", preview: "2925-8-way-switch.jpg", color: "#2e8b78", tags: ["switch", "joystick", "control", "8 direcciones"] }),

  component({ id: "adafruit-1833-microusb-breakout", name: "Breakout MicroUSB", category: "conexion", productId: 1833, folder: "1833 microUSB breakout", stl: "1833 microUSB breakout.stl", step: "1833 microUSB breakout.step", preview: "1833-microUSB-breakout.jpg", color: "#3978a8", tags: ["usb", "micro usb", "conector", "breakout"] }),
  component({ id: "adafruit-1609-permaproto-half", name: "Perma-Proto media placa", category: "conexion", productId: 1609, folder: "1609 Perma-Proto HalfSize", stl: "1609 Perma-Proto HalfSize.stl", step: "1609 Perma-Proto HalfSize.step", color: "#3978a8", tags: ["prototipado", "protoboard", "permaproto", "placa"] }),
  component({ id: "adafruit-2927-motor-featherwing", name: "Controlador Motor FeatherWing", category: "controladores", productId: 2927, folder: "2927 Motor FeatherWing", stl: "2927 Motor FeatherWing.stl", step: "2927 Motor FeatherWing.step", preview: "2927 Motor FeatherWing.gif", color: "#8a5a9b", tags: ["motor", "controlador", "featherwing", "robotica"] }),
  component({ id: "adafruit-2928-servo-featherwing", name: "Controlador Servo PWM FeatherWing", category: "controladores", productId: 2928, folder: "2928 Servo PWM FeatherWing", stl: "2928 Servo PWM FeatherWing.stl", step: "2928 Servo PWM FeatherWing.step", preview: "2928 Servo PWM FeatherWing.gif", color: "#8a5a9b", tags: ["servo", "pwm", "controlador", "featherwing", "robotica"] }),
];

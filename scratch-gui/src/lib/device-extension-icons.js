/**
 * Device Extension Icons
 * Imports PNG assets from openblock-desktop for matching extensions,
 * provides SVG fallback data URIs for extensions without PNGs.
 */

// PNG imports from openblock (webpack handles these via type: 'asset')
import ultrasonicIcon from './libraries/device-extensions/icons/ultrasonic.png';
import dhtIcon from './libraries/device-extensions/icons/dht.png';
import ds18b20Icon from './libraries/device-extensions/icons/ds18b20.png';
import apds9960Icon from './libraries/device-extensions/icons/apds9960.png';
import irReceiverIcon from './libraries/device-extensions/icons/ir_receiver.png';
import servoIcon from './libraries/device-extensions/icons/servo.png';
import dcMotorIcon from './libraries/device-extensions/icons/dc_motor.png';
import buzzerIcon from './libraries/device-extensions/icons/buzzer.png';
import neopixelIcon from './libraries/device-extensions/icons/neopixel.png';
import lcdI2cIcon from './libraries/device-extensions/icons/lcd_i2c.png';
import oledIcon from './libraries/device-extensions/icons/oled.png';
import tm1637Icon from './libraries/device-extensions/icons/tm1637.png';
import bluetoothHc05Icon from './libraries/device-extensions/icons/bluetooth_hc05.png';
import rfidIcon from './libraries/device-extensions/icons/rfid.png';
import sdCardIcon from './libraries/device-extensions/icons/sd_card.png';

/**
 * Convert SVG string to base64 data URI for reliable rendering in <img> tags
 */
const svgToBase64DataURI = (svgContent) => {
    // Use the browser-compatible btoa + encodeURIComponent approach
    const encoded = encodeURIComponent(svgContent);
    const base64 = btoa(encoded);
    return `data:image/svg+xml;base64,${base64}`;
};

// === SVG fallback icons for extensions without PNGs ===

const pirIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#e8f5ec" stroke="#4CBF6A" stroke-width="2"/>
    <path d="M20 14l8 4-8 8 8 4-8 8" stroke="#4CBF6A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="14" r="3" fill="#4CBF6A"/>
    <circle cx="24" cy="34" r="3" fill="#4CBF6A"/>
</svg>`);

const ldrIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#e8f5ec" stroke="#4CBF6A" stroke-width="2"/>
    <circle cx="24" cy="24" r="10" fill="#FFF9C4" stroke="#4CBF6A" stroke-width="1.5"/>
    <path d="M24 14v-4M24 38v-4M14 24h-4M38 24h-4" stroke="#FFD600" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="5" fill="#FFD600"/>
    <line x1="17" y1="17" x2="15" y2="15" stroke="#FFD600" stroke-width="1.5"/>
    <line x1="31" y1="17" x2="33" y2="15" stroke="#FFD600" stroke-width="1.5"/>
    <line x1="17" y1="31" x2="15" y2="33" stroke="#FFD600" stroke-width="1.5"/>
    <line x1="31" y1="31" x2="33" y2="33" stroke="#FFD600" stroke-width="1.5"/>
</svg>`);

const joystickIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#e8f5ec" stroke="#4CBF6A" stroke-width="2"/>
    <circle cx="24" cy="22" r="10" fill="none" stroke="#4CBF6A" stroke-width="1.5"/>
    <circle cx="24" cy="22" r="4" fill="#4CBF6A"/>
    <line x1="24" y1="12" x2="24" y2="16" stroke="#4CBF6A" stroke-width="2"/>
    <line x1="24" y1="28" x2="24" y2="32" stroke="#4CBF6A" stroke-width="2"/>
    <line x1="14" y1="22" x2="18" y2="22" stroke="#4CBF6A" stroke-width="2"/>
    <line x1="30" y1="22" x2="34" y2="22" stroke="#4CBF6A" stroke-width="2"/>
    <rect x="19" y="32" width="10" height="5" rx="1.5" fill="#4CBF6A" opacity="0.4"/>
</svg>`);

const rotaryEncoderIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#e8f5ec" stroke="#4CBF6A" stroke-width="2"/>
    <circle cx="24" cy="24" r="12" fill="none" stroke="#4CBF6A" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="4" fill="#4CBF6A"/>
    <line x1="24" y1="12" x2="24" y2="18" stroke="#4CBF6A" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="36" y1="24" x2="30" y2="24" stroke="#4CBF6A" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="1.5" fill="white"/>
    <line x1="12" y1="12" x2="16" y2="16" stroke="#4CBF6A" stroke-width="1" stroke-dasharray="2"/>
    <line x1="36" y1="12" x2="32" y2="16" stroke="#4CBF6A" stroke-width="1" stroke-dasharray="2"/>
</svg>`);

const stepperIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fff3e0" stroke="#FF8C1A" stroke-width="2"/>
    <rect x="14" y="12" width="4" height="24" rx="1" fill="#FF8C1A" opacity="0.4"/>
    <rect x="30" y="12" width="4" height="24" rx="1" fill="#FF8C1A" opacity="0.4"/>
    <rect x="16" y="16" width="16" height="16" rx="2" fill="none" stroke="#FF8C1A" stroke-width="1.5"/>
    <circle cx="24" cy="24" r="4" fill="#FF8C1A"/>
    <line x1="24" y1="24" x2="30" y2="24" stroke="#FF8C1A" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="20" x2="16" y2="28" stroke="#FF8C1A" stroke-width="1" stroke-dasharray="2"/>
    <line x1="32" y1="20" x2="32" y2="28" stroke="#FF8C1A" stroke-width="1" stroke-dasharray="2"/>
</svg>`);

const relayIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fff3e0" stroke="#FF8C1A" stroke-width="2"/>
    <rect x="16" y="16" width="16" height="10" rx="2" fill="none" stroke="#FF8C1A" stroke-width="1.5"/>
    <line x1="16" y1="21" x2="32" y2="21" stroke="#FF8C1A" stroke-width="2"/>
    <line x1="24" y1="16" x2="24" y2="26" stroke="#FF8C1A" stroke-width="1.5"/>
    <line x1="20" y1="30" x2="28" y2="30" stroke="#FF8C1A" stroke-width="2"/>
    <line x1="24" y1="26" x2="24" y2="34" stroke="#FF8C1A" stroke-width="1.5"/>
    <circle cx="24" cy="33" r="3" fill="#FF8C1A"/>
    <line x1="12" y1="20" x2="16" y2="20" stroke="#FF8C1A" stroke-width="1.5"/>
    <line x1="32" y1="20" x2="36" y2="20" stroke="#FF8C1A" stroke-width="1.5"/>
</svg>`);

const rtcDs1307Icon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#f0e6ff" stroke="#9966FF" stroke-width="2"/>
    <circle cx="24" cy="24" r="12" fill="none" stroke="#9966FF" stroke-width="1.5"/>
    <line x1="24" y1="24" x2="24" y2="16" stroke="#9966FF" stroke-width="2" stroke-linecap="round"/>
    <line x1="24" y1="24" x2="30" y2="24" stroke="#9966FF" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2" fill="#9966FF"/>
    <rect x="18" y="32" width="12" height="4" rx="1" fill="#9966FF" opacity="0.3"/>
    <line x1="14" y1="14" x2="17" y2="16" stroke="#9966FF" stroke-width="1"/>
    <line x1="34" y1="34" x2="31" y2="32" stroke="#9966FF" stroke-width="1"/>
</svg>`);

const keypadIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fce8fc" stroke="#CF63CF" stroke-width="2"/>
    <rect x="14" y="14" width="20" height="20" rx="2" fill="none" stroke="#CF63CF" stroke-width="1.5"/>
    <line x1="24" y1="14" x2="24" y2="34" stroke="#CF63CF" stroke-width="1"/>
    <line x1="14" y1="24" x2="34" y2="24" stroke="#CF63CF" stroke-width="1"/>
    <circle cx="19" cy="19" r="2.5" fill="#CF63CF"/>
    <circle cx="29" cy="19" r="2.5" fill="#CF63CF"/>
    <circle cx="19" cy="29" r="2.5" fill="#CF63CF"/>
    <circle cx="29" cy="29" r="2.5" fill="#CF63CF"/>
    <circle cx="24" cy="24" r="2.5" fill="#CF63CF"/>
</svg>`);

const nrf24Icon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#f0e6ff" stroke="#9966FF" stroke-width="2"/>
    <path d="M16 20c3-4 13-4 16 0M18 24c2-3 10-3 12 0" stroke="#9966FF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M20 28c1-2 6-2 8 0" stroke="#9966FF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="33" r="2.5" fill="#9966FF"/>
    <rect x="20" y="12" width="8" height="2" rx="1" fill="#9966FF" opacity="0.3"/>
    <rect x="20" y="34" width="8" height="2" rx="1" fill="#9966FF" opacity="0.3"/>
</svg>`);

const hc12Icon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#f0e6ff" stroke="#9966FF" stroke-width="2"/>
    <rect x="16" y="18" width="16" height="12" rx="2" fill="none" stroke="#9966FF" stroke-width="1.5"/>
    <line x1="20" y1="18" x2="20" y2="30" stroke="#9966FF" stroke-width="1"/>
    <line x1="28" y1="18" x2="28" y2="30" stroke="#9966FF" stroke-width="1"/>
    <path d="M18 22l6 4 6-4" stroke="#9966FF" stroke-width="2" fill="none"/>
    <line x1="14" y1="24" x2="16" y2="24" stroke="#9966FF" stroke-width="1.5"/>
    <line x1="32" y1="24" x2="34" y2="24" stroke="#9966FF" stroke-width="1.5"/>
</svg>`);

const wifiIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#f0e6ff" stroke="#9966FF" stroke-width="2"/>
    <path d="M14 20c6-5 14-5 20 0M17 25c4-3 10-3 14 0" stroke="#9966FF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M20 30c2-2 4-2 6 0" stroke="#9966FF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="35" r="2.5" fill="#9966FF"/>
</svg>`);

const ethernetIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#f0e6ff" stroke="#9966FF" stroke-width="2"/>
    <rect x="16" y="18" width="16" height="12" rx="1" fill="none" stroke="#9966FF" stroke-width="1.5"/>
    <rect x="19" y="20" width="10" height="8" rx="1" fill="#9966FF" opacity="0.2"/>
    <line x1="22" y1="20" x2="22" y2="28" stroke="#9966FF" stroke-width="1"/>
    <line x1="26" y1="20" x2="26" y2="28" stroke="#9966FF" stroke-width="1"/>
    <rect x="14" y="22" width="2" height="4" rx="0.5" fill="#9966FF"/>
    <rect x="32" y="22" width="2" height="4" rx="0.5" fill="#9966FF"/>
</svg>`);

const gpsIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fce8fc" stroke="#CF63CF" stroke-width="2"/>
    <path d="M24 12c-5 0-9 4-9 8 0 6 9 16 9 16s9-10 9-16c0-4-4-8-9-8z" fill="none" stroke="#CF63CF" stroke-width="1.5"/>
    <circle cx="24" cy="20" r="3.5" fill="#CF63CF"/>
</svg>`);

const cameraIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fce8fc" stroke="#CF63CF" stroke-width="2"/>
    <rect x="14" y="18" width="20" height="14" rx="2" fill="none" stroke="#CF63CF" stroke-width="1.5"/>
    <circle cx="24" cy="25" r="5" fill="none" stroke="#CF63CF" stroke-width="1.5"/>
    <circle cx="24" cy="25" r="2" fill="#CF63CF"/>
    <polygon points="22,16 26,16 28,18 20,18" fill="#CF63CF" opacity="0.4"/>
</svg>`);

const canIcon = svgToBase64DataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="#fce8fc" stroke="#CF63CF" stroke-width="2"/>
    <line x1="14" y1="18" x2="34" y2="18" stroke="#CF63CF" stroke-width="2"/>
    <line x1="14" y1="30" x2="34" y2="30" stroke="#CF63CF" stroke-width="2"/>
    <line x1="14" y1="18" x2="14" y2="30" stroke="#CF63CF" stroke-width="1.5"/>
    <line x1="34" y1="18" x2="34" y2="30" stroke="#CF63CF" stroke-width="1.5"/>
    <text x="24" y="27" text-anchor="middle" fill="#CF63CF" font-size="7" font-weight="bold">CAN</text>
</svg>`);

/**
 * Icons map: extensionId → imported PNG or base64 SVG data URI
 */
export const ICONS = {
    // PNG icons (from openblock)
    ultrasonic: ultrasonicIcon,
    dht: dhtIcon,
    ds18b20: ds18b20Icon,
    apds9960: apds9960Icon,
    ir_receiver: irReceiverIcon,
    servo: servoIcon,
    dc_motor: dcMotorIcon,
    buzzer: buzzerIcon,
    neopixel: neopixelIcon,
    lcd_i2c: lcdI2cIcon,
    oled: oledIcon,
    tm1637: tm1637Icon,
    bluetooth_hc05: bluetoothHc05Icon,
    rfid: rfidIcon,
    sd_card: sdCardIcon,

    // SVG fallback icons
    pir: pirIcon,
    ldr: ldrIcon,
    joystick: joystickIcon,
    rotary_encoder: rotaryEncoderIcon,
    stepper: stepperIcon,
    relay: relayIcon,
    rtc_ds1307: rtcDs1307Icon,
    keypad: keypadIcon,
    nrf24: nrf24Icon,
    hc12: hc12Icon,
    wifi: wifiIcon,
    ethernet: ethernetIcon,
    gps: gpsIcon,
    camera: cameraIcon,
    can: canIcon
};

/**
 * Get icon URL for a device extension by its ID
 * @param {string} extensionId
 * @returns {string|null} image URL or null if not found
 */
export const getIconForExtension = (extensionId) => {
    return ICONS[extensionId] || null;
};

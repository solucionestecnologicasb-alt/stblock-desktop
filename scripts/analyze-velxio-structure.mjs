#!/usr/bin/env node
/**
 * Analyze Velxio bundle structure for improvement proposals:
 *  - e6 component registry (sensor components)
 *  - add-component menu
 *  - component catalog / base components
 *  - UI panels and layout
 */
import fs from 'fs';

const orig = fs.readFileSync('scratch-gui/static/velxio/assets/index-B_4T4h6s.js', 'utf8');

// 1. Extract the e6 registry keys with their structure
console.log('=== e6 sensor registry ===');
const e6Start = orig.indexOf('e6={mpu6050:');
const e6End = e6Start + 8000; // probably enough
const e6Block = orig.slice(e6Start, e6End);
console.log(e6Block.slice(0, 3000));

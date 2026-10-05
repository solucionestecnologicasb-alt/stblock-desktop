const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname,'..');
const normalize = require('../scratch-vm/src/devices/normalize-manifest');
const directory=path.join(root,'scratch-vm/src/devices/manifests');
for (const file of fs.readdirSync(directory)) {
    if (!file.endsWith('.json') || file === 'summary.json') continue;
    const target=path.join(directory,file), before=fs.readFileSync(target,'utf8');
    const manifest=JSON.parse(before);
    manifest.categories.forEach(normalize);
    if (JSON.stringify(JSON.parse(before)) !== JSON.stringify(manifest)) fs.writeFileSync(target,JSON.stringify(manifest)+'\n');
}
const file=path.join(root,'scratch-vm/src/devices/extension-catalog.json');
const catalog=JSON.parse(fs.readFileSync(file));
const add=(id,opcode,text,args)=> {
    const extension=catalog.find(e=>e.extensionId===id);
    if (!extension.blocks.some(b=>b.opcode===opcode)) extension.blocks.unshift({opcode,blockType:'command',text,arguments:Object.fromEntries(Object.entries(args).map(([key,value])=>[key,{type:'number',defaultValue:value}]))});
};
add('stepper','stepper_init','configurar stepper pasos/vuelta [REV] pines [P1] [P2] [P3] [P4]',{REV:200,P1:8,P2:9,P3:10,P4:11});
add('rfid','rfid_init','inicializar RFID SS [SS] RST [RST]',{SS:10,RST:9});
add('keypad','keypad_init','configurar teclado filas [R1] [R2] [R3] [R4] columnas [C1] [C2] [C3] [C4]',{R1:2,R2:3,R3:4,R4:5,C1:6,C2:7,C3:8,C4:9});
for(const b of catalog.find(e=>e.extensionId==='relay').blocks) {
    if(!b.arguments.ACTIVE){b.text+=' nivel activo [ACTIVE]'; b.arguments.ACTIVE={type:'string',menu:['HIGH','LOW'],defaultValue:'HIGH'};}
}
const oled=catalog.find(e=>e.extensionId==='oled').blocks.find(b=>b.opcode==='oled_init');
if(!oled.arguments.ADDR){oled.text+=' direccion [ADDR]'; oled.arguments.ADDR={type:'string',defaultValue:'0x3C'};}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
// GUI delegates metadata construction to the same implementation as the VM.
const activator=path.join(root,'scratch-gui/src/lib/device-extension-activator.js');
let source=fs.readFileSync(activator,'utf8');
const start=source.indexOf('const EXTENSION_COLORS =');
const end=source.indexOf('const activateDeviceExtension =');
if(start>=0) source=source.slice(0,start)+"import {buildExtensionCategoryInfo, generateBlockJSON, EXTENSION_COLORS} from 'scratch-vm/src/devices/device-extensions';\n\n"+source.slice(end);
fs.writeFileSync(activator,source);

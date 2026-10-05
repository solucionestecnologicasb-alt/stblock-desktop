const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const Generator = require('../scratch-vm/src/generators/arduino');
const Runtime = require('../scratch-vm/src/engine/runtime');
const catalog = require('../scratch-vm/src/devices/extension-catalog.json');
const manifests = require('../scratch-vm/src/devices/device-manifests');
const {buildExtensionCategoryInfo} = require('../scratch-vm/src/devices/device-extensions');
const compatible = require('../scratch-vm/src/devices/extension-compatibility');
const sb3 = require('../scratch-vm/src/serialization/sb3');
const root = path.resolve(__dirname,'..');
const output = path.join(root,'test-results/electronics');
fs.mkdirSync(output,{recursive:true});
function blockFromInfo(info, opcode, blocks) {
    const block={id:opcode,opcode,inputs:{},fields:{},next:null,parent:'hat'};
    for(const [name,arg] of Object.entries(info.arguments || {})) {
        if(arg.menu) block.fields[name]={value:arg.defaultValue};
        else {
            const id=`${opcode}_${name}`;
            const numeric=['number','uint8_number','half_angle'].includes(arg.type);
            blocks[id]={id,opcode:numeric?'math_number':'text',inputs:{},fields:{[numeric?'NUM':'TEXT']:{value:String(arg.defaultValue === undefined ? 0 : arg.defaultValue)}},shadow:true,parent:opcode};
            block.inputs[name]={block:id,shadow:id};
        }
    }
    blocks[block.id]=block;
    return block;
}
let tested=0;
for(const ext of catalog) {
    const g=new Generator(), blocks={};
    g.reset();
    g.deviceProfile={deviceId:ext.extensionId==='stbV2Ultra'?'stbBoardV2':'arduinoUno',type:'arduino'};
    for(const info of ext.blocks) {
        const opcode=`${ext.extensionId}_${info.opcode}`;
        assert.equal(sb3.getExtensionIdForOpcode(opcode),ext.extensionId);
        const block=blockFromInfo(info,opcode,blocks);
        const code=g.generateBlock(block,blocks);
        assert.equal(g.errors.size,0,`${opcode}: ${[...g.errors]}`);
        assert.ok(code !== undefined,opcode);
        if(code) g.setupCode.push(info.blockType==='command'?code:`(void)(${code});\n`);
        tested++;
    }
    const category=buildExtensionCategoryInfo(ext);
    for(const block of category.blocks) {
        assert.equal(block.json.outputShape,block.info.blockType==='boolean'?1:block.info.blockType==='reporter'?2:3);
    }
    const folder=path.join(output,ext.extensionId);fs.mkdirSync(folder,{recursive:true});
    fs.writeFileSync(path.join(folder,`${ext.extensionId}.ino`),g.buildFinalCode());
}
const correctedTypes=new Set(Object.keys(require('../scratch-vm/src/generators/arduino/board-fixes')).concat([
    'arduino_motores_desactivarTodosLosTriggers','arduino_motores_tipoMotoresSeleccionado',
    'arduino_motores_motoresConfigurados','arduino_motores_diametroRuedaConfigurado',
    'arduino_motores_rpmMaxConfigurado','arduino_motores_anchoEntreRuedasConfigurado',
    'arduino_stbv2motores_desactivarRetrasoArranque','arduino_stbv2motores_motoresConfigurados',
    'arduino_stbv2precision_detenerPrecision'
]));
let boardFixCount=0;
for(const board of Object.values(manifests).filter(b=>b.type==='arduino').map(b=>({id:b.deviceId}))) {
    const g=new Generator(); g.reset();g.deviceProfile={deviceId:board.id,type:'arduino'};
    const blocks={};
    for(const entry of manifests[board.id].categories.flatMap(c=>c.blocks).filter(b=>b.json && correctedTypes.has(b.json.type))) {
        const missing={type:entry.json.type};
        const block=blockFromInfo(entry.info,missing.type,blocks);
        const code=g.generateBlock(block,blocks);
        assert.equal(g.errors.size,0,`${board.id}/${missing.type}: ${[...g.errors]}`);
        if(code) g.setupCode.push(entry.info.blockType==='command' || entry.info.blockType==='conditional' ? code : `(void)(${code});\n`);
        boardFixCount++;
    }
    if(g.setupCode.length) {
        const folder=path.join(output,board.id);fs.mkdirSync(folder,{recursive:true});
        fs.writeFileSync(path.join(folder,`${board.id}.ino`),g.buildFinalCode());
    }
}
const runtime=new Runtime();
runtime.setDeviceProfile({deviceId:'arduinoUno',type:'arduino'},'upload',false);
runtime.setDeviceExtensionIds(['dht','dht','bad-id'],false);
assert.deepEqual(runtime.getDeviceExtensionIds(),['dht']);
runtime.setDeviceProfile({deviceId:'arduinoMega2560',type:'arduino'},'upload',false);
assert.ok(runtime._deviceBlockInfo.some(c=>c.id==='dht'));
assert.deepEqual(runtime.getDeviceExtensionIds(),['dht']);
runtime.setDeviceExtensionIds([],false);
assert.ok(!runtime._deviceBlockInfo.some(c=>c.id==='dht'));
const g=new Generator();g.reset();g.generateBlock({opcode:'missing_handler',inputs:{},fields:{}},{});
assert.match(g.buildFinalCode(),/#error STBlock: Bloque no soportado: missing_handler/);
g.reset();g.generateBlock({opcode:'stepper_stepper_move',inputs:{},fields:{}},{});
assert.match(g.buildFinalCode(),/#error STBlock:.*inicializacion/);
assert.equal(compatible('stbV2Ultra',{deviceId:'arduinoUno'}),false);
assert.equal(compatible('dht',{deviceId:'microbit'}),false);
for(const manifest of Object.values(manifests)) for(const category of manifest.categories) for(const block of category.blocks) {
    for(const arg of block.json && block.json.args0 || []) assert.ok(!arg.name || !arg.name.startsWith('['),`${manifest.deviceId}: ${arg.name}`);
}
console.log(`PASS: ${tested} extension blocks, ${boardFixCount} missing board mappings; persistence across profiles, removal, invalid IDs, unsupported/init diagnostics, compatibility and all manifest argument names.`);
runtime.dispose();

import {buildSearchIndex, searchBlocks, buildSearchToolboxXML} from '../../../src/lib/block-search-index';
import {searchExtensions, isExtensionCompatible} from '../../../src/lib/libraries/device-extensions';
import {getDeviceProfile} from '../../../src/lib/device-profiles';

// jsdom 9 in Jest 21 has DOMParser but no XMLSerializer.
global.XMLSerializer = class {
    serializeToString (node) { return node.outerHTML; }
};

test('Spanish metadata and default input values survive search', () => {
    const xml='<xml><category id="pins" name="Pines"><block type="device_read"><value name="PIN"><shadow type="math_number"><field name="NUM">13</field></shadow></value></block></category></xml>';
    const info=[{blocks:[{json:{type:'device_read',message0:'leer analógico %1'}}]}];
    const index=buildSearchIndex(null,{Msg:{}},xml,info);
    const result=searchBlocks(index,'  analogico  ');
    expect(result.length).toBe(1);
    expect(buildSearchToolboxXML(result)).toContain('>13</field>');
});

test('search includes variables, lists and procedures with their original IDs', () => {
    const xml=buildSearchToolboxXML([
        {type:'data_variable',blockType:'variable',id:'v1',name:'a < b'},
        {type:'data_listcontents',blockType:'list',id:'l1',name:'lecturas'},
        {type:'procedures_call',blockType:'procedure',mutationXml:'<mutation proccode="mover %s" argumentids="[&quot;arg1&quot;]" argumentdefaults="[&quot;10&quot;]"/>'}
    ]);
    const doc=new DOMParser().parseFromString(xml,'text/xml');
    expect(doc.querySelector('field[name="VARIABLE"]').getAttribute('id')).toBe('v1');
    expect(doc.querySelector('field[name="VARIABLE"]').textContent).toBe('a < b');
    expect(doc.querySelector('field[name="LIST"]').getAttribute('id')).toBe('l1');
    expect(doc.querySelector('value[name="arg1"] field').textContent).toBe('10');
    expect(buildSearchToolboxXML([])).toContain('Sin resultados');
});

test('extension search handles accents and compatibility is not inferred from arduino tag', () => {
    expect(searchExtensions('  ultrasonico  ').length).toBe(2);
    expect(isExtensionCompatible('stbV2Ultra',{deviceId:'arduinoUno'})).toBe(false);
    expect(isExtensionCompatible('stbV2Ultra',{deviceId:'stbBoardV2'})).toBe(true);
    expect(isExtensionCompatible('dht',{deviceId:'microbit'})).toBe(false);
});

test('older saved profiles without a mode array can be reopened', () => {
    expect(getDeviceProfile({deviceId:'arduinoUno',type:'arduino',defaultProgramMode:'upload'}).capabilities.upload).toBe(true);
});

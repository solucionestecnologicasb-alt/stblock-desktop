(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const errors=[],checks=[];
    window.electronicsBlocks.props.vm.runtime.setDeviceExtensionIds([]);await wait(150);
    document.querySelector('button[title="Agregar extensión"]').click();await wait(150);
    const card=Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.innerText.includes('Sensor DHT11/DHT22'));
    if(!card)throw new Error('DHT card not available');card.click();await wait(350);
    let c=window.electronicsBlocks;const vm=c.props.vm,SB=c.ScratchBlocks,ws=c.workspace;
    if(!vm.runtime.getDeviceExtensionIds().includes('dht'))errors.push('DHT not activated by card');
    c.workspace.toolbox_.setSelectedCategoryById('dht');await wait(100);
    const blocks=ws.getFlyout().getWorkspace().getAllBlocks();
    const palette={selected:c.workspace.toolbox_.selectedItem_&&c.workspace.toolbox_.selectedItem_.id_,hardware:vm.runtime.isHardwareModeActive(),
        categories:c.workspace.toolbox_.categoryMenu_.categories_.map(category=>category.id_),types:blocks.map(b=>b.type),xml:c.props.toolboxXML.includes('dht_dht_readTemperature')};
    if(!blocks.some(b=>b.type==='dht_dht_readTemperature'))errors.push('DHT missing from palette');
    if(blocks.some(b=>b.getColour().toLowerCase()==='#ff0000'))errors.push('red DHT block');
    checks.push('activate DHT through extension library');
    document.querySelector('button[title="Agregar extensión"]').click();await wait(100);
    const loaded=Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.innerText.includes('Sensor DHT11/DHT22'));
    if(!loaded.innerText.includes('Cargada'))errors.push('loaded badge out of sync');
    document.querySelector('button[title="Cerrar"]').click();
    const xml='<xml><block type="event_whenflagclicked" id="qa_hat"><next><block type="control_wait"><value name="DURATION"><block type="dht_dht_readTemperature" id="qa_dht"><field name="TYPE">DHT22</field><value name="PIN"><shadow type="math_number"><field name="NUM">4</field></shadow></value></block></value></block></next></block></xml>';
    SB.Xml.domToWorkspace(SB.Xml.textToDom(xml),ws);await wait(300);
    const code=vm.generateArduinoCode();
    if(!code.includes('DHT22')||!code.includes('.readTemperature()')||code.includes('#error'))errors.push('DHT program generation: '+code);
    const saved=vm.toJSON();
    await vm.loadProject(saved);await wait(2000);
    if(!vm.runtime.getDeviceExtensionIds().includes('dht'))errors.push('DHT extension lost on project load');
    const data=vm.editingTarget.blocks._blocks;
    if(!data.qa_dht || data.qa_dht.fields.TYPE.value!=='DHT22')errors.push('DHT block data lost on load');
    checks.push('DHT22 pin 4 generated through shared VM; project save/reload preserves block and extension');
    return {checks,errors,code,palette};
})()

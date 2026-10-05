(async () => {
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const c=window.electronicsBlocks;
    if(!c)throw new Error('Blocks component unavailable');
    const vm=c.props.vm, ws=c.workspace, SB=c.ScratchBlocks;
    const errors=[];const checks=[];
    const initialXml=SB.Xml.domToText(SB.Xml.workspaceToDom(ws));
    // Test the actual Blockly flyout and container, including programmatic refresh.
    for(let i=0;i<12;i++) {
        for(const id of ['control','events']) {
            c.workspace.toolbox_.setSelectedCategoryById(id);
            await delay(25);
            const blocks=ws.getFlyout().getWorkspace().getAllBlocks();
            if(!blocks.length)errors.push(`empty ${id}`);
            const expected=id==='control'?'control_repeat':'event_whenbroadcastreceived';
            if(!blocks.some(b=>b.type===expected))errors.push(`wrong category content ${id}`);
            for(const b of blocks) {
                if(b.getColour()==='#FF0000' || b.getColour()==='#ff0000')errors.push(`red ${id}:${b.type}`);
                if(!b.inputList || !b.inputList.length)errors.push(`missing fields ${id}:${b.type}`);
            }
            c.updateToolbox();
            if(c.workspace.toolbox_.getSelectedCategoryId()!==id)errors.push(`selection lost ${id}`);
        }
    }
    checks.push('24 category changes + 24 toolbox restores');
    vm.runtime.setDeviceExtensionIds(['dht','servo']);
    vm.setDeviceProfile({deviceId:'arduinoUno',type:'arduino',generator:'arduino',programMode:['upload'],defaultProgramMode:'upload'},'upload');
    vm.runtime.setHardwareModeActive(true);
    c._toolboxCache=null;
    c.props.updateToolboxState(c.getToolboxXML());
    await delay(250);
    const category=vm.runtime._deviceBlockInfo.find(category=>category.id==='dht');
    c.handleExtensionAdded(category);
    const xml=SB.Xml.textToDom(`<xml>${category.blocks[0].xml}</xml>`);
    const b=SB.Xml.domToBlock(xml.firstChild,ws);
    b.initSvg();b.render();
    const before=SB.Xml.domToText(SB.Xml.blockToDom(b));
    for(const id of ['arduinoMega2560','arduinoEsp32','arduinoUno']) {
        vm.setDeviceProfile({deviceId:id,type:'arduino',generator:'arduino',programMode:['upload'],defaultProgramMode:'upload'},'upload');
        await delay(100);
        if(!vm.runtime._deviceBlockInfo.some(category=>category.id==='dht'))errors.push(`extension lost ${id}`);
        if(!ws.getBlockById(b.id))errors.push(`program block lost ${id}`);
        else if(SB.Xml.domToText(SB.Xml.blockToDom(ws.getBlockById(b.id)))!==before) errors.push(`program block changed ${id}`);
    }
    checks.push('DHT block preserved through Uno/Mega/ESP32/Uno');
    const saved=JSON.parse(vm.toJSON());
    if(!saved.deviceExtensions.includes('dht'))errors.push('extension not serialized');
    vm.runtime.setDeviceExtensionIds([]);
    if(vm.runtime._deviceBlockInfo.some(category=>category.id==='dht'))errors.push('extension not removed');
    vm.runtime.setDeviceExtensionIds(saved.deviceExtensions);
    checks.push('extension serialization/removal/restoration');
    b.dispose(false,false);
    return {checks,errors,programBefore:initialXml.length,preservedDefinitions:true};
})()

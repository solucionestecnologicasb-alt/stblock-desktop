(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const c=window.electronicsBlocks,vm=c.props.vm,ws=c.workspace;
    const ids=['ultrasonic','stbV2Ultra','dht','ds18b20','apds9960','ir_receiver','pir','ldr','joystick','rotary_encoder','servo','dc_motor','stepper','buzzer','relay','neopixel','lcd_i2c','oled','tm1637','bluetooth_hc05','rfid','rtc_ds1307','sd_card','keypad'];
    vm.runtime.setDeviceExtensionIds(ids);await wait(500);
    const errors=[];let count=0;
    for(const id of ids){
        const item=ws.toolbox_.categoryMenu_.categories_.find(category=>category.id_===id);
        if(!item){errors.push(`missing category ${id}`);continue;}
        item.item_.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));await wait(40);
        const expected=vm.runtime._deviceBlockInfo.find(category=>category.id===id).blocks;
        const shown=ws.getFlyout().getWorkspace().getTopBlocks(false);
        for(const entry of expected){
            const block=shown.find(b=>b.type===entry.json.type);
            if(!block){errors.push(`missing block ${entry.json.type}`);continue;}
            if(block.getColour().toLowerCase()==='#ff0000')errors.push(`red block ${block.type}`);
            for(const [key,arg] of Object.entries(entry.info.arguments||{})){
                if(arg.menu && String(block.getFieldValue(key))!==String(arg.defaultValue))errors.push(`wrong dropdown ${block.type}.${key}`);
                if(!arg.menu && arg.type!=='boolean' && !block.getInputTargetBlock(key))errors.push(`missing default ${block.type}.${key}`);
            }
            count++;
        }
    }
    return {categories:ids.length,blocksChecked:count,errors};
})()

(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const find=()=>{
        let store,blocks;
        function walk(f){if(!f)return;if(f.memoizedProps&&f.memoizedProps.store&&f.memoizedProps.store.getState)store=f.memoizedProps.store;if(f.stateNode&&f.stateNode.workspace&&f.stateNode.ScratchBlocks)blocks=f.stateNode;walk(f.child);walk(f.sibling);}
        Array.from(document.querySelectorAll('body *')).filter(e=>e._reactRootContainer).forEach(e=>walk(e._reactRootContainer._internalRoot.current));
        return {store,blocks};
    };
    const {store}=find();if(!store)throw new Error('Redux store not found');
    const state=store.getState().scratchGui.deviceMode;
    const device=state.availableDevices.find(d=>d.deviceId==='arduinoUno');
    store.dispatch({type:'scratch-gui/device-mode/SET_SELECTED_DEVICE',device});
    store.dispatch({type:'scratch-gui/device-mode/SET_DEVICE_MODE',mode:'device'});
    await wait(3500);
    const {blocks}=find();window.electronicsBlocks=blocks;
    return {mode:store.getState().scratchGui.deviceMode.mode,device:blocks.props.selectedDevice.deviceId,categories:blocks.workspace.toolbox_.categoryMenu_.categories_.map(c=>({id:c.id_,name:c.name_})),buttons:Array.from(document.querySelectorAll('button')).map(e=>({text:e.innerText,title:e.title})).filter(e=>e.text||e.title)};
})()

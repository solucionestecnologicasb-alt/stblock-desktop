(() => {
    const root=document.querySelector('#app') || document.querySelector('#root');
    const roots=Array.from(document.querySelectorAll('body *')).filter(el=>el._reactRootContainer);
    let found=[];
    function walk(fiber){if(!fiber)return;if(fiber.stateNode && fiber.stateNode.workspace && fiber.stateNode.ScratchBlocks)found.push(fiber.stateNode);walk(fiber.child);walk(fiber.sibling);}
    roots.forEach(el=>walk(el._reactRootContainer._internalRoot.current));
    window.electronicsBlocks=found[0];
    return {title:document.title,text:document.body.innerText.slice(0,5000),roots:roots.length,blocks:found.length,globals:Object.keys(window).filter(k=>/block|vm|store/i.test(k))};
})()

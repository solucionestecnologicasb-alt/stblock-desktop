const fs=require('fs');
(async()=>{
    const pages=await (await fetch('http://localhost:9333/json')).json();
    const page=pages.find(p=>p.type==='page');
    const ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    let id=0;const pending=new Map();
    ws.addEventListener('message',event=>{const message=JSON.parse(event.data);const entry=pending.get(message.id);if(entry){pending.delete(message.id);message.error?entry.reject(message.error):entry.resolve(message.result);}});
    const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
    if(process.argv[2]==='errors') {
        const errors=[];
        ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown'||m.method==='Log.entryAdded')errors.push(m.params);});
        await send('Runtime.enable');await send('Log.enable');await send('Page.reload',{ignoreCache:true});
        await new Promise(resolve=>setTimeout(resolve,12000));console.log(JSON.stringify(errors,null,2));
    } else if(process.argv[2]==='open') {
        await send('Page.enable');await send('Page.navigate',{url:'http://localhost:8601'});
        console.log('Navigated to STBlock');
    } else if(process.argv[2]==='screenshot') {
        const result=await send('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(process.argv[3],Buffer.from(result.data,'base64'));console.log(process.argv[3]);
    } else {
        const result=await send('Runtime.evaluate',{expression:fs.readFileSync(process.argv[2],'utf8'),awaitPromise:true,returnByValue:true,timeout:90000});
        if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        console.log(JSON.stringify(result.result.value,null,2));
        if(result.result.value && result.result.value.errors) {
            const path=require('path');
            const folder=path.resolve(__dirname,'../test-results/electronics');fs.mkdirSync(folder,{recursive:true});
            fs.writeFileSync(path.join(folder,path.basename(process.argv[2],'.js')+'.json'),JSON.stringify(result.result.value,null,2));
            if(result.result.value.errors.length)process.exitCode=1;
        }
    }
    ws.close();
})().catch(error=>{console.error(error);process.exit(1);});

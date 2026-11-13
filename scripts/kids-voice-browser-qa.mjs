import assert from 'node:assert/strict';
import {connect} from '../sketchforge/scripts/mesh-edit-cdp.mjs';
const c=await connect();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async(expression,timeout=30000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await c.evaluate(expression))return;await delay(150);}throw Error('Timeout: '+expression);};
const click=async expression=>{
    const point=await c.evaluate(`(()=>{const b=${expression};if(!b)throw Error('Missing button');const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
};
const checks=[];
try {
    await c.send('Page.navigate',{url:process.env.KIDS_QA_URL||'http://localhost:3217'});
    await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aventuras para imaginar'))`,45000);
    await c.evaluate(`localStorage.setItem('stblockKidsBlockVoice','on')`);
    await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aventuras para imaginar'))`);
    await wait(`!!document.querySelector('iframe')?.contentWindow?.document.querySelector('#newproject, #palette')`);
    if(await c.evaluate(`!!document.querySelector('iframe').contentWindow.document.getElementById('newproject')`)){
        await c.evaluate(`(()=>{const w=document.querySelector('iframe').contentWindow,el=w.document.getElementById('newproject'),r=el.getBoundingClientRect();for(const type of ['mousedown','mouseup'])el.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,view:w,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0}));})()`);
    }
    await wait(`!!document.querySelector('iframe').contentWindow.document.querySelector('#palette canvas')`);
    await c.evaluate(`window.qaVoices=[];window.qaNativeTTS=0;for(const w of [window,document.querySelector('iframe').contentWindow]){for(const name of ['speechSynthesis','SpeechSynthesisUtterance'])Object.defineProperty(w,name,{configurable:true,get(){window.qaNativeTTS++;throw Error('Native TTS accessed');}});}const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('/kids/voice/')||this.dataset.kidsVoiceBase){const item={url:this.src,base:this.dataset.kidsVoiceBase||'',playing:false};window.qaVoices.push(item);this.addEventListener('playing',()=>item.playing=true,{once:true});window.qaVoiceElement=this;}return original.call(this);};`);
    const point=await c.evaluate(`(()=>{const f=document.querySelector('iframe'),w=f.contentWindow,fr=f.getBoundingClientRect(),r=w.document.querySelector('#palette canvas').getBoundingClientRect(),t=w.document.querySelector('#scriptscontainer').getBoundingClientRect();return{x:fr.x+r.x+r.width/2,y:fr.y+r.y+r.height/2,tx:fr.x+t.x+200,ty:fr.y+t.y+70};})()`);
    await c.send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
    for(let i=1;i<=12;i++){await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+(point.tx-point.x)*i/12,y:point.y+(point.ty-point.y)*i/12,buttons:1,button:'left'});await delay(35);}
    await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.tx,y:point.ty,button:'left',clickCount:1});
    await wait(`window.qaVoices.some(voice=>voice.playing)`);
    assert.equal(await c.evaluate(`window.qaNativeTTS`),0);
    checks.push('A real block drag plays an included WAV without touching either native speech API');
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Historia')).click()`);
    await wait(`!![...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Mundo 1:'))`);
    const before=await c.evaluate(`window.qaVoices.length`);
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Mundo 1:')).click()`);
    for(let i=0;i<160;i++){
        const started=await c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Empezar el reto'));if(b&&!b.disabled)b.click();return window.qaVoices.length>${before};})()`);
        if(started)break;await delay(150);
    }
    await wait(`window.qaVoices.length>${before} && window.qaVoices.at(-1).playing`);
    checks.push('The story introduction plays from the included voice catalog');
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Silenciar')).click()`);
    const mutedCount=await c.evaluate(`window.qaVoices.length`);await delay(500);
    assert.equal(await c.evaluate(`window.qaVoices.length`),mutedCount);
    assert.equal(await c.evaluate(`window.qaVoiceElement.paused`),true);
    checks.push('Mute pauses the current recording and cancels queued story fragments');
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').startsWith('Activar')).click()`);
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Consejo')).click()`);
    await wait(`window.qaVoices.length>${mutedCount} && window.qaVoices.at(-1).playing`);
    assert.equal(await c.evaluate(`window.qaNativeTTS`),0);
    assert.ok(await c.evaluate(`window.qaVoices.every(voice=>new URL(voice.url).origin===location.origin && (voice.url.includes('.wav?v=')||voice.url.startsWith('blob:')))`));
    checks.push('Advice resumes with local audio; every recording uses the application origin');
    await c.evaluate(`(()=>{const s=document.querySelector('select[aria-label="Acento de la narración"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'es-MX');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await wait(`window.qaVoiceElement.paused`);
    assert.equal(await c.evaluate(`localStorage.getItem('stblockKidsVoiceLocale')`),'es-MX');
    await c.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Consejo')).click()`);
    await wait(`window.qaVoices.at(-1).base.includes('/es-MX/') && window.qaVoices.at(-1).playing`);
    assert.equal(await c.evaluate(`window.qaNativeTTS`),0);
    checks.push('Switching to Latin American Spanish cancels the previous voice and plays Mexican recordings');
    const beforeVariable=await c.evaluate(`window.qaVoices.length`);
    await c.evaluate(`document.querySelector('iframe').contentWindow.eval("window.parent.postMessage({type:'STBLOCK_KIDS_STORY_RULE_VIOLATION',message:'Tienes 5 estrellas. Ganaste 100 puntos.'},window.location.origin)")`);
    await wait(`window.qaVoices.length>${beforeVariable} && window.qaVoices.at(-1).playing`);
    assert.ok(await c.evaluate(`window.qaVoices.at(-1).url.startsWith('blob:')`));
    assert.equal(await c.evaluate(`window.qaNativeTTS`),0);
    checks.push('Variable story feedback plays as one continuous PCM stream without native synthesis');
    await c.send('Page.reload');
    await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aventuras para imaginar'))`,45000);
    await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aventuras para imaginar'))`);
    await wait(`document.querySelector('select[aria-label="Acento de la narración"]')?.value==='es-MX'`);
    checks.push('The selected accent survives an application reload');
    await c.send('Emulation.setDeviceMetricsOverride',{width:650,height:900,deviceScaleFactor:1,mobile:false});
    await c.evaluate(`document.querySelector('button[aria-label="Abrir menú de STBlock Kids"]').click()`);
    await wait(`!!document.querySelector('select[aria-label="Acento de la narración en móvil"]')`);
    await c.evaluate(`(()=>{const s=document.querySelector('select[aria-label="Acento de la narración en móvil"]');s.value='es';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await c.evaluate(`localStorage.getItem('stblockKidsVoiceLocale')`),'es');
    await c.send('Emulation.clearDeviceMetricsOverride');
    checks.push('The mobile menu can also select and save the accent');
    console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{c.close();}

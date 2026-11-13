import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {KIDS_BLOCK_INSTRUCTIONS, blockVoiceInstruction, planKidsVoice, normalizeKidsVoiceText} from '../scratch-gui/src/lib/kids-voice-text.js';
const playerSource = (await readFile(new URL('../scratch-gui/src/lib/kids-voice-player.js',import.meta.url),'utf8'))
    .replace("'./kids-voice-text'",JSON.stringify(new URL('../scratch-gui/src/lib/kids-voice-text.js',import.meta.url).href));
const {createKidsVoicePlayer} = await import('data:text/javascript;base64,'+Buffer.from(playerSource).toString('base64'));
const clip = file => ({file:file+'.wav',duration:0.01});
const clips = {'hola mundo':clip('phrase'),hola:clip('hola'),mundo:clip('mundo'),ganaste:clip('win'),estrellas:clip('stars'),'5':clip('five'),'9':clip('nine')};
const tick = () => new Promise(resolve=>setImmediate(resolve));
function fixture(options={}) {
    const played=[], errors=[];
    const audio={src:'',onended:null,onerror:null,paused:0,play(){played.push(this.src);return Promise.resolve();},pause(){this.paused++;},load(){},removeAttribute(){this.src='';}};
    const player=createKidsVoicePlayer({baseUrl:'https://local.test/plugin/assets/editor/static/kids/voice/es/',createAudio:()=>audio,loadManifest:async()=>({clips}),onError:error=>errors.push(error.message),...options});
    return {player,audio,played,errors};
}
test('complete phrases take priority over individual words',()=>{
    assert.equal(planKidsVoice('¡Hola, mundo!',clips)[0],clips['hola mundo']);
    assert.deepEqual(planKidsVoice('Ganaste 5 estrellas.',clips),[clips.ganaste,clips['5'],clips.estrellas]);
    assert.deepEqual(planKidsVoice('999',clips),[clips['9'],clips['9'],clips['9']]);
    assert.equal(normalizeKidsVoiceText('¡REPETIR!'),'repetir');
    assert.equal(normalizeKidsVoiceText('¿Cuánto es 3 + 2?'),'cuánto es 3 más 2');
    assert.equal(normalizeKidsVoiceText('¿Cuánto es 3 − 2?'),'cuánto es 3 menos 2');
});
test('unknown instructions never invoke native synthesis or remote services',()=>assert.throws(()=>planKidsVoice('texto desconocido',clips),/Falta audio/));
test('all block descriptions have a recording, including direction variants',async()=>{
    const source=await readFile(new URL('../vendor/scratchjr-reborn/src/app/src/editor/blocks/BlockSpecs.ts',import.meta.url),'utf8');
    const keys=[...source.slice(source.indexOf('static blockDesc')).matchAll(/^\s*'([^']+)':/gm)].map(match=>match[1]);
    for(const key of keys) assert.ok(KIDS_BLOCK_INSTRUCTIONS[key],key);
    assert.match(blockVoiceInstruction('storyjump','StoryJumpDiagonal'),/diagonal/);
    assert.equal(blockVoiceInstruction('__proto__'), '');
});
test('one local audio element plays story fragments in order',async()=>{
    const f=fixture();const run=f.player.speak(['Hola mundo','Ganaste 5 estrellas']);await tick();
    assert.equal(f.played.length,1);assert.ok(f.played[0].endsWith('/phrase.wav'));
    for(let i=0;i<4;i++){f.audio.onended();await tick();}
    assert.equal(await run,true);assert.equal(f.played.length,4);assert.equal(f.player.isPlaying(),false);
});
test('block requests cannot interrupt a story',async()=>{
    const f=fixture();const run=f.player.speak('Hola mundo');await tick();
    assert.equal(await f.player.speak('hola',{channel:'block'}),false);assert.equal(f.played.length,1);
    f.audio.onended();assert.equal(await run,true);
});
test('mute cancels the current clip and every queued clip',async()=>{
    const f=fixture();const run=f.player.speak('Ganaste 5 estrellas');await tick();f.player.cancel();
    assert.equal(await run,false);assert.equal(f.audio.onended,null);assert.equal(f.played.length,1);assert.ok(f.audio.paused>0);
});
test('a new story cancels the earlier request even while its manifest is loading',async()=>{
    let resolve;const f=fixture({loadManifest:()=>new Promise(r=>{resolve=r;})});
    const first=f.player.speak('hola');f.player.cancel();resolve({clips});assert.equal(await first,false);assert.equal(f.played.length,0);
    const second=f.player.speak('mundo');await tick();f.audio.onended();assert.equal(await second,true);
});
test('decoder and autoplay failures resolve safely and allow another narration',async()=>{
    const f=fixture();let run=f.player.speak('hola');await tick();f.audio.onerror();assert.equal(await run,false);
    f.audio.play=()=>Promise.reject(Error('NotAllowedError'));run=f.player.speak('mundo');assert.equal(await run,false);assert.equal(f.player.isPlaying(),false);
    assert.equal(f.errors.length,2);
});
test('a missing media completion event cannot leave narration stuck forever',async t=>{
    t.mock.timers.enable({apis:['setTimeout']});
    const f=fixture();const run=f.player.speak('hola');await tick();t.mock.timers.tick(6000);
    assert.equal(await run,false);assert.equal(f.player.isPlaying(),false);assert.ok(f.audio.paused>0);
});
test('included recordings cover all twenty worlds and randomized learning challenges',async()=>{
    const manifest=JSON.parse(await readFile(new URL('../scratch-gui/static/kids/voice/es/manifest.json',import.meta.url),'utf8'));
    const source=await readFile(new URL('../scratch-gui/src/components/kids-experience/scratchjr-kids-workspace.jsx',import.meta.url),'utf8');
    const require=createRequire(new URL('../sketchforge/package.json',import.meta.url));const ts=require('typescript');
    const tree=ts.createSourceFile('kids.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
    const names=new Set(['STORY_WORLDS','LETTERS','MATH_EMOJIS','makeOptions','makeLetterChallenge','makeNumberChallenge','makeMathChallenge','makeBonusChallenge']);
    const statements=tree.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>(names.has(d.name.getText(tree))||/^WORLD\d+_/.test(d.name.getText(tree))))||ts.isExpressionStatement(node)&&/^STORY_WORLDS\[/.test(node.getText(tree)));
    const script=statements.map(node=>node.getText(tree)).join('\n')+'\n({worlds:STORY_WORLDS,bonus:makeBonusChallenge})';
    const {worlds,bonus}=vm.runInNewContext(script);
    assert.equal(worlds.length,20);
    for(const world of worlds){
        for(const key of ['story','hint','summary','objective','lesson','title'])assert.ok(planKidsVoice(world[key],manifest.clips).length,key);
        planKidsVoice(`Mundo ${world.id}. ${world.title}. ${world.objective} ${world.lesson}.`,manifest.clips);
        for(const line of world.guide||[])planKidsVoice(line,manifest.clips);
        for(let attempt=0;attempt<20;attempt++){
            const task=bonus(world.id);
            planKidsVoice(`¡Mundo completado! Ganaste 5 estrellas y 100 puntos. ${task.prompt} Opciones: ${task.options.join(', ')}.`,manifest.clips);
            planKidsVoice(`¡Muy bien! ${task.solutionText} Ganaste puntos extra.`,manifest.clips);
        }
    }
});
test('the Kids shell and embedded drag code contain no system TTS calls',async()=>{
    for(const path of ['../scratch-gui/src/components/kids-experience/scratchjr-kids-workspace.jsx','../vendor/scratchjr-reborn/src/app/src/editor/ui/Palette.ts']){
        const source=await readFile(new URL(path,import.meta.url),'utf8');assert.doesNotMatch(source,/speechSynthesis|SpeechSynthesisUtterance/);
    }
});
test('bonus answers finish speaking before moving to the next screen',async()=>{
    const source=await readFile(new URL('../scratch-gui/src/components/kids-experience/scratchjr-kids-workspace.jsx',import.meta.url),'utf8');
    const require=createRequire(new URL('../sketchforge/package.json',import.meta.url));const ts=require('typescript');
    const ast=ts.createSourceFile('kids.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);let answer;
    const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='answerBonus')answer=node.initializer;ts.forEachChild(node,visit);};visit(ast);
    let complete;const pending=new Promise(resolve=>{complete=resolve;});const scheduled=[],finished=[];
    const context={bonusChallenge:{answer:3,solutionText:'La respuesta es 3.'},bonusFeedback:'',BONUS_POINTS:10,bonusVoiceRequestRef:{current:0},bonusTimerRef:{current:null},
        setBonusFeedback(){},speakStory:()=>pending,finishBonusChallenge:points=>finished.push(points),window:{clearTimeout(){},setTimeout(fn,delay){scheduled.push({fn,delay});return 1;}}};
    const fn=vm.runInNewContext('('+answer.getText(ast)+')',context);fn(3);
    await tick();assert.equal(scheduled.length,0);complete(true);await tick();assert.equal(scheduled.length,1);scheduled[0].fn();assert.deepEqual(finished,[10]);
    const canceled={...context,bonusVoiceRequestRef:{current:0}};
    let resolve;const audio=new Promise(r=>{resolve=r;});canceled.speakStory=()=>audio;
    vm.runInNewContext('('+answer.getText(ast)+')',canceled)(3);canceled.bonusVoiceRequestRef.current++;resolve(false);await tick();assert.equal(scheduled.length,1);
});

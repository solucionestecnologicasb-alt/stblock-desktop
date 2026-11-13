import test from 'node:test';
import assert from 'node:assert/strict';
import {readKidsWave,writeKidsWave,joinKidsWave,createKidsNarrationAudio} from '../scratch-gui/src/lib/kids-voice-audio.js';
import {planKidsNarration} from '../scratch-gui/src/lib/kids-voice-text.js';

const tone = () => {
    const data=new Int16Array(22050*2);
    for(let i=13000;i<17000;i++) data[i]=i%2?600:-600;
    // A quiet consonant tail must survive trimming.
    for(let i=17000;i<17800;i++)data[i]=i%2?25:-25;
    return data;
};
test('PCM WAV assembly preserves every signed sample',()=>{
    const data=Int16Array.from([-32768,-200,-1,0,1,200,32767]);
    assert.deepEqual(readKidsWave(writeKidsWave(data)),data);
});
test('joining removes oversized gaps without cutting quiet word endings',()=>{
    const source=tone();
    const output=joinKidsWave([source,source],[{pauseAfter:.09},{pauseAfter:.4}]);
    const decoded=readKidsWave(output.buffer);
    assert.deepEqual([...decoded].filter(Boolean),[...source,...source].filter(Boolean));
    assert.ok(output.duration<.7,output.duration);
    const sentence=joinKidsWave([source,source],[{pauseAfter:.35},{pauseAfter:.4}]);
    assert.ok(Math.abs(sentence.duration-output.duration-.26)<.001);
});
test('corrupt, compressed, stereo or truncated media is rejected',()=>{
    const stereo=writeKidsWave(tone());new DataView(stereo).setUint16(22,2,true);
    assert.throws(()=>readKidsWave(stereo));
    assert.throws(()=>readKidsWave(new ArrayBuffer(4)));
    assert.throws(()=>readKidsWave(writeKidsWave(tone()).slice(0,60)));
});
test('punctuation remains meaningful without breaking a recorded phrase at its comma',()=>{
    const clips={listo:{file:'ready'},'en este mundo puedes usar subir bajar':{file:'hint'},'tienes':{file:'have'},'5':{file:'five'},estrellas:{file:'stars'}};
    const parts=planKidsNarration('¡Listo! En este mundo puedes usar: subir, bajar. Tienes 5 estrellas.',clips);
    assert.deepEqual(parts.map(part=>part.file),['ready','hint','have','five','stars']);
    assert.equal(parts[0].pauseAfter,.35);assert.equal(parts[1].pauseAfter,.35);assert.equal(parts[2].pauseAfter,.09);
});
test('one PCM stream is prepared before playback and its URL is released',async()=>{
    let reads=0,creates=0;const revoked=[];
    const prepare=createKidsNarrationAudio({baseUrl:'https://local.test/voice/es-MX/',fetchAudio:async()=>{reads++;return writeKidsWave(tone());},createUrl:buffer=>{creates++;assert.ok(readKidsWave(buffer).length);return 'blob:local-test';},revokeUrl:url=>revoked.push(url)});
    const plan=[{file:'a.wav',pauseAfter:.09},{file:'b.wav',pauseAfter:.35}];
    const output=await prepare(plan,()=>true);assert.equal(output.clips.length,1);assert.equal(creates,1);assert.equal(reads,2);
    output.release();assert.deepEqual(revoked,['blob:local-test']);
    const second=await prepare(plan,()=>true);assert.equal(reads,2);second.release();
    const canceled=await prepare(plan,()=>false);assert.equal(canceled.clips.length,0);assert.equal(creates,2);
});

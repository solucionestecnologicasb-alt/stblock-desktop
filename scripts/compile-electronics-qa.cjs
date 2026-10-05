const fs=require('fs'), path=require('path'), {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'test-results/electronics');
fs.mkdirSync(dir,{recursive:true});
const config=path.join(dir,'arduino-cli.yaml');
fs.writeFileSync(config,`directories:\n  data: '${path.join(root,'src-tauri/tools/Arduino')}'\n  downloads: '${path.join(dir,'downloads')}'\n  user: '${dir}'\n`);
const exe=path.join(root,'src-tauri/tools/Arduino/arduino-cli.exe');
const libraries=['DHT sensor library','DallasTemperature','OneWire','SparkFun APDS9960 RGB and Gesture Sensor','IRremote','Encoder','Stepper','Adafruit NeoPixel','LiquidCrystal I2C','TM1637','MFRC522','RTClib','Keypad'];
function run(args){const result=spawnSync(exe,args.concat(['--config-file',config]),{encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});return {status:result.status,output:result.stdout+'\n'+result.stderr};}
if(process.argv[2]==='install') {
    const result=run(['lib','install',...libraries]);console.log(result.output);process.exit(result.status||0);
} else if(process.argv[2]==='cores') {console.log(run(['core','list']).output);}
else {
    const catalog=require('../scratch-vm/src/devices/extension-catalog.json');
    const selected=process.argv[2] ? process.argv.slice(2) : catalog.map(e=>e.extensionId);
    const results=[];
    for(const id of selected){
        const esp=/Esp32/.test(id);
        const mega=id==='stbV2Ultra'||id==='stbBoardV2';
        const fqbn=esp?(id.endsWith('S3')?'esp32:esp32:esp32s3':'esp32:esp32:esp32'):mega?'arduino:avr:mega':'arduino:avr:uno';
        const result=run(['compile','--fqbn',fqbn,'--libraries',path.join(root,'src-tauri/tools/Arduino/libraries'),path.join(dir,id)]);
        fs.writeFileSync(path.join(dir,id,'compile.log'),result.output);
        results.push({id,fqbn,status:result.status});
        console.log(`${result.status===0?'PASS':'FAIL'} ${id}`);
        if(result.status!==0) console.log(result.output.slice(-3500));
    }
    const resultFile=path.join(dir,'compilation-results.json');
    const previous=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile)):[];
    fs.writeFileSync(resultFile,JSON.stringify(previous.filter(old=>!results.some(r=>r.id===old.id)).concat(results),null,2));
    if(results.some(result=>result.status!==0))process.exitCode=1;
}

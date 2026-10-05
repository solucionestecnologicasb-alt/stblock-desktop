const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const tools=path.join(root,'src-tauri/tools/Arduino');
const testRoot=path.join(root,'test-results/electronics');
(async()=>{
    const libraries=path.join(testRoot,'libraries');
    for(const name of fs.readdirSync(libraries)) {
        const destination=path.join(tools,'libraries',name);
        if(!fs.existsSync(destination)) {fs.cpSync(path.join(libraries,name),destination,{recursive:true});console.log(`Bundled ${name}`);}
    }
    if(process.argv[2]!=='esp32')return;
    const index=JSON.parse(fs.readFileSync(path.join(tools,'package_esp32_index.json')));
    const pkg=index.packages.find(p=>p.name==='esp32');
    const platform=pkg.platforms.find(p=>p.version==='3.1.3');
    const dep=platform.toolsDependencies.find(d=>d.name==='esptool_py');
    const tool=pkg.tools.find(t=>t.name===dep.name&&t.version===dep.version);
    const system=tool.systems.find(s=>/mingw32/.test(s.host));
    const destination=path.join(tools,'packages/esp32/tools',dep.name,dep.version);
    if(fs.existsSync(path.join(destination,'esptool.exe')))return;
    const response=await fetch(system.url);if(!response.ok)throw new Error(`Download ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    const [algorithm,expected]=system.checksum.split(':');
    if(crypto.createHash(algorithm.toLowerCase()).update(bytes).digest('hex')!==expected.toLowerCase())throw new Error('Archive checksum mismatch');
    const zip=path.join(testRoot,'esptool.zip'),unpacked=path.join(testRoot,'esptool-unpacked');
    fs.writeFileSync(zip,bytes);
    const result=spawnSync('powershell.exe',['-NoProfile','-Command',`Expand-Archive -LiteralPath '${zip}' -DestinationPath '${unpacked}' -Force`],{encoding:'utf8',windowsHide:true});
    if(result.status!==0)throw new Error(result.stderr);
    const find=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isFile()&&entry.name==='esptool.exe')return directory;if(entry.isDirectory()){const found=find(file);if(found)return found;}}};
    const source=find(unpacked);if(!source)throw new Error('esptool.exe not in archive');
    fs.mkdirSync(destination,{recursive:true});fs.cpSync(source,destination,{recursive:true});
    console.log(`Installed ${dep.name}@${dep.version} (verified ${algorithm})`);
})().catch(e=>{console.error(e);process.exitCode=1;});

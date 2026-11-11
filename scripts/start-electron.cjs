const {spawn}=require('node:child_process');
const env={...process.env};
delete env.ELECTRON_RUN_AS_NODE;
if(process.argv.includes('--dev'))env.VITE_DEV_SERVER_URL='http://localhost:5173';else delete env.VITE_DEV_SERVER_URL;
const child=spawn(require('electron'),['.'],{stdio:'inherit',env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});

import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await mkdir('dist/drizzle',{recursive:true});
const html=await readFile('worker/index.html','utf8'),qr=await readFile('worker/qrcode.js','utf8');
await writeFile('dist/server/index.js',(await readFile('worker/api.js','utf8')).replace('/*HTML*/',()=>JSON.stringify(html)).replace('/*QR*/',()=>JSON.stringify(qr)));
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');await copyFile('drizzle/0000_customers.sql','dist/drizzle/0000_customers.sql');

const html=/*HTML*/,qr=/*QR*/;
const fields=['name','kana','company','postal','address','phone','email','tobacco','status','memo'];
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.pathname==='/qr.js')return new Response(qr,{headers:{'Content-Type':'text/javascript'}});
 if(!u.pathname.startsWith('/api/'))return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 if(!req.headers.get('oai-authenticated-user-id'))return json({error:'ログインが必要です'},401);
 if(req.method!=='GET' && req.headers.get('Origin')!==u.origin)return json({error:'許可されていないリクエストです'},403);
 try{
 if(!env.DB)return json({error:'保存先が準備されていません'},503);
 if(req.method==='GET'&&u.pathname==='/api/customers'){
 const r=await env.DB.prepare('SELECT id,data,updated_at FROM customers ORDER BY updated_at DESC').all();
 return json(r.results.map(x=>({...JSON.parse(x.data),id:x.id,updatedAt:x.updated_at})));
 }
 const id=u.pathname.split('/')[3];
 if(req.method==='DELETE'&&id){await env.DB.prepare('DELETE FROM customers WHERE id=?').bind(id).run();return json({ok:true});}
 if(req.method==='POST'&&u.pathname==='/api/customers'){
 const raw=await req.text();if(raw.length>20000)return json({error:'入力内容が長すぎます'},400);
 const b=JSON.parse(raw),data={};
 for(const f of fields)data[f]=String(b[f]??'').trim().slice(0,f==='memo'?4000:500);
 if(!data.name)return json({error:'氏名を入力してください'},400);
 if(!['喫煙','禁煙','未確認'].includes(data.status))data.status='未確認';
 const cid=typeof b.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(b.id)?b.id:crypto.randomUUID(),now=new Date().toISOString();
 await env.DB.prepare('INSERT INTO customers (id,data,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(cid,JSON.stringify(data),now).run();
 return json({...data,id:cid,updatedAt:now});
 }
 return json({error:'見つかりません'},404);
 }catch(e){return json({error:'処理に失敗しました。時間をおいて再度お試しください。'},500);}
}};

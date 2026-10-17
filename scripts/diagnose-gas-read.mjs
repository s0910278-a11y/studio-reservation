import { request } from 'node:https';
const base = 'https://script.google.com/macros/s/AKfycbxOE4x6w2NNbbrXJ_NSqf2CaTT5LaWvKflPzQnB-jkOuh9mg2IwA9nPcky6fPqcM3Tz4w/exec?action=getEquipment';
const netlify = 'https://zeroemission-reserve.netlify.app/api/equipment';
const allowed = new Set(['script.google.com', 'script.googleusercontent.com', 'zeroemission-reserve.netlify.app']);
function native(url, signal) {
  return new Promise((resolve, reject) => {
    const req = request(url, {method: 'GET', agent: false, family: 4, signal, headers: {'Accept': 'application/json'}}, res => {
      let bytes = 0; const chunks = [];
      res.on('data', chunk => {bytes += chunk.length; if (bytes > 2_000_000) {res.destroy(); reject(new Error('response-too-large'));} else chunks.push(chunk);});
      res.on('error', reject);
      res.on('end', () => resolve({status:res.statusCode, location:res.headers.location, text:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error', reject); req.end();
  });
}
async function web(url, signal) {
  const res = await fetch(url, {redirect:'manual', signal});
  const location=res.headers.get('location');
  const text=location?'':await res.text();
  if(location) await res.body?.cancel();
  return {status:res.status,location,text};
}
async function check(label, initial, transport) {
  const started=Date.now(), signal=AbortSignal.timeout(15_000);
  let url=initial, stage='initial', hops=[];
  try {
    for(let i=0;i<5;i++){
      const target=new URL(url);
      if(target.protocol!=='https:'||!allowed.has(target.hostname)||target.username||target.password) throw new Error('redirect-not-allowed');
      const t=Date.now(),res=await transport(url,signal);
      hops.push({host:target.hostname,status:res.status,elapsedMs:Date.now()-t});
      if(res.location){url=new URL(res.location,url).href;stage='redirect';continue;}
      const parsed=JSON.parse(res.text);
      console.log(JSON.stringify({label,ok:res.status===200&&(!parsed.error),elapsedMs:Date.now()-started,hops,items:Array.isArray(parsed)?parsed.length:parsed.data?.length}));
      return;
    }
    throw new Error('redirect-limit');
  }catch(e){console.log(JSON.stringify({label,ok:false,stage,elapsedMs:Date.now()-started,hops,error:e.name,code:e.cause?.code||e.code}));}
}
for(let i=1;i<=2;i++){await check('gas-fetch-'+i,base,web);await check('gas-native-ipv4-'+i,base,native);}
await check('netlify-fetch',netlify,web);

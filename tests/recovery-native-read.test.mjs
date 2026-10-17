import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGasHttpsRead } from '../src/lib/gas-native-read.mjs';

const start='https://script.google.com/macros/s/synthetic/exec?action=getEquipment';
const echo='https://script.googleusercontent.com/macros/echo?user_content_key=synthetic-fixture';
const ok={status:200,body:Buffer.from('{"success":true,"data":[]}'),contentType:'application/json'};

test('GAS redirect is followed only with GET semantics and one shared signal',async()=>{
  const signal=new AbortController().signal,calls=[];
  const response=await fetchGasHttpsRead(start,signal,async(url,received)=>{
    assert.equal(received,signal);calls.push(url.href);
    return calls.length===1?{status:302,location:echo,body:Buffer.alloc(0)}:ok;
  });
  assert.deepEqual(calls,[start,echo]);
  assert.deepEqual(await response.json(),{success:true,data:[]});
});
test('cancellation and unapproved actions never reach the network',async()=>{
  for(const url of [start+'&token=fixture',start.replace('getEquipment','createBooking'),start.replace('getEquipment','getEquipmentX')]){
    let calls=0;
    await assert.rejects(fetchGasHttpsRead(url,new AbortController().signal,async()=>{calls++;return ok;}),/read-only/);
    assert.equal(calls,0);
  }
});
test('unexpected redirect destinations are rejected before another request',async()=>{
  for(const location of ['http://script.googleusercontent.com/macros/echo','https://example.com/macros/echo','https://script.google.com/macros/s/synthetic/exec?token=fixture','https://script.googleusercontent.com/macros/echo?token=fixture','https://script.googleusercontent.com:444/macros/echo','https://user:pass@script.googleusercontent.com/macros/echo']){
    let calls=0;
    await assert.rejects(fetchGasHttpsRead(start,new AbortController().signal,async()=>{calls++;return{status:302,location,body:Buffer.alloc(0)};}),/Unexpected/);
    assert.equal(calls,1);
  }
});
test('aborted reads make no network request',async()=>{
  const c=new AbortController();c.abort(new DOMException('timeout','TimeoutError'));let calls=0;
  await assert.rejects(fetchGasHttpsRead(start,c.signal,async()=>{calls++;return ok;}),/timeout/);
  assert.equal(calls,0);
});
test('abort between redirects prevents the next request',async()=>{
  const c=new AbortController();let calls=0;
  await assert.rejects(fetchGasHttpsRead(start,c.signal,async()=>{calls++;c.abort(new DOMException('timeout','TimeoutError'));return{status:302,location:echo,body:Buffer.alloc(0)};}),/timeout/);
  assert.equal(calls,1);
});
test('redirect loops stop after five network requests',async()=>{
  let calls=0;
  await assert.rejects(fetchGasHttpsRead(start,new AbortController().signal,async()=>{calls++;return{status:302,location:echo,body:Buffer.alloc(0)};}),/limit/);
  assert.equal(calls,5);
});
test('service error status is preserved without another network request',async()=>{
  let calls=0;
  const response=await fetchGasHttpsRead(start,new AbortController().signal,async()=>{calls++;return{status:503,body:Buffer.from('unavailable'),contentType:'text/plain'};});
  assert.equal(response.status,503);assert.equal(await response.text(),'unavailable');assert.equal(calls,1);
});
test('an interrupted response propagates instead of returning partial JSON',async()=>{
  await assert.rejects(fetchGasHttpsRead(start,new AbortController().signal,async()=>{throw new TypeError('GAS read response interrupted');}),/interrupted/);
});

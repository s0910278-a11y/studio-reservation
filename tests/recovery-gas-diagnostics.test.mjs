import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGasRead,createGasRequestContext} from '../src/lib/gas-request.ts';
test('GAS failure logs include only approved metadata and never secret error text',async()=>{
  const captured=[],original=console.warn;
  console.warn=(...args)=>captured.push(args);
  try{
    const error=Object.assign(new TypeError('private customer data and secret redirect key'),{
      phase:'body',host:'https://private.example/secret-token',code:'private-secret',
    });
    await assert.rejects(requestGasRead('https://script.google.com/macros/s/synthetic/exec?action=getBookings',createGasRequestContext(),async()=>{throw error;}));
    assert.equal(captured.length,2);
    const logged=JSON.stringify(captured);
    assert.equal(logged.includes('private'),false);
    assert.equal(logged.includes('secret'),false);
    const parsed=JSON.parse(captured[0][1]);
    assert.equal(parsed.action,'getBookings');assert.equal(parsed.phase,'body');
    assert.equal(parsed.host,'unknown');assert.equal(parsed.code,'unknown');
    assert.equal(parsed.name,'TypeError');assert.equal(parsed.attempt,1);
  }finally{console.warn=original;}
});

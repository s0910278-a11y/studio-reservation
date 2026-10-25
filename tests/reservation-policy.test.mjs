import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewReservationBehavior, japanTimestamp } from '../src/lib/reservation-policy.ts';
const now=Date.parse('2026-11-01T12:00:00+09:00');
function booking(id, day, changes={}) {
  return {bookingId:id,memberNo:'ATEST',studioId:'Studio A',date:day,startTime:'12:00',endTime:'14:00',status:'CANCELED',
    registeredAt:day+' 08:00:00',canceledAt:day+' 10:00:00',cancellationSource:'お客様（確認画面で確定）',...changes};
}
test('three late cancellations in 90 days create a staff review reason',()=>{
  const rows=['2026-10-25','2026-10-26','2026-10-27'].map((day,i)=>booking('BK'+i,day));
  const before=JSON.stringify(rows); const result=reviewReservationBehavior('atest',rows,now);
  assert.equal(result.lateCancelCount,3); assert(result.reasons.some(r=>r.includes('開始24時間以内'))); assert.equal(JSON.stringify(rows),before);
});
test('two late cancellations do not meet the repeated late cancellation threshold',()=>{
  const result=reviewReservationBehavior('ATEST',[booking('BK1','2026-10-25'),booking('BK2','2026-10-26')],now);
  assert.equal(result.reasons.length,0);
});
test('early, staff, future, undocumented and old cancellations are not inferred as late',()=>{
  const rows=[booking('EARLY','2026-10-25',{canceledAt:'2026-10-23 10:00:00'}),booking('STAFF','2026-10-25',{cancellationSource:'スタッフ（管理画面）'}),
    booking('UNKNOWN','2026-10-25',{canceledAt:''}),booking('OLD','2026-01-01'),booking('FUTURE','2026-11-02'),booking('AFTER','2026-10-25',{canceledAt:'2026-10-25 13:00:00'})];
  assert.equal(reviewReservationBehavior('ATEST',rows,now).lateCancelCount,0);
});
test('24 hour boundary is inclusive and one second earlier is outside it',()=>{
  const rows=[booking('BOUNDARY','2026-10-25',{canceledAt:'2026-10-24 12:00:00'}),booking('OUTSIDE','2026-10-25',{canceledAt:'2026-10-24 11:59:59'})];
  assert.equal(reviewReservationBehavior('ATEST',rows,now).lateCancelCount,1);
});
test('overlapping multi-studio holds followed by late cancellation on two days are flagged for review',()=>{
  const rows=['2026-10-25','2026-10-26'].flatMap((day,i)=>[booking('A'+i,day),booking('B'+i,day,{studioId:'Studio B',status:'ACTIVE',canceledAt:''})]);
  const result=reviewReservationBehavior('ATEST',rows,now);
  assert.equal(result.multiStudioReleaseDays,2); assert(result.reasons.some(r=>r.includes('要確認')));
});
test('several released holds on the same day count as one episode day',()=>{
  const rows=[booking('A1','2026-10-25'),booking('A2','2026-10-25'),booking('B','2026-10-25',{studioId:'Studio B',status:'ACTIVE',canceledAt:''})];
  const result=reviewReservationBehavior('ATEST',rows,now); assert.equal(result.multiStudioReleaseDays,1); assert.equal(result.reasons.length,0);
});
test('different customers, adjacent times and sequential holds are not a multi-studio event',()=>{
  const a=booking('A','2026-10-25');
  const rows=[a,booking('OTHER','2026-10-25',{memberNo:'AOTHER',studioId:'Studio B'}),booking('ADJACENT','2026-10-25',{studioId:'Studio B',startTime:'14:00',endTime:'15:00'}),
    booking('SEQUENTIAL','2026-10-25',{studioId:'Studio B',registeredAt:'2026-10-25 07:00:00',canceledAt:'2026-10-25 07:30:00'})];
  assert.equal(reviewReservationBehavior('ATEST',rows,now).multiStudioReleaseDays,0);
});
test('missing creation timestamps cannot prove an overlapping hold',()=>{
  const rows=[booking('A','2026-10-25',{registeredAt:''}),booking('B','2026-10-25',{studioId:'Studio B',status:'ACTIVE'})];
  assert.equal(reviewReservationBehavior('ATEST',rows,now).multiStudioReleaseDays,0);
});
test('no-show is counted separately and no ban field is changed or returned',()=>{
  const result=reviewReservationBehavior('ATEST',[booking('NS','2026-10-25',{status:'CANCELED (来店なし)',cancellationSource:'スタッフ（来店なし）'})],now);
  assert.equal(result.noShowCount,1); assert.equal(result.lateCancelCount,0); assert.equal(result.reasons.length,1); assert(!('banStatus' in result));
});
test('manual and guest bookings are not attributed to a real customer',()=>{
  for(const id of ['ADMIN','GUEST','']) assert.equal(reviewReservationBehavior(id,[booking('B','2026-10-25',{memberNo:id})],now).reasons.length,0);
});
test('JST timestamp parsing is independent of server timezone',()=>{
  assert.equal(japanTimestamp('2026-10-25 12:30:00'),Date.parse('2026-10-25T12:30:00+09:00'));
  assert.equal(japanTimestamp('2026-10-25T03:30:00Z'),Date.parse('2026-10-25T12:30:00+09:00')); assert(Number.isNaN(japanTimestamp('')));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../math-game/rummikub/model.js');
const t=M.tile,run=(...ids)=>({kind:'run',tiles:ids}),group=(...ids)=>({kind:'group',tiles:ids});
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function fixture(hand,table=[],opened=true,other=[t(3,13,1)]) {
  const used=[...hand,...M.tableTiles(table),...other];
  assert.equal(new Set(used).size,used.length,'fixture must conserve physical tiles');
  return {hands:[hand,other],pool:M.tiles().filter(id=>!used.includes(id)),table,opened:[opened,true],
    turn:0,turns:0,passes:0,done:false,result:null,log:[]};
}
const all=s=>[...s.hands.flat(),...s.pool,...M.tableTiles(s.table)].sort((a,b)=>a-b);
const check=(s,table)=>M.validate(M.observation(s),table);

test('106 distinct tiles: two copies of each color/value, two jokers, 14 each and a pool of 78',()=>{
  const s=M.deal({first:1},seeded(3));
  assert.deepEqual(s.hands.map(h=>h.length),[14,14]);assert.equal(s.pool.length,78);
  assert.deepEqual(all(s),M.tiles());assert.equal(s.turn,1);
  for(let c=0;c<4;c++)for(let n=1;n<=13;n++)
    assert.equal(M.tiles().filter(id=>M.color(id)===c&&M.value(id)===n).length,2);
  assert.equal(M.tiles().filter(M.joker).length,2);
});
test('groups require 3–4 equal numbers with distinct colors',()=>{
  assert.ok(M.analyze(group(t(0,5),t(1,5),t(2,5))).valid);
  assert.ok(M.analyze(group(t(0,5),t(1,5),t(2,5),t(3,5))).valid);
  assert.equal(M.analyze(group(t(0,5),t(0,5,1),t(2,5))).valid,false);
  assert.equal(M.analyze(group(t(0,5),t(1,5),t(2,6))).valid,false);
  assert.equal(M.analyze(group(t(0,5),t(1,5))).valid,false);
});
test('runs reject wraparound, repeated values, missing numbers and mixed colors',()=>{
  assert.ok(M.analyze(run(t(0,3),t(0,1),t(0,2))).valid);
  for(const row of [run(t(0,12),t(0,13),t(0,1)),run(t(0,1),t(0,2),t(0,2,1)),
    run(t(0,1),t(0,2),t(0,4)),run(t(0,1),t(0,2),t(1,3))])
    assert.equal(M.analyze(row).valid,false);
});
test('jokers fill a run gap or unused group color and use the displayed value for registration',()=>{
  let d=M.analyze(run(t(1,8),104,t(1,10)));
  assert.equal(d.sum,27);assert.deepEqual(d.assignments[104],{color:1,value:9});
  d=M.analyze(group(t(1,10),104,105));
  assert.equal(d.sum,30);assert.notEqual(d.assignments[104].color,d.assignments[105].color);
  d=M.analyze(run(t(2,13),104,105));
  assert.equal(d.sum,36);assert.deepEqual(d.ordered,[104,105,t(2,13)]);
  assert.equal(M.analyze(run(t(0,1),104,t(0,5))).valid,false);
});
test('first registration can combine own sets, rejects 29 or less, and accepts exactly 30',()=>{
  const hand=[t(0,9),t(1,9),t(2,9),t(0,1),t(1,1),t(2,1)];
  const s=fixture(hand,[],false),first=group(...hand.slice(0,3)),second=group(...hand.slice(3));
  assert.equal(check(s,[first]).ok,false);
  assert.equal(check(s,[first,second]).points,30);
  assert.equal(M.apply(s,{type:'meld',table:[first,second]}).opened[0],true);
});
test('a first-registration turn may not borrow, extend, or rearrange the existing table',()=>{
  const old=run(t(0,8),t(0,9),t(0,10));
  const s=fixture([t(0,11),t(1,10),t(2,10),t(3,10)],[old],false);
  const own=group(t(1,10),t(2,10),t(3,10));
  assert.ok(check(s,[old,own]).ok);
  assert.equal(check(s,[run(...old.tiles,t(0,11)),own]).ok,false);
});
test('a fourth group tile can move into a new run; the complete turn conserves all tiles',()=>{
  const old=group(t(0,5),t(1,5),t(2,5),t(3,5));
  const s=fixture([t(0,4),t(0,6)],[old]),saved=structuredClone(s);
  const table=[group(t(1,5),t(2,5),t(3,5)),run(t(0,4),t(0,5),t(0,6))];
  assert.ok(check(s,table).ok);
  const next=M.apply(s,{type:'meld',table});
  assert.deepEqual(all(next),M.tiles());assert.deepEqual(s,saved);assert.equal(next.done,true);
});
test('splitting a run may use a second physical copy of the pivot number',()=>{
  const old=run(t(0,4),t(0,5),t(0,6),t(0,7),t(0,8));
  const s=fixture([t(0,6,1)],[old]);
  assert.ok(check(s,[run(t(0,4),t(0,5),t(0,6)),run(t(0,6,1),t(0,7),t(0,8))]).ok);
});
test('no table tile can disappear, no tile may be duplicated, and at least one own tile must be used',()=>{
  const old=group(t(0,5),t(1,5),t(2,5),t(3,5)),s=fixture([t(0,4),t(0,6)],[old]);
  for(const table of [[old], [group(t(1,5),t(2,5),t(3,5))],
    [old,run(t(0,4),t(0,5),t(0,6))],[old,run(t(2,1),t(2,2),t(2,3))]])
    assert.equal(check(s,table).ok,false);
});
test('a recovered joker can form a new set on the same turn, including after a run extension',()=>{
  const old=run(t(0,6),t(0,7),104),s=fixture([t(0,5),t(1,9),t(1,10)],[old]);
  const table=[run(t(0,5),t(0,6),t(0,7)),run(t(1,9),t(1,10),104)];
  assert.ok(check(s,table).ok);assert.deepEqual(all(M.apply(s,{type:'meld',table})),M.tiles());
  assert.equal(check(s,[table[0]]).ok,false,'joker may not be retained on rack');
});
test('recovered joker alone cannot be appended to a different unchanged old set',()=>{
  const a=run(t(0,6),t(0,7),104),b=run(t(1,9),t(1,10),t(1,11));
  const s=fixture([t(0,5)],[a,b]);
  assert.equal(check(s,[run(t(0,5),t(0,6),t(0,7)),run(...b.tiles,104)]).ok,false);
});
test('drawing commits no draft, adds exactly one tile and immediately passes the turn',()=>{
  const s=M.deal({first:0},seeded(2)),saved=structuredClone(s),drawn=s.pool.at(-1);
  const next=M.apply(s,{type:'draw'});
  assert.equal(next.turn,1);assert.equal(next.hands[0].length,15);assert.equal(next.pool.length,77);
  assert.ok(next.hands[0].includes(drawn));assert.deepEqual(s,saved);assert.deepEqual(all(next),M.tiles());
  assert.equal(M.validate(M.observation(next,0),[]).ok,false);
});
test('going out scores the opponents remaining values, including 30 for a joker',()=>{
  const s=fixture([t(0,1),t(0,2),t(0,3)],[],true,[104,t(1,7)]);
  const next=M.apply(s,{type:'meld',table:[run(...s.hands[0])]});
  assert.equal(next.done,true);assert.equal(next.result.winner,0);
  assert.deepEqual(next.result.scores,[37,-37]);assert.equal(next.result.reason,'empty');
  assert.throws(()=>M.apply(next,{type:'draw'}));
});
test('empty pool continues after one pass; two passes use the disclosed classroom end rule',()=>{
  let s=fixture([t(0,3)],[],true,[t(1,8)]);s.pool=[];
  s=M.apply(s,{type:'draw'});assert.equal(s.done,false);assert.equal(s.passes,1);
  s=M.apply(s,{type:'draw'});assert.equal(s.done,true);assert.equal(s.result.reason,'passes');
  assert.deepEqual(s.result.scores,[5,-5]);
  let tie=fixture([t(0,3)],[],true,[t(1,3)]);tie.pool=[];
  tie=M.apply(M.apply(tie,{type:'draw'}),{type:'draw'});
  assert.equal(tie.result.winner,null);assert.deepEqual(tie.result.scores,[0,0]);
});
test('a successful meld resets a previous empty-pool pass',()=>{
  let s=fixture([t(0,1),t(0,2),t(0,3),t(3,1)],[],true,[t(1,8)]);s.pool=[];s.passes=1;
  s=M.apply(s,{type:'meld',table:[run(t(0,1),t(0,2),t(0,3))]});
  assert.equal(s.passes,0);assert.equal(s.done,false);
});
test('AI cannot see the other rack or pool order, and changing either does not change its observation',()=>{
  const s=M.deal({first:0},seeded(9)),other=structuredClone(s);
  [other.hands[1][0],other.pool[0]]=[other.pool[0],other.hands[1][0]];other.pool.reverse();
  assert.deepEqual(M.observation(s),M.observation(other));
  const o=M.observation(s);assert.ok(!('pool' in o));assert.ok(!('hands' in o));
  assert.deepEqual(M.choose(o,'hard'),M.choose(M.observation(other),'hard'));
});
test('rack content is removed for handoff, AI turns, and results',()=>{
  const s=M.deal({first:1},seeded(3));
  assert.deepEqual(M.visibleRack(s,[],'local',true),[]);
  assert.deepEqual(M.visibleRack(s,[],'ai',false),[]);
  assert.equal(M.visibleRack(s,[],'local',false).length,14);
  s.done=true;assert.deepEqual(M.visibleRack(s,[],'local',false),[]);
});
test('all practice variants have legal solutions and match their required tile count',()=>{
  const rng=seeded(12);
  for(const level of [1,2,3])for(let i=0;i<24;i++) {
    const p=M.practice(level,rng),result=check(p.state,p.solution);
    assert.ok(result.ok,result.message);assert.ok(result.used.length>=p.minUsed);
    if(level===2)assert.ok(result.points>=30);
    if(level===3)assert.equal(result.used.length,p.state.hands[0].length);
  }
});
test('hard AI can reconstruct a public group into a new run without secret information',()=>{
  const s=fixture([t(0,4),t(0,6)],[group(t(0,5),t(1,5),t(2,5),t(3,5))]);
  const a=M.choose(M.observation(s),'hard');
  assert.equal(a.type,'meld');assert.equal(check(s,a.table).used.length,2);
});
test('all AI levels finish legal games and preserve the complete tile inventory on every turn',()=>{
  for(const level of ['easy','normal','hard']) {
    const rng=seeded(30);let s=M.deal({first:0},rng),turns=0;
    while(!s.done&&turns<240) {
      s=M.apply(s,M.choose(M.observation(s),level,rng));
      assert.deepEqual(all(s),M.tiles());turns++;
    }
    assert.ok(s.done,level+' should finish without a cycle');assert.ok(s.result);
  }
});

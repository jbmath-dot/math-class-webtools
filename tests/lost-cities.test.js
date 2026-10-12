'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../math-game/lost-cities/model.js');
const card=(c,v)=>c*12+v+1;
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function allCards(s){return [...s.deck,...s.hands.flat(),...s.discards.flat(),...s.expeditions.flat(2)].sort((a,b)=>a-b);}

test('a base game has 60 unique cards, two eight-card hands and 44 in the deck',()=>{
  const s=M.deal({first:1,rounds:3},seeded(1));
  assert.deepEqual(s.hands.map(h=>h.length),[8,8]);assert.equal(s.deck.length,44);
  assert.deepEqual(allCards(s),M.deck());assert.equal(s.turn,1);assert.equal(s.rounds,3);
});
test('unopened routes cost zero, but wagers alone multiply the negative expedition cost',()=>{
  assert.equal(M.detail([]).score,0);
  assert.equal(M.detail([0]).score,-40);
  assert.equal(M.detail([0,1,2]).score,-80);
});
test('the eight-card bonus counts wagers but is not multiplied',()=>{
  const seven=[0,card(0,2),card(0,3),card(0,4),card(0,5),card(0,6),card(0,7)];
  assert.equal(M.detail(seven).bonus,0);
  const eight=[...seven,card(0,8)];
  assert.equal(M.detail(eight).score,(35-20)*2+20);
});
test('numbers must increase and investments cannot follow numbers',()=>{
  assert.ok(M.canPlay(1,[0]));assert.ok(M.canPlay(card(0,2),[0,1]));
  assert.equal(M.canPlay(2,[0,card(0,2)]),false);
  assert.equal(M.canPlay(card(0,4),[card(0,5)]),false);
  assert.equal(M.canPlay(card(0,5),[card(0,5)]),false);
  assert.equal(M.canPlay(card(1,6),[card(0,5)]),false);
});
test('playing then drawing maintains hand size and card conservation',()=>{
  let s=M.deal({first:0},seeded(7));const original=structuredClone(s);
  s=M.apply(s,{type:'play',id:s.hands[0][0]});
  assert.equal(s.phase,'draw');assert.equal(s.turn,0);assert.equal(s.hands[0].length,7);
  assert.deepEqual(original,M.deal({first:0},seeded(7)));
  s=M.apply(s,{type:'draw',source:'deck'});
  assert.equal(s.phase,'play');assert.equal(s.turn,1);assert.equal(s.hands[0].length,8);
  assert.deepEqual(allCards(s),M.deck());
});
test('the just-discarded card cannot be picked up immediately',()=>{
  let s=M.deal({first:0},seeded(9));const id=s.hands[0][0];
  s=M.apply(s,{type:'discard',id});
  assert.equal(s.forbiddenDraw,M.suit(id));
  assert.throws(()=>M.apply(s,{type:'draw',source:M.suit(id)}));
  const later=M.apply(s,{type:'draw',source:'deck'});
  assert.equal(later.forbiddenDraw,null);
});
test('invalid actions cannot change the state or bypass the place-then-draw order',()=>{
  const s=M.deal({first:0},seeded(1)),saved=structuredClone(s);
  assert.throws(()=>M.apply(s,{type:'draw',source:'deck'}));
  const other=s.hands[1][0];assert.throws(()=>M.apply(s,{type:'play',id:other}));
  assert.deepEqual(s,saved);
});
test('drawing from a discard pile takes only the top card',()=>{
  let s=M.deal({first:0},seeded(3));const ids=s.deck.splice(0,2);const c=M.suit(ids[0]);
  // A focused draw fixture; pile top identity is the rule being checked.
  s.discards[c]=ids;s.phase='draw';s.hands[0].pop();
  const t=M.apply(s,{type:'draw',source:c});
  assert.ok(t.hands[0].includes(ids[1]));assert.deepEqual(t.discards[c],[ids[0]]);
});
test('the last deck card ends a round immediately and hand cards do not score',()=>{
  let s=M.deal({first:0,rounds:1},seeded(4));s.phase='draw';s.deck=s.deck.slice(0,1);
  s.expeditions[0][0]=[card(0,10)];
  const t=M.apply(s,{type:'draw',source:'deck'});
  assert.equal(t.done,true);assert.equal(t.roundOver,true);assert.deepEqual(t.results,[[-10,0]]);
  assert.throws(()=>M.apply(t,{type:'discard',id:t.hands[t.turn][0]}));
});
test('three-round totals are preserved and the higher total starts the next round',()=>{
  let s=M.deal({first:0,rounds:3},seeded(4));s.phase='draw';s.deck=s.deck.slice(0,1);s.expeditions[0][0]=[0];
  s=M.apply(s,{type:'draw',source:'deck'});
  assert.equal(s.done,false);assert.deepEqual(s.totals,[-40,0]);
  const t=M.nextRound(s,seeded(5));assert.equal(t.round,2);assert.equal(t.turn,1);assert.deepEqual(t.totals,[-40,0]);
  assert.deepEqual(t.results,[[-40,0]]);assert.deepEqual(allCards(t),M.deck());
});
test('AI observations exclude the opponent hand and deck order',()=>{
  const s=M.deal({first:0},seeded(12)),other=structuredClone(s);
  other.hands[1].reverse();other.deck.reverse();
  const a=M.observation(s),b=M.observation(other);
  assert.deepEqual(a,b);assert.ok(!('hands'in a));assert.ok(!('deck'in a));
  assert.deepEqual(M.choose(a,'hard'),M.choose(b,'hard'));
});
test('the hand renderer receives no cards during handoff, AI turns, or results',()=>{
  const s=M.deal({first:1},seeded(2));
  assert.deepEqual(M.visibleHand(s,'local',true),[]);
  assert.deepEqual(M.visibleHand(s,'ai',false),[]);
  assert.equal(M.visibleHand(s,'local',false).length,8);
  s.roundOver=true;assert.deepEqual(M.visibleHand(s,'local',false),[]);
});
test('practice questions have valid route order and the advertised bonus threshold',()=>{
  const rng=seeded(32);
  for(const level of [1,2,3])for(let i=0;i<20;i++){
    const p=M.practice(level,rng);assert.equal(p.answer,M.detail(p.cards).score);
    for(let k=0;k<p.cards.length;k++)assert.ok(M.canPlay(p.cards[k],p.cards.slice(0,k)));
    if(level===1)assert.ok(p.cards.every(id=>M.value(id)>0));
    if(level===3)assert.ok([7,8].includes(p.cards.length));
  }
});
test('all AI levels finish legal games without losing or duplicating cards',()=>{
  for(const level of ['easy','normal','hard']){
    const rng=seeded(71);let s=M.deal({first:0,rounds:1},rng),steps=0;
    while(!s.done&&steps<1600){s=M.apply(s,M.choose(M.observation(s),level,rng));assert.deepEqual(allCards(s),M.deck());steps++;}
    assert.ok(s.done,`${level} should finish`);assert.equal(s.deck.length,0);
  }
});

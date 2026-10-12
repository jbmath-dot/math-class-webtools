'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prime = require('../math-game/prime-climb/model.js');
const SetGame = require('../math-game/set-game/modes-model.js');
const Auction = require('../math-game/minus-auction/modes-model.js');
const Quoridor = require('../math-game/quoridor/model.js');
const options = {mode:'local',first:0,level:1};

test('Prime Climb bumps only at the end of the turn and locks completed pawns', () => {
  let s = {...Prime.create(options),pawns:[[31,0],[33,37]],dice:[2,4]};
  s = Prime.move(s,{type:'move',pawn:0,die:0,op:'+',to:33});
  assert.deepEqual(s.pawns[1],[33,37]);
  s = Prime.move(s,{type:'move',pawn:0,die:0,op:'+',to:37});
  assert.deepEqual(s.pawns[1],[33,0]);
  assert.equal(s.turn,1);
  s = {...Prime.create(options),pawns:[[99,101],[0,0]],dice:[2,5]};
  assert.ok(Prime.actions(s).every(a=>a.pawn===0));
  s = Prime.move(s,{type:'move',pawn:0,die:0,op:'+',to:101});
  assert.equal(s.done,true);assert.equal(s.winner,0);
});

test('Prime legal moves never leave the board or divide to a fraction', () => {
  const s = {...Prime.create(options),pawns:[[98,7],[0,0]],dice:[7,10]};
  assert.ok(Prime.actions(s).every(a=>Number.isInteger(a.to)&&a.to>=0&&a.to<=101));
  assert.ok(!Prime.actions(s).some(a=>a.pawn===0&&a.op==='+'&&a.die===0));
  assert.ok(!Prime.actions(s).some(a=>a.pawn===1&&a.op==='÷'&&a.die===1));
});

test('Prime practice puzzles have a legal solution for each level', () => {
  for(const level of [1,2,3])for(let i=0;i<20;i++){
    let s=Prime.create({mode:'practice',level});
    for(const step of s.solution){const [,op,,equals,to]=step.split(' ');assert.equal(equals,'=');const a=Prime.actions(s).find(x=>x.pawn===0&&x.die===0&&x.op===op&&x.to===Number(to));assert.ok(a);s=Prime.move(s,a);}
    assert.equal(s.done,true);
  }
});

test('SET: every pair of different cards has exactly one distinct completion', () => {
  const ids=Array.from({length:81},(_,i)=>i);
  for(let a=0;a<81;a++)for(let b=a+1;b<81;b++)assert.equal(ids.filter(c=>SetGame.isSet([a,b,c])).length,1);
  assert.equal(SetGame.isSet([0,0,0]),false);
});

test('SET hard AI returns a valid public set and a duel ends after 24 turns', () => {
  let s=SetGame.create(options);
  const a=SetGame.choose(s,'hard');assert.ok(SetGame.isSet(a.ids));assert.ok(a.ids.every(id=>s.board.includes(id)));
  for(let i=0;i<24;i++)s=SetGame.play(s,[]);
  assert.equal(s.done,true);assert.equal(s.turn,0);
});

test('Auction scoring handles a bridge joining two runs', () => {
  assert.equal(Auction.score({chips:10,cards:[12,14]}),-16);
  assert.equal(Auction.score({chips:10,cards:[12,13,14]}),-2);
  const s={...Auction.create(options),players:[{chips:10,cards:[12,14]},{chips:10,cards:[]}],card:13,pot:3};
  assert.equal(Auction.delta(s),17);
  assert.equal(Auction.choose(s,'normal').type,'take');
});

test('Auction conserves chips and changes turn on both decisions', () => {
  let s=Auction.create(options);s=Auction.play(s,{type:'pass'});
  assert.equal(s.turn,1);assert.equal(s.players[0].chips,29);assert.equal(s.pot,1);
  s=Auction.play(s,{type:'take'});
  assert.equal(s.turn,0);assert.equal(s.players[1].chips,31);assert.equal(s.pot,0);
  assert.equal(s.players.reduce((sum,p)=>sum+p.chips,0),60);
  s.players[0].chips=0;assert.equal(Auction.choose(s,'hard').type,'take');
});

test('Quoridor allows straight jump, then side jumps only when blocked', () => {
  let s={...Quoridor.create(options),pos:[40,31]};
  assert.ok(Quoridor.moves(s).includes(22));assert.ok(!Quoridor.moves(s).includes(30));
  s.walls=[{r:2,c:4,o:'h'}];
  assert.ok(!Quoridor.moves(s).includes(22));assert.ok(Quoridor.moves(s).includes(30));assert.ok(Quoridor.moves(s).includes(32));
});

test('Quoridor rejects crossing, overlap, and closing the last path', () => {
  const s=Quoridor.create(options);s.walls=[{r:0,c:0,o:'h'}];
  assert.equal(Quoridor.validWall(s,{r:0,c:0,o:'v'}),false);
  assert.equal(Quoridor.validWall(s,{r:0,c:1,o:'h'}),false);
  s.walls=[0,2,4,6].map(c=>({r:0,c,o:'h'}));
  assert.ok(Number.isFinite(Quoridor.distance(s,1)));
  assert.equal(Quoridor.validWall(s,{r:0,c:7,o:'v'}),false);
});

test('Quoridor: every practice level has a legal answer; hard AI wins immediately', () => {
  for(const level of [1,2,3]){const s=Quoridor.create({mode:'practice',level});assert.ok(Quoridor.actions(s).some(a=>Quoridor.practiceCorrect(s,a)));}
  const s={...Quoridor.create(options),pos:[13,76]};const a=Quoridor.choose(s,'hard');const t=Quoridor.play(s,a);assert.equal(t.winner,0);assert.equal(t.done,true);
});

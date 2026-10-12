(function(root){
  'use strict';
  const rand=n=>Math.floor(Math.random()*n), shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=rand(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;};
  function score(p){const cards=[...p.cards].sort((a,b)=>a-b);return p.chips-cards.filter((c,i)=>i===0||c!==cards[i-1]+1).reduce((v,n)=>v+n,0);}
  function delta(s,p=s.turn){return score({cards:[...s.players[p].cards,s.card],chips:s.players[p].chips+s.pot})-score(s.players[p]);}
  function create(o){const s={players:[{chips:30,cards:[]},{chips:30,cards:[]}],deck:shuffle(Array.from({length:33},(_,i)=>i+3)),card:null,pot:0,turn:o.mode==='practice'?0:o.first,done:false,practice:o.mode==='practice',log:[]};s.card=s.deck.pop();if(s.practice){const n=8+rand(17);s.card=n;s.pot=rand(8);s.players[0]={chips:2+rand(10),cards:o.level===1?[]:o.level===2?[n-1]:[n-1,n+1]};s.players[1]={chips:8,cards:[3]};}return s;}
  function play(s,a){const t=structuredClone(s),p=t.players[t.turn];if(a.type==='pass'&&p.chips<=0)return t;if(a.type==='pass'){p.chips--;t.pot++;t.log.unshift(`플레이어 ${t.turn+1}: 칩 1개로 거부`);}else{const v=delta(t);p.chips+=t.pot;p.cards.push(t.card);t.log.unshift(`플레이어 ${t.turn+1}: −${t.card} 낙찰 · 점수 ${v>=0?'+':''}${v}`);t.pot=0;t.card=t.deck.pop()??null;if(t.card===null)t.done=true;}t.turn=1-t.turn;t.log=t.log.slice(0,8);return t;}
  function choose(s,level){
    const p=s.players[s.turn];if(!p.chips)return {type:'take'};
    const gain=delta(s);
    if(level==='easy')return {type:Math.random()<.45?'take':'pass'};
    if(level==='normal')return {type:gain>=-1||p.chips<=2?'take':'pass'};
    // Public scores only. Protect chips and account for the opponent's incentive to take.
    const other=s.players[1-s.turn],theirGain=delta(s,1-s.turn);
    const tolerance=p.chips<5?5:1;
    return {type:gain>=-tolerance||(other.chips===0&&gain>=0)||(theirGain>gain+8&&gain>=-3)?'take':'pass'};
  }
  const api={score,delta,create,play,choose};root.AuctionModes=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

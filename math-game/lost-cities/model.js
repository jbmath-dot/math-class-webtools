/* Original implementation of the five-expedition card rules. AI receives observation(), never the hidden state. */
(function (root) {
  'use strict';
  const SUITS = [
    {name:'설원', mark:'△', color:'#496fa3'},
    {name:'정글', mark:'♧', color:'#3d7a58'},
    {name:'사막', mark:'◇', color:'#ab761e'},
    {name:'화산', mark:'▲', color:'#b45242'},
    {name:'바다', mark:'≈', color:'#377f8c'}
  ];
  const deck = () => Array.from({length:60}, (_,i) => i);
  const suit = id => Math.floor(id / 12);
  const value = id => id % 12 < 3 ? 0 : id % 12 - 1;
  const label = id => `${SUITS[suit(id)].name} ${value(id) || '투자'}`;
  const clone = s => structuredClone(s);
  function shuffle(items, rng = Math.random) {
    const result = [...items];
    for (let i=result.length-1; i>0; i--) {
      const j=Math.floor(rng()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  function detail(cards) {
    const sum=cards.reduce((n,id)=>n+value(id),0);
    const wagers=cards.filter(id=>value(id)===0).length;
    const cost=cards.length?20:0, multiplier=1+wagers, bonus=cards.length>=8?20:0;
    return {sum,cost,multiplier,bonus,count:cards.length,score:(sum-cost)*multiplier+bonus};
  }
  const score = columns => columns.reduce((n,c)=>n+detail(c).score,0);
  function canPlay(id, column) {
    return !column.length || (suit(id)===suit(column[0]) && (value(id)===0
      ? column.every(x=>value(x)===0)
      : value(id)>Math.max(...column.map(value))));
  }
  function deal(o, rng=Math.random) {
    const cards=shuffle(deck(),rng);
    return {
      hands:[cards.splice(0,8),cards.splice(0,8)], deck:cards,
      expeditions:Array.from({length:2},()=>Array.from({length:5},()=>[])),
      discards:Array.from({length:5},()=>[]),turn:o.first===1?1:0,phase:'play',
      forbiddenDraw:null,round:1,rounds:o.rounds===3?3:1,totals:[0,0],results:[],
      roundOver:false,done:false,log:[],turns:0
    };
  }
  function observation(s,p=s.turn) {
    // Deliberately omit the opponent's hand and draw-pile order, including from nested objects.
    return {
      hand:[...s.hands[p]],player:p,turn:s.turn,phase:s.phase,
      expeditions:clone(s.expeditions),discards:clone(s.discards),
      deckCount:s.deck.length,forbiddenDraw:s.forbiddenDraw,roundOver:s.roundOver
    };
  }
  function legalActions(o) {
    if(o.roundOver || o.player!==o.turn) return [];
    if(o.phase==='play') return o.hand.flatMap(id=>[
      ...(canPlay(id,o.expeditions[o.player][suit(id)])?[{type:'play',id}]:[]),
      {type:'discard',id}
    ]);
    if(o.phase==='draw') return [
      ...(o.deckCount>0?[{type:'draw',source:'deck'}]:[]),
      ...o.discards.flatMap((pile,c)=>pile.length && c!==o.forbiddenDraw ? [{type:'draw',source:c}] : [])
    ];
    return [];
  }
  function apply(s,a) {
    const allowed=legalActions(observation(s)).some(x=>x.type===a.type&&
      (a.type==='draw'?x.source===a.source:x.id===a.id));
    if(!allowed) throw new Error('지금 할 수 없는 선택입니다.');
    const t=clone(s),p=t.turn;
    if(a.type==='play'||a.type==='discard') {
      t.hands[p].splice(t.hands[p].indexOf(a.id),1);
      const c=suit(a.id);
      if(a.type==='play') {t.expeditions[p][c].push(a.id);t.forbiddenDraw=null;}
      else {t.discards[c].push(a.id);t.forbiddenDraw=c;}
      t.phase='draw';
      t.log.unshift({player:p,text:`${label(a.id)} · ${a.type==='play'?'탐험로에 놓음':'버림'}`});
    } else {
      const id=a.source==='deck'?t.deck.pop():t.discards[a.source].pop();
      t.hands[p].push(id);t.turns++;
      t.log.unshift({player:p,text:a.source==='deck'?'덱에서 한 장 뽑음':`${label(id)} · 버림 더미에서 가져옴`});
      t.forbiddenDraw=null;
      if(!t.deck.length) {
        const scores=t.expeditions.map(score);
        t.totals=t.totals.map((v,i)=>v+scores[i]);
        t.results.push(scores);t.roundOver=true;t.done=t.round>=t.rounds;t.phase='result';
      } else {t.turn=1-p;t.phase='play';}
    }
    t.log=t.log.slice(0,12);
    return t;
  }
  function nextRound(s,rng=Math.random) {
    if(!s.roundOver||s.done) throw new Error('다음 라운드를 시작할 수 없습니다.');
    const first=s.totals[0]===s.totals[1]?1-s.turn:s.totals[0]>s.totals[1]?0:1;
    const t=deal({first,rounds:s.rounds},rng);
    t.round=s.round+1;t.totals=[...s.totals];t.results=clone(s.results);
    return t;
  }
  function sortHand(hand) {return [...hand].sort((a,b)=>suit(a)-suit(b)||value(a)-value(b)||a-b);}
  function visibleHand(s,mode,covered) {
    if(covered||s.roundOver||(mode==='ai'&&s.turn!==0))return [];
    return sortHand(s.hands[s.turn]);
  }
  function projection(column,hand,c,remaining) {
    const top=column.length?Math.max(...column.map(value)):0;
    const available=hand.filter(id=>suit(id)===c&&canPlay(id,column));
    const budget=Math.max(0,Math.ceil(remaining/2));
    const numbers=available.filter(id=>value(id)>top).sort((a,b)=>value(b)-value(a)).slice(0,budget);
    const wagers=top===0?available.filter(id=>value(id)===0).slice(0,Math.max(0,budget-numbers.length)):[];
    const projected=[...column,...wagers,...numbers];
    return column.length?detail(projected).score:Math.max(0,detail(projected).score);
  }
  function positionValue(o) {
    return o.expeditions[o.player].reduce((n,col,c)=>n+projection(col,o.hand,c,o.deckCount),0);
  }
  function gainForCard(o,id,p=o.player) {
    const col=o.expeditions[p][suit(id)];
    if(!canPlay(id,col))return -6;
    if(value(id)===0) {
      const held=o.hand.filter(x=>suit(x)===suit(id)&&value(x)>0).reduce((n,x)=>n+value(x),0);
      return Math.max(-4,(detail(col).sum+held-20)*.5);
    }
    return col.length?value(id)*detail(col).multiplier:Math.max(0,value(id)-4);
  }
  function imagined(o,a) {
    const t=clone(o);t.hand=t.hand.filter(x=>x!==a.id);
    if(a.type==='play'){t.expeditions[t.player][suit(a.id)].push(a.id);t.forbiddenDraw=null;}
    else {t.discards[suit(a.id)].push(a.id);t.forbiddenDraw=suit(a.id);}
    t.phase='draw';return t;
  }
  function choose(o,level='normal',rng=Math.random) {
    const actions=legalActions(o);
    if(!actions.length)throw new Error('AI가 선택할 수 없습니다.');
    if(level==='easy')return actions[Math.floor(rng()*actions.length)];
    if(o.phase==='draw') {
      const ahead=score(o.expeditions[o.player])-score(o.expeditions[1-o.player]);
      if(level==='hard'&&o.deckCount===1&&ahead>0)return {type:'draw',source:'deck'};
      return actions.map(a=>({a,v:a.source==='deck'?2.5:gainForCard(o,o.discards[a.source].at(-1))}))
        .sort((a,b)=>b.v-a.v)[0].a;
    }
    return actions.map(a=>{
      const t=imagined(o,a),col=o.expeditions[o.player][suit(a.id)];
      let v=positionValue(t);
      if(a.type==='play') {
        v+=1.5+value(a.id)*.03;
        // Save smaller held cards and investments before advancing an expedition.
        const lost=o.hand.filter(id=>id!==a.id&&suit(id)===suit(a.id)&&canPlay(id,col)&&!canPlay(id,t.expeditions[o.player][suit(id)]));
        v-=lost.reduce((n,id)=>n+(value(id)||3),0)*.65;
      } else {
        if(!canPlay(a.id,col))v+=1;
        if(level==='hard')v-=Math.max(0,gainForCard(o,a.id,1-o.player))*.7;
      }
      if(level==='hard') {
        const discardGains=legalActions(t).filter(x=>x.source!=='deck').map(x=>gainForCard(t,t.discards[x.source].at(-1)));
        v+=Math.max(2.5,...discardGains)*.45;
      }
      return {a,v};
    }).sort((a,b)=>b.v-a.v)[0].a;
  }
  function practice(level,rng=Math.random) {
    const c=Math.floor(rng()*5),wagers=level===1?0:1+Math.floor(rng()*3);
    const count=level===3?7+Math.floor(rng()*2)-wagers:level===1?2+Math.floor(rng()*3):Math.floor(rng()*4);
    const values=shuffle([2,3,4,5,6,7,8,9,10],rng).slice(0,count).sort((a,b)=>a-b);
    const cards=[...Array.from({length:wagers},(_,i)=>c*12+i),...values.map(v=>c*12+v+1)];
    return {cards,answer:detail(cards).score,level};
  }
  const api={SUITS,deck,suit,value,label,detail,score,canPlay,deal,observation,legalActions,apply,nextRound,sortHand,visibleHand,choose,practice};
  root.LostCities=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

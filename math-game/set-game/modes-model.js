(function(root){
  'use strict';
  const shuffle = a => {const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
  const attrs = id => [Math.floor(id/27),Math.floor(id/9)%3,Math.floor(id/3)%3,id%3];
  const isSet = ids => ids.length===3&&new Set(ids).size===3&&[0,1,2,3].every(k=>new Set(ids.map(id=>attrs(id)[k])).size!==2);
  function find(board){for(let i=0;i<board.length;i++)for(let j=i+1;j<board.length;j++)for(let k=j+1;k<board.length;k++)if(isSet([board[i],board[j],board[k]]))return [board[i],board[j],board[k]];return null;}
  function refill(s){while(s.board.length<s.size&&s.deck.length)s.board.push(s.deck.pop());while(!find(s.board)&&s.deck.length){for(let i=0;i<3&&s.deck.length;i++)s.board.push(s.deck.pop());}if(!find(s.board))s.done=true;return s;}
  function create(o){const three=o.mode==='practice'&&o.level===1;return refill({board:[],deck:shuffle(Array.from({length:three?27:81},(_,i)=>i)),size:o.mode==='practice'&&o.level<3?9:12,selected:[],scores:[0,0],turn:o.mode==='practice'?0:o.first,moves:0,done:false,practice:o.mode==='practice',last:[]});}
  function play(s,ids){const t=structuredClone(s),correct=isSet(ids)&&ids.every(id=>s.board.includes(id));t.selected=[];t.moves++;if(correct){t.scores[t.turn]++;t.last=ids;t.board=t.board.filter(x=>!ids.includes(x));if(t.practice){t.done=true;return t;}refill(t);}if(!t.practice){t.turn=1-t.turn;if(t.moves>=24)t.done=true;}return t;}
  function choose(s,level){
    // Search only public board pairs; each pair determines exactly one third card.
    const pairs=[];for(let i=0;i<s.board.length;i++)for(let j=i+1;j<s.board.length;j++)pairs.push([s.board[i],s.board[j]]);
    const budget=level==='easy'?4:level==='normal'?20:pairs.length;
    for(const pair of shuffle(pairs).slice(0,budget)){const third=s.board.find(k=>isSet([...pair,k]));if(third!==undefined)return {type:'submit',ids:[...pair,third]};}
    return {type:'pass'};
  }
  const names=[['1개','2개','3개'],['원','마름모','네모'],['빨강','초록','보라'],['채움','줄무늬','테두리']];
  const describe=id=>attrs(id).map((v,k)=>names[k][v]).join(' · ');
  const explain=ids=>['개수','모양','색','채움'].map((n,k)=>`${n}: ${new Set(ids.map(id=>attrs(id)[k])).size===1?'모두 같음':new Set(ids.map(id=>attrs(id)[k])).size===3?'모두 다름':'두 개만 같음 ✕'}`).join(' / ');
  const api={attrs,isSet,find,create,play,choose,describe,explain};root.SetModes=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

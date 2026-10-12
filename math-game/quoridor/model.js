(function(root){
  'use strict';
  const rc=n=>[Math.floor(n/9),n%9], cell=(r,c)=>r>=0&&r<9&&c>=0&&c<9?r*9+c:-1, dirs=[[1,0],[-1,0],[0,1],[0,-1]], goal=p=>p===0?0:8;
  function open(s,a,b){if(a<0||b<0)return false;const [r,c]=rc(a),[y,x]=rc(b);if(Math.abs(r-y)+Math.abs(c-x)!==1)return false;return !s.walls.some(w=>r!==y?w.o==='h'&&w.r===Math.min(r,y)&&(w.c===c||w.c===c-1):w.o==='v'&&w.c===Math.min(c,x)&&(w.r===r||w.r===r-1));}
  function adjacent(s,n){const [r,c]=rc(n);return dirs.map(([dr,dc])=>cell(r+dr,c+dc)).filter(k=>open(s,n,k));}
  function distance(s,p,start=s.pos[p]){const queue=[start],dist=Array(81).fill(-1);dist[start]=0;for(let i=0;i<queue.length;i++){const n=queue[i];if(rc(n)[0]===goal(p))return dist[n];for(const k of adjacent(s,n))if(dist[k]===-1){dist[k]=dist[n]+1;queue.push(k);}}return Infinity;}
  function moves(s,p=s.turn){const out=[],a=s.pos[p],b=s.pos[1-p],[r,c]=rc(a);for(const [dr,dc]of dirs){const n=cell(r+dr,c+dc);if(!open(s,a,n))continue;if(n!==b){out.push(n);continue;}const [y,x]=rc(b),jump=cell(y+dr,x+dc);if(open(s,b,jump))out.push(jump);else for(const [dy,dx]of dirs){if(dy*dr+dx*dc!==0)continue;const side=cell(y+dy,x+dx);if(open(s,b,side))out.push(side);}}return [...new Set(out)];}
  function validWall(s,w,p=s.turn){
    if(s.left[p]<=0||!Number.isInteger(w.r)||!Number.isInteger(w.c)||w.r<0||w.r>7||w.c<0||w.c>7||!['h','v'].includes(w.o))return false;
    if(s.walls.some(v=>v.r===w.r&&v.c===w.c||(v.o===w.o&&(w.o==='h'?v.r===w.r&&Math.abs(v.c-w.c)<=1:v.c===w.c&&Math.abs(v.r-w.r)<=1))))return false;
    const t={...s,walls:[...s.walls,w]};return Number.isFinite(distance(t,0))&&Number.isFinite(distance(t,1));
  }
  function create(o){const s={pos:[76,4],walls:[],left:[10,10],turn:o.mode==='practice'?0:o.first,done:false,winner:null,steps:0,practice:o.mode==='practice',level:o.level,orientation:'h',preview:null,seen:{}};if(s.practice){if(o.level===1){s.pos=[22,76];s.walls=[{r:1,c:3,o:'h'}];}else if(o.level===2){s.pos=[40,31];s.walls=[{r:2,c:4,o:'h'}];}else{s.pos=[72,4];s.walls=[];}s.left=[10,10];}return s;}
  function raw(s,a){const t={...s,pos:[...s.pos],left:[...s.left],walls:[...s.walls]};if(a.type==='move')t.pos[s.turn]=a.to;else{t.walls.push({r:a.r,c:a.c,o:a.o});t.left[s.turn]--;}if(rc(t.pos[s.turn])[0]===goal(s.turn)){t.done=true;t.winner=s.turn;}t.turn=1-s.turn;t.steps++;t.preview=null;return t;}
  function play(s,a){const t=raw(s,a);t.seen={...s.seen};const key=JSON.stringify([t.pos,t.walls,t.left,t.turn]);t.seen[key]=(t.seen[key]||0)+1;if(!t.done&&(t.seen[key]>=3||t.steps>=160)){t.done=true;t.winner=null;}return t;}
  function actions(s){if(s.done)return [];const out=moves(s).map(to=>({type:'move',to}));if(s.left[s.turn])for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const o of ['h','v']){const a={type:'wall',r,c,o};if(validWall(s,a))out.push(a);}return out;}
  function value(s,p){if(s.done&&s.winner!==null)return s.winner===p?10000:-10000;return (distance(s,1-p)-distance(s,p))*10+(s.left[p]-s.left[1-p])*.5;}
  function ranked(s){return actions(s).map(a=>({a,t:raw(s,a)})).map(x=>({...x,v:value(x.t,s.turn)})).sort((a,b)=>b.v-a.v);}
  function choose(s,level){
    const direct=moves(s).find(to=>rc(to)[0]===goal(s.turn));if(direct!==undefined)return {type:'move',to:direct};
    if(level==='easy'){const all=moves(s).sort((a,b)=>distance(s,s.turn,a)-distance(s,s.turn,b));return {type:'move',to:Math.random()<.8?all[0]:all[Math.floor(Math.random()*all.length)]};}
    const top=ranked(s);if(level==='normal')return top[0].a;
    let best=top[0],bestV=-Infinity;
    for(const x of top.slice(0,6)){const replies=x.t.done?[]:ranked(x.t);const v=replies.length?Math.min(...replies.slice(0,5).map(y=>value(y.t,s.turn))):x.v;if(v>bestV){best=x;bestV=v;}}
    return best.a;
  }
  function practiceCorrect(s,a){if(s.level===3){if(a.type!=='wall')return false;const t=raw(s,a);return distance(t,1)>distance(s,1)&&distance(t,0)<=distance(s,0);}if(a.type!=='move')return false;if(s.level===2)return [30,32].includes(a.to);const best=Math.min(...moves(s).map(n=>distance(s,0,n)));return distance(s,0,a.to)===best;}
  const coord=n=>`${'ABCDEFGHI'[n%9]}${Math.floor(n/9)+1}`;
  const api={rc,cell,goal,open,adjacent,distance,moves,validWall,create,raw,play,actions,choose,practiceCorrect,coord};root.Quoridor=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

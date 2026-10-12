(function(root){
  'use strict';
  const clone = s => structuredClone(s), rand = n => Math.floor(Math.random()*n);
  const OPS = ['+','−','×','÷'];
  const calc = (a,b,op) => op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:a/b;
  const valid = n => Number.isInteger(n)&&n>=0&&n<=101;
  const factors = n => {if(n<2)return n===1?'1 (소수가 아님)':'0 (소인수분해하지 않음)';let a=[],x=n;for(let p=2;p<=x;p++)while(x%p===0){a.push(p);x/=p;}return a.join(' × ');};
  const isPrime = n => n>1&&factors(n)===String(n);
  function actions(s){
    if(s.done)return [];
    if(!s.dice.length)return [{type:'roll'}];
    const out=[];
    s.pawns[s.turn].forEach((n,p)=>{if(n===101)return;s.dice.forEach((d,i)=>{if(s.dice.indexOf(d)!==i)return;OPS.forEach(op=>{const to=calc(n,d,op);if(valid(to))out.push({type:'move',pawn:p,die:i,op,to});});});});
    return out;
  }
  function create(o){
    const s={pawns:[[0,0],[0,0]],turn:o.mode==='practice'?0:o.first,dice:[],done:false,winner:null,last:'',selectedPawn:0,selectedDie:0,moved:[],practice:o.mode==='practice',target:null,solution:[]};
    if(s.practice){
      const start=2+rand(18),count=o.level;
      let n=start;const dice=[],path=[];
      for(let i=0;i<count;i++){const d=2+rand(8),possible=OPS.map(op=>({op,to:calc(n,d,op)})).filter(a=>valid(a.to)&&a.to!==n&&a.to>0&&a.to<101);const a=possible[rand(possible.length)];dice.push(d);path.push(`${n} ${a.op} ${d} = ${a.to}`);n=a.to;}
      s.pawns=[[start,101],[0,0]];s.dice=dice;s.target=n;s.solution=path;
    }
    return s;
  }
  function move(s,a){
    const t=clone(s),p=t.turn;
    if(a.type==='roll') {const x=1+rand(10),y=1+rand(10);t.dice=x===y?[x,x,x,x]:[x,y];t.moved=[];return t;}
    const from=t.pawns[p][a.pawn],d=t.dice[a.die];t.pawns[p][a.pawn]=a.to;t.dice.splice(a.die,1);t.moved.push(a.pawn);t.selectedDie=0;
    t.last=`${from} ${a.op} ${d} = ${a.to} · ${a.to}의 소인수: ${factors(a.to)}`;
    if(t.practice){if(!t.dice.length){t.done=a.to===t.target;t.retry=!t.done;}return t;}
    if(t.pawns[p].every(n=>n===101)){t.done=true;t.winner=p;return t;}
    if(!t.dice.length){
      const own=t.pawns[p],other=t.pawns[1-p];
      if(own[0]===own[1]&&own[0]>0&&own[0]<101)own[1-t.moved[t.moved.length-1]]=0;
      own.forEach(n=>{if(n>0&&n<101)other.forEach((m,i)=>{if(n===m)other[i]=0;});});
      t.turn=1-p;t.selectedPawn=t.pawns[t.turn][0]===101?1:0;
    }else if(t.pawns[p][t.selectedPawn]===101)t.selectedPawn=1-t.selectedPawn;
    return t;
  }
  function evaluate(s,p){return s.pawns[p].reduce((v,n)=>v+(n===101?500:n),0)-s.pawns[1-p].reduce((v,n)=>v+(n===101?500:n),0)*.7;}
  function choose(s,level){
    const all=actions(s);if(all.length===1||!s.dice.length)return all[0];
    if(level==='easy')return all[rand(all.length)];
    if(level==='normal')return all.map(a=>({a,v:evaluate(move(s,a),s.turn)})).sort((a,b)=>b.v-a.v)[0].a;
    let beam=[{s,first:null}];const depth=s.dice.length;
    for(let i=0;i<depth;i++){
      const next=[];
      for(const node of beam){if(node.s.done||node.s.turn!==s.turn){next.push(node);continue;}for(const a of actions(node.s)){if(a.type==='roll')continue;next.push({s:move(node.s,a),first:node.first||a});}}
      beam=next.sort((a,b)=>evaluate(b.s,s.turn)-evaluate(a.s,s.turn)).slice(0,32);
    }
    return beam[0]?.first||all[0];
  }
  const api={OPS,calc,valid,factors,isPrime,actions,create,move,choose};root.PrimeClimb=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

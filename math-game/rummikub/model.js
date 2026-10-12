/* Independent classroom implementation. Decisions receive public information and one rack only. */
(function (root) {
  'use strict';
  const COLORS = [
    {name:'빨강', mark:'●', hex:'#ad423b'}, {name:'파랑', mark:'▲', hex:'#3266a3'},
    {name:'주황', mark:'◆', hex:'#a36a19'}, {name:'검정', mark:'■', hex:'#37434a'}
  ];
  const tiles = () => Array.from({length:106}, (_,i) => i);
  const joker = id => id >= 104;
  const color = id => joker(id) ? -1 : Math.floor(id / 26);
  const value = id => joker(id) ? 0 : id % 13 + 1;
  const tile = (c,n,copy=0) => c * 26 + copy * 13 + n - 1;
  const label = id => joker(id) ? '조커' : COLORS[color(id)].name + ' ' + value(id);
  const clone = s => structuredClone(s);
  const penalty = rack => rack.reduce((n,id) => n + (joker(id) ? 30 : value(id)), 0);
  const sortRack = (rack,by='color') => [...rack].sort((a,b) =>
    Number(joker(a))-Number(joker(b)) ||
    (by==='value' ? value(a)-value(b)||color(a)-color(b) : color(a)-color(b)||value(a)-value(b)) || a-b);
  const signature = row => row.kind + ':' + [...row.tiles].sort((a,b)=>a-b).join(',');
  const tableTiles = table => table.flatMap(row => row.tiles);
  const sameSet = (a,b) => a.length===b.length && a.every(id => b.includes(id));
  function shuffle(items,rng=Math.random) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--) {
      const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  function analyze(row) {
    const fail = message => ({valid:false,message,ordered:row.tiles||[],assignments:{},sum:0});
    if(!Array.isArray(row.tiles)||!['group','run'].includes(row.kind))return fail('묶음 종류를 확인하세요.');
    const ids=row.tiles,n=ids.length;
    if(n<3)return fail('한 묶음에는 타일이 3개 이상 필요합니다.');
    if(new Set(ids).size!==n||ids.some(id=>!Number.isInteger(id)||id<0||id>105))return fail('타일이 중복되었거나 올바르지 않습니다.');
    const real=ids.filter(id=>!joker(id)),wild=ids.filter(joker).sort((a,b)=>a-b),assignments={};
    if(!real.length)return fail('숫자 타일이 필요합니다.');
    if(row.kind==='group') {
      if(n>4)return fail('같은 수 묶음은 3개 또는 4개입니다.');
      if(real.some(id=>value(id)!==value(real[0])))return fail('같은 수 묶음은 숫자가 같아야 합니다.');
      if(new Set(real.map(color)).size!==real.length)return fail('같은 수 묶음은 색이 서로 달라야 합니다.');
      const missing=[0,1,2,3].filter(c=>!real.some(id=>color(id)===c));
      wild.forEach((id,i)=>{assignments[id]={color:missing[i],value:value(real[0])};});
      const ordered=[...ids].sort((a,b)=>(joker(a)?assignments[a].color:color(a))-(joker(b)?assignments[b].color:color(b)));
      return {valid:true,kind:'group',ordered,assignments,sum:value(real[0])*n,message:'다른 색 · 같은 수'};
    }
    if(n>13)return fail('연속 줄은 1부터 13 사이에서만 만들 수 있습니다.');
    if(real.some(id=>color(id)!==color(real[0])))return fail('연속 줄은 모두 같은 색이어야 합니다.');
    if(new Set(real.map(value)).size!==real.length)return fail('연속 줄에는 같은 수를 두 번 넣을 수 없습니다.');
    const values=real.map(value),low=Math.min(...values),high=Math.max(...values);
    const minStart=Math.max(1,high-n+1),maxStart=Math.min(low,14-n);
    if(minStart>maxStart)return fail('빠진 수를 조커로 채워도 연속되지 않습니다.');
    // Several joker positions can be legal. Use the largest start and display that assignment.
    const start=maxStart,ordered=[],remaining=[...wild];
    for(let v=start;v<start+n;v++) {
      const id=real.find(x=>value(x)===v);
      if(id!==undefined)ordered.push(id);
      else {
        const j=remaining.shift();if(j===undefined)return fail('연속된 수 사이에 빈칸이 있습니다.');
        assignments[j]={color:color(real[0]),value:v};ordered.push(j);
      }
    }
    return {valid:true,kind:'run',ordered,assignments,sum:n*(2*start+n-1)/2,message:'같은 색 · 연속된 수'};
  }
  function deal(options={},rng=Math.random) {
    const bag=shuffle(tiles(),rng);
    return {hands:[bag.splice(0,14),bag.splice(0,14)],pool:bag,table:[],opened:[false,false],
      turn:options.first===1?1:0,turns:0,passes:0,done:false,result:null,log:[]};
  }
  function observation(s,p=s.turn) {
    return {hand:[...s.hands[p]],table:clone(s.table),opened:s.opened[p],player:p,turn:s.turn,
      poolCount:s.pool.length,counts:s.hands.map(h=>h.length),done:s.done};
  }
  function validate(o,table) {
    const bad = message => ({ok:false,message,used:[],points:0});
    if(o.done||o.turn!==o.player)return bad('지금은 내 차례가 아닙니다.');
    if(!Array.isArray(table))return bad('테이블을 확인하세요.');
    const before=tableTiles(o.table),after=tableTiles(table),allowed=new Set([...before,...o.hand]);
    if(new Set(after).size!==after.length)return bad('같은 타일을 두 곳에 사용할 수 없습니다.');
    if(after.some(id=>!allowed.has(id)))return bad('내 손패와 테이블에 있는 타일만 사용할 수 있습니다.');
    if(before.some(id=>!after.includes(id)))return bad('테이블에서 빼놓은 타일을 모두 묶음에 넣어 주세요.');
    for(let i=0;i<table.length;i++) {
      const d=analyze(table[i]);if(!d.valid)return bad((i+1)+'번 묶음: '+d.message);
    }
    const used=o.hand.filter(id=>after.includes(id));
    if(!used.length)return bad('내 손패에서 적어도 타일 한 개를 내려놓아야 합니다.');
    let points=0;
    if(!o.opened) {
      if(o.table.some(old=>!table.some(row=>signature(row)===signature(old))))
        return bad('첫 등록 차례에는 기존 테이블을 바꾸거나 이용할 수 없습니다.');
      const fresh=table.filter(row=>row.tiles.some(id=>o.hand.includes(id)));
      if(fresh.some(row=>row.tiles.some(id=>!o.hand.includes(id))))return bad('첫 등록은 내 손패만으로 만듭니다.');
      points=fresh.reduce((n,row)=>n+analyze(row).sum,0);
      if(points<30)return bad('첫 등록 합계는 30점 이상입니다. 현재 '+points+'점입니다.');
    }
    // A recovered table joker must form a new combination on this turn.
    // Merely appending it to an otherwise unchanged, different pre-existing set is not a new set.
    for(const j of before.filter(joker)) {
      const old=o.table.find(row=>row.tiles.includes(j)),next=table.find(row=>row.tiles.includes(j));
      if(next===undefined)return bad('회수한 조커도 이번 차례에 새 묶음으로 사용해야 합니다.');
      if(next.kind===old.kind && old.tiles.every(id=>next.tiles.includes(id)))continue;
      const other=next.tiles.filter(id=>id!==j);
      if(o.table.some(row=>!row.tiles.includes(j)&&sameSet(row.tiles,other)))
        return bad('회수한 조커를 기존 묶음에 단독 추가할 수 없습니다. 새 조합을 만들어 주세요.');
    }
    return {ok:true,used,points,message:o.opened?used.length+'개를 내려놓을 수 있습니다.':'첫 등록 '+points+'점 · '+used.length+'개'};
  }
  function finish(s,reason,winner=null) {
    const remaining=s.hands.map(penalty);
    if(reason==='passes')winner=remaining[0]===remaining[1]?null:remaining[0]<remaining[1]?0:1;
    const scores=[0,0];
    if(winner!==null) {
      const loser=1-winner,points=reason==='empty'?remaining[loser]:remaining[loser]-remaining[winner];
      scores[winner]=points;scores[loser]=-points;
    }
    s.done=true;s.result={reason,winner,remaining,scores};
  }
  function apply(s,action) {
    if(s.done)throw new Error('이미 끝난 게임입니다.');
    const t=clone(s),p=s.turn;
    if(action.type==='meld') {
      const check=validate(observation(s),action.table);
      if(!check.ok)throw new Error(check.message);
      t.table=action.table.map(row=>({kind:row.kind,tiles:analyze(row).ordered}));
      t.hands[p]=t.hands[p].filter(id=>!check.used.includes(id));t.opened[p]=true;t.passes=0;
      t.log.unshift({player:p,text:check.used.length+'개 내려놓음'+(!s.opened[p]?' · 첫 등록 '+check.points+'점':' · 재배열 확정')});
      if(!t.hands[p].length)finish(t,'empty',p);
    } else if(action.type==='draw') {
      if(t.pool.length) {
        t.hands[p].push(t.pool.pop());t.passes=0;t.log.unshift({player:p,text:'풀에서 타일 한 개 가져옴'});
      } else {
        t.passes++;t.log.unshift({player:p,text:'빈 풀 · 패스'});
        if(t.passes>=2)finish(t,'passes');
      }
    } else throw new Error('알 수 없는 행동입니다.');
    t.turns++;if(!t.done)t.turn=1-p;t.log=t.log.slice(0,14);
    return t;
  }
  function visibleRack(s,table,mode,covered,sort='color') {
    if(covered||s.done||(mode==='ai'&&s.turn!==0))return [];
    const used=new Set(tableTiles(table));return sortRack(s.hands[s.turn].filter(id=>!used.has(id)),sort);
  }
  function combinations(items,n) {
    const result=[];
    function walk(i,picked) {
      if(picked.length===n){result.push(picked);return;}
      for(let k=i;k<=items.length-(n-picked.length);k++)walk(k+1,[...picked,items[k]]);
    }
    walk(0,[]);return result;
  }
  function enumerate(available,limit=4500) {
    const wild=available.filter(joker),rows=[],seen=new Set(),by=Array.from({length:4},()=>Array.from({length:14},()=>[]));
    available.filter(id=>!joker(id)).forEach(id=>by[color(id)][value(id)].push(id));
    function add(kind,ids) {
      if(rows.length>=limit)return;
      const row={kind,tiles:ids},key=signature(row);
      if(seen.has(key))return;
      const d=analyze(row);if(!d.valid)return;
      seen.add(key);rows.push({kind,tiles:d.ordered});
    }
    // Groups: choose different real colors, then any available joker subset.
    for(let n=13;n>=1;n--) {
      const colors=[0,1,2,3].filter(c=>by[c][n].length);
      for(const size of [4,3])for(let w=0;w<=Math.min(wild.length,size-1);w++)
        for(const cs of combinations(colors,size-w))for(const js of combinations(wild,w)) {
          function pick(i,ids) {
            if(i===cs.length){add('group',[...ids,...js]);return;}
            for(const id of by[cs[i]][n])pick(i+1,[...ids,id]);
          }
          pick(0,[]);
        }
    }
    // Runs: include joker substitutions even when the corresponding real tile is available.
    for(let c=0;c<4;c++)for(let length=13;length>=3;length--)for(let start=14-length;start>=1;start--) {
      if(Array.from({length},(_,i)=>start+i).filter(n=>!by[c][n].length).length>wild.length)continue;
      function pick(n,ids,js) {
        if(rows.length>=limit)return;
        if(n===start+length){add('run',ids);return;}
        for(const id of by[c][n])pick(n+1,[...ids,id],js);
        for(const j of js)pick(n+1,[...ids,j],js.filter(x=>x!==j));
      }
      pick(start,[],wild);
    }
    return rows;
  }
  function solve(available,required=[],options={}) {
    const budget=options.budget||1000,minPoints=options.minPoints||0,must=new Set(required);
    const index=new Map(available.map((id,i)=>[id,1n<<BigInt(i)]));
    const maskFor=ids=>ids.reduce((m,id)=>m|index.get(id),0n);
    const allMask=maskFor(available),requiredMask=maskFor(required);
    const candidates=enumerate(available,options.limit||3500);
    // Retain the unchanged public sets even when enumeration was capped.
    for(const row of options.base||[])if(!candidates.some(x=>signature(x)===signature(row)))candidates.push(clone(row));
    const entries=candidates.map(row=>({
      row,mask:maskFor(row.tiles),points:analyze(row).sum,
      gain:row.tiles.reduce((n,id)=>n+(must.has(id)?0:100+(joker(id)?30:value(id))),0)
    })).sort((a,b)=>b.gain-a.gain||b.points-a.points);
    const covering=new Map(available.map(id=>[id,entries.filter(e=>e.row.tiles.includes(id))]));
    let best=null,bestValue=-1,nodes=0,stopped=false;
    function search(mask,needed,chosen,gain,points) {
      if(++nodes>budget||stopped)return;
      if(needed===0n&&points>=minPoints&&gain>bestValue) {
        best=chosen;bestValue=gain;
        if(options.first&&gain>0){stopped=true;return;}
      }
      let picked=null,choices=null;
      const relevant=needed||mask;
      for(const id of available) {
        if(!(relevant&index.get(id)))continue;
        const possible=covering.get(id).filter(e=>(e.mask&mask)===e.mask);
        if(needed&&possible.length===0)return;
        if(!possible.length)continue;
        if(choices===null||possible.length<choices.length){picked=id;choices=possible;if(possible.length===1)break;}
      }
      if(picked===null)return;
      for(const e of choices) {
        search(mask^e.mask,needed&~e.mask,[...chosen,e.row],gain+e.gain,points+e.points);
        if(nodes>budget||stopped)break;
      }
      if(!(needed&index.get(picked)))search(mask&~index.get(picked),needed,chosen,gain,points);
    }
    search(allMask,requiredMask,[],0,0);
    return best;
  }
  function extend(o,table) {
    const result=clone(table),used=new Set(tableTiles(result));
    let remaining=o.hand.filter(id=>!used.has(id)),changed=true;
    while(changed) {
      changed=false;
      for(const id of remaining) {
        const row=result.find(r=>analyze({kind:r.kind,tiles:[...r.tiles,id]}).valid);
        if(row){row.tiles=analyze({kind:row.kind,tiles:[...row.tiles,id]}).ordered;remaining=remaining.filter(x=>x!==id);changed=true;break;}
      }
    }
    return result;
  }
  function choose(o,level='normal',rng=Math.random) {
    if(o.done||o.player!==o.turn)throw new Error('지금은 선택할 수 없습니다.');
    const rack=level==='easy'?shuffle(o.hand,rng):sortRack(o.hand,'value').reverse();
    const budget=level==='easy'?180:level==='normal'?650:1300;
    const own=solve(rack,[],{budget,minPoints:o.opened?0:30,first:level==='easy'});
    let best={type:'draw'},bestGain=0;
    function consider(table) {
      const check=validate(o,table);if(!check.ok)return;
      const gain=check.used.length*100+penalty(check.used);
      if(gain>bestGain){bestGain=gain;best={type:'meld',table};}
    }
    if(own&&own.length)consider(o.opened?extend(o,[...o.table,...own]):[...o.table,...own]);
    if(!o.opened)return best;
    const extensions=extend(o,o.table);
    consider(extensions);
    if(level!=='easy') {
      const left=rack.filter(id=>!tableTiles(extensions).includes(id));
      const extra=solve(left,[],{budget});
      if(extra)consider([...extensions,...extra]);
    }
    if(level!=='hard')return best;
    // Bounded local reconstruction: all single sets, then pairs among the four most relevant sets.
    const ranked=o.table.map((row,i)=>({i,interest:row.tiles.filter(joker).length*8+
      row.tiles.reduce((n,id)=>n+rack.filter(x=>!joker(x)&&(value(x)===value(id)||
        color(x)===color(id)&&Math.abs(value(x)-value(id))<=2)).length,0)}))
      .sort((a,b)=>b.interest-a.interest).slice(0,6).map(x=>x.i);
    const subsets=[...ranked.map(i=>[i]),...combinations(ranked.slice(0,4),2)];
    for(const indices of subsets) {
      const base=indices.map(i=>o.table[i]),required=tableTiles(base);
      if(required.length>20)continue;
      const replacement=solve([...required,...rack],required,{budget:600,base,limit:2200});
      if(!replacement)continue;
      const table=[...o.table.filter((_,i)=>!indices.includes(i)),...replacement];
      consider(extend(o,table));
      if(best.type==='meld'&&tableTiles(best.table).filter(id=>o.hand.includes(id)).length===rack.length)break;
    }
    return best;
  }
  function practice(level=1,rng=Math.random) {
    const c=Math.floor(rng()*4),n=3+Math.floor(rng()*6);
    const s={hands:[[],[]],pool:[],table:[],opened:[true,true],turn:0,turns:0,passes:0,done:false,result:null,log:[]};
    let solution,goal,hint,minUsed;
    if(level===1) {
      s.hands[0]=shuffle([tile(c,n),tile(c,n+1),tile(c,n+2),tile((c+1)%4,1),tile((c+2)%4,13)],rng);
      solution=[{kind:'run',tiles:[tile(c,n),tile(c,n+1),tile(c,n+2)]}];
      goal='손패에서 타일 3개 이상을 골라 올바른 묶음을 만들어 보세요.';
      hint=COLORS[c].name+'에서 '+n+'부터 이어지는 세 수를 찾아보세요.';minUsed=3;
    } else if(level===2) {
      const v=4+Math.floor(rng()*3),other=(c+1)%4;
      s.opened[0]=false;s.hands[0]=shuffle([tile(c,v),tile((c+1)%4,v),tile((c+2)%4,v),tile(other,8),tile(other,10),104],rng);
      solution=[{kind:'group',tiles:[tile(c,v),tile((c+1)%4,v),tile((c+2)%4,v)]},{kind:'run',tiles:[tile(other,8),104,tile(other,10)]}];
      goal='자기 타일만 사용해 30점 이상으로 첫 등록을 해 보세요.';
      hint='같은 수 묶음과 '+COLORS[other].name+' 연속 줄을 함께 만들면 합계가 30점 이상입니다. 조커는 빠진 9를 대신합니다.';minUsed=3;
    } else if(rng()<.5) {
      s.table=[{kind:'group',tiles:[0,1,2,3].map(k=>tile(k,n))}];
      s.hands[0]=[tile(c,n-1),tile(c,n+1)];
      solution=[{kind:'group',tiles:s.table[0].tiles.filter(id=>color(id)!==c)},{kind:'run',tiles:[tile(c,n-1),tile(c,n),tile(c,n+1)]}];
      goal='테이블을 재배열해 손패 2개를 모두 내려놓으세요.';
      hint='네 개짜리 묶음에서 '+COLORS[c].name+' '+n+' 하나를 빼도 세 개가 남습니다. 뺀 타일을 내 두 타일 사이에 넣어보세요.';minUsed=2;
    } else {
      const other=(c+1)%4;
      s.table=[{kind:'run',tiles:[tile(c,6),tile(c,7),104]}];
      s.hands[0]=[tile(c,5),tile(other,9),tile(other,10)];
      solution=[{kind:'run',tiles:[tile(c,5),tile(c,6),tile(c,7)]},{kind:'run',tiles:[tile(other,9),tile(other,10),104]}];
      goal='조커를 회수해 새 연속 줄을 만들고 손패 3개를 모두 내려놓으세요.';
      hint='5·6·7로 첫 줄을 완성하면 조커를 옮길 수 있습니다. 다른 색의 9·10과 조커로 새 줄을 만드세요.';minUsed=3;
    }
    return {state:s,solution,goal,hint,minUsed,level};
  }
  const api={COLORS,tiles,joker,color,value,tile,label,penalty,sortRack,signature,tableTiles,analyze,deal,
    observation,validate,apply,visibleRack,enumerate,solve,choose,practice};
  root.Rummikub=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

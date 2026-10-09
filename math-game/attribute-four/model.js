/* JB Math: original implementation of the basic Quarto alignment rules. */
(function (root) {
  'use strict';
  const LINES = [
    [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
    [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
    [0,5,10,15],[3,6,9,12]
  ];
  const FEATURES = [
    ['밝은 색','어두운 색'], ['둥근 모양','네모 모양'],
    ['낮은 높이','높은 높이'], ['막힌 윗면','뚫린 윗면']
  ];
  const ALL = Array.from({length:16}, (_,i) => i);
  const randomItem = a => a[Math.floor(Math.random()*a.length)];
  function shuffled(a) {
    const out = a.slice();
    for (let i=out.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }
  function pieceMask(id) { return id | ((~id & 15) << 4); }
  function commonMask(ids) { return ids.reduce((mask,id) => mask & pieceMask(id),255); }
  function describe(id) { return FEATURES.map((pair,bit) => pair[(id>>bit)&1]); }
  function maskNames(mask) {
    return FEATURES.flatMap((pair,bit) => (mask & (1<<bit)) ? [pair[1]] : (mask & (1<<(bit+4))) ? [pair[0]] : []);
  }
  function winningLines(board) {
    return LINES.filter(line => line.every(i=>board[i]>=0) && commonMask(line.map(i=>board[i])) !== 0);
  }
  function dangerMask(board) {
    let mask=0;
    for (const line of LINES) {
      const ids=line.map(i=>board[i]).filter(id=>id>=0);
      if (ids.length===3) mask |= commonMask(ids);
    }
    return mask;
  }
  function winningCells(board,id) {
    return ALL.filter(pos => {
      if (board[pos]>=0) return false;
      return LINES.some(line => line.includes(pos) && line.every(i=>i===pos||board[i]>=0) && commonMask(line.map(i=>i===pos?id:board[i])));
    });
  }
  function safePieces(board,pool) {
    const danger=dangerMask(board);
    return pool.filter(id=>(pieceMask(id)&danger)===0);
  }
  function makePractice(level=1) {
    const line=randomItem(LINES), bit=Math.floor(Math.random()*4), value=Math.floor(Math.random()*2);
    const chosen=shuffled(ALL.filter(id=>((id>>bit)&1)===value)).slice(0,4);
    const held=chosen.pop(), target=randomItem(line), board=Array(16).fill(-1);
    line.filter(i=>i!==target).forEach((pos,i)=>{board[pos]=chosen[i];});
    const extras=shuffled(ALL.filter(i=>!line.includes(i)));
    let added=0;
    for (const pos of extras) {
      if (added>=Math.min(6,(level-1)*3)) break;
      const candidates=shuffled(ALL.filter(id=>id!==held&&!board.includes(id)));
      for (const id of candidates) {
        board[pos]=id;
        if (!winningLines(board).length) { added++; break; }
        board[pos]=-1;
      }
    }
    return {board,held,pool:ALL.filter(id=>id!==held&&!board.includes(id))};
  }
  function normalAction(board,pool,held) {
    if (held<0) {
      const safe=safePieces(board,pool);
      if(safe.length) return randomItem(safe);
      let best=Infinity, choices=[];
      for(const id of pool){ const n=winningCells(board,id).length; if(n<best){best=n;choices=[id];}else if(n===best)choices.push(id); }
      return randomItem(choices);
    }
    const wins=winningCells(board,held);
    if(wins.length) return randomItem(wins);
    let best=-Infinity, choices=[];
    for(const pos of ALL.filter(i=>board[i]<0)) {
      board[pos]=held;
      const safe=safePieces(board,pool).length;
      const score=pool.length===0?0:safe===0?-1000:safe*10;
      board[pos]=-1;
      if(score>best){best=score;choices=[pos];} else if(score===best) choices.push(pos);
    }
    return randomItem(choices);
  }
  function aiAction(input) {
    const board=input.board.slice(), pool=input.pool.slice(), held=input.held;
    const fallback=normalAction(board,pool,held);
    if(input.difficulty==='easy') {
      const moves=held<0?pool:ALL.filter(i=>board[i]<0);
      return {action:Math.random()<.25?fallback:randomItem(moves),depth:0};
    }
    if(input.difficulty!=='hard') return {action:fallback,depth:1};
    if(held>=0 && winningCells(board,held).length) return {action:fallback,depth:1};
    const deadline=Date.now()+650, STOP={}, MATE=10000;
    let nodes=0, answer=fallback, completeDepth=0;
    function tick(){ if((++nodes & 63)===0 && Date.now()>deadline) throw STOP; }
    function leaf(b,p,h) {
      const danger=dangerMask(b);
      if(h>=0) {
        if(pieceMask(h)&danger) return MATE-50;
        return 0;
      }
      if(!p.length) return 0;
      const safe=p.filter(id=>(pieceMask(id)&danger)===0).length;
      return safe===0?-MATE+50:safe*2;
    }
    function ordered(b,p,h) {
      if(h<0) {
        const safe=safePieces(b,p);
        return safe.length?safe:p;
      }
      return ALL.filter(i=>b[i]<0).map(pos=>{
        b[pos]=h;
        const won=winningLines(b).length>0;
        const score=won?10000:safePieces(b,p).length;
        b[pos]=-1;
        return {pos,score};
      }).sort((a,b)=>b.score-a.score).map(x=>x.pos);
    }
    function search(b,p,h,depth,alpha,beta,ply) {
      tick();
      if(!b.includes(-1)) return 0;
      if(h<0&&p.length&&!safePieces(b,p).length) return -MATE+ply+1;
      if(depth<=0) return leaf(b,p,h);
      let best=-Infinity;
      for(const action of ordered(b,p,h)) {
        let score;
        if(h<0) score=-search(b,p.filter(id=>id!==action),action,depth-1,-beta,-alpha,ply+1);
        else {
          b[action]=h;
          try { score=winningLines(b).length?MATE-ply:search(b,p,-1,depth-1,alpha,beta,ply+1); }
          finally { b[action]=-1; }
        }
        best=Math.max(best,score); alpha=Math.max(alpha,best);
        if(alpha>=beta) break;
      }
      return best===-Infinity?0:best;
    }
    for(let depth=2;depth<=8;depth++) {
      let local=fallback, best=-Infinity, alpha=-Infinity;
      try {
        const actions=ordered(board,pool,held);
        actions.sort((a,b)=>(a===answer?-1:b===answer?1:0));
        for(const action of actions) {
          if(Date.now()>deadline) throw STOP;
          let score;
          if(held<0) score=-search(board,pool.filter(id=>id!==action),action,depth-1,-Infinity,-alpha,1);
          else {
            board[action]=held;
            try { score=winningLines(board).length?MATE:search(board,pool,-1,depth-1,alpha,Infinity,1); }
            finally {board[action]=-1;}
          }
          if(score>best){best=score;local=action;}
          alpha=Math.max(alpha,best);
        }
        answer=local;completeDepth=depth;
        if(Math.abs(best)>9000) break;
      }catch(error){ if(error!==STOP) throw error; break; }
    }
    return {action:answer,depth:completeDepth,nodes};
  }
  root.AttributeFour={ALL,LINES,FEATURES,pieceMask,commonMask,maskNames,describe,winningLines,winningCells,dangerMask,safePieces,makePractice,aiAction};
})(typeof self!=='undefined'?self:globalThis);

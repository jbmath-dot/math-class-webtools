/* All visuals and teaching text are original to this classroom edition. */
(function () {
  'use strict';
  const M=window.AttributeFour, $=id=>document.getElementById(id);
  let state=null, history=[], selected=-1, hintOn=false, feedback='', busy=false;
  let worker=null, timer=null, requestId=0, solved=0, attempted=0;
  const levels={easy:'쉬움',normal:'보통',hard:'어려움'};
  const positionName=pos=>'ABCD'[pos%4]+(Math.floor(pos/4)+1);
  const who=i=>state.mode==='local'?`플레이어 ${i+1}`:i===0?'나':'AI';
  const isHuman=()=>state&&state.phase!=='over'&&(state.mode!=='ai'||state.current===0)&&!busy;
  const escapeText=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pieceSvg(id,ghost=false){
    const dark=!!(id&1),square=!!(id&2),tall=!!(id&4),hole=!!(id&8);
    const top=tall?18:42,bottom=76,fill=dark?'#36535b':'#ecd6a5',side=dark?'#1c363d':'#c2a575',edge=dark?'#102e35':'#927b54';
    const body=square?`<path d="M20 ${top+2} L40 ${top-9} L62 ${top+2} V${bottom-7} L42 ${bottom+4} L20 ${bottom-7}Z" fill="${side}"/><path d="M20 ${top+2} L40 ${top-9} L62 ${top+2} L42 ${top+13}Z" fill="${fill}"/><path d="M42 ${top+13} V${bottom+4}" fill="none"/>`:`<path d="M19 ${top}V${bottom-6} A22 10 0 0 0 63 ${bottom-6}V${top}" fill="${side}"/><ellipse cx="41" cy="${top}" rx="22" ry="10" fill="${fill}"/>`;
    const holeShape=hole?(square?`<path d="M33 ${top+2} L40 ${top-2} L49 ${top+2} L42 ${top+6}Z" fill="${dark?'#0b2027':'#6d593b'}" stroke="${dark?'#8ca49c':'#fff0cb'}"/>`:`<ellipse cx="41" cy="${top}" rx="8" ry="4" fill="${dark?'#0b2027':'#6d593b'}" stroke="${dark?'#8ca49c':'#fff0cb'}"/>`):'';
    return `<svg class="piece-svg${ghost?' ghost':''}" viewBox="0 0 82 92" aria-hidden="true"><ellipse cx="41" cy="80" rx="27" ry="6" fill="#183a3320"/><g stroke="${edge}" stroke-width="1.5" stroke-linejoin="round">${body}${holeShape}</g></svg>`;
  }
  function syncSettings(){
    const mode=document.querySelector('input[name="mode"]:checked').value;
    $('difficulty-field').hidden=mode!=='ai';$('starter-field').hidden=mode==='practice';$('practice-field').hidden=mode!=='practice';
    $('starter').options[0].textContent=mode==='local'?'플레이어 1':'나';
    $('starter').options[1].textContent=mode==='local'?'플레이어 2':'AI';
    $('mode-description').textContent={practice:'받은 말 하나로 줄을 완성해 보세요. 틀려도 다시 시도할 수 있고, 힌트로 속성을 비교할 수 있습니다.',ai:'AI와 번갈아 말을 고르고 놓습니다. 상대에게 줄 말까지 신중하게 선택하세요.',local:'온라인 접속방 없이 이 기기 하나를 함께 사용합니다. 차례 안내를 보고 두 사람이 번갈아 조작하세요.'}[mode];
  }
  function cancelAI(){requestId++;clearTimeout(timer);timer=null;if(worker){worker.terminate();worker=null;}busy=false;}
  function startGame(keepScore=false,reuseSettings=false){
    const config=reuseSettings&&state?state:{mode:document.querySelector('input[name="mode"]:checked').value,difficulty:$('difficulty').value,level:Number($('practice-level').value),starter:Number($('starter').value)};
    cancelAI();history=[];selected=-1;hintOn=false;feedback='';
    const mode=config.mode;
    if(!keepScore){solved=0;attempted=0;}
    state={mode,difficulty:config.difficulty,level:config.level,starter:config.starter,current:config.starter,board:Array(16).fill(-1),pool:M.ALL.slice(),held:-1,phase:'choose',wins:[]};
    if(mode==='practice'){Object.assign(state,M.makePractice(state.level));state.phase='place';state.current=0;}
    $('setup').hidden=true;$('game').hidden=false;
    render();queueAI();$('turn-title').setAttribute('tabindex','-1');$('turn-title').focus({preventScroll:true});
  }
  function snapshot(){history.push(JSON.parse(JSON.stringify(state)));}
  function choosePiece(id){state.pool=state.pool.filter(p=>p!==id);state.held=id;state.phase='place';state.current=1-state.current;}
  function placePiece(pos){
    state.board[pos]=state.held;state.held=-1;state.wins=M.winningLines(state.board);
    if(state.wins.length){state.phase='over';if(state.mode==='practice')solved++;}
    else if(!state.board.includes(-1))state.phase='over';
    else state.phase='choose';
  }
  function confirm(){
    if(!isHuman()||selected<0)return;
    if(state.mode==='practice'){
      attempted++;
      if(!M.winningCells(state.board,state.held).includes(selected)){
        feedback=`${positionName(selected)}에서는 공통 속성을 가진 네 말이 한 줄에 모이지 않습니다. 다른 칸을 찾아보세요.`;selected=-1;render();return;
      }
      placePiece(selected);feedback='찾았어요! 완성된 줄의 말 네 개에서 같은 속성을 설명해 보세요.';
    }else{
      snapshot();
      if(state.phase==='choose')choosePiece(selected);else placePiece(selected);
      feedback='';
    }
    selected=-1;hintOn=false;render();queueAI();
  }
  function finishAI(action){
    const legal=state.phase==='choose'?state.pool.includes(action):Number.isInteger(action)&&action>=0&&action<16&&state.board[action]<0;
    if(!legal){action=M.aiAction({...state,difficulty:'normal'}).action;}
    busy=false;
    if(state.phase==='choose')choosePiece(action);else placePiece(action);
    selected=-1;hintOn=false;render();queueAI();
  }
  function queueAI(){
    if(!state||state.mode!=='ai'||state.current!==1||state.phase==='over')return;
    busy=true;render();const id=++requestId;
    timer=setTimeout(()=>{
      timer=null;
      const fallback=()=>{
        if(id!==requestId)return;
        if(worker){worker.terminate();worker=null;}
        feedback='이 환경에서는 기본 전략 AI로 이어서 진행합니다.';
        finishAI(M.aiAction({...state,difficulty:'normal'}).action);
      };
      try{
        worker=new Worker('ai-worker.js');
        worker.onmessage=event=>{
          if(id!==requestId||event.data.id!==id)return;
          if(event.data.error){fallback();return;}
          worker.terminate();worker=null;finishAI(event.data.action);
        };
        worker.onerror=event=>{event.preventDefault();fallback();};
        worker.postMessage({id,board:state.board,pool:state.pool,held:state.held,difficulty:state.difficulty});
      }catch(error){fallback();}
    },350);
  }
  function undo(){
    if(!history.length)return;
    cancelAI();state=history.pop();selected=-1;hintOn=false;feedback='직전 선택 전으로 돌아왔습니다. 다른 전략을 시도해 보세요.';render();queueAI();
  }
  function hintText(){
    if(state.phase==='choose'){
      const safe=M.safePieces(state.board,state.pool);
      return safe.length?`초록색 말 ${safe.length}개는 상대가 다음 한 수로 바로 줄을 완성할 수 없는 말입니다. 이후까지 안전하다는 뜻은 아니에요.`:'어떤 말을 건네도 상대가 바로 완성할 수 있는 칸이 있습니다. 되돌리기로 이전 선택을 비교해 보세요.';
    }
    const cells=M.winningCells(state.board,state.held);
    return cells.length?`노란 칸 ${cells.map(positionName).join(', ')}에 놓으면 공통 속성이 있는 줄을 완성합니다.`:'지금 바로 완성되는 칸은 없습니다. 이 말을 놓은 뒤 상대에게 건넬 안전한 말이 남는지 생각해 보세요.';
  }
  function render(){
    if(!state)return;
    const focus=document.activeElement,focusPos=focus?.dataset.pos,focusPiece=focus?.dataset.piece;
    const over=state.phase==='over',human=isHuman(),practice=state.mode==='practice';
    const won=new Set(state.wins.flat());
    const hintedCells=hintOn&&state.phase==='place'?M.winningCells(state.board,state.held):[];
    const hintedPieces=hintOn&&state.phase==='choose'?M.safePieces(state.board,state.pool):[];
    $('mode-badge').textContent=practice?`연습 · ${state.level}단계`:state.mode==='ai'?`AI 대결 · ${levels[state.difficulty]}`:'같은 기기 · 2인 대결';
    $('turn-step').textContent=over?'✓':state.phase==='choose'?'1':'2';
    $('turn-banner').classList.toggle('finished',over);
    $('turn-title').textContent=over?(state.wins.length?(practice?'속성을 찾았어요!':`${who(state.current)} 승리!`):'무승부입니다'):practice?'한 수로 줄을 완성해 보세요':busy?'AI가 생각하고 있어요':`${who(state.current)} · ${state.phase==='choose'?'말을 건네세요':'말을 놓으세요'}`;
    $('turn-help').textContent=over?(state.wins.length?state.wins.map(line=>`${line.map(positionName).join('–')} · 모두 ${M.maskNames(M.commonMask(line.map(i=>state.board[i]))).join(' / ')}`).join(' | '):'16칸을 모두 채웠지만 공통 속성을 가진 줄이 없습니다.'):state.phase==='choose'?`${who(1-state.current)}이(가) 놓을 말을 아래에서 골라 건네세요.`:practice?'빈칸을 선택하고 “여기에 놓기”를 누르세요.':`받은 말을 놓은 다음, ${who(state.current)}이(가) 상대의 말을 고릅니다.`;
    $('progress').textContent=practice?`${solved}문제 성공 / ${attempted}회 시도`:`${state.board.filter(p=>p>=0).length} / 16칸`;
    $('board').innerHTML=state.board.map((piece,pos)=>{
      const selectedCell=state.phase==='place'&&selected===pos;
      const classes=['cell',selectedCell?'selected':'',won.has(pos)?'winner':'',hintedCells.includes(pos)?'hinted':''].filter(Boolean).join(' ');
      const label=`${positionName(pos)}, ${piece>=0?M.describe(piece).join(', '):'빈칸'}${won.has(pos)?', 완성된 줄':''}`;
      return `<button type="button" class="${classes}" data-pos="${pos}" aria-label="${escapeText(label)}" aria-pressed="${selectedCell}" ${(!human||state.phase!=='place'||piece>=0)?'disabled':''}><span class="cell-number" aria-hidden="true">${positionName(pos)}</span>${piece>=0?pieceSvg(piece):selectedCell?pieceSvg(state.held,true):''}</button>`;
    }).join('');
    $('pool').innerHTML=state.pool.map(id=>`<button type="button" data-piece="${id}" class="pool-piece${state.phase==='choose'&&selected===id?' selected':''}${hintedPieces.includes(id)?' hinted':''}" aria-pressed="${state.phase==='choose'&&selected===id}" aria-label="말 ${id+1}, ${escapeText(M.describe(id).join(', '))}" ${(!human||state.phase!=='choose')?'disabled':''}>${pieceSvg(id)}<span aria-hidden="true">${id+1}</span></button>`).join('');
    const preview=state.held>=0?state.held:state.phase==='choose'?selected:-1;
    $('held-heading').textContent=state.phase==='choose'?'건넬 말 미리 보기':'놓을 말';
    $('held-number').textContent=preview>=0?`말 ${preview+1}`:'';
    $('held-piece').innerHTML=preview>=0?pieceSvg(preview):'<span class="held-placeholder">'+(over?'게임이 끝났습니다':'남아 있는 말에서 선택')+'</span>';
    $('held-description').textContent=preview>=0?M.describe(preview).join(' · '):'네 가지 속성을 비교하세요.';
    $('pool-count').textContent=`${state.pool.length}개`;
    $('confirm').hidden=over;$('confirm').disabled=!human||selected<0;
    $('confirm').textContent=state.phase==='choose'?'이 말 건네기':'여기에 놓기';
    $('next').hidden=!(over&&practice);$('restart').hidden=!(over&&!practice);
    $('undo').disabled=!history.length;$('undo').hidden=practice;
    $('hint').disabled=!human;$('hint').hidden=over;$('hint').textContent=hintOn?'힌트 닫기':'힌트 보기';$('hint').setAttribute('aria-pressed',String(hintOn));
    $('feedback').textContent=hintOn?hintText():feedback;
    const remaining=state.pool.length,safe=M.safePieces(state.board,state.pool).length;
    const fraction=remaining?`${remaining-safe}/${remaining}`:'해당 없음';
    $('analysis-content').innerHTML=`<p><span class="analysis-number">2 × 2 × 2 × 2 = 16</span><br>색·모양·높이·윗면에서 각각 두 가지를 고르므로 서로 다른 말은 16개입니다. “밝고 높은 말”은 몇 개일까요?</p><p>남은 말 <b>${remaining}개</b> 중, 지금 판에서 바로 완성에 쓰일 수 있는 말은 <b>${remaining-safe}개</b>입니다. 남은 말에서 같은 가능성으로 하나를 뽑는다면 그 비율은 <b>${fraction}</b>입니다. 이것은 AI의 승률이 아닙니다. 실제 대결에서는 말을 전략적으로 선택합니다.</p><p><b>생각 나누기:</b> 안전한 말이라는 판단은 몇 수 뒤까지 유효할까요? 친구의 설명에서 빠진 속성이나 줄은 없는지 확인해 보세요.</p>${practice?`<p>이번 연습 기록: <b>${solved}문제 성공 · ${attempted}회 시도</b>. 정답 위치보다 공통 속성을 말로 설명하는 데 집중해 보세요.</p>`:''}`;
    const restore=focusPos!==undefined?$('board').querySelector(`[data-pos="${focusPos}"]`):focusPiece!==undefined?$('pool').querySelector(`[data-piece="${focusPiece}"]`):null;
    if(restore&&!restore.disabled)restore.focus({preventScroll:true});
  }
  document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change',syncSettings));
  $('setup-form').addEventListener('submit',event=>{event.preventDefault();startGame();});
  $('board').addEventListener('click',event=>{const b=event.target.closest('[data-pos]');if(!b||!isHuman()||state.phase!=='place'||b.disabled)return;selected=Number(b.dataset.pos);feedback='';render();});
  $('pool').addEventListener('click',event=>{const b=event.target.closest('[data-piece]');if(!b||!isHuman()||state.phase!=='choose'||b.disabled)return;selected=Number(b.dataset.piece);feedback='';render();});
  $('confirm').addEventListener('click',confirm);$('undo').addEventListener('click',undo);
  $('hint').addEventListener('click',()=>{hintOn=!hintOn;render();});
  $('next').addEventListener('click',()=>startGame(true,true));$('restart').addEventListener('click',()=>startGame(false,true));
  $('settings').addEventListener('click',()=>{$('setup').hidden=!$('setup').hidden;if(!$('setup').hidden)$('setup').scrollIntoView({behavior:'auto',block:'start'});});
  document.querySelectorAll('[data-rules]').forEach(button=>button.addEventListener('click',()=>$('rules').showModal()));
  $('close-rules').addEventListener('click',()=>$('rules').close());
  window.addEventListener('pagehide',cancelAI);window.addEventListener('pageshow',event=>{if(event.persisted)queueAI();});
  syncSettings();
})();

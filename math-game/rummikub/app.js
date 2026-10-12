(function () {
  'use strict';
  const M=window.Rummikub,$=id=>document.getElementById(id),names={easy:'쉬움',normal:'보통',hard:'어려움'};
  let options,state,draft=[],selected=new Set(),covered=false,puzzle=null,practiceSolved=false,solved=0;
  let timer=null,worker=null,generation=0,busy=false,sequence=0,suggestion=null,choiceError=false;
  const player=p=>options.mode==='ai'?(p===0?'나':'AI'):'플레이어 '+(p+1);
  const human=()=>state&&!state.done&&!covered&&(options.mode!=='ai'||state.turn===0);
  const editing=()=>human()&&!practiceSolved&&!busy;
  const say=text=>{$('feedback').textContent=text;};
  const signed=n=>n>0?'+'+n:String(n);
  function cancel() {clearTimeout(timer);timer=null;if(worker)worker.terminate();worker=null;generation++;busy=false;}
  function resetDraft() {
    draft=state.table.map(row=>({...structuredClone(row),key:++sequence}));
    selected.clear();suggestion=null;choiceError=false;
  }
  function hasEdits() {
    return draft.length!==state.table.length||
      draft.some(row=>!state.table.some(old=>M.signature(old)===M.signature(row)));
  }
  function editable(row) {
    return editing()&&(state.opened[state.turn]||row.tiles.every(id=>state.hands[state.turn].includes(id)));
  }
  function tileMarkup(id,interactive=false,assignment=null) {
    const j=M.joker(id),c=j?(assignment?M.COLORS[assignment.color]:null):M.COLORS[M.color(id)];
    const title=M.label(id)+(assignment?' · '+c.name+' '+assignment.value+' 대신':'');
    const isSelected=interactive&&selected.has(id),own=state.hands[state.turn].includes(id);
    return '<'+(interactive?'button type="button"':'span')+' class="rk-tile'+(j?' joker':'')+
      (isSelected?' selected':'')+(own?' own':'')+'" style="--tile-color:'+(c?c.hex:'#5e574a')+'" '+
      (interactive?'data-tile="'+id+'" aria-pressed="'+isSelected+'" ':'role="img" ')+
      'aria-label="'+title+'"><span class="number">'+(j?'★':M.value(id))+'</span>'+
      '<span class="mark" aria-hidden="true">'+(c?c.mark:'✦')+'</span><small>'+
      (j?(assignment?assignment.value+' 조커':'조커'):c.name)+'</small></'+(interactive?'button':'span')+'>';
  }
  function rowMarkup(row,i,canEdit) {
    const d=M.analyze(row),enabled=canEdit&&editable(row);
    return '<article class="meld'+(d.valid?'':' invalid')+'"><div class="meld-heading"><b>'+
      (i+1)+' / '+(row.kind==='run'?'연속 줄':'같은 수 묶음')+'</b><span>'+
      (d.valid?d.sum+'점':d.message)+'</span></div><div class="tile-tray">'+
      d.ordered.map(id=>tileMarkup(id,enabled,d.assignments[id])).join('')+'</div>'+
      (canEdit?'<div class="meld-actions"><button type="button" data-target="'+row.key+'" '+
      (enabled&&selected.size?'':'disabled')+'>여기에 넣기</button><button type="button" data-break="'+row.key+'" '+
      (enabled?'':'disabled')+'>묶음 풀기</button></div>':'')+'</article>';
  }
  function renderResult() {
    $('result').hidden=!state.done;
    if(!state.done){$('result').replaceChildren();return;}
    const r=state.result;
    $('result').innerHTML='<p class="eyebrow">ROUND RESULT</p><h2>'+
      (r.winner===null?'무승부':player(r.winner)+' 승리')+'</h2><p class="muted">'+
      (r.reason==='empty'?'손패를 모두 내려놓았습니다. 상대의 남은 합을 득실 점수로 기록합니다.':
      '풀이 빈 뒤 두 번 연속 패스했습니다. 수업 규칙에 따라 남은 합의 차이로 계산합니다.')+
      '</p><div class="result-grid">'+r.scores.map((n,p)=>'<div>'+player(p)+'<strong>'+
      signed(n)+'점</strong><small>남은 타일 '+state.hands[p].length+'개 · 합 '+r.remaining[p]+'점</small></div>').join('')+'</div>';
  }
  function renderBoard() {
    const privateView=human(),table=privateView?draft:state.table;
    $('score-strip').innerHTML=options.mode==='practice'?'<div>연습 '+options.level+'단계<b>완료 '+solved+'문제</b><small>'+
      (state.opened[0]?'테이블 재배열 가능':'첫 등록 30점 이상')+'</small></div>':
      [0,1].map(p=>'<div class="'+(state.turn===p?'current':'')+'">'+player(p)+'<b>손패 '+
      state.hands[p].length+'개</b><small>'+(state.opened[p]?'첫 등록 완료':'첫 등록 전')+'</small></div>').join('')+
      '<div>뒤집힌 풀<b>'+state.pool.length+'개</b><small>'+(state.pool.length?'뽑으면 차례 종료':'연속 패스 '+state.passes+' / 2')+'</small></div>';
    $('table-note').textContent=privateView?(hasEdits()?'현재 편집 중 · 확정 전':'공유하는 타일입니다'):'확정된 테이블';
    $('table').innerHTML=table.length?table.map((row,i)=>rowMarkup(row,i,editing())).join(''):
      '<p class="empty-table">아직 놓인 묶음이 없습니다.<br>손패에서 타일을 골라 새 묶음을 만들어 보세요.</p>';
    const current=new Set(M.tableTiles(draft));
    const loose=privateView?M.tableTiles(state.table).filter(id=>!current.has(id)):[];
    $('loose-panel').hidden=!loose.length;
    $('loose').innerHTML=loose.map(id=>tileMarkup(id,editing())).join('');
  }
  function renderRack() {
    const show=human();
    $('editor').hidden=!show;
    // Handoff removes both the rack and uncommitted board edits from the DOM.
    $('rack').innerHTML=show?M.visibleRack(state,draft,options.mode,covered,$('sort').value).map(id=>tileMarkup(id,editing())).join(''):'';
    $('rack-title').textContent=options.mode==='practice'?'연습 손패':player(state.turn)+'의 손패';
    $('rack-note').textContent=options.mode==='practice'?puzzle.goal:
      state.opened[state.turn]?'테이블도 재배열할 수 있습니다. 내 타일을 최소 한 개 내려놓으세요.':
      '첫 등록은 손패만으로 합계 30점 이상입니다. 테이블 이용은 다음 내 차례부터 가능합니다.';
    $('selection-count').textContent=show?selected.size+'개 선택':'';
    $('clear-selection').disabled=!editing()||!selected.size;
    $('new-run').disabled=!editing()||selected.size<3;
    $('new-group').disabled=!editing()||selected.size<3||selected.size>4;
    $('take-out').disabled=!editing()||!selected.size;
    const check=show?M.validate(M.observation(state),draft):{ok:false,message:''};
    $('draft-status').textContent=show?(practiceSolved?'완성했습니다! 다음 문제도 풀어보세요.':hasEdits()?check.message:'타일을 선택해 조합을 만들어 보세요.'):'';
    $('draft-status').classList.toggle('ready',show&&check.ok);
    $('commit').disabled=!editing()||!check.ok;
    $('commit').textContent=options.mode==='practice'?'연습 정답 확인':'차례 확정';
    $('commit').hidden=practiceSolved;
    $('reset-draft').disabled=!editing()||!hasEdits();
    $('draw').hidden=options.mode==='practice';
    $('draw').disabled=!editing();
    $('draw').textContent=(hasEdits()?'편집 취소 · ':'')+(state.pool.length?'1개 뽑고 차례 종료':'풀 비었음 · 패스');
    $('next-practice').hidden=!practiceSolved;
    $('sort').disabled=!editing();
  }
  function render() {
    $('handoff').hidden=options.mode!=='local'||!covered||state.done;
    $('handoff-title').textContent=player(state.turn)+'에게 기기를 건네주세요.';
    $('hide-rack').hidden=options.mode!=='local'||covered||state.done;
    $('turn-label').textContent=options.mode==='practice'?'PRACTICE / '+options.level+'단계':
      state.done?'RESULT':player(state.turn)+' 차례 · '+(state.opened[state.turn]?'등록 완료':'첫 등록 전');
    $('turn-title').textContent=state.done?'이번 조합을 마쳤습니다.':covered?'기기를 받은 뒤 손패를 열어 주세요.':
      options.mode==='ai'&&state.turn===1?(choiceError?'AI 탐색을 완료하지 못했습니다. 다시 시도해 주세요.':'AI가 조합을 찾고 있습니다.'):practiceSolved?'조건에 맞는 조합을 완성했습니다!':
      busy?'가능한 조합을 살펴보고 있습니다.':options.mode==='practice'?puzzle.goal:'타일을 엮고, 차례를 확정하세요.';
    $('hint').disabled=!editing();
    $('retry-ai').hidden=!choiceError||options.mode!=='ai'||state.turn!==1;
    $('hint-layout').hidden=!suggestion||!editing();
    $('help-panel').hidden=covered||state.done||(options.mode==='ai'&&state.turn===1);
    $('log-panel').hidden=options.mode==='practice';
    $('log').innerHTML=state.log.map(item=>'<li>'+player(item.player)+' · '+item.text+'</li>').join('');
    renderResult();renderBoard();renderRack();
  }
  function editChanged(message) {
    suggestion=null;selected.clear();say(message);render();
  }
  function moveSelected(kind,targetKey=null) {
    if(!editing()||!selected.size)return;
    const ids=[...selected],target=targetKey===null?null:draft.find(row=>row.key===targetKey);
    if(targetKey!==null&&(!target||!editable(target)))return;
    let next=draft.map(row=>({...row,tiles:row.tiles.filter(id=>!selected.has(id))}));
    if(target)next.find(row=>row.key===targetKey).tiles.push(...ids);
    else next.push({kind,tiles:ids,key:++sequence});
    draft=next.filter(row=>row.tiles.length);
    editChanged('편집판에 놓았습니다. 묶음의 조건을 확인한 뒤 차례를 확정하세요.');
  }
  function finishAction(action,isAI=false) {
    if(!state||state.done||(!isAI&&!editing()))return;
    try {
      const p=state.turn;
      state=M.apply(state,action);cancel();covered=options.mode==='local'&&!state.done;resetDraft();
      say(state.done?'남은 타일을 계산했습니다.':options.mode==='local'?'손패를 가렸습니다. 다음 사람에게 기기를 건네주세요.':
        player(p)+'의 차례가 끝났습니다.');
      render();scheduleAI();
    } catch(error) {say(error.message);}
  }
  function requestChoice(level,onResult) {
    const token=generation,view=M.observation(state);
    busy=true;choiceError=false;render();
    function accept(result) {
      if(token!==generation)return;
      if(worker)worker.terminate();worker=null;busy=false;
      if(result.error){choiceError=true;say('조합 탐색을 완료하지 못했습니다. 직접 편집하거나 다시 힌트를 눌러 주세요.');render();return;}
      onResult(result.action);
    }
    function fallback() {
      if(worker)worker.terminate();worker=null;
      timer=setTimeout(()=>{if(token!==generation)return;try{accept({action:M.choose(view,level)});}catch(error){accept({error:error.message});}},20);
    }
    if(typeof Worker==='undefined'){fallback();return;}
    try {
      worker=new Worker('worker.js?v=20261012-rk1');
      worker.onmessage=e=>accept(e.data);
      worker.onerror=e=>{e.preventDefault();if(token===generation)fallback();};
      worker.postMessage({observation:view,level});
    } catch(error) {fallback();}
  }
  function scheduleAI() {
    clearTimeout(timer);
    if(!state||state.done||options.mode!=='ai'||state.turn!==1||document.hidden||$('game').hidden)return;
    const token=generation;
    timer=setTimeout(()=>{
      if(token!==generation)return;
      requestChoice(options.difficulty,action=>finishAction(action,true));
    },500);
  }
  function newPractice() {
    cancel();puzzle=M.practice(options.level);state=puzzle.state;covered=false;practiceSolved=false;resetDraft();
    say('타일을 눌러 선택한 뒤 아래 버튼으로 묶어 보세요.');render();
  }
  function start() {
    cancel();covered=false;practiceSolved=false;solved=0;puzzle=null;selected.clear();suggestion=null;
    $('setup').hidden=true;$('game').hidden=false;
    $('badge').textContent=options.mode==='practice'?'조합 연습 '+options.level+'단계':
      options.mode==='local'?'같은 기기 2인 · 수업용 한 판':'AI '+names[options.difficulty]+' · 수업용 한 판';
    if(options.mode==='practice'){newPractice();return;}
    state=M.deal(options);covered=options.mode==='local';resetDraft();
    say('손패의 조합을 찾아 첫 등록 30점을 만들어 보세요.');render();scheduleAI();
  }
  function setupChange() {
    const mode=new FormData($('setup-form')).get('mode');
    $('difficulty-field').hidden=mode!=='ai';$('level-field').hidden=mode!=='practice';$('first-field').hidden=mode==='practice';
    $('first').options[0].text=mode==='ai'?'나':'플레이어 1';$('first').options[1].text=mode==='ai'?'AI':'플레이어 2';
    $('mode-note').textContent=mode==='practice'?'묶음 만들기 → 첫 등록 30점 → 테이블 재배열과 조커. 직접 타일을 옮기며 익힙니다.':
      mode==='local'?'매 차례 손패와 확정 전 편집을 가립니다. 기기를 받은 사람만 손패를 열어 주세요.':
      '106개 타일 · 각자 14개 · 첫 등록 30점. AI는 자기 손패와 공개된 테이블만 봅니다.';
  }
  $('setup-form').addEventListener('change',setupChange);
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();options={mode:new FormData(e.target).get('mode'),difficulty:$('difficulty').value,level:Number($('level').value),first:Number($('first').value)};start();
  });
  $('game').addEventListener('click',e=>{
    const b=e.target.closest('[data-tile]');
    if(!b||!editing()||b.disabled)return;
    const id=Number(b.dataset.tile);
    if(selected.has(id))selected.delete(id);else selected.add(id);
    render();
    const replacement=$('game').querySelector('[data-tile="'+id+'"]');if(replacement)replacement.focus({preventScroll:true});
  });
  $('table').addEventListener('click',e=>{
    const target=e.target.closest('[data-target]'),dissolve=e.target.closest('[data-break]');
    if(!editing())return;
    if(target&&!target.disabled)moveSelected(null,Number(target.dataset.target));
    if(dissolve&&!dissolve.disabled) {
      const row=draft.find(r=>r.key===Number(dissolve.dataset.break));
      if(!row||!editable(row))return;
      draft=draft.filter(r=>r.key!==row.key);editChanged('묶음을 풀었습니다. 테이블 타일은 빼놓은 타일 칸에, 내 타일은 손패에 있습니다.');
    }
  });
  $('new-run').onclick=()=>{if(selected.size>=3)moveSelected('run');};
  $('new-group').onclick=()=>{if(selected.size>=3&&selected.size<=4)moveSelected('group');};
  $('take-out').onclick=()=>{
    if(!editing())return;
    draft=draft.map(row=>({...row,tiles:row.tiles.filter(id=>!selected.has(id))})).filter(row=>row.tiles.length);
    editChanged('선택한 타일을 빼놓았습니다. 테이블 타일은 차례 확정 전에 모두 다시 사용하세요.');
  };
  $('clear-selection').onclick=()=>{selected.clear();render();};
  $('sort').onchange=()=>renderRack();
  $('reset-draft').onclick=()=>{if(!editing())return;resetDraft();say('현재 차례를 시작할 때의 배치로 돌아왔습니다.');render();};
  $('commit').onclick=()=>{
    if(!editing())return;
    if(options.mode!=='practice'){finishAction({type:'meld',table:draft});return;}
    const check=M.validate(M.observation(state),draft);
    if(!check.ok){say(check.message);return;}
    if(check.used.length<puzzle.minUsed){say('이번 문제에서는 내 타일을 '+puzzle.minUsed+'개 이상 사용해 보세요.');return;}
    practiceSolved=true;solved++;selected.clear();suggestion=null;
    say('맞았습니다! '+(state.opened[0]?check.used.length+'개를 사용하면서 모든 묶음의 조건을 지켰습니다.':'첫 등록의 합은 '+check.points+'점입니다.')+
      (options.level===3?' 테이블의 타일을 빠짐없이 새 조합에 사용했습니다.':''));render();
  };
  $('draw').onclick=()=>finishAction({type:'draw'});
  $('retry-ai').onclick=()=>{cancel();choiceError=false;render();scheduleAI();};
  $('next-practice').onclick=newPractice;
  $('hint').onclick=()=>{
    if(!editing())return;
    if(options.mode==='practice'){suggestion=puzzle.solution;say(puzzle.hint);render();return;}
    requestChoice('hard',action=>{
      suggestion=action.type==='meld'?action.table:null;
      say(suggestion?'가능한 배치를 하나 찾았습니다. 힌트 배치를 편집판에 놓으면 현재 편집을 바꿉니다. 확인 후 직접 확정하세요. 최적의 배치는 아닐 수 있습니다.':
        '이번 탐색 범위에서는 배치를 찾지 못했습니다. 다른 재배열을 직접 시도하거나 타일을 뽑아 보세요.');
      render();
    });
  };
  $('hint-layout').onclick=()=>{
    if(!editing()||!suggestion)return;
    draft=suggestion.map(row=>({...structuredClone(row),key:++sequence}));
    editChanged('힌트 배치를 놓았습니다. 각 묶음과 첫 등록 점수를 살펴보고 확정해 보세요.');
  };
  $('reveal-rack').onclick=()=>{if(!state||state.done||!covered)return;covered=false;say('내 손패를 확인하세요.');render();};
  function cover() {
    if(!state||options.mode!=='local'||state.done)return;
    covered=true;selected.clear();suggestion=null;say('손패와 편집 중인 배치를 가렸습니다.');render();
  }
  $('hide-rack').onclick=()=>{cancel();cover();};
  $('settings').onclick=()=>{
    cancel();covered=true;selected.clear();suggestion=null;
    ['rack','loose','table','feedback','draft-status','selection-count'].forEach(id=>$(id).replaceChildren());
    $('game').hidden=true;$('setup').hidden=false;
  };
  $('restart').onclick=()=>{if(state.done||confirm('진행 중인 판을 끝내고 새로 시작할까요?'))start();};
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancel();cover();}
    else if(state&&!$('game').hidden){render();scheduleAI();}
  });
  window.addEventListener('pagehide',()=>{cancel();cover();});
  window.addEventListener('pageshow',()=>{if(state&&!$('game').hidden){render();scheduleAI();}});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('../../sw.js').catch(()=>{});
  setupChange();
})();

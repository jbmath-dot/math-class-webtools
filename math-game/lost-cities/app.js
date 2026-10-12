(function () {
  'use strict';
  const M=window.LostCities,$=id=>document.getElementById(id);
  const names={easy:'쉬움',normal:'보통',hard:'어려움'};
  let options,state,puzzle,selected=null,covered=false,undoState=null,timer=null,generation=0;
  let practiceSolved=false,solved=0,attempts=0;
  const player=p=>options.mode==='ai'?(p===0?'나':'AI'):`플레이어 ${p+1}`;
  const human=()=>state&&!state.roundOver&&!covered&&(options.mode!=='ai'||state.turn===0);
  const cancel=()=>{clearTimeout(timer);timer=null;generation++;};
  const say=text=>{$('feedback').textContent=text;};
  const signed=n=>n>0?`+${n}`:String(n);
  const formula=cards=>{
    const d=M.detail(cards);
    return d.count?`(${d.sum} − ${d.cost}) × ${d.multiplier} + ${d.bonus} = ${d.score}`:'시작하지 않은 탐험 · 0점';
  };
  function card(id,interactive=false) {
    const c=M.SUITS[M.suit(id)],v=M.value(id);
    const playable=state&&M.canPlay(id,state.expeditions[state.turn][M.suit(id)]);
    return `<${interactive?'button type="button"':'div'} class="lc-card ${!v?'investment':''} ${id===selected&&interactive?'selected':''}" style="--suit:${c.color}" ${interactive?`data-card="${id}" aria-pressed="${id===selected}" aria-label="${M.label(id)}${playable?' · 탐험에 놓기 가능':' · 버리기 가능'}"`:''}><span class="suit-mark" aria-hidden="true">${c.mark}</span><strong>${v||'투자'}</strong><small>${c.name}</small>${interactive?`<span class="hand-status">${playable?'놓기 가능':'버리기 가능'}</span>`:''}</${interactive?'button':'div'}>`;
  }
  function column(cards,c) {
    const meta=M.SUITS[c],d=M.detail(cards);
    return `<div class="route" style="--suit:${meta.color}"><h3><span>${meta.mark} ${meta.name}</span><small>×${d.multiplier}</small></h3><div class="tokens">${cards.length?cards.map(id=>`<span class="token ${M.value(id)?'':'wager'}">${M.value(id)||'투'}</span>`).join(''):'<span class="muted">미출발</span>'}</div><span class="route-score">${signed(d.score)}점</span><span class="calculation">${formula(cards)}<br>${cards.length}장${d.bonus?' · 8장 보너스 +20':''}</span></div>`;
  }
  function renderResult() {
    $('round-result').hidden=!state.roundOver;
    if(!state.roundOver){$('round-result').replaceChildren();return;}
    const totals=state.totals,winner=totals[0]===totals[1]?'무승부':`${player(totals[0]>totals[1]?0:1)} 승리`;
    $('round-result').innerHTML=`<p class="eyebrow">${state.done?'FINAL RESULT':'ROUND RESULT'}</p><h2>${state.done?winner:`${state.round}라운드 종료`}</h2><p class="muted">덱의 마지막 카드를 뽑았습니다. 손패는 점수에 포함하지 않습니다.</p><div class="result-grid">${totals.map((v,p)=>`<div>${player(p)} · 합산<strong>${signed(v)}점</strong></div>`).join('')}</div><table class="result-table"><thead><tr><th>라운드</th><th>${player(0)}</th><th>${player(1)}</th></tr></thead><tbody>${state.results.map((scores,i)=>`<tr><th>${i+1}</th>${scores.map(v=>`<td>${signed(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${!state.done?'<div class="actions"><button type="button" id="next-round" class="primary">다음 라운드 시작 →</button></div>':''}`;
    if(!state.done)$('next-round').onclick=()=>{
      cancel();state=M.nextRound(state);covered=options.mode==='local';selected=null;undoState=null;
      say('합산 점수가 높은 사람이 먼저 시작합니다.');render();scheduleAI();
    };
  }
  function renderBoard() {
    const perspective=options.mode==='local'?state.turn:0,opponent=1-perspective;
    const draw=human()&&state.phase==='draw';
    const piles=state.discards.map((pile,c)=>{
      const meta=M.SUITS[c],allowed=draw&&pile.length&&state.forbiddenDraw!==c;
      return `<button type="button" class="draw-pile ${allowed?'draw-ready':''}" style="--suit:${meta.color}" data-draw="${c}" ${allowed?'':'disabled'} aria-label="${meta.name} 버림 더미${pile.length?' · '+M.label(pile.at(-1)): ' 비어 있음'}"><span>${meta.mark} ${meta.name}</span><strong>${pile.length?(M.value(pile.at(-1))||'투자'):'—'}</strong><small>${pile.length}장${state.forbiddenDraw===c?' · 이번 차례 불가':''}</small></button>`;
    }).join('');
    $('public-board').innerHTML=`<section class="panel"><div class="score-strip">${[0,1].map(p=>`<div class="${state.turn===p?'current':''}">${player(p)} · 이번 탐험<b>${signed(M.score(state.expeditions[p]))}점</b></div>`).join('')}<div>${state.round} / ${state.rounds}라운드<b>덱 ${state.deck.length}장</b></div></div><div class="opponent"><div class="board-heading"><h3>${player(opponent)}의 공개 탐험로</h3><span>손패는 공개하지 않습니다</span></div><div class="route-grid">${state.expeditions[opponent].map(column).join('')}</div></div><div class="board-heading"><h3>카드 가져오기</h3><span>${draw?'덱 또는 허용된 버림 더미를 누르세요':'카드를 놓거나 버린 뒤 가져옵니다'}</span></div><div class="discard-row"><button type="button" class="draw-pile deck ${draw?'draw-ready':''}" data-draw="deck" ${draw&&state.deck.length?'':'disabled'}><span>뒤집힌 덱</span><strong>${state.deck.length}</strong><small>새 카드 한 장</small></button>${piles}</div><div class="board-heading"><h3>${player(perspective)}의 공개 탐험로</h3><span>투자부터 · 숫자는 오름차순</span></div><div class="route-grid">${state.expeditions[perspective].map(column).join('')}</div></section>`;
  }
  function renderHand() {
    const hidden=covered||(options.mode==='ai'&&state.turn===1);
    $('hand-panel').hidden=state.roundOver||covered;
    // Remove card elements instead of merely blurring them when a hand is covered.
    $('hand').innerHTML=hidden?'':M.visibleHand(state,options.mode,covered).map(id=>card(id,true)).join('');
    $('hand-title').textContent=hidden?'손패를 가리고 있습니다':`${player(state.turn)}의 손패`;
    $('hand-count').textContent=hidden?'':`${state.hands[state.turn].length}장`;
    $('hand-note').textContent=hidden?'AI가 자신의 차례를 진행하고 있습니다.':state.phase==='draw'?'카드를 놓았습니다. 위의 덱 또는 버림 더미에서 한 장을 가져오세요.':'카드를 선택한 뒤 탐험로에 놓거나 버리세요. 아래로 되돌아가는 숫자는 놓을 수 없습니다.';
    const active=human()&&state.phase==='play'&&selected!==null;
    $('play-card').disabled=!active||!M.canPlay(selected,state.expeditions[state.turn][M.suit(selected)]);
    $('discard-card').disabled=!active;
    $('selection-note').textContent=active?`${M.label(selected)} 선택 · ${M.canPlay(selected,state.expeditions[state.turn][M.suit(selected)])?'탐험에 놓거나 버릴 수 있습니다.':'이 탐험로에는 놓을 수 없어 버리기만 가능합니다.'}`:'';
  }
  function render() {
    if(options.mode==='practice'){renderPractice();return;}
    $('practice-panel').hidden=true;$('public-board').hidden=false;$('log-panel').hidden=false;
    $('handoff').hidden=!covered||state.roundOver;
    $('handoff-title').textContent=`${player(state.turn)}에게 기기를 건네주세요.`;
    $('turn-label').textContent=state.roundOver?'RESULT':`${player(state.turn)} 차례 · ${state.phase==='play'?'1 / 카드 놓기':'2 / 카드 가져오기'}`;
    $('turn-title').textContent=state.roundOver?(state.done?'탐험을 마쳤습니다.':'다음 탐험을 준비하세요.'):covered?'본인이 기기를 받은 뒤 손패를 열어 주세요.':!human()?'AI가 탐험을 계획하고 있습니다.':state.phase==='play'?'한 장을 놓거나 버리세요.':'한 장을 가져오면 차례가 끝납니다.';
    $('undo').hidden=false;$('undo').disabled=!human()||state.phase!=='draw'||!undoState;
    $('hide-hand').hidden=options.mode!=='local'||covered||state.roundOver;
    $('hint').disabled=!human();
    renderResult();renderBoard();renderHand();
    $('log').innerHTML=state.log.map(item=>`<li>${player(item.player)} · ${item.text}</li>`).join('');
  }
  function perform(action,isAI=false) {
    if(!state||state.roundOver||(!isAI&&!human()))return;
    try {
      const current=state.turn;
      if(action.type==='play'||action.type==='discard')undoState=!isAI?structuredClone(state):null;
      const next=M.apply(state,action);
      state=next;selected=null;
      if(action.type==='draw'){
        undoState=null;
        if(!state.roundOver)covered=options.mode==='local';
        say(state.roundOver?'탐험로의 점수를 계산했습니다.':options.mode==='local'?'손패를 가렸습니다. 다음 사람이 기기를 받아 주세요.':`${player(current)}의 차례가 끝났습니다.`);
      } else say(`${player(current)}: ${M.label(action.id)} ${action.type==='play'?'놓기':'버리기'}. 이제 한 장을 가져옵니다.`);
      render();scheduleAI();
    }catch(error){say(error.message);}
  }
  function scheduleAI() {
    clearTimeout(timer);
    if(!state||options.mode!=='ai'||state.turn!==1||state.roundOver||document.hidden)return;
    const token=generation;
    timer=setTimeout(()=>{
      if(token!==generation)return;
      try{perform(M.choose(M.observation(state,1),options.difficulty),true);}
      catch(error){say('AI의 선택을 완료하지 못했습니다. 새 게임으로 다시 시작해 주세요.');console.error(error);}
    },650);
  }
  function renderPractice() {
    $('practice-panel').hidden=false;$('public-board').hidden=true;$('public-board').replaceChildren();
    $('handoff').hidden=true;$('round-result').hidden=true;$('round-result').replaceChildren();
    $('hand-panel').hidden=true;$('hand').replaceChildren();$('log-panel').hidden=true;
    $('undo').hidden=true;$('hide-hand').hidden=true;$('hint').disabled=practiceSolved;
    $('turn-label').textContent=`PRACTICE / ${options.level}단계`;
    $('turn-title').textContent=practiceSolved?'점수 계산을 완성했습니다!':['','숫자 합에서 탐험 비용을 빼 보세요.','투자 배수가 손해에도 곱해집니다.','투자 카드도 장수에 포함해 보너스를 확인하세요.'][options.level];
    $('practice-cards').innerHTML=puzzle.cards.map(id=>card(id)).join('');
    $('practice-count').textContent=`완료 ${solved}문제 · 답 입력 ${attempts}회`;
    $('answer').disabled=practiceSolved;$('answer-form').querySelector('[type=submit]').disabled=practiceSolved;
    $('next-practice').hidden=!practiceSolved;
  }
  function newPractice() {puzzle=M.practice(options.level);practiceSolved=false;$('answer').value='';say('시작한 탐험은 비용 20점이 듭니다.');render();}
  function start() {
    cancel();selected=null;undoState=null;solved=0;attempts=0;state=null;
    $('setup').hidden=true;$('game').hidden=false;
    $('badge').textContent=options.mode==='practice'?`점수 연습 ${options.level}단계`:options.mode==='local'?`같은 기기 2인 · ${options.rounds}라운드`:`AI ${names[options.difficulty]} · ${options.rounds}라운드`;
    if(options.mode==='practice'){newPractice();return;}
    state=M.deal(options);covered=options.mode==='local';say('한 장을 놓거나 버린 다음, 한 장을 가져옵니다.');render();scheduleAI();
  }
  function setupChange() {
    const mode=new FormData($('setup-form')).get('mode');
    $('difficulty-field').hidden=mode!=='ai';$('level-field').hidden=mode!=='practice';
    $('rounds-field').hidden=mode==='practice';$('first-field').hidden=mode==='practice';
    $('first').options[0].text=mode==='ai'?'나':'플레이어 1';$('first').options[1].text=mode==='ai'?'AI':'플레이어 2';
    $('mode-note').textContent=mode==='local'?'같은 기기 2인 대결에서는 매 차례 손패를 가리고 다음 사람에게 기기를 전달합니다.':mode==='practice'?'비용 → 투자 → 보너스의 순서로 익힙니다. 문제를 풀면 전체 계산식을 확인할 수 있습니다.':'5개 탐험로의 기본판입니다. AI는 자기 손패와 공개된 정보만 사용합니다.';
  }
  $('setup-form').addEventListener('change',setupChange);
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();options={mode:new FormData(e.target).get('mode'),difficulty:$('difficulty').value,level:Number($('level').value),first:Number($('first').value),rounds:Number($('rounds').value)};start();
  });
  $('hand').addEventListener('click',e=>{const el=e.target.closest('[data-card]');if(!el||!human()||state.phase!=='play')return;selected=selected===Number(el.dataset.card)?null:Number(el.dataset.card);renderHand();});
  $('public-board').addEventListener('click',e=>{const b=e.target.closest('[data-draw]');if(!b||b.disabled)return;perform({type:'draw',source:b.dataset.draw==='deck'?'deck':Number(b.dataset.draw)});});
  $('play-card').onclick=()=>{if(selected!==null)perform({type:'play',id:selected});};
  $('discard-card').onclick=()=>{if(selected!==null)perform({type:'discard',id:selected});};
  $('reveal-hand').onclick=()=>{if(!state||!covered||state.roundOver)return;covered=false;say('내 손패를 확인하세요.');render();};
  $('hide-hand').onclick=()=>{if(options.mode!=='local'||!state)return;covered=true;selected=null;say('손패를 가렸습니다.');render();};
  $('undo').onclick=()=>{if(!human()||state.phase!=='draw'||!undoState)return;cancel();state=undoState;undoState=null;selected=null;say('새 카드를 뽑기 전으로 돌아왔습니다.');render();};
  $('hint').onclick=()=>{
    if(options.mode==='practice'){const d=M.detail(puzzle.cards);say(`숫자 합 ${d.sum}, 비용 ${d.cost}, 투자 배수 ${d.multiplier}입니다. ${d.count}장이므로 보너스는 ${d.bonus}점이며 마지막에 더합니다.`);return;}
    if(!human())return;
    const a=M.choose(M.observation(state),'hard');
    say(a.type==='draw'?a.source==='deck'?'덱에서 새 카드를 가져오는 선택을 생각해 보세요.':`${M.SUITS[a.source].name} 버림 더미의 맨 위 카드가 내 탐험에 도움이 되는지 살펴보세요.`:`${M.label(a.id)} ${a.type==='play'?'놓기':'버리기'}를 검토해 보세요. 더 낮은 수를 먼저 쓸 수 있는지와 탐험 비용을 함께 확인하세요. 이 힌트는 최적 선택을 보장하지 않습니다.`);
  };
  $('answer-form').addEventListener('submit',e=>{
    e.preventDefault();if(practiceSolved)return;
    const raw=$('answer').value.trim().replace('−','-');
    if(!/^[+-]?\d+$/.test(raw)){say('정수로 입력해 주세요. 음수에는 − 부호를 붙입니다.');return;}
    attempts++;practiceSolved=Number(raw)===puzzle.answer;if(practiceSolved)solved++;
    say(`${practiceSolved?'맞았습니다!':'다시 계산해 보세요.'} ${formula(puzzle.cards)}. 보너스는 배수를 곱한 뒤 더합니다.`);renderPractice();
  });
  $('next-practice').onclick=newPractice;
  $('settings').onclick=()=>{cancel();covered=true;selected=null;undoState=null;$('hand').replaceChildren();$('game').hidden=true;$('setup').hidden=false;};
  $('restart').onclick=()=>{if(!state&&!puzzle||confirm('진행 중인 탐험을 끝내고 새로 시작할까요?'))start();};
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancel();if(state&&options.mode==='local'&&!state.roundOver){covered=true;selected=null;render();}}
    else if(!$('game').hidden)scheduleAI();
  });
  window.addEventListener('pagehide',cancel);
  window.addEventListener('pageshow',()=>{if(state&&!$('game').hidden)scheduleAI();});
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('../../sw.js').catch(()=>{});
  setupChange();
})();

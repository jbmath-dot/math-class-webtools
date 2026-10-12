/* Shared classroom controls. No account, network service or hidden AI information. */
(function () {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.BoardgameUI = {escape, mount(config) {
    const root = document.getElementById('app');
    root.innerHTML = `<header><a class="brand" href="../../index.html#category=games">JB <span>MATH</span></a><nav><a href="../boardgame-library/index.html">보드게임 목록</a>${config.legacy ? `<a href="${config.legacy}">기존 학급용 화면 ↗</a>` : ''}</nav></header><main><section class="intro"><div><p class="eyebrow">JB MATH / BOARD GAME LAB</p><h1>${config.title}</h1><p class="lead">${config.intro}</p></div><div class="lesson"><span>교실에서 이어지는 놀이</span><strong>${config.topic}</strong><small>연습 · AI · 같은 기기 2인</small></div></section><section class="panel" id="setup"><h2>어떻게 즐길까요?</h2><form id="setup-form"><fieldset class="modes"><legend class="sr-only">플레이 모드</legend><label><input type="radio" name="mode" value="practice"><span><b>01 / 연습</b><small>힌트와 설명으로 익히기</small></span></label><label><input type="radio" name="mode" value="ai" checked><span><b>02 / AI 대결</b><small>난이도를 고르고 도전</small></span></label><label><input type="radio" name="mode" value="local"><span><b>03 / 2인 대결</b><small>같은 화면에서 번갈아</small></span></label></fieldset><div class="settings"><label id="ai-field">AI 난이도<select id="difficulty"><option value="easy">쉬움</option><option value="normal" selected>보통</option><option value="hard">어려움</option></select></label><label id="level-field" hidden>연습 단계<select id="level"><option value="1">1단계 · 기초</option><option value="2">2단계 · 연결</option><option value="3">3단계 · 도전</option></select></label><label id="first-field">먼저 시작<select id="first"><option value="0">플레이어 1 (나)</option><option value="1">플레이어 2 (AI)</option></select></label><button class="primary" type="submit">게임 시작 →</button></div><p class="muted">${config.modeNote}</p></form></section><section id="play" hidden><div class="toolbar"><span id="badge"></span><div><button id="undo">되돌리기</button><button id="settings">모드 바꾸기</button><button id="restart">새 게임</button></div></div><div class="turn" role="status" aria-live="polite"><span id="turn-label"></span><h2 id="turn-title"></h2></div><div id="game-content"></div><div class="panel tools"><button id="hint">힌트 보기</button><button class="primary" id="next" hidden>다음 연습 →</button><p id="feedback" role="status" aria-live="polite"></p></div></section><details class="panel rules"><summary>게임 방법과 수업용 규칙</summary>${config.rules}</details><section class="teaching"><h2>수학으로 설명해 보세요.</h2><p>${config.learning}</p></section></main><footer>${config.credit}</footer>`;
    const $ = id => document.getElementById(id);
    let state, options, history = [], timer, generation = 0, feedback = '';
    const name = p => options.mode === 'ai' ? (p === 0 ? '나' : 'AI') : `플레이어 ${p + 1}`;
    const locked = () => !state || state.done || (options.mode === 'ai' && state.turn === 1);
    const cancel = () => { clearTimeout(timer); generation++; };
    const message = text => { feedback = text; $('feedback').textContent = text; };
    function paint() {
      const v = config.view(state, {options, name, escape, locked:locked()});
      $('game-content').innerHTML = v.html;
      $('turn-label').textContent = state.done ? '완료' : options.mode === 'practice' ? 'PRACTICE' : `${name(state.turn)} 차례`;
      $('turn-title').textContent = v.title;
      $('feedback').textContent = feedback || v.help || '';
      $('undo').disabled = history.length === 0;
      $('hint').disabled = locked();
      $('next').hidden = options.mode !== 'practice' || !state.done;
    }
    function schedule() {
      if (options.mode !== 'ai' || state.turn !== 1 || state.done) return;
      const token = generation;
      timer = setTimeout(() => {
        if (token !== generation) return;
        try {
          const action = config.ai(state, options.difficulty);
          const result = config.act(state, action, options);
          state = result.state; feedback = result.message || '';
          paint(); schedule();
        } catch (error) { message('AI가 선택을 완료하지 못했습니다. 되돌리기 또는 새 게임을 눌러 주세요.'); console.error(error); }
      }, config.aiDelay || 700);
    }
    function start() {
      cancel(); history = []; feedback = '';
      state = config.create(options); $('setup').hidden = true; $('play').hidden = false;
      $('badge').textContent = options.mode === 'practice' ? `연습 ${options.level}단계` : options.mode === 'local' ? '같은 기기 2인' : `AI · ${{easy:'쉬움',normal:'보통',hard:'어려움'}[options.difficulty]}`;
      paint(); schedule();
    }
    $('setup-form').addEventListener('change', () => {
      const mode = new FormData($('setup-form')).get('mode');
      $('ai-field').hidden = mode !== 'ai'; $('level-field').hidden = mode !== 'practice'; $('first-field').hidden = mode === 'practice';
    });
    $('setup-form').addEventListener('submit', e => {
      e.preventDefault(); options = {mode:new FormData(e.target).get('mode'), difficulty:$('difficulty').value, level:Number($('level').value), first:Number($('first').value)}; start();
    });
    $('game-content').addEventListener('click', e => {
      const button = e.target.closest('[data-action]'); if (!button || button.disabled || locked()) return;
      try {
        const action = JSON.parse(button.dataset.action);
        const old = structuredClone(state), result = config.act(state, action, options);
        if (result.changed !== false) history.push(old);
        state = result.state; feedback = result.message || ''; paint(); schedule();
      } catch (error) { message('선택을 다시 확인해 주세요.'); console.error(error); }
    });
    $('hint').onclick = () => {if (!locked()) message(config.hint(state, options));};
    $('undo').onclick = () => { if (!history.length) return; cancel(); state = history.pop(); feedback = '선택 전으로 돌아왔습니다. 다른 전략을 생각해 보세요.'; paint(); };
    $('settings').onclick = () => {cancel(); $('play').hidden = true; $('setup').hidden = false;};
    $('restart').onclick = start; $('next').onclick = start;
    window.addEventListener('pagehide', cancel);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('../../sw.js').catch(()=>{});
  }};
})();

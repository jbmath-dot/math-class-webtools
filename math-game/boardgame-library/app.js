(function(){
 'use strict';
 const games=window.BOARDGAME_CATALOG,$=id=>document.getElementById(id);
 const domains={number:'수와 연산',relation:'변화와 관계',geometry:'도형과 측정',chance:'자료와 가능성',reasoning:'공통 추론'};
 const statuses={ready:'새로 구현 · 플레이 가능',related:'관련 기존 활동',planned:'제작 예정'};
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let grade='all';
 function render(){
  const domain=$('domain-filter').value,status=$('status-filter').value,query=$('search').value.trim().toLocaleLowerCase();
  const filtered=games.filter(g=>(grade==='all'||g.grades.includes(grade))&&(domain==='all'||g.domains.includes(domain))&&(status==='all'||g.status===status)&&(!query||[g.name,g.english,g.core,g.connection,g.activity,...g.standards].join(' ').toLocaleLowerCase().includes(query)));
  $('result-count').textContent=`전체 ${games.length}종 중 ${filtered.length}종 · 학년은 수업 권장 배치`;
  $('empty').hidden=filtered.length>0;
  $('games').innerHTML=filtered.map(g=>`<article class="game-card ${g.status}" id="game-${g.id}"><div class="card-top"><span class="game-mark" aria-hidden="true">${esc(g.mark)}</span><span class="status ${g.status}">${statuses[g.status]}</span></div><p class="card-subtitle">${esc(g.english)}</p><h3>${esc(g.name)}</h3><div class="card-tags">${g.grades.map(x=>`<span>${x==='common'?'공통':'중'+x}</span>`).join('')}${g.domains.map(x=>`<span>${domains[x]}</span>`).join('')}</div><p class="core">${esc(g.core)}</p><p class="connection">${esc(g.connection)}</p><details><summary>수업 질문 · 성취기준 · 구현 방식</summary><div class="card-details"><h4>수업에서 던질 질문</h4><p>${esc(g.activity)}</p><h4>연결 성취기준</h4><ul>${g.standards.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h4>온라인 구현 방식</h4><p>${esc(g.adaptation)}</p><h4>출시·규칙 확인 자료</h4><ul class="source-list">${g.sources.map(([title,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a></li>`).join('')}</ul></div></details><div class="card-footer"><span class="phase">${g.phase}차 확장 ${g.status==='ready'?'· 첫 구현':''}</span>${g.href?`<a class="card-link" href="${esc(g.href)}" ${g.href.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''} aria-label="${esc(g.name+' '+g.linkText)}">${esc(g.linkText)}${g.status==='ready'?' →':''}</a>`:'<span class="coming-soon">제작 후 열립니다</span>'}</div></article>`).join('');
 }
 $('grade-filters').addEventListener('click',event=>{const button=event.target.closest('[data-grade]');if(!button)return;grade=button.dataset.grade;document.querySelectorAll('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
 $('domain-filter').addEventListener('change',render);$('status-filter').addEventListener('change',render);$('search').addEventListener('input',render);
 $('reset').addEventListener('click',()=>{grade='all';$('domain-filter').value='all';$('status-filter').value='all';$('search').value='';document.querySelectorAll('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.grade==='all')));render();});
 render();
})();

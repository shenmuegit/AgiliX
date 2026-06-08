/* 共享侧栏注入 —— 各界面只需 <div id="side" data-active="board"></div> */
(function(){
  // 当前团队的项目组合（小团队常并行 3–4 个）
  const PROJECTS = [
    {k:'search', name:'搜索平台', glyph:'搜', color:'var(--accent)', sprint:'S24 · 搜索体验重构', cur:true},
    {k:'data',   name:'数据看板', glyph:'数', color:'#3f6f6a', sprint:'S12 · 指标自助配置'},
    {k:'api',    name:'开放平台', glyph:'开', color:'#7d6a8f', sprint:'S07 · 鉴权重构'},
    {k:'mobile', name:'移动端 App', glyph:'移', color:'#9a6a4a', sprint:'S19 · 离线缓存'},
  ];
  const NAV = [
    {sec:'', items:[
      {k:'team', t:'团队工作台', n:'', href:'screen-team.html', svg:'<path d="M4 17l4-4 4 3 8-9"/><path d="M4 20h16"/><circle cx="8" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="7" r="1.5" fill="currentColor" stroke="none"/>'},
      {k:'overview', t:'项目总览', n:'4', href:'screen-projects.html', svg:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
      {k:'docs', t:'文档', n:'28', href:'screen-docs.html', svg:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 11h6M9 15h6M9 19h4"/>'},
    ]},
    {sec:'搜索平台 · S24', items:[
      {k:'board',  t:'看板',      n:'32', href:'screen-kanban.html', svg:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>'},
      {k:'ledger', t:'需求 & 缺陷', n:'58', href:'screen-ledger.html', svg:'<path d="M4 6h16M4 12h16M4 18h10"/>'},
      {k:'stats',  t:'迭代统计',   n:'', href:'screen-stats.html', svg:'<path d="M4 19V5M4 19h16M8 16V9M13 16V6M18 16v-4"/>'},
      {k:'standup',t:'每日站会',   n:'', href:'screen-standup.html', svg:'<circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5"/>'},
    ]},
    {sec:'团队', items:[
      {k:'load',  t:'成员负载', n:'', href:'screen-workload.html', svg:'<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="7" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="1.4" fill="currentColor" stroke="none"/>'},
      {k:'gantt', t:'排期甘特', n:'', href:'screen-gantt.html', svg:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>'},
    ]},
    {sec:'飞书', items:[
      {k:'bot',     t:'群机器人', n:'',  svg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'},
      {k:'query',   t:'查询命令', n:'',  svg:'<path d="M4 6h16M4 12h10M4 18h7"/><path d="M16 16l2 2 3-4"/>'},
    ]},
  ];
  function render(el){
    const active = el.dataset.active||'board';
    const cur = PROJECTS.find(p=>p.cur);
    const secs = NAV.map(s=>`
      <div class="side-sec">
        ${s.sec?`<div class="side-sec-t">${s.sec}</div>`:''}
        ${s.items.map(i=>`
          <${i.href?'a':'div'} class="nav-i ${i.k===active?'on':''}" ${i.href?`href="${i.href}"`:''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${i.svg}</svg>
            <span>${i.t}</span>${i.n?`<span class="nav-count">${i.n}</span>`:''}
          </${i.href?'a':'div'}>`).join('')}
      </div>`).join('');
    el.outerHTML = `
    <aside class="side">
      <div class="side-head">
        <div class="brandmark">汇</div>
        <div class="brand-tt"><b>研发台账</b><span>4 个项目 · 8 人</span></div>
      </div>
      <div class="proj-switch" title="切换项目">
        <div class="proj-glyph" style="background:${cur.color}">${cur.glyph}</div>
        <div class="proj-tt"><span class="label">当前项目</span><b>${cur.name}</b></div>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px"><path d="M8 9l4 4 4-4M8 15l4-4 4 4" opacity=".55"/></svg>
      </div>
      <div class="side-scroll">${secs}</div>
      <div class="side-team">
        <div class="side-team-h"><div class="side-sec-t" style="padding:0">在线 · 6</div></div>
        <div class="facepile">
          <div class="av av-lin">林</div><div class="av av-chen">陈</div>
          <div class="av av-gao">高</div><div class="av av-su">苏</div>
          <div class="av av-han">韩</div><div class="more">+3</div>
        </div>
      </div>
    </aside>`;
  }
  document.querySelectorAll('#side,[data-side]').forEach(render);
})();

/* 读取 URL 参数应用主题/布局/质感 —— 用于画布里同一文件演示多变体 */
(function(){
  const q = new URLSearchParams(location.search);
  const root = document.documentElement;
  const theme = q.get('theme');
  if(theme==='ink' || theme==='kraft') document.body.classList.add('theme-'+theme);
  const r = q.get('r');                       // 圆角档位 sharp / soft
  if(r==='sharp'){root.style.setProperty('--r-card','0px');root.style.setProperty('--r-chip','0px');}
  if(r==='soft'){root.style.setProperty('--r-card','10px');root.style.setProperty('--r-chip','8px');}
  // 质感（阴影强弱）
  const tex = q.get('tex');
  if(tex==='flat'){root.style.setProperty('--shadow-card','none');}
  if(tex==='raised'){root.style.setProperty('--shadow-card','0 1px 2px rgba(33,29,24,.06),0 4px 12px rgba(33,29,24,.06)');}
  // 侧栏收起
  if(q.get('side')==='collapsed'){const a=document.querySelector('.app');if(a)a.classList.add('collapsed');}
  document.addEventListener('DOMContentLoaded',()=>{if(q.get('side')==='collapsed'){const a=document.querySelector('.app');if(a)a.classList.add('collapsed');}});
})();

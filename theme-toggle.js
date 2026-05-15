function applyTheme(theme){
  document.body.classList.toggle('light-theme', theme === 'light');
  const text = document.getElementById('themeToggleText');
  if(text) text.textContent = theme === 'light' ? 'Light' : 'Dark';
}

function initThemeToggle(){
  const button = document.getElementById('themeToggle');
  if(!button || button.dataset.bound) return;

  const savedTheme = localStorage.getItem('dashboardTheme') || 'dark';
  applyTheme(savedTheme);

  button.dataset.bound = '1';
  button.addEventListener('click', function(){
    const isLight = document.body.classList.contains('light-theme');
    const nextTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('dashboardTheme', nextTheme);
    applyTheme(nextTheme);
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initThemeToggle);
}else{
  initThemeToggle();
}

setTimeout(initThemeToggle, 1000);

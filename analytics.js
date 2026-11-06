// Basic consent mode: no Google request is made until analytics is accepted.
if (location.hostname === 'tentboy.orportraits.com' && !location.pathname.startsWith('/admin')) {
  const key = 'tentboy-analytics-consent-v1';
  const maxAge = 180 * 24 * 60 * 60 * 1000;
  let loaded = false;
  let choice = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Date.now() - saved.time < maxAge && ['accepted', 'declined'].includes(saved.choice)) choice = saved.choice;
  } catch {}
  window.dataLayer = window.dataLayer || [];
  // Queue consent before configuration or measurement commands.
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
  function accept() {
    gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', 'G-CETQYEJ9XJ', {allow_google_signals:false, allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-CETQYEJ9XJ';
    document.head.append(script);
  }
  const banner = document.createElement('section');
  banner.className = 'analytics-consent';
  banner.setAttribute('aria-label', 'Analytics preferences');
  const copy = document.createElement('p');
  copy.textContent = 'May we use Google Analytics to understand visits and clicks on our gear and guide links? Accept allows analytics cookies and sends usage data to Google. Declining keeps optional analytics off.';
  const buttons = document.createElement('div');
  function save(value) {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({choice:value,time:Date.now()})); } catch {}
    if (value === 'accepted') accept();
    banner.hidden = true;
    if (value === 'declined' && loaded) {
      gtag('consent', 'update', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
      // Clear GA cookies, then unload all third-party scripts by reloading.
      for (const item of document.cookie.split(';')) {
        const name = item.split('=')[0].trim();
        if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) continue;
        for (const domain of ['', '; domain=tentboy.orportraits.com', '; domain=.orportraits.com']) document.cookie = `${name}=; max-age=0; path=/${domain}`;
      }
      location.reload();
    }
  }
  for (const [label,value] of [['Accept analytics','accepted'],['Decline analytics','declined']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.onclick = () => save(value);
    buttons.append(button);
  }
  const details = document.createElement('a');
  details.href = 'https://policies.google.com/technologies/partner-sites';
  details.target = '_blank'; details.rel = 'noopener noreferrer';
  details.textContent = 'How Google uses data';
  banner.append(copy, buttons, details);
  banner.hidden = choice !== null;
  document.body.append(banner);
  const preferences = document.createElement('button');
  preferences.type = 'button'; preferences.className = 'analytics-preferences';
  preferences.textContent = 'Analytics preferences';
  preferences.onclick = () => { banner.hidden = false; buttons.querySelector('button').focus(); };
  document.querySelector('footer').append(preferences);
  if (choice === 'accepted') accept();
}



async function refresh() {
  const { proxy, lastProxyError } = await chrome.storage.local.get({
    proxy: { scheme: '', host: '', port: '', user: '', pass: '' },
    lastProxyError: '',
  });

  const cs = document.getElementById('cookieStatus');
  cs.textContent = 'pinned ✓';
  cs.className = 'ok';

  const ps = document.getElementById('proxyStatus');
  if (proxy.host && proxy.port) {
    ps.textContent = proxy.scheme.toUpperCase() + ' ' + proxy.host + ':' + proxy.port;
    ps.className = 'ok';
  } else {
    ps.textContent = 'off (direct)';
    ps.className = 'dim';
  }

  const err = document.getElementById('proxyErr');
  err.textContent = lastProxyError ? '⚠ ' + lastProxyError : '';
}

document.getElementById('fixNow').addEventListener('click', async () => {
  const btn = document.getElementById('fixNow');
  btn.disabled = true;
  btn.textContent = 'Applying…';
  const r = await chrome.runtime.sendMessage({ type: 'applyAll' });
  btn.textContent = r && r.ok === r.total ? 'Done ✓ (' + r.ok + ' cookies)' : 'Partial: ' + (r ? r.ok : '?') + '/' + (r ? r.total : '?');
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Re-apply cookies now'; }, 1500);
});

document.getElementById('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());

refresh();

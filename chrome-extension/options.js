const els = {
  scheme: document.getElementById('scheme'),
  host: document.getElementById('host'),
  port: document.getElementById('port'),
  user: document.getElementById('user'),
  pass: document.getElementById('pass'),
  msg: document.getElementById('msg'),
};

function msg(text, isErr) {
  els.msg.textContent = text;
  els.msg.style.color = isErr ? '#ff7b72' : '#5dd39e';
  setTimeout(() => (els.msg.textContent = ''), 4000);
}

async function load() {
  const { proxy } = await chrome.storage.local.get({
    proxy: { scheme: 'http', host: '', port: '', user: '', pass: '' },
  });
  els.scheme.value = proxy.scheme || 'http';
  els.host.value = proxy.host || '';
  els.port.value = proxy.port || '';
  els.user.value = proxy.user || '';
  els.pass.value = proxy.pass || '';
}

document.getElementById('save').addEventListener('click', async () => {
  const host = els.host.value.trim();
  const port = els.port.value.trim();

  if (!host || !port) {
    msg('Host and port are required.', true);
    return;
  }
  if (!/^[\w.-]+$/.test(host)) {
    msg('Host looks invalid (letters, digits, dots, dashes only).', true);
    return;
  }
  if (!/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) {
    msg('Port must be a number between 1 and 65535.', true);
    return;
  }

  await chrome.storage.local.set({
    proxy: {
      scheme: els.scheme.value,
      host: host,
      port: port,
      user: els.user.value.trim(),
      pass: els.pass.value,
    },
  });
  await chrome.runtime.sendMessage({ type: 'applyProxy' });
  msg('Saved. DMM traffic now routes through ' + host + ':' + port + ' — reload the DMM tab.');
});

document.getElementById('disable').addEventListener('click', async () => {
  const { proxy } = await chrome.storage.local.get({ proxy: {} });
  await chrome.storage.local.set({ proxy: { ...proxy, host: '', port: '' } });
  await chrome.runtime.sendMessage({ type: 'applyProxy' });
  els.host.value = '';
  els.port.value = '';
  msg('Proxy off — browsing direct. Cookies still pinned.');
});

load();

// GachaWiki Play Helper - Firefox background (event page).
// Firefox port: cookie pinning identical to the Chromium build; the proxy
// uses Firefox's proxy.onRequest API instead of chrome.proxy settings.

const DOMAINS = ['.dmm.com', '.dmm.co.jp'];
const PATHS = ['/', '/netgame/', '/netgame_s/'];
const WATCHED = new Set(['ckcy', 'cklg', 'age_check_done']);
const COOKIE_TTL_DAYS = 30;
const DEFAULT_PROXY = { scheme: '', host: '', port: '', user: '', pass: '' };

const api = typeof browser !== 'undefined' ? browser : chrome;

function desiredValue(name) {
  return name === 'cklg' ? 'welcome' : '1';
}

function isDmmCookie(cookie) {
  if (!WATCHED.has(cookie.name)) return false;
  const dom = cookie.domain || '';
  return DOMAINS.some((d) => dom === d || dom === d.slice(1) || dom.endsWith(d));
}

function setCookie(c) {
  const host = c.domain.replace(/^\./, '');
  return new Promise((resolve) => {
    api.cookies.set(
      {
        url: 'https://' + host + c.path,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expirationDate: Math.floor(Date.now() / 1000) + COOKIE_TTL_DAYS * 86400,
      },
      (res) => resolve(!!res)
    );
  });
}

async function applyAllCookies() {
  let ok = 0;
  let total = 0;
  const jobs = [];
  for (const domain of DOMAINS) {
    for (const path of PATHS) {
      for (const name of ['ckcy', 'cklg']) {
        jobs.push({ name, value: desiredValue(name), domain, path });
      }
    }
    jobs.push({ name: 'age_check_done', value: '1', domain, path: '/' });
  }
  for (const j of jobs) {
    total++;
    if (await setCookie(j)) ok++;
  }
  return { ok, total };
}

api.cookies.onChanged.addListener((evt) => {
  const c = evt.cookie;
  if (!isDmmCookie(c)) return;
  const want = desiredValue(c.name);
  if (c.value === want && !evt.removed) return;
  const domain = c.domain && c.domain.startsWith('.') ? c.domain : '.' + c.domain.replace(/^\./, '');
  setTimeout(() => {
    setCookie({ name: c.name, value: want, domain, path: c.path || '/' });
  }, 200);
});

// ---------- proxy (Firefox proxy.onRequest - only DMM URLs are proxied) ----------

let proxyCfg = { ...DEFAULT_PROXY };

async function loadCfg() {
  const { proxy } = await api.storage.local.get({ proxy: DEFAULT_PROXY });
  proxyCfg = proxy || DEFAULT_PROXY;
}

loadCfg();
api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.proxy) loadCfg();
});

if (api.proxy && api.proxy.onRequest) {
  api.proxy.onRequest.addListener(
    (req) => {
      if (proxyCfg.host && proxyCfg.port) {
        return {
          type: proxyCfg.scheme === 'socks5' ? 'socks' : 'http',
          host: proxyCfg.host,
          port: parseInt(proxyCfg.port, 10),
        };
      }
      return { type: 'direct' };
    },
    { urls: ['*://*.dmm.com/*', '*://*.dmm.co.jp/*'] },
    ['requestHeaders']
  );
}

// Answer the proxy's login prompt with the saved credentials (proxy auth only).
api.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!callback) return;
    if (details.isProxy && (proxyCfg.user || proxyCfg.pass)) {
      callback({ authCredentials: { username: proxyCfg.user || '', password: proxyCfg.pass || '' } });
    } else {
      callback();
    }
  },
  { urls: ['*://*.dmm.com/*', '*://*.dmm.co.jp/*'] },
  ['blocking']
);

api.runtime.onInstalled.addListener(async (details) => {
  await applyAllCookies();
  if (details.reason === 'install') {
    api.runtime.openOptionsPage();
  }
});

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'applyAll') {
    applyAllCookies().then(sendResponse);
    return true;
  }
  if (msg && msg.type === 'applyProxy') {
    loadCfg().then(() => sendResponse({ ok: true }));
    return true;
  }
});

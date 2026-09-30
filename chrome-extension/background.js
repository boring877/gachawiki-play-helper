// DMM Region Fix — background service worker.
//
// 1) Pins DMM/FANZA region cookies to the "Japan" values. If DMM overwrites
//    or deletes them (which is what knocks the old cookie trick out), the
//    onChanged listener restores them ~instantly.
// 2) Optionally routes ONLY dmm.com / dmm.co.jp through a Japan proxy you
//    configure on the options page. Everything else stays DIRECT.

const DOMAINS = ['.dmm.com', '.dmm.co.jp'];
const PATHS = ['/', '/netgame/', '/netgame_s/'];
const WATCHED = new Set(['ckcy', 'cklg', 'age_check_done']);
const COOKIE_TTL_DAYS = 30;

const DEFAULT_PROXY = { scheme: '', host: '', port: '', user: '', pass: '' };

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
    chrome.cookies.set(
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

// (Re)writes every region cookie on both domain families.
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

// The heart of the extension: the moment any watched cookie changes to a
// wrong value (DMM re-stamps ckcy from your IP) or gets deleted, put it
// back. Our own writes always carry the correct value, so they fall through
// the early-return and cannot loop.
chrome.cookies.onChanged.addListener((evt) => {
  const c = evt.cookie;
  if (!isDmmCookie(c)) return;
  const want = desiredValue(c.name);
  if (c.value === want && !evt.removed) return;
  const domain = c.domain && c.domain.startsWith('.') ? c.domain : '.' + c.domain.replace(/^\./, '');
  setTimeout(() => {
    setCookie({ name: c.name, value: want, domain, path: c.path || '/' });
  }, 200);
});

// ---------- Optional Japan proxy (DMM traffic only) ----------

async function getProxyCfg() {
  const { proxy } = await chrome.storage.local.get({ proxy: DEFAULT_PROXY });
  return proxy || DEFAULT_PROXY;
}

function buildPac(cfg) {
  const type = cfg.scheme === 'socks5' ? 'SOCKS5' : 'PROXY';
  return (
    'function FindProxyForURL(url, host) {\n' +
    '  if (dnsDomainIs(host, ".dmm.com") || dnsDomainIs(host, ".dmm.co.jp")) {\n' +
    '    return "' + type + ' ' + cfg.host + ':' + cfg.port + '";\n' +
    '  }\n' +
    '  return "DIRECT";\n' +
    '}\n'
  );
}

async function applyProxy() {
  const cfg = await getProxyCfg();
  const { proxyAppliedByUs } = await chrome.storage.local.get({ proxyAppliedByUs: false });
  if (cfg.host && cfg.port) {
    await new Promise((res) =>
      chrome.proxy.settings.set(
        {
          value: { mode: 'pac_script', pacScript: { data: buildPac(cfg), mandatory: false } },
          scope: 'regular',
        },
        res
      )
    );
    await chrome.storage.local.set({ proxyAppliedByUs: true, lastProxyError: '' });
  } else if (proxyAppliedByUs) {
    // Only touch proxy settings if we were the ones who changed them.
    await new Promise((res) =>
      chrome.proxy.settings.set({ value: { mode: 'system' }, scope: 'regular' }, res)
    );
    await chrome.storage.local.set({ proxyAppliedByUs: false });
  }
}

// Answer the proxy's 407 with the credentials from the options page.
// Only ever for proxy auth (isProxy), never for website logins.
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!callback) return;
    if (details.isProxy) {
      getProxyCfg().then((cfg) => {
        if (cfg.user || cfg.pass) {
          callback({ authCredentials: { username: cfg.user || '', password: cfg.pass || '' } });
        } else {
          callback();
        }
      });
    } else {
      callback();
    }
  },
  { urls: ['*://*.dmm.com/*', '*://*.dmm.co.jp/*'] },
  ['asyncBlocking']
);

chrome.proxy.onProxyError.addListener((err) => {
  chrome.storage.local.set({ lastProxyError: String((err && err.details) || err || 'proxy error') });
});

// ---------- Lifecycle ----------

chrome.runtime.onInstalled.addListener(async (details) => {
  await applyAllCookies();
  await applyProxy();
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await applyAllCookies();
  await applyProxy();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'applyAll') {
    applyAllCookies().then(sendResponse);
    return true; // async response
  }
  if (msg && msg.type === 'applyProxy') {
    applyProxy().then(() => sendResponse({ ok: true }));
    return true;
  }
});

/**
 * BARCHI ARZ v2 — Cloudflare Worker (بدون سایت، تک‌فایل)
 * ------------------------------------------------------
 * کارهای نسخه قبلی (همه حفظ شده):
 *  - ذخیره نرخ‌ها/تاریخچه/آمار روزانه در KV
 *  - پست خودکار کانال با هر تغییر + عکس نمودار + پین
 *  - ربات: نرخ بازار، نرخ تکی، نمودار، کریپتو، طلا، آمار، تبدیل ارز
 *  - پنل مدیر فقط برای @CNN399
 *
 * امکانات جدید:
 *  1) هشدار قیمت شخصی:  /alert USD > 72   (پیام خصوصی هنگام رسیدن به قیمت)
 *  2) گزارش روزانه خودکار کانال (باز/بالا/پایین/بسته) در ساعت دلخواه
 *  3) فیلتر نرخ پرت (جلوگیری از پست نرخ اشتباه هنگام خراب شدن پارس منبع)
 *  4) بازار ایران (به تومان) داخل ربات
 *  5) تبدیل معکوس:  5000 AFN USD
 *  6) اختلاف نرخ کابل و هرات در نرخ تکی
 *  7) ارسال همگانی ایمن:  /broadcast متن   (صف‌بندی؛ هر اجرای کرون ۳۰ نفر)
 *  8) تاریخچه جدا برای هر بازار (کم‌حجم‌تر و سریع‌تر)، کش کریپتو در KV
 *  9) شمارش درست کاربران بیش از ۱۰۰۰ نفر، حذف خودکار کاربرانی که ربات را بلاک کرده‌اند
 * 10) ضد اسپم ساده، تلاش مجدد برای دریافت نرخ
 *
 * Bindings:  KV (KV Namespace)
 * Secrets:   TG_BOT_TOKEN ، WEBHOOK_SECRET
 * Cron:      هر ۱ یا ۲ دقیقه  (* * * * *)
 * بعد از Deploy یک‌بار باز کن:  https://YOUR-WORKER/setup?key=WEBHOOK_SECRET
 */

const TG_CHANNEL = '@af_arz';
const BOT_USERNAME = 'af_arz_bot';
const ADMIN_USERNAME = 'cnn399';
const KABUL_OFFSET_MIN = 270;
const BROADCAST_PER_TICK = 30;
const MAX_ALERTS_PER_USER = 5;

const MARKETS = {
  kabul: { fa: 'بازار کابل', sub: 'سرای شهزاده' },
  herat: { fa: 'بازار هرات', sub: 'خراسان مارکت' }
};

const currencies = [
  { code: 'USD', fa: 'دالر آمریکا', cc: 'us' },
  { code: 'EUR', fa: 'یورو', cc: 'eu' },
  { code: 'GBP', fa: 'پوند انگلیس', cc: 'gb' },
  { code: 'IRR', fa: 'ریال ایران', cc: 'ir', unit: 1e6 },
  { code: 'PKR', fa: 'روپیه پاکستان', cc: 'pk', unit: 1000 },
  { code: 'SAR', fa: 'ریال سعودی', cc: 'sa' },
  { code: 'AED', fa: 'درهم امارات', cc: 'ae' },
  { code: 'CHF', fa: 'فرانک سوئیس', cc: 'ch' },
  { code: 'AUD', fa: 'دالر استرالیا', cc: 'au' },
  { code: 'CAD', fa: 'دالر کانادا', cc: 'ca' },
  { code: 'RUB', fa: 'روبل روسیه', cc: 'ru' },
  { code: 'DKK', fa: 'کرون دانمارک', cc: 'dk' },
  { code: 'SEK', fa: 'کرون سوئد', cc: 'se' },
  { code: 'NOK', fa: 'کرون ناروژ', cc: 'no' },
  { code: 'TRY', fa: 'لیر ترکیه', cc: 'tr' },
  { code: 'CNY', fa: 'یوان چین', cc: 'cn' },
  { code: 'KWD', fa: 'دینار کویت', cc: 'kw' },
  { code: 'QAR', fa: 'ریال قطر', cc: 'qa' },
  { code: 'BHD', fa: 'دینار بحرین', cc: 'bh' },
  { code: 'JPY', fa: 'ین ژاپن', cc: 'jp', unit: 1000 }
];

const iranCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'CNY', 'JPY', 'TRY', 'RUB', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'AFN', 'PKR', 'INR', 'IQD', 'DKK', 'SEK', 'NOK', 'NZD', 'SGD', 'HKD', 'MYR', 'THB', 'GEL', 'AZN', 'AMD', 'KGS', 'KRW', 'OMR', 'BRL', 'ARS', 'SYP', 'TJS', 'TMT'];
const IRAN_SHOW = ['USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD', 'AUD', 'CNY', 'AFN', 'PKR'];

const GOLD_PATTERNS = [
  ['coin', /سکه امامی/],
  ['melted', /آب[\s‌]?شده/],
  ['silver', /نقره/]
];
const GOLD_FA = { coin: 'سکه امامی', melted: 'طلای آب‌شده', silver: 'نقره' };
const GOLD_EN = { coin: 'IMAMI COIN', melted: 'GOLD', silver: 'SILVER' };

const DEFAULT_CFG = {
  postOnChange: true,
  minPct: 0,
  cooldownMin: 5,
  pin: true,
  chartOnChange: true,
  chartCode: 'USD',
  chartMarket: 'kabul',
  chartDays: 7,
  chartTheme: 'dark',
  underline: true,
  quote: true,
  showGold: true,
  cryptoPost: true,
  cryptoEveryMin: 60,
  silent: true,
  dailyReport: true,
  dailyHour: 21,
  markets: ['kabul', 'herat'],
  codes: ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'TRY', 'PKR', 'IRR']
};

const NUM_CYCLES = {
  cooldownMin: [1, 5, 10, 30, 60],
  minPct: [0, 0.05, 0.1, 0.5, 1],
  cryptoEveryMin: [15, 30, 60, 120, 360],
  chartDays: [1, 7, 30],
  dailyHour: [18, 20, 21, 22, 23]
};
const BOOL_KEYS = ['postOnChange', 'pin', 'chartOnChange', 'cryptoPost', 'underline', 'quote', 'showGold', 'silent', 'dailyReport'];
const RANGE_FA = { 1: '۲۴ ساعت', 7: '۷ روز', 30: '۳۰ روز' };

// ============================================================
// ابزارها
// ============================================================
const FA_DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

function cleanNumber(v) {
  if (v == null) return NaN;
  const s = String(v).replace(/[۰-۹]/g, d => FA_DIGITS[d] || d).replace(/٫/g, '.').replace(/[٬,]/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(s);
}
function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('en-US', { maximumFractionDigits: x >= 100 ? 2 : 4 });
}
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function flagEmoji(cc) { return String(cc || '').toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0))); }
function curInfo(code) { return currencies.find(x => x.code === code) || { code, fa: code, cc: code === 'AFN' ? 'af' : '' }; }
function codeName(code) { return code.startsWith('g_') ? (GOLD_FA[code.slice(2)] || code) : curInfo(code).fa; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function kabulDateKey(ts = Date.now()) { return new Date(ts + KABUL_OFFSET_MIN * 60000).toISOString().slice(0, 10); }
function kabulHour(ts = Date.now()) { return Math.floor((((ts / 60000) + KABUL_OFFSET_MIN) % 1440) / 60); }
function faDate(ts) { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Kabul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts); }
function faTime(ts) { return new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Kabul', hour: '2-digit', minute: '2-digit', hour12: false }).format(ts); }
function stamp(ts) { return faDate(ts) + ' — ' + faTime(ts); }
function chartLabel(ts, days) {
  const o = days <= 1 ? { hour: '2-digit', minute: '2-digit', hour12: false } : { month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kabul', ...o }).format(ts);
}

async function kget(env, key, def = null) {
  try { const v = await env.KV.get(key, 'json'); return v ?? def; } catch (e) { return def; }
}
function kput(env, key, val, opt) { return env.KV.put(key, JSON.stringify(val), opt); }
async function getCfg(env) { return { ...DEFAULT_CFG, ...(await kget(env, 'cfg', {})) }; }

async function listAll(env, prefix, maxPages = 20) {
  const out = []; let cursor;
  for (let i = 0; i < maxPages; i++) {
    const r = await env.KV.list({ prefix, cursor });
    out.push(...r.keys);
    if (r.list_complete) break;
    cursor = r.cursor;
  }
  return out;
}

// ============================================================
// پارس منابع
// ============================================================
function detectUnit(line, currency) {
  if (currency.unit) return currency.unit;
  if (/میلیون/.test(line)) return 1e6;
  if (/۱٬۰۰۰|۱,۰۰۰|۱۰۰۰/.test(line)) return 1000;
  return 1;
}
function pickGold(line, cells) {
  for (const [key, pat] of GOLD_PATTERNS) {
    if (pat.test(line)) {
      const nums = cells.map(cleanNumber).filter(Number.isFinite);
      if (nums.length >= 2 && nums[0] > 0 && nums[1] > 0) return { key, buy: nums[0], sell: nums[1] };
    }
  }
  return null;
}
function parseJina(text) {
  const result = { kabul: {}, herat: {} };
  let market = null;
  for (const line of text.split(/\r?\n/)) {
    if (/بازار کابل/.test(line)) market = 'kabul';
    else if (/بازار هرات/.test(line)) market = 'herat';
    if (!market || !line.includes('|')) continue;
    const cells = line.split('|').map(x => x.trim());
    const first = cells.find(c => /\b[A-Z]{3}\b/.test(c)) || '';
    const m = first.match(/\b([A-Z]{3})\b/);
    if (m) {
      const code = m[1].toUpperCase();
      const currency = currencies.find(x => x.code === code);
      if (currency) {
        const nums = cells.filter(c => c !== first).map(cleanNumber).filter(Number.isFinite);
        if (nums.length >= 2 && nums[0] > 0 && nums[1] > 0) result[market][code] = { buy: nums[0], sell: nums[1], unit: detectUnit(line, currency) };
      }
    }
    if (/سکه|آب[\s‌]?شده|نقره/.test(line)) {
      const g = pickGold(line, cells);
      if (g) (result[market].gold ||= {})[g.key] = { buy: g.buy, sell: g.sell };
    }
  }
  return result;
}
function parseIran(text) {
  const out = {};
  let inCur = false, inGold = false;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/نرخ ارز|ارزهای خارجی|قیمت ارز/.test(trimmed) && !/دیجیتال|طلا|سکه/.test(trimmed)) { inCur = true; inGold = false; continue; }
    if (/طلا|سکه|نقره|آب[\s‌]?شده/.test(trimmed) && !/\|/.test(trimmed)) { inCur = false; inGold = true; continue; }
    if (inGold && /دیجیتال|ارز دیجیتال|کریپتو|بیت‌کوین|بیت کوین/.test(trimmed)) { inGold = false; continue; }
    if (!line.includes('|')) continue;
    const cells = line.split('|').map(x => x.trim());
    if (inCur) {
      const first = cells.find(c => /\b[A-Z]{3}\b/.test(c)) || '';
      const m = first.match(/\b([A-Z]{3})\b/);
      if (m) {
        const code = m[1].toUpperCase();
        if (iranCurrencies.includes(code)) {
          const nums = cells.filter(c => c !== first).map(cleanNumber).filter(Number.isFinite);
          if (nums.length >= 2 && nums[0] > 0 && nums[1] > 0) out[code] = { buy: nums[0], sell: nums[1], unit: 1 };
        }
      }
    }
    if (inGold || /سکه|آب[\s‌]?شده|نقره/.test(trimmed)) {
      const g = pickGold(trimmed, cells);
      if (g) (out.gold ||= {})[g.key] = { buy: g.buy, sell: g.sell };
    }
  }
  return out;
}

async function fetchRates() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const [rMain, rIran] = await Promise.all([
        fetch('https://r.jina.ai/https://arzcheck.com/', { headers: { Accept: 'text/plain' } }),
        fetch('https://r.jina.ai/https://arzcheck.com/iran', { headers: { Accept: 'text/plain' } })
      ]);
      if (!rMain.ok) throw new Error('HTTP ' + rMain.status);
      const parsed = parseJina(await rMain.text());
      if (!parsed.kabul.USD) throw new Error('ساختار نرخ‌ها قابل تشخیص نیست');
      const iran = rIran.ok ? parseIran(await rIran.text()) : {};
      return { kabul: parsed.kabul, herat: parsed.herat, iran, ts: Date.now() };
    } catch (err) {
      console.error('fetchRates attempt', attempt, err);
      if (attempt === 0) await sleep(800);
    }
  }
  return null;
}

// فیلتر نرخ پرت: اگر نرخی در کمتر از ۳ ساعت بیش از ۳۰٪ جهش کند، مقدار قبلی نگه داشته می‌شود
function sanitize(rates, prev) {
  if (!prev || rates.ts - prev.ts > 3 * 3600000) return rates;
  const bad = (a, b) => a && b && a.sell > 0 && Math.abs(b.sell / a.sell - 1) > 0.3;
  for (const m of ['kabul', 'herat']) {
    for (const [code, r] of Object.entries(rates[m] || {})) {
      if (code === 'gold') {
        for (const [k, g] of Object.entries(r)) if (bad(prev[m]?.gold?.[k], g)) r[k] = prev[m].gold[k];
      } else if (bad(prev[m]?.[code], r)) rates[m][code] = prev[m][code];
    }
  }
  return rates;
}

async function fetchCrypto() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,dogecoin,cardano,tron,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h';
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'barchi-arz-bot' } });
    if (!r.ok) throw new Error('Crypto HTTP ' + r.status);
    return await r.json();
  } catch (e) { console.error('fetchCrypto', e); return null; }
}
async function getCrypto(env) {
  const c = await kget(env, 'crypto:cache');
  if (c && Date.now() - c.ts < 120000) return c.data;
  const data = await fetchCrypto();
  if (data?.length) { await kput(env, 'crypto:cache', { ts: Date.now(), data }, { expirationTtl: 3600 }); return data; }
  return c?.data || null; // اگر API خطا داد، آخرین داده ذخیره‌شده
}
async function getRates(env) {
  let r = await kget(env, 'rates:latest');
  if (!r || Date.now() - r.ts > 15 * 60000) {
    const fresh = await fetchRates();
    if (fresh) { r = sanitize(fresh, r); await kput(env, 'rates:latest', r); }
  }
  return r;
}

// ============================================================
// تلگرام
// ============================================================
async function tg(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!j.ok) console.error('TG', method, JSON.stringify(j));
    return j;
  } catch (e) { console.error('TG fail', method, e); return { ok: false }; }
}
async function tgPhoto(env, method, fields, png) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  fd.append('photo', new Blob([png], { type: 'image/png' }), 'chart.png');
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.ok) console.error('TG', method, JSON.stringify(j));
    return j;
  } catch (e) { console.error('TG photo fail', e); return { ok: false }; }
}

// ============================================================
// ساخت متن‌ها
// ============================================================
function trend(cur, prev) {
  if (prev == null || cur === prev) return '';
  const d = cur - prev;
  return (d > 0 ? '  🟢▲ ' : '  🔴▼ ') + fmt(Math.abs(d));
}
function wrapQuote(t, cfg) { return cfg.quote ? `<blockquote>${t}</blockquote>` : t + '\n'; }

function rateLine(code, r, prev, cfg) {
  const c = curInfo(code);
  const tag = cfg.underline ? `<u>${code}</u>` : `<b>${code}</b>`;
  const unit = r.unit > 1 ? ` <i>(هر ${r.unit.toLocaleString('fa-IR')})</i>` : '';
  return wrapQuote(`${flagEmoji(c.cc)} ${tag} ${c.fa}${unit}\nخرید <b>${fmt(r.buy)}</b>  │  فروش <b>${fmt(r.sell)}</b>${trend(r.sell, prev?.sell)}`, cfg);
}
function goldLine(k, g, prev, cfg) {
  const tag = cfg.underline ? `<u>${GOLD_FA[k]}</u>` : `<b>${GOLD_FA[k]}</b>`;
  return wrapQuote(`🥇 ${tag}\nخرید <b>${fmt(g.buy)}</b>  │  فروش <b>${fmt(g.sell)}</b>${trend(g.sell, prev?.sell)}`, cfg);
}

function buildRatesPost(rates, old, cfg) {
  let t = '📊 <b>نرخ لحظه‌ای ارز — افغانستان</b>\n<i>همه نرخ‌ها به افغانی (AFN)</i>\n━━━━━━━━━━━━━━━━━━━━\n\n';
  for (const mkt of cfg.markets) {
    const d = rates[mkt]; if (!d) continue;
    const lines = cfg.codes.filter(c => d[c]).map(c => rateLine(c, d[c], old?.[mkt]?.[c], cfg));
    if (!lines.length) continue;
    t += `🏛 <b>${MARKETS[mkt].fa}</b> · <code>${MARKETS[mkt].sub}</code>\n${lines.join('')}\n`;
  }
  if (cfg.showGold && rates.kabul?.gold) {
    const lines = Object.keys(GOLD_FA).filter(k => rates.kabul.gold[k]).map(k => goldLine(k, rates.kabul.gold[k], old?.kabul?.gold?.[k], cfg));
    if (lines.length) t += `🥇 <b>طلا و نقره</b> · <code>بازار کابل</code>\n${lines.join('')}\n`;
  }
  t += `━━━━━━━━━━━━━━━━━━━━\n⏰ ${stamp(rates.ts)}\n📢 @af_arz\n🤖 @${BOT_USERNAME}`;
  return t;
}

function buildCryptoPost(crypto, rates, cfg) {
  const usd = rates?.kabul?.USD?.sell;
  let t = '₿ <b>قیمت لحظه‌ای ارزهای دیجیتال</b>\n<i>تغییرات بر اساس نوسانات ۲۴ ساعته</i>\n━━━━━━━━━━━━━━━━━━━━\n\n';
  for (const c of crypto.slice(0, 10)) {
    const ch = Number(c.price_change_percentage_24h || 0);
    const tag = cfg.underline ? `<u>${c.symbol.toUpperCase()}</u>` : `<b>${c.symbol.toUpperCase()}</b>`;
    const afn = usd ? `  │  <b>${fmt(c.current_price * usd)}</b> AFN` : '';
    t += wrapQuote(`${ch >= 0 ? '🟢' : '🔴'} ${tag}  ${ch >= 0 ? '+' : '−'}${Math.abs(ch).toFixed(2)}%\n<b>$${fmt(c.current_price)}</b>${afn}`, cfg);
  }
  t += `\n━━━━━━━━━━━━━━━━━━━━\n⏰ ${stamp(Date.now())}\n<i>قیمت افغانی بر پایه نرخ فروش دالر بازار کابل</i>\n📢 @af_arz · 🤖 @${BOT_USERNAME}`;
  return t;
}

function buildDailyPost(stats, cfg, ts) {
  let t = `🌙 <b>گزارش روزانه بازار</b>\n📅 ${faDate(ts)}\n<i>باز · بالاترین · پایین‌ترین · بسته (به افغانی)</i>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  let any = false;
  for (const m of cfg.markets) {
    const lines = [];
    for (const code of cfg.codes) {
      const s = stats[`${m}:${code}`];
      if (!s) continue;
      const pct = s.o ? (s.c - s.o) / s.o * 100 : 0;
      const c = curInfo(code);
      lines.push(wrapQuote(`${flagEmoji(c.cc)} <b>${code}</b>  ${pct > 0 ? '🟢▲ +' : pct < 0 ? '🔴▼ −' : '⚪️ '}${Math.abs(pct).toFixed(2)}%\nباز ${fmt(s.o)} │ بالا ${fmt(s.h)} │ پایین ${fmt(s.l)} │ بسته <b>${fmt(s.c)}</b>`, cfg));
    }
    if (lines.length) { any = true; t += `🏛 <b>${MARKETS[m].fa}</b>\n${lines.join('')}\n`; }
  }
  if (!any) return null;
  t += `━━━━━━━━━━━━━━━━━━━━\n📢 @af_arz · 🤖 @${BOT_USERNAME}`;
  return t;
}

// ============================================================
// نمودار — QuickChart
// ============================================================
async function renderChart({ code, sub, pts, theme, days }) {
  const values = pts.map(p => p[1]);
  const labels = pts.map(p => chartLabel(p[0], days));
  const first = values[0], last = values[values.length - 1];
  const pct = first ? (last - first) / first * 100 : 0;
  const up = last >= first, dark = theme !== 'light';
  const col = up ? (dark ? '#2fe0a5' : '#079669') : (dark ? '#ff6b81' : '#dc3d52');
  const bg = dark ? '#0a0f1c' : '#ffffff', tx = dark ? '#f8fafc' : '#111827', mu = dark ? '#8b99b3' : '#64748b';
  const title = [`${code}   ${fmt(last)}`, `${up ? '+' : ''}${pct.toFixed(2)}%   ·   ${sub}`];
  const chartJs = `{type:'line',data:{labels:${JSON.stringify(labels)},datasets:[{data:${JSON.stringify(values)},borderColor:'${col}',borderWidth:5,pointRadius:0,fill:true,lineTension:0.35,backgroundColor:getGradientFillHelper('vertical',['${col}99','${col}00'])}]},options:{legend:{display:false},title:{display:true,text:${JSON.stringify(title)},fontSize:34,fontColor:'${tx}',padding:18},layout:{padding:{left:20,right:30,top:10,bottom:10}},scales:{xAxes:[{gridLines:{display:false},ticks:{fontColor:'${mu}',maxTicksLimit:6,maxRotation:0,fontSize:20}}],yAxes:[{gridLines:{color:'rgba(148,163,184,0.15)',drawBorder:false},ticks:{fontColor:'${mu}',fontSize:20}}]}}}`;
  try {
    const r = await fetch('https://quickchart.io/chart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '2', backgroundColor: bg, width: 1000, height: 640, devicePixelRatio: 2, format: 'png', chart: chartJs })
    });
    if (!r.ok) throw new Error('quickchart ' + r.status);
    return await r.arrayBuffer();
  } catch (e) { console.error('renderChart', e); return null; }
}

function downsample(pts, max = 48) {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max), out = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

async function buildChart(env, cfg, mkt, code, days, histMap) {
  let pts, name, unit, sub, imgCode;
  if (mkt === 'x') {
    const cr = await getCrypto(env);
    const c = cr?.find(x => x.symbol.toUpperCase() === code);
    const sp = c?.sparkline_in_7d?.price;
    if (!sp || sp.length < 2) return null;
    const arr = days <= 1 ? sp.slice(-24) : sp;
    const now = Date.now();
    pts = arr.map((v, i) => [now - (arr.length - 1 - i) * 3600000, v]);
    name = c.name; unit = '$'; sub = (days <= 1 ? '24H' : '7D') + ' · Crypto'; imgCode = code;
  } else {
    const hist = histMap?.[mkt] || await kget(env, 'hist:' + mkt, {});
    const all = hist[code] || [];
    const since = Date.now() - days * 86400000;
    pts = all.filter(p => p[0] >= since);
    if (pts.length < 2 && all.length >= 2) pts = all.slice(-Math.min(all.length, 24));
    if (pts.length < 2) return null;
    name = codeName(code); unit = 'AFN';
    sub = (days <= 1 ? '24H' : days + 'D') + ' · ' + (mkt === 'kabul' ? 'Kabul' : 'Herat');
    imgCode = code.startsWith('g_') ? GOLD_EN[code.slice(2)] : code;
  }
  pts = downsample(pts);
  const png = await renderChart({ code: imgCode, sub, pts, theme: cfg.chartTheme, days });
  if (!png) return null;
  const first = pts[0][1], last = pts[pts.length - 1][1], diff = last - first, pct = first ? diff / first * 100 : 0;
  const where = mkt === 'x' ? 'ارز دیجیتال' : MARKETS[mkt].fa;
  const caption = `📈 <b>${esc(name)}</b> (${esc(code.replace('g_', ''))}) — ${where}\nقیمت فعلی: <b>${fmt(last)}</b> ${unit}\n${diff >= 0 ? '🟢▲' : '🔴▼'} تغییر ${RANGE_FA[days] || days + ' روز'}: <b>${fmt(Math.abs(diff))}</b> (${diff >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%)\n⏰ ${stamp(Date.now())}\n🤖 @${BOT_USERNAME}`;
  return { png, caption };
}

// ============================================================
// تاریخچه و آمار
// ============================================================
async function recordSeries(env, rates) {
  const now = rates.ts;
  const dk = kabulDateKey(now);
  const stats = await kget(env, 'stats:' + dk, {});
  const histMap = {};
  for (const m of ['kabul', 'herat', 'iran']) {
    const hist = await kget(env, 'hist:' + m, {});
    const add = (key, v) => {
      if (!Number.isFinite(v)) return;
      const a = hist[key] || (hist[key] = []);
      const last = a[a.length - 1];
      if (!last || last[1] !== v || now - last[0] > 3600000) { a.push([now, v]); if (a.length > 1000) a.splice(0, a.length - 1000); }
      if (m === 'iran') return;
      const sk = `${m}:${key}`, s = stats[sk];
      if (!s) stats[sk] = { o: v, h: v, l: v, c: v, n: 1 };
      else if (s.c !== v) { s.h = Math.max(s.h, v); s.l = Math.min(s.l, v); s.c = v; s.n++; }
    };
    for (const [code, r] of Object.entries(rates[m] || {})) {
      if (code === 'gold') { for (const [k, g] of Object.entries(r)) add('g_' + k, g.sell); }
      else add(code, r.sell);
    }
    await kput(env, 'hist:' + m, hist);
    histMap[m] = hist;
  }
  await kput(env, 'stats:' + dk, stats, { expirationTtl: 45 * 86400 });
  return histMap;
}

function ratesSig(r) {
  return JSON.stringify(['kabul', 'herat', 'iran'].map(m => Object.entries(r[m] || {}).sort().map(([k, v]) => k === 'gold' ? [k, Object.entries(v).sort()] : [k, v.buy, v.sell])));
}

function diffForPost(old, now, cfg) {
  if (!old) return ['init'];
  const out = [];
  const chk = (a, b, id) => {
    if (!a || !b) return;
    const dS = Math.abs(b.sell - a.sell), dB = Math.abs(b.buy - a.buy);
    if (!dS && !dB) return;
    const pct = a.sell ? dS / a.sell * 100 : 100;
    if (pct >= cfg.minPct) out.push(id);
  };
  for (const m of cfg.markets) {
    for (const c of cfg.codes) chk(old[m]?.[c], now[m]?.[c], m + c);
    if (cfg.showGold) for (const k of Object.keys(GOLD_FA)) chk(old[m]?.gold?.[k], now[m]?.gold?.[k], m + k);
  }
  return out;
}

// ============================================================
// کانال
// ============================================================
async function postRatesToChannel(env, cfg, rates, old, histMap) {
  if (cfg.chartOnChange) {
    const ch = await buildChart(env, cfg, cfg.chartMarket, cfg.chartCode, cfg.chartDays, histMap);
    if (ch) await tgPhoto(env, 'sendPhoto', { chat_id: TG_CHANNEL, caption: ch.caption, parse_mode: 'HTML', disable_notification: cfg.silent }, ch.png);
  }
  const res = await tg(env, 'sendMessage', {
    chat_id: TG_CHANNEL, text: buildRatesPost(rates, old, cfg), parse_mode: 'HTML',
    disable_web_page_preview: true, disable_notification: cfg.silent,
    reply_markup: { inline_keyboard: [[{ text: '📊 دریافت نرخ همین لحظه', url: `https://t.me/${BOT_USERNAME}` }]] }
  });
  if (res.ok && cfg.pin) {
    const oldPin = await kget(env, 'pin');
    if (oldPin?.id) await tg(env, 'unpinChatMessage', { chat_id: TG_CHANNEL, message_id: oldPin.id });
    await tg(env, 'pinChatMessage', { chat_id: TG_CHANNEL, message_id: res.result.message_id, disable_notification: true });
    await kput(env, 'pin', { id: res.result.message_id, t: Date.now() });
  }
  return res.ok;
}

async function postCryptoToChannel(env, cfg, rates) {
  const crypto = await getCrypto(env);
  if (!crypto?.length) return false;
  const res = await tg(env, 'sendMessage', {
    chat_id: TG_CHANNEL, text: buildCryptoPost(crypto, rates, cfg), parse_mode: 'HTML',
    disable_web_page_preview: true, disable_notification: cfg.silent,
    reply_markup: { inline_keyboard: [[{ text: '₿ نمودار ارز دیجیتال در ربات', url: `https://t.me/${BOT_USERNAME}` }]] }
  });
  if (res.ok) await kput(env, 'cposted', { ts: Date.now() });
  return res.ok;
}

async function postDaily(env, cfg, force = false) {
  const dk = kabulDateKey();
  if (!force && (await kget(env, 'daily:' + dk))) return false;
  const stats = await kget(env, 'stats:' + dk, {});
  const text = buildDailyPost(stats, cfg, Date.now());
  if (!text) return false;
  const res = await tg(env, 'sendMessage', { chat_id: TG_CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: true });
  if (res.ok) await kput(env, 'daily:' + dk, 1, { expirationTtl: 3 * 86400 });
  return res.ok;
}

// ============================================================
// هشدار قیمت  — alerts = { userId: [{m,c,op,v}] }
// ============================================================
async function checkAlerts(env, rates) {
  const all = await kget(env, 'alerts', {});
  const ids = Object.keys(all);
  if (!ids.length) return 0;
  let fired = 0, dirty = false;
  for (const uid of ids) {
    const keep = [];
    for (const a of all[uid]) {
      const r = rates[a.m]?.[a.c];
      const hit = r && (a.op === '>' ? r.sell >= a.v : r.sell <= a.v);
      if (hit && fired < 30) {
        fired++; dirty = true;
        await tg(env, 'sendMessage', {
          chat_id: uid, parse_mode: 'HTML',
          text: `🔔 <b>هشدار قیمت</b>\n${flagEmoji(curInfo(a.c).cc)} <b>${a.c}</b> در ${MARKETS[a.m].fa} به ${a.op === '>' ? 'بالاتر از' : 'پایین‌تر از'} <b>${fmt(a.v)}</b> رسید.\nنرخ فروش فعلی: <b>${fmt(r.sell)}</b> AFN\n⏰ ${stamp(rates.ts)}`
        });
      } else keep.push(a);
    }
    if (keep.length !== all[uid].length) { dirty = true; if (keep.length) all[uid] = keep; else delete all[uid]; }
  }
  if (dirty) await kput(env, 'alerts', all);
  return fired;
}

// ============================================================
// ارسال همگانی (صف‌بندی‌شده)
// ============================================================
async function processBroadcast(env) {
  const job = await kget(env, 'bc:job');
  if (!job) return;
  const r = await env.KV.list({ prefix: 'u:', limit: BROADCAST_PER_TICK, cursor: job.cursor || undefined });
  for (const k of r.keys) {
    const res = await tg(env, 'sendMessage', { chat_id: k.name.slice(2), text: job.text, parse_mode: 'HTML', disable_web_page_preview: true });
    if (res.ok) job.sent++;
    else {
      job.fail++;
      if (res.error_code === 403 || res.error_code === 400) await env.KV.delete(k.name); // ربات بلاک شده/چت نامعتبر
    }
    await sleep(40);
  }
  if (r.list_complete) {
    await env.KV.delete('bc:job');
    if (job.by) await tg(env, 'sendMessage', { chat_id: job.by, text: `✅ ارسال همگانی تمام شد.\nموفق: ${job.sent} · ناموفق: ${job.fail}` });
  } else {
    job.cursor = r.cursor;
    await kput(env, 'bc:job', job);
  }
}

// ============================================================
// چرخه اصلی (کرون)
// ============================================================
async function runCycle(env, { force = false } = {}) {
  const cfg = await getCfg(env);
  const prev = await kget(env, 'rates:latest');
  let rates = await fetchRates();
  if (!rates) { await processBroadcast(env); return { ok: false, error: 'fetch failed' }; }
  rates = sanitize(rates, prev);
  const now = Date.now();
  const changed = !prev || ratesSig(prev) !== ratesSig(rates);
  let histMap;
  if (changed || now - (prev?.ts || 0) > 10 * 60000) await kput(env, 'rates:latest', rates);
  if (changed) histMap = await recordSeries(env, rates);

  const posted = await kget(env, 'posted');
  const changes = diffForPost(posted?.rates, rates, cfg);
  const cooldownOk = !posted || now - posted.ts >= cfg.cooldownMin * 60000;
  let didPost = false;
  if (force || (cfg.postOnChange && changes.length && cooldownOk)) {
    didPost = await postRatesToChannel(env, cfg, rates, posted?.rates, histMap);
    if (didPost) await kput(env, 'posted', { ts: now, rates: { kabul: rates.kabul, herat: rates.herat } });
  }
  let didCrypto = false;
  if (cfg.cryptoPost) {
    const cp = await kget(env, 'cposted');
    if (force || !cp || now - cp.ts >= cfg.cryptoEveryMin * 60000) didCrypto = await postCryptoToChannel(env, cfg, rates);
  }
  let didDaily = false;
  if (cfg.dailyReport && (force ? false : kabulHour() >= cfg.dailyHour)) didDaily = await postDaily(env, cfg);
  let alerts = 0;
  if (changed) alerts = await checkAlerts(env, rates);
  await processBroadcast(env);
  return { ok: true, changed, changes: changes.length, didPost, didCrypto, didDaily, alerts };
}

// ============================================================
// ربات — کاربران
// ============================================================
async function isAdmin(env, from) {
  if (!from) return false;
  const stored = await kget(env, 'admin:id');
  if (stored) return String(stored) === String(from.id);
  if ((from.username || '').toLowerCase() === ADMIN_USERNAME) { await kput(env, 'admin:id', from.id); return true; }
  return false;
}

async function touchUser(env, from) {
  if (!from || from.is_bot) return;
  const key = 'u:' + from.id;
  const { metadata } = await env.KV.getWithMetadata(key, 'text');
  const now = Date.now();
  if (metadata && now - metadata.l < 6 * 3600000) return;
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 60);
  await env.KV.put(key, '1', { metadata: { n: name, u: from.username || '', f: metadata?.f || now, l: now } });
}

// ضد اسپم ساده (در حافظه همان isolate)
const lastHit = new Map();
function limited(id) {
  const now = Date.now(), t = lastHit.get(id) || 0;
  if (lastHit.size > 5000) lastHit.clear();
  lastHit.set(id, now);
  return now - t < 600;
}

// ============================================================
// ربات — صفحه‌ها
// ============================================================
const HOME_BTN = [{ text: '🏠 منوی اصلی', callback_data: 'home' }];
function grid(btns, per) { const rows = []; for (let i = 0; i < btns.length; i += per) rows.push(btns.slice(i, i + per)); return rows; }

function screenHome(admin, name) {
  const kb = [
    [{ text: '💵 نرخ بازار کابل', callback_data: 'mk:kabul' }, { text: '💵 نرخ بازار هرات', callback_data: 'mk:herat' }],
    [{ text: '🔎 نرخ تکی', callback_data: 'pk:s:kabul' }, { text: '📈 نمودار قیمت', callback_data: 'pk:c:kabul' }],
    [{ text: '₿ ارز دیجیتال', callback_data: 'cr' }, { text: '🥇 طلا و نقره', callback_data: 'gd' }],
    [{ text: '📊 آمار امروز', callback_data: 'st:kabul' }, { text: '🧮 تبدیل ارز', callback_data: 'cv' }],
    [{ text: '🇮🇷 بازار ایران', callback_data: 'ir' }, { text: '🔔 هشدار قیمت', callback_data: 'al' }]
  ];
  if (admin) kb.push([{ text: '⚙️ پنل مدیر', callback_data: 'ad' }]);
  return {
    text: `👋 سلام ${esc(name || '')}!\nبه ربات <b>برچی ارز</b> خوش آمدید.\n\nنرخ لحظه‌ای ارز بازار کابل و هرات (به افغانی)، نمودار، ارز دیجیتال و طلا را از منوی زیر ببینید.\n\n💡 نرخ تکی: <code>USD</code>\n💡 تبدیل به افغانی: <code>100 USD</code>\n💡 تبدیل از افغانی: <code>5000 AFN USD</code>\n💡 هشدار: <code>/alert USD &gt; 72</code>\n\n📢 کانال: @af_arz`,
    kb
  };
}

async function screenMarket(env, mkt) {
  const cfg = await getCfg(env), rates = await getRates(env);
  const d = rates?.[mkt];
  if (!d) return { text: '⚠️ نرخ‌ها هنوز دریافت نشده؛ کمی بعد دوباره تلاش کنید.', kb: [HOME_BTN] };
  const lines = currencies.filter(c => d[c.code]).map(c => rateLine(c.code, d[c.code], null, cfg)).join('');
  const other = mkt === 'kabul' ? 'herat' : 'kabul';
  return {
    text: `🏛 <b>${MARKETS[mkt].fa}</b> · <code>${MARKETS[mkt].sub}</code>\n<i>نرخ‌ها به افغانی</i>\n\n${lines}\n⏰ ${stamp(rates.ts)}`,
    kb: [
      [{ text: '🔄 تازه‌سازی', callback_data: 'mk:' + mkt }, { text: `🔁 ${MARKETS[other].fa}`, callback_data: 'mk:' + other }],
      [{ text: '🔎 نرخ تکی', callback_data: 'pk:s:' + mkt }, { text: '📈 نمودار', callback_data: 'pk:c:' + mkt }],
      HOME_BTN
    ]
  };
}

async function screenIran(env) {
  const cfg = await getCfg(env), rates = await getRates(env);
  const d = rates?.iran || {};
  const lines = IRAN_SHOW.filter(c => d[c]).map(c => wrapQuote(`${flagEmoji(curInfo(c).cc)} <b>${c}</b>\nخرید <b>${fmt(d[c].buy)}</b>  │  فروش <b>${fmt(d[c].sell)}</b>`, cfg)).join('');
  let gold = '';
  if (d.gold) gold = '\n🥇 <b>طلا و سکه</b>\n' + Object.keys(GOLD_FA).filter(k => d.gold[k]).map(k => goldLine(k, d.gold[k], null, cfg)).join('');
  if (!lines && !gold) return { text: '⚠️ نرخ بازار ایران در دسترس نیست.', kb: [HOME_BTN] };
  return {
    text: `🇮🇷 <b>بازار ایران</b>\n<i>نرخ‌ها به تومان (طبق منبع)</i>\n\n${lines}${gold}\n⏰ ${stamp(rates.ts)}`,
    kb: [[{ text: '🔄 تازه‌سازی', callback_data: 'ir' }], HOME_BTN]
  };
}

async function screenPicker(env, act, mkt) {
  const rates = await getRates(env);
  const d = rates?.[mkt] || {};
  const btns = currencies.filter(c => d[c.code]).map(c => ({
    text: `${flagEmoji(c.cc)} ${c.code}`,
    callback_data: act === 'c' ? `c:${mkt}:${c.code}:7` : `s:${mkt}:${c.code}`
  }));
  const other = mkt === 'kabul' ? 'herat' : 'kabul';
  return {
    text: `${act === 'c' ? '📈 <b>نمودار قیمت</b>' : '🔎 <b>نرخ تکی</b>'} — ${MARKETS[mkt].fa}\nارز مورد نظر را انتخاب کنید:`,
    kb: [...grid(btns, 4), [{ text: `🔁 ${MARKETS[other].fa}`, callback_data: `pk:${act}:${other}` }], HOME_BTN]
  };
}

async function screenSingle(env, mkt, code) {
  const cfg = await getCfg(env), rates = await getRates(env);
  const r = rates?.[mkt]?.[code];
  if (!r) return { text: '⚠️ این ارز در این بازار موجود نیست.', kb: [HOME_BTN] };
  const stats = await kget(env, 'stats:' + kabulDateKey(), {});
  const s = stats[`${mkt}:${code}`];
  const other = mkt === 'kabul' ? 'herat' : 'kabul';
  let extra = '';
  if (s) {
    const diff = s.c - s.o, pct = s.o ? diff / s.o * 100 : 0;
    extra += `\n📅 <b>امروز</b>\nشروع: ${fmt(s.o)}  │  بالاترین: ${fmt(s.h)}  │  پایین‌ترین: ${fmt(s.l)}\n${diff >= 0 ? '🟢▲' : '🔴▼'} تغییر: ${fmt(Math.abs(diff))} (${diff >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(2)}%) · ${s.n} بار تغییر\n`;
  }
  const o = rates?.[other]?.[code];
  if (o) {
    const sp = r.sell - o.sell;
    extra += `\n⚖️ <b>اختلاف با ${MARKETS[other].fa}</b>: ${sp === 0 ? 'برابر' : (sp > 0 ? '+' : '−') + fmt(Math.abs(sp)) + ' (فروش)'}\n`;
  }
  return {
    text: `${rateLine(code, r, null, cfg)}🏛 ${MARKETS[mkt].fa} · ${MARKETS[mkt].sub}${extra}\n⏰ ${stamp(rates.ts)}`,
    kb: [
      [{ text: '📈 نمودار', callback_data: `c:${mkt}:${code}:7` }, { text: `🔁 ${MARKETS[other].fa}`, callback_data: `s:${other}:${code}` }],
      [{ text: '🔄 تازه‌سازی', callback_data: `s:${mkt}:${code}` }, { text: '🔎 ارز دیگر', callback_data: 'pk:s:' + mkt }],
      HOME_BTN
    ]
  };
}

async function screenGold(env) {
  const cfg = await getCfg(env), rates = await getRates(env);
  let t = '🥇 <b>طلا و نقره</b> — به افغانی\n\n';
  for (const mkt of ['kabul', 'herat']) {
    const g = rates?.[mkt]?.gold;
    if (!g) continue;
    t += `🏛 <b>${MARKETS[mkt].fa}</b>\n` + Object.keys(GOLD_FA).filter(k => g[k]).map(k => goldLine(k, g[k], null, cfg)).join('') + '\n';
  }
  if (t.length < 40) t += 'داده‌ای هنوز دریافت نشده.\n';
  t += `⏰ ${stamp(rates?.ts || Date.now())}`;
  return {
    text: t,
    kb: [
      [{ text: '📈 نمودار سکه', callback_data: 'c:kabul:g_coin:7' }, { text: '📈 نمودار طلا', callback_data: 'c:kabul:g_melted:7' }],
      [{ text: '🔄 تازه‌سازی', callback_data: 'gd' }], HOME_BTN
    ]
  };
}

async function screenCrypto(env) {
  const cfg = await getCfg(env), rates = await getRates(env);
  const crypto = await getCrypto(env);
  if (!crypto?.length) return { text: '⚠️ دریافت ارزهای دیجیتال انجام نشد؛ کمی بعد دوباره تلاش کنید.', kb: [HOME_BTN] };
  const btns = crypto.slice(0, 10).map(c => ({ text: '📈 ' + c.symbol.toUpperCase(), callback_data: `c:x:${c.symbol.toUpperCase()}:7` }));
  return { text: buildCryptoPost(crypto, rates, cfg), kb: [...grid(btns, 5), [{ text: '🔄 تازه‌سازی', callback_data: 'cr' }], HOME_BTN] };
}

async function screenStats(env, mkt) {
  const s = await kget(env, 'stats:' + kabulDateKey(), {});
  const rows = Object.entries(s).filter(([k]) => k.startsWith(mkt + ':') && !k.includes(':g_'))
    .map(([k, v]) => ({ code: k.split(':')[1], pct: v.o ? (v.c - v.o) / v.o * 100 : 0, v }));
  const line = x => `${flagEmoji(curInfo(x.code).cc)} <b>${x.code}</b>  ${x.pct >= 0 ? '+' : '−'}${Math.abs(x.pct).toFixed(2)}%  │  ${fmt(x.v.c)}  (${x.v.n} بار)`;
  const up = rows.filter(r => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5);
  const down = rows.filter(r => r.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5);
  const other = mkt === 'kabul' ? 'herat' : 'kabul';
  let t = `📊 <b>آمار امروز</b> — ${MARKETS[mkt].fa}\n📅 ${faDate(Date.now())}\n\n`;
  t += '🟢 <b>بیشترین رشد</b>\n' + (up.length ? up.map(line).join('\n') : 'تغییر مثبتی ثبت نشده') + '\n\n';
  t += '🔴 <b>بیشترین ریزش</b>\n' + (down.length ? down.map(line).join('\n') : 'تغییر منفی‌ای ثبت نشده') + '\n\n';
  t += `<i>تعداد ارزهای ثبت‌شده امروز: ${rows.length}</i>`;
  return { text: t, kb: [[{ text: `🔁 ${MARKETS[other].fa}`, callback_data: 'st:' + other }, { text: '🔄 تازه‌سازی', callback_data: 'st:' + mkt }], HOME_BTN] };
}

function screenConvert() {
  return {
    text: '🧮 <b>تبدیل ارز</b>\n\nبه افغانی:\n<code>100 USD</code>\n<code>5000 PKR</code>\n\nاز افغانی:\n<code>50000 AFN USD</code>\n\nنتیجه برای بازار کابل و هرات (خرید و فروش) نمایش داده می‌شود.',
    kb: [HOME_BTN]
  };
}

async function convertText(env, amount, code) {
  const rates = await getRates(env);
  let t = `🧮 <b>${fmt(amount)} ${code}</b> ${flagEmoji(curInfo(code).cc)}\n\n`; let any = false;
  for (const mkt of ['kabul', 'herat']) {
    const r = rates?.[mkt]?.[code]; if (!r) continue; any = true;
    const u = r.unit || 1;
    t += `🏛 <b>${MARKETS[mkt].fa}</b>\nبه نرخ خرید: <b>${fmt(amount * r.buy / u)}</b> AFN\nبه نرخ فروش: <b>${fmt(amount * r.sell / u)}</b> AFN\n\n`;
  }
  return any ? t + `⏰ ${stamp(rates.ts)}` : null;
}

async function convertFromAfn(env, amount, code) {
  const rates = await getRates(env);
  let t = `🧮 <b>${fmt(amount)} AFN</b> ${flagEmoji('af')} ← ${flagEmoji(curInfo(code).cc)} <b>${code}</b>\n\n`; let any = false;
  for (const mkt of ['kabul', 'herat']) {
    const r = rates?.[mkt]?.[code]; if (!r) continue; any = true;
    const u = r.unit || 1;
    t += `🏛 <b>${MARKETS[mkt].fa}</b>\nخرید ${code} (به نرخ فروش): <b>${fmt(amount / r.sell * u)}</b>\nفروش ${code} (به نرخ خرید): <b>${fmt(amount / r.buy * u)}</b>\n\n`;
  }
  return any ? t + `⏰ ${stamp(rates.ts)}` : null;
}

// ---------- هشدار (کاربر) ----------
async function screenAlerts(env, uid) {
  const all = await kget(env, 'alerts', {});
  const mine = all[uid] || [];
  let t = '🔔 <b>هشدار قیمت</b>\n\nوقتی نرخ فروش به عدد دلخواه برسد، پیام خصوصی می‌گیرید (هر هشدار یک‌بار فعال می‌شود).\n\n<code>/alert USD &gt; 72</code>\n<code>/alert EUR &lt; 80 herat</code>\n\n';
  t += mine.length ? '<b>هشدارهای شما:</b>\n' + mine.map((a, i) => `${i + 1}. ${a.c} ${a.op === '>' ? '≥' : '≤'} ${fmt(a.v)} · ${MARKETS[a.m].fa}`).join('\n') : '<i>هشدار فعالی ندارید.</i>';
  const kb = [];
  if (mine.length) kb.push([{ text: '🗑 حذف همه هشدارها', callback_data: 'al:clr' }]);
  kb.push(HOME_BTN);
  return { text: t, kb };
}

async function addAlert(env, uid, code, op, value, mkt) {
  const rates = await getRates(env);
  if (!rates?.[mkt]?.[code]) return '⚠️ این ارز در این بازار موجود نیست.';
  const all = await kget(env, 'alerts', {});
  const mine = all[uid] || [];
  if (mine.length >= MAX_ALERTS_PER_USER) return `⚠️ حداکثر ${MAX_ALERTS_PER_USER} هشدار مجاز است. از /alerts حذف کنید.`;
  mine.push({ m: mkt, c: code, op, v: value });
  all[uid] = mine;
  await kput(env, 'alerts', all);
  return `✅ هشدار ثبت شد: ${code} ${op === '>' ? '≥' : '≤'} ${fmt(value)} (${MARKETS[mkt].fa})\nنرخ فروش فعلی: ${fmt(rates[mkt][code].sell)}`;
}

// ---------- پنل مدیر ----------
async function screenAdmin(env) {
  const c = await getCfg(env);
  const t = (k, l) => ({ text: `${c[k] ? '✅' : '⬜'} ${l}`, callback_data: 'ad:t:' + k });
  const kb = [
    [t('postOnChange', 'پست با تغییر نرخ'), t('pin', 'پین آخرین پست')],
    [t('chartOnChange', 'عکس نمودار با پست'), t('cryptoPost', 'پست ارز دیجیتال')],
    [t('underline', 'خط زیر کد ارز'), t('quote', 'حالت نقل‌قول')],
    [t('showGold', 'طلا و نقره'), t('silent', 'بدون صدا')],
    [t('dailyReport', 'گزارش روزانه'), { text: `🕘 ساعت گزارش: ${c.dailyHour}`, callback_data: 'ad:n:dailyHour' }],
    [{ text: `⏱ فاصله پست: ${c.cooldownMin} دقیقه`, callback_data: 'ad:n:cooldownMin' }, { text: `📉 آستانه: ${c.minPct}%`, callback_data: 'ad:n:minPct' }],
    [{ text: `₿ کریپتو هر ${c.cryptoEveryMin} دقیقه`, callback_data: 'ad:n:cryptoEveryMin' }, { text: `📈 بازه: ${RANGE_FA[c.chartDays]}`, callback_data: 'ad:n:chartDays' }],
    [{ text: `🎨 ${c.chartTheme === 'dark' ? 'تیره' : 'روشن'}`, callback_data: 'ad:c:chartTheme' }, { text: `🏛 ${MARKETS[c.chartMarket].fa}`, callback_data: 'ad:c:chartMarket' }, { text: `💱 ${c.chartCode}`, callback_data: 'ad:c:chartCode' }],
    [{ text: '🧾 ارزهای پست کانال', callback_data: 'ad:cd' }],
    [{ text: '📤 ارسال نرخ', callback_data: 'ad:post' }, { text: '₿ ارسال کریپتو', callback_data: 'ad:cpost' }, { text: '🌙 گزارش روزانه', callback_data: 'ad:dpost' }],
    [{ text: '👥 کاربران', callback_data: 'ad:u:0' }, { text: '📊 وضعیت', callback_data: 'ad:s' }],
    HOME_BTN
  ];
  return { text: '⚙️ <b>پنل مدیر</b>\nتنظیمات پست کانال و ربات.\n\nدستور ارسال همگانی:\n<code>/broadcast متن پیام</code>\nلغو: <code>/broadcast_cancel</code>', kb };
}

async function screenCodes(env) {
  const c = await getCfg(env);
  const btns = currencies.map(x => ({ text: `${c.codes.includes(x.code) ? '✅' : '⬜'} ${x.code}`, callback_data: 'ad:cd:' + x.code }));
  return { text: '🧾 <b>ارزهای نمایش‌داده‌شده در پست کانال</b>\nروی هر ارز بزنید تا اضافه/حذف شود:', kb: [...grid(btns, 4), [{ text: '⬅️ بازگشت', callback_data: 'ad' }]] };
}

async function screenUsers(env, page) {
  const keys = await listAll(env, 'u:');
  const users = keys.map(k => ({ id: k.name.slice(2), ...(k.metadata || {}) })).sort((a, b) => (b.l || 0) - (a.l || 0));
  const per = 8, pages = Math.max(1, Math.ceil(users.length / per));
  page = Math.min(Math.max(0, page), pages - 1);
  const slice = users.slice(page * per, page * per + per);
  let t = `👥 <b>کاربران ربات</b> — کل: ${users.length}\nصفحه ${page + 1} از ${pages}\n\n`;
  slice.forEach((u, i) => {
    t += `${page * per + i + 1}. <b>${esc(u.n || 'بدون نام')}</b> ${u.u ? '@' + esc(u.u) : ''}\n🆔 <code>${u.id}</code>\n📅 ورود: ${u.f ? faDate(u.f) : '—'} · آخرین: ${u.l ? stamp(u.l) : '—'}\n\n`;
  });
  if (!slice.length) t += 'هنوز کاربری ثبت نشده.';
  const nav = [];
  if (page > 0) nav.push({ text: '◀️ قبلی', callback_data: 'ad:u:' + (page - 1) });
  if (page < pages - 1) nav.push({ text: 'بعدی ▶️', callback_data: 'ad:u:' + (page + 1) });
  return { text: t, kb: [...(nav.length ? [nav] : []), [{ text: '⬅️ بازگشت', callback_data: 'ad' }]] };
}

async function screenStatus(env) {
  const [posted, cposted, pin, rates, users, alerts, job] = await Promise.all([
    kget(env, 'posted'), kget(env, 'cposted'), kget(env, 'pin'), kget(env, 'rates:latest'),
    listAll(env, 'u:'), kget(env, 'alerts', {}), kget(env, 'bc:job')
  ]);
  const alertCount = Object.values(alerts).reduce((n, a) => n + a.length, 0);
  const t = `📊 <b>وضعیت سیستم</b>\n\n👥 کاربران: ${users.length}\n🔔 هشدار فعال: ${alertCount}\n💾 آخرین داده منبع: ${rates ? stamp(rates.ts) : '—'}\n📤 آخرین پست نرخ: ${posted ? stamp(posted.ts) : '—'}\n₿ آخرین پست کریپتو: ${cposted ? stamp(cposted.ts) : '—'}\n📌 پیام پین‌شده: ${pin ? '#' + pin.id : '—'}\n📣 ارسال همگانی: ${job ? `در جریان (${job.sent} ارسال شده)` : 'ندارد'}\n🏛 تعداد ارز کابل: ${Object.keys(rates?.kabul || {}).length} · هرات: ${Object.keys(rates?.herat || {}).length} · ایران: ${Object.keys(rates?.iran || {}).length}`;
  return { text: t, kb: [[{ text: '⬅️ بازگشت', callback_data: 'ad' }]] };
}

// ============================================================
// ربات — ارسال و روتر
// ============================================================
async function deliver(env, chatId, msg, scr) {
  const base = { text: scr.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: scr.kb } };
  if (msg && !msg.photo) {
    const r = await tg(env, 'editMessageText', { chat_id: chatId, message_id: msg.message_id, ...base });
    if (r.ok || /not modified/i.test(r.description || '')) return;
  }
  await tg(env, 'sendMessage', { chat_id: chatId, ...base });
}

async function sendChart(env, cb, mkt, code, days) {
  const cfg = await getCfg(env);
  const ch = await buildChart(env, cfg, mkt, code, days);
  const chatId = cb.message.chat.id;
  if (!ch) { await tg(env, 'sendMessage', { chat_id: chatId, text: '⚠️ داده کافی برای نمودار هنوز ذخیره نشده؛ چند دقیقه بعد دوباره تلاش کنید.' }); return; }
  const rangeBtns = (mkt === 'x' ? [1, 7] : [1, 7, 30]).map(d => ({ text: (d === days ? '✅ ' : '') + RANGE_FA[d], callback_data: `c:${mkt}:${code}:${d}` }));
  const kb = [rangeBtns, [mkt === 'x' ? { text: '₿ ارزهای دیجیتال', callback_data: 'cr' } : { text: '💵 نرخ تکی', callback_data: `s:${mkt}:${code}` }, { text: '🏠 منو', callback_data: 'home' }]];
  if (cb.message.photo) {
    const r = await tgPhoto(env, 'editMessageMedia', {
      chat_id: chatId, message_id: cb.message.message_id,
      media: { type: 'photo', media: 'attach://photo', caption: ch.caption, parse_mode: 'HTML' }, reply_markup: { inline_keyboard: kb }
    }, ch.png);
    if (r.ok || /not modified/i.test(r.description || '')) return;
  }
  await tgPhoto(env, 'sendPhoto', { chat_id: chatId, caption: ch.caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } }, ch.png);
}

async function onMessage(env, m) {
  if (m.chat.type !== 'private' || !m.from) return;
  if (limited(m.from.id)) return;
  await touchUser(env, m.from);
  const text = (m.text || '').trim().replace(/^(\/\w+)@\w+/, '$1');
  const admin = await isAdmin(env, m.from);
  const uid = String(m.from.id);
  const send = scr => deliver(env, m.chat.id, null, scr);
  const say = t => tg(env, 'sendMessage', { chat_id: m.chat.id, text: t, parse_mode: 'HTML' });

  if (/^\/(start|menu)/i.test(text)) return send(screenHome(admin, m.from.first_name));
  if (/^\/admin/i.test(text)) return admin ? send(await screenAdmin(env)) : send({ text: '⛔️ این بخش مخصوص مدیر است.', kb: [HOME_BTN] });
  if (/^\/rates/i.test(text)) return send(await screenMarket(env, 'kabul'));
  if (/^\/crypto/i.test(text)) return send(await screenCrypto(env));
  if (/^\/gold/i.test(text)) return send(await screenGold(env));
  if (/^\/stats/i.test(text)) return send(await screenStats(env, 'kabul'));
  if (/^\/convert/i.test(text)) return send(screenConvert());
  if (/^\/iran/i.test(text)) return send(await screenIran(env));

  // ارسال همگانی
  if (/^\/broadcast_cancel/i.test(text)) {
    if (!admin) return;
    await env.KV.delete('bc:job');
    return say('🛑 ارسال همگانی لغو شد.');
  }
  const bc = text.match(/^\/broadcast\s+([\s\S]+)/i);
  if (bc) {
    if (!admin) return;
    if (await kget(env, 'bc:job')) return say('⚠️ یک ارسال همگانی در جریان است. با /broadcast_cancel لغو کنید.');
    await kput(env, 'bc:job', { text: bc[1].slice(0, 3500), cursor: null, sent: 0, fail: 0, by: m.chat.id });
    return say('📣 ارسال همگانی در صف قرار گرفت و با هر اجرای کرون ادامه می‌یابد.');
  }

  // هشدار
  if (/^\/alerts/i.test(text)) return send(await screenAlerts(env, uid));
  const al = text.match(/^\/alert\s+([a-zA-Z]{3})\s*(>=?|<=?)\s*([\d.,٫٬۰-۹]+)\s*(kabul|herat)?$/i);
  if (al) {
    const v = cleanNumber(al[3]);
    if (!Number.isFinite(v) || v <= 0) return say('⚠️ عدد نامعتبر است.');
    return say(await addAlert(env, uid, al[1].toUpperCase(), al[2][0], v, (al[4] || 'kabul').toLowerCase()));
  }
  if (/^\/alert/i.test(text)) return say('مثال:\n<code>/alert USD &gt; 72</code>\n<code>/alert EUR &lt; 80 herat</code>');

  // تبدیل از افغانی
  const rev = text.match(/^([\d.,٫٬۰-۹]+)\s*AFN\s*(?:to\s*)?([a-zA-Z]{3})$/i);
  if (rev) {
    const amount = cleanNumber(rev[1]);
    const out = Number.isFinite(amount) ? await convertFromAfn(env, amount, rev[2].toUpperCase()) : null;
    return send({ text: out || '⚠️ این ارز پیدا نشد. مثال: <code>50000 AFN USD</code>', kb: [HOME_BTN] });
  }
  // تبدیل به افغانی
  const conv = text.match(/^([\d.,٫٬۰-۹]+)\s*([a-zA-Z]{3})$/);
  if (conv) {
    const amount = cleanNumber(conv[1]), code = conv[2].toUpperCase();
    const out = Number.isFinite(amount) ? await convertText(env, amount, code) : null;
    return send({ text: out || '⚠️ این ارز پیدا نشد. مثال: <code>100 USD</code>', kb: [HOME_BTN] });
  }
  const single = text.match(/^\/?([a-zA-Z]{3})$/);
  if (single) {
    const code = single[1].toUpperCase();
    const rates = await getRates(env);
    if (rates?.kabul?.[code]) return send(await screenSingle(env, 'kabul', code));
    if (rates?.herat?.[code]) return send(await screenSingle(env, 'herat', code));
  }
  return send(screenHome(admin, m.from.first_name));
}

function cycle(list, cur) { const i = list.indexOf(cur); return list[(i + 1) % list.length]; }

async function onAdminCallback(env, cb, parts) {
  const chatId = cb.message.chat.id, msg = cb.message;
  const cfg = await getCfg(env);
  const a = parts[1];
  const save = () => kput(env, 'cfg', cfg);
  const say = t => tg(env, 'sendMessage', { chat_id: chatId, text: t });

  if (a === 't' && BOOL_KEYS.includes(parts[2])) { cfg[parts[2]] = !cfg[parts[2]]; await save(); }
  else if (a === 'n' && NUM_CYCLES[parts[2]]) { cfg[parts[2]] = cycle(NUM_CYCLES[parts[2]], cfg[parts[2]]); await save(); }
  else if (a === 'c') {
    if (parts[2] === 'chartTheme') cfg.chartTheme = cycle(['dark', 'light'], cfg.chartTheme);
    else if (parts[2] === 'chartMarket') cfg.chartMarket = cycle(['kabul', 'herat'], cfg.chartMarket);
    else if (parts[2] === 'chartCode') cfg.chartCode = cycle(cfg.codes, cfg.chartCode);
    await save();
  }
  else if (a === 'cd') {
    if (parts[2]) {
      const code = parts[2];
      if (currencies.find(x => x.code === code)) {
        if (cfg.codes.includes(code)) { if (cfg.codes.length > 1) cfg.codes = cfg.codes.filter(c => c !== code); }
        else cfg.codes = currencies.map(x => x.code).filter(c => c === code || cfg.codes.includes(c));
        if (!cfg.codes.includes(cfg.chartCode)) cfg.chartCode = cfg.codes[0];
        await save();
      }
    }
    return deliver(env, chatId, msg, await screenCodes(env));
  }
  else if (a === 'u') return deliver(env, chatId, msg, await screenUsers(env, parseInt(parts[2]) || 0));
  else if (a === 's') return deliver(env, chatId, msg, await screenStatus(env));
  else if (a === 'post') {
    const rates = await fetchRates();
    if (!rates) return say('⚠️ دریافت نرخ از منبع ناموفق بود.');
    const posted = await kget(env, 'posted');
    const ok = await postRatesToChannel(env, cfg, rates, posted?.rates);
    if (ok) await kput(env, 'posted', { ts: Date.now(), rates: { kabul: rates.kabul, herat: rates.herat } });
    return say(ok ? '✅ نرخ‌ها به کانال ارسال شد.' : '❌ ارسال ناموفق بود (ربات باید ادمین کانال باشد).');
  }
  else if (a === 'cpost') {
    const ok = await postCryptoToChannel(env, cfg, await getRates(env));
    return say(ok ? '✅ ارز دیجیتال به کانال ارسال شد.' : '❌ ارسال ناموفق بود.');
  }
  else if (a === 'dpost') {
    const ok = await postDaily(env, cfg, true);
    return say(ok ? '✅ گزارش روزانه ارسال شد.' : '❌ داده‌ای برای گزارش امروز نیست یا ارسال ناموفق بود.');
  }
  return deliver(env, chatId, msg, await screenAdmin(env));
}

async function onCallback(env, cb) {
  if (!cb.message || !cb.from) { await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id }); return; }
  const parts = (cb.data || '').split(':');
  const admin = await isAdmin(env, cb.from);
  if (parts[0] === 'ad' && !admin) return tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'مخصوص مدیر', show_alert: true });
  await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  if (limited('cb' + cb.from.id)) return;
  await touchUser(env, cb.from);
  const chatId = cb.message.chat.id, msg = cb.message;
  const show = scr => deliver(env, chatId, msg, scr);

  switch (parts[0]) {
    case 'home': return show(screenHome(admin, cb.from.first_name));
    case 'mk': return show(await screenMarket(env, parts[1] === 'herat' ? 'herat' : 'kabul'));
    case 'ir': return show(await screenIran(env));
    case 'pk': return show(await screenPicker(env, parts[1], parts[2]));
    case 's': return show(await screenSingle(env, parts[1], parts[2]));
    case 'c': return sendChart(env, cb, parts[1], parts[2], parseInt(parts[3]) || 7);
    case 'cr': return show(await screenCrypto(env));
    case 'gd': return show(await screenGold(env));
    case 'st': return show(await screenStats(env, parts[1]));
    case 'cv': return show(screenConvert());
    case 'al': {
      const uid = String(cb.from.id);
      if (parts[1] === 'clr') {
        const all = await kget(env, 'alerts', {});
        delete all[uid];
        await kput(env, 'alerts', all);
      }
      return show(await screenAlerts(env, uid));
    }
    case 'ad': return onAdminCallback(env, cb, parts);
  }
}

async function handleUpdate(env, u) {
  try {
    if (u.channel_post?.pinned_message) {
      return tg(env, 'deleteMessage', { chat_id: u.channel_post.chat.id, message_id: u.channel_post.message_id });
    }
    if (u.message) return await onMessage(env, u.message);
    if (u.callback_query) return await onCallback(env, u.callback_query);
  } catch (e) { console.error('handleUpdate', e); }
}

// ============================================================
// Worker
// ============================================================
const json = (o, status = 200) => new Response(JSON.stringify(o, null, 2), { status, headers: { 'Content-Type': 'application/json; charset=UTF-8' } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/webhook' && request.method === 'POST') {
      if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const update = await request.json().catch(() => null);
      if (update) ctx.waitUntil(handleUpdate(env, update));
      return new Response('ok');
    }

    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const wh = await tg(env, 'setWebhook', {
        url: url.origin + '/webhook', secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query', 'channel_post'], drop_pending_updates: true
      });
      const cmds = await tg(env, 'setMyCommands', {
        commands: [
          { command: 'start', description: 'منوی اصلی' },
          { command: 'rates', description: 'نرخ بازار کابل' },
          { command: 'iran', description: 'بازار ایران' },
          { command: 'crypto', description: 'ارز دیجیتال' },
          { command: 'gold', description: 'طلا و نقره' },
          { command: 'stats', description: 'آمار امروز' },
          { command: 'convert', description: 'تبدیل ارز' },
          { command: 'alerts', description: 'هشدارهای قیمت من' }
        ]
      });
      return json({ webhook: wh, commands: cmds, kvBound: !!env.KV });
    }

    if (url.pathname === '/run') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      return json(await runCycle(env, { force: url.searchParams.get('force') === '1' }));
    }

    return new Response('Barchi Arz bot is running.', { status: 200 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCycle(env).then(r => console.log('cycle', JSON.stringify(r))));
  }
};

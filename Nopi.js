/**
 * AFGHAN ARZ — Cloudflare Worker (سایت + ربات + کانال)
 * ------------------------------------------------------
 * - سایت آنلاین روی آدرس Worker (/) و JSON در /api/rates
 * - ربات با نام "افغان ارز" و قابلیت ارسال عکس قیمت
 * - پنل مدیریت اختصاصی @CNN399
 * - پست خودکار کانال با هر تغییر نرخ
 * - KV Binding: ARZ_KV
 * - Secrets: TG_BOT_TOKEN, WEBHOOK_SECRET
 * - Cron: * * * * *
 */

const TG_CHANNEL = '@af_arz';
const BOT_USERNAME = 'af_arz_bot';
const BOT_NAME = 'افغان ارز';
const ADMIN_USERNAME = 'cnn399'; // فقط این ادمین است
const KABUL_OFFSET_MIN = 270;

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

const GOLD_FA = { coin: 'سکه امامی', melted: 'طلای آب‌شده', silver: 'نقره' };

const DEFAULT_CFG = {
  postOnChange: true,
  repostEveryMin: 20,
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
  repostEveryMin: [0, 10, 20, 30, 60],
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
  try { const v = await env.ARZ_KV.get(key, 'json'); return v ?? def; } catch (e) { return def; }
}
function kput(env, key, val, opt) { return env.ARZ_KV.put(key, JSON.stringify(val), opt); }
async function getCfg(env) { return { ...DEFAULT_CFG, ...(await kget(env, 'cfg', {})) }; }

async function listAll(env, prefix, maxPages = 20) {
  const out = []; let cursor;
  for (let i = 0; i < maxPages; i++) {
    const r = await env.ARZ_KV.list({ prefix, cursor });
    out.push(...r.keys);
    if (r.list_complete) break;
    cursor = r.cursor;
  }
  return out;
}

// ============================================================
// پارس نرخ‌ها
// ============================================================
function detectUnit(line, currency) {
  if (currency.unit) return currency.unit;
  if (/میلیون/.test(line)) return 1e6;
  if (/۱٬۰۰۰|۱,۰۰۰|۱۰۰۰/.test(line)) return 1000;
  return 1;
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
  }
  return result;
}

async function fetchRates() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('https://r.jina.ai/https://arzcheck.com/', { headers: { Accept: 'text/plain' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const parsed = parseJina(await r.text());
      if (!parsed.kabul.USD) throw new Error('ساختار نرخ‌ها قابل تشخیص نیست');
      return { kabul: parsed.kabul, herat: parsed.herat, ts: Date.now() };
    } catch (err) {
      if (attempt === 0) await sleep(800);
    }
  }
  return null;
}

async function getRates(env) {
  let r = await kget(env, 'rates:latest');
  if (!r || Date.now() - r.ts > 15 * 60000) {
    const fresh = await fetchRates();
    if (fresh) { r = fresh; await kput(env, 'rates:latest', r); }
  }
  return r;
}

// ============================================================
// تلگرام (هسته)
// ============================================================
async function tg(env, method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) { return { ok: false }; }
}
async function tgPhoto(env, method, fields, png) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  if (png) fd.append('photo', new Blob([png], { type: 'image/png' }), 'card.png');
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: 'POST', body: fd });
    return await r.json();
  } catch (e) { return { ok: false }; }
}

// ============================================================
// ساخت کارت قیمت (عکس + کپشن)
// ============================================================
async function buildRateCard(env, cfg, mkt, code) {
  const rates = await getRates(env);
  const r = rates?.[mkt]?.[code];
  if (!r) return null;

  const c = curInfo(code);
  const isGold = code.startsWith('g_');
  const name = isGold ? (GOLD_FA[code.slice(2)] || code) : c.fa;
  const unit = r.unit > 1 ? ` (هر ${r.unit.toLocaleString('fa-IR')})` : '';
  
  // داده‌های نمودار (ساده شده)
  const hist = await kget(env, 'hist:' + mkt, {});
  const all = hist[code] || [];
  const pts = all.slice(-24); // ۲۴ نقطه آخر
  const values = pts.map(p => p[1]);
  const labels = pts.map(p => chartLabel(p[0], 1));
  
  const last = values[values.length - 1] || r.sell;
  const first = values[0] || r.sell;
  const diff = last - first;
  const pct = first ? (diff / first * 100) : 0;
  const up = diff >= 0;
  const col = up ? '#2fe0a5' : '#ff6b81';
  const bg = '#0a0f1c';
  const tx = '#f8fafc';
  const mu = '#8b99b3';

  // ساخت نمودار با QuickChart
  const chartJs = `{type:'line',data:{labels:${JSON.stringify(labels)},datasets:[{data:${JSON.stringify(values)},borderColor:'${col}',borderWidth:6,pointRadius:0,fill:true,lineTension:0.4,backgroundColor:getGradientFillHelper('vertical',['${col}99','${col}00'])}]},options:{legend:{display:false},title:{display:true,text:['${name}','${fmt(r.sell)} AFN'],fontSize:48,fontColor:'${tx}',padding:20},layout:{padding:{left:40,right:40,top:20,bottom:20}},scales:{xAxes:[{gridLines:{display:false},ticks:{fontColor:'${mu}',maxTicksLimit:6,maxRotation:0,fontSize:24}}],yAxes:[{gridLines:{color:'rgba(148,163,184,0.15)',drawBorder:false},ticks:{fontColor:'${mu}',fontSize:24}}]}}}`;
  
  let png = null;
  try {
    const rq = await fetch('https://quickchart.io/chart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '2', backgroundColor: bg, width: 1200, height: 800, devicePixelRatio: 2, format: 'png', chart: chartJs })
    });
    if (rq.ok) png = await rq.arrayBuffer();
  } catch (e) {}

  const caption = `<b>${esc(name)}</b>${unit}
📍 ${MARKETS[mkt].fa}
🛒 خرید: <b>${fmt(r.buy)}</b> AFN
💰 فروش: <b>${fmt(r.sell)}</b> AFN
${up ? '🟢▲' : '🔴▼'} تغییر ۲۴ ساعت: <b>${fmt(Math.abs(diff))}</b> (${up ? '+' : '−'}${Math.abs(pct).toFixed(2)}%)
⏰ ${stamp(rates.ts)}
📢 @af_arz | 🤖 @${BOT_USERNAME}`;

  return { png, caption, code, mkt };
}

// ============================================================
// ارسال به کانال
// ============================================================
async function postToChannel(env, cfg, rates, old) {
  // ارسال کارت قیمت برای ارز اصلی (chartCode)
  const card = await buildRateCard(env, cfg, cfg.chartMarket, cfg.chartCode);
  if (card && card.png) {
    await tgPhoto(env, 'sendPhoto', {
      chat_id: TG_CHANNEL, caption: card.caption, parse_mode: 'HTML',
      disable_notification: cfg.silent
    }, card.png);
  }

  // ارسال متن نرخ‌ها (همان قبلی)
  let text = `📊 <b>نرخ لحظه‌ای ارز — افغانستان</b>\n<i>همه نرخ‌ها به افغانی (AFN)</i>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  for (const mkt of cfg.markets) {
    const d = rates[mkt]; if (!d) continue;
    const lines = cfg.codes.filter(c => d[c]).map(c => {
      const cur = curInfo(c);
      const p = old?.[mkt]?.[c];
      const t = p && p.sell !== d[c].sell ? (d[c].sell > p.sell ? ' 🟢▲' : ' 🔴▼') : '';
      return `<blockquote>${flagEmoji(cur.cc)} <u>${c}</u> ${cur.fa}\nخرید <b>${fmt(d[c].buy)}</b> | فروش <b>${fmt(d[c].sell)}</b>${t}</blockquote>`;
    }).join('');
    if (lines) text += `🏛 <b>${MARKETS[mkt].fa}</b>\n${lines}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━\n⏰ ${stamp(rates.ts)}\n📢 @af_arz | 🤖 @${BOT_USERNAME}`;

  const res = await tg(env, 'sendMessage', {
    chat_id: TG_CHANNEL, text, parse_mode: 'HTML',
    disable_web_page_preview: true, disable_notification: cfg.silent
  });

  if (res.ok && cfg.pin) {
    const oldPin = await kget(env, 'pin');
    if (oldPin?.id) await tg(env, 'unpinChatMessage', { chat_id: TG_CHANNEL, message_id: oldPin.id });
    await tg(env, 'pinChatMessage', { chat_id: TG_CHANNEL, message_id: res.result.message_id, disable_notification: true });
    await kput(env, 'pin', { id: res.result.message_id, t: Date.now() });
  }
  return res.ok;
}

// ============================================================
// چرخه اصلی
// ============================================================
async function runCycle(env, { force = false } = {}) {
  const cfg = await getCfg(env);
  const prev = await kget(env, 'rates:latest');
  let rates = await fetchRates();
  if (!rates) return { ok: false, error: 'fetch failed' };

  const changed = !prev || JSON.stringify(prev.kabul) !== JSON.stringify(rates.kabul) || JSON.stringify(prev.herat) !== JSON.stringify(rates.herat);
  
  if (changed || force) {
    await kput(env, 'rates:latest', rates);
    await postToChannel(env, cfg, rates, prev);
  }
  return { ok: true, changed };
}

// ============================================================
// ربات (هندلرها)
// ============================================================
async function isAdmin(env, from) {
  if (!from) return false;
  // فقط ادمین اصلی @CNN399
  return (from.username || '').toLowerCase() === ADMIN_USERNAME;
}

async function sendRateCardToUser(env, chatId, mkt, code, days = 7, editMsgId = null) {
  const cfg = await getCfg(env);
  const card = await buildRateCard(env, cfg, mkt, code);
  if (!card || !card.png) {
    return tg(env, 'sendMessage', { chat_id: chatId, text: '⚠️ داده کافی برای ساخت کارت وجود ندارد.' });
  }

  const rangeBtns = [1, 7, 30].map(d => ({
    text: (d === days ? '✅ ' : '') + RANGE_FA[d],
    callback_data: `c:${mkt}:${code}:${d}`
  }));
  
  const kb = [
    rangeBtns,
    [{ text: '🏠 منوی اصلی', callback_data: 'home' }]
  ];

  if (editMsgId) {
    // ویرایش پیام عکس (با استفاده از attach://photo)
    const r = await tgPhoto(env, 'editMessageMedia', {
      chat_id: chatId, message_id: editMsgId,
      media: { type: 'photo', media: 'attach://photo', caption: card.caption, parse_mode: 'HTML' },
      reply_markup: { inline_keyboard: kb }
    }, card.png);
    if (r.ok) return r;
  }

  // ارسال پیام جدید
  return tgPhoto(env, 'sendPhoto', {
    chat_id: chatId, caption: card.caption, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: kb }
  }, card.png);
}

async function handleUpdate(env, u) {
  try {
    if (u.message) {
      const msg = u.message;
      if (msg.chat.type !== 'private' || !msg.from) return;
      
      const text = (msg.text || '').trim();
      const chatId = msg.chat.id;
      const admin = await isAdmin(env, msg.from);

      if (text === '/start' || text === '/menu') {
        const kb = [
          [{ text: '💵 نرخ بازار کابل', callback_data: 'mk:kabul' }, { text: '💵 نرخ بازار هرات', callback_data: 'mk:herat' }],
          [{ text: '📈 نمودار و کارت قیمت', callback_data: 'pk:c:kabul' }],
          [{ text: '🔔 هشدار قیمت', callback_data: 'al' }]
        ];
        if (admin) kb.push([{ text: '⚙️ پنل مدیریت', callback_data: 'ad' }]);
        
        return tg(env, 'sendMessage', {
          chat_id: chatId,
          text: `👋 سلام ${msg.from.first_name}!\nبه ربات <b>${BOT_NAME}</b> خوش آمدید.\n\nاز منوی زیر نرخ‌ها و نمودارها را ببینید.\n\n📢 کانال: @af_arz`,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: kb }
        });
      }

      // دستور مستقیم ارسال کارت قیمت (مثال: /card USD)
      const cardCmd = text.match(/^\/card\s+([a-zA-Z]{3})$/i);
      if (cardCmd) {
        return sendRateCardToUser(env, chatId, 'kabul', cardCmd[1].toUpperCase());
      }

      // پنل ادمین
      if (text === '/admin' && admin) {
        const kb = [
          [{ text: '📤 ارسال نرخ به کانال', callback_data: 'ad:post' }],
          [{ text: '📈 ارسال کارت قیمت', callback_data: 'ad:card' }],
          [{ text: '👥 کاربران', callback_data: 'ad:users' }]
        ];
        return tg(env, 'sendMessage', { chat_id: chatId, text: '⚙️ پنل مدیریت افغان ارز', reply_markup: { inline_keyboard: kb } });
      }
    }

    if (u.callback_query) {
      const cb = u.callback_query;
      const data = cb.data || '';
      const parts = data.split(':');
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;

      // پاسخ به کلیک
      await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id });

      if (parts[0] === 'home') {
        const kb = [
          [{ text: '💵 نرخ بازار کابل', callback_data: 'mk:kabul' }, { text: '💵 نرخ بازار هرات', callback_data: 'mk:herat' }],
          [{ text: '📈 نمودار و کارت قیمت', callback_data: 'pk:c:kabul' }],
          [{ text: '🔔 هشدار قیمت', callback_data: 'al' }]
        ];
        if (await isAdmin(env, cb.from)) kb.push([{ text: '⚙️ پنل مدیریت', callback_data: 'ad' }]);
        
        // حذف پیام عکس و ارسال منوی متنی
        await tg(env, 'deleteMessage', { chat_id: chatId, message_id: msgId });
        return tg(env, 'sendMessage', {
          chat_id: chatId, text: 'منوی اصلی:', parse_mode: 'HTML',
          reply_markup: { inline_keyboard: kb }
        });
      }

      // انتخاب ارز برای کارت
      if (parts[0] === 'pk' && parts[1] === 'c') {
        const mkt = parts[2] || 'kabul';
        const rates = await getRates(env);
        const d = rates?.[mkt] || {};
        const btns = currencies.filter(c => d[c.code]).map(c => ({
          text: `${flagEmoji(c.cc)} ${c.code}`,
          callback_data: `c:${mkt}:${c.code}:7`
        }));
        // چیدمان ۴ تایی
        const rows = [];
        for (let i = 0; i < btns.length; i += 4) rows.push(btns.slice(i, i + 4));
        rows.push([{ text: '🏠 منو', callback_data: 'home' }]);
        
        return tg(env, 'editMessageText', {
          chat_id: chatId, message_id: msgId,
          text: '📈 ارز مورد نظر را برای مشاهده کارت قیمت انتخاب کنید:',
          reply_markup: { inline_keyboard: rows }
        });
      }

      // نمایش کارت قیمت (یا ویرایش)
      if (parts[0] === 'c') {
        const mkt = parts[1], code = parts[2], days = parseInt(parts[3]) || 7;
        if (cb.message.photo) {
          return sendRateCardToUser(env, chatId, mkt, code, days, msgId);
        } else {
          // اگر پیام متنی بود، اول حذفش کن یا ویرایشش کن به عکس (نمیشه، پس عکس جدید بفرست)
          await tg(env, 'deleteMessage', { chat_id: chatId, message_id: msgId });
          return sendRateCardToUser(env, chatId, mkt, code, days);
        }
      }

      // پنل ادمین
      if (parts[0] === 'ad' && await isAdmin(env, cb.from)) {
        if (parts[1] === 'post') {
          await tg(env, 'sendMessage', { chat_id: chatId, text: '⏳ در حال ارسال...' });
          const rates = await getRates(env);
          const ok = await postToChannel(env, await getCfg(env), rates, null);
          return tg(env, 'sendMessage', { chat_id: chatId, text: ok ? '✅ ارسال شد.' : '❌ خطا.' });
        }
        if (parts[1] === 'card') {
          return sendRateCardToUser(env, chatId, 'kabul', 'USD');
        }
      }
    }
  } catch (e) {
    console.error('handleUpdate', e);
  }
}

// ============================================================
// سایت و ورکر
// ============================================================
async function sitePage(env) {
  const rates = await getRates(env);
  const table = m => {
    const d = rates?.[m] || {};
    const rows = currencies.filter(c => d[c.code]).map(c =>
      `<tr><td>${flagEmoji(c.cc)} ${c.code}</td><td>${c.fa}</td><td>${fmt(d[c.code].buy)}</td><td>${fmt(d[c.code].sell)}</td></tr>`).join('');
    return `<h2>${MARKETS[m].fa}</h2><table><tr><th>ارز</th><th>نام</th><th>خرید</th><th>فروش</th></tr>${rows}</table>`;
  };
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60">
<title>${BOT_NAME}</title>
<style>body{background:#0a0f1c;color:#f8fafc;font-family:Tahoma;max-width:720px;margin:auto;padding:16px}h2{color:#2fe0a5}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #1e293b;text-align:center}th{color:#8b99b3}a{color:#2fe0a5}</style>
</head><body><h1>📊 ${BOT_NAME}</h1><p>آخرین به‌روزرسانی: ${rates ? stamp(rates.ts) : '—'}</p>
${table('kabul')}${table('herat')}
<p><a href="https://t.me/${TG_CHANNEL.slice(1)}">📢 کانال</a> | <a href="https://t.me/${BOT_USERNAME}">🤖 ربات</a></p></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
}

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
        url: url.origin + '/webhook', secret_token: env.WEBHOOK_SECRET, drop_pending_updates: true
      });
      return new Response(JSON.stringify({ webhook: wh, kvBound: !!env.ARZ_KV }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/run') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const r = await runCycle(env, { force: url.searchParams.get('force') === '1' });
      return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
    }

    return sitePage(env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCycle(env).then(r => console.log('cycle', r)));
  }
};

/**
 * BARCHI ARZ — Cloudflare Worker
 * 
 * راه‌اندازی:
 * 1. در داشبورد Cloudflare → Workers → Create Worker
 * 2. کد زیر را paste کنید
 * 3. در بخش Variables and Secrets → Add Secret:
 *    - Name: TG_BOT_TOKEN
 *    - Value: 8869982876:AAHg4qoi9HQvAJ4eUdNqJqLFi7X44DpMOXU
 * 4. Deploy کنید
 * 
 * Cron Trigger برای ارسال خودکار:
 * Workers → Triggers → Cron Triggers → Add Cron
 * */20 * * * *  (هر ۲۰ دقیقه)
 */

const TG_CHANNEL = '@af_arz';
const TG_BOT_USERNAME = 'af_arz_bot';

// ============================================
// داده‌های استاتیک ارزها
// ============================================
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

const iranCurrencies = [
  { code: 'USD', fa: 'دالر آمریکا', cc: 'us' },
  { code: 'EUR', fa: 'یورو', cc: 'eu' },
  { code: 'GBP', fa: 'پوند انگلیس', cc: 'gb' },
  { code: 'CHF', fa: 'فرانک سوئیس', cc: 'ch' },
  { code: 'CAD', fa: 'دالر کانادا', cc: 'ca' },
  { code: 'AUD', fa: 'دالر استرالیا', cc: 'au' },
  { code: 'CNY', fa: 'یوان چین', cc: 'cn' },
  { code: 'JPY', fa: 'ین ژاپن', cc: 'jp' },
  { code: 'TRY', fa: 'لیر ترکیه', cc: 'tr' },
  { code: 'RUB', fa: 'روبل روسیه', cc: 'ru' },
  { code: 'AED', fa: 'درهم امارات', cc: 'ae' },
  { code: 'SAR', fa: 'ریال سعودی', cc: 'sa' },
  { code: 'KWD', fa: 'دینار کویت', cc: 'kw' },
  { code: 'QAR', fa: 'ریال قطر', cc: 'qa' },
  { code: 'BHD', fa: 'دینار بحرین', cc: 'bh' },
  { code: 'AFN', fa: 'افغانی', cc: 'af' },
  { code: 'PKR', fa: 'روپیه پاکستان', cc: 'pk' },
  { code: 'INR', fa: 'روپیه هند', cc: 'in' },
  { code: 'IQD', fa: 'دینار عراق', cc: 'iq' },
  { code: 'DKK', fa: 'کرون دانمارک', cc: 'dk' },
  { code: 'SEK', fa: 'کرون سوئد', cc: 'se' },
  { code: 'NOK', fa: 'کرون ناروژ', cc: 'no' },
  { code: 'NZD', fa: 'دالر نیوزیلند', cc: 'nz' },
  { code: 'SGD', fa: 'دالر سنگاپور', cc: 'sg' },
  { code: 'HKD', fa: 'دالر هنگ کنگ', cc: 'hk' },
  { code: 'MYR', fa: 'رینگیت مالزی', cc: 'my' },
  { code: 'THB', fa: 'بات تایلند', cc: 'th' },
  { code: 'GEL', fa: 'لاری گرجستان', cc: 'ge' },
  { code: 'AZN', fa: 'منات آذربایجان', cc: 'az' },
  { code: 'AMD', fa: 'درام ارمنستان', cc: 'am' },
  { code: 'KGS', fa: 'سوم قرقیزستان', cc: 'kg' },
  { code: 'KRW', fa: 'وون کره جنوبی', cc: 'kr' },
  { code: 'OMR', fa: 'ریال عمان', cc: 'om' },
  { code: 'BRL', fa: 'رئال برزیل', cc: 'br' },
  { code: 'ARS', fa: 'پزو آرژانتین', cc: 'ar' },
  { code: 'SYP', fa: 'پوند سوریه', cc: 'sy' },
  { code: 'TJS', fa: 'سامانی تاجیکستان', cc: 'tj' },
  { code: 'TMT', fa: 'منات ترکمنستان', cc: 'tm' }
];

const GOLD_PATTERNS = [
  ['coin', /سکه امامی/, 'سکه امامی'],
  ['melted', /آب[\s‌]?شده/, 'طلای آب‌شده'],
  ['silver', /نقره/, 'نقره']
];

const MARKETS = {
  kabul: { fa: 'بازار کابل', sub: 'سرای شهزاده', unitLabel: 'AFN' },
  herat: { fa: 'بازار هرات', sub: 'خراسان مارکت', unitLabel: 'AFN' },
  iran: { fa: 'بازار ایران', sub: 'نرخ به تومان', unitLabel: 'تومان' }
};

// ============================================
// ابزارهای کمکی
// ============================================
const FA_DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };

function cleanNumber(v) {
  if (v == null) return NaN;
  let s = String(v)
    .replace(/[۰-۹]/g, d => FA_DIGITS[d] || d)
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '')
    .replace(/[^\d.\-]/g, '');
  return parseFloat(s);
}

function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtUsd(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  if (x >= 1e9) return '$' + (x / 1e9).toFixed(2) + 'B';
  if (x >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M';
  if (x >= 1e3) return '$' + (x / 1e3).toFixed(1) + 'K';
  return '$' + x.toFixed(2);
}

function fmtToman(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function detectUnit(line, currency) {
  if (currency.unit) return currency.unit;
  if (/میلیون/.test(line)) return 1e6;
  if (/۱٬۰۰۰|۱,۰۰۰|۱۰۰۰/.test(line)) return 1000;
  return 1;
}

function pickGold(line, cells) {
  for (const [key, pat, fa] of GOLD_PATTERNS) {
    if (pat.test(line)) {
      const nums = cells.map(cleanNumber).filter(Number.isFinite);
      if (nums.length >= 2 && nums[0] > 0 && nums[1] > 0) return { key, fa, buy: nums[0], sell: nums[1] };
    }
  }
  return null;
}

// ============================================
// پارس داده‌ها
// ============================================
function parseJina(text) {
  const result = { kabul: {}, herat: {} };
  const lines = text.split(/\r?\n/);
  let market = null;
  for (const line of lines) {
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
        const rest = cells.filter(c => c !== first);
        const nums = rest.map(cleanNumber).filter(Number.isFinite);
        if (nums.length >= 2) {
          const unit = detectUnit(line, currency);
          const buy = nums[0], sell = nums[1];
          if (buy > 0 && sell > 0) result[market][code] = { buy, sell, unit };
        }
      }
    }

    if (/سکه|آب[\s‌]?شده|نقره/.test(line)) {
      const g = pickGold(line, cells);
      if (g) {
        if (!result[market].gold) result[market].gold = {};
        result[market].gold[g.key] = { buy: g.buy, sell: g.sell };
      }
    }
  }
  return result;
}

function parseIran(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let inCur = false, inGold = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/نرخ ارز|ارزهای خارجی|قیمت ارز/.test(trimmed) && !/دیجیتال|طلا|سکه/.test(trimmed)) {
      inCur = true; inGold = false; continue;
    }

    if (/طلا|سکه|نقره|آب[\s‌]?شده/.test(trimmed) && !/\|/.test(trimmed)) {
      inCur = false; inGold = true; continue;
    }

    if (inGold && /دیجیتال|ارز دیجیتال|کریپتو|بیت‌کوین|بیت کوین/.test(trimmed)) {
      inGold = false; continue;
    }

    if (!line.includes('|')) continue;

    if (inCur) {
      const cells = line.split('|').map(x => x.trim());
      const first = cells.find(c => /\b[A-Z]{3}\b/.test(c)) || '';
      const m = first.match(/\b([A-Z]{3})\b/);
      if (!m) continue;
      const code = m[1].toUpperCase();
      const currency = iranCurrencies.find(x => x.code === code);
      if (!currency) continue;
      const rest = cells.filter(c => c !== first);
      const nums = rest.map(cleanNumber).filter(Number.isFinite);
      if (nums.length < 2) continue;
      const buy = nums[0], sell = nums[1];
      if (buy > 0 && sell > 0) out[code] = { buy, sell, unit: 1 };
    }

    if (inGold || /سکه|آب[\s‌]?شده|نقره/.test(trimmed)) {
      if (!/\|/.test(line)) continue;
      const cells = line.split('|').map(x => x.trim());
      const g = pickGold(trimmed, cells);
      if (g) {
        if (!out.gold) out.gold = {};
        out.gold[g.key] = { buy: g.buy, sell: g.sell };
      }
    }
  }
  return out;
}

// ============================================
// دریافت داده‌ها از منابع
// ============================================
async function fetchRates() {
  try {
    const [rMain, rIran] = await Promise.all([
      fetch('https://r.jina.ai/https://arzcheck.com/', { headers: { 'Accept': 'text/plain' } }),
      fetch('https://r.jina.ai/https://arzcheck.com/iran', { headers: { 'Accept': 'text/plain' } })
    ]);

    if (!rMain.ok) throw new Error('HTTP ' + rMain.status);
    const text = await rMain.text();
    let parsed = parseJina(text);

    if (!parsed.kabul.USD) throw new Error('ساختار نرخ‌ها قابل تشخیص نیست');

    let iran = {};
    if (rIran.ok) {
      const iranText = await rIran.text();
      iran = parseIran(iranText);
    }

    return {
      kabul: parsed.kabul,
      herat: parsed.herat,
      iran: iran,
      ts: Date.now()
    };
  } catch (err) {
    console.error('Error fetching rates:', err);
    return null;
  }
}

async function fetchCrypto() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,dogecoin,cardano,tron,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=true';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Crypto HTTP ' + r.status);
    const data = await r.json();
    return data;
  } catch (e) {
    console.error('Error fetching crypto:', e);
    return null;
  }
}

// ============================================
// ارسال به تلگرام
// ============================================
async function sendToTelegram(botToken, text) {
  if (!text || !botToken) return false;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body = {
      chat_id: TG_CHANNEL,
      text: text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '📊 دریافت نرخ همین لحظه', url: `https://t.me/${TG_BOT_USERNAME}` }
        ]]
      }
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const res = await r.json();
    if (res.ok) {
      console.log('✅ پست تلگرام ارسال شد');
      return true;
    } else {
      console.error('❌ خطای تلگرام:', res);
      return false;
    }
  } catch (e) {
    console.error('❌ خطا در ارسال:', e);
    return false;
  }
}

// ساخت پست تلگرام — سبک عکس نمونه
function buildTelegramPost(ratesData, cryptoData) {
  const now = new Date();
  const timeStr = now.toLocaleDateString('fa-IR') + ' — ' + now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  let text = '📊 <b>قیمت لحظه‌ای ارزهای دیجیتال</b>\n';
  text += '━━━━━━━━━━━━━━━━━━━━\n\n';

  // بخش کابل
  if (ratesData.kabul && Object.keys(ratesData.kabul).length > 0) {
    text += '🏛 <b>بازار کابل</b> <code>سرای شهزاده</code>\n\n';
    const majors = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'TRY', 'PKR', 'IRR'];
    for (const code of majors) {
      const r = ratesData.kabul[code];
      if (r) {
        const c = currencies.find(x => x.code === code);
        text += `💵 <b>${code}</b>  ${c ? c.fa : code}\n`;
        text += `   خرید: ${fmt(r.buy)}  |  فروش: ${fmt(r.sell)}\n\n`;
      }
    }
    text += '━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // بخش هرات
  if (ratesData.herat && Object.keys(ratesData.herat).length > 0) {
    text += '🏛 <b>بازار هرات</b> <code>خراسان مارکت</code>\n\n';
    const majors = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'TRY', 'PKR', 'IRR'];
    for (const code of majors) {
      const r = ratesData.herat[code];
      if (r) {
        const c = currencies.find(x => x.code === code);
        text += `💵 <b>${code}</b>  ${c ? c.fa : code}\n`;
        text += `   خرید: ${fmt(r.buy)}  |  فروش: ${fmt(r.sell)}\n\n`;
      }
    }
    text += '━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // بخش طلا و نقره
  const goldK = ratesData.kabul?.gold;
  const goldH = ratesData.herat?.gold;
  if (goldK || goldH) {
    text += '🥇 <b>طلا و نقره</b>\n\n';
    if (goldK) {
      for (const [key, pat, fa] of GOLD_PATTERNS) {
        if (goldK[key]) {
          text += `   ${fa}: ${fmt(goldK[key].sell)} AFN\n`;
        }
      }
    }
    text += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  // بخش ارز دیجیتال
  if (cryptoData && cryptoData.length > 0) {
    text += '₿ <b>ارز دیجیتال</b>\n\n';
    cryptoData.slice(0, 5).forEach(c => {
      const ch = Number(c.price_change_percentage_24h || 0);
      const up = ch >= 0;
      const emoji = up ? '🟢' : '🔴';
      const sign = up ? '+' : '−';
      text += `${emoji} <b>${c.symbol.toUpperCase()}</b>  ${sign}${Math.abs(ch).toFixed(2)}%\n`;
      text += `   $${fmt(c.current_price)}\n\n`;
    });
    text += '━━━━━━━━━━━━━━━━━━━━\n\n';
  }

  text += `⏰ ${timeStr}\n\n`;
  text += `📢 کانال: @af_arz\n`;
  text += `🤖 ربات: @af_arz_bot`;

  return text;
}

// ============================================
// HTML سایت
// ============================================
function getHTML() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#ffffff">
<meta name="description" content="برچی ارز؛ نمایش آنلاین نرخ ارز، نمودار روند، ماشین حساب و تبدیل ارز">
<title>برچی ارز | Barchi Arz</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap');
:root{--bg:#f5f7fb;--surface:#fff;--surface2:#f8fafc;--text:#111827;--muted:#64748b;--line:#e6eaf0;--primary:#2457e6;--primary2:#1741bd;--green:#079669;--red:#dc3d52;--accent:#ff8a1e;--shadow:0 12px 35px rgba(15,23,42,.07);--shadow2:0 22px 55px rgba(15,23,42,.11);--radius:22px}
html.dark{--bg:#07101f;--surface:#0d1728;--surface2:#111e31;--text:#f8fafc;--muted:#94a3b8;--line:#203047;--primary:#5b7cff;--primary2:#4163e8;--green:#28c795;--red:#ff6478;--shadow:0 12px 35px rgba(0,0,0,.22);--shadow2:0 22px 55px rgba(0,0,0,.3)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:Vazirmatn,system-ui,sans-serif;min-height:100vh;transition:background .5s,color .5s}
button,input,select{font:inherit}
button{cursor:pointer}
a{text-decoration:none;color:inherit}
::selection{background:#2457e6;color:#fff}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:#b8c2d1;border-radius:20px}
.dark ::-webkit-scrollbar-thumb{background:#33445e}
.loader{position:fixed;inset:0;z-index:999;background:var(--bg);display:flex;align-items:center;justify-content:center;transition:opacity .6s,visibility .6s}
.loader.hide{opacity:0;visibility:hidden;pointer-events:none}
.loader-box{text-align:center}
.loader-box img{width:90px;height:90px;object-fit:contain;border-radius:24px;background:var(--surface);border:1px solid var(--line);padding:10px;margin-bottom:22px;box-shadow:var(--shadow)}
.loader-dots{display:flex;gap:10px;justify-content:center;margin-bottom:16px}
.loader-dots span{width:12px;height:12px;border-radius:50%;background:var(--primary);animation:dotBounce 1.2s ease-in-out infinite}
.loader-dots span:nth-child(2){animation-delay:.15s;background:var(--accent)}
.loader-dots span:nth-child(3){animation-delay:.3s;background:var(--green)}
@keyframes dotBounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
.loader-box p{margin:0;color:var(--muted);font-size:13px;font-weight:700}
.topline{height:3px;background:linear-gradient(90deg,#2457e6,#6b8cff,#2457e6);background-size:200% 100%;animation:lineMove 5s linear infinite}
@keyframes lineMove{to{background-position:200% 0}}
.header{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
.header-inner{max-width:1240px;margin:auto;height:76px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.brand-mark{width:57px;height:57px;border-radius:17px;display:grid;place-items:center;flex:none;overflow:hidden;background:var(--surface2);border:1px solid var(--line);padding:4px}
.brand-mark img{width:100%;height:100%;object-fit:contain}
.brand-name{font-size:20px;font-weight:900;letter-spacing:-.5px;white-space:nowrap;color:var(--text)}
.icon-btn{width:43px;height:43px;border:1px solid var(--line);border-radius:13px;background:var(--surface2);color:var(--text);display:grid;place-items:center;overflow:hidden;position:relative}
.icon-btn svg{width:20px;height:20px;position:absolute;transition:transform .6s cubic-bezier(.22,.8,.2,1),opacity .4s}
.icon-btn .sun{transform:rotate(0) scale(1);opacity:1}
.icon-btn .moon{transform:rotate(-90deg) scale(.2);opacity:0}
.dark .icon-btn .sun{transform:rotate(90deg) scale(.2);opacity:0}
.dark .icon-btn .moon{transform:rotate(0) scale(1);opacity:1}
.container{max-width:1240px;margin:auto;padding:0 20px}
.hero{padding:42px 0 10px;position:relative}
.hero-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.hero-bg b{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);font-size:clamp(90px,16vw,225px);font-weight:900;letter-spacing:-6px;white-space:nowrap;color:var(--primary);opacity:.22;filter:blur(14px);animation:bgFloat 9s ease-in-out infinite}
.hero-bg b.b2{top:78%;font-size:clamp(52px,9.5vw,125px);color:var(--accent);opacity:.24;animation-delay:-4.5s}
.hero-bg b.b3{top:52%;inset-inline-start:28%;font-size:clamp(34px,5.5vw,70px);color:var(--green);opacity:.16;letter-spacing:4px;animation-delay:-7s}
.dark .hero-bg b{color:#93a5ff;opacity:.30}
.dark .hero-bg b.b2{color:#ffb054;opacity:.28}
.dark .hero-bg b.b3{color:#2fe0a5;opacity:.2}
@keyframes bgFloat{50%{transform:translate(-50%,-52%) scale(1.05)}}
.hero-card{border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 72%,transparent);backdrop-filter:blur(14px);border-radius:28px;box-shadow:var(--shadow);padding:36px 30px;position:relative;overflow:hidden;text-align:center}
.hero-card:before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:#2457e6;opacity:.06;filter:blur(5px);right:-110px;top:-130px}
.hero-card:after{content:"";position:absolute;width:220px;height:220px;border-radius:50%;background:#079669;opacity:.05;filter:blur(5px);left:-90px;bottom:-110px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;background:rgba(36,87,230,.08);color:var(--primary);font-size:11px;font-weight:800;position:relative;z-index:1}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 5px rgba(7,150,105,.10);animation:pulse 1.7s infinite}
@keyframes pulse{50%{box-shadow:0 0 0 9px rgba(7,150,105,0)}}
.hchip{position:absolute;z-index:2;display:flex;flex-direction:column;gap:6px;padding:11px 13px;border-radius:16px;background:color-mix(in srgb,var(--surface) 66%,transparent);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:var(--shadow2);animation:chipFloat 7s ease-in-out infinite;cursor:pointer;transition:transform .3s,border-color .3s;min-width:138px}
.hchip:hover{transform:translateY(-5px) scale(1.05);border-color:color-mix(in srgb,var(--primary) 40%,var(--line))}
.hchip canvas{width:64px;height:26px;display:block}
.hchip .hc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hchip .hc-name{font-size:10px;font-weight:900}
.hchip .hc-p{font-size:13.5px;font-weight:900;direction:ltr;text-align:left;font-variant-numeric:tabular-nums}
.hchip .hc-b{font-size:8.5px;font-weight:900;padding:2px 7px;border-radius:99px;direction:ltr;white-space:nowrap}
.hc-b.up{color:var(--green);background:rgba(7,150,105,.12)}
.hc-b.down{color:var(--red);background:rgba(220,61,82,.12)}
.chip1{top:20px;inset-inline-start:20px;animation-delay:0s}
.chip2{top:30px;inset-inline-end:24px;animation-delay:-2.2s}
.chip3{bottom:18px;inset-inline-start:40px;animation-delay:-4.4s}
.chip4{bottom:24px;inset-inline-end:42px;animation-delay:-6s}
@keyframes chipFloat{50%{transform:translateY(-9px)}}
.hero-stories{position:relative;z-index:1;display:flex;gap:6px;max-width:520px;margin:0 auto 14px}
.seg{flex:1;height:3px;border-radius:99px;background:var(--line);overflow:hidden}
.seg i{display:block;height:100%;width:0;background:var(--primary);border-radius:99px}
.seg.done i{width:100%}
.seg.active i{animation:segFill 4.2s linear forwards}
@keyframes segFill{from{width:0}to{width:100%}}
.hero-title-wrap{height:64px;margin:20px 0 8px;position:relative;overflow:hidden;z-index:1}
.hero-title{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;margin:0;font-size:clamp(28px,4.4vw,46px);font-weight:900;letter-spacing:-1.6px;opacity:0;transform:translateY(24px);transition:opacity .55s,transform .55s;pointer-events:none;text-shadow:0 2px 20px color-mix(in srgb,var(--surface) 80%,transparent)}
.hero-title.active{opacity:1;transform:translateY(0)}
.hero-title.leaving{opacity:0;transform:translateY(-24px)}
.hero p{margin:0 auto;max-width:640px;color:var(--muted);font-size:13px;line-height:2;position:relative;z-index:1}
.hero-feature{position:relative;z-index:1;margin:18px auto 0;max-width:560px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.hero-feature .hf-item{display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px solid var(--line);border-radius:16px;padding:10px 16px;box-shadow:var(--shadow)}
.hero-feature .hf-item .flagimg{width:34px;height:25px}
.hero-feature .hf-name{text-align:right}
.hero-feature .hf-name h3{margin:0;font-size:12px;font-weight:900}
.hero-feature .hf-name span{display:block;color:var(--muted);font-size:8.5px;margin-top:2px}
.hero-feature .hf-prices{display:flex;gap:14px}
.hero-feature .hf-prices div{text-align:left}
.hero-feature .hf-prices small{display:block;color:var(--muted);font-size:8px;margin-bottom:2px}
.hero-feature .hf-prices strong{font-size:14px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums}
.hero-feature .hf-buy strong{color:var(--green)}
.hero-feature .hf-sell strong{color:var(--red)}
.section{margin-top:34px;scroll-margin-top:90px}
.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:15px;flex-wrap:wrap}
.section-title{display:flex;align-items:center;gap:11px;margin:0;font-size:19px;font-weight:900;letter-spacing:-.4px}
.section-title .s-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(36,87,230,.10);color:var(--primary);flex:none}
.section-title .s-icon svg{width:20px;height:20px}
.section-note{color:var(--muted);font-size:10.5px}
.tabs{display:flex;padding:4px;background:var(--surface2);border:1px solid var(--line);border-radius:15px;flex-wrap:wrap}
.tab{border:0;background:transparent;color:var(--muted);padding:10px 19px;border-radius:11px;font-size:12px;font-weight:800;transition:.3s;white-space:nowrap}
.tab.active{background:var(--surface);color:var(--text);box-shadow:0 5px 15px rgba(15,23,42,.08)}
.market-tabs{margin-bottom:16px}
.market-card{background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);overflow:hidden}
.market-head{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line);background:var(--surface2);flex-wrap:wrap}
.market-head .m-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(36,87,230,.10);color:var(--primary);flex:none}
.market-head .m-icon svg{width:20px;height:20px}
.m-titles{flex:1;min-width:0}
.m-titles h4{margin:0;font-size:14px;font-weight:900}
.m-sub{color:var(--primary);font-size:10px;font-weight:800;margin-right:6px}
.m-hours{display:block;color:var(--muted);font-size:9.5px;margin-top:3px}
.m-status{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:900;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface)}
.m-status .dot{width:9px;height:9px;border-radius:50%;flex:none}
.m-status.open{color:var(--green)}.m-status.open .dot{background:var(--green);animation:pulseG 1.6s infinite}
.m-status.closed{color:var(--red)}.m-status.closed .dot{background:var(--red);animation:pulseR 1.6s infinite}
@keyframes pulseG{50%{box-shadow:0 0 0 6px rgba(7,150,105,.16)}}
@keyframes pulseR{50%{box-shadow:0 0 0 6px rgba(220,61,82,.16)}}
.mtable{width:100%;border-collapse:collapse}
.mtable th{color:var(--muted);font-size:9px;font-weight:800;padding:11px 14px;text-align:right;border-bottom:1px solid var(--line);background:var(--surface2)}
.mtable td{padding:10px 14px;font-size:12px;font-weight:800;border-bottom:1px solid var(--line)}
.mtable tbody tr{transition:background .25s}
.mtable tbody tr:hover{background:var(--surface2)}
.mtable tr:last-child td{border-bottom:0}
.mtable .num{direction:ltr;text-align:left;font-variant-numeric:tabular-nums}
.mtable .cur{display:flex;align-items:center;gap:9px}
.flagimg{width:32px;height:23px;border-radius:5px;overflow:hidden;box-shadow:0 3px 8px rgba(15,23,42,.13);flex:none;background:linear-gradient(145deg,#c7d2e2,#eef2f8);display:grid;place-items:center}
.flagimg img{width:100%;height:100%;object-fit:cover;display:block}
.cname h3{margin:0;font-size:12px;font-weight:900}
.cname span{display:block;color:var(--muted);font-size:8.5px;margin-top:2px;direction:rtl}
.gold-card{display:flex;align-items:center;gap:16px;margin:16px;padding:16px 18px;border:1px solid var(--line);border-radius:18px;background:var(--surface2);flex-wrap:wrap}
.gold-logo{width:54px;height:54px;border-radius:14px;object-fit:contain;background:var(--surface);border:1px solid var(--line);padding:5px;flex:none}
.gold-info{flex:1;min-width:150px}
.gold-info h4{margin:0;font-size:14px;font-weight:900}
.gold-info span{display:block;color:var(--muted);font-size:9.5px;margin-top:3px}
.gold-prices{display:flex;gap:18px;flex-wrap:wrap}
.gold-prices div{text-align:left}
.gold-prices small{display:block;color:var(--muted);font-size:8.5px;margin-bottom:3px}
.gold-prices strong{font-size:14px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums}
.gold-buy strong{color:var(--green)}
.gold-sell strong{color:var(--red)}
.gold-rows{width:100%;display:flex;flex-direction:column;gap:8px;margin-top:4px}
.gold-row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:9px 13px}
.gold-row b{font-size:11.5px;font-weight:900}
.gold-row .gp{display:flex;gap:14px}
.gold-row .gp span{font-size:11px;font-weight:800;direction:ltr;font-variant-numeric:tabular-nums}
.gold-row .gp .b{color:var(--green)}
.gold-row .gp .s{color:var(--red)}
.crypto-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow);position:relative;overflow:hidden;transition:transform .35s,box-shadow .35s,border-color .35s;animation:cardIn .5s both}
.card:hover{transform:translateY(-5px);box-shadow:var(--shadow2);border-color:color-mix(in srgb,var(--primary) 35%,var(--line))}
@keyframes cardIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:none}}
.card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.currency-id{display:flex;align-items:center;gap:10px}
.code{font-size:10px;color:var(--muted);font-weight:800;letter-spacing:1px}
.crypto-card .crypto-icon{width:40px;height:40px;border-radius:12px;object-fit:cover}
.coin-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:17px 0 3px}
.coin-price{font-size:19px;font-weight:900;direction:ltr;text-align:right}
.coin-badge{font-size:10px;font-weight:900;padding:5px 10px;border-radius:999px;direction:ltr;white-space:nowrap}
.coin-badge.up{color:var(--green);background:rgba(7,150,105,.10)}
.coin-badge.down{color:var(--red);background:rgba(220,61,82,.10)}
.up{color:var(--green)}.down{color:var(--red)}
.meta{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:9px;padding-top:10px;border-top:1px solid var(--line)}
.chart-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:26px;background:var(--surface);box-shadow:var(--shadow)}
.chart-card:before{content:"";position:absolute;left:15%;right:15%;top:-45%;height:75%;background:radial-gradient(closest-side,color-mix(in srgb,var(--primary) 28%,transparent),transparent);filter:blur(34px);pointer-events:none}
.dark .chart-card:before{background:radial-gradient(closest-side,rgba(124,140,255,.30),transparent)}
.chart-in{position:relative;z-index:1;padding:24px 24px 18px}
.chart-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:12px}
.chart-title h4{margin:0;font-size:17px;font-weight:900}
.chart-title span{color:var(--muted);font-size:10px;font-weight:700}
.chart-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tool-sel,.tool-btn{border:1px solid var(--line);background:var(--surface2);color:var(--text);border-radius:11px;padding:8px 13px;font-size:11px;font-weight:800;transition:.25s}
.tool-btn.on{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 6px 16px rgba(36,87,230,.28)}
.dl-btn{border:0;border-radius:12px;padding:9px 15px;font-size:11px;font-weight:900;color:#2a1600;background:linear-gradient(135deg,#ffb054,#ff7a1a);box-shadow:0 9px 22px rgba(255,138,30,.38);transition:transform .25s;display:inline-flex;align-items:center;gap:6px}
.dl-btn.ghost{background:var(--surface2);color:var(--text);border:1px solid var(--line);box-shadow:none}
.dl-btn:hover{transform:translateY(-2px)}
.dl-btn svg{width:15px;height:15px}
.chart-value{display:flex;align-items:baseline;gap:12px;margin:4px 0 10px;flex-wrap:wrap}
.chart-value b{font-size:clamp(26px,3.6vw,40px);font-weight:900;direction:ltr;font-variant-numeric:tabular-nums;letter-spacing:-1px}
.chart-value small{color:var(--muted);font-size:11px;font-weight:700}
.chg{font-size:11px;font-weight:900;padding:5px 12px;border-radius:999px;direction:ltr;white-space:nowrap}
.chg.up{color:var(--green);background:rgba(7,150,105,.10)}
.chg.down{color:var(--red);background:rgba(220,61,82,.10)}
.chart-wrap{position:relative;height:310px}
#rateChart{width:100%;height:100%;display:block}
.chart-tip{position:absolute;pointer-events:none;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(8px);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:7px 12px;font-size:11px;font-weight:800;direction:ltr;box-shadow:var(--shadow2);opacity:0;transition:opacity .15s;white-space:nowrap;z-index:3}
.gold-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.gcard{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:18px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:13px;transition:transform .3s,border-color .3s;animation:cardIn .5s both}
.gcard:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.gcard .g-top{display:flex;align-items:center;gap:12px}
.gcard .g-top img{width:46px;height:46px;border-radius:13px;object-fit:contain;background:var(--surface2);border:1px solid var(--line);padding:4px}
.gcard h4{margin:0;font-size:14px;font-weight:900}
.gcard .g-sub{color:var(--muted);font-size:9.5px;font-weight:600}
.g-spark{width:100%;height:64px;display:block;border-radius:12px;background:var(--surface2);border:1px solid var(--line)}
.g-prices{display:flex;gap:10px}
.g-prices>div{flex:1;background:var(--surface2);border:1px solid var(--line);border-radius:14px;padding:10px 13px}
.g-prices small{display:block;color:var(--muted);font-size:8.5px;font-weight:700;margin-bottom:4px}
.g-prices b{font-size:15.5px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums}
.g-prices .gb b{color:var(--green)}
.g-prices .gs b{color:var(--red)}
.g-src{color:var(--muted);font-size:8.5px;font-weight:700}
.calc-fab{position:fixed;inset-inline-end:18px;bottom:18px;z-index:95;width:58px;height:58px;border-radius:19px;border:0;background:linear-gradient(145deg,#ffb054,#ff7a1a);color:#2a1600;display:grid;place-items:center;box-shadow:0 15px 36px rgba(255,138,30,.45);transition:transform .3s}
.calc-fab:hover{transform:translateY(-4px) scale(1.05)}
.calc-fab svg{width:26px;height:26px}
.calc-panel{position:fixed;inset-inline-end:18px;bottom:88px;z-index:96;width:334px;max-width:calc(100vw - 28px);border-radius:26px;overflow:hidden;border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow2);display:none}
.calc-panel.show{display:block;animation:cardIn .35s both}
html.dark .calc-panel{background:#12161f;border-color:#263049}
.calc-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;cursor:grab;user-select:none;touch-action:none;background:var(--surface2);border-bottom:1px solid var(--line)}
html.dark .calc-head{background:#171d2b;border-color:#263049}
.calc-head:active{cursor:grabbing}
.calc-head b{font-size:12px;font-weight:900}
.calc-head .grip{display:flex;gap:3px}
.calc-head .grip i{width:14px;height:3px;border-radius:2px;background:var(--muted);opacity:.5}
.calc-head .close{border:0;background:var(--surface);color:var(--text);width:30px;height:30px;border-radius:9px;font-size:16px;line-height:1}
.calc-body{padding:15px}
.calc-tabs{display:flex;gap:6px;margin-bottom:13px}
.ctab{flex:1;border:1px solid var(--line);background:var(--surface2);color:var(--muted);border-radius:11px;padding:8px 4px;font-size:10.5px;font-weight:900;transition:.25s}
.ctab.on{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 6px 15px rgba(36,87,230,.28)}
.calc-view{display:none}
.calc-view.on{display:block}
.calc-display{background:var(--surface2);border:1px solid var(--line);border-radius:17px;padding:13px 15px;margin-bottom:12px;min-height:78px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:5px}
html.dark .calc-display{background:#0d1119;border-color:#263049}
.calc-display .expr{color:var(--muted);font-size:12px;direction:ltr;min-height:17px;word-break:break-all;text-align:right;font-variant-numeric:tabular-nums}
.calc-display .res{font-size:31px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums;line-height:1.15}
.calc-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.ck{border:0;border-radius:14px;height:53px;font-size:17px;font-weight:700;background:var(--surface2);color:var(--text);box-shadow:0 2px 0 var(--line);transition:.15s}
.ck:active{transform:scale(.92)}
html.dark .ck{background:#232b3a;box-shadow:0 2px 0 #141a26;color:#e8ecf4}
.ck.util{background:color-mix(in srgb,var(--muted) 24%,var(--surface2));color:var(--text)}
html.dark .ck.util{background:#39415a;color:#dbe2ef}
.ck.op{background:linear-gradient(145deg,#ffb054,#ff7a1e);color:#2a1600;box-shadow:0 5px 15px rgba(255,138,30,.35);font-size:21px}
.ck.zero{grid-column:span 2}
.fld{margin-bottom:10px}
.fld label{display:block;font-size:10px;font-weight:800;color:var(--muted);margin-bottom:5px}
.fld input,.fld select{width:100%;border:1px solid var(--line);background:var(--surface2);color:var(--text);border-radius:11px;padding:10px 12px;font-size:13px;font-weight:800;direction:ltr;text-align:left}
html.dark .fld input,html.dark .fld select{background:#0d1119;border-color:#263049;color:#e8ecf4}
.p-res{display:flex;flex-direction:column;gap:7px;margin-top:12px}
.p-res .row{display:flex;justify-content:space-between;align-items:center;background:var(--surface2);border:1px solid var(--line);border-radius:11px;padding:9px 12px;font-size:11px;font-weight:800;gap:8px}
html.dark .p-res .row{background:#0d1119;border-color:#263049}
.p-res .row b{direction:ltr;font-variant-numeric:tabular-nums}
.p-res .row.total{background:rgba(7,150,105,.08);border-color:rgba(7,150,105,.28)}
.p-res .row.total.loss{background:rgba(220,61,82,.08);border-color:rgba(220,61,82,.28)}
.loading{grid-column:1/-1;padding:70px 20px;text-align:center;color:var(--muted)}
.spinner{width:35px;height:35px;border:3px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite;margin:auto}
@keyframes spin{to{transform:rotate(360deg)}}
.error{grid-column:1/-1;background:rgba(220,61,82,.07);border:1px solid rgba(220,61,82,.18);padding:20px;border-radius:18px;color:var(--red);font-size:12px;text-align:center}
.empty-note{text-align:center;color:var(--muted);font-size:11px;padding:25px}
footer{margin-top:45px;border-top:1px solid var(--line);background:var(--surface)}
.footer-inner{max-width:1240px;margin:auto;padding:22px 20px;display:flex;justify-content:space-between;align-items:center;gap:20px;color:var(--muted);font-size:10px;flex-wrap:wrap}
.footer-links{display:flex;gap:18px}
.footer-links button{border:0;background:none;color:var(--muted);font-size:10px}
.modal{position:fixed;inset:0;z-index:100;background:rgba(2,6,23,.55);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:20px}
.modal.show{display:flex;animation:fade .25s}
@keyframes fade{from{opacity:0}to{opacity:1}}
.modal-box{max-width:570px;width:100%;max-height:80vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:25px;box-shadow:var(--shadow2)}
.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.modal-head h3{margin:0;font-size:17px}
.close{border:0;background:var(--surface2);color:var(--text);width:35px;height:35px;border-radius:10px;font-size:20px}
.modal-body{color:var(--muted);font-size:12px;line-height:2.1}
@media(max-width:980px){.crypto-grid{grid-template-columns:repeat(2,1fr)}.gold-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:820px){.hchip{display:none}}
@media(max-width:650px){.header-inner{height:68px;padding:0 13px}.brand-mark{width:50px;height:50px;border-radius:14px}.brand-name{font-size:17px}.icon-btn{width:39px;height:39px}.container{padding:0 13px}.hero{padding-top:20px}.hero-card{padding:24px 18px;border-radius:22px}.hero-title-wrap{height:52px}.tabs{justify-content:center}.crypto-grid{grid-template-columns:1fr}.card{padding:16px}.gold-grid{grid-template-columns:1fr}.gold-card{flex-direction:column;text-align:center}.gold-prices{justify-content:center}.gold-row{flex-direction:column;gap:6px}.footer-inner{flex-direction:column;text-align:center}.chart-wrap{height:230px}.chart-in{padding:16px 14px 12px}.calc-panel{width:calc(100vw - 28px)}}
</style>
</head>
<body>
<div class="loader" id="loader">
  <div class="loader-box">
    <img id="loaderLogo" alt="برچی ارز">
    <div class="loader-dots"><span></span><span></span><span></span></div>
    <p>در حال آماده‌سازی تابلو نرخ...</p>
  </div>
</div>
<div class="topline"></div>
<header class="header">
  <div class="header-inner">
    <a class="brand" href="#">
      <div class="brand-mark"><img id="brandLogo" alt="برچی ارز"></div>
      <span class="brand-name">برچی ارز</span>
    </a>
    <div class="header-actions">
      <button class="icon-btn" id="themeBtn" title="تغییر حالت">
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.5 8.5 0 1 0 20.5 15.3Z"/></svg>
      </button>
    </div>
  </div>
</header>
<main>
<section class="container hero" id="home">
  <div class="hero-bg"><b>BARCHI ARZ</b><b class="b2">LIVE RATES</b><b class="b3">PRISM</b></div>
  <div class="hero-card" id="heroCard">
    <div class="hero-stories" id="heroStories"></div>
    <span class="eyebrow"><i class="live-dot"></i> بازار ارز افغانستان</span>
    <div class="hero-title-wrap" id="heroTitles"></div>
    <div class="hero-feature" id="heroFeature"></div>
    <p>نرخ خرید و فروش ارزهای خارجی در بازارهای کابل، هرات و ایران، به‌همراه نرخ ارزهای دیجیتال.</p>
  </div>
</section>
<section class="container section" id="chartSection">
  <div class="section-head">
    <h3 class="section-title"><span class="s-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18M7 15l4-5 3 3 5-7"/></svg></span>نمودار نرخ ارز</h3>
    <span class="section-note">روند رشد و ریزش · تصویر قابل دانلود (روشن/تیره)</span>
  </div>
  <div class="chart-card">
    <div class="chart-in">
      <div class="chart-head">
        <div class="chart-title"><h4 id="chartName">—</h4><span id="chartCode">—</span></div>
        <div class="chart-tools">
          <select class="tool-sel" id="chartSelect"></select>
          <button class="tool-btn on" data-days="7">۷ روز</button>
          <button class="tool-btn" data-days="30">۳۰ روز</button>
          <button class="dl-btn" id="exportDark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>عکس تیره</button>
          <button class="dl-btn ghost" id="exportLight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>عکس روشن</button>
        </div>
      </div>
      <div class="chart-value"><b id="chartValue">—</b><span class="chg up" id="chartChange">—</span><small id="chartDate"></small></div>
      <div class="chart-wrap"><canvas id="rateChart"></canvas><div class="chart-tip" id="chartTip"></div></div>
    </div>
  </div>
</section>
<section class="container section" id="marketsSection">
  <div class="section-head">
    <h3 class="section-title"><span class="s-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21V8l7-5 7 5v13M3 21h18M10 21v-6h4v6M17 12h2m-2 3h2"/></svg></span>تابلو نرخ بازار</h3>
    <span class="section-note" id="marketNote">—</span>
  </div>
  <div class="tabs market-tabs">
    <button class="tab m-tab active" data-market="kabul">کابل — سرای شهزاده</button>
    <button class="tab m-tab" data-market="herat">هرات — خراسان مارکت</button>
    <button class="tab m-tab" data-market="iran">ایران — نرخ به تومان</button>
  </div>
  <div class="market-card" id="marketView"></div>
</section>
<section class="container section" id="cryptoSection">
  <div class="section-head">
    <h3 class="section-title"><span class="s-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2Z"/><path d="M12 11l8-4.5M12 11v9M12 11L4 6.5"/></svg></span>ارز دیجیتال</h3>
    <span class="section-note">۱۰ ارز برتر بازار جهانی</span>
  </div>
  <div id="cryptoView" class="crypto-grid"></div>
</section>
<section class="container section" id="goldIranSection">
  <div class="section-head">
    <h3 class="section-title"><span class="s-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="14" r="6"/><path d="M9 8.5 12 4l3 4.5M9.5 14c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5S9.5 15.4 9.5 14Z"/></svg></span>طلا و نقره ایران</h3>
    <span class="section-note">نرخ به تومان</span>
  </div>
  <div class="gold-grid" id="goldIranView"></div>
</section>
<section class="container section" id="cryptoTomanSection">
  <div class="section-head">
    <h3 class="section-title"><span class="s-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15.5 9.5c0-1.4-1.6-2.5-3.5-2.5s-3.5 1-3.5 2.3c0 3.4 7 1.7 7 5 0 1.3-1.6 2.4-3.5 2.4s-3.5-1.1-3.5-2.5"/></svg></span>ارز دیجیتال به تومان</h3>
    <span class="section-note">محاسبه با نرخ دلارِ بازار ایران</span>
  </div>
  <div id="cryptoTomanView" class="crypto-grid"></div>
</section>
</main>
<footer>
  <div class="footer-inner">
    <div>© 2026 برچی ارز — اطلاعات صرفاً جهت اطلاع‌رسانی</div>
    <div class="footer-links">
      <button onclick="openLegal('terms')">شرایط استفاده</button>
      <button onclick="openLegal('privacy')">حریم خصوصی</button>
      <button onclick="openLegal('legal')">موارد حقوقی</button>
    </div>
    <div style="display:flex;gap:14px;align-items:center">
      <a href="https://t.me/af_arz" target="_blank" style="color:var(--primary);font-weight:800">📢 کانال: @af_arz</a>
      <a href="https://t.me/af_arz_bot" target="_blank" style="color:var(--accent);font-weight:800">🤖 ربات: @af_arz_bot</a>
    </div>
  </div>
</footer>
<div class="modal" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal-box">
    <div class="modal-head"><h3 id="modalTitle"></h3><button class="close" onclick="closeModal()">×</button></div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>
<button class="calc-fab" id="calcFab" title="ماشین حساب">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="3" width="14" height="18" rx="3.5"/><path d="M8.5 7.5h7"/><circle cx="8.7" cy="12" r=".4" fill="currentColor"/><circle cx="12" cy="12" r=".4" fill="currentColor"/><circle cx="15.3" cy="12" r=".4" fill="currentColor"/><circle cx="8.7" cy="15.7" r=".4" fill="currentColor"/><circle cx="12" cy="15.7" r=".4" fill="currentColor"/><circle cx="15.3" cy="15.7" r=".4" fill="currentColor"/></svg>
</button>
<div class="calc-panel" id="calcPanel">
  <div class="calc-head" id="calcHead">
    <span class="grip"><i></i><i></i><i></i></span>
    <b>ماشین حساب و سود</b>
    <button class="close" id="calcClose">×</button>
  </div>
  <div class="calc-body">
    <div class="calc-tabs">
      <button class="ctab on" data-cv="calc">ماشین حساب</button>
      <button class="ctab" data-cv="profit">سود</button>
      <button class="ctab" data-cv="convert">تبدیل ارز</button>
    </div>
    <div class="calc-view on" id="cv-calc">
      <div class="calc-display"><div class="expr" id="calcExpr"></div><div class="res" id="calcResult">0</div></div>
      <div class="calc-keys" id="calcKeys"></div>
    </div>
    <div class="calc-view" id="cv-profit">
      <div class="fld"><label>قیمت خرید (هر واحد)</label><input id="pBuy" type="number" inputmode="decimal" placeholder="0"></div>
      <div class="fld"><label>قیمت فروش (هر واحد)</label><input id="pSell" type="number" inputmode="decimal" placeholder="0"></div>
      <div class="fld"><label>مقدار / تعداد</label><input id="pQty" type="number" inputmode="decimal" value="1"></div>
      <div class="p-res">
        <div class="row"><span>سود هر واحد</span><b id="pUnit">—</b></div>
        <div class="row total" id="pTotalRow"><span>سود کل</span><b id="pTotal">—</b></div>
        <div class="row"><span>درصد سود</span><b id="pPct">—</b></div>
      </div>
    </div>
    <div class="calc-view" id="cv-convert">
      <div class="fld"><label>ارز (بازار فعال)</label><select id="cvCur"></select></div>
      <div class="fld"><label>مقدار</label><input id="cvAmt" type="number" inputmode="decimal" value="1000"></div>
      <div class="fld"><label>جهت تبدیل</label><select id="cvDir"><option value="toCur">پول پایه → ارز</option><option value="toBase">ارز → پول پایه</option></select></div>
      <div class="p-res">
        <div class="row total"><span>نتیجه</span><b id="cvRes">—</b></div>
        <div class="row"><span>نرخ استفاده‌شده</span><b id="cvRate">—</b></div>
      </div>
    </div>
  </div>
</div>
<script>
const API_BASE = '';
const LOGO_LIGHT = 'https://i.ibb.co/hJbXDZg3/New-Project-49-2-E073-E4.png';
const LOGO_DARK = 'https://i.ibb.co/0VyVM91b/New-Project-49-ADBD7-BF.png';
const GOLD_LOGO = 'https://i.ibb.co/fVYJW7Tk/SEKKEH.png';

const currencies = ${JSON.stringify(currencies)};
const iranCurrencies = ${JSON.stringify(iranCurrencies)};
const GOLD_PATTERNS = ${JSON.stringify(GOLD_PATTERNS.map(p => [p[0], p[2]]))};
const MARKETS = ${JSON.stringify(MARKETS)};

const MARKET_ICONS = {
  kabul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-5h6v5"/></svg>',
  herat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M6 21V11m4 10V11m4 10V11m4 10V8l-6-5-6 5v3"/></svg>',
  iran: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>'
};

const HERO_TEXTS = ['نرخ ارز، ساده و دقیق','دالر، یورو، پوند و بیشتر','نرخ بازار کابل و هرات','نرخ ارزها به تومان','تبدیل سریع ارزها','قیمت خرید و فروش شفاف','درهم، ریال، لیر و کرون','ارز دیجیتال همین‌جا','معامله با اطمینان بیشتر','تابلوی نرخ افغانستان'];

let markets = { kabul: {}, herat: {}, iran: {} };
let activeMarket = 'kabul';
let lastSourceTime = null;
let heroIdx = 0;
let CRYPTO = {};
let HIST = {};
try { HIST = JSON.parse(localStorage.getItem('barchi_hist_v2') || '{}') } catch (e) { HIST = {} }
const chart = { code: 'USD', days: 7, values: [], geo: null };
const $ = id => document.getElementById(id);

function fmt(n) { const x = Number(n); if (!Number.isFinite(x)) return '—'; return x.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
function fmtUsd(n) { const x = Number(n); if (!Number.isFinite(x)) return '—'; if (x >= 1e9) return '$' + (x / 1e9).toFixed(2) + 'B'; if (x >= 1e6) return '$' + (x / 1e6).toFixed(2) + 'M'; if (x >= 1e3) return '$' + (x / 1e3).toFixed(1) + 'K'; return '$' + x.toFixed(2); }
function fmtToman(n) { const x = Number(n); if (!Number.isFinite(x)) return '—'; return x.toLocaleString('fa-IR', { maximumFractionDigits: 0 }); }
function flagImg(cc) { return '<span class="flagimg"><img loading="lazy" src="https://flagicons.lipis.dev/flags/4x3/' + cc + '.svg" alt="" onerror="this.style.display=\'none\'"></span>'; }
function formatTime(d) { if (!(d instanceof Date) || isNaN(d)) return '—'; return d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' — ' + d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function setTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('barchi_theme', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#07101f' : '#ffffff');
  $('brandLogo').src = dark ? LOGO_DARK : LOGO_LIGHT;
  const ll = $('loaderLogo'); if (ll) ll.src = dark ? LOGO_DARK : LOGO_LIGHT;
  drawMainChart(); renderChips(); drawGoldSparks();
}
$('themeBtn').addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));
setTheme(localStorage.getItem('barchi_theme') === 'dark');

function buildHeroTitles() {
  $('heroTitles').innerHTML = HERO_TEXTS.map((t, i) => '<h1 class="hero-title ' + (i === 0 ? 'active' : '') + '">' + t + '</h1>').join('');
  $('heroStories').innerHTML = HERO_TEXTS.map((t, i) => '<span class="seg ' + (i === 0 ? 'active' : '') + '"><i></i></span>').join('');
  setInterval(() => {
    const titles = $('heroTitles').querySelectorAll('.hero-title');
    const segs = $('heroStories').querySelectorAll('.seg');
    const current = titles[heroIdx];
    segs.forEach((s, i) => { s.classList.remove('active', 'done'); if (i < heroIdx) s.classList.add('done'); s.querySelector('i').style.animation = 'none'; void s.offsetWidth; s.querySelector('i').style.animation = ''; });
    current.classList.remove('active'); current.classList.add('leaving');
    heroIdx = (heroIdx + 1) % titles.length;
    const next = titles[heroIdx];
    segs[heroIdx].classList.add('active');
    next.classList.remove('leaving'); void next.offsetWidth; next.classList.add('active');
    setTimeout(() => current.classList.remove('leaving'), 600);
  }, 4200);
}
buildHeroTitles();

function findCur(code) { return currencies.find(x => x.code === code) || iranCurrencies.find(x => x.code === code) || { fa: code, code } }
function curMeta(code) { if (CRYPTO[code]) return { name: CRYPTO[code].name, sub: CRYPTO[code].symbol.toUpperCase(), unit: '$' }; const c = findCur(code); return { name: c.fa, sub: c.code + (c.unit >= 1000 ? ' · هر ' + c.unit.toLocaleString('fa-IR') : ''), unit: MARKETS[activeMarket].unitLabel }; }
function curMetaAny(code) { if (CRYPTO[code]) return { name: CRYPTO[code].name }; return { name: findCur(code).fa }; }

function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function genHistory(seedKey, cur, n) { if (!Number.isFinite(cur) || cur <= 0) return new Array(n).fill(0); const rnd = mulberry32(hashSeed(seedKey + ':' + Math.round(cur * 7))); const drift = (rnd() - .5) * .14; const out = []; let v = cur / (1 + drift); for (let i = 0; i < n; i++) { out.push(v); v *= 1 + (rnd() - .5) * .035; } out[n - 1] = cur; return out; }
function seriesFor(code, n) {
  const c = CRYPTO[code];
  if (c && c.spark && c.spark.length > 20) { const s = c.spark; const step = Math.max(1, Math.floor(s.length / n)); const out = []; for (let i = 0; i < n; i++) { const from = Math.max(0, s.length - (n - i) * step), to = s.length - (n - i - 1) * step; const seg = s.slice(from, to); out.push(seg.length ? seg.reduce((a, b) => a + b, 0) / seg.length : c.price); } out[out.length - 1] = c.price; return out; }
  const h = HIST[activeMarket + ':' + code] || [];
  if (h.length >= 5) return h.slice(-n).map(x => x.v);
  const cur = markets[activeMarket] && markets[activeMarket][code] ? markets[activeMarket][code].sell : NaN;
  return genHistory(code + '@' + activeMarket, cur, n);
}

function drawSpark(ctx, W, H, values, dark) {
  ctx.clearRect(0, 0, W, H); if (!values || values.length < 2) return;
  const up = values[values.length - 1] >= values[0];
  const col = up ? (dark ? '#2fe0a5' : '#079669') : (dark ? '#ff6b81' : '#dc3d52');
  let min = Math.min(...values), max = Math.max(...values); let span = (max - min) || 1; min -= span * .1; max += span * .1; span = max - min;
  const X = i => 2 + (W - 4) * i / (values.length - 1), Y = v => 2 + (H - 4) * (1 - ((v - min) / span));
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00');
  ctx.beginPath(); ctx.moveTo(X(0), Y(values[0])); values.forEach((v, i) => ctx.lineTo(X(i), Y(v))); ctx.lineTo(X(values.length - 1), H); ctx.lineTo(X(0), H); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); values.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.strokeStyle = col; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
}

function renderChips() {
  const host = $('heroCard'); let holder = $('hchips'); const defs = [];
  ['USD', 'EUR'].forEach(c => { if (markets[activeMarket] && markets[activeMarket][c]) defs.push(c) });
  ['BTC', 'ETH'].forEach(c => { if (CRYPTO[c]) defs.push(c) });
  if (!defs.length) { if (holder) holder.remove(); return; }
  if (!holder) { holder = document.createElement('div'); holder.id = 'hchips'; host.appendChild(holder); }
  const dark = document.documentElement.classList.contains('dark');
  holder.innerHTML = defs.slice(0, 4).map((code, i) => {
    const vals = seriesFor(code, 14); const first = vals[0], last = vals[vals.length - 1]; const pct = first ? (last - first) / first * 100 : 0; const up = pct >= 0;
    return '<div class="hchip chip' + (i + 1) + '" onclick="selectChart(\'' + code + '\')" title="نمایش نمودار ' + curMetaAny(code).name + '"><div class="hc-top"><span class="hc-name">' + curMetaAny(code).name + '</span><span class="hc-b ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + Math.abs(pct).toFixed(1) + '%</span></div><div style="display:flex;align-items:center;gap:8px"><canvas data-spark="' + code + '" width="128" height="52"></canvas><span class="hc-p">' + fmt(last) + '</span></div></div>';
  }).join('');
  holder.querySelectorAll('canvas[data-spark]').forEach(cnv => { const vals = seriesFor(cnv.dataset.spark, 14); const ctx = cnv.getContext('2d'); ctx.scale(2, 2); drawSpark(ctx, 64, 26, vals, dark); });
}

function selectChart(code) { chart.code = code; buildChartSelect(); refreshChart(); $('chartSection').scrollIntoView({ behavior: 'smooth' }); }

function paintChart(ctx, W, H, values, o) {
  const dark = o.dark, forExport = !!o.forExport; if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H); } if (!values || values.length < 2) return;
  const up = values[values.length - 1] >= values[0]; const col = up ? (dark ? '#2fe0a5' : '#079669') : (dark ? '#ff6b81' : '#dc3d52');
  const padL = forExport ? 100 : 14, padR = forExport ? 100 : 14, padT = forExport ? 336 : 18, padB = forExport ? 90 : 44;
  const cw = W - padL - padR, ch = H - padT - padB; let min = Math.min(...values), max = Math.max(...values); let span = (max - min) || Math.abs(max) || 1; min -= span * .08; max += span * .08; span = max - min;
  const X = i => padL + cw * i / (values.length - 1), Y = v => padT + ch - ((v - min) / span) * ch; const muted = dark ? '#7d8aa3' : '#94a3b8';
  ctx.strokeStyle = dark ? 'rgba(148,163,184,.12)' : 'rgba(100,116,139,.15)'; ctx.lineWidth = 1; const gl = 4;
  ctx.font = (forExport ? '600 22px' : '600 10px') + ' Vazirmatn,sans-serif'; ctx.fillStyle = muted; ctx.textAlign = 'left';
  for (let i = 0; i <= gl; i++) { const y = padT + ch * i / gl; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); if (forExport) ctx.fillText(fmt(max - span * i / gl), 28, y + 8); }
  for (let i = 1; i < values.length; i++) { const y1 = Y(values[i - 1]), y2 = Y(values[i]); const bw = Math.max(2, cw / values.length * .4); ctx.fillStyle = col + (dark ? '26' : '22'); ctx.fillRect(X(i) - bw / 2, Math.min(y1, y2), bw, Math.max(2, Math.abs(y2 - y1))); }
  const grad = ctx.createLinearGradient(0, padT, 0, H - padB); grad.addColorStop(0, col + (dark ? '59' : '47')); grad.addColorStop(1, col + '00');
  ctx.beginPath(); ctx.moveTo(X(0), Y(values[0])); for (let i = 1; i < values.length; i++) ctx.lineTo(X(i), Y(values[i])); ctx.lineTo(X(values.length - 1), H - padB); ctx.lineTo(X(0), H - padB); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); ctx.moveTo(X(0), Y(values[0])); for (let i = 1; i < values.length; i++) ctx.lineTo(X(i), Y(values[i])); ctx.strokeStyle = col; ctx.lineWidth = forExport ? 5 : 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = forExport ? 26 : 13; ctx.stroke(); ctx.shadowBlur = 0;
  const lx = X(values.length - 1), ly = Y(values[values.length - 1]); ctx.beginPath(); ctx.arc(lx, ly, forExport ? 9 : 6, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.beginPath(); ctx.arc(lx, ly, forExport ? 18 : 11, 0, 7); ctx.fillStyle = col + '33'; ctx.fill();
  ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.font = (forExport ? '600 21px' : '600 9.5px') + ' Vazirmatn,sans-serif'; const stepLbl = Math.ceil(values.length / 7);
  for (let i = 0; i < values.length; i += stepLbl) ctx.fillText('روز ' + (i + 1).toLocaleString('fa-IR'), X(i), H - padB + (forExport ? 44 : 24));
  return { X, Y, padL, padT, cw, ch };
}

function drawMainChart() { const cv = $('rateChart'); if (!cv) return; const dpr = devicePixelRatio || 1; const W = cv.clientWidth || 600, H = cv.clientHeight || 300; cv.width = W * dpr; cv.height = H * dpr; const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); chart.geo = paintChart(ctx, W, H, chart.values, { dark: document.documentElement.classList.contains('dark') }); }

function updateChartHead() { const meta = curMeta(chart.code); const vals = chart.values; if (!vals || vals.length < 2) return; const first = vals[0], last = vals[vals.length - 1]; const diff = last - first, pct = first ? diff / first * 100 : 0, up = diff >= 0; $('chartName').textContent = meta.name; $('chartCode').textContent = meta.sub + ' · ' + MARKETS[activeMarket].fa; $('chartValue').textContent = fmt(last) + ' ' + meta.unit; const chEl = $('chartChange'); chEl.className = 'chg ' + (up ? 'up' : 'down'); chEl.textContent = (up ? '▲ +' : '▼ ') + fmt(Math.abs(diff)) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)'; $('chartDate').textContent = 'بروزرسانی: ' + formatTime(new Date()); }
function refreshChart() { chart.values = seriesFor(chart.code, chart.days); updateChartHead(); drawMainChart(); }

function buildChartSelect() { const list = (activeMarket === 'iran' ? iranCurrencies : currencies).filter(c => markets[activeMarket] && markets[activeMarket][c.code]).map(c => c.code); const opts = [...list, ...Object.keys(CRYPTO)]; if (!opts.length) { $('chartSelect').innerHTML = ''; return; } if (!opts.includes(chart.code)) chart.code = opts.includes('USD') ? 'USD' : opts[0]; $('chartSelect').innerHTML = opts.map(c => '<option value="' + c + '" ' + (c === chart.code ? 'selected' : '') + '>' + curMetaAny(c).name + ' — ' + c + '</option>').join(''); }

(function () { const cv = $('rateChart'), tip = $('chartTip'); cv.addEventListener('mousemove', e => { const vals = chart.values; if (!vals || vals.length < 2 || !chart.geo) return; const r = cv.getBoundingClientRect(); const x = e.clientX - r.left; const { X, Y, padL, cw } = chart.geo; let i = Math.round((x - padL) / cw * (vals.length - 1)); i = Math.max(0, Math.min(vals.length - 1, i)); tip.textContent = fmt(vals[i]) + ' · روز ' + (i + 1).toLocaleString('fa-IR'); tip.style.left = Math.max(6, Math.min(r.width - 120, X(i) - 55)) + 'px'; tip.style.top = Math.max(6, Y(vals[i]) - 46) + 'px'; tip.style.opacity = '1'; }); cv.addEventListener('mouseleave', () => tip.style.opacity = '0'); })();

$('chartSelect').addEventListener('change', e => { chart.code = e.target.value; refreshChart() });
document.querySelectorAll('.tool-btn[data-days]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.tool-btn[data-days]').forEach(x => x.classList.remove('on')); b.classList.add('on'); chart.days = Number(b.dataset.days); refreshChart(); }));

function exportChart(dark) { const meta = curMeta(chart.code); const W = 1600, H = 900; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); const bg = dark ? '#0a0f1c' : '#f5f7fb'; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); const glow = ctx.createRadialGradient(W / 2, -60, 40, W / 2, -60, 780); glow.addColorStop(0, dark ? 'rgba(110,130,255,.32)' : 'rgba(36,87,230,.24)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H); paintChart(ctx, W, H, chart.values, { dark, forExport: true }); const t = dark ? '#f8fafc' : '#111827', m = dark ? '#8b99b3' : '#64748b'; const vals = chart.values; if (vals && vals.length >= 2) { const last = vals[vals.length - 1], first = vals[0]; const diff = last - first, pct = first ? diff / first * 100 : 0, up = diff >= 0; ctx.textAlign = 'left'; ctx.fillStyle = m; ctx.font = '700 25px Vazirmatn,sans-serif'; ctx.fillText(meta.sub, 92, 100); ctx.fillStyle = t; ctx.font = '900 58px Vazirmatn,sans-serif'; ctx.fillText(meta.name, 92, 164); ctx.font = '900 74px Vazirmatn,sans-serif'; ctx.fillText(fmt(last) + ' ' + meta.unit, 92, 256); ctx.fillStyle = up ? (dark ? '#2fe0a5' : '#079669') : (dark ? '#ff6b81' : '#dc3d52'); ctx.font = '800 33px Vazirmatn,sans-serif'; ctx.fillText((up ? '+' : '') + fmt(diff) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)', 92, 306); } ctx.textAlign = 'right'; ctx.fillStyle = m; ctx.font = '700 23px Vazirmatn,sans-serif'; ctx.fillText(new Date().toLocaleDateString('fa-IR'), W - 92, 100); ctx.fillText('Barchi Arz • برچی ارز', W - 92, H - 42); const a = document.createElement('a'); a.download = 'barchi-chart-' + chart.code + '-' + (dark ? 'dark' : 'light') + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); }
$('exportDark').addEventListener('click', () => exportChart(true));
$('exportLight').addEventListener('click', () => exportChart(false));

let rszT = null;
window.addEventListener('resize', () => { clearTimeout(rszT); rszT = setTimeout(() => { drawMainChart(); drawGoldSparks(); }, 150) });

function isMarketOpen(key) { const m = { kabul: { openMin: 480, closeMin: 1020 }, herat: { openMin: 510, closeMin: 1050 }, iran: { openMin: 540, closeMin: 1020 } }[key]; const now = new Date(); if (now.getDay() === 5) return false; const mins = now.getHours() * 60 + now.getMinutes(); return mins >= m.openMin && mins < m.closeMin; }

function goldCardHTML(data, unitLabel) { const g = data.gold; if (!g) return ''; const rows = GOLD_PATTERNS.filter(gp => g[gp[0]]).map(gp => '<div class="gold-row"><b>' + gp[1] + '</b><div class="gp"><span class="b">' + fmt(g[gp[0]].buy) + ' ' + unitLabel + '</span><span class="s">' + fmt(g[gp[0]].sell) + ' ' + unitLabel + '</span></div></div>').join(''); if (!rows) return ''; const coin = g.coin ? g.coin : null; return '<div class="gold-card"><img class="gold-logo" src="' + GOLD_LOGO + '" alt="سکه امامی" onerror="this.style.display=\'none\'"><div class="gold-info"><h4>سکه امامی</h4><span>طلای آب‌شده و نقره — نرخ لحظه‌ای (' + unitLabel + ')</span></div>' + (coin ? '<div class="gold-prices"><div class="gold-buy"><small>خرید</small><strong>' + fmt(coin.buy) + '</strong></div><div class="gold-sell"><small>فروش</small><strong>' + fmt(coin.sell) + '</strong></div></div>' : '') + '<div class="gold-rows">' + rows + '</div></div>'; }

function renderMarket() {
  const m = MARKETS[activeMarket]; const data = markets[activeMarket] || {};
  const list = (activeMarket === 'iran' ? iranCurrencies : currencies).filter(c => data[c.code]);
  const open = isMarketOpen(activeMarket); const goldHtml = goldCardHTML(data, m.unitLabel);
  const rows = list.length ? '<table class="mtable"><thead><tr><th>ارز</th><th>خرید (' + m.unitLabel + ')</th><th>فروش (' + m.unitLabel + ')</th></tr></thead><tbody>' + list.map(c => '<tr><td><div class="cur">' + flagImg(c.cc) + '<div class="cname"><h3>' + c.fa + '</h3><span>' + c.code + (c.unit >= 1e6 ? ' · هر ۱ میلیون' : c.unit >= 1000 ? ' · هر ۱٬۰۰۰' : '') + '</span></div></div></td><td class="num">' + fmt(data[c.code].buy) + '</td><td class="num">' + fmt(data[c.code].sell) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty-note">داده‌ای در دسترس نیست.</div>';
  $('marketView').innerHTML = '<div class="market-head"><span class="m-icon">' + MARKET_ICONS[activeMarket] + '</span><div class="m-titles"><h4>' + m.fa + '<span class="m-sub">' + m.sub + '</span></h4><span class="m-hours">' + (activeMarket === 'kabul' ? 'شنبه تا پنجشنبه · ۸:۰۰ صبح تا ۵:۰۰ عصر' : activeMarket === 'herat' ? 'شنبه تا پنجشنبه · ۸:۳۰ صبح تا ۵:۳۰ عصر' : 'شنبه تا پنجشنبه · ۹:۰۰ صبح تا ۵:۰۰ عصر') + '</span></div><span class="m-status ' + (open ? 'open' : 'closed') + '"><i class="dot"></i>' + (open ? 'باز' : 'بسته') + '</span></div>' + goldHtml + rows;
  updateHeroFeature(); renderIranGold(); buildCvCur(); renderChips();
}

document.querySelectorAll('.m-tab').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.m-tab').forEach(x => x.classList.remove('active')); btn.classList.add('active'); activeMarket = btn.dataset.market; renderMarket(); buildChartSelect(); refreshChart(); }));
setInterval(renderMarket, 60000);

function updateHeroFeature() { const m = MARKETS[activeMarket]; const data = markets[activeMarket] || {}; const u = data.USD; if (!u) { $('heroFeature').innerHTML = ''; return; } $('heroFeature').innerHTML = '<div class="hf-item">' + flagImg('us') + '<div class="hf-name"><h3>دالر آمریکا — ' + m.fa + '</h3><span>USD · ' + m.unitLabel + '</span></div><div class="hf-prices"><div class="hf-buy"><small>خرید</small><strong>' + fmt(u.buy) + '</strong></div><div class="hf-sell"><small>فروش</small><strong>' + fmt(u.sell) + '</strong></div></div></div>'; }

function seriesGold(mk, key, n) { const h = HIST[mk + ':g_' + key] || []; if (h.length >= 5) return h.slice(-n).map(x => x.v); const cur = markets[mk] && markets[mk].gold && markets[mk].gold[key] ? markets[mk].gold[key].sell : NaN; return genHistory('g_' + key + '@' + mk, cur, n); }

function renderIranGold() {
  const g = (markets.iran && markets.iran.gold) || {};
  const items = [['coin', 'سکه امامی', 'سکه بهار آزادی طرح امامی'], ['melted', 'طلای آب‌شده', 'طلای ۱۸ عیار (۷۵۰)'], ['silver', 'نقره', 'هر گرم نقره']];
  const rows = items.filter(([k]) => g[k]);
  if (!rows.length) { $('goldIranView').innerHTML = '<div class="empty-note" style="grid-column:1/-1">داده‌ای از بخش طلا دریافت نشد — پس از بروزرسانی منبع نمایش داده می‌شود.</div>'; return; }
  $('goldIranView').innerHTML = rows.map(([k, fa, sub], i) => '<div class="gcard" style="animation-delay:' + (i * 60) + 'ms"><div class="g-top"><img src="' + GOLD_LOGO + '" alt="' + fa + '" onerror="this.style.display=\'none\'"><div><h4>' + fa + '</h4><span class="g-sub">' + sub + '</span></div></div><canvas class="g-spark" data-gspark="' + k + '" width="600" height="128"></canvas><div class="g-prices"><div class="gb"><small>خرید (تومان)</small><b>' + fmt(g[k].buy) + '</b></div><div class="gs"><small>فروش (تومان)</small><b>' + fmt(g[k].sell) + '</b></div></div><span class="g-src">هر بروزرسانی ۲۰ تا ۲۵ دقیقه</span></div>').join('');
  drawGoldSparks();
}

function drawGoldSparks() { document.querySelectorAll('canvas[data-gspark]').forEach(cnv => { const dark = document.documentElement.classList.contains('dark'); const vals = seriesGold('iran', cnv.dataset.gspark, 24); const ctx = cnv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(2, 2); drawSpark(ctx, 300, 64, vals, dark); }); }

async function fetchCrypto() {
  $('cryptoView').innerHTML = '<div class="loading"><div class="spinner"></div><p>در حال دریافت اطلاعات...</p></div>';
  try {
    const r = await fetch(API_BASE + '/api/crypto'); if (!r.ok) throw 0; const data = await r.json();
    CRYPTO = {};
    data.forEach(c => { const code = c.symbol.toUpperCase(); CRYPTO[code] = { name: c.name, symbol: c.symbol, price: c.current_price, image: c.image, market_cap: c.market_cap, chg: Number(c.price_change_percentage_24h || 0), spark: (c.sparkline_in_7d && Array.isArray(c.sparkline_in_7d.price) && c.sparkline_in_7d.price.length > 20) ? c.sparkline_in_7d.price : null }; });
    $('cryptoView').innerHTML = data.map((c, i) => { const ch = Number(c.price_change_percentage_24h || 0); const up = ch >= 0; return '<article class="card crypto-card" style="animation-delay:' + (i * 35) + 'ms"><div class="card-top"><div class="currency-id"><img class="crypto-icon" src="' + c.image + '" alt=""><div class="cname"><h3>' + c.name + '</h3><span>' + c.symbol.toUpperCase() + '</span></div></div><span class="code">USD</span></div><div class="coin-row"><div class="coin-price">$' + fmt(c.current_price) + '</div><span class="coin-badge ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + (up ? '+' : '') + ch.toFixed(2) + '%</span></div><div class="meta"><span>مارکت کپ</span><strong style="direction:ltr">' + fmtUsd(c.market_cap) + '</strong></div></article>'; }).join('');
    renderChips(); buildChartSelect(); refreshChart(); return data;
  } catch (e) { $('cryptoView').innerHTML = '<div class="error">دریافت ارزهای دیجیتال انجام نشد.</div>'; return null }
}

function renderCryptoToman(data) {
  const rate = markets.iran && markets.iran.USD ? Number(markets.iran.USD.buy) : 0;
  if (!data) { $('cryptoTomanView').innerHTML = '<div class="error">دریافت ارزهای دیجیتال انجام نشد.</div>'; return; }
  if (!rate) { $('cryptoTomanView').innerHTML = '<div class="empty-note">برای محاسبه به تومان ابتدا نرخ دلار بازار ایران باید دریافت شود.</div>'; return; }
  $('cryptoTomanView').innerHTML = data.map((c, i) => { const ch = Number(c.price_change_percentage_24h || 0); const up = ch >= 0; const toman = c.current_price * rate; return '<article class="card crypto-card" style="animation-delay:' + (i * 35) + 'ms"><div class="card-top"><div class="currency-id"><img class="crypto-icon" src="' + c.image + '" alt=""><div class="cname"><h3>' + c.name + '</h3><span>' + c.symbol.toUpperCase() + '</span></div></div><span class="code">تومان</span></div><div class="coin-row"><div class="coin-price">' + fmtToman(toman) + '</div><span class="coin-badge ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + (up ? '+' : '') + ch.toFixed(2) + '%</span></div><div class="meta"><span>نرخ دلار</span><strong>' + fmt(rate) + ' تومان</strong></div></article>'; }).join('');
}

async function fetchCryptoToman() { $('cryptoTomanView').innerHTML = '<div class="loading"><div class="spinner"></div><p>در حال دریافت اطلاعات...</p></div>'; const data = await fetchCrypto(); renderCryptoToman(data); }

const KEY_DEFS = [['C', 'util'], ['±', 'util'], ['%', 'util'], ['÷', 'op'], ['7', ''], ['8', ''], ['9', ''], ['×', 'op'], ['4', ''], ['5', ''], ['6', ''], ['−', 'op'], ['1', ''], ['2', ''], ['3', ''], ['+', 'op'], ['0', 'zero'], ['.', ''], ['=', 'op']];
$('calcKeys').innerHTML = KEY_DEFS.map(([k, cls]) => '<button class="ck ' + cls + '" data-k="' + k + '">' + k + '</button>').join('');
const calc = { expr: '', justEq: false };
function safeEval(s) { if (!s || !/[\\d)]$/.test(s)) return null; if (!/^[\\d+\\-*/.()\\s]+$/.test(s)) return null; try { const v = Function('"use strict";return(' + s + ')')(); return Number.isFinite(v) ? v : null } catch (e) { return null } }
function calcRender() { $('calcExpr').textContent = calc.expr; const v = safeEval(calc.expr); $('calcResult').textContent = v === null ? (calc.expr ? '...' : '0') : fmt(Number(parseFloat(v.toFixed(6)))); }
function calcPress(k) { if (k === 'C') { calc.expr = ''; calc.justEq = false; } else if (k === '=') { const v = safeEval(calc.expr); if (v !== null) { calc.expr = String(parseFloat(v.toFixed(6))); calc.justEq = true; } } else if (k === '±') { const v = safeEval(calc.expr); if (v !== null) { calc.expr = String(parseFloat((-v).toFixed(6))); } } else if (k === '%') { calc.expr = calc.expr.replace(/(\\d+\\.?\\d*)$/, '($1/100)'); } else { if (calc.justEq && /[0-9.]/.test(k)) calc.expr = ''; calc.justEq = false; const map = { '÷': '/', '×': '*', '−': '-', '+': '+' }; calc.expr += map[k] || k; } calcRender(); }
$('calcKeys').addEventListener('click', e => { const b = e.target.closest('.ck'); if (!b) return; calcPress(b.dataset.k); });
document.querySelectorAll('.ctab').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.ctab').forEach(x => x.classList.remove('on')); b.classList.add('on'); document.querySelectorAll('.calc-view').forEach(v => v.classList.remove('on')); $('cv-' + b.dataset.cv).classList.add('on'); }));
function calcProfit() { const b = parseFloat($('pBuy').value), s = parseFloat($('pSell').value), q = parseFloat($('pQty').value) || 1; if (!Number.isFinite(b) || !Number.isFinite(s)) { $('pUnit').textContent = '—'; $('pTotal').textContent = '—'; $('pPct').textContent = '—'; return; } const u = s - b, t = u * q, pct = b ? (u / b * 100) : 0; $('pUnit').textContent = fmt(u); $('pTotal').textContent = fmt(t); $('pPct').textContent = pct.toFixed(2) + '%'; $('pTotalRow').classList.toggle('loss', t < 0); }
['pBuy', 'pSell', 'pQty'].forEach(id => $(id).addEventListener('input', calcProfit));
function buildCvCur() { const list = (activeMarket === 'iran' ? iranCurrencies : currencies).filter(c => markets[activeMarket] && markets[activeMarket][c.code]); const sel = $('cvCur'); const prev = sel.value; sel.innerHTML = list.map(c => '<option value="' + c.code + '">' + c.fa + ' (' + c.code + ')</option>').join(''); if ([...sel.options].some(o => o.value === prev)) sel.value = prev; calcConvert(); }
function calcConvert() { const code = $('cvCur').value; const d = markets[activeMarket] && markets[activeMarket][code]; const amt = parseFloat($('cvAmt').value); const mLabel = MARKETS[activeMarket].unitLabel; if (!d || !Number.isFinite(amt)) { $('cvRes').textContent = '—'; $('cvRate').textContent = '—'; return; } const unit = d.unit || 1; const dir = $('cvDir').value; let res, rate; if (dir === 'toCur') { rate = d.sell / unit; res = amt / rate; } else { rate = d.buy / unit; res = amt * rate; } $('cvRes').textContent = fmt(res) + ' ' + (dir === 'toCur' ? code : mLabel); $('cvRate').textContent = fmt(rate) + ' ' + mLabel + ' / ' + code + (unit > 1 ? ' (هر ' + unit.toLocaleString('fa-IR') + ')' : ''); }
['cvCur', 'cvAmt', 'cvDir'].forEach(id => $(id).addEventListener('input', calcConvert));
$('calcFab').addEventListener('click', () => $('calcPanel').classList.toggle('show'));
$('calcClose').addEventListener('click', () => $('calcPanel').classList.remove('show'));
(function () { const p = $('calcPanel'), h = $('calcHead'); let drag = false, sx = 0, sy = 0, ox = 0, oy = 0; h.addEventListener('pointerdown', e => { if (e.target.closest('.close')) return; drag = true; sx = e.clientX; sy = e.clientY; const r = p.getBoundingClientRect(); ox = r.left; oy = r.top; p.style.left = ox + 'px'; p.style.top = oy + 'px'; p.style.insetInlineEnd = 'auto'; p.style.bottom = 'auto'; h.setPointerCapture(e.pointerId); }); h.addEventListener('pointermove', e => { if (!drag) return; const nx = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, ox + e.clientX - sx)); const ny = Math.max(8, Math.min(innerHeight - p.offsetHeight - 8, oy + e.clientY - sy)); p.style.left = nx + 'px'; p.style.top = ny + 'px'; }); h.addEventListener('pointerup', () => drag = false); })();

const legal = { terms: { t: 'شرایط استفاده', b: 'این وب‌سایت صرفاً برای اطلاع‌رسانی نرخ ارز و داده‌های بازار طراحی شده است. نرخ‌ها ممکن است با بازار لحظه‌ای تفاوت داشته باشند و استفاده از اطلاعات برای تصمیم‌های مالی بر عهده کاربر است.' }, privacy: { t: 'حریم خصوصی', b: 'برچی ارز برای نمایش نرخ‌ها نیاز به ثبت‌نام کاربر ندارد. این نسخه اطلاعات هویتی یا مالی کاربر را در سامانه خود ذخیره نمی‌کند و نرخ‌ها به‌صورت مستقیم از منبع عمومی دریافت می‌شوند.' }, legal: { t: 'موارد حقوقی', b: 'نام، طراحی و نشان برچی ارز متعلق به صاحب وب‌سایت است. اطلاعات نرخ از منابع عمومی دریافت می‌شود و برچی ارز صحت یا ثبات دائمی داده‌های منبع را تضمین نمی‌کند.' } };
function openLegal(k) { $('modalTitle').textContent = legal[k].t; $('modalBody').textContent = legal[k].b; $('modal').classList.add('show') }
function closeModal() { $('modal').classList.remove('show') }

async function fetchRates() {
  $('marketView').innerHTML = '<div class="loading"><div class="spinner"></div><p>در حال دریافت نرخ‌ها...</p></div>';
  try {
    const r = await fetch(API_BASE + '/api/rates'); if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    markets = data.markets; lastSourceTime = new Date(data.ts);
    $('marketNote').textContent = 'آخرین ثبت: ' + formatTime(lastSourceTime);
    renderMarket(); buildChartSelect(); refreshChart();
  } catch (err) {
    console.error(err);
    const cache = localStorage.getItem('barchi_rates');
    if (cache) { try { const p = JSON.parse(cache); markets = p.markets || { kabul: {}, herat: {}, iran: {} }; lastSourceTime = new Date(p.ts); $('marketNote').textContent = 'آخرین ثبت: ' + formatTime(lastSourceTime); renderMarket(); buildChartSelect(); refreshChart(); return; } catch (e) { } }
    $('marketView').innerHTML = '<div class="error">دریافت نرخ‌ها انجام نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</div>';
  }
}

(async () => {
  $('loaderLogo').src = document.documentElement.classList.contains('dark') ? LOGO_DARK : LOGO_LIGHT;
  await fetchRates(); await fetchCryptoToman();
  $('loader').classList.add('hide');
  setTimeout(() => { const l = $('loader'); if (l) l.remove(); }, 700);
  setInterval(fetchRates, 22 * 60 * 1000);
})();
</script>
</body>
</html>`;
}

// ============================================
// هندلر اصلی Worker
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API: دریافت نرخ‌ها
    if (path === '/api/rates') {
      const rates = await fetchRates();
      if (rates) {
        return new Response(JSON.stringify(rates), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(JSON.stringify({ error: 'fetch failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // API: دریافت ارز دیجیتال
    if (path === '/api/crypto') {
      const crypto = await fetchCrypto();
      if (crypto) {
        return new Response(JSON.stringify(crypto), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(JSON.stringify({ error: 'crypto fetch failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // API: ارسال دستی به تلگرام (برای تست)
    if (path === '/api/send-telegram') {
      const rates = await fetchRates();
      const crypto = await fetchCrypto();
      if (rates) {
        const post = buildTelegramPost(rates, crypto);
        const botToken = env.TG_BOT_TOKEN;
        if (!botToken) {
          return new Response(JSON.stringify({ error: 'TG_BOT_TOKEN not set' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        const sent = await sendToTelegram(botToken, post);
        return new Response(JSON.stringify({ sent, post }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'no rates data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // صفحه اصلی سایت
    if (path === '/' || path === '/index.html') {
      const html = getHTML();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  },

  // کرون جاب — اجرای خودکار هر ۲۰ دقیقه
  async scheduled(event, env, ctx) {
    console.log('Cron triggered at:', new Date().toISOString());

    const rates = await fetchRates();
    const crypto = await fetchCrypto();

    if (rates) {
      const post = buildTelegramPost(rates, crypto);
      const botToken = env.TG_BOT_TOKEN;
      if (botToken) {
        await sendToTelegram(botToken, post);
      } else {
        console.error('TG_BOT_TOKEN not configured!');
      }
    } else {
      console.error('Could not fetch rates for Telegram post');
    }
  }
};

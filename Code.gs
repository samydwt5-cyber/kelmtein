/**
 * KELMTEIN | كلمتين — الواجهة الخلفية (Google Apps Script) — الإصدار 2
 * سكربت مرتبط بملف Google Sheets (Container-bound).
 * النشر: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 * لا توجد أسرار في هذا الملف. كلمة مرور المدير تُحفظ (مشفّرة بملح) في Script Properties.
 */
var VERSION = '3.0.0';
var TZ = 'Asia/Riyadh';
var FONT_COUNT = 7;
var SESSION_TTL = 21600;           // 6 ساعات (الحد الأقصى لـ CacheService)
var MAX_BODY = 90000;              // حد حجم الطلب العام (طلبات الزبائن وتسجيل الدخول)
var MAX_ADMIN_BODY = 2600000;      // حد حجم طلبات المدير (رفع الصور بعد الضغط)
var MAX_UPLOAD_B64 = 2200000;      // حد حجم الصورة المرفوعة (Base64)

var SHEETS = {
  Settings:   ['key', 'value', 'updatedAt'],
  Pricing:    ['key', 'value', 'label'],
  Products:   ['id', 'kind', 'name', 'active', 'sort', 'price', 'data'],
  Orders:     ['id', 'createdAt', 'status', 'name', 'phone', 'city', 'district', 'address', 'notes', 'qty', 'total', 'clientTotal', 'marketing', 'summary', 'breakdown', 'previewToken', 'internalNotes', 'updatedAt', 'region', 'reqId'],
  OrderItems: ['orderId', 'cup', 'color', 'place', 'text', 'text2', 'font', 'sizePct', 'position', 'amount'],
  Previews:   ['token', 'orderId', 'design', 'createdAt', 'expiresAt', 'revoked', 'approval', 'approvalNote', 'approvalAt'],
  AdminLog:   ['time', 'action', 'details']
};

var STATUSES = { 'new': 'جديد', confirmed: 'تم التأكيد', progress: 'قيد التنفيذ', ready: 'جاهز', delivered: 'تم التوصيل', done: 'مكتمل', cancelled: 'ملغي' };
/** الحالات كما تظهر للعميل (القيم المخزّنة في عمود status لا تتغير أبداً). */
var STATUS_CLIENT = { 'new': 'تم استلام طلبك', confirmed: 'تم تأكيد طلبك', progress: 'قيد التجهيز', ready: 'جاهز', delivered: 'تم التسليم', done: 'مكتمل', cancelled: 'ملغي' };
/** قوالب رسائل واتساب الافتراضية (تُعدَّل من لوحة الإدارة ← إدارة المتجر ← رسائل واتساب).
 *  المتغيرات: {name} {order} {total} {status} {store} {link} */
var WA_TEMPLATES_DEFAULT = [
  { id: 'received', title: 'تأكيد استلام الطلب', body: 'هلا {name} 🌿\nوصلنا طلبك رقم {order} في {store}، وإجمالي الطلب {total}.\nنراجع التصميم ونرجع لك بالتأكيد بإذن الله.\n🔗 تتبّع طلبك من هنا: {link}\nشكراً لثقتك فينا ☕' },
  { id: 'design', title: 'طلب توضيح أو تعديل على التصميم', body: 'هلا {name}، معك {store} 🌿\nبخصوص طلبك {order}: نبغى نتأكد من تفاصيل التصميم قبل الحفر.\n(اكتب هنا النقطة اللي تحتاج توضيح أو تعديل)\n🔗 معاينة التصميم: {link}\nننتظر ردك ونكمل مباشرة، ويعطيك العافية 🙏' },
  { id: 'confirm', title: 'تأكيد الطلب', body: 'هلا {name} 🌿\nتم تأكيد طلبك {order}، وإجمالي الطلب {total}.\n🔗 تتبّع طلبك واعتمد التصميم من هنا: {link}\nنبدأ التنفيذ فور اعتمادك للتصميم 🙏' },
  { id: 'approve', title: 'طلب اعتماد التصميم', body: 'هلا {name} 🌿\nتصميم طلبك {order} جاهز للمراجعة.\n🔗 تتبّع طلبك واعتمد التصميم أو اطلب تعديلاً من هنا: {link}\nما نبدأ الحفر إلا بعد اعتمادك 🙏' },
  { id: 'out', title: 'خارج للتسليم', body: 'هلا {name} 🌿\nطلبك {order} خارج للتسليم الحين 🚚\nتتبّع طلبك من هنا: {link}\nكلمتين تشكرك على ثقتك 🤍' },
  { id: 'delivered', title: 'تم التسليم وشكراً', body: 'هلا {name} 🌿\nتم تسليم طلبك {order}، نتمنى يعجبك ويكون هدية تفرّح 🎁\nإذا حاب تشاركنا رأيك أو صورة الكوب يسعدنا ذلك 🤍' },
  { id: 'ready', title: 'الطلب جاهز', body: 'أبشر {name} 🎁\nطلبك رقم {order} جاهز.\nنتفق معك على وقت الاستلام أو التوصيل اللي يناسبك، وشكراً لاختيارك {store}.' },
  { id: 'status', title: 'تحديث حالة الطلب', body: 'هلا {name}، تحديث بسيط على طلبك {order}:\nالحالة الحالية: {status}.\nأي استفسار نحن حاضرين، وشكراً لصبرك 🌿' }
];
var BASE_COLORS = [
  { id: 'cream', name: 'كريمي', hex: '#e1d0b4' },
  { id: 'grey', name: 'رمادي حجري', hex: '#a09b96' },
  { id: 'olive', name: 'زيتوني', hex: '#acb982' }
];
var PRICE_LABELS = {
  first: 'سعر أول مكان نقش (يشمل الكوب)', extra: 'إضافة كل مكان نقش آخر', line: 'سطر إضافي',
  logo: 'الشعار', wrap1: 'تغليف كوب واحد', wrapP: 'تغليف كوبين معاً', wrapE: 'تغليف لكل كوب'
};
var DEFAULT_PRICES = { first: 50, extra: 10, line: 10, logo: 20, wrap1: 10, wrapP: 15, wrapE: 20 };
var PLACES = { f: 'الواجهة الأمامية', i: 'داخل الكوب عند الشفة', b: 'قاع الكوب من الداخل' };
var FONT_NAMES = ['رقعة', 'نسخ', 'كوفي', 'زخرفي', 'مرزا', 'Script', 'Serif'];

var SETTING_DEFAULTS = {
  wa: '966538107285', ig: 'kelmtein.sa', tt: 'kelmtein_', siteUrl: '', storeName: 'كلمتين',
  heroTitle: 'اكتب كلمتك، وشوفها تنحفر على كوبك.',
  heroSub: 'اختر اللون ومكان الحفر والخط، والمعاينة على الكوب الحقيقي تتحدث مع كل حرف. وإذا عجبك التصميم أرسله لنا على واتساب.',
  mq: ['حفر ليزر دقيق', 'سيراميك مطفي بجودة جميلة', 'تغليف هدايا أنيق', 'خصّص كوبك باسمك وعبارتك', 'توصيل لأبها وخميس مشيط وأحد رفيدة وغيرها حسب التوفر'],
  announce: '', announceOn: '0', hours: '', address: '', deliveryPolicy: '', returnPolicy: '', orderPolicy: '',
  previewDays: '90',
  sections: [{ id: 'gallery', on: true }, { id: 'steps', on: true }, { id: 'faq', on: true }, { id: 'info', on: true }],
  blocks: [],
  faq: [
    { q: 'كم يستغرق التنفيذ؟', a: 'نؤكد لك المدة عند تأكيد الطلب حسب الضغط.' },
    { q: 'هل أقدر أضيف شعاري؟', a: 'نعم، ارفعه هنا وأرسل لنا الملف الأصلي في واتساب.' },
    { q: 'هل المعاينة نفس النتيجة تماماً؟', a: 'قريبة جداً، وقد يختلف عمق الحفر ولونه قليلاً حسب الكوب.' },
    { q: 'هل التوصيل متاح لمدينتي؟', a: 'نوصّل لأبها وخميس مشيط وأحد رفيدة وغيرها حسب الإمكانية، ونؤكد لك التوصيل والتكلفة عند استلام الطلب.' }
  ],
  fontsHide: [],
  waTemplates: WA_TEMPLATES_DEFAULT
};
var JSON_SETTINGS = { mq: 1, sections: 1, blocks: 1, faq: 1, fontsHide: 1, waTemplates: 1 };
var TEXT_LIMITS = { wa: 20, ig: 60, tt: 60, siteUrl: 200, storeName: 60, heroTitle: 120, heroSub: 400, announce: 300, announceOn: 1, hours: 300, address: 300, deliveryPolicy: 2000, returnPolicy: 2000, orderPolicy: 2000, previewDays: 4 };

/* ============================ أدوات عامة ============================ */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail_(msg) { return { ok: false, err: msg }; }
function safe_(v, n) {
  v = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n || 300);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
function un_(v) { v = String(v == null ? '' : v); return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v; }
function clean_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n || 300); }
function truthy_(v) { return v === true || v === 1 || /^(true|1|yes|نعم)$/i.test(String(v)); }
function num_(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
function jparse_(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function now_() { return new Date(); }
function dstr_(d, f) { return Utilities.formatDate(new Date(d), TZ, f); }

function rnd_(chars, n) {
  var s = '', u = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  for (var i = 0; i < n; i++) s += chars.charAt(parseInt(u.substr(i * 2, 2), 16) % chars.length);
  return s;
}
function token_() { return rnd_('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 16); }   // 16×5 بت = 80 بت عشوائية
function orderId_() { return 'KL-' + Date.now().toString(36).toUpperCase() + rnd_('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 2); }
function rowId_(p) { return p + '_' + rnd_('abcdefghjkmnpqrstuvwxyz23456789', 8); }

function sha_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ((x < 0 ? x + 256 : x).toString(16)).replace(/^(.)$/, '0$1'); }).join('');
}

/* ============================ الجداول ============================ */
function sh_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) { setupSheets(); s = ss_().getSheetByName(name); }
  return s;
}
function rows_(name) {
  var s = sh_(name), last = s.getLastRow();
  if (last < 2) return [];
  var h = SHEETS[name], v = s.getRange(1, 1, last, h.length).getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    var o = { _row: i + 1 };
    for (var j = 0; j < h.length; j++) o[h[j]] = v[i][j];
    out.push(o);
  }
  return out;
}
function append_(name, obj) {
  sh_(name).appendRow(SHEETS[name].map(function (k) { return obj[k] === undefined ? '' : obj[k]; }));
}
function setCells_(name, row, obj) {
  var s = sh_(name), h = SHEETS[name];
  for (var k in obj) { var c = h.indexOf(k); if (c >= 0) s.getRange(row, c + 1).setValue(obj[k]); }
}
function delRow_(name, row) { sh_(name).deleteRow(row); }

/** يطبّع رقم الجوال إلى الصيغة الدولية +CCNNNN. يقبل الصيغ السعودية القديمة (05xxxxxxxx / 5xxxxxxxx / 966… / 00966…)
 *  وأي رقم دولي يبدأ بـ + أو 00. يرجع '' إذا كان غير صالح. أرقام +966 يجب أن تكون 5xxxxxxxx (9 أرقام). */
function phone_(v) {
  var s = String(v == null ? '' : v).replace(/[\s\-().]/g, '');
  if (/^00[1-9]/.test(s)) s = '+' + s.slice(2);
  var m = s.match(/^(?:\+?966|0)?(5\d{8})$/);
  if (m) return '+966' + m[1];
  if (/^\+966/.test(s)) return '';
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : '';
}

/** يضيف ترويسات الأعمدة الجديدة للأوراق القائمة (آمن: لا يغيّر البيانات ولا ترتيب الأعمدة). */
function migrateHeaders_() {
  var ss = ss_();
  Object.keys(SHEETS).forEach(function (n) {
    var s = ss.getSheetByName(n); if (!s) return;
    var want = SHEETS[n], have = s.getRange(1, 1, 1, Math.max(want.length, s.getLastColumn())).getValues()[0];
    for (var i = 0; i < want.length; i++) if (!have[i]) s.getRange(1, i + 1).setValue(want[i]);
  });
}

/** ينشئ الأوراق والترويسات والقيم الافتراضية (آمن للتكرار: لا يمسح بيانات موجودة). */
function setupSheets() {
  var ss = ss_();
  Object.keys(SHEETS).forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (!s) { s = ss.insertSheet(n); s.appendRow(SHEETS[n]); s.setFrozenRows(1); }
  });
  migrateHeaders_();
  if (ss.getSheetByName('Settings').getLastRow() < 2) {
    Object.keys(SETTING_DEFAULTS).forEach(function (k) {
      var v = SETTING_DEFAULTS[k];
      ss.getSheetByName('Settings').appendRow([k, JSON_SETTINGS[k] ? JSON.stringify(v) : v, now_()]);
    });
  }
  if (ss.getSheetByName('Pricing').getLastRow() < 2) {
    Object.keys(DEFAULT_PRICES).forEach(function (k) { ss.getSheetByName('Pricing').appendRow([k, DEFAULT_PRICES[k], PRICE_LABELS[k]]); });
  }
  if (ss.getSheetByName('Products').getLastRow() < 2) {
    BASE_COLORS.forEach(function (c, i) {
      ss.getSheetByName('Products').appendRow([c.id, 'color', c.name, true, i + 1, 0, JSON.stringify({ hex: c.hex, builtin: true })]);
    });
  }
  return 'OK';
}

/* ============================ الإعدادات والأسعار والمنتجات ============================ */
function settings_() {
  var o = {}, k;
  for (k in SETTING_DEFAULTS) o[k] = SETTING_DEFAULTS[k];
  rows_('Settings').forEach(function (r) {
    k = String(r.key);
    if (!(k in SETTING_DEFAULTS)) return;
    o[k] = JSON_SETTINGS[k] ? jparse_(r.value, SETTING_DEFAULTS[k]) : String(r.value == null ? '' : r.value);
  });
  return o;
}
function prices_() {
  var P = {}, k;
  for (k in DEFAULT_PRICES) P[k] = DEFAULT_PRICES[k];
  rows_('Pricing').forEach(function (r) { if (r.key in DEFAULT_PRICES) { var n = Number(r.value); if (isFinite(n) && n >= 0) P[r.key] = n; } });
  return P;
}
function products_(kind) {
  return rows_('Products').filter(function (r) { return !kind || r.kind === kind; }).map(function (r) {
    return { id: String(r.id), kind: r.kind, name: un_(r.name), active: truthy_(r.active), sort: num_(r.sort, 0), price: num_(r.price, 0), data: jparse_(r.data, {}), _row: r._row };
  }).sort(function (a, b) { return a.sort - b.sort; });
}
/** قائمة الألوان بالترتيب الذي يعتمد عليه المتجر: الأساسية الثلاثة أولاً ثم المخصصة بترتيب sort */
function colors_() {
  var all = products_('color'), base = [], custom = [];
  BASE_COLORS.forEach(function (b) {
    var f = all.filter(function (c) { return c.id === b.id; })[0];
    base.push(f || { id: b.id, name: b.name, active: true, price: 0, data: { hex: b.hex, builtin: true } });
  });
  all.forEach(function (c) { if (!/^(cream|grey|olive)$/.test(c.id)) custom.push(c); });
  return { base: base, custom: custom, all: base.concat(custom) };
}
function colorByKey_(cs, key) {
  key = String(key || '');
  var m = /^c(\d+)$/.exec(key), i;
  if (m) { i = Number(m[1]); return cs.custom[i] || null; }
  for (i = 0; i < cs.base.length; i++) if (cs.base[i].id === key) return cs.base[i];
  return null;
}
function regions_(onlyActive) {
  return products_('region').filter(function (r) { return !onlyActive || r.active; }).map(function (r) {
    var d = r.data || {};
    return { id: r.id, name: r.name, on: r.active, sort: r.sort, target: d.target === 'logo' ? 'logo' : 'text', cup: d.cup || 'all', view: 'f', cx: num_(d.cx, .5), cy: num_(d.cy, .5), w: num_(d.w, .3), h: num_(d.h, .1) };
  });
}

/** الإعدادات العامة للمتجر (لا تحتوي أي بيانات عملاء أو أسرار) */
function publicConfig_() {
  var cache = CacheService.getScriptCache(), hit = null;
  try { hit = cache.get('cfg'); } catch (e) {}
  if (hit) return JSON.parse(hit);
  var st = settings_(), cs = colors_(), hide = [], cn = {}, cp = {}, CC = [];
  cs.base.forEach(function (c, i) { cn[i] = c.name; if (c.price) cp[i] = c.price; if (!c.active) hide.push(i); });
  cs.custom.forEach(function (c, j) {
    var d = c.data || {};
    if (!c.active) hide.push(3 + j);
    CC.push({ id: c.id, n: c.name, h: d.hex || '#c8b89a', p: c.price, img: c.active ? (d.imgId || '') : '', w: d.w || 800, ht: d.ht || 800 });
  });
  var gal = products_('gallery').filter(function (g) { return g.active; }).map(function (g) {
    var d = g.data || {};
    return { id: g.id, t: d.thumb ? 'https://lh3.googleusercontent.com/d/' + d.thumb : '', f: d.full ? 'https://lh3.googleusercontent.com/d/' + d.full : '', c: g.name, g: d.group || '', home: d.home !== false };
  });
  var cfg = {
    version: VERSION, wa: st.wa, ig: st.ig, tt: st.tt, siteUrl: st.siteUrl, storeName: st.storeName,
    MQ: st.mq, P: prices_(), hide: hide, cn: cn, cp: cp, CC: CC, regions: regions_(true), GAL: gal, fontsHide: st.fontsHide,
    site: { heroTitle: st.heroTitle, heroSub: st.heroSub, announce: st.announceOn === '1' ? st.announce : '', hours: st.hours, address: st.address, deliveryPolicy: st.deliveryPolicy, returnPolicy: st.returnPolicy, orderPolicy: st.orderPolicy, sections: st.sections, blocks: st.blocks.filter(function (b) { return b.on !== false; }), faq: st.faq }
  };
  try { cache.put('cfg', JSON.stringify(cfg), 60); } catch (e) {}
  return cfg;
}
function dropCache_() { try { var c = CacheService.getScriptCache(); c.remove('cfg'); c.remove('dash'); } catch (e) {} }
function dropDash_() { try { CacheService.getScriptCache().remove('dash'); } catch (e) {} }
function onEdit() { dropCache_(); }   // يُحدّث المتجر بعد تعديل مباشر في Sheets

/* ============================ حساب السعر (نفس منطق calc() في المتجر تماماً) ============================ */
function priceOrder_(d, P, cs) {
  var rows = [], u = 0, m, k, first, any, cup, pl, v, col, pf;
  for (m = 0; m < d.n; m++) {
    cup = d.cups[m]; pf = d.n > 1 ? 'كوب ' + (m + 1) + ' — ' : ''; first = 1; any = 0;
    col = colorByKey_(cs, cup.ck);
    ['f', 'i', 'b'].forEach(function (k) {
      pl = cup.p[k];
      if (!pl.t.trim()) return;
      any = 1; v = first ? P.first : P.extra; first = 0; u += v;
      rows.push([pf + PLACES[k] + ': ' + pl.t + (pl.two && pl.t2 ? ' / ' + pl.t2 : '') + ' [' + FONT_NAMES[pl.fo] + ']', v]);
      if (pl.two && pl.t2) { u += P.line; rows.push([pf + 'سطر إضافي', P.line]); }
    });
    if (any && col && col.price) { u += col.price; rows.push([pf + 'فرق سعر اللون', col.price]); }
    if (d.logo && cup.p.f.t.trim()) { u += P.logo; rows.push([pf + 'شعار', P.logo]); }
  }
  if (u && d.w) {
    v = d.n === 1 ? P.wrap1 : (d.m === 'p' ? P.wrapP : P.wrapE);
    u += v;
    rows.push(['تغليف هدية' + (d.n > 1 ? (d.m === 'p' ? ' (معاً)' : ' (لكل كوب)') : ''), v]);
  }
  return { rows: rows, total: u * d.q, unit: u };
}

/* ============================ التحقق من الطلب ============================ */
function regionOk_(regs, id, target, cid) {
  if (!id) return true;
  return regs.some(function (r) { return r.id === id && r.target === target && (r.cup === 'all' || r.cup === cid); });
}
function validateOrder_(o, cs, regs, st) {
  if (!o || typeof o !== 'object') return fail_('بيانات الطلب غير صالحة');
  var d = { n: Number(o.n) === 2 ? 2 : 1, w: o.w ? 1 : 0, m: o.m === 'e' ? 'e' : 'p', q: Math.floor(num_(o.q, 1)), mk: o.mk ? 1 : 0, cups: [], logo: null, card: null };
  if (d.q < 1 || d.q > 20) return fail_('الكمية غير صالحة');
  if (!o.cups || o.cups.length < d.n) return fail_('بيانات الأكواب ناقصة');
  var fh = st.fontsHide || [], i, k, cup, col, p, pl, ts;
  for (i = 0; i < d.n; i++) {
    cup = o.cups[i]; col = colorByKey_(cs, cup && cup.ck);
    if (!col || !col.active) return fail_('لون الكوب ' + (i + 1) + ' غير متاح');
    var c = { ck: String(cup.ck), cid: col.id, cname: col.name, p: {} }, any = 0;
    for (var kk = 0; kk < 3; kk++) {
      k = 'fib'.charAt(kk); pl = (cup.p && cup.p[k]) || {};
      p = { t: clean_(pl.t, 40), t2: clean_(pl.t2, 40), two: pl.two ? 1 : 0, fo: Math.floor(num_(pl.fo, 0)), ts: Math.round(num_(pl.ts, 1) * 10) / 10, pos: k === 'f' ? clean_(pl.pos, 40) : '' };
      if (p.fo < 0 || p.fo >= FONT_COUNT || fh.indexOf(p.fo) >= 0) return fail_('الخط المختار غير متاح');
      if (p.ts < 0.6 || p.ts > 1.6) return fail_('حجم الكتابة خارج الحدود المسموحة');
      if (p.t) any = 1; else { p.t2 = ''; p.two = 0; }
      if (p.pos && !regionOk_(regs, p.pos, 'text', col.id)) return fail_('موضع الكتابة لم يعد متاحاً، حدّث الصفحة وحاول مجدداً');
      c.p[k] = p;
    }
    if (!any) return fail_('اكتب عبارة واحدة على الأقل للكوب ' + (i + 1));
    d.cups.push(c);
  }
  if (o.logo) {
    var lg = o.logo, data = typeof lg.data === 'string' && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(lg.data) && lg.data.length <= 46000 ? lg.data : '';
    d.logo = { size: Math.max(.5, Math.min(1.7, num_(lg.size, 1))), y: Math.max(-60, Math.min(60, num_(lg.y, 0))), pos: clean_(lg.pos, 40), data: data };
    if (d.logo.pos && !regionOk_(regs, d.logo.pos, 'logo', 'all') && !regs.some(function (r) { return r.id === d.logo.pos && r.target === 'logo'; })) return fail_('موضع الشعار لم يعد متاحاً، حدّث الصفحة وحاول مجدداً');
  }
  if (d.w) { var cd = o.card || {}; d.card = { to: clean_(cd.to, 30), fr: clean_(cd.fr, 30), ms: clean_(cd.ms, 150) }; }
  var cu = o.cu || {};
  d.cu = { nm: clean_(cu.nm, 40), ph: clean_(cu.ph, 30), ct: clean_(cu.ct, 30), rg: clean_(cu.rg, 40), ds: clean_(cu.ds, 30), ad: clean_(cu.ad, 200), nt: clean_(cu.nt, 300) };
  if (!d.cu.nm || !d.cu.ct || !d.cu.ds) return fail_('أكمل الاسم والمدينة والحي');
  d.cu.ph = phone_(d.cu.ph);
  if (!d.cu.ph) return fail_('رقم الجوال غير صحيح');
  d.clientTotal = num_(o.ct, 0);
  return { ok: true, d: d };
}

/* ============================ الطلبات (عام) ============================ */
function rateLimit_(key, max, secs) {
  var cache = CacheService.getScriptCache(), k = 'rl:' + sha_(key).slice(0, 24), n = Number(cache.get(k) || 0);
  if (n >= max) return false;
  cache.put(k, String(n + 1), secs);
  return true;
}
/** مفتاح الطلب (reqId): نص عشوائي يولّده المتصفح لكل محاولة طلب ويعيد إرساله عند إعادة المحاولة،
 *  فلا يُسجَّل الطلب مرتين حتى لو انقطع الاتصال بعد الحفظ. الطلبات بلا مفتاح (نسخ قديمة) تعمل كما كانت. */
function reqId_(o) { var r = o && o.rid; return (typeof r === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(r)) ? r : ''; }
function findByReqId_(rid) {
  if (!rid) return null;
  var s = sh_('Orders'), last = s.getLastRow(); if (last < 2) return null;
  var col = SHEETS.Orders.indexOf('reqId') + 1, vals = s.getRange(2, col, last - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) !== rid) continue;
    var h = SHEETS.Orders, row = s.getRange(i + 2, 1, 1, h.length).getValues()[0], ob = {};
    for (var j = 0; j < h.length; j++) ob[h[j]] = row[j];
    return ob;
  }
  return null;
}
function dupResult_(ob) {
  return { ok: true, duplicate: true, id: ob.id, token: ob.previewToken, total: num_(ob.total, 0), rows: jparse_(ob.breakdown, []), adjusted: false };
}
function createOrder_(o) {
  if (o && o.hp) return fail_('تعذر إنشاء الطلب');
  var rid = reqId_(o), ex = findByReqId_(rid);
  if (ex) return dupResult_(ex);                       // إعادة محاولة لطلب محفوظ سابقاً: نُرجع نتيجته نفسها
  var st = settings_(), cs = colors_(), regs = regions_(true), v = validateOrder_(o, cs, regs, st);
  if (!v.ok) return v;
  var d = v.d, P = prices_();
  if (!rateLimit_('ph:' + d.cu.ph.replace(/\D/g, '').slice(-9), 8, 3600)) return fail_('عدد الطلبات كبير، حاول لاحقاً');
  if (!rateLimit_('orders:10m', ORDER_FLOOD_10MIN, 600) || !rateLimit_('orders:1h', ORDER_FLOOD_HOUR, 3600)) { log_('order_flood', 'رُفض طلب بسبب ازدحام غير معتاد'); return fail_('الخدمة مزدحمة حالياً، حاول بعد دقائق أو تواصل معنا على واتساب.'); }
  var pr = priceOrder_(d, P, cs);
  if (!pr.total) return fail_('تعذر حساب السعر');
  var id = orderId_(), tok = token_(), t = now_(), days = Math.max(0, Math.floor(num_(st.previewDays, 90)));
  var design = { n: d.n, w: d.w, cups: d.cups.map(function (c) { return { cid: c.cid, cname: c.cname, p: c.p }; }), logo: d.logo };
  var summary = d.cups.map(function (c, i) {
    return (d.n > 1 ? 'كوب ' + (i + 1) + ' (' : '(') + c.cname + '): ' + ['f', 'i', 'b'].filter(function (k) { return c.p[k].t; }).map(function (k) { return PLACES[k] + '=' + c.p[k].t; }).join(' | ');
  }).join('\n');
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, err: 'الخادم مشغول الآن ولم يُسجَّل طلبك. أعد المحاولة بعد لحظات.', retry: true }; }
  try {
    ex = findByReqId_(rid);                            // سباق: ضغطتان متزامنتان بنفس المفتاح
    if (ex) return dupResult_(ex);
    append_('Orders', { id: id, createdAt: t, status: 'new', name: safe_(d.cu.nm, 80), phone: safe_(d.cu.ph, 30), city: safe_(d.cu.ct, 60), district: safe_(d.cu.ds, 60), region: safe_(d.cu.rg, 60), address: safe_(d.cu.ad, 300), notes: safe_(d.cu.nt, 400), qty: d.q, total: pr.total, clientTotal: d.clientTotal, marketing: d.mk ? 'نعم' : 'لا', summary: safe_(summary, 1500), breakdown: JSON.stringify(pr.rows), previewToken: tok, internalNotes: '[]', updatedAt: t, reqId: rid });
    d.cups.forEach(function (c, i) {
      ['f', 'i', 'b'].forEach(function (k) {
        var pl = c.p[k]; if (!pl.t) return;
        append_('OrderItems', { orderId: id, cup: i + 1, color: safe_(c.cname, 60), place: PLACES[k], text: safe_(pl.t, 80), text2: safe_(pl.two ? pl.t2 : '', 80), font: FONT_NAMES[pl.fo], sizePct: Math.round(pl.ts * 100), position: pl.pos, amount: '' });
      });
    });
    if (d.logo) append_('OrderItems', { orderId: id, cup: 0, color: '', place: 'شعار', text: '', text2: '', font: '', sizePct: Math.round(d.logo.size * 100), position: d.logo.pos, amount: P.logo });
    if (d.w) append_('OrderItems', { orderId: id, cup: 0, color: '', place: 'تغليف هدية', text: safe_((d.card.to ? 'إلى ' + d.card.to : '') + (d.card.fr ? ' من ' + d.card.fr : '') + (d.card.ms ? ' — ' + d.card.ms : ''), 300), text2: '', font: '', sizePct: '', position: '', amount: '' });
    append_('Previews', { token: tok, orderId: id, design: JSON.stringify(design), createdAt: t, expiresAt: days ? t.getTime() + days * 86400000 : '', revoked: '' });
    try { SpreadsheetApp.flush(); } catch (e) {}
    // لا نُرجع نجاحاً إلا بعد التأكد أن الطلب موجود فعلاً في الورقة
    var chk = sh_('Orders'), lr = chk.getLastRow();
    if (!lr || String(chk.getRange(lr, 1, 1, 1).getValues()[0][0]) !== id) return { ok: false, err: 'تعذّر تأكيد حفظ الطلب. أعد المحاولة.', retry: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
  dropDash_();
  tgNewOrder_(id, d, pr, summary);                      // إشعار تيليجرام (اختياري، لا يؤثر على الطلب إن فشل)
  return { ok: true, id: id, token: tok, total: pr.total, rows: pr.rows, adjusted: Math.abs(pr.total - d.clientTotal) > 0.001 };
}

/** المعاينة العامة: تصميم فقط. لا اسم ولا جوال ولا عنوان ولا رقم طلب ولا سعر. */
function getPreview_(t) {
  if (!/^[A-Z2-7]{16}$/.test(String(t || ''))) return fail_('رابط غير صالح');
  var r = rows_('Previews').filter(function (x) { return String(x.token) === t; })[0];
  if (!r || truthy_(r.revoked)) return fail_('رابط غير صالح');
  if (r.expiresAt !== '' && r.expiresAt != null && Number(r.expiresAt) < Date.now()) return fail_('انتهت صلاحية الرابط');
  var d = jparse_(r.design, null);
  if (!d) return fail_('رابط غير صالح');
  return { ok: true, design: d };
}
/* ============================ تتبع الطلب واعتماد التصميم (رابط العميل) ============================
 *  الرابط = نفس رمز المعاينة (80 بت عشوائية). لا يكشف اسماً ولا جوالاً ولا عنواناً ولا سعراً. */
var ORDER_FLOOD_10MIN = 40, ORDER_FLOOD_HOUR = 120;
var TRACK_STAGES = [
  { label: 'تم استلام طلبك', st: ['new'] },
  { label: 'تم تأكيد طلبك', st: ['confirmed', 'progress'] },
  { label: 'خارج للتسليم', st: ['ready'] },
  { label: 'تم التسليم', st: ['delivered', 'done'] }
];
function stageOf_(st) { for (var i = 0; i < TRACK_STAGES.length; i++) if (TRACK_STAGES[i].st.indexOf(String(st)) >= 0) return i; return 0; }
function apOf_(pv) {
  var st = pv ? String(pv.approval || '') : '';
  return { state: /^(approved|changes)$/.test(st) ? st : '', note: pv ? un_(pv.approvalNote || '') : '', at: pv && pv.approvalAt ? new Date(pv.approvalAt).getTime() : 0 };
}
function apMap_() {
  var m = {}; rows_('Previews').forEach(function (r) { m[String(r.orderId)] = r; }); return m;
}
function trackPv_(t) {
  if (!/^[A-Z2-7]{16}$/.test(String(t || ''))) return { err: 'رابط غير صالح' };
  var r = rows_('Previews').filter(function (x) { return String(x.token) === t; })[0];
  if (!r || truthy_(r.revoked)) return { err: 'رابط غير صالح' };
  if (r.expiresAt !== '' && r.expiresAt != null && Number(r.expiresAt) < Date.now()) return { err: 'انتهت صلاحية الرابط' };
  var o = rows_('Orders').filter(function (x) { return String(x.id) === String(r.orderId); })[0];
  if (!o) return { err: 'رابط غير صالح' };
  return { pv: r, o: o };
}
function canDecide_(o, pv) { return /^(new|confirmed|progress)$/.test(String(o.status)) && apOf_(pv).state !== 'approved'; }
function getTrack_(t) {
  var x = trackPv_(t); if (x.err) return fail_(x.err);
  var d = jparse_(x.pv.design, null); if (!d) return fail_('رابط غير صالح');
  var st = String(x.o.status), idx = stageOf_(st);
  return {
    ok: true, id: x.o.id, createdAt: new Date(x.o.createdAt).getTime(), status: st, statusLabel: TRACK_STAGES[idx].label,
    cancelled: st === 'cancelled', done: st === 'done', step: idx,
    steps: TRACK_STAGES.map(function (g, i) { return { k: String(i), label: g.label }; }),
    approval: apOf_(x.pv), canDecide: canDecide_(x.o, x.pv), design: d
  };
}
/** قرار العميل: decision = approve | changes (مع note إلزامية). الاعتماد نهائي إلا إذا أعاد المدير فتحه. */
function trackApprove_(b) {
  var t = String(b.t || ''), dec = b.decision === 'approve' ? 'approved' : (b.decision === 'changes' ? 'changes' : '');
  if (!dec) return fail_('إجراء غير صالح');
  var note = dec === 'changes' ? clean_(b.note, 400) : '';
  if (dec === 'changes' && note.length < 3) return fail_('اكتب التعديل المطلوب.');
  if (!/^[A-Z2-7]{16}$/.test(t)) return fail_('رابط غير صالح');
  if (!rateLimit_('ap:' + t, 10, 3600)) return fail_('محاولات كثيرة، حاول لاحقاً');
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, err: 'الخادم مشغول الآن ولم يُحفظ ردّك. أعد المحاولة بعد لحظات.', retry: true }; }
  var o, pv, ap;
  try {
    var x = trackPv_(t); if (x.err) return fail_(x.err);
    o = x.o; pv = x.pv; ap = apOf_(pv);
    if (ap.state === 'approved') return dec === 'approved' ? { ok: true, already: true, approval: ap } : { ok: false, err: 'تم اعتماد التصميم مسبقاً. تواصل معنا إن احتجت تعديلاً.', approval: ap };
    if (!canDecide_(o, pv)) return fail_('لا يمكن تغيير التصميم في هذه المرحلة من الطلب.');
    setCells_('Previews', pv._row, { approval: dec, approvalNote: safe_(note, 400), approvalAt: now_() });
    addNote_(o._row, o, { t: Date.now(), k: 'approval', x: dec === 'approved' ? 'العميل اعتمد التصميم' : 'العميل طلب تعديلاً: ' + note });
    try { SpreadsheetApp.flush(); } catch (e) {}
    var chk = rows_('Previews').filter(function (r) { return String(r.token) === t; })[0];
    if (!chk || apOf_(chk).state !== dec) return { ok: false, err: 'تعذّر تأكيد حفظ ردّك. أعد المحاولة.', retry: true };
    ap = apOf_(chk);
  } finally { try { lock.releaseLock(); } catch (e) {} }
  dropDash_(); log_('customer_' + (dec === 'approved' ? 'approved' : 'changes'), String(o.id));
  tgSend_((dec === 'approved' ? '✅ العميل اعتمد التصميم — ' : '✎ العميل طلب تعديلاً — ') + String(o.id) + (dec === 'changes' ? '\n' + note : ''));
  return { ok: true, approval: ap, canDecide: dec !== 'approved' };
}
function approvalReset_(id) {
  var o = rows_('Orders').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) return fail_('الطلب غير موجود');
  var pv = rows_('Previews').filter(function (x) { return String(x.token) === String(o.previewToken); })[0];
  if (!pv) return fail_('لا يوجد رابط تتبع لهذا الطلب');
  setCells_('Previews', pv._row, { approval: '', approvalNote: '', approvalAt: '' });
  addNote_(o._row, o, { t: Date.now(), k: 'approval', x: 'أُعيد فتح اعتماد التصميم (بانتظار العميل)' });
  log_('approval_reset', String(o.id)); dropDash_();
  return { ok: true, approval: { state: '', note: '', at: 0 } };
}
/* ============================ إشعارات تيليجرام (اختيارية) ============================
 *  التوكن ومعرّف المحادثة يُحفظان في Script Properties فقط (قائمة «كلمتين» في الشيت ← إعداد تيليجرام)،
 *  ولا يظهران في الشيت ولا في الموقع ولا في GitHub ولا في السجل. فشل الإرسال لا يُفشل الطلب أبداً. */
var TG_MAX_PER_HOUR = 40;
function tgCfg_() {
  var p = PropertiesService.getScriptProperties(), t = p.getProperty('TG_BOT_TOKEN'), c = p.getProperty('TG_CHAT_ID');
  return (t && c) ? { token: t, chat: c } : null;
}
function setTelegram_(token, chatId) {
  token = String(token || '').trim(); chatId = String(chatId || '').trim();
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,60}$/.test(token)) throw new Error('صيغة توكن البوت غير صحيحة (يشبه 123456789:AAxxxxxxxx)');
  if (!/^-?\d{5,16}$/.test(chatId)) throw new Error('معرّف المحادثة (Chat ID) أرقام فقط');
  var p = PropertiesService.getScriptProperties(); p.setProperty('TG_BOT_TOKEN', token); p.setProperty('TG_CHAT_ID', chatId);
  log_('security', 'تم ضبط إشعارات تيليجرام');
  return true;
}
function tgScrub_(msg, cfg) { msg = String(msg == null ? '' : msg); if (cfg && cfg.token) msg = msg.split(cfg.token).join('***'); return msg.replace(/bot\d{6,12}:[A-Za-z0-9_-]{20,}/g, 'bot***').slice(0, 200); }
/** يرسل نصاً عادياً (بلا HTML) ويُرجع {ok, skipped?, err?}. لا يرمي أخطاء. */
function tgSend_(text, force) {
  var cfg = tgCfg_(); if (!cfg) return { ok: false, skipped: true };
  if (!force && !rateLimit_('tg:hour', TG_MAX_PER_HOUR, 3600)) { log_('telegram_throttled', 'تجاوز حد الإشعارات في الساعة'); return { ok: false, skipped: true, err: 'throttled' }; }
  try {
    var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + cfg.token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: cfg.chat, text: String(text).slice(0, 3500), disable_web_page_preview: true })
    });
    var code = r.getResponseCode();
    if (code === 200) return { ok: true };
    log_('telegram_failed', 'HTTP ' + code); return { ok: false, err: 'HTTP ' + code };
  } catch (e) { var m = tgScrub_(e && e.message || e, cfg); log_('telegram_failed', m); return { ok: false, err: m }; }
}
function adminUrl_() { var u = String(settings_().siteUrl || '').trim(); return /^https:\/\//.test(u) ? u.replace(/\/?$/, '/') + 'admin.html' : ''; }
function tgNewOrder_(id, d, pr, summary) {
  try {
    tgSend_('🛒 طلب جديد ' + id + '\n' +
      'الاسم: ' + d.cu.nm + '\nالجوال: ' + d.cu.ph + '\nالمدينة: ' + d.cu.ct + (d.cu.rg ? ' — ' + d.cu.rg : '') + '\n' +
      'الأكواب: ' + d.n + ' × ' + d.q + ' | الإجمالي: ' + pr.total + ' ر.س' + (d.w ? ' | مع تغليف هدية' : '') + '\n' +
      String(summary || '').slice(0, 500) + (adminUrl_() ? '\n\n' + adminUrl_() : ''));
  } catch (e) { /* لا شيء: الإشعار لا يؤثر على الطلب */ }
}
function getImage_(id) {
  id = String(id || '');
  var ok = products_().some(function (p) { var d = p.data || {}; return d.imgId === id || d.thumb === id || d.full === id; });
  if (!ok) return fail_('غير مسموح');
  var f = DriveApp.getFileById(id), b = f.getBlob();
  return { ok: true, mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()) };
}

/* ============================ المصادقة ============================ */
function setAdminPassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 10) throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف');
  var salt = rnd_('abcdefghijklmnopqrstuvwxyz0123456789', 24), props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_SALT', salt);
  props.setProperty('ADMIN_HASH', sha_(salt + ':' + pw));
  log_('security', 'تم تعيين/تغيير كلمة مرور المدير');
  return true;
}
function login_(pw) {
  var cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  if (Number(cache.get('lf') || 0) >= 8) return fail_('محاولات كثيرة. انتظر 10 دقائق.');
  var salt = props.getProperty('ADMIN_SALT'), h = props.getProperty('ADMIN_HASH');
  if (!salt || !h) return fail_('لم يتم تعيين كلمة مرور المدير بعد. راجع دليل الإعداد.');
  var a = sha_(salt + ':' + String(pw || '')), diff = a.length ^ h.length;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (h.charCodeAt(i) || 0);
  if (diff !== 0) {
    cache.put('lf', String(Number(cache.get('lf') || 0) + 1), 600);
    log_('login_failed', 'محاولة دخول فاشلة');
    Utilities.sleep(1000);
    return fail_('كلمة المرور غير صحيحة');
  }
  cache.remove('lf');
  var tok = rnd_('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 40);
  cache.put('s:' + sha_(tok), '1', SESSION_TTL);
  log_('login', 'تسجيل دخول المدير');
  return { ok: true, session: tok, ttl: SESSION_TTL };
}
function authed_(s) {
  if (!s || typeof s !== 'string' || s.length < 30) return false;
  return CacheService.getScriptCache().get('s:' + sha_(s)) === '1';
}
function log_(action, details) {
  try { append_('AdminLog', { time: now_(), action: action, details: safe_(details, 500) }); } catch (e) {}
}

/* ============================ لوحة الإدارة ============================ */
function dashboard_() {
  var cache = CacheService.getScriptCache();
  try { var hit = cache.get('dash'); if (hit) { var hv = JSON.parse(hit); hv.cached = true; return hv; } } catch (e) {}
  var d = dashboardCompute_();
  try { var js = JSON.stringify(d); if (js.length < 90000) cache.put('dash', js, 120); } catch (e) {}
  return d;
}
function dashboardCompute_() {
  var os = rows_('Orders'), items = rows_('OrderItems'), today = dstr_(now_(), 'yyyy-MM-dd'), month = today.slice(0, 7);
  var c = { total: os.length, 'new': 0, confirmed: 0, progress: 0, ready: 0, delivered: 0, done: 0, cancelled: 0 };
  var sales = 0, sToday = 0, sMonth = 0, valid = 0, byDay = {}, meta = {}, apm = apMap_(), chg = 0;
  os.forEach(function (o) {
    var s = String(o.status); if (c[s] != null) c[s]++;
    if (/^(new|confirmed|progress)$/.test(s) && apOf_(apm[String(o.id)]).state === 'changes') chg++;
    meta[o.id] = { qty: num_(o.qty, 1), cancelled: s === 'cancelled' };
    if (s === 'cancelled') return;
    var t = num_(o.total, 0), d = dstr_(o.createdAt, 'yyyy-MM-dd');
    sales += t; valid++;
    if (d === today) sToday += t;
    if (d.slice(0, 7) === month) sMonth += t;
    byDay[d] = byDay[d] || { sales: 0, orders: 0 }; byDay[d].sales += t; byDay[d].orders++;
  });
  var series = [];
  for (var i = 13; i >= 0; i--) { var k = dstr_(now_().getTime() - i * 86400000, 'yyyy-MM-dd'); series.push({ d: k, sales: byDay[k] ? byDay[k].sales : 0, orders: byDay[k] ? byDay[k].orders : 0 }); }
  var tc = {}, seen = {};
  items.forEach(function (it) {
    var m = meta[it.orderId]; if (!m || m.cancelled || !it.cup || !it.color) return;
    var key = it.orderId + '|' + it.cup; if (seen[key]) return; seen[key] = 1;
    tc[it.color] = (tc[it.color] || 0) + m.qty;
  });
  var tp = {};
  items.forEach(function (it) { var m = meta[it.orderId]; if (!m || m.cancelled || !it.place) return; tp[it.place] = (tp[it.place] || 0) + m.qty; });
  function top(o) { return Object.keys(o).map(function (k) { return { name: k, count: o[k] }; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 6); }
  var latest = os.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 8).map(function (r) { return orderRow_(r, apm); });
  return { ok: true, counts: c, sales: sales, salesToday: sToday, salesMonth: sMonth, avg: valid ? Math.round(sales / valid * 100) / 100 : 0, series: series, latest: latest, changes: chg, topColors: top(tc), topPlaces: top(tp) };
}
function orderRow_(o, ap) {
  return { approval: ap && ap[String(o.id)] ? apOf_(ap[String(o.id)]).state : '', id: o.id, createdAt: new Date(o.createdAt).getTime(), status: o.status, statusLabel: STATUSES[o.status] || o.status, name: un_(o.name), phone: un_(o.phone), city: un_(o.city), total: num_(o.total, 0), qty: num_(o.qty, 1) };
}
function listOrders_(b) {
  var q = clean_(b.q, 60).toLowerCase(), st = clean_(b.status, 20), from = clean_(b.from, 10), to = clean_(b.to, 10);
  var qd = !/^[+\d\s().-]+$/.test(q) ? '' : q.replace(/\D/g, '').replace(/^00/, '').replace(/^966/, '').replace(/^0+/, ''); // بحث الجوال بأي صيغة: 05… أو 966… أو +966…
  var counts = { all: 0 }, apm = apMap_(), apf = /^(pending|approved|changes)$/.test(String(b.approval)) ? String(b.approval) : '';
  var base = rows_('Orders').filter(function (o) {
    if (apf) { var as = apOf_(apm[String(o.id)]).state; if (apf === 'pending' ? as !== '' : as !== apf) return false; }
    var d = dstr_(o.createdAt, 'yyyy-MM-dd');
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (q && (String(o.id) + ' ' + un_(o.name) + ' ' + un_(o.phone)).toLowerCase().indexOf(q) < 0 &&
        !(qd && String(un_(o.phone)).replace(/\D/g, '').indexOf(qd) >= 0)) return false;
    return true;
  });
  base.forEach(function (o) { counts.all++; counts[o.status] = (counts[o.status] || 0) + 1; });   // أعداد الحالات ضمن البحث/التاريخ الحالي
  var os = base.filter(function (o) { return !st || o.status === st; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { ok: true, total: os.length, counts: counts, orders: os.slice(0, 200).map(function (r) { return orderRow_(r, apm); }) };
}
function phoneKey_(v) { return String(un_(v)).replace(/\D/g, '').slice(-9); }
function getOrder_(id) {
  var all = rows_('Orders'), o = all.filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) return fail_('الطلب غير موجود');
  var pk = phoneKey_(o.phone), cc = pk ? all.filter(function (x) { return phoneKey_(x.phone) === pk; }).length : 1;
  var pv = rows_('Previews').filter(function (x) { return String(x.token) === String(o.previewToken); })[0];
  return {
    ok: true, order: Object.assign(orderRow_(o), { approval: apOf_(pv), customerCount: cc, region: un_(o.region), district: un_(o.district), address: un_(o.address), notes: un_(o.notes), marketing: o.marketing, clientTotal: num_(o.clientTotal, 0), breakdown: jparse_(o.breakdown, []), notesLog: jparse_(o.internalNotes, []), token: o.previewToken, previewRevoked: pv ? truthy_(pv.revoked) : null, previewExpires: pv && pv.expiresAt ? Number(pv.expiresAt) : null, updatedAt: new Date(o.updatedAt).getTime() }),
    items: rows_('OrderItems').filter(function (x) { return String(x.orderId) === String(id); }).map(function (x) { return { cup: x.cup, color: un_(x.color), place: x.place, text: un_(x.text), text2: un_(x.text2), font: x.font, sizePct: x.sizePct, position: x.position }; }),
    design: pv ? jparse_(pv.design, null) : null
  };
}
function addNote_(row, o, entry) {
  var arr = jparse_(o.internalNotes, []); arr.push(entry);
  while (JSON.stringify(arr).length > 40000) arr.shift();
  setCells_('Orders', row, { internalNotes: JSON.stringify(arr), updatedAt: now_() });
}
function setStatus_(id, status) {
  if (!STATUSES[status]) return fail_('حالة غير صالحة');
  var o = rows_('Orders').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) return fail_('الطلب غير موجود');
  if (o.status === status) return { ok: true, status: status };
  setCells_('Orders', o._row, { status: status });
  addNote_(o._row, o, { t: Date.now(), k: 'status', x: (STATUSES[o.status] || o.status) + ' ← ' + STATUSES[status] });
  log_('order_status', id + ': ' + o.status + ' → ' + status);
  dropDash_();
  return { ok: true, status: status, statusLabel: STATUSES[status] };
}
function noteOrder_(id, text) {
  text = clean_(text, 500); if (!text) return fail_('اكتب الملاحظة');
  var o = rows_('Orders').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) return fail_('الطلب غير موجود');
  addNote_(o._row, o, { t: Date.now(), k: 'note', x: text });
  log_('order_note', id);
  return { ok: true };
}
function revokePreview_(token, revoke) {
  var r = rows_('Previews').filter(function (x) { return String(x.token) === String(token); })[0];
  if (!r) return fail_('الرابط غير موجود');
  setCells_('Previews', r._row, { revoked: revoke ? 'TRUE' : '' });
  log_(revoke ? 'preview_revoked' : 'preview_restored', String(r.orderId));
  return { ok: true, revoked: !!revoke };
}

function customers_() {
  var map = {};
  rows_('Orders').forEach(function (o) {
    var ph = un_(o.phone), key = ph.replace(/\D/g, '').slice(-9) || String(o.id), c = map[key];
    var ts = new Date(o.createdAt).getTime();
    if (!c) c = map[key] = { key: key, name: '', phone: ph, city: '', orders: [], spent: 0, last: 0 };
    c.orders.push({ id: o.id, t: ts, total: num_(o.total, 0), status: o.status, statusLabel: STATUSES[o.status] || o.status });
    if (o.status !== 'cancelled') c.spent += num_(o.total, 0);
    if (ts >= c.last) { c.last = ts; c.name = un_(o.name); c.city = un_(o.city); c.phone = ph; }
  });
  var list = Object.keys(map).map(function (k) { var c = map[k]; c.orders.sort(function (a, b) { return b.t - a.t; }); c.count = c.orders.length; return c; });
  list.sort(function (a, b) { return b.last - a.last; });
  return { ok: true, customers: list };
}
function changePassword_(oldPw, newPw) {
  var props = PropertiesService.getScriptProperties(), salt = props.getProperty('ADMIN_SALT'), h = props.getProperty('ADMIN_HASH');
  if (!salt || sha_(salt + ':' + String(oldPw || '')) !== h) return fail_('كلمة المرور الحالية غير صحيحة');
  try { setAdminPassword_(newPw); } catch (e) { return fail_(String(e.message || e)); }
  return { ok: true };
}

function saveSettings_(vals) {
  if (!vals || typeof vals !== 'object') return fail_('بيانات غير صالحة');
  var rows = rows_('Settings'), changed = [];
  Object.keys(vals).forEach(function (k) {
    if (!(k in SETTING_DEFAULTS)) return;
    var v = vals[k], s;
    if (JSON_SETTINGS[k]) {
      v = normJson_(k, v); if (v === null) return;
      s = JSON.stringify(v);
    } else {
      s = clean_(v, TEXT_LIMITS[k] || 300);
      if (k === 'wa') s = s.replace(/\D/g, '');
      if (k === 'siteUrl' && s && !/^https:\/\/[^\s]+\/$/.test(s)) s = '';
      if (k === 'announceOn') s = truthy_(v) ? '1' : '0';
      if (k === 'previewDays') s = String(Math.max(0, Math.min(3650, Math.floor(num_(v, 90)))));
    }
    var r = rows.filter(function (x) { return x.key === k; })[0];
    if (r) setCells_('Settings', r._row, { value: s, updatedAt: now_() });
    else append_('Settings', { key: k, value: s, updatedAt: now_() });
    changed.push(k);
  });
  dropCache_(); log_('settings', changed.join(','));
  return { ok: true, changed: changed };
}
function normJson_(k, v) {
  if (!Array.isArray(v)) return null;
  if (k === 'mq') return v.map(function (x) { return clean_(x, 120); }).filter(Boolean).slice(0, 12);
  if (k === 'fontsHide') return v.map(Number).filter(function (n) { return n >= 0 && n < FONT_COUNT; }).slice(0, FONT_COUNT - 1);
  if (k === 'sections') return v.filter(function (x) { return x && /^(gallery|steps|faq|info|b\d+)$/.test(x.id); }).map(function (x) { return { id: x.id, on: x.on !== false }; });
  if (k === 'blocks') return v.slice(0, 8).map(function (x, i) { return { id: 'b' + i, title: clean_(x.title, 80), body: clean_(x.body, 2000), on: x.on !== false }; });
  if (k === 'waTemplates') return v.slice(0, 12).map(function (x, i) { return { id: clean_(x && x.id, 20) || ('t' + i), title: clean_(x && x.title, 60), body: String((x && x.body) == null ? '' : x.body).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 1500) }; }).filter(function (x) { return x.title && x.body; });
  if (k === 'faq') return v.slice(0, 20).map(function (x) { return { q: clean_(x.q, 200), a: clean_(x.a, 800) }; }).filter(function (x) { return x.q; });
  return null;
}
function savePricing_(vals) {
  if (!vals || typeof vals !== 'object') return fail_('بيانات غير صالحة');
  var rows = rows_('Pricing'), changed = [];
  for (var k in vals) {
    if (!(k in DEFAULT_PRICES)) continue;
    var n = Number(vals[k]);
    if (!isFinite(n) || n < 0 || n > 100000) return fail_('قيمة غير صالحة: ' + PRICE_LABELS[k]);
    var r = rows.filter(function (x) { return x.key === k; })[0], old = r ? r.value : '';
    if (r) setCells_('Pricing', r._row, { value: n }); else append_('Pricing', { key: k, value: n, label: PRICE_LABELS[k] });
    if (String(old) !== String(n)) changed.push(k + ':' + old + '→' + n);
  }
  dropCache_(); log_('pricing', changed.join(' | ') || 'بدون تغيير');
  return { ok: true };
}

function bootstrap_() {
  return { ok: true, settings: settings_(), prices: prices_(), priceLabels: PRICE_LABELS, products: products_(), statuses: STATUSES, statusClient: STATUS_CLIENT, waTemplatesDefault: WA_TEMPLATES_DEFAULT, fonts: FONT_NAMES, version: VERSION, telegram: !!tgCfg_() };
}
/** تحميل أولي بطلب واحد: الإعدادات + الإحصائيات (بدل طلبين متتاليين إلى Apps Script). */
function init_() { var b = bootstrap_(); b.dash = dashboard_(); return b; }
function saveProduct_(it) {
  if (!it || !/^(color|region|gallery)$/.test(it.kind)) return fail_('نوع غير صالح');
  var kind = it.kind, data = {}, id = String(it.id || ''), existing = products_().filter(function (p) { return p.id === id; })[0];
  if (id && !/^[A-Za-z0-9_\-]{1,40}$/.test(id)) return fail_('معرّف غير صالح');
  if (existing && existing.kind !== kind) return fail_('معرّف مستخدم');
  var name = clean_(it.name, 120), d = it.data || {};
  if (kind === 'color') {
    if (!name) return fail_('اسم اللون مطلوب');
    var builtin = existing && existing.data && existing.data.builtin;
    data = { hex: /^#[0-9a-fA-F]{6}$/.test(d.hex) ? d.hex : '#c8b89a', builtin: !!builtin };
    if (!builtin) {
      data.imgId = existing && existing.data.imgId || ''; data.w = existing && existing.data.w || 800; data.ht = existing && existing.data.ht || 800;
      if (d.imgId && /^[A-Za-z0-9_\-]{10,80}$/.test(d.imgId)) { data.imgId = d.imgId; data.w = Math.min(4000, Math.max(100, num_(d.w, 800))); data.ht = Math.min(4000, Math.max(100, num_(d.ht, 800))); }
      if (!data.imgId) return fail_('ارفع صورة الكوب بهذا اللون أولاً');
    }
  } else if (kind === 'region') {
    if (!name) return fail_('اسم المنطقة مطلوب');
    var cx = num_(d.cx, -1), cy = num_(d.cy, -1), w = num_(d.w, 0), h = num_(d.h, 0);
    if (!(w >= .02 && h >= .02 && cx - w / 2 >= -1e-9 && cx + w / 2 <= 1 + 1e-9 && cy - h / 2 >= -1e-9 && cy + h / 2 <= 1 + 1e-9)) return fail_('حدود المنطقة يجب أن تكون داخل صورة الكوب');
    var cup = String(d.cup || 'all');
    if (cup !== 'all' && !colors_().all.some(function (c) { return c.id === cup; })) return fail_('اللون غير موجود');
    data = { target: d.target === 'logo' ? 'logo' : 'text', cup: cup, view: 'f', cx: cx, cy: cy, w: w, h: h };
  } else {
    data = { thumb: String(d.thumb || (existing && existing.data.thumb) || ''), full: String(d.full || (existing && existing.data.full) || ''), group: clean_(d.group, 60), home: d.home !== false };
    if (!/^[A-Za-z0-9_\-]{10,80}$/.test(data.full) || !/^[A-Za-z0-9_\-]{10,80}$/.test(data.thumb)) return fail_('معرّف الصورة غير صالح');
  }
  var sort = existing ? existing.sort : (products_(kind).reduce(function (m, p) { return Math.max(m, p.sort); }, 0) + 1);
  if (it.sort != null && isFinite(Number(it.sort))) sort = Number(it.sort);
  var row = { id: id || rowId_(kind === 'color' ? 'c' : kind === 'region' ? 'r' : 'g'), kind: kind, name: safe_(name, 120), active: it.active === false ? false : true, sort: sort, price: kind === 'color' ? Math.max(0, Math.min(10000, num_(it.price, 0))) : 0, data: JSON.stringify(data) };
  if (existing) setCells_('Products', existing._row, row); else append_('Products', row);
  dropCache_(); log_('product_save', kind + ':' + row.id + ' ' + name);
  return { ok: true, id: row.id };
}
function deleteProduct_(id) {
  var p = products_().filter(function (x) { return x.id === String(id); })[0];
  if (!p) return fail_('غير موجود');
  if (p.data && p.data.builtin) return fail_('لا يمكن حذف الألوان الأساسية (يمكن إخفاؤها)');
  [p.data.imgId, p.data.thumb, p.data.full].forEach(function (f) { if (f) { try { DriveApp.getFileById(f).setTrashed(true); } catch (e) {} } });
  delRow_('Products', p._row); dropCache_(); log_('product_delete', p.kind + ':' + p.id + ' ' + p.name);
  return { ok: true };
}
function reorder_(kind, ids) {
  if (!Array.isArray(ids)) return fail_('بيانات غير صالحة');
  var ps = products_(kind);
  ids.forEach(function (id, i) { var p = ps.filter(function (x) { return x.id === String(id); })[0]; if (p) setCells_('Products', p._row, { sort: i + 1 }); });
  dropCache_(); log_('product_reorder', kind);
  return { ok: true };
}
function upload_(b) {
  var mime = String(b.mime || ''), b64 = String(b.b64 || '');
  if (!/^image\/(webp|jpeg|png)$/.test(mime)) return fail_('نوع الصورة غير مدعوم');
  if (!b64 || b64.length > MAX_UPLOAD_B64 || !/^[A-Za-z0-9+\/=]+$/.test(b64)) return fail_('الصورة كبيرة جداً أو غير صالحة');
  var folders = DriveApp.getFoldersByName('Kelmtein Media'), folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Kelmtein Media');
  var ext = mime === 'image/webp' ? 'webp' : mime === 'image/png' ? 'png' : 'jpg';
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, rnd_('abcdefghijklmnopqrstuvwxyz0123456789', 10) + '.' + ext));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  log_('upload', clean_(b.label, 80) + ' ' + f.getId());
  return { ok: true, id: f.getId() };
}

function adminCall_(b) {
  switch (b.action) {
    case 'admin.bootstrap': return bootstrap_();
    case 'admin.init': return init_();
    case 'admin.dashboard': return dashboard_();
    case 'admin.orders': return listOrders_(b);
    case 'admin.order': return getOrder_(b.id);
    case 'admin.setStatus': return setStatus_(b.id, b.status);
    case 'admin.note': return noteOrder_(b.id, b.text);
    case 'admin.approvalReset': return approvalReset_(b.id);
    case 'admin.telegramTest': { if (!tgCfg_()) return fail_('لم يُضبط تيليجرام بعد (قائمة كلمتين في الشيت ← 3) إعداد إشعارات تيليجرام).'); var tr = tgSend_('🔔 رسالة تجريبية من لوحة إدارة كلمتين', true); return tr.ok ? { ok: true } : fail_('تعذّر الإرسال: ' + (tr.err || 'خطأ غير معروف')); }
    case 'admin.revokePreview': return revokePreview_(b.token, b.revoke !== false);
    case 'admin.customers': return customers_();
    case 'admin.changePassword': return changePassword_(b.oldPassword, b.newPassword);
    case 'admin.saveSettings': return saveSettings_(b.values);
    case 'admin.savePricing': return savePricing_(b.values);
    case 'admin.saveProduct': return saveProduct_(b.item);
    case 'admin.deleteProduct': return deleteProduct_(b.id);
    case 'admin.reorder': return reorder_(b.kind, b.ids);
    case 'admin.upload': return upload_(b);
    case 'admin.log': return { ok: true, log: rows_('AdminLog').slice(-200).reverse().map(function (r) { return { t: new Date(r.time).getTime(), a: r.action, d: un_(r.details) }; }) };
    case 'admin.logout': CacheService.getScriptCache().remove('s:' + sha_(b.session)); return { ok: true };
  }
  return fail_('إجراء غير معروف');
}

/* ============================ نقاط الدخول ============================ */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'config') return out_({ ok: true, cfg: publicConfig_() });
    if (p.action === 'preview') return out_(getPreview_(p.t));
    if (p.action === 'track') return out_(getTrack_(p.t));
    if (p.action === 'img') return out_(getImage_(p.id));
    if (p.action === 'ping') return out_({ ok: true, version: VERSION });
    return out_(fail_('إجراء غير معروف'));
  } catch (err) { Logger.log(err && err.stack || err); return out_(fail_('خطأ في الخادم')); }
}
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > MAX_ADMIN_BODY) return out_(fail_('طلب غير صالح'));
    var b = JSON.parse(e.postData.contents);
    if (!b || typeof b.action !== 'string') return out_(fail_('طلب غير صالح'));
    if (b.action.indexOf('admin.') !== 0 && e.postData.contents.length > MAX_BODY) return out_(fail_('الطلب كبير جداً'));
    if (b.action === 'order') return out_(createOrder_(b.o));
    if (b.action === 'track.approve') return out_(trackApprove_(b));
    var t0 = Date.now();
    if (b.action === 'login') {
      var lr = login_(b.password);
      if (lr && lr.ok && b.init) { try { lr.init = init_(); } catch (ie) { Logger.log(ie); } }   // يوفّر رحلتين متتاليتين بعد الدخول
      lr._ms = Date.now() - t0;
      return out_(lr);
    }
    if (b.action.indexOf('admin.') === 0) {
      if (!authed_(b.session)) return out_({ ok: false, err: 'انتهت الجلسة، سجّل الدخول من جديد', auth: false });
      var lock = LockService.getScriptLock(), res;
      var write = !/^admin\.(bootstrap|init|dashboard|orders|order|log|customers)$/.test(b.action);
      if (write) lock.waitLock(20000);
      try { res = adminCall_(b); } finally { if (write) { try { lock.releaseLock(); } catch (x) {} } }
      if (res && typeof res === 'object') res._ms = Date.now() - t0;   // زمن التنفيذ في الخادم (لتشخيص البطء)
      return out_(res);
    }
    return out_(fail_('إجراء غير معروف'));
  } catch (err) { Logger.log(err && err.stack || err); return out_(fail_('خطأ في الخادم')); }
}

/* ============================ قائمة داخل Google Sheets ============================ */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('كلمتين')
      .addItem('1) تجهيز الأوراق', 'menuSetup_')
      .addItem('2) تعيين كلمة مرور المدير', 'menuPassword_')
      .addItem('3) إعداد إشعارات تيليجرام', 'menuTelegram_')
      .addItem('تحديث ذاكرة المتجر المؤقتة', 'menuCache_')
      .addToUi();
  } catch (e) {}
}
function menuSetup_() { setupSheets(); SpreadsheetApp.getUi().alert('تم تجهيز الأوراق والقيم الافتراضية.'); }
function menuCache_() { dropCache_(); SpreadsheetApp.getUi().alert('تم تحديث الذاكرة المؤقتة.'); }
function menuTelegram_() {
  var ui = SpreadsheetApp.getUi(), a = ui.prompt('إشعارات تيليجرام (1/2)', 'الصق توكن البوت من @BotFather (لا يُحفظ في الشيت، بل في Script Properties فقط).', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt('إشعارات تيليجرام (2/2)', 'اكتب معرّف المحادثة Chat ID (أرقام، قد يبدأ بـ -).', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  try { setTelegram_(a.getResponseText(), b.getResponseText()); var r = tgSend_('✅ تم ربط متجر كلمتين بتيليجرام. ستصلك إشعارات الطلبات هنا.', true); ui.alert(r.ok ? 'تم الربط وأُرسلت رسالة تجريبية.' : 'حُفظت الإعدادات لكن الرسالة التجريبية فشلت: ' + (r.err || '') + '\nتأكد أنك أرسلت /start للبوت أولاً وأن Chat ID صحيح.'); } catch (e) { ui.alert(String(e.message || e)); }
}
function menuPassword_() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('كلمة مرور المدير', 'اكتب كلمة مرور قوية (10 أحرف على الأقل). لن تُخزَّن كنص، بل بصمة مملّحة في Script Properties.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  try { setAdminPassword_(r.getResponseText()); ui.alert('تم حفظ كلمة المرور.'); } catch (e) { ui.alert(String(e.message || e)); }
}

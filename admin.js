/* KELMTEIN — لوحة الإدارة. كل التحقق والصلاحيات في الخادم (Apps Script)؛ هذه الواجهة لا تحمل أي سر.
   كل نص قادم من البيانات يُدرج عبر textContent (لا innerHTML إلا لأيقونات ثابتة). */
/* حماية من clickjacking: لا تعمل الصفحة داخل إطار من نطاق آخر (GitHub Pages لا يتيح ترويسة frame-ancestors). */
(function () { try { if (window.top !== window.self) void window.top.location.href; } catch (e) { document.documentElement.innerHTML = '<body style="font:16px sans-serif;padding:30px;text-align:center"><p>لأسباب أمنية لا يمكن عرض هذه الصفحة داخل موقع آخر.</p><p><a target="_top" rel="noopener" href="' + location.href.split(/[?#]/)[0] + '">افتح الصفحة في نافذة مستقلة</a></p></body>'; throw new Error('framed'); } })();
(function () {
'use strict';
/* replaceChildren لا يفكّ المصفوفات؛ هذا الغلاف يفكّها ويتجاهل null/false */
const _rc = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...k) { const f = []; (function a(x) { if (x == null || x === false) return; if (Array.isArray(x)) x.forEach(a); else f.push(x); })(k); return _rc.apply(this, f); };
const API = (window.KL_CONFIG || {}).api || '', APIOK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(API);
const st = { session: sessionStorage.getItem('kl_admin') || '', boot: null, view: 'home' };
const NS = 'http://www.w3.org/2000/svg';
const SC = { new: '#1a73e8', confirmed: '#7b1fa2', progress: '#b26a00', ready: '#00838f', delivered: '#2e7d32', done: '#1b5e20', cancelled: '#b3261e' };
const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  orders: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  box: '<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/>',
  store: '<path d="M4 21V14M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', check: '<path d="M20 6L9 17l-5-5"/>', truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>', x: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>', cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>', chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>'
};
function svgIcon(n) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[n]; return s; }
function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const k in (a || {})) { const v = a[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (['value', 'checked', 'disabled', 'selected', 'href', 'src', 'type', 'title', 'target', 'rel', 'placeholder', 'min', 'max', 'step', 'maxLength', 'multiple', 'accept', 'rows', 'download'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v); }
  (function add(x) { if (x == null || x === false) return; if (Array.isArray(x)) return x.forEach(add); e.appendChild(x.nodeType ? x : document.createTextNode(String(x))); })(kids);
  return e;
}
const $ = s => document.querySelector(s), SAR = n => (Math.round(n * 100) / 100).toLocaleString('en-US') + ' ر.س';
const fdate = t => new Date(t).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const badge = (s, lbl) => h('span', { class: 'badge', style: 'background:' + (SC[s] || '#777') }, lbl || (st.boot && st.boot.statuses[s]) || s);
function toast(m, kind) { const t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, m); document.body.appendChild(t); setTimeout(() => t.remove(), 3600); }

/* ---------- الاتصال بالخادم ---------- */
const perf = [];   // آخر الاستدعاءات: الزمن الكلي في المتصفح مقابل زمن التنفيذ في الخادم (لتشخيص البطء)
async function call(action, body) {
  if (!APIOK) throw new Error('خدمة Apps Script غير مربوطة (راجع config.js)');
  const t0 = performance.now(); let j;
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, session: st.session }, body || {})) });
    j = await r.json();
  } catch (e) { throw new Error('تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.'); }
  perf.push({ a: action, t: Math.round(performance.now() - t0), s: j && typeof j._ms === 'number' ? j._ms : null }); if (perf.length > 40) perf.shift();
  if (j && j.auth === false) { logout(true); throw new Error(j.err); }
  if (!j || !j.ok) throw new Error((j && j.err) || 'خطأ غير متوقع');
  return j;
}
const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message || String(e), 'bad'); } };
async function reboot() { st.boot = await call('admin.bootstrap'); }
function logout(expired) { if (!expired && st.session) call('admin.logout').catch(() => {}); st.session = ''; sessionStorage.removeItem('kl_admin'); st.boot = null; renderLogin(expired ? 'انتهت الجلسة، سجّل الدخول من جديد' : ''); }

/* ---------- الدخول ---------- */
function renderLogin(msg) {
  const pw = h('input', { type: 'password', placeholder: 'كلمة مرور المدير', autocomplete: 'current-password', 'aria-label': 'كلمة المرور' });
  const err = h('p', { style: 'color:var(--bad);min-height:22px;margin:8px 0' }, msg || '');
  const btn = h('button', { class: 'btn', style: 'width:100%' }, 'دخول');
  const go = async () => { btn.disabled = true; err.textContent = ''; try { const j = await call('login', { password: pw.value, init: 1 }); st.session = j.session; sessionStorage.setItem('kl_admin', j.session); await start(j.init); } catch (e) { err.textContent = e.message; btn.disabled = false; } };
  btn.onclick = go; pw.onkeydown = e => { if (e.key === 'Enter') go(); };
  $('#root').replaceChildren(h('div', { class: 'login' }, h('div', { class: 'card' }, h('img', { src: 'assets/logo.jpg', alt: 'كلمتين' }), h('h1', { style: 'margin:10px 0 4px' }, 'إدارة كلمتين'), h('p', { class: 'sub' }, 'للمدير فقط'), pw, err, btn,
    !APIOK ? h('p', { class: 'note warn', style: 'margin-top:14px' }, 'خدمة Apps Script غير مربوطة بعد. ضع رابطها في config.js (راجع README).') : null,
    h('a', { class: 'btn s sm', id: 'back-store', href: 'index.html', style: 'margin-top:14px;display:inline-block;text-decoration:none' }, '← العودة إلى المتجر'))));
  setTimeout(() => pw.focus(), 50);
}

/* ---------- الإطار والتنقل ---------- */
const NAV = [['home', 'الرئيسية', 'home'], ['orders', 'الطلبات', 'orders'], ['customers', 'العملاء', 'users'], ['products', 'المنتجات', 'box'], ['store', 'إدارة المتجر', 'store'], ['settings', 'الإعدادات', 'gear']];
function shell() {
  const side = h('aside', { class: 'side' }, h('div', { class: 'brand' }, h('img', { src: 'assets/favicon.jpg', alt: '' }), h('div', null, h('b', null, 'كلمتين'), h('small', null, 'لوحة الإدارة'))),
    h('nav', { class: 'nav' }, NAV.map(n => h('button', { 'data-v': n[0], onclick: () => go(n[0]) }, svgIcon(n[2]), n[1]))),
    h('button', { class: 'out', onclick: () => logout(false) }, 'تسجيل الخروج'));
  const bn = h('nav', { class: 'bn' }, NAV.map(n => h('button', { 'data-v': n[0], onclick: () => go(n[0]) }, svgIcon(n[2]), n[1].replace('إدارة ', ''))));
  /* شريط علوي ثابت في كل الأقسام: العودة إلى المتجر دون كتابة رابط */
  const top = h('div', { class: 'top' }, h('a', { class: 'btn s sm', id: 'back-store', href: 'index.html', title: 'فتح المتجر' }, '← العودة إلى المتجر'), h('small', { style: 'color:var(--mut)' }, 'لوحة إدارة كلمتين'));
  $('#root').replaceChildren(h('div', { class: 'app' }, side, h('div', { class: 'col' }, top, h('main', { id: 'main' }))), bn);
}
function go(v) { st.view = v; if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v); document.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(); window.scrollTo(0, 0); }
const VIEWS = { home: vHome, orders: vOrders, customers: vCustomers, products: vProducts, store: vStore, settings: vSettings };
let seq = 0;
async function render() {
  const m = $('#main'), me = ++seq; m.replaceChildren(h('p', { class: 'empty' }, 'جاري التحميل…'));
  try { const nodes = await VIEWS[st.view](); if (me === seq) m.replaceChildren(...[].concat(nodes)); }
  catch (e) { if (me === seq) m.replaceChildren(h('div', { class: 'note warn' }, e.message || String(e)), h('button', { class: 'btn s', onclick: render }, 'إعادة المحاولة')); }
}
function modal(content) { const ov = h('div', { class: 'ov', onmousedown: e => { if (e.target === ov) ov.remove(); } }, h('div', { class: 'card', role: 'dialog', 'aria-modal': 'true' }, content)); document.body.appendChild(ov); return ov; }
const field = (label, input) => h('label', { class: 'f' }, label, input);

/* ---------- أدوات الجوال والرسائل ---------- */
/* يحوّل أي صيغة مخزّنة (+966… / 05… / 5… / 00966… / رقم دولي) إلى +CCNNN، أو '' إن كان غير صالح */
function intlPhone(p) { let s = String(p == null ? '' : p).replace(/[\s\-().]/g, ''); if (/^00[1-9]/.test(s)) s = '+' + s.slice(2); const m = s.match(/^(?:\+?966|0)?(5\d{8})$/); if (m) return '+966' + m[1]; if (/^\+966/.test(s)) return ''; return /^\+[1-9]\d{7,14}$/.test(s) ? s : ''; }
function copyText(t, okMsg) {
  const done = () => toast(okMsg || 'تم النسخ', 'ok');
  const fb = () => { const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0' }); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (_) { toast('تعذّر النسخ، انسخ يدوياً', 'bad'); } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
}
/* المتغيرات: {name} {order} {total} {status} {store} {link}. إن لم يتوفر رابط يُحذف السطر الذي يحتوي {link} */
function fillTpl(body, v) { return String(body || '').split('\n').filter(l => v.link || l.indexOf('{link}') < 0).join('\n').replace(/\{(name|order|total|status|store|link)\}/g, (_, k) => v[k] == null ? '' : v[k]); }
const waTemplates = () => { const t = st.boot && st.boot.settings && st.boot.settings.waTemplates; return Array.isArray(t) && t.length ? t : ((st.boot && st.boot.waTemplatesDefault) || []); };
const STATUS_TPL = { new: 'received', confirmed: 'confirm', progress: 'status', ready: 'out', delivered: 'delivered', done: 'delivered', cancelled: 'status' };
const TPL_FB = { out: 'ready', delivered: 'status' };   // إن كانت قوالب العميل المحفوظة تخلو من القالب الجديد
const WA_QUICK = [['received', 'تأكيد الاستلام'], ['confirm', 'تأكيد الطلب'], ['out', 'خارج للتسليم'], ['delivered', 'تم التسليم']];
function goOrders(pre) { st.preset = pre || {}; document.querySelectorAll('.ov').forEach(o => o.remove()); go('orders'); }
const waBtn = (num, text, label) => h('a', { class: 'btn wa sm', href: 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : ''), target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, label || 'واتساب');

/* ---------- الرئيسية ---------- */
function donut(counts) {
  const keys = ['new', 'confirmed', 'progress', 'ready', 'delivered', 'done', 'cancelled'], tot = keys.reduce((s, k) => s + counts[k], 0) || 1, R = 38, C = 2 * Math.PI * R;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('width', '170'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'توزيع الطلبات حسب الحالة');
  let off = 0;
  const bg = document.createElementNS(NS, 'circle'); [['cx', 50], ['cy', 50], ['r', R], ['fill', 'none'], ['stroke', '#f1ebe0'], ['stroke-width', 14]].forEach(([a, v]) => bg.setAttribute(a, v)); svg.appendChild(bg);
  keys.forEach(k => { if (!counts[k]) return; const len = counts[k] / tot * C, c = document.createElementNS(NS, 'circle');
    [['cx', 50], ['cy', 50], ['r', R], ['fill', 'none'], ['stroke', SC[k]], ['stroke-width', 14], ['stroke-dasharray', len + ' ' + (C - len)], ['stroke-dashoffset', -off], ['transform', 'rotate(-90 50 50)']].forEach(([a, v]) => c.setAttribute(a, v)); svg.appendChild(c); off += len; });
  const t = document.createElementNS(NS, 'text'); [['x', 50], ['y', 55], ['text-anchor', 'middle'], ['font-size', 17], ['font-weight', 700], ['fill', '#2b221b']].forEach(([a, v]) => t.setAttribute(a, v)); t.textContent = counts.total; svg.appendChild(t);
  return svg;
}
function bars(series) {
  const W = 560, H = 170, mx = Math.max(1, ...series.map(s => s.sales)), bw = W / series.length, svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 24}`); svg.setAttribute('style', 'width:100%;height:auto'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'مبيعات آخر 14 يوماً');
  series.forEach((s, i) => { const bh = s.sales / mx * H, r = document.createElementNS(NS, 'rect'); [['x', i * bw + 6], ['y', H - bh], ['width', bw - 12], ['height', Math.max(bh, s.sales ? 3 : 1)], ['rx', 5], ['fill', s.sales ? '#84593d' : '#ece4d8']].forEach(([a, v]) => r.setAttribute(a, v));
    const t = document.createElementNS(NS, 'title'); t.textContent = s.d + ' — ' + SAR(s.sales) + ' — ' + s.orders + ' طلب'; r.appendChild(t); svg.appendChild(r);
    const l = document.createElementNS(NS, 'text'); [['x', i * bw + bw / 2], ['y', H + 17], ['text-anchor', 'middle'], ['font-size', 11], ['fill', '#7a6d60']].forEach(([a, v]) => l.setAttribute(a, v)); l.textContent = s.d.slice(8); svg.appendChild(l); });
  return svg;
}
async function vHome() {
  const pre = st.dash; st.dash = null;
  const [d] = await Promise.all([pre || call('admin.dashboard'), st.boot ? 0 : reboot()]), c = d.counts;
  /* البطاقة القابلة للنقر تفتح الطلبات مصفّاة بحالتها */
  const stat = (lbl, val, ic, flt) => { const e = h('div', Object.assign({ class: 'card stat' + (flt != null ? ' click' : '') }, flt != null ? { role: 'button', tabindex: '0', 'data-filter': flt || 'all', 'aria-label': lbl + ': ' + val + ' — عرض الطلبات' } : {}), h('div', { class: 'ic' }, svgIcon(ic)), h('div', null, h('b', null, val), h('span', null, lbl))); if (flt != null) { const go1 = () => goOrders({ status: flt }); e.addEventListener('click', go1); e.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go1(); } }); } return e; };
  const lst = (arr, unit) => arr.length ? h('div', null, arr.map(x => h('div', { class: 'row', style: 'justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--ln)' }, h('span', null, x.name), h('b', null, x.count + ' ' + unit)))) : h('p', { class: 'empty' }, 'لا بيانات بعد');
  const stNames = st.boot.statuses;
  return [h('h1', null, 'الرئيسية'), h('p', { class: 'sub' }, 'أرقام فعلية من الطلبات المسجلة'),
    d.changes > 0 ? h('div', { class: 'note warn', id: 'ap-alert', role: 'button', tabindex: '0', style: 'cursor:pointer;margin:0 0 14px', onclick: () => goOrders({ approval: 'changes' }) }, '✎ ' + d.changes + ' طلب بانتظار تعديل التصميم — اضغط للعرض') : null,
    h('div', { class: 'grid g4' }, stat('إجمالي الطلبات', c.total, 'orders', ''), stat('طلبات جديدة', c['new'], 'bolt', 'new'), stat('قيد التنفيذ', c.progress, 'clock', 'progress'), stat('مكتملة', c.done, 'check', 'done'), stat('تم توصيلها', c.delivered, 'truck', 'delivered'), stat('ملغاة', c.cancelled, 'x', 'cancelled'),
      stat('إجمالي المبيعات', SAR(d.sales), 'money'), stat('مبيعات اليوم', SAR(d.salesToday), 'cal'), stat('مبيعات الشهر', SAR(d.salesMonth), 'chart'), stat('متوسط الطلب', SAR(d.avg), 'money')),
    h('div', { class: 'grid g2', style: 'margin-top:14px' },
      h('div', { class: 'card' }, h('h3', null, 'المبيعات — آخر 14 يوماً'), bars(d.series)),
      h('div', { class: 'card' }, h('h3', null, 'الطلبات حسب الحالة'), h('div', { class: 'row', style: 'justify-content:center' }, donut(c), h('div', null, Object.keys(stNames).map(k => h('div', { style: 'margin:3px 0;font-size:13px' }, h('span', { class: 'swatch', style: 'width:12px;height:12px;background:' + SC[k] }), ' ' + stNames[k] + ': ' + (c[k] || 0))))))),
    h('div', { class: 'grid g2', style: 'margin-top:14px' },
      h('div', { class: 'card' }, h('h3', null, 'أحدث الطلبات'), d.latest.length ? d.latest.map(o => h('div', { class: 'row', style: 'justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--ln);cursor:pointer', onclick: () => openOrder(o.id) }, h('div', null, h('b', null, o.name), h('small', { style: 'display:block;color:var(--mut);direction:ltr;text-align:start' }, o.id), h('small', { style: 'display:block;color:var(--mut)' }, fdate(o.createdAt))), h('div', { style: 'text-align:end' }, h('b', null, SAR(o.total)), h('div', null, badge(o.status, o.statusLabel))))) : h('p', { class: 'empty' }, 'لا طلبات بعد')),
      h('div', null, h('div', { class: 'card' }, h('h3', null, 'الألوان الأكثر طلباً'), lst(d.topColors, 'كوب')), h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', null, 'أماكن النقش الأكثر طلباً'), lst(d.topPlaces, 'طلب'))))];
}

/* ---------- الطلبات ---------- */
async function vOrders() {
  if (!st.boot) await reboot();
  const pre = st.preset || {}; st.preset = null;     // الفلتر القادم من بطاقة الإحصائيات أو من العميل (في الذاكرة فقط، لا في الرابط)
  let apf = pre.approval || '';
  const q = h('input', { type: 'search', placeholder: 'ابحث: رقم الطلب أو الاسم أو الجوال', class: 'grow', value: pre.q || '' }), s = h('select', { 'aria-label': 'الحالة' }, h('option', { value: '' }, 'كل الحالات'), Object.entries(st.boot.statuses).map(([k, v]) => h('option', { value: k }, v)));
  s.value = pre.status || '';
  const f = h('input', { type: 'date', 'aria-label': 'من تاريخ' }), t = h('input', { type: 'date', 'aria-label': 'إلى تاريخ' }), box = h('div', { class: 'card', style: 'padding:6px' }), cnt = h('p', { class: 'sub', style: 'margin:0 0 10px' });
  const chips = h('div', { class: 'tabs chips', role: 'group', 'aria-label': 'تصفية حسب الحالة' });
  const all = h('button', { class: 'btn s sm', id: 'show-all', onclick: () => { q.value = ''; f.value = ''; t.value = ''; s.value = ''; apf = ''; load(); } }, 'عرض جميع الطلبات');
  let tm;
  const load = guard(async () => {
    const r = await call('admin.orders', { q: q.value, status: s.value, from: f.value, to: t.value, approval: apf });
    cnt.textContent = r.total + ' طلب' + (r.total > r.orders.length ? ' (يُعرض أحدث ' + r.orders.length + ')' : '') + (s.value ? ' — حالة: ' + st.boot.statuses[s.value] : '') + (apf === 'changes' ? ' — بانتظار تعديل التصميم' : '');
    const C = r.counts || {};
    chips.replaceChildren([['', 'الكل', C.all || 0]].concat(Object.entries(st.boot.statuses).map(([k, v]) => [k, v, C[k] || 0])).map(([k, v, n]) => h('button', { class: s.value === k ? 'on' : '', 'data-st': k || 'all', onclick: () => { s.value = k; load(); } }, v + ' (' + n + ')')));
    all.hidden = !(q.value || s.value || f.value || t.value || apf);
    box.replaceChildren(r.orders.length ? [h('div', { class: 'li h' }, h('span', null, 'الطلب'), h('span', null, 'العميل'), h('span', null, 'التاريخ'), h('span', null, 'الإجمالي'), h('span', null, 'الحالة'))].concat(r.orders.map(o => h('div', { class: 'li', onclick: () => openOrder(o.id) }, h('span', null, h('b', null, o.id), h('small', null, o.qty + ' × ')), h('span', null, o.name, h('small', { style: 'direction:ltr;text-align:start' }, intlPhone(o.phone) || o.phone)), h('span', null, fdate(o.createdAt)), h('b', null, SAR(o.total)), h('span', null, badge(o.status, o.statusLabel), o.approval ? h('small', { class: 'apb', 'data-ap': o.approval, style: 'font-weight:700;color:' + (o.approval === 'approved' ? '#2e7d32' : '#b3261e') }, o.approval === 'approved' ? '✓ معتمد من العميل' : '✎ طلب تعديل') : null)))) : h('p', { class: 'empty' }, 'لا توجد طلبات مطابقة'));
  });
  q.oninput = () => { clearTimeout(tm); tm = setTimeout(load, 300); }; [s, f, t].forEach(x => x.onchange = load); setTimeout(load, 0);
  return [h('h1', null, 'الطلبات'), h('p', { class: 'sub' }, 'اضغط على أي طلب لفتح تفاصيله والتواصل مع العميل وتغيير حالته'), chips, h('div', { class: 'row', style: 'margin-bottom:12px' }, q, s, f, t, h('button', { class: 'btn s', onclick: load }, 'تحديث'), all), cnt, box];
}
function siteLink(tok, kind) { const b = ((st.boot && st.boot.settings.siteUrl) || '').trim() || (/^https?:$/.test(location.protocol) ? location.href.split(/[?#]/)[0].replace(/[^\/]*$/, '') : ''); return b ? b + '?' + (kind || 't') + '=' + tok : ''; }
function regionName(id) { const r = st.boot && st.boot.products.find(p => p.id === id && p.kind === 'region'); return r ? r.name : id; }
const openOrder = guard(async function (id) {
  const ov = modal(h('p', { class: 'empty' }, 'جاري التحميل…')), body = ov.firstChild;   // النافذة تظهر فوراً عند الضغط
  let tplId = null;
  const draw = async (pre) => {
    const rr = pre || await call('admin.order', { id }), oo = rr.order, S0 = st.boot.settings, ph = intlPhone(oo.phone), wn = ph.replace(/\D/g, ''), lnk = siteLink(oo.token), pvl = siteLink(oo.token, 'p');
    const vars = () => ({ name: oo.name, order: oo.id, total: SAR(oo.total), status: (st.boot.statusClient || {})[oo.status] || st.boot.statuses[oo.status] || '', store: S0.storeName || 'كلمتين', link: oo.previewRevoked ? '' : lnk });
    const tpls = waTemplates(); if (!tpls.some(x => x.id === tplId)) tplId = (TPL_FB[tplId] && tpls.some(x => x.id === TPL_FB[tplId])) ? TPL_FB[tplId] : (tpls[0] && tpls[0].id);
    const tplById = id => tpls.find(x => x.id === id) || ((st.boot.waTemplatesDefault || []).find(x => x.id === id));
    const msg = h('textarea', { rows: 6, 'aria-label': 'نص الرسالة', id: 'wa-msg', style: 'min-height:130px' }); msg.value = fillTpl((tpls.find(x => x.id === tplId) || {}).body, vars());
    const sel = h('select', { id: 'wa-tpl', 'aria-label': 'قالب الرسالة', onchange: () => { tplId = sel.value; msg.value = fillTpl((tpls.find(x => x.id === tplId) || {}).body, vars()); } }, tpls.map(x => h('option', { value: x.id, selected: x.id === tplId }, x.title)));
    body.replaceChildren(
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', null, h('h2', { style: 'margin:0' }, oo.id), h('small', { style: 'color:var(--mut)' }, fdate(oo.createdAt))), badge(oo.status, oo.statusLabel), h('button', { class: 'btn s sm', onclick: () => { ov.remove(); } }, 'إغلاق')),
      h('h3', { style: 'margin-top:16px' }, 'الحالة'),
      h('div', { class: 'steps' }, Object.entries(st.boot.statuses).map(([k, v]) => h('button', { class: oo.status === k ? 'on' : '', style: oo.status === k ? 'background:' + SC[k] : '', onclick: guard(async () => { await call('admin.setStatus', { id, status: k }); toast('تم تغيير الحالة إلى: ' + v, 'ok'); tplId = STATUS_TPL[k] || tplId; await draw(); if (st.view === 'orders' || st.view === 'home') render(); }) }, v))),
      h('div', { class: 'card inset', style: 'margin-top:16px' },
        h('h3', null, 'العميل'),
        h('div', { class: 'cname' }, oo.name),
        h('div', { class: 'cphone', dir: 'ltr', id: 'cust-phone' }, ph || oo.phone),
        !ph ? h('p', { class: 'note warn', style: 'margin:8px 0 0' }, 'رقم الجوال المسجّل غير صالح بصيغة دولية؛ تأكد منه قبل التواصل.') : null,
        h('div', { class: 'row', style: 'margin-top:10px' },
          ph ? waBtn(wn, '', 'فتح محادثة واتساب') : null,
          h('button', { class: 'btn s sm', id: 'copy-phone', onclick: () => copyText(ph || oo.phone, 'تم نسخ رقم الجوال') }, 'نسخ الرقم'),
          ph ? h('a', { class: 'btn s sm', id: 'call-phone', href: 'tel:' + ph, style: 'text-decoration:none' }, 'اتصال') : null,
          oo.customerCount > 1 ? h('button', { class: 'btn s sm', id: 'cust-orders', onclick: () => goOrders({ q: ph || oo.phone }) }, 'كل طلبات العميل (' + oo.customerCount + ')') : null)),
      h('div', { class: 'card inset', style: 'margin-top:12px' },
        h('h3', null, 'رسالة واتساب جاهزة'),
        h('div', { style: 'margin-bottom:10px' }, h('small', { style: 'color:var(--mut);display:block;margin-bottom:6px' }, 'إرسال بضغطة واحدة (تفتح واتساب والرسالة جاهزة):'),
          h('div', { class: 'row', id: 'wa-quick' }, WA_QUICK.map(([tid, lb]) => h('button', { class: 'btn wa sm', id: 'wa-q-' + tid, 'data-tpl': tid, disabled: !wn, onclick: () => { const t = tplById(tid); if (!t) return toast('القالب غير موجود', 'bad'); window.open('https://wa.me/' + wn + '?text=' + encodeURIComponent(fillTpl(t.body, vars())), '_blank', 'noopener'); } }, lb)))),
        h('div', { class: 'row', style: 'margin-bottom:8px' }, sel, h('button', { class: 'btn s sm', onclick: () => { storeTab = 'wa'; ov.remove(); go('store'); } }, 'تعديل القوالب')),
        msg,
        h('div', { class: 'row', style: 'margin-top:8px' },
          h('button', { class: 'btn wa', id: 'wa-send', disabled: !wn, onclick: () => { if (!msg.value.trim()) return toast('الرسالة فارغة', 'bad'); window.open('https://wa.me/' + wn + '?text=' + encodeURIComponent(msg.value), '_blank', 'noopener'); } }, 'إرسال عبر واتساب'),
          h('button', { class: 'btn s', id: 'wa-copy', onclick: () => copyText(msg.value, 'تم نسخ الرسالة') }, 'نسخ الرسالة')),
        h('small', { style: 'color:var(--mut);display:block;margin-top:6px' }, 'الرسالة قابلة للتعديل قبل الإرسال، ولا تُحفظ في النظام.')),
      h('h3', { style: 'margin-top:16px' }, 'تفاصيل الطلب'),
      h('dl', { class: 'kv' }, h('dt', null, 'العنوان'), h('dd', null, [oo.city, oo.region, oo.district, oo.address].filter(Boolean).join(' - ')), oo.notes ? [h('dt', null, 'ملاحظات العميل'), h('dd', null, oo.notes)] : null, h('dt', null, 'تسويق'), h('dd', null, oo.marketing)),
      (() => { const a = oo.approval || { state: '' }, T = { '': ['بانتظار اعتماد العميل', '#b26a00'], approved: ['اعتمد العميل التصميم', '#2e7d32'], changes: ['العميل طلب تعديلاً', '#b3261e'] }[a.state || ''];
        return h('div', { class: 'card inset', id: 'ap-box', style: 'margin:12px 0' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, 'اعتماد التصميم'), h('span', { class: 'badge', id: 'ap-badge', 'data-state': a.state || 'pending', style: 'background:' + T[1] }, T[0])),
          a.at ? h('small', { style: 'color:var(--mut)' }, fdate(a.at)) : null, a.note ? h('p', { id: 'ap-note', style: 'margin:8px 0;white-space:pre-wrap' }, a.note) : null,
          a.state ? h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn s sm', id: 'ap-reset', onclick: guard(async () => { await call('admin.approvalReset', { id }); toast('أُعيد فتح الاعتماد للعميل', 'ok'); draw(); }) }, 'إعادة فتح الاعتماد (بعد تعديل التصميم)')) : null,
          h('small', { style: 'display:block;color:var(--mut);margin-top:6px' }, 'يرى العميل التصميم والحالة فقط عبر رابط التتبع، ويعتمد أو يطلب تعديلاً ما دام الطلب قبل «جاهز».')); })(),
      h('h3', null, 'التصميم'),
      h('div', { class: 'tw' }, h('table', { class: 'tb' }, h('tr', null, ['الكوب', 'المكان', 'النص', 'الخط', 'الحجم', 'الموضع'].map(x => h('th', null, x))), rr.items.map(i => h('tr', null, h('td', null, i.cup ? i.cup + ' — ' + i.color : '—'), h('td', null, i.place), h('td', null, [i.text, i.text2].filter(Boolean).join(' / ')), h('td', null, i.font), h('td', null, i.sizePct ? i.sizePct + '%' : ''), h('td', null, i.position ? regionName(i.position) : ''))))),
      pvl ? h('iframe', { src: pvl, title: 'معاينة التصميم', style: 'width:100%;height:420px;border:1px solid var(--ln);border-radius:12px;margin-top:10px', loading: 'lazy' }) : h('p', { class: 'note warn' }, 'لعرض المعاينة هنا ولمشاركتها: اضبط «رابط الموقع» من إدارة المتجر ← التواصل.'),
      h('div', { class: 'row', style: 'margin:10px 0' }, lnk ? [h('input', { value: lnk, readOnly: true, class: 'grow', 'aria-label': 'رابط تتبع الطلب', onfocus: e => e.target.select() }), h('button', { class: 'btn s sm', onclick: () => copyText(lnk, 'تم نسخ الرابط') }, 'نسخ'), h('a', { class: 'btn s sm', href: lnk, target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, 'فتح')] : null,
        h('button', { class: 'btn ' + (oo.previewRevoked ? 's' : 'd') + ' sm', onclick: guard(async () => { await call('admin.revokePreview', { token: oo.token, revoke: !oo.previewRevoked }); toast(oo.previewRevoked ? 'أُعيد تفعيل الرابط' : 'أُلغي الرابط', 'ok'); draw(); }) }, oo.previewRevoked ? 'إعادة تفعيل الرابط' : 'إلغاء رابط المعاينة'), oo.previewExpires ? h('small', { style: 'color:var(--mut)' }, 'ينتهي: ' + fdate(oo.previewExpires)) : null),
      h('h3', null, 'السعر'),
      h('table', { class: 'tb' }, oo.breakdown.map(b => h('tr', null, h('td', null, b[0]), h('td', { style: 'text-align:end;white-space:nowrap' }, SAR(b[1])))), h('tr', null, h('td', null, 'الكمية'), h('td', { style: 'text-align:end' }, '× ' + oo.qty)), h('tr', null, h('td', null, h('b', null, 'الإجمالي (حسبه الخادم)')), h('td', { style: 'text-align:end' }, h('b', null, SAR(oo.total))))),
      Math.abs(oo.clientTotal - oo.total) > 0.001 ? h('p', { class: 'note warn' }, 'السعر المرسل من المتصفح كان ' + SAR(oo.clientTotal) + ' وتم اعتماد سعر الخادم.') : null,
      h('h3', { style: 'margin-top:14px' }, 'الملاحظات والسجل'),
      h('div', null, oo.notesLog.length ? oo.notesLog.slice().reverse().map(n => h('div', { style: 'padding:7px 0;border-bottom:1px solid var(--ln);font-size:14px' }, h('small', { style: 'color:var(--mut)' }, fdate(n.t) + (n.k === 'status' ? ' · تغيير حالة' : n.k === 'approval' ? ' · اعتماد التصميم' : ' · ملاحظة') + ' — '), n.x)) : h('p', { class: 'empty', style: 'padding:10px' }, 'لا ملاحظات')),
      (() => { const ta = h('textarea', { placeholder: 'أضف ملاحظة داخلية (لا تظهر للعميل)', maxLength: 500 }); return h('div', { style: 'margin-top:8px' }, ta, h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: guard(async () => { if (!ta.value.trim()) return; await call('admin.note', { id, text: ta.value }); toast('أُضيفت الملاحظة', 'ok'); draw(); }) }, 'حفظ الملاحظة')); })());
  };
  try { const [r0] = await Promise.all([call('admin.order', { id }), st.boot ? 0 : reboot()]); await draw(r0); }   // طلب واحد فقط (كان طلبين متتاليين)
  catch (e) { ov.remove(); throw e; }
});

/* ---------- العملاء ---------- */
async function vCustomers() {
  const r = await call('admin.customers'), q = h('input', { type: 'search', placeholder: 'ابحث بالاسم أو الجوال', class: 'grow' }), box = h('div', { class: 'card', style: 'padding:6px' });
  const draw = () => { const s = q.value.trim().toLowerCase(), L = r.customers.filter(c => !s || (c.name + ' ' + c.phone).toLowerCase().includes(s));
    box.replaceChildren(L.length ? [h('div', { class: 'li h' }, h('span', null, 'العميل'), h('span', null, 'المدينة'), h('span', null, 'آخر طلب'), h('span', null, 'الطلبات'), h('span', null, 'المشتريات'))].concat(L.map(c => h('div', { class: 'li', onclick: () => custModal(c) }, h('span', null, h('b', null, c.name), h('small', null, c.phone)), h('span', null, c.city), h('span', null, fdate(c.last)), h('span', null, c.count + ' طلب'), h('b', null, SAR(c.spent))))) : h('p', { class: 'empty' }, 'لا يوجد عملاء بعد')); };
  q.oninput = draw; draw();
  return [h('h1', null, 'العملاء'), h('p', { class: 'sub' }, r.customers.length + ' عميل — مجمّعون من الطلبات حسب رقم الجوال'), h('div', { class: 'row', style: 'margin-bottom:12px' }, q), box];
}
function custModal(c) {
  const ov = modal(null), ph = intlPhone(c.phone), wn = ph.replace(/\D/g, '');
  ov.firstChild.replaceChildren(h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0' }, c.name), h('button', { class: 'btn s sm', onclick: () => ov.remove() }, 'إغلاق')),
    h('dl', { class: 'kv', style: 'margin-top:12px' }, h('dt', null, 'الجوال'), h('dd', { dir: 'ltr', style: 'text-align:start' }, ph || c.phone), h('dt', null, 'المدينة'), h('dd', null, c.city), h('dt', null, 'إجمالي المشتريات'), h('dd', null, h('b', null, SAR(c.spent)), ' (بدون الملغاة)'), h('dt', null, 'عدد الطلبات'), h('dd', null, c.count)),
    h('div', { class: 'row', style: 'margin-bottom:6px' }, ph ? waBtn(wn, '', 'فتح محادثة واتساب') : null, h('button', { class: 'btn s sm', onclick: () => copyText(ph || c.phone, 'تم نسخ رقم الجوال') }, 'نسخ الرقم'), ph ? h('a', { class: 'btn s sm', href: 'tel:' + ph, style: 'text-decoration:none' }, 'اتصال') : null, h('button', { class: 'btn s sm', id: 'cust-all', onclick: () => goOrders({ q: ph || c.phone }) }, 'عرض طلباته في قائمة الطلبات')),
    h('h3', null, 'الطلبات السابقة'), c.orders.map(o => h('div', { class: 'row', style: 'justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--ln);cursor:pointer', onclick: () => { ov.remove(); openOrder(o.id); } }, h('span', null, h('b', null, o.id), h('small', { style: 'display:block;color:var(--mut)' }, fdate(o.t))), h('span', null, SAR(o.total)), badge(o.status, o.statusLabel))));
}

/* ---------- صور وأدوات ---------- */
const PHD = { cream: [640, 590], grey: [630, 630], olive: [800, 818] }, DEFPT = { cream: [320 / 640, 245 / 590], grey: [315 / 630, 330 / 630], olive: [403 / 800, 290 / 818] };
const imgCache = {};
async function colorImg(c) {
  if (window.CUPIMG && window.CUPIMG[c.id]) return window.CUPIMG[c.id];
  if (imgCache[c.id]) return imgCache[c.id];
  const r = await (await fetch(API + '?action=img&id=' + encodeURIComponent(c.data.imgId))).json();
  if (!r.ok) throw new Error('تعذّر تحميل صورة الكوب');
  return (imgCache[c.id] = 'data:' + r.mime + ';base64,' + r.b64);
}
async function compress(file, max, q) {
  const bmp = await createImageBitmap(file), s = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * s)), hh = Math.max(1, Math.round(bmp.height * s));
  const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(bmp, 0, 0, w, hh);
  let b = await new Promise(r => c.toBlob(r, 'image/webp', q)); if (!b || b.type !== 'image/webp') b = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
  return { blob: b, w, h: hh };
}
const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
const upload = async (blob, label) => (await call('admin.upload', { mime: blob.type, b64: await b64(blob), label })).id;
const kb = n => Math.round(n / 1024) + ' ك.ب', clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sw = (label, checked, on) => { const i = h('input', { type: 'checkbox', checked: !!checked }); if (on) i.onchange = () => on(i.checked); return h('label', { class: 'sw' }, i, label); };

/* ---------- المنتجات (أنواع/ألوان الأكواب) ---------- */
async function vProducts() {
  await reboot();
  const cols = st.boot.products.filter(p => p.kind === 'color'), box = h('div', { class: 'grid g2' });
  cols.forEach((c, i) => {
    const img = h('img', { alt: '', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }); colorImg(c).then(u => img.src = u).catch(() => {});
    const builtin = c.data && c.data.builtin, customs = cols.filter(x => !(x.data && x.data.builtin));
    box.appendChild(h('div', { class: 'card pc' }, img, h('div', { class: 'grow', style: 'min-width:0' }, h('b', null, c.name, ' ', h('span', { class: 'swatch', style: 'background:' + (c.data.hex || '#ccc') })), h('div', { style: 'color:var(--mut);font-size:13px;margin:3px 0' }, 'فرق السعر: ' + (c.price ? SAR(c.price) : 'بدون') + ' · ' + (c.active ? 'ظاهر للعملاء' : 'مخفي')), h('div', { class: 'row', style: 'gap:6px' },
      h('button', { class: 'btn s sm', onclick: () => editColor(c) }, 'تعديل'),
      h('button', { class: 'btn s sm', onclick: guard(async () => { await call('admin.saveProduct', { item: { id: c.id, kind: 'color', name: c.name, price: c.price, active: !c.active, data: c.data } }); toast(c.active ? 'تم الإخفاء' : 'تم الإظهار', 'ok'); render(); }) }, c.active ? 'إخفاء' : 'إظهار'),
      !builtin ? [h('button', { class: 'btn s sm', 'aria-label': 'أعلى', onclick: guard(async () => { const ids = customs.map(x => x.id), k = ids.indexOf(c.id); if (k < 1) return; [ids[k - 1], ids[k]] = [ids[k], ids[k - 1]]; await call('admin.reorder', { kind: 'color', ids }); render(); }) }, '↑'), h('button', { class: 'btn s sm', 'aria-label': 'أسفل', onclick: guard(async () => { const ids = customs.map(x => x.id), k = ids.indexOf(c.id); if (k < 0 || k >= ids.length - 1) return; [ids[k + 1], ids[k]] = [ids[k], ids[k + 1]]; await call('admin.reorder', { kind: 'color', ids }); render(); }) }, '↓'),
        h('button', { class: 'btn d sm', onclick: guard(async () => { if (!confirm('حذف «' + c.name + '» نهائياً؟ الطلبات السابقة لن تتأثر.')) return; await call('admin.deleteProduct', { id: c.id }); toast('تم الحذف', 'ok'); render(); }) }, 'حذف')] : null))));
  });
  return [h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', { class: 'grow' }, h('h1', null, 'المنتجات'), h('p', { class: 'sub' }, 'أنواع الأكواب (الألوان) المتاحة للعميل. أسعار النقش والإضافات من «إدارة المتجر ← الأسعار».')), h('button', { class: 'btn', onclick: () => editColor(null) }, '+ إضافة لون/منتج')), box];
}
function editColor(c) {
  const isNew = !c, builtin = c && c.data && c.data.builtin, ov = modal(null), body = ov.firstChild;
  const name = h('input', { value: c ? c.name : '', maxLength: 40 }), hex = h('input', { type: 'color', value: c ? c.data.hex : '#c8b89a', style: 'padding:3px;height:44px' }), price = h('input', { type: 'number', min: 0, step: 1, value: c ? c.price : 0 }), act = sw('ظاهر للعملاء', c ? c.active : true);
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' }), prev = h('img', { alt: '', style: 'max-width:160px;border-radius:12px;display:block;margin-top:8px;background:var(--cr)' });
  let pic = null; if (c) colorImg(c).then(u => prev.src = u).catch(() => {});
  file.onchange = guard(async () => { const f = file.files[0]; if (!f) return; if (f.size > 12e6) throw new Error('الصورة كبيرة (الحد 12 ميجا)'); pic = await compress(f, 1000, .86); prev.src = URL.createObjectURL(pic.blob); });
  const save = h('button', { class: 'btn', onclick: guard(async function () {
    if (!name.value.trim()) throw new Error('اكتب اسم المنتج'); save.disabled = true;
    try { const data = { hex: hex.value }; if (!builtin) { if (c) { data.imgId = c.data.imgId; data.w = c.data.w; data.ht = c.data.ht; } if (pic) { data.imgId = await upload(pic.blob, 'color:' + name.value); data.w = pic.w; data.ht = pic.h; } if (!data.imgId) throw new Error('ارفع صورة الكوب بهذا اللون'); }
      else Object.assign(data, c.data);
      await call('admin.saveProduct', { item: { id: c && c.id, kind: 'color', name: name.value, price: +price.value || 0, active: act.firstChild.checked, data } }); toast('تم الحفظ', 'ok'); ov.remove(); render(); } finally { save.disabled = false; } }) }, 'حفظ');
  body.replaceChildren(h('h2', null, isNew ? 'إضافة منتج جديد' : 'تعديل: ' + c.name), field('الاسم', name), h('div', { class: 'row' }, field('لون العرض', hex), field('فرق السعر (ر.س)', price)), act,
    !builtin ? [h('div', { class: 'note', style: 'margin-top:12px' }, 'صورة الكوب بهذا اللون: من الأمام، خلفية نظيفة، وبنفس زاوية صور الأكواب الأخرى. تُضغط تلقائياً (WebP). سيستخدم المحرك موضع النقش الافتراضي ويمكنك تحديد المناطق من «مناطق النقش».'), field('صورة الكوب', file), prev] : null,
    h('div', { class: 'row', style: 'margin-top:14px' }, save, h('button', { class: 'btn s', onclick: () => ov.remove() }, 'إلغاء')));
}

/* ---------- إدارة المتجر ---------- */
let storeTab = 'prices';
const TABS = [['prices', 'الأسعار'], ['regions', 'مناطق النقش'], ['gallery', 'معرض الأعمال'], ['content', 'النصوص والأقسام'], ['fonts', 'الخطوط والخيارات'], ['wa', 'رسائل واتساب'], ['contact', 'التواصل والسياسات']];
async function vStore() {
  await reboot();
  const box = h('div'), tabs = h('div', { class: 'tabs' }, TABS.map(t => h('button', { class: storeTab === t[0] ? 'on' : '', onclick: () => { storeTab = t[0]; render(); } }, t[1])));
  const T = { prices: tPrices, regions: tRegions, gallery: tGallery, content: tContent, fonts: tFonts, wa: tWa, contact: tContact }[storeTab];
  box.append(...[].concat(await T()));
  return [h('h1', null, 'إدارة المتجر'), h('p', { class: 'sub' }, 'كل تعديل يُحفظ في Google Sheets ويظهر في المتجر المنشور خلال لحظات دون إعادة رفع الموقع'), tabs, box];
}
const saveSettings = guard(async values => { await call('admin.saveSettings', { values }); toast('تم الحفظ — يظهر في المتجر خلال دقيقة كحد أقصى', 'ok'); await reboot(); });

function tPrices() {
  const B = st.boot, ins = {}, labels = B.priceLabels;
  const form = h('div', { class: 'card', style: 'max-width:560px' }, Object.keys(labels).map(k => field(labels[k] + ' (ر.س)', ins[k] = h('input', { type: 'number', min: 0, step: 1, value: B.prices[k] }))),
    h('button', { class: 'btn', onclick: guard(async () => { const values = {}; for (const k in ins) values[k] = ins[k].value; await call('admin.savePricing', { values }); toast('تم حفظ الأسعار وهي سارية الآن', 'ok'); await reboot(); }) }, 'حفظ الأسعار'));
  return [h('p', { class: 'note' }, 'هذه هي قواعد الحساب الحالية نفسها. الخادم يعيد حساب كل طلب منها ولا يثق بالسعر القادم من المتصفح. فرق سعر لون معيّن يُضبط من «المنتجات». التوصيل: لا يُضاف للإجمالي حالياً (تُؤكَّد تكلفته مع العميل)؛ والخصومات غير مفعّلة لأنها تغيّر قواعد التسعير وتحتاج موافقتك.'), form];
}
function tFonts() {
  const B = st.boot, hide = new Set(B.settings.fontsHide || []), boxes = B.fonts.map((n, i) => { const c = h('input', { type: 'checkbox', checked: !hide.has(i) }); return [c, h('label', { class: 'sw', style: 'padding:8px 0' }, c, n)]; });
  return [h('div', { class: 'card', style: 'max-width:560px' }, h('h3', null, 'الخطوط المتاحة للعميل'), h('p', { class: 'note' }, 'أخفِ أي خط لا تريد عرضه. لا يمكن إخفاء كل الخطوط. أسعار التغليف وبطاقة الإهداء من تبويب «الأسعار».'), boxes.map(x => h('div', null, x[1])),
    h('button', { class: 'btn', style: 'margin-top:10px', onclick: () => { const hid = boxes.map((x, i) => x[0].checked ? -1 : i).filter(i => i >= 0); if (hid.length >= B.fonts.length) return toast('يجب إبقاء خط واحد على الأقل', 'bad'); saveSettings({ fontsHide: hid }); } }, 'حفظ'))];
}
function tWa() {
  const B = st.boot; let list = waTemplates().map(x => ({ id: x.id, title: x.title, body: x.body })); const box = h('div');
  const draw = () => box.replaceChildren(list.map((x, i) => h('div', { class: 'card', style: 'margin-bottom:10px' },
    field('عنوان القالب', h('input', { value: x.title, maxLength: 60, oninput: e => { x.title = e.target.value; } })),
    field('نص الرسالة', h('textarea', { value: x.body, maxLength: 1500, rows: 5, oninput: e => { x.body = e.target.value; } })),
    h('div', { class: 'row' }, h('button', { class: 'btn s sm', onclick: () => { move(list, i, -1); draw(); } }, '↑'), h('button', { class: 'btn s sm', onclick: () => { move(list, i, 1); draw(); } }, '↓'), h('button', { class: 'btn d sm', onclick: () => { list.splice(i, 1); draw(); } }, 'حذف')))));
  draw();
  return [h('p', { class: 'note' }, 'هذه قوالب رسائل واتساب التي تظهر في تفاصيل كل طلب، وتُعدَّل هنا دون تعديل الكود. المتغيرات: {name} اسم العميل · {order} رقم الطلب · {total} الإجمالي · {status} الحالة · {store} اسم المتجر · {link} رابط معاينة التصميم (يُحذف السطر الذي يحتويه إذا لم يتوفر رابط).'), box,
    h('div', { class: 'row' }, h('button', { class: 'btn s', onclick: () => { list.push({ id: 't' + Date.now().toString(36), title: 'قالب جديد', body: '' }); draw(); } }, '+ قالب جديد'),
      h('button', { class: 'btn', id: 'wa-save', onclick: () => { if (!list.some(x => x.title.trim() && x.body.trim())) return toast('أضف قالباً واحداً على الأقل بعنوان ونص', 'bad'); saveSettings({ waTemplates: list }); } }, 'حفظ القوالب'),
      h('button', { class: 'btn s', onclick: () => { list = (B.waTemplatesDefault || []).map(x => ({ id: x.id, title: x.title, body: x.body })); draw(); toast('رُجعت القوالب الافتراضية، اضغط «حفظ القوالب» لاعتمادها'); } }, 'استرجاع الافتراضي'))];
}
function tContact() {
  const s = st.boot.settings, K = ['storeName', 'wa', 'ig', 'tt', 'siteUrl', 'previewDays', 'hours', 'address', 'deliveryPolicy', 'returnPolicy', 'orderPolicy'], I = {};
  const lbl = { storeName: 'اسم المتجر', wa: 'رقم واتساب (بصيغة دولية بدون +، مثال 966538107285)', ig: 'حساب إنستغرام (بدون @)', tt: 'حساب تيك توك (بدون @)', siteUrl: 'رابط الموقع المنشور (ينتهي بـ /) — يُستخدم لروابط المعاينة', previewDays: 'مدة صلاحية رابط المعاينة بالأيام (0 = بلا انتهاء)', hours: 'أوقات العمل', address: 'العنوان', deliveryPolicy: 'سياسة التوصيل', returnPolicy: 'سياسة الاستبدال والإرجاع', orderPolicy: 'سياسة الطلب' };
  return [h('div', { class: 'card', style: 'max-width:640px' }, K.map(k => field(lbl[k], I[k] = (['deliveryPolicy', 'returnPolicy', 'orderPolicy'].includes(k) ? h('textarea', { value: s[k] || '', maxLength: 2000 }) : h('input', { value: s[k] || '', maxLength: 200 })))), h('button', { class: 'btn', onclick: () => { const v = {}; K.forEach(k => v[k] = I[k].value); saveSettings(v); } }, 'حفظ'))];
}
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
function tContent() {
  const s = st.boot.settings, hero = h('input', { value: s.heroTitle, maxLength: 120 }), sub = h('textarea', { value: s.heroSub, maxLength: 400 }), ann = h('input', { value: s.announce, maxLength: 300, placeholder: 'مثال: خصم 10% بمناسبة اليوم الوطني' }), annOn = sw('إظهار الشريط الإعلاني أعلى المتجر', s.announceOn === '1'), mq = h('textarea', { value: (s.mq || []).join('\n'), rows: 5 });
  let faq = (s.faq || []).map(x => ({ q: x.q, a: x.a })), blocks = (s.blocks || []).map(x => ({ title: x.title, body: x.body, on: x.on !== false })), secs = (s.sections || []).filter(x => !/^b\d+$/.test(x.id)).map(x => ({ id: x.id, on: x.on !== false }));
  ['gallery', 'steps', 'faq', 'info'].forEach(id => { if (!secs.some(x => x.id === id)) secs.push({ id, on: true }); });
  const SN = { gallery: 'معرض الأعمال', steps: 'خطوات الطلب', faq: 'الأسئلة الشائعة', info: 'معلومات المتجر (أوقات العمل والسياسات)' };
  const secBox = h('div'), faqBox = h('div'), blkBox = h('div');
  const drawSecs = () => secBox.replaceChildren(secs.map((x, i) => h('div', { class: 'row', style: 'padding:6px 0;border-bottom:1px solid var(--ln)' }, h('span', { class: 'grow' }, SN[x.id]), sw('ظاهر', x.on, v => x.on = v), h('button', { class: 'btn s sm', onclick: () => { move(secs, i, -1); drawSecs(); } }, '↑'), h('button', { class: 'btn s sm', onclick: () => { move(secs, i, 1); drawSecs(); } }, '↓'))));
  const drawFaq = () => faqBox.replaceChildren(faq.map((x, i) => h('div', { class: 'card', style: 'margin-bottom:8px;padding:10px' }, field('السؤال', h('input', { value: x.q, maxLength: 200, oninput: e => x.q = e.target.value })), field('الجواب', h('textarea', { value: x.a, maxLength: 800, oninput: e => x.a = e.target.value })), h('button', { class: 'btn d sm', onclick: () => { faq.splice(i, 1); drawFaq(); } }, 'حذف'))), h('button', { class: 'btn s sm', onclick: () => { faq.push({ q: '', a: '' }); drawFaq(); } }, '+ سؤال'));
  const drawBlk = () => blkBox.replaceChildren(blocks.map((x, i) => h('div', { class: 'card', style: 'margin-bottom:8px;padding:10px' }, field('العنوان', h('input', { value: x.title, maxLength: 80, oninput: e => x.title = e.target.value })), field('النص', h('textarea', { value: x.body, maxLength: 2000, oninput: e => x.body = e.target.value })), h('div', { class: 'row' }, sw('ظاهر', x.on, v => x.on = v), h('button', { class: 'btn s sm', onclick: () => { move(blocks, i, -1); drawBlk(); } }, '↑'), h('button', { class: 'btn s sm', onclick: () => { move(blocks, i, 1); drawBlk(); } }, '↓'), h('button', { class: 'btn d sm', onclick: () => { blocks.splice(i, 1); drawBlk(); } }, 'حذف')))), blocks.length < 8 ? h('button', { class: 'btn s sm', onclick: () => { blocks.push({ title: '', body: '', on: true }); drawBlk(); } }, '+ قسم نصي جديد') : null);
  drawSecs(); drawFaq(); drawBlk();
  return [h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', null, 'الصفحة الرئيسية'), field('العنوان الرئيسي', hero), field('النص التعريفي', sub), field('نص الشريط الإعلاني', ann), annOn, field('الشريط المتحرك (سطر لكل عبارة)', mq)),
    h('div', { class: 'card' }, h('h3', null, 'ترتيب الأقسام وإظهارها'), secBox, h('p', { class: 'note', style: 'margin-top:10px' }, 'الأقسام النصية الجديدة تظهر بعد هذه الأقسام بترتيبها أدناه.'))),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', null, 'الأسئلة الشائعة'), faqBox), h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', null, 'أقسام نصية إضافية'), blkBox),
    h('button', { class: 'btn', style: 'margin-top:14px', onclick: () => saveSettings({ heroTitle: hero.value, heroSub: sub.value, announce: ann.value, announceOn: annOn.firstChild.checked, mq: mq.value.split('\n'), faq, blocks, sections: secs }) }, 'حفظ كل التغييرات')];
}

/* ---------- مناطق النقش ---------- */
const unpackRegion = p => ({ id: p.id, name: p.name, on: p.active, target: (p.data && p.data.target) || 'text', cup: (p.data && p.data.cup) || 'all', cx: +p.data.cx, cy: +p.data.cy, w: +p.data.w, h: +p.data.h });
let regColor = null;
async function tRegions() {
  const B = st.boot, colors = B.products.filter(p => p.kind === 'color'); if (!regColor || !colors.some(c => c.id === regColor)) regColor = colors[0].id;
  const root = h('div'); let draft = null;
  async function draw() {
    const col = colors.find(c => c.id === regColor), url = await colorImg(col), regs = st.boot.products.filter(p => p.kind === 'region').map(unpackRegion).filter(r => r.cup === 'all' || r.cup === col.id);
    const dp = DEFPT[col.id] || [.5, .42], img = h('img', { src: url, alt: 'صورة الكوب' }), stage = h('div', { class: 'stage' }, img, h('div', { class: 'dm', title: 'موضع الكتابة الافتراضي الحالي', style: `left:${dp[0] * 100}%;top:${dp[1] * 100}%` }));
    const place = (el, r) => { el.style.left = (r.cx - r.w / 2) * 100 + '%'; el.style.top = (r.cy - r.h / 2) * 100 + '%'; el.style.width = r.w * 100 + '%'; el.style.height = r.h * 100 + '%'; };
    regs.forEach(r => { if (draft && draft.id && draft.id === r.id) return; const b = h('div', { class: 'rbox ' + (r.target === 'logo' ? 'logo ' : '') + (r.on ? '' : 'off'), style: 'cursor:pointer', onclick: () => { draft = Object.assign({}, r); draw(); } }, h('span', null, r.name)); place(b, r); stage.appendChild(b); });
    let sel = null, inputs = {};
    if (draft) { sel = h('div', { class: 'rbox sel ' + (draft.target === 'logo' ? 'logo' : '') }, h('span', null, draft.name || 'جديدة'), h('i', { class: 'hd w', 'data-m': 'w' }), h('i', { class: 'hd h', 'data-m': 'h' }), h('i', { class: 'hd wh', 'data-m': 'wh' })); place(sel, draft); stage.appendChild(sel); }
    const sync = () => { place(sel, draft); ['cx', 'cy', 'w', 'h'].forEach(k => inputs[k] && (inputs[k].value = Math.round(draft[k] * 1000) / 10)); };
    let drag = null;
    stage.addEventListener('pointerdown', e => { if (!draft) return; const hd = e.target.closest('.hd'), bx = e.target.closest('.rbox.sel'); if (!hd && !bx) return; e.preventDefault(); stage.setPointerCapture(e.pointerId); drag = { m: hd ? hd.dataset.m : 'move', x: e.clientX, y: e.clientY, d: Object.assign({}, draft), r: stage.getBoundingClientRect() }; });
    stage.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x) / drag.r.width, dy = (e.clientY - drag.y) / drag.r.height, d = drag.d;
      if (drag.m === 'move') { draft.cx = clamp(d.cx + dx, d.w / 2, 1 - d.w / 2); draft.cy = clamp(d.cy + dy, d.h / 2, 1 - d.h / 2); }
      else { if (drag.m.includes('w')) draft.w = clamp(d.w + 2 * dx, .04, 2 * Math.min(d.cx, 1 - d.cx)); if (drag.m.includes('h')) draft.h = clamp(d.h + 2 * dy, .03, 2 * Math.min(d.cy, 1 - d.cy)); } sync(); });
    stage.addEventListener('pointerup', () => drag = null); stage.addEventListener('pointercancel', () => drag = null);
    const colSel = h('select', { 'aria-label': 'اللون', onchange: e => { regColor = e.target.value; draft = null; draw(); } }, colors.map(c => h('option', { value: c.id, selected: c.id === regColor }, c.name)));
    const list = h('div', null, regs.length ? regs.map(r => h('div', { class: 'row', style: 'padding:8px 0;border-bottom:1px solid var(--ln)' }, h('span', { class: 'grow' }, h('b', null, r.name), ' ', h('small', { style: 'color:var(--mut)' }, (r.target === 'logo' ? 'شعار' : 'كتابة') + ' · ' + (r.cup === 'all' ? 'كل الألوان' : 'هذا اللون'))), r.on ? h('span', { class: 'badge', 'data-s': 'on', style: 'background:var(--ok)' }, 'معتمدة') : h('span', { class: 'badge', 'data-s': 'off', style: 'background:#999' }, 'معطّلة'), h('button', { class: 'btn s sm', onclick: () => { draft = Object.assign({}, r); draw(); } }, 'تعديل'))) : h('p', { class: 'empty', style: 'padding:14px' }, 'لا توجد مناطق لهذا اللون. أضف منطقة جديدة.'));
    let form = null;
    if (draft) {
      const nm = h('input', { value: draft.name, maxLength: 40, oninput: e => { draft.name = e.target.value; sel.firstChild.textContent = draft.name || 'جديدة'; } });
      const tg = h('select', { onchange: e => { draft.target = e.target.value; sel.classList.toggle('logo', draft.target === 'logo'); } }, h('option', { value: 'text', selected: draft.target === 'text' }, 'موضع الكتابة'), h('option', { value: 'logo', selected: draft.target === 'logo' }, 'موضع الشعار'));
      const sc = h('select', { onchange: e => draft.cup = e.target.value }, h('option', { value: 'all', selected: draft.cup === 'all' }, 'كل الألوان'), h('option', { value: col.id, selected: draft.cup === col.id }, 'هذا اللون فقط: ' + col.name));
      const num = (k, l) => field(l + ' %', inputs[k] = h('input', { type: 'number', min: 0, max: 100, step: .5, value: Math.round(draft[k] * 1000) / 10, onchange: e => { const v = clamp((+e.target.value || 0) / 100, k === 'w' ? .04 : k === 'h' ? .03 : 0, 1); draft[k] = v; draft.w = clamp(draft.w, .04, 1); draft.h = clamp(draft.h, .03, 1); draft.cx = clamp(draft.cx, draft.w / 2, 1 - draft.w / 2); draft.cy = clamp(draft.cy, draft.h / 2, 1 - draft.h / 2); sync(); } }));
      const act = sw('معتمدة: تظهر للعملاء (فعّلها فقط بعد التأكد أن جهاز الليزر ينقش فيها فعلاً)', draft.on, v => draft.on = v);
      form = h('div', { class: 'card', style: 'margin-top:12px' }, h('h3', null, draft.id ? 'تعديل المنطقة' : 'منطقة جديدة'), field('اسم المنطقة (يظهر للعميل على الزر، مثل: أعلى)', nm), h('div', { class: 'row' }, field('النوع', tg), field('تنطبق على', sc)), h('div', { class: 'row' }, num('cx', 'مركز أفقي'), num('cy', 'مركز رأسي'), num('w', 'العرض'), num('h', 'الارتفاع')), act,
        h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn', onclick: guard(async () => { if (!draft.name.trim()) throw new Error('اكتب اسم المنطقة'); await call('admin.saveProduct', { item: { id: draft.id, kind: 'region', name: draft.name, active: draft.on, data: { target: draft.target, cup: draft.cup, cx: draft.cx, cy: draft.cy, w: draft.w, h: draft.h } } }); toast('تم حفظ المنطقة', 'ok'); await reboot(); draft = null; draw(); }) }, 'حفظ المنطقة'),
          draft.id ? h('button', { class: 'btn d', onclick: guard(async () => { if (!confirm('حذف هذه المنطقة؟')) return; await call('admin.deleteProduct', { id: draft.id }); toast('تم الحذف', 'ok'); await reboot(); draft = null; draw(); }) }, 'حذف') : null, h('button', { class: 'btn s', onclick: () => { draft = null; draw(); } }, 'إلغاء')));
    }
    root.replaceChildren(h('p', { class: 'note' }, 'اسحب المربع لتحريكه، واسحب النقاط البيضاء لتغيير عرضه وارتفاعه. النص لا يتجاوز العرض والارتفاع الذي تحدده. النقطة الخضراء هي موضع الكتابة الافتراضي الحالي للمحرك (لا يتغير). المناطق الجديدة تُنشأ «معطّلة» حتى تعتمدها. الخيارات تتوفر للأمام فقط حالياً.'),
      h('div', { class: 'grid g2' }, h('div', null, field('صورة الكوب', colSel), stage), h('div', null, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, 'المناطق'), h('button', { class: 'btn sm', onclick: () => { draft = { name: '', on: false, target: 'text', cup: 'all', cx: dp[0], cy: dp[1], w: .4, h: .14 }; draw(); } }, '+ منطقة جديدة')), list, form)));
  }
  await draw(); return root;
}

/* ---------- معرض الأعمال ---------- */
async function tGallery() {
  const B = st.boot, items = B.products.filter(p => p.kind === 'gallery'), root = h('div'), pick = h('input', { type: 'file', accept: 'image/*', multiple: true }), queue = h('div'), bar = h('i'), txt = h('small'), prog = h('div', { class: 'hide', style: 'margin-top:10px' }, h('div', { class: 'bar' }, bar), txt);
  let q = [];
  const url = id => 'https://lh3.googleusercontent.com/d/' + id;
  const drawQ = () => { queue.replaceChildren(q.length ? [h('p', { class: 'note' }, q.length + ' صورة جاهزة للرفع. ضُغطت تلقائياً إلى WebP مع نسخة مصغرة. راجعها ثم اعتمد الرفع.'), h('div', { class: 'gg' }, q.map((x, i) => h('div', { class: 'gi' }, h('img', { src: x.pv, alt: '' }), h('small', { style: 'color:var(--mut)' }, kb(x.orig) + ' ← ' + kb(x.full.blob.size) + ' + مصغّرة ' + kb(x.thumb.blob.size)), h('input', { type: 'text', placeholder: 'وصف الصورة (اختياري)', maxLength: 100, oninput: e => x.cap = e.target.value }), h('input', { type: 'text', placeholder: 'المجموعة (اختياري)', maxLength: 40, oninput: e => x.grp = e.target.value }), h('button', { class: 'btn d sm', onclick: () => { q.splice(i, 1); drawQ(); } }, 'إزالة')))),
    h('button', { class: 'btn', style: 'margin-top:12px', onclick: guard(async e => { const btn = e.currentTarget; btn.disabled = true; prog.classList.remove('hide'); let done = 0, fail = 0;
      for (const x of q.slice()) { txt.textContent = 'جاري رفع ' + (done + fail + 1) + ' من ' + q.length + '…'; bar.style.width = (done + fail) / q.length * 100 + '%';
        try { const t = await upload(x.thumb.blob, 'thumb'), f = await upload(x.full.blob, 'full'); await call('admin.saveProduct', { item: { kind: 'gallery', name: x.cap || '', active: true, data: { thumb: t, full: f, group: x.grp || '', home: true } } }); done++; } catch (e) { fail++; toast('فشل رفع صورة: ' + e.message, 'bad'); } }
      bar.style.width = '100%'; toast('تم رفع ' + done + ' صورة' + (fail ? ' وفشلت ' + fail : ''), fail ? 'bad' : 'ok'); await reboot(); render(); }) }, 'اعتماد الرفع (' + q.length + ')')] : null); };
  pick.onchange = guard(async () => { const fs = [...pick.files]; if (fs.length > 50) toast('الحد الأقصى 50 صورة في العملية الواحدة؛ سيُؤخذ أول 50.', 'bad'); q = []; queue.replaceChildren(h('p', { class: 'empty' }, 'جاري ضغط الصور…'));
    for (const f of fs.slice(0, 50)) { try { if (!/^image\//.test(f.type) || f.size > 25e6) continue; const full = await compress(f, 1400, .82), thumb = await compress(f, 480, .75); q.push({ full, thumb, orig: f.size, pv: URL.createObjectURL(thumb.blob), cap: '', grp: '' }); } catch (_) {} } drawQ(); });
  const save = (it, patch) => guard(async () => { const d = Object.assign({}, it.data, patch.data || {}); await call('admin.saveProduct', { item: { id: it.id, kind: 'gallery', name: patch.name != null ? patch.name : it.name, active: patch.active != null ? patch.active : it.active, data: d } }); await reboot(); })();
  const grid = h('div', { class: 'gg' }, items.map((it, i) => h('div', { class: 'gi' }, h('img', { src: url(it.data.thumb), alt: it.name, loading: 'lazy' }), h('input', { type: 'text', value: it.name, placeholder: 'الوصف', maxLength: 100, onchange: e => save(it, { name: e.target.value }) }), h('input', { type: 'text', value: it.data.group || '', placeholder: 'المجموعة', maxLength: 40, onchange: e => save(it, { data: { group: e.target.value } }) }),
    sw('ظاهرة', it.active, v => save(it, { active: v })), h('br'), sw('في الرئيسية', it.data.home !== false, v => save(it, { data: { home: v } })),
    h('div', { class: 'row', style: 'gap:6px;margin-top:6px' }, h('button', { class: 'btn s sm', 'aria-label': 'تقديم', onclick: guard(async () => { const ids = items.map(x => x.id); if (i < 1) return; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; await call('admin.reorder', { kind: 'gallery', ids }); render(); }) }, '↑'), h('button', { class: 'btn s sm', 'aria-label': 'تأخير', onclick: guard(async () => { const ids = items.map(x => x.id); if (i >= ids.length - 1) return; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; await call('admin.reorder', { kind: 'gallery', ids }); render(); }) }, '↓'),
      h('button', { class: 'btn d sm', onclick: guard(async () => { if (!confirm('حذف الصورة نهائياً؟')) return; await call('admin.deleteProduct', { id: it.id }); toast('تم الحذف', 'ok'); render(); }) }, 'حذف')))));
  root.append(h('div', { class: 'card' }, h('h3', null, 'رفع صور جديدة'), h('p', { class: 'note' }, 'اختر حتى 50 صورة دفعة واحدة. تُضغط وتُصغَّر داخل المتصفح (WebP) قبل الرفع، ولا تُرفع الأصول الضخمة. التخزين على Google Drive الخاص بك (سعة حسابك المجانية مشتركة 15 ج.ب).'), pick, queue, prog),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', null, 'الصور الحالية (' + items.length + ')'), items.length ? grid : h('p', { class: 'empty' }, 'لا توجد صور بعد')));
  return root;
}

/* ---------- الإعدادات ---------- */
let deferred = null; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; const b = $('#inst'); if (b) b.classList.remove('hide'); });
async function vSettings() {
  const o = h('input', { type: 'password', autocomplete: 'current-password' }), n = h('input', { type: 'password', autocomplete: 'new-password' }), n2 = h('input', { type: 'password', autocomplete: 'new-password' }), logBox = h('div');
  const ios = /iphone|ipad/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const showLog = guard(async () => { const r = await call('admin.log'); logBox.replaceChildren(r.log.length ? h('table', { class: 'tb' }, r.log.map(x => h('tr', null, h('td', { style: 'white-space:nowrap' }, fdate(x.t)), h('td', null, x.a), h('td', null, x.d)))) : h('p', { class: 'empty' }, 'السجل فارغ')); });
  return [h('h1', null, 'الإعدادات'), h('p', { class: 'sub' }, 'حساب المدير وتثبيت التطبيق وسجل العمليات'),
    h('div', { class: 'grid g2' },
      h('div', { class: 'card' }, h('h3', null, 'تغيير كلمة المرور'), field('كلمة المرور الحالية', o), field('الجديدة (10 أحرف على الأقل)', n), field('تأكيد الجديدة', n2), h('button', { class: 'btn', onclick: guard(async () => { if (n.value !== n2.value) throw new Error('التأكيد غير مطابق'); await call('admin.changePassword', { oldPassword: o.value, newPassword: n.value }); toast('تم تغيير كلمة المرور', 'ok'); o.value = n.value = n2.value = ''; }) }, 'تغيير')),
      h('div', { class: 'card', id: 'tg-card' }, h('h3', null, 'إشعارات تيليجرام'),
        h('p', { class: 'note ' + (st.boot.telegram ? '' : 'warn'), id: 'tg-status', style: 'margin:0 0 10px' }, st.boot.telegram ? '✓ مفعّلة: يصلك إشعار عند كل طلب جديد وعند اعتماد العميل للتصميم أو طلبه تعديلاً.' : 'غير مفعّلة بعد. من ملف Google Sheets: قائمة «كلمتين» ← «3) إعداد إشعارات تيليجرام» (التوكن لا يُدخل هنا ولا يُحفظ في الشيت).'),
        h('button', { class: 'btn s', id: 'tg-test', onclick: guard(async () => { await call('admin.telegramTest'); toast('أُرسل إشعار تجريبي إلى تيليجرام', 'ok'); }) }, 'إرسال إشعار تجريبي')),
      h('div', { class: 'card' }, h('h3', null, 'التطبيق والجلسة'), standalone ? h('p', { class: 'note' }, 'التطبيق مثبّت على هذا الجهاز ✓') : [h('button', { class: 'btn ' + (deferred ? '' : 'hide'), id: 'inst', onclick: async () => { if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; $('#inst').classList.add('hide'); } } }, 'تثبيت لوحة الإدارة كتطبيق'), ios ? h('p', { class: 'note' }, 'على iPhone: افتح هذه الصفحة في Safari ← زر المشاركة ← «إضافة إلى الشاشة الرئيسية».') : (!deferred ? h('p', { class: 'note' }, 'على Android (Chrome): القائمة ⋮ ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».') : null)],
        h('p', { class: 'note' }, 'تنتهي الجلسة بعد 6 ساعات أو بإغلاق التبويب، ولا تُخزَّن في ذاكرة التطبيق المؤقتة. صلاحيات هذه النسخة: مدير واحد بكامل الصلاحيات.'), h('button', { class: 'btn d', onclick: () => logout(false) }, 'تسجيل الخروج'), h('p', { style: 'color:var(--mut);font-size:12.5px;margin-top:12px' }, 'إصدار الخادم ' + st.boot.version))),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('h3', null, 'تشخيص سرعة اللوحة'), h('p', { class: 'note' }, 'آخر الاستدعاءات من هذا المتصفح: «الكلي» = الزمن حتى وصول الرد، «الخادم» = زمن تنفيذ Apps Script نفسه. الفرق بينهما هو الشبكة وبدء تشغيل Google.'),
      perf.length ? h('div', { class: 'tw' }, h('table', { class: 'pt', id: 'perf-tb' }, h('tr', null, ['الإجراء', 'الكلي (م.ث)', 'الخادم (م.ث)'].map(x => h('th', null, x))), perf.slice(-12).reverse().map(x => h('tr', null, h('td', null, x.a), h('td', null, x.t), h('td', null, x.s == null ? '—' : x.s))))) : h('p', { class: 'empty' }, 'لا استدعاءات بعد')),
    h('div', { class: 'card', style: 'margin-top:14px' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, 'سجل العمليات الإدارية'), h('button', { class: 'btn s sm', onclick: showLog }, 'عرض آخر 200')), logBox)];
}

/* ---------- التشغيل ---------- */
async function start(init) {
  if (!init) { try { init = await call('admin.init'); } catch (e) { if (!/غير معروف/.test(e.message)) throw e; init = null; } }   // خادم أقدم: نرجع للطريقة القديمة
  if (init) { st.dash = init.dash || null; st.boot = init; } else await reboot();
  shell(); const v = location.hash.slice(1); go(Object.prototype.hasOwnProperty.call(VIEWS, v) ? v : 'home');
}
if (st.session && APIOK) start().catch(e => logout(true)); else renderLogin('');
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (st.boot && Object.prototype.hasOwnProperty.call(VIEWS, v) && v !== st.view) go(v); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();

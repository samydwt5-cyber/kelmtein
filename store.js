/* حماية من clickjacking: لا يعمل المتجر داخل إطار من نطاق آخر (يُسمح بإطار المعاينة داخل لوحة الإدارة من نفس النطاق). */
(function () { try { if (window.top !== window.self) void window.top.location.href; } catch (e) { document.documentElement.innerHTML = '<body style="font:16px sans-serif;padding:30px;text-align:center"><p>لأسباب أمنية لا يمكن عرض هذه الصفحة داخل موقع آخر.</p><p><a target="_top" rel="noopener" href="' + location.href.split(/[?#]/)[0] + '">افتح كلمتين في نافذة مستقلة</a></p></body>'; throw new Error("framed"); } })();
/* KELMTEIN — طبقة المتجر (الخادم، الموضع، المعاينة، المعرض، نصوص الواجهة).
   لا تحتوي على أي منطق رسم؛ محرك الكوب (PH/geo/ink/R/calc) يبقى في index.html. */
const EX = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
function api(action, body, ms) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 25000);
  return fetch(CFG.gs, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, body || {})), signal: ctl.signal })
    .then(r => r.json()).finally(() => clearTimeout(to));
}
const cidOf = k => k < 3 ? C[k][2] : ((CFG.CC || [])[k - 3] || {}).id || C[k][2];
const regionsFor = (cu, target) => { const id = cidOf(cu.c); return (CFG.regions || []).filter(r => r.target == target && r.view == "f" && (r.cup == "all" || r.cup == id)) };
const regionFor = (cu, target, id) => id ? (regionsFor(cu, target).find(r => r.id == id) || null) : null;
const siteBase = () => { const u = (CFG.siteUrl || "").trim(); if (/^https:\/\/.+\/$/.test(u)) return u; return /^https?:$/.test(location.protocol) ? location.href.split(/[?#]/)[0].replace(/[^\/]*$/, "") : "" };

/* ---------- واجهة الموضع والحجم ---------- */
function rgUI() {
  document.querySelectorAll("[data-zv]").forEach(s => { s.textContent = Math.round(100 * (+S.cups[s.dataset.m].p[s.dataset.k].ts || 1)) + "%" });
  document.querySelectorAll("[data-rp]").forEach(e => {
    const m = +e.dataset.rp, cu = S.cups[m], rs = regionsFor(cu, "text");
    e.hidden = !rs.length; if (!rs.length) return;
    const cur = cu.p.f.pos || "";
    e.innerHTML = '<div class="rg"><span>موضع الكتابة</span>' + [{ id: "", name: "افتراضي" }].concat(rs).map(r => `<button type="button" data-m="${m}" data-k="f" data-pos="${EX(r.id)}" class="${cur == r.id ? "on" : ""}">${EX(r.name)}</button>`).join("") + "</div>";
  });
  const lp = $("lps"); if (!lp) return;
  const rs = S.logo ? regionsFor(cup(), "logo") : [];
  lp.hidden = !rs.length; $("lyy").parentNode.hidden = !!(S.lpos && rs.some(r => r.id == S.lpos));
  if (rs.length) lp.innerHTML = '<div class="rg"><span>موضع الشعار</span>' + [{ id: "", name: "افتراضي" }].concat(rs).map(r => `<button type="button" data-lp="${EX(r.id)}" class="${(S.lpos || "") == r.id ? "on" : ""}">${EX(r.name)}</button>`).join("") + "</div>";
}
function zoomText(m, k, dir) { const o = S.cups[m].p[k]; o.ts = Math.max(.6, Math.min(1.6, Math.round(((+o.ts || 1) + (dir == "+" ? .1 : -.1)) * 10) / 10)) }
function logoData() {
  if (!S.logo) return "";
  for (const mx of [240, 170, 120]) {
    const s = Math.min(1, mx / Math.max(S.logo.width, S.logo.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(S.logo.width * s)); c.height = Math.max(1, Math.round(S.logo.height * s));
    c.getContext("2d").drawImage(S.logo, 0, 0, c.width, c.height);
    const u = c.toDataURL("image/webp", .7); if (u.length <= 45000) return u;
  }
  return "";
}

/* ---------- بيانات العميل: الجوال الدولي ---------- */
/* يرجع {ph:"+9665XXXXXXXX"} أو {err:"..."}. cc = مفتاح الدولة بدون + (966 افتراضياً). يقبل 05xxxxxxxx و5xxxxxxxx و+966… و00966… */
function normPhone(cc, raw) {
  let s = String(raw || "").replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(s)) return { err: "رقم الجوال يجب أن يحتوي أرقاماً فقط." };
  cc = String(cc || "966").replace(/\D/g, "");
  if (!/^[1-9]\d{0,3}$/.test(cc)) return { err: "اكتب مفتاح الدولة بشكل صحيح (مثال: 44)." };
  let full;
  if (s[0] == "+") full = s.slice(1);
  else if (s.startsWith("00")) full = s.slice(2);
  else if (cc == "966" && /^9665\d{8}$/.test(s)) full = s;
  else full = cc + s.replace(/^0+/, "");
  if (full.startsWith("966")) return /^9665\d{8}$/.test(full) ? { ph: "+" + full } : { err: "رقم الجوال السعودي يبدأ بـ 5 ويتكون من 9 أرقام (مثال: 5xxxxxxxx)." };
  return /^[1-9]\d{7,14}$/.test(full) ? { ph: "+" + full } : { err: "رقم الجوال غير صحيح، تأكد من المفتاح والرقم." };
}
(function () {
  const g = id => document.getElementById(id), cc = g("cc"), st = g("st2");
  if (cc) cc.addEventListener("change", () => {
    const o = cc.value == "other", x = g("ccx"), sa = cc.value == "966";
    x.hidden = !o; if (o) x.focus();
    g("ph").placeholder = sa ? "5xxxxxxxx" : "رقم الجوال";
    g("phh").textContent = sa ? "اكتب الرقم بدون مفتاح الدولة، مثال: 5xxxxxxxx" : "اكتب الرقم المحلي بدون مفتاح الدولة.";
  });
  if (st) st.addEventListener("input", e => e.target.classList && e.target.classList.remove("bad"));
})();

/* ---------- الطلب ---------- */
let BUSY = 0;
/* ---------- منع تكرار الطلب: مفتاح فريد لكل محاولة، يُعاد إرساله عند إعادة المحاولة ----------
   المفتاح ثابت ما دام محتوى الطلب لم يتغير؛ إن تغيّر التصميم أو البيانات يُولَّد مفتاح جديد.
   الخادم يرجع الطلب المحفوظ نفسه إذا وصله المفتاح مرتين (انقطاع بعد الحفظ، ضغط متكرر). */
let RQ = null;
const rqId = () => { const a = new Uint8Array(12); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < 12; i++) a[i] = Math.random() * 256; return "r" + Array.from(a, b => b.toString(36).padStart(2, "0")).join("") };
const sigOf = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h + ":" + s.length };
/* عند فشل الاتصال نحتفظ ببيانات العميل في تبويب المتصفح فقط (sessionStorage) لتبقى بعد تحديث الصفحة، ونمسحها فور نجاح التسجيل */
const PEND = "kl_pending", PFIELDS = ["nm", "ph", "ct", "rg", "ds", "ad", "nt", "cc", "ccx"];
function savePending() { try { const f = {}; PFIELDS.forEach(i => { const e = $(i); if (e) f[i] = e.value }); sessionStorage.setItem(PEND, JSON.stringify({ rid: RQ && RQ.rid, sig: RQ && RQ.sig, f })) } catch (_) { } }
function clearPending() { try { sessionStorage.removeItem(PEND) } catch (_) { } }
function restorePending() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PEND) || "null"); if (!p || !p.f || $("nm").value || $("ph").value) return;
    PFIELDS.forEach(i => { const e = $(i); if (e && p.f[i] != null) e.value = p.f[i] });
    const cc = $("cc"); if (cc) cc.dispatchEvent(new Event("change"));
    if (p.rid && p.sig) RQ = { rid: p.rid, sig: p.sig };
    T("استرجعنا بيانات طلبك الذي لم يُسجَّل. راجعها ثم اضغط إرسال.");
  } catch (_) { }
}
const SZ = t => (+t.ts || 1) != 1 ? " · الحجم " + Math.round(100 * t.ts) + "%" : "";
const POSN = (cu, t) => { const r = regionFor(cu, "text", t.pos); return r ? " · الموضع: " + r.name : "" };
function waMsg(id, tot, cs, o, link, note) {
  const M = ["*☕ طلب جديد " + id + "*", ""], ac = t => t.t.trim();
  cs.forEach((cu, m) => {
    M.push("*" + (S.n > 1 ? "الكوب " + (m + 1) + " — " : "") + C[cu.c][0] + "*");
    Object.keys(L).forEach(k => { const t = cu.p[k]; if (!ac(t)) return; M.push("• " + L[k][0] + ": «" + t.t + (t.two && t.t2 ? " / " + t.t2 : "") + "» (" + F[t.fo][0] + ")" + SZ(t) + (k == "f" ? POSN(cu, t) : "")) });
    M.push("");
  });
  if (S.logo) { const r = regionFor(cup(), "logo", S.lpos); M.push("🖼️ شعار: سيرسله العميل كملف" + (r ? " · الموضع: " + r.name : ""), "") }
  if (o.card) M.push("🎁 تغليف هدية" + (S.n > 1 ? (S.m == "p" ? " (معاً)" : " (لكل كوب)") : "") + ": إلى " + (o.card.to || "-") + " · من " + (o.card.fr || "-") + (o.card.ms ? " — «" + o.card.ms + "»" : ""), "");
  M.push("💰 *الإجمالي: " + tot + " ر.س*" + (S.q > 1 ? " (الكمية " + S.q + ")" : "") + (note ? " " + note : ""), "", "👤 " + o.cu.nm + " · " + o.cu.ph, "📍 " + [o.cu.ct, o.cu.rg, o.cu.ds].filter(Boolean).join(" - ") + (o.cu.ad ? " · " + o.cu.ad : ""));
  if (o.cu.nt) M.push("📝 " + o.cu.nt);
  if (link) M.push("", "🔗 معاينة التصميم:", link);
  return M.join("\n");
}
function showDone(html, url, cs, id) {
  const d = $("done"); d.hidden = false; d.innerHTML = html;
  if (url) { const a = document.createElement("a"); a.className = "go wa"; a.style.cssText = "display:block;text-align:center;text-decoration:none"; a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "افتح واتساب وأرسل الطلب"; d.appendChild(a); }
  if (cs) {
    const b = document.createElement("button"); b.className = "go s"; b.textContent = "إرسال صورة التصميم أيضاً"; d.appendChild(b);
    b.onclick = async () => { try { const f = await sheet(cs, id); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] }); else { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click() } } catch (_) { } };
  }
  d.scrollIntoView({ behavior: "smooth" });
}
async function order() {
  if (BUSY) return;
  const r = calc(), cs = S.cups.slice(0, S.n), v = i => $(i).value.trim();
  for (let m = 0; m < S.n; m++) if (!Object.keys(L).some(k => act(cs[m].p[k]))) { S.k = m; upd(); return T("اكتب عبارة واحدة على الأقل للكوب " + (m + 1) + ".") }
  document.querySelectorAll("#st2 .bad").forEach(e => e.classList.remove("bad"));
  const bad = (id, msg) => { const e = $(id); e.classList.add("bad"); try { e.focus({ preventScroll: true }); e.scrollIntoView({ block: "center", behavior: "smooth" }) } catch (_) { } return T(msg) };
  if (!v("nm")) return bad("nm", "اكتب اسمك.");
  const ccv = $("cc").value == "other" ? $("ccx").value : $("cc").value, np = normPhone(ccv, v("ph"));
  if (np.err) return bad($("cc").value == "other" && !/^[1-9]\d{0,3}$/.test(ccv.replace(/\D/g, "")) ? "ccx" : "ph", np.err);
  if (!v("ct")) return bad("ct", "اكتب المدينة.");
  if (!v("rg")) return bad("rg", "اكتب المنطقة أو اخترها من القائمة.");
  if (!v("ds")) return bad("ds", "اكتب الحي.");
  if (!CFG.wa) return T("رقم واتساب المتجر غير مضبوط.");
  const strip = p => { const o = {}; Object.keys(L).forEach(k => { const t = p[k]; o[k] = { t: t.t, t2: t.t2, two: t.two ? 1 : 0, fo: t.fo, ts: +t.ts || 1, pos: k == "f" ? (t.pos || "") : "" } }); return o };
  const o = {
    n: S.n, w: S.w, m: S.m, q: S.q, mk: $("mk").checked ? 1 : 0, hp: "", ct: r.tot,
    cups: cs.map(cu => ({ ck: cu.c < 3 ? C[cu.c][2] : "c" + (cu.c - 3), p: strip(cu.p) })),
    logo: S.logo ? { size: S.ls, y: S.ly, pos: S.lpos || "", data: logoData() } : null,
    card: S.w ? { to: v("cto"), fr: v("cfr"), ms: v("cms") } : null,
    cu: { nm: v("nm"), ph: np.ph, ct: v("ct"), rg: v("rg"), ds: v("ds"), ad: v("ad"), nt: v("nt") }
  };
  const bs = [$("go"), $("go2")], setB = b => { BUSY = b; bs.forEach(x => { x.disabled = !!b; x.style.opacity = b ? .6 : 1 }) };
  const send = (id, tot, link, note, open) => { const url = "https://wa.me/" + CFG.wa.replace(/\D/g, "") + "?text=" + encodeURIComponent(waMsg(id, tot, cs, o, link, note)); if (open !== false) { try { window.open(url, "_blank") } catch (_) { } } return url };
  const sig = sigOf(JSON.stringify(o)); if (!RQ || RQ.sig != sig) RQ = { rid: rqId(), sig }; o.rid = RQ.rid;
  const recap = () => '<div style="margin:8px 0;padding:10px 12px;background:#f8f2e8;border-radius:12px;font-size:13.5px;line-height:1.9">' + cs.map((cu, m) => "<div><b>" + (S.n > 1 ? "الكوب " + (m + 1) + " — " : "") + EX(C[cu.c][0]) + "</b>: " + Object.keys(L).filter(k => act(cu.p[k])).map(k => EX(L[k][0]) + " «" + EX(cu.p[k].t) + (cu.p[k].two && cu.p[k].t2 ? " / " + EX(cu.p[k].t2) : "") + "»").join(" · ") + "</div>").join("") + "<div>👤 " + EX(o.cu.nm) + ' · <span dir="ltr">' + EX(o.cu.ph) + "</span></div><div>📍 " + EX([o.cu.ct, o.cu.rg, o.cu.ds].filter(Boolean).join(" - ")) + "</div></div>";
  const failCard = (msg, retry) => {
    savePending();
    showDone(`<p style="color:#b3261e"><b>لم يتم تسجيل طلبك.</b> ${EX(msg)}</p><p style="font-size:13px;color:var(--mut)">${retry ? "بياناتك وتصميمك محفوظة، اضغط إعادة المحاولة ولن يتكرر الطلب حتى لو كان الإرسال السابق قد وصل." : "راجع بياناتك أعلاه ثم أعد المحاولة."}</p><button class="go" id="rt">إعادة المحاولة</button>`, "", null);
    $("rt").onclick = () => order().catch(EH);
    const b = document.createElement("button"); b.className = "go s"; b.textContent = "إرسال عبر واتساب بدون حفظ"; $("done").appendChild(b);
    b.onclick = () => window.open("https://wa.me/" + CFG.wa.replace(/\D/g, "") + "?text=" + encodeURIComponent(waMsg("KL-L" + Date.now().toString(36).toUpperCase(), r.tot, cs, o, "", "(غير مسجّل بالخادم — يُراجع السعر)")), "_blank");
  };
  if (!GSOK) {
    const id = "KL-" + Date.now().toString(36).toUpperCase(), url = send(id, r.tot, "", "");
    return showDone(`<p style="color:#b3261e"><b>الطلب غير مسجّل في نظام كلمتين.</b> الخدمة الخلفية غير مربوطة حالياً، فلن يظهر طلبك في لوحة الإدارة، والمعاينة العامة غير متاحة حالياً.</p><p>لإرسال طلبك اضغط الزر لفتح واتساب ثم اضغط إرسال (رقم مرجعي مؤقت: <b>${id}</b>).</p>`, url, cs, id);
  }
  setB(1); let res = null, net = 0;
  try { res = await api("order", { o }) } catch (e) { net = 1 }
  setB(0);
  if (net) return failCard("تعذّر الاتصال بالخادم أو انتهت مهلة الانتظار.", true);
  if (!res || !res.ok) return failCard((res && res.err) || "رفض الخادم الطلب.", !!(res && res.retry));
  clearPending();
  const base = siteBase(), link = base ? base + "?p=" + res.token : "", trk = base ? base + "?t=" + res.token : "";
  if (res.adjusted) T("تم اعتماد السعر حسب قائمة الأسعار الحالية: " + res.total + " ر.س");
  const url = send(res.id, res.total, link, "", !res.duplicate);
  showDone(`<p>${res.duplicate ? "هذا الطلب مسجّل لدينا مسبقاً برقم" : "تم تسجيل طلبك رقم"} <b>${EX(res.id)}</b> (الإجمالي ${EX(res.total)} ر.س). لإتمامه اضغط الزر لفتح واتساب ثم إرسال الرسالة.</p>` + recap() + (trk ? `<p style="margin:8px 0"><a id="trk" href="${EX(trk)}" target="_blank" rel="noopener"><b>تتبّع طلبك واعتمد التصميم</b></a><br><small style="color:var(--mut)">احتفظ بهذا الرابط، فهو مفتاح الوصول لطلبك (لا تشاركه مع أحد).</small></p>` : "") + (link ? "" : `<p style="color:#b3261e;font-size:13px">رابط المعاينة غير متاح لأن الصفحة تعمل محلياً. انشر الموقع أو اضبط «رابط الموقع» من لوحة الإدارة.</p>`), url, cs, res.id);
}

/* ---------- صفحة المعاينة العامة (?p=TOKEN) وصفحة تتبع الطلب (?t=TOKEN) — بلا بيانات شخصية ---------- */
async function loadLogo(d) {
  if (d.logo && d.logo.data) { await new Promise(res => { const i = new Image(); i.onload = () => { S.logo = i; res() }; i.onerror = res; i.src = d.logo.data }); S.ls = d.logo.size || 1; S.ly = d.logo.y || 0; S.lpos = d.logo.pos || "" }
}
function drawDesign(d, w) {
  d.cups.forEach((x, m) => {
    let ci = C.findIndex((_, k) => cidOf(k) == x.cid); if (ci < 0) ci = VIS[0];
    const cu = { c: ci, p: x.p }, card = document.createElement("div"); card.className = "card"; card.style.marginTop = "12px";
    const h = document.createElement("h3"); h.textContent = (d.n > 1 ? "الكوب " + (m + 1) + " — " : "") + C[ci][0]; card.appendChild(h);
    const g = document.createElement("div"); g.className = "og"; card.appendChild(g); w.appendChild(card);
    ["f", "i", "b"].forEach(v => {
      if (!cu.p[v] || !String(cu.p[v].t || "").trim()) return;
      const c = document.createElement("canvas"), ph = PH[C[ci][2]]; c.width = 800; c.height = Math.round(800 * ph.h / ph.w);
      c.setAttribute("role", "img"); c.setAttribute("aria-label", "معاينة " + L[v][0]);
      IMGP.then(() => R(c.getContext("2d"), 800, cu, v));
      const b = document.createElement("div"); b.appendChild(c); const p = document.createElement("p"); p.textContent = L[v][0]; b.appendChild(p); g.appendChild(b);
    });
  });
}
const tkEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e };
const tkDate = ms => { try { return new Date(ms).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }) } catch (_) { return "" } };
async function trackView(tk, e, msg) {
  let r; try { r = await (await fetch(CFG.gs + "?action=track&t=" + tk)).json(); if (!r.ok) throw 0 } catch (_) { return msg("رابط التتبع غير صالح أو انتهت صلاحيته، أو تعذّر الاتصال.") }
  const d = r.design; await loadLogo(d);
  document.title = "تتبع طلبك | كلمتين";
  const st = document.createElement("style");
  st.textContent = ".tk-st{display:flex;gap:0;margin:14px 0 6px;padding:0;list-style:none}.tk-st li{flex:1;text-align:center;font-size:12px;color:var(--mut);position:relative;padding-top:26px}.tk-st li:before{content:'';position:absolute;top:6px;inset-inline:0;height:4px;background:var(--ln)}.tk-st li:after{content:'';position:absolute;top:0;left:50%;margin-left:-8px;width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--ln)}.tk-st li.d:before{background:var(--br)}.tk-st li.d:after{background:var(--br);border-color:var(--br)}.tk-st li.c{color:var(--ink,#2b221b);font-weight:700}.tk-box{margin-top:12px;padding:14px;border-radius:14px;border:1px solid var(--ln);background:#fff}.tk-ok{border-color:#2e7d32;background:#eef7ee}.tk-ch{border-color:#b26a00;background:#fff4e0}.tk-bad{border-color:#b3261e;background:#fdecea}.tk-box textarea{width:100%;min-height:90px;border:1px solid #ddd2c2;border-radius:12px;padding:10px;font:inherit;box-sizing:border-box}.tk-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.tk-row button{flex:1 1 140px}.tk-err{color:#b3261e;font-size:13.5px;margin-top:8px}#tk-approval{margin-top:12px}";
  document.head.appendChild(st);
  e.innerHTML = ""; const hd = document.createElement("header"); hd.appendChild(tkEl("h1", "", "تتبع طلبك")); { const sb = tkEl("p", "sub", "رقم الطلب: "), id = tkEl("bdi", "", r.id); id.style.unicodeBidi = "isolate"; sb.appendChild(id); if (r.createdAt) sb.appendChild(document.createTextNode(" · " + tkDate(r.createdAt))); hd.appendChild(sb) } e.appendChild(hd);
  const sc = tkEl("div", "card"); sc.id = "tk-status"; e.appendChild(sc);
  sc.appendChild(tkEl("h3", "", r.cancelled ? "تم إلغاء هذا الطلب" : r.statusLabel));
  if (!r.cancelled) { const ol = tkEl("ol", "tk-st"); r.steps.forEach((s, i) => { const li = tkEl("li", i <= r.step ? "d" + (i == r.step ? " c" : "") : "", s.label); if (i == r.step) li.setAttribute("aria-current", "step"); ol.appendChild(li) }); sc.appendChild(ol) }
  const ab = tkEl("div", "card"); ab.id = "tk-approval"; e.appendChild(ab);
  const paint = (errMsg) => {
    ab.innerHTML = ""; const a = r.approval || { state: "" }; ab.appendChild(tkEl("h3", "", "اعتماد التصميم"));
    const box = tkEl("div", "tk-box"); ab.appendChild(box);
    if (a.state === "approved") { box.classList.add("tk-ok"); box.appendChild(tkEl("b", "", "✓ اعتمدتَ التصميم")); box.appendChild(tkEl("p", "", "شكراً لك، سنبدأ التنفيذ بإذن الله." + (a.at ? " (" + tkDate(a.at) + ")" : ""))); return }
    if (a.state === "changes") { box.classList.add("tk-ch"); box.appendChild(tkEl("b", "", "✎ أرسلتَ طلب تعديل")); const q = tkEl("p", "", a.note); q.id = "tk-note"; q.style.whiteSpace = "pre-wrap"; box.appendChild(q); box.appendChild(tkEl("p", "", "سنتواصل معك لتعديل التصميم ثم نطلب اعتمادك من جديد.")) }
    if (!r.canDecide) { if (!a.state) box.appendChild(tkEl("p", "", r.cancelled ? "هذا الطلب ملغي." : "الطلب في مرحلة لا يمكن فيها تغيير التصميم. تواصل معنا إن احتجت شيئاً.")); return }
    if (!a.state) box.appendChild(tkEl("p", "", "راجع تصميمك في الأسفل، ثم اعتمده أو اطلب تعديلاً قبل أن نبدأ الحفر."));
    const row = tkEl("div", "tk-row"), ok = tkEl("button", "go", "اعتماد التصميم"), ch = tkEl("button", "go s", a.state ? "إرسال تعديل آخر" : "طلب تعديل");
    ok.id = "ap-ok"; ch.id = "ap-chg"; ok.type = ch.type = "button"; row.appendChild(ok); row.appendChild(ch); box.appendChild(row);
    const err = tkEl("div", "tk-err"); err.id = "tk-err"; err.setAttribute("role", "alert"); if (errMsg) err.textContent = errMsg; box.appendChild(err);
    const send = async (decision, note, btns) => {
      btns.forEach(b => b.disabled = true); err.textContent = "";
      let res = null; try { res = await api("track.approve", { t: tk, decision, note }) } catch (_) { }
      if (!res) { btns.forEach(b => b.disabled = false); err.textContent = "تعذّر الاتصال، لم يُحفظ ردّك. أعد المحاولة."; return }
      if (res.ok) { r.approval = res.approval; r.canDecide = res.canDecide !== false && res.approval.state !== "approved"; return paint() }
      if (res.approval) r.approval = res.approval; if (/مسبقاً|هذه المرحلة/.test(res.err || "")) r.canDecide = false;
      if (res.approval && res.approval.state === "approved") return paint();
      btns.forEach(b => b.disabled = false); err.textContent = res.err || "تعذّر حفظ ردّك. أعد المحاولة.";
    };
    ok.onclick = () => { row.hidden = true; const c = tkEl("div", "tk-row"), y = tkEl("button", "go", "نعم، اعتمد التصميم"), n = tkEl("button", "go s", "رجوع"); y.id = "ap-yes"; n.id = "ap-no"; y.type = n.type = "button"; box.insertBefore(tkEl("p", "", "بعد الاعتماد لن تتمكن من تغيير التصميم. هل أنت متأكد؟"), err); box.insertBefore(c, err); c.appendChild(y); c.appendChild(n); n.onclick = () => paint(); y.onclick = () => send("approve", "", [y, n]) };
    ch.onclick = () => { row.hidden = true; const ta = document.createElement("textarea"); ta.id = "ap-text"; ta.maxLength = 400; ta.placeholder = "اكتب التعديل المطلوب (مثال: غيّروا الخط إلى النسخ)"; ta.setAttribute("aria-label", "التعديل المطلوب"); const c = tkEl("div", "tk-row"), y = tkEl("button", "go", "إرسال التعديل"), n = tkEl("button", "go s", "رجوع"); y.id = "ap-send"; n.id = "ap-no"; y.type = n.type = "button"; box.insertBefore(ta, err); box.insertBefore(c, err); c.appendChild(y); c.appendChild(n); n.onclick = () => paint(); y.onclick = () => { if (ta.value.trim().length < 3) { err.textContent = "اكتب التعديل المطلوب."; ta.focus(); return } send("changes", ta.value.trim(), [y, n]) }; ta.focus() };
  };
  paint();
  const w = tkEl("div"); w.id = "oc2"; e.appendChild(tkEl("h2", "", "تصميمك")); e.appendChild(w); e.appendChild(tkEl("p", "sub", "هذه معاينة تقريبية لتصميمك من كلمتين."));
  drawDesign(d, w);
}
/* بيانات منظّمة للمنتج بالسعر الحالي من الخادم (تُحقن بعد التحميل حتى لا تختلف عن السعر الفعلي في الصفحة) */
function seoProduct() {
  try {
    const P = (typeof CFG !== "undefined" && CFG.P) || {}, f = Number(P.first); if (!(f > 0)) return;
    const base = ((document.querySelector("link[rel=canonical]") || {}).href || location.href.split(/[?#]/)[0]), el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: "كوب سيراميك منقوش بالليزر حسب الطلب", description: "كوب سيراميك يُنقش بالليزر باسمك أو عبارتك أو شعارك على الواجهة أو داخل الكوب أو القاع، مع خيار تغليف هدية.", image: [base + "assets/og.jpg"], brand: { "@type": "Brand", name: "كلمتين" }, offers: { "@type": "Offer", priceCurrency: "SAR", price: String(f), availability: "https://schema.org/InStock", url: base, areaServed: ["أبها", "خميس مشيط", "أحد رفيدة"] } });
    document.head.appendChild(el);
  } catch (_) { }
}
async function own() {
  const sp = new URLSearchParams(location.search), q = sp.get("p"), tk = sp.get("t"), old = /^#[ot]=/.test(location.hash);
  if (!q && !tk && !old) { seoProduct(); return; }
  $("app").hidden = true; $("bar").hidden = true; const e = $("own"); e.hidden = false;
  const mt = document.createElement("meta"); mt.name = "robots"; mt.content = "noindex,nofollow"; document.head.appendChild(mt);
  const msg = t => { e.innerHTML = ""; const p = document.createElement("p"); p.style.padding = "28px 8px"; p.style.textAlign = "center"; p.textContent = t; e.appendChild(p) };
  if (old) return msg("هذا رابط قديم لم يعد مدعوماً لأسباب أمنية. اطلب رابط معاينة جديداً من كلمتين.");
  if (!GSOK) return msg(tk ? "تتبع الطلب غير متاح حالياً." : "المعاينة العامة غير متاحة حالياً.");
  if (tk) { if (!/^[A-Z2-7]{16}$/.test(tk)) return msg("رابط التتبع غير صالح."); return trackView(tk, e, msg) }
  if (!/^[A-Z2-7]{16}$/.test(q)) return msg("رابط المعاينة غير صالح.");
  let d; try { const r = await (await fetch(CFG.gs + "?action=preview&t=" + q)).json(); if (!r.ok) throw 0; d = r.design } catch (_) { return msg("رابط المعاينة غير صالح أو انتهت صلاحيته، أو تعذّر الاتصال.") }
  await loadLogo(d);
  document.title = "معاينة تصميم | كلمتين";
  e.innerHTML = '<header><h1>معاينة التصميم</h1><p class="sub">هذه معاينة تقريبية لتصميمك من كلمتين.</p></header><div id="oc2"></div>';
  drawDesign(d, $("oc2"));
}

/* ---------- المعرض ---------- */
function initGallery() {
  const A = (CFG.GAL || []).map(x => typeof x == "string" ? { t: x, f: x, c: "", g: "", home: 1 } : x);
  if (!A.length) return;
  const G = A.filter(x => x.home).length ? A.filter(x => x.home) : A.slice(0, 6);
  $("gs").hidden = false;
  const t = $("gt"), d = $("gd"); t.innerHTML = ""; d.innerHTML = "";
  G.forEach(s => { const i = new Image(); i.src = s.t || s.f; i.loading = "lazy"; i.alt = s.c || "من أعمال كلمتين"; i.onclick = () => LB(s.f || s.t, G, G.indexOf(s)); t.appendChild(i); d.insertAdjacentHTML("beforeend", "<s></s>") });
  let k = 0, pz = 0, x0 = null;
  const go = n => { k = (n + G.length) % G.length; t.style.transform = `translateX(${-k * 100}%)`;[...d.children].forEach((e, j) => e.classList.toggle("on", j == k)) };
  go(0); setInterval(() => { if (!pz) go(k + 1) }, 2500);
  const g = $("gal"); g.onpointerdown = e => { if (e.target.closest("button")) return; x0 = e.clientX; pz = 1 };
  g.onpointerup = e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) go(k + (e.clientX < x0 ? 1 : -1)); x0 = null; setTimeout(() => pz = 0, 4000) };
  $("gp").onclick = () => { go(k - 1); pz = 1; setTimeout(() => pz = 0, 4000) }; $("gn").onclick = () => { go(k + 1); pz = 1; setTimeout(() => pz = 0, 4000) };
  g.onmouseenter = () => pz = 1; g.onmouseleave = () => pz = 0;
  if (!$("gall")) {
    const b = document.createElement("button"); b.id = "gall"; b.className = "go s"; b.style.marginTop = "10px"; b.textContent = "عرض كل الأعمال (" + A.length + ")"; $("gs").appendChild(b);
    b.onclick = () => {
      const groups = [...new Set(A.map(x => x.g).filter(Boolean))];
      const o = ovl("gall2", '<h3>أعمالنا</h3><div class="ft" id="gch"></div><div class="og" id="gg"></div><button class="go s" id="gx">إغلاق</button>');
      const show = gr => { $("gg").innerHTML = ""; const FL = A.filter(x => !gr || x.g == gr); FL.forEach(x => { const i = new Image(); i.src = x.t || x.f; i.loading = "lazy"; i.alt = x.c || ""; i.style.cssText = "width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;cursor:zoom-in"; i.onclick = () => LB(x.f || x.t, FL, FL.indexOf(x)); $("gg").appendChild(i) }); document.querySelectorAll("#gch button").forEach(z => z.classList.toggle("on", (z.dataset.g || "") == (gr || ""))) };
      [""].concat(groups).forEach(gr => { const z = document.createElement("button"); z.textContent = gr || "الكل"; z.dataset.g = gr; z.onclick = () => show(gr); $("gch").appendChild(z) });
      show(""); $("gx").onclick = () => o.hidden = true;
    };
  }
}

/* ---------- نصوص الواجهة وترتيب الأقسام (من لوحة الإدارة) ---------- */
function applySite() {
  const s = CFG.site || {};
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e };
  if (s.heroTitle) document.querySelector("header h1").textContent = s.heroTitle;
  if (s.heroSub) document.querySelector("header .sub").textContent = s.heroSub;
  if (s.announce) { const a = el("div", "ann", s.announce); a.setAttribute("role", "status"); $("app").insertBefore(a, $("app").firstChild) }
  if (window.KL_STALE) T("تعذّر تحديث البيانات من الخادم. تُعرض آخر نسخة محفوظة، وسيُعاد التحقق من السعر عند إرسال الطلب.");
  else if (window.KL_APIDOWN) T("تعذّر الاتصال بالخادم. تعمل الصفحة بالإعدادات الافتراضية، وسيُعاد التحقق من السعر عند إرسال الطلب.");
  initGallery();
  const faq = $("faq"); if (faq && (s.faq || []).length) { faq.innerHTML = ""; faq.appendChild(el("h3", "", "أسئلة شائعة")); s.faq.forEach(x => { const d = el("details", "q"); d.appendChild(el("summary", "", x.q)); d.appendChild(el("p", "", x.a)); faq.appendChild(d) }) }
  const info = el("div", "card"); info.id = "info"; let n = 0; info.appendChild(el("h3", "", "معلومات المتجر"));
  [["أوقات العمل", s.hours], ["العنوان", s.address], ["التوصيل", s.deliveryPolicy], ["الاستبدال والإرجاع", s.returnPolicy], ["سياسة الطلب", s.orderPolicy]].forEach(([h, v]) => { if (!v) return; n++; const b = el("div"); b.style.margin = "8px 0"; b.appendChild(el("b", "", h)); const p = el("p", "", v); p.style.cssText = "margin:2px 0;color:var(--mut);white-space:pre-wrap"; b.appendChild(p); info.appendChild(b) });
  const blocks = {}; (s.blocks || []).forEach(b => { const c = el("div", "card"); c.id = b.id; c.appendChild(el("h3", "", b.title)); const p = el("p", "", b.body); p.style.cssText = "color:var(--mut);white-space:pre-wrap"; c.appendChild(p); blocks[b.id] = c });
  const nodes = { gallery: $("gs"), steps: $("steps"), faq: faq, info: n ? info : null }, foot = document.querySelector("footer");
  Object.keys(blocks).forEach(k => nodes[k] = blocks[k]);
  const order = (s.sections || []).filter(x => nodes[x.id]), seen = {};
  order.forEach(x => { seen[x.id] = 1; const nd = nodes[x.id]; if (x.on === false) { nd.hidden = true; nd.style.display = "none"; return } $("app").insertBefore(nd, foot) });
  Object.keys(nodes).forEach(k => { if (!seen[k] && nodes[k] && !nodes[k].parentNode) $("app").insertBefore(nodes[k], foot) });
  restorePending();
}

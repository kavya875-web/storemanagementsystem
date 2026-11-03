/* =====================================================================
   AUTH: Login (Mobile ya Email + same password) / Signup / Forgot Password + Role based access
   Roles:
     - salesman : full store app (everything)
     - customer : only their own "Customer Udhari" page (read-only)
   Uses globals from app.js / khata.js: udhariEntries, customers, settings,
   STORAGE_KEYS, khataMoney, khataBalance, khataPaid, khataDate, showToast
   ===================================================================== */
(() => {
  "use strict";

  /* ---------------- CONFIG ---------------- */
  const AUTH_CONFIG = {
    // DEMO MODE: no SMS gateway is connected, so the OTP is shown on screen.
    // To send real SMS: set demoShowOtp=false and put your backend URL in
    // smsEndpoint. It will receive POST {phone, otp, message} as JSON.
    demoShowOtp: true,
    smsEndpoint: "",
    otpTtlMs: 5 * 60 * 1000,
    resendMs: 30 * 1000,
    maxOtpTries: 5,
    maxLoginTries: 5,
    lockMs: 5 * 60 * 1000,
    sessionDays: 7,
    minPasswordLen: 6
  };

  const AUTH_KEYS = {
    USERS: "gs_auth_users_v1",
    SESSION: "gs_auth_session_v1",
    LOCK: "gs_auth_lock_v1"
  };

  /* ---------------- SMALL HELPERS ---------------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normPhone = p => {
    const d = String(p || "").replace(/\D/g, "");
    return d.length >= 10 ? d.slice(-10) : d;
  };
  const validPhone = p => /^[6-9]\d{9}$/.test(p);
  const normEmail = e => String(e || "").trim().toLowerCase();
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const readJSON = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } };
  const toast = (m, t) => { if (typeof showToast === "function") showToast(m, t); };

  const getUsers = () => readJSON(AUTH_KEYS.USERS, []);
  const saveUsers = u => writeJSON(AUTH_KEYS.USERS, u);
  const findUser = (role, phone) => getUsers().find(u => u.role === role && u.phone === phone);
  const findUserByEmail = (role, email) => !email ? null : (getUsers().find(u => u.role === role && u.email && u.email === email) || null);
  // Login id can be a 10 digit mobile number OR an email address (same account, same password)
  const findByIdent = (role, ident) => ident.includes("@") ? findUserByEmail(role, normEmail(ident)) : findUser(role, normPhone(ident));

  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  const randomHex = n => {
    const a = new Uint8Array(n);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
    return hex(a);
  };
  function cyrb53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  // Passwords are never stored in plain text: salted PBKDF2 (fallback: simple hash on non-secure pages)
  async function hashPw(pw, salt) {
    try {
      if (window.crypto && crypto.subtle) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
        const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
        return "p1$" + hex(bits);
      }
    } catch (e) { /* fall through */ }
    return "f1$" + cyrb53(salt + pw + salt);
  }

  /* ---------------- LOGIN ATTEMPT LOCK ---------------- */
  function lockInfo(key) {
    const all = readJSON(AUTH_KEYS.LOCK, {});
    return { all, rec: all[key] || { n: 0, until: 0 } };
  }
  function isLocked(key) {
    const { rec } = lockInfo(key);
    return rec.until > Date.now() ? Math.ceil((rec.until - Date.now()) / 60000) : 0;
  }
  function recordFail(key) {
    const { all, rec } = lockInfo(key);
    rec.n = (rec.n || 0) + 1;
    if (rec.n >= AUTH_CONFIG.maxLoginTries) { rec.until = Date.now() + AUTH_CONFIG.lockMs; rec.n = 0; }
    all[key] = rec; writeJSON(AUTH_KEYS.LOCK, all);
  }
  function clearFails(key) {
    const { all } = lockInfo(key);
    delete all[key]; writeJSON(AUTH_KEYS.LOCK, all);
  }

  /* ---------------- SESSION ---------------- */
  function saveSession(user) {
    writeJSON(AUTH_KEYS.SESSION, { role: user.role, phone: user.phone, exp: Date.now() + AUTH_CONFIG.sessionDays * 86400000 });
  }
  function getSessionUser() {
    const s = readJSON(AUTH_KEYS.SESSION, null);
    if (!s || !s.exp || s.exp < Date.now()) return null;
    return findUser(s.role, s.phone) || null;
  }
  function clearSession() { try { localStorage.removeItem(AUTH_KEYS.SESSION); } catch (e) { } }

  /* ---------------- STATE ---------------- */
  let role = "customer";       // selected role on login screen
  let view = "login";          // login | phone | otp | password
  let flow = null;             // {mode:'signup'|'reset', role, name, phone, otp, exp, tries, sentAt, verified}
  let flash = null;            // {type, text}
  let resendTimer = null;
  let currentUser = null;
  let portalFilter = "pending";

  /* ---------------- STORE RECORD CHECKS ---------------- */
  function phoneKnownToStore(phone) {
    const inCust = (typeof customers !== "undefined" ? customers : []).some(c => normPhone(c.phone) === phone);
    const inUd = (typeof udhariEntries !== "undefined" ? udhariEntries : []).some(u => normPhone(u.phone) === phone);
    return inCust || inUd;
  }
  function storeNameForPhone(phone) {
    const c = (typeof customers !== "undefined" ? customers : []).find(x => normPhone(x.phone) === phone);
    if (c && c.name) return c.name;
    const u = (typeof udhariEntries !== "undefined" ? udhariEntries : []).find(x => normPhone(x.phone) === phone);
    return u && u.name ? u.name : "";
  }

  /* ---------------- OTP ---------------- */
  function makeOtp() {
    const a = new Uint32Array(1);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.floor(Math.random() * 4294967295));
    return String(a[0] % 1000000).padStart(6, "0");
  }
  async function sendOtp() {
    flow.otp = makeOtp();
    flow.exp = Date.now() + AUTH_CONFIG.otpTtlMs;
    flow.tries = 0;
    flow.sentAt = Date.now();
    if (AUTH_CONFIG.smsEndpoint) {
      try {
        await fetch(AUTH_CONFIG.smsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: flow.phone, otp: flow.otp, message: `Your OTP is ${flow.otp}. Valid for 5 minutes.` })
        });
      } catch (e) { console.error("OTP SMS failed", e); }
    }
  }

  /* ---------------- SCREEN SHELL ---------------- */
  function buildShell() {
    if ($("auth-screen")) return;
    const screen = document.createElement("div");
    screen.id = "auth-screen";
    screen.innerHTML = `<div class="auth-card" id="auth-card"></div>`;
    document.body.appendChild(screen);

    const portal = document.createElement("div");
    portal.id = "customer-portal";
    document.body.appendChild(portal);

    const modal = document.createElement("div");
    modal.id = "auth-staff-modal";
    modal.className = "auth-modal";
    modal.innerHTML = `
      <div class="auth-card" style="max-width:380px;">
        <div class="auth-title">+ Naya Salesman Jodo</div>
        <div class="auth-sub">Is salesman ko poora store access milega.</div>
        <div id="staff-msg"></div>
        <div class="auth-field"><label>Naam</label><input class="auth-input" id="staff-name" placeholder="Salesman ka naam"></div>
        <div class="auth-field"><label>Mobile number</label>
          <div class="auth-input-wrap"><span class="auth-prefix">+91</span><input class="auth-input" id="staff-phone" inputmode="numeric" maxlength="10" placeholder="10 digit mobile"></div></div>
        <div class="auth-field"><label>Email (optional)</label><input class="auth-input" id="staff-email" type="email" autocapitalize="off" placeholder="salesman@example.com"></div>
        <div class="auth-field"><label>Password</label><input class="auth-input" id="staff-pass" type="text" placeholder="Kam se kam ${AUTH_CONFIG.minPasswordLen} akshar"></div>
        <button class="auth-btn" id="staff-save">Salesman Banao</button>
        <div class="auth-links"><button class="auth-link" id="staff-cancel">Cancel</button></div>
      </div>`;
    document.body.appendChild(modal);

    const em = document.createElement("div");
    em.id = "auth-email-modal";
    em.className = "auth-modal";
    em.innerHTML = `
      <div class="auth-card" style="max-width:380px;">
        <div class="auth-title">📧 Email se login jodo</div>
        <div class="auth-sub">Email jodne ke baad aap email ya mobile number, dono se same password ke saath login kar sakte hain.</div>
        <div id="em-msg"></div>
        <div class="auth-field"><label>Email</label><input class="auth-input" id="em-email" type="email" autocapitalize="off" placeholder="aap@example.com"></div>
        <div class="auth-field"><label>Abhi ka password (confirm karne ke liye)</label><input class="auth-input" id="em-pass" type="password" autocomplete="current-password"></div>
        <button class="auth-btn" id="em-save">Email Save Karo</button>
        <div class="auth-links"><button class="auth-link" id="em-cancel">Cancel</button></div>
      </div>`;
    document.body.appendChild(em);
    $("em-cancel").onclick = () => em.classList.remove("open");
    $("em-save").onclick = saveEmail;
    $("staff-cancel").onclick = () => modal.classList.remove("open");
    $("staff-save").onclick = createStaff;
  }

  const logoHtml = () => `
    <div class="auth-logo">
      <div class="auth-logo-icon">🏪</div>
      <h2>${esc((typeof settings !== "undefined" && settings.storeName) || "My General Store")}</h2>
      <p>Billing &amp; Khata Manager</p>
    </div>`;
  const flashHtml = () => flash ? `<div class="auth-msg ${flash.type}">${esc(flash.text)}</div>` : "";
  const roleTabsHtml = () => `
    <div class="auth-roles">
      <button type="button" data-role="customer" class="${role === "customer" ? "active" : ""}">🧑 Customer</button>
      <button type="button" data-role="salesman" class="${role === "salesman" ? "active" : ""}">🧾 Salesman</button>
    </div>`;
  const identField = val => `
    <div class="auth-field"><label>Mobile number ya Email</label>
      <input class="auth-input" id="auth-ident" type="text" inputmode="email" autocomplete="username" autocapitalize="off" placeholder="10 digit mobile ya email" value="${esc(val || "")}"></div>`;
  const emailField = (id, val, label) => `
    <div class="auth-field"><label>${label || "Email"}</label>
      <input class="auth-input" id="${id}" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="aap@example.com" value="${esc(val || "")}"></div>`;
  const phoneField = (id, val) => `
    <div class="auth-field"><label>Mobile number</label>
      <div class="auth-input-wrap"><span class="auth-prefix">+91</span>
      <input class="auth-input" id="${id}" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10 digit mobile number" value="${esc(val || "")}"></div></div>`;
  const passField = (id, label, auto) => `
    <div class="auth-field"><label>${label}</label>
      <div class="auth-input-wrap"><input class="auth-input" id="${id}" type="password" autocomplete="${auto}" placeholder="Password" style="padding-right:42px;">
      <button type="button" class="auth-eye" data-eye="${id}" title="Show / hide">👁️</button></div></div>`;

  function setFlash(type, text) { flash = text ? { type, text } : null; }
  function go(v) { view = v; render(); }

  /* ---------------- RENDER ---------------- */
  function render() {
    const card = $("auth-card");
    if (!card) return;
    clearInterval(resendTimer);
    let html = logoHtml();

    if (view === "login") {
      const noSalesman = !getUsers().some(u => u.role === "salesman");
      html += roleTabsHtml() + flashHtml();
      if (role === "salesman" && noSalesman) {
        html += `<div class="auth-msg info">Pehli baar? Neeche <b>Create account</b> dabakar apna salesman account banayein.</div>`;
      }
      html += `
        <form id="auth-login-form" autocomplete="on">
          ${identField(flow && flow.ident)}
          ${passField("auth-pass", "Password", "current-password")}
          <button class="auth-btn" type="submit" id="auth-login-btn">Login</button>
        </form>
        <div class="auth-links">
          <button type="button" class="auth-link" id="auth-forgot">Forgot password?</button>
          <button type="button" class="auth-link" id="auth-signup">Create account</button>
        </div>`;
    }

    if (view === "phone") {
      const isSignup = flow.mode === "signup";
      const m = flow.method || "email";
      const who = role === "salesman" ? "Salesman" : "Customer";
      html += `<div class="auth-title">${isSignup ? "Naya account banayein" : "Password bhool gaye?"}</div>
        <div class="auth-sub">${isSignup ? "Email se account banayein (bilkul free, OTP nahi chahiye) ya mobile OTP se." : "Apne registered email + mobile se ya mobile OTP se password badlein."} (${who})</div>
        <div class="auth-roles auth-methods">
          <button type="button" data-method="email" class="${m === "email" ? "active" : ""}">📧 Email (Free)</button>
          <button type="button" data-method="phone" class="${m === "phone" ? "active" : ""}">📱 Mobile OTP</button>
        </div>` + flashHtml();
      if (m === "email") {
        html += `
        <form id="auth-email-form">
          ${isSignup ? `<div class="auth-field"><label>Aapka naam</label><input class="auth-input" id="auth-name" placeholder="Poora naam" value="${esc(flow.name || "")}"></div>` : ""}
          ${emailField("auth-email", flow.email)}
          ${phoneField("auth-phone", flow.phone)}
          <div class="auth-hint">${isSignup ? "Mobile number bhi zaruri hai taaki baad me mobile number se bhi login ho sake." : "Dono (email aur mobile) us account se match hone chahiye."}</div>
          ${isSignup ? passField("auth-new", "Password", "new-password") + passField("auth-confirm", "Password dobara likhein", "new-password") : ""}
          <button class="auth-btn" type="submit">${isSignup ? "Account Banao" : "Aage badhein"}</button>
        </form>`;
      } else {
        html += `
        <form id="auth-phone-form">
          ${isSignup ? `<div class="auth-field"><label>Aapka naam</label><input class="auth-input" id="auth-name" placeholder="Poora naam" value="${esc(flow.name || "")}"></div>` : ""}
          ${phoneField("auth-phone", flow.phone)}
          <button class="auth-btn" type="submit" id="auth-send-btn">OTP Bhejein</button>
        </form>`;
      }
      html += `<div class="auth-links"><button type="button" class="auth-link" id="auth-back">← Login par wapas</button></div>`;
    }

    if (view === "otp") {
      const masked = "XXXXXX" + flow.phone.slice(-4);
      html += `<div class="auth-title">OTP daalein</div>
        <div class="auth-sub">+91 ${masked} par 6 digit OTP bheja gaya hai. 5 minute tak valid hai.</div>` + flashHtml();
      if (AUTH_CONFIG.demoShowOtp) {
        html += `<div class="auth-demo-otp">🧪 <b>Demo mode</b> – SMS gateway connected nahi hai.<br>Aapka OTP: <b>${esc(flow.otp)}</b></div>`;
      }
      html += `
        <form id="auth-otp-form">
          <div class="auth-field"><input class="auth-input auth-otp" id="auth-otp" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code"></div>
          <button class="auth-btn" type="submit">Verify OTP</button>
        </form>
        <div class="auth-links">
          <button type="button" class="auth-link" id="auth-resend" disabled>Resend OTP</button>
          <button type="button" class="auth-link" id="auth-change">Number badlein</button>
        </div>`;
    }

    if (view === "password") {
      html += `<div class="auth-title">${flow.mode === "signup" ? "Password set karein" : "Naya password banayein"}</div>
        <div class="auth-sub">Mobile number verify ho gaya ✅ Ab naya password chunein (kam se kam ${AUTH_CONFIG.minPasswordLen} akshar).</div>` + flashHtml() + `
        <form id="auth-pw-form">
          ${flow.mode === "signup" ? emailField("auth-email-opt", flow.email, "Email (optional - email se bhi login ke liye)") : ""}
          ${passField("auth-new", "Naya password", "new-password")}
          ${passField("auth-confirm", "Password dobara likhein", "new-password")}
          <button class="auth-btn" type="submit" id="auth-pw-btn">${flow.mode === "signup" ? "Account Banao" : "Password Badlo"}</button>
        </form>`;
    }

    card.innerHTML = html;
    bind();
  }

  function bind() {
    document.querySelectorAll(".auth-roles button[data-role]").forEach(b => b.onclick = () => {
      role = b.dataset.role; flash = null; flow = null; render();
    });
    document.querySelectorAll(".auth-methods button").forEach(b => b.onclick = () => {
      // keep what the person already typed when switching Email <-> Mobile OTP
      const g = id => $(id) ? $(id).value : "";
      if ($("auth-name")) flow.name = g("auth-name").trim();
      if ($("auth-email")) flow.email = g("auth-email");
      if ($("auth-phone")) flow.phone = normPhone(g("auth-phone"));
      flow.method = b.dataset.method; flash = null; render();
    });
    document.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => {
      const i = $(b.dataset.eye); i.type = i.type === "password" ? "text" : "password";
    });
    ["auth-phone", "auth-otp"].forEach(id => {
      const el = $(id); if (el) el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, ""); });
    });

    if ($("auth-login-form")) {
      $("auth-login-form").onsubmit = onLogin;
      $("auth-forgot").onclick = () => startFlow("reset");
      $("auth-signup").onclick = () => startFlow("signup");
    }
    if ($("auth-phone-form")) $("auth-phone-form").onsubmit = onPhoneSubmit;
    if ($("auth-email-form")) $("auth-email-form").onsubmit = onEmailSubmit;
    if ($("auth-back")) $("auth-back").onclick = () => { flash = null; go("login"); };
    if ($("auth-otp-form")) {
      $("auth-otp-form").onsubmit = onOtpSubmit;
      $("auth-change").onclick = () => { flash = null; go("phone"); };
      const rb = $("auth-resend");
      const tick = () => {
        const left = Math.ceil((flow.sentAt + AUTH_CONFIG.resendMs - Date.now()) / 1000);
        if (left > 0) { rb.disabled = true; rb.textContent = `Resend OTP (${left}s)`; }
        else { rb.disabled = false; rb.textContent = "Resend OTP"; clearInterval(resendTimer); }
      };
      tick(); resendTimer = setInterval(tick, 1000);
      rb.onclick = async () => { await sendOtp(); setFlash("success", "Naya OTP bhej diya gaya."); render(); };
      setTimeout(() => $("auth-otp") && $("auth-otp").focus(), 50);
    }
    if ($("auth-pw-form")) $("auth-pw-form").onsubmit = onPasswordSubmit;
  }

  /* ---------------- HANDLERS ---------------- */
  function startFlow(mode) {
    const raw = $("auth-ident") ? $("auth-ident").value.trim() : "";
    const typedEmail = raw.includes("@") ? raw : "";
    const typedPhone = raw && !raw.includes("@") ? normPhone(raw) : "";
    flow = { mode, role, name: "", phone: typedPhone, email: typedEmail, method: "email", verified: false };
    flash = null;
    go("phone");
  }

  async function onLogin(e) {
    e.preventDefault();
    const ident = $("auth-ident").value.trim();
    const pw = $("auth-pass").value;
    flow = { ident };
    const isEmail = ident.includes("@");
    if (!ident) { setFlash("error", "Mobile number ya email daalein."); return render(); }
    if (isEmail && !validEmail(normEmail(ident))) { setFlash("error", "Sahi email address daalein."); return render(); }
    if (!isEmail && !validPhone(normPhone(ident))) { setFlash("error", "Sahi 10 digit mobile number ya email daalein."); return render(); }
    if (!pw) { setFlash("error", "Password daalein."); return render(); }

    const user = findByIdent(role, ident);
    // lock per account (same lock whether they try phone or email), else per typed id
    const lockKey = role + ":" + (user ? user.phone : (isEmail ? normEmail(ident) : normPhone(ident)));
    const mins = isLocked(lockKey);
    if (mins) { setFlash("error", `Bahut galat koshish. ${mins} minute baad try karein ya "Forgot password" use karein.`); return render(); }

    const ok = user && (await hashPw(pw, user.salt)) === user.hash;
    if (!ok) {
      recordFail(lockKey);
      setFlash("error", user ? "Galat password. Dobara try karein." : `Is ${isEmail ? "email" : "number"} se koi account nahi mila. 'Create account' karein.`);
      return render();
    }
    clearFails(lockKey);
    saveSession(user);
    enterApp(user);
  }

  /* shared signup rules (used by both Email signup and Mobile-OTP signup) */
  function signupError(f) {
    if (!f.name) return "Apna naam daalein.";
    if (findUser(f.role, f.phone)) return "Is number se account pehle se bana hai. Login karein ya Forgot password use karein.";
    if (f.email && findUserByEmail(f.role, f.email)) return "Is email se account pehle se bana hai. Login karein ya Forgot password use karein.";
    if (f.role === "salesman" && getUsers().some(u => u.role === "salesman"))
      return "Salesman account sirf maujooda salesman hi bana sakta hai (Header me '+ Salesman' button).";
    if (f.role === "customer" && !phoneKnownToStore(f.phone))
      return "Ye number store ke record me nahi hai. Pehle dukaan par salesman se apna number register karwayein.";
    return "";
  }

  async function onEmailSubmit(e) {
    e.preventDefault();
    const isSignup = flow.mode === "signup";
    const email = normEmail($("auth-email").value);
    const phone = normPhone($("auth-phone").value);
    flow.email = email; flow.phone = phone;
    if ($("auth-name")) flow.name = $("auth-name").value.trim();

    if (!validEmail(email)) { setFlash("error", "Sahi email address daalein."); return render(); }
    if (!validPhone(phone)) { setFlash("error", "Sahi 10 digit mobile number daalein (6-9 se shuru)."); return render(); }

    if (isSignup) {
      const p1 = $("auth-new").value, p2 = $("auth-confirm").value;
      const err = signupError(flow);
      if (err) { setFlash("error", err); return render(); }
      if (p1.length < AUTH_CONFIG.minPasswordLen) { setFlash("error", `Password kam se kam ${AUTH_CONFIG.minPasswordLen} akshar ka ho.`); return render(); }
      if (p1 !== p2) { setFlash("error", "Dono password match nahi karte."); return render(); }
      const salt = randomHex(16);
      const user = {
        id: "u-" + Date.now(), role: flow.role, phone, email,
        name: flow.name, salt, hash: await hashPw(p1, salt), createdAt: new Date().toISOString()
      };
      const users = getUsers(); users.push(user); saveUsers(users);
      saveSession(user);
      enterApp(user);
      toast("Account ban gaya 🎉", "success");
    } else {
      const u = findUser(flow.role, phone);
      if (!u || !u.email || u.email !== email) {
        setFlash("error", "Email aur mobile number us account se match nahi hue. Agar account me email jodi nahi thi to 'Mobile OTP' se reset karein.");
        return render();
      }
      flow.verified = true; flash = null;
      go("password");
    }
  }

  async function onPhoneSubmit(e) {
    e.preventDefault();
    const phone = normPhone($("auth-phone").value);
    const nameEl = $("auth-name");
    flow.phone = phone;
    if (nameEl) flow.name = nameEl.value.trim();

    if (!validPhone(phone)) { setFlash("error", "Sahi 10 digit mobile number daalein (6-9 se shuru)."); return render(); }

    if (flow.mode === "signup") {
      const err = signupError({ role: flow.role, name: flow.name, phone, email: "" });
      if (err) { setFlash("error", err); return render(); }
    } else {
      if (!findUser(flow.role, phone)) { setFlash("error", "Is number se koi account nahi mila. Pehle 'Create account' karein."); return render(); }
    }

    const btn = $("auth-send-btn"); btn.disabled = true;
    await sendOtp();
    flash = null;
    go("otp");
  }

  function onOtpSubmit(e) {
    e.preventDefault();
    const code = $("auth-otp").value.trim();
    if (Date.now() > flow.exp) { setFlash("error", "OTP expire ho gaya. 'Resend OTP' dabayein."); return render(); }
    if (flow.tries >= AUTH_CONFIG.maxOtpTries) { setFlash("error", "Bahut galat koshish. Naya OTP mangwayein."); return render(); }
    if (code !== flow.otp) {
      flow.tries++;
      setFlash("error", `Galat OTP. ${AUTH_CONFIG.maxOtpTries - flow.tries} koshish baaki.`);
      return render();
    }
    flow.verified = true; flow.otp = null;
    flash = null;
    go("password");
  }

  async function onPasswordSubmit(e) {
    e.preventDefault();
    if (!flow.verified) { go("login"); return; }
    const p1 = $("auth-new").value, p2 = $("auth-confirm").value;
    if (p1.length < AUTH_CONFIG.minPasswordLen) { setFlash("error", `Password kam se kam ${AUTH_CONFIG.minPasswordLen} akshar ka ho.`); return render(); }
    if (p1 !== p2) { setFlash("error", "Dono password match nahi karte."); return render(); }

    let optEmail = "";
    if (flow.mode === "signup" && $("auth-email-opt")) {
      optEmail = normEmail($("auth-email-opt").value);
      flow.email = optEmail;
      if (optEmail && !validEmail(optEmail)) { setFlash("error", "Sahi email address daalein ya khali chhod dein."); return render(); }
      if (optEmail && findUserByEmail(flow.role, optEmail)) { setFlash("error", "Is email se account pehle se bana hai."); return render(); }
    }

    const salt = randomHex(16);
    const hash = await hashPw(p1, salt);
    const users = getUsers();

    if (flow.mode === "signup") {
      const user = {
        id: "u-" + Date.now(), role: flow.role, phone: flow.phone, email: optEmail,
        name: flow.name || storeNameForPhone(flow.phone) || "Customer",
        salt, hash, createdAt: new Date().toISOString()
      };
      users.push(user); saveUsers(users);
      saveSession(user);
      enterApp(user);
      toast("Account ban gaya 🎉", "success");
    } else {
      const u = users.find(x => x.role === flow.role && x.phone === flow.phone);
      if (!u) { setFlash("error", "Account nahi mila."); return go("login"); }
      u.salt = salt; u.hash = hash; saveUsers(users);
      clearFails(flow.role + ":" + flow.phone);
      const phone = flow.phone;
      flow = { phone };
      setFlash("success", "Password badal gaya ✅ Ab naye password se login karein.");
      go("login");
    }
  }

  /* ---------------- ENTER / LEAVE APP ---------------- */
  function enterApp(user) {
    currentUser = user;
    document.body.classList.remove("auth-login", "auth-salesman", "auth-customer");
    flash = null; flow = null;
    if (user.role === "salesman") {
      document.body.classList.add("auth-salesman");
      addHeaderControls(user);
      if (typeof renderAll === "function") renderAll();
    } else {
      document.body.classList.add("auth-customer");
      renderPortal();
    }
    window.scrollTo(0, 0);
  }

  function logout() {
    clearSession();
    currentUser = null;
    document.body.classList.remove("auth-salesman", "auth-customer");
    document.body.classList.add("auth-login");
    const chip = $("auth-chip"), lo = $("btn-logout"), st = $("btn-add-staff"), ml = $("btn-add-email");
    [chip, lo, st, ml].forEach(el => el && el.remove());
    view = "login"; flow = null; flash = null;
    render();
  }

  function addHeaderControls(user) {
    const box = document.querySelector(".header-actions");
    if (!box || $("btn-logout")) return;
    const chip = document.createElement("span");
    chip.id = "auth-chip"; chip.className = "auth-chip";
    chip.textContent = "👤 " + user.name;
    const staff = document.createElement("button");
    staff.id = "btn-add-staff"; staff.className = "btn btn-outline";
    staff.textContent = "+ Salesman";
    staff.title = "Naya salesman account jodo";
    staff.onclick = () => {
      ["staff-name", "staff-phone", "staff-email", "staff-pass"].forEach(i => $(i).value = "");
      $("staff-msg").innerHTML = "";
      $("auth-staff-modal").classList.add("open");
    };
    const mail = document.createElement("button");
    mail.id = "btn-add-email"; mail.className = "btn btn-outline";
    mail.textContent = "📧 Email";
    mail.title = "Email se login jodo / badlo";
    mail.onclick = openEmailModal;
    const out = document.createElement("button");
    out.id = "btn-logout"; out.className = "btn btn-outline";
    out.textContent = "Logout";
    out.onclick = logout;
    box.append(chip, staff, mail, out);
  }

  function openEmailModal() {
    $("em-email").value = (currentUser && currentUser.email) || "";
    $("em-pass").value = "";
    $("em-msg").innerHTML = "";
    $("auth-email-modal").classList.add("open");
  }

  async function saveEmail() {
    const email = normEmail($("em-email").value);
    const pw = $("em-pass").value;
    const msg = (t, ok) => $("em-msg").innerHTML = `<div class="auth-msg ${ok ? "success" : "error"}">${esc(t)}</div>`;
    if (!validEmail(email)) return msg("Sahi email address daalein.");
    if (!pw) return msg("Apna abhi ka password daalein.");
    const users = getUsers();
    const u = users.find(x => x.role === currentUser.role && x.phone === currentUser.phone);
    if (!u || (await hashPw(pw, u.salt)) !== u.hash) return msg("Password galat hai.");
    if (users.some(x => x.role === u.role && x.email === email && x.phone !== u.phone)) return msg("Ye email kisi aur account se juda hai.");
    u.email = email; saveUsers(users);
    currentUser = u;
    $("auth-email-modal").classList.remove("open");
    toast("Email jud gaya ✅ Ab email se bhi login kar sakte hain", "success");
    if (currentUser.role === "customer") renderPortal();
  }

  async function createStaff() {
    const name = $("staff-name").value.trim();
    const phone = normPhone($("staff-phone").value);
    const pw = $("staff-pass").value;
    const email = normEmail($("staff-email").value);
    const msg = t => $("staff-msg").innerHTML = `<div class="auth-msg error">${esc(t)}</div>`;
    if (!name) return msg("Naam daalein.");
    if (!validPhone(phone)) return msg("Sahi 10 digit mobile number daalein.");
    if (pw.length < AUTH_CONFIG.minPasswordLen) return msg(`Password kam se kam ${AUTH_CONFIG.minPasswordLen} akshar ka ho.`);
    if (findUser("salesman", phone)) return msg("Is number ka salesman account pehle se hai.");
    if (email && !validEmail(email)) return msg("Sahi email address daalein ya khali chhod dein.");
    if (email && findUserByEmail("salesman", email)) return msg("Is email ka salesman account pehle se hai.");
    const salt = randomHex(16);
    const users = getUsers();
    users.push({ id: "u-" + Date.now(), role: "salesman", phone, email, name, salt, hash: await hashPw(pw, salt), createdAt: new Date().toISOString() });
    saveUsers(users);
    $("auth-staff-modal").classList.remove("open");
    toast(`${name} salesman ban gaye`, "success");
  }

  /* ---------------- CUSTOMER PORTAL (only Customer Udhari, read-only) ---------------- */
  function myEntries() {
    const list = typeof udhariEntries !== "undefined" ? udhariEntries : [];
    return list.filter(u => normPhone(u.phone) === currentUser.phone);
  }

  function renderPortal() {
    const el = $("customer-portal");
    if (!el || !currentUser) return;
    const all = myEntries();
    let total = 0, paid = 0, due = 0;
    all.forEach(e => { total += Number(e.amount) || 0; paid += khataPaid(e); due += khataBalance(e); });

    const shown = all
      .filter(e => portalFilter === "all" ? true : portalFilter === "paid" ? khataBalance(e) <= 0 : khataBalance(e) > 0)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const storeName = (typeof settings !== "undefined" && settings.storeName) || "My General Store";
    const storePhone = typeof settings !== "undefined" ? settings.storePhone : "";

    const bills = shown.map(e => {
      const bal = khataBalance(e);
      const pays = (e.payments || []).map(p =>
        `<div><span>${esc(khataDate(p.date))}${p.mode ? " · " + esc(p.mode) : ""}</span><b>${esc(khataMoney(p.amount))}</b></div>`).join("");
      return `
        <div class="cp-bill">
          <div class="cp-bill-top">
            <div>
              <div class="cp-bill-title">${e.invoiceNumber ? "Bill #" + esc(e.invoiceNumber) + " · " : ""}${esc(khataDate(e.date))}</div>
              ${e.note ? `<div class="cp-bill-note">${esc(e.note)}</div>` : ""}
            </div>
            <span class="cp-status ${bal > 0 ? "due" : "clear"}">${bal > 0 ? "Baaki hai" : "Clear ✓"}</span>
          </div>
          <div class="cp-amounts">
            <div>Udhari<b>${esc(khataMoney(e.amount))}</b></div>
            <div>Wapas diya<b style="color:#15803d;">${esc(khataMoney(khataPaid(e)))}</b></div>
            <div>Baaki<b style="color:${bal > 0 ? "#b45309" : "#15803d"};">${esc(khataMoney(bal))}</b></div>
          </div>
          ${pays ? `<div class="cp-pay-list"><b>Payments:</b>${pays}</div>` : ""}
        </div>`;
    }).join("");

    el.innerHTML = `
      <div class="cp-header"><div class="cp-header-in">
        <div><div class="cp-store">🏪 ${esc(storeName)}</div><div class="cp-user">${esc(currentUser.name)} · +91 ${esc(currentUser.phone)}${currentUser.email ? " · " + esc(currentUser.email) : ""}</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="btn btn-outline" id="cp-email">${currentUser.email ? "📧 Email badlo" : "📧 Email jodo"}</button>
          <button class="btn btn-outline" id="cp-logout">Logout</button>
        </div>
      </div></div>
      <div class="cp-main">
        <div class="cp-hello">📒 Meri Udhari / Khata</div>
        <div class="cp-cards">
          <div class="cp-card"><small>Kul Baaki (Aapko dena hai)</small><b style="color:#b45309;">${esc(khataMoney(due))}</b></div>
          <div class="cp-card"><small>Kul Udhari</small><b>${esc(khataMoney(total))}</b></div>
          <div class="cp-card"><small>Ab tak wapas diya</small><b style="color:#15803d;">${esc(khataMoney(paid))}</b></div>
        </div>
        <div class="cp-pills">
          <button data-f="pending" class="${portalFilter === "pending" ? "active" : ""}">Baaki hai</button>
          <button data-f="paid" class="${portalFilter === "paid" ? "active" : ""}">Clear</button>
          <button data-f="all" class="${portalFilter === "all" ? "active" : ""}">Sab</button>
        </div>
        ${bills || `<div class="cp-empty"><h3>${all.length ? "Is filter me koi bill nahi" : "Aapki koi udhari nahi hai 🎉"}</h3></div>`}
        <div class="cp-foot">${storePhone ? `Kisi bhi sawal ke liye dukaan se sampark karein: <a href="tel:+91${esc(storePhone)}">+91 ${esc(storePhone)}</a>` : "Kisi bhi sawal ke liye dukaan se sampark karein."}</div>
      </div>`;
    $("cp-logout").onclick = logout;
    $("cp-email").onclick = openEmailModal;
    el.querySelectorAll(".cp-pills button").forEach(b => b.onclick = () => { portalFilter = b.dataset.f; renderPortal(); });
  }

  /* ---------------- INIT ---------------- */
  function init() {
    buildShell();
    const user = getSessionUser();
    if (user) {
      enterApp(user);
    } else {
      document.body.classList.add("auth-login");
      if (!getUsers().some(u => u.role === "salesman")) role = "salesman"; // first-time setup
      render();
    }
    // Keep customer page fresh if the salesman updates data in another tab
    window.addEventListener("storage", ev => {
      if (!currentUser || currentUser.role !== "customer") return;
      if (ev.key === STORAGE_KEYS.UDHARI) {
        try { udhariEntries = JSON.parse(ev.newValue || "[]"); } catch (e) { }
        renderPortal();
      }
      if (ev.key === AUTH_KEYS.USERS && !getSessionUser()) logout();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.FRC_SUPABASE_CONFIG || {};
const hasConfig = config.supabaseUrl
  && config.supabaseAnonKey
  && !String(config.supabaseUrl).startsWith("PASTE_")
  && !String(config.supabaseAnonKey).startsWith("PASTE_");

let supabase = null;
let currentUser = null;
let authReadyResolve;
const authReady = new Promise((resolve) => {
  authReadyResolve = resolve;
});

let isPasswordRecovery = false;
let resolvePasswordRecovery;
const passwordRecoveryDetected = new Promise((resolve) => {
  resolvePasswordRecovery = resolve;
});

function clearLegacyAuthStorage() {
  return;
}

// Capture the auth callback params from the URL at load time, BEFORE the Supabase
// client is created. In the implicit flow, recovery / signup-confirmation links
// arrive as `#access_token=...&type=recovery|signup`, and expired or already-used
// links arrive as `#error=...&error_description=...`. `detectSessionInUrl` wipes
// the hash during client init (via history.replaceState), so reading it later
// would always come back empty — that is why the reset view used to be skipped
// and the underlying page opened directly.
const AUTH_CALLBACK = (function readAuthCallback() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return {
    type: hashParams.get("type") || searchParams.get("type") || "",
    hasCode: searchParams.has("code"),
    errorDescription:
      hashParams.get("error_description") || searchParams.get("error_description") || ""
  };
})();

function cleanAuthCallbackUrl() {
  if (window.location.hash || window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function addStyles() {
  if (document.getElementById("supabase-auth-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "supabase-auth-style";
  style.textContent = `
    .auth-gate {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 24px;
      overflow-y: auto;
      background:
        radial-gradient(circle at 18% 18%, rgba(237, 28, 36, 0.22), transparent 30%),
        radial-gradient(circle at 82% 10%, rgba(251, 191, 36, 0.22), transparent 28%),
        radial-gradient(circle at 65% 92%, rgba(0, 102, 179, 0.28), transparent 34%),
        linear-gradient(135deg, #0d1524 0%, #143f66 55%, #0c2238 100%);
      color: #111827;
    }

    .auth-card {
      position: relative;
      width: min(100%, 460px);
      padding: 38px 34px 30px;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 30px 70px rgba(8, 22, 40, 0.45);
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Roboto, sans-serif;
    }

    .auth-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(90deg, #ED1C24 0%, #ED1C24 50%, #0066B3 50%, #0066B3 100%);
    }

    .auth-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      color: #1a1a2e;
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    .auth-brand::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: linear-gradient(135deg, #ED1C24, #0066B3);
      box-shadow: 0 2px 6px rgba(237, 28, 36, 0.35);
    }

    .auth-brand span {
      color: #ED1C24;
    }

    .auth-card h1 {
      margin: 0 0 10px;
      color: #1a1a2e;
      font-size: 1.7rem;
      line-height: 1.2;
      letter-spacing: -0.3px;
    }

    .auth-copy,
    .auth-hint,
    .auth-privacy,
    .auth-status {
      color: #6b7280;
      font-size: 0.93rem;
      line-height: 1.55;
    }

    .auth-form {
      display: grid;
      gap: 8px;
      margin-top: 22px;
    }

    .auth-form label {
      color: #374151;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .auth-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
    }

    .auth-stack {
      display: grid;
      gap: 6px;
    }

    .auth-stack label {
      margin-top: 8px;
    }

    .auth-stack label:first-child {
      margin-top: 0;
    }

    .auth-row input,
    .auth-stack input {
      min-width: 0;
      min-height: 48px;
      padding: 12px 14px;
      border: 1.5px solid #d7dbe2;
      border-radius: 10px;
      background: #f9fafb;
      color: #111827;
      font: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }

    .auth-row input::placeholder,
    .auth-stack input::placeholder {
      color: #9ca3af;
    }

    .auth-row input:focus,
    .auth-stack input:focus {
      outline: none;
      background: #ffffff;
      border-color: #0066B3;
      box-shadow: 0 0 0 4px rgba(0, 102, 179, 0.14);
    }

    .auth-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 8px;
    }

    .auth-row button,
    .auth-actions button,
    .auth-logout {
      min-height: 48px;
      padding: 11px 16px;
      border: 1.5px solid transparent;
      border-radius: 10px;
      background: #0066B3;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      transition: transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    .auth-actions button[data-auth-login] {
      box-shadow: 0 10px 22px rgba(0, 102, 179, 0.28);
    }

    .auth-row button:hover:not(:disabled),
    .auth-actions button[data-auth-login]:hover:not(:disabled) {
      background: #0a5aa0;
    }

    .auth-actions button:active:not(:disabled) {
      transform: translateY(1px);
    }

    .auth-actions button[data-auth-register] {
      background: #ffffff;
      color: #ED1C24;
      border-color: #ED1C24;
    }

    .auth-actions button[data-auth-register]:hover:not(:disabled) {
      background: #ED1C24;
      color: #ffffff;
    }

    .auth-actions button[data-auth-reset] {
      grid-column: 1 / -1;
      min-height: 42px;
      background: transparent;
      color: #4b5563;
      font-weight: 700;
    }

    .auth-actions button[data-auth-reset]:hover:not(:disabled) {
      color: #1a1a2e;
      background: #f3f4f6;
    }

    .auth-actions button[data-auth-save-password] {
      grid-column: 1 / -1;
    }

    .auth-row button:disabled,
    .auth-actions button:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    .auth-status {
      min-height: 22px;
      margin-top: 14px;
      font-weight: 600;
    }

    .auth-status.is-error {
      color: #b91c1c;
    }

    .auth-status.is-success {
      color: #047857;
    }

    .auth-privacy {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .auth-user-bar {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 12px 28px rgba(15, 39, 65, 0.14);
      color: #374151;
      font: 0.88rem -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Roboto, sans-serif;
    }

    .auth-logout {
      min-height: 34px;
      padding: 7px 10px;
      background: #ED1C24;
      font-size: 0.84rem;
    }

    @media (max-width: 560px) {
      .auth-card {
        padding: 24px;
      }

      .auth-row {
        grid-template-columns: 1fr;
      }

      .auth-actions {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function setStatus(message, type) {
  const status = document.querySelector("[data-auth-status]");
  if (!status) {
    return;
  }

  status.textContent = message || "";
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-success", type === "success");
}

function createGate() {
  const existing = document.querySelector(".auth-gate");
  if (existing) {
    return existing;
  }

  const gate = document.createElement("div");
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="auth-brand">FRC <span>Wiki</span> CN</div>
      <h1 id="auth-title">邮箱登录 / 注册</h1>
      <p class="auth-copy">使用邮箱和密码登录。第一次使用请先注册；之后再次访问时，如果浏览器保留登录状态，会自动进入网站。</p>

      <form class="auth-form" data-auth-email-form>
        <div class="auth-stack">
          <label for="auth-email">邮箱</label>
          <input id="auth-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" required>
          <label for="auth-password">密码</label>
          <input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="8" placeholder="至少 8 位" required>
        </div>
        <div class="auth-actions">
          <button type="submit" data-auth-login>登录</button>
          <button type="button" data-auth-register>注册</button>
          <button type="button" data-auth-reset>设置 / 重置密码</button>
        </div>
        <p class="auth-hint">如果 Supabase 开启了邮箱确认，注册后需要先点击邮件里的确认链接，然后再用密码登录。</p>
      </form>

      <p class="auth-status" data-auth-status></p>
      <p class="auth-privacy">我们仅将邮箱用于登录验证、社区身份确认和站内访问统计。不要在公开页面展示邮箱。</p>
    </div>
  `;

  document.body.appendChild(gate);
  return gate;
}

function requireAuthView() {
  addStyles();
  createGate();
  bindForms();
  document.documentElement.classList.remove("auth-loading");
  document.documentElement.classList.add("auth-required");
}

function requirePasswordResetView(user) {
  addStyles();
  const gate = createGate();
  const form = gate.querySelector("[data-auth-email-form]");
  form.dataset.bound = "false";
  form.innerHTML = `
    <div class="auth-stack">
      <label for="auth-password">新密码</label>
      <input id="auth-password" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="至少 8 位" required>
    </div>
    <div class="auth-actions">
      <button type="submit" data-auth-save-password>保存新密码</button>
    </div>
    <p class="auth-hint">保存后会直接进入网站。之后请使用邮箱和新密码登录。</p>
  `;
  bindPasswordResetForm(user);
  document.documentElement.classList.remove("auth-loading");
  document.documentElement.classList.add("auth-required");
}

function allowSite(user) {
  addStyles();
  currentUser = user;
  document.documentElement.classList.remove("auth-loading", "auth-required");
  document.querySelector(".auth-gate")?.remove();
  renderUserBar(user);
  renderNavLogout(user);
  window.dispatchEvent(new CustomEvent("frc-auth-ready", { detail: { user } }));
  authReadyResolve(user);
}

const HOME_PAGE = "index.html";

function isHomePage() {
  const page = window.location.pathname.split("/").pop();
  return !page || page === HOME_PAGE;
}

// A fresh sign-in (or a just-saved new password) always starts on the home page,
// so switching accounts never leaves you on whatever sub-page the gate happened
// to appear on. A page load that already had a session stays put (via allowSite)
// so in-site navigation keeps working.
function enterSiteAfterLogin(user) {
  if (isHomePage()) {
    allowSite(user);
  } else {
    window.location.assign(HOME_PAGE);
  }
}

function renderUserBar(user) {
  let bar = document.querySelector(".auth-user-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "auth-user-bar";
    bar.innerHTML = `
      <span data-auth-user-email></span>
      <button class="auth-logout" type="button">退出</button>
    `;
    document.body.appendChild(bar);
    bar.querySelector(".auth-logout").addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.assign(HOME_PAGE);
    });
  }

  bar.querySelector("[data-auth-user-email]").textContent = user.email || "已登录";
}

function renderNavLogout(user) {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks || navLinks.querySelector("[data-auth-nav-logout]")) {
    return;
  }

  const item = document.createElement("li");
  item.innerHTML = `
    <button class="language-toggle" type="button" data-auth-nav-logout title="${user.email || "已登录"}">退出</button>
  `;
  navLinks.appendChild(item);
  item.querySelector("[data-auth-nav-logout]").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.assign(HOME_PAGE);
  });
}

function showConfigError() {
  addStyles();
  const gate = createGate();
  gate.querySelector("[data-auth-email-form]").hidden = true;
  setStatus("Supabase 还没有配置。请先把 supabase-config.js 里的 supabaseUrl 和 supabaseAnonKey 替换成 Supabase 项目里的值。", "error");
  document.documentElement.classList.remove("auth-loading");
  document.documentElement.classList.add("auth-required");
}

function setLoading(button, isLoading, loadingText, idleText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : idleText;
}

function setFormLoading(isLoading, activeButton, loadingText) {
  document.querySelectorAll("[data-auth-login], [data-auth-register], [data-auth-reset], [data-auth-save-password]").forEach((button) => {
    button.disabled = isLoading;
  });

  if (activeButton) {
    activeButton.textContent = isLoading ? loadingText : activeButton.dataset.idleText;
  }
}

async function upsertProfile(user) {
  if (!user) {
    return;
  }

  const { error } = await supabase.rpc("touch_profile_login");

  if (error) {
    console.warn("Profile login timestamp update failed:", error.message);
  }
}

function bindForms() {
  const emailForm = document.querySelector("[data-auth-email-form]");
  const loginButton = document.querySelector("[data-auth-login]");
  const registerButton = document.querySelector("[data-auth-register]");
  const resetButton = document.querySelector("[data-auth-reset]");

  if (!emailForm || emailForm.dataset.bound === "true") {
    return;
  }
  emailForm.dataset.bound = "true";
  loginButton.dataset.idleText = loginButton.textContent;
  registerButton.dataset.idleText = registerButton.textContent;
  resetButton.dataset.idleText = resetButton.textContent;

  function getCredentials() {
    const formData = new FormData(emailForm);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") || "");

    if (!isValidEmail(email)) {
      throw new Error("请输入有效邮箱地址。");
    }

    if (password.length < 8) {
      throw new Error("密码至少需要 8 位。");
    }

    return { email, password };
  }

  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const { email, password } = getCredentials();
      setFormLoading(true, loginButton, "登录中...");
      setStatus("正在登录...", "");

      const {
        data: { user },
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      await upsertProfile(user);
      enterSiteAfterLogin(user);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "登录失败，请检查邮箱和密码。", "error");
    } finally {
      setFormLoading(false, loginButton);
    }
  });

  registerButton.addEventListener("click", async () => {
    try {
      const { email, password } = getCredentials();
      setFormLoading(true, registerButton, "注册中...");
      setStatus("正在注册...", "");

      const {
        data: { user },
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.href
        }
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();

      if (user && Array.isArray(user.identities) && user.identities.length === 0) {
        setStatus("邮箱已注册，请直接登录；如果忘记密码，请点“设置 / 重置密码”。", "error");
        return;
      }

      setStatus("注册成功。请打开邮箱确认账号，然后回到这里用邮箱和密码登录。", "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "注册失败，请稍后再试。", "error");
    } finally {
      setFormLoading(false, registerButton);
    }
  });

  resetButton.addEventListener("click", async () => {
    try {
      const formData = new FormData(emailForm);
      const email = normalizeEmail(formData.get("email"));

      if (!isValidEmail(email)) {
        throw new Error("请输入有效邮箱地址。");
      }

      setFormLoading(true, resetButton, "发送中...");
      setStatus("正在发送设置密码邮件...", "");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href.split("#")[0].split("?")[0]
      });

      if (error) {
        throw error;
      }

      setStatus("设置密码邮件已发送。请打开邮件链接，然后设置新密码。", "success");
    } catch (error) {
      console.error(error);
      setStatus(error.message || "设置密码邮件发送失败。", "error");
    } finally {
      setFormLoading(false, resetButton);
    }
  });
}

function bindPasswordResetForm(user) {
  const form = document.querySelector("[data-auth-email-form]");
  const saveButton = document.querySelector("[data-auth-save-password]");

  if (!form || form.dataset.bound === "true") {
    return;
  }
  form.dataset.bound = "true";
  saveButton.dataset.idleText = saveButton.textContent;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = String(new FormData(form).get("password") || "");
    if (password.length < 8) {
      setStatus("密码至少需要 8 位。", "error");
      return;
    }

    try {
      setFormLoading(true, saveButton, "保存中...");
      setStatus("正在保存新密码...", "");

      const {
        data: { user: updatedUser },
        error
      } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      await upsertProfile(updatedUser || user);
      enterSiteAfterLogin(updatedUser || user);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "保存密码失败，请重新打开设置密码邮件。", "error");
    } finally {
      setFormLoading(false, saveButton);
    }
  });
}

async function init() {
  if (!hasConfig) {
    showConfigError();
    return;
  }

  clearLegacyAuthStorage();

  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Keep recovery / confirmation links as hash tokens (`type=recovery`) that
      // we can detect reliably and that survive opening the email on another
      // device — PKCE would need the code_verifier stored on the same browser.
      flowType: "implicit"
    }
  });
  window.FRC_SUPABASE = supabase;

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      isPasswordRecovery = true;
      resolvePasswordRecovery(true);
    }
  });

  // An expired or already-used recovery / confirmation link redirects back with
  // an error instead of a session. Surface it on the login gate rather than
  // silently dropping the user onto the site.
  if (AUTH_CALLBACK.errorDescription) {
    cleanAuthCallbackUrl();
    requireAuthView();
    setStatus(`${AUTH_CALLBACK.errorDescription}。链接可能已失效，请重新发送邮件后再试。`, "error");
    return;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.warn(error);
  }

  // Recovery detection uses the hash captured at load (reliable for the implicit
  // flow); the PASSWORD_RECOVERY event is a secondary signal, and for a bare
  // `?code=` callback we give that event a brief window to fire.
  let isRecovery = AUTH_CALLBACK.type === "recovery" || isPasswordRecovery;
  if (!isRecovery && AUTH_CALLBACK.hasCode) {
    isRecovery = await Promise.race([
      passwordRecoveryDetected,
      new Promise((resolve) => setTimeout(() => resolve(false), 1200))
    ]);
  }

  if (user && isRecovery) {
    requirePasswordResetView(user);
    return;
  }

  if (AUTH_CALLBACK.type === "signup") {
    await supabase.auth.signOut();
    cleanAuthCallbackUrl();
    requireAuthView();
    setStatus("邮箱已确认。请使用邮箱和密码登录。", "success");
    return;
  }

  if (user) {
    await upsertProfile(user);
    allowSite(user);
    return;
  }

  requireAuthView();
}

window.FRC_AUTH = {
  ready: authReady,
  getUser: () => currentUser,
  getClient: () => supabase,
  logout: async () => {
    await supabase.auth.signOut();
    window.location.assign(HOME_PAGE);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function waitForAuth() {
  if (window.FRC_AUTH?.ready) {
    return window.FRC_AUTH.ready;
  }

  return new Promise((resolve) => {
    window.addEventListener("frc-auth-ready", (event) => resolve(event.detail.user), { once: true });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("zh-CN");
}

function formatDuration(ms) {
  if (!ms) {
    return "0s";
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function setStatus(message, isError) {
  const status = document.querySelector("[data-admin-status]");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.classList.toggle("is-error", Boolean(isError));
}

function renderUsers(users) {
  const body = document.querySelector("[data-admin-users]");
  if (!users.length) {
    body.innerHTML = `<tr><td colspan="5">暂无用户记录。</td></tr>`;
    return;
  }
  body.innerHTML = users.map((user) => `
    <tr>
      <td>${escapeHtml(user.email) || "-"}</td>
      <td><code>${escapeHtml(user.id) || "-"}</code></td>
      <td>${user.is_admin ? "管理员" : "用户"}</td>
      <td>${escapeHtml(formatDate(user.created_at))}</td>
      <td>${escapeHtml(formatDate(user.last_login_at))}</td>
    </tr>
  `).join("");
}

function renderStats(stats) {
  const body = document.querySelector("[data-admin-stats]");
  if (!stats.length) {
    body.innerHTML = `<tr><td colspan="4">暂无页面访问记录。</td></tr>`;
    return;
  }
  body.innerHTML = stats.map((item) => `
    <tr>
      <td>${escapeHtml(item.path) || "-"}</td>
      <td>${item.views || 0}</td>
      <td>${escapeHtml(formatDuration(item.avgDurationMs))}</td>
      <td>${escapeHtml(formatDuration(item.totalDurationMs))}</td>
    </tr>
  `).join("");
}

function showAccessDenied(user) {
  const main = document.querySelector(".admin-main");
  setStatus(`当前账号（${user.email || user.id}）不是管理员，无法查看后台数据。`, true);
  main?.querySelectorAll(".admin-panel").forEach((panel) => panel.remove());

  const notice = document.createElement("section");
  notice.className = "admin-panel";
  notice.innerHTML = `
    <h2>无权限 No Access</h2>
    <p>此页面只对管理员开放。如果你需要访问权限，请在 Supabase 的 <code>profiles</code>
    表中把当前账号的 <code>is_admin</code> 设为 <code>true</code>，然后刷新本页。</p>
  `;
  main?.appendChild(notice);
}

async function loadAdmin() {
  const user = await waitForAuth();
  const supabase = window.FRC_AUTH?.getClient?.();

  if (!user || !supabase) {
    setStatus("尚未登录，无法加载后台数据。", true);
    return;
  }

  // Confirm the signed-in user is actually an admin before loading data.
  // RLS already protects the tables, but this gives a clear, honest message
  // instead of silently showing an empty admin view to non-admins.
  const { data: self, error: selfError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (selfError) {
    console.error(selfError);
    setStatus(selfError.message || "无法确认管理员身份。", true);
    return;
  }

  if (!self?.is_admin) {
    showAccessDenied(user);
    return;
  }

  try {
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, is_admin, created_at, last_login_at")
      .order("last_login_at", { ascending: false, nullsFirst: false })
      .limit(500);

    if (usersError) {
      throw usersError;
    }

    const { data: events, error: eventsError } = await supabase
      .from("page_events")
      .select("path, duration_ms")
      .limit(10000);

    if (eventsError) {
      throw eventsError;
    }

    const byPath = new Map();
    for (const event of events || []) {
      const current = byPath.get(event.path) || {
        path: event.path,
        views: 0,
        totalDurationMs: 0
      };
      current.views += 1;
      current.totalDurationMs += event.duration_ms || 0;
      byPath.set(event.path, current);
    }

    const stats = Array.from(byPath.values())
      .map((item) => ({
        ...item,
        avgDurationMs: item.views ? item.totalDurationMs / item.views : 0
      }))
      .sort((a, b) => b.views - a.views);

    renderUsers(users || []);
    renderStats(stats);
    setStatus(`已登录管理员：${user.email || user.id} · 共 ${(users || []).length} 位用户`, false);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "无法加载后台数据。请确认当前账号已在 profiles 表设为 is_admin = true。", true);
  }
}

loadAdmin();

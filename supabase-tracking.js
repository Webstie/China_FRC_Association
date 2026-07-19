const config = window.FRC_SUPABASE_CONFIG || {};

function makeEventId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function waitForAuth() {
  if (window.FRC_AUTH?.ready) {
    return window.FRC_AUTH.ready;
  }

  return new Promise((resolve) => {
    window.addEventListener("frc-auth-ready", (event) => resolve(event.detail.user), { once: true });
  });
}

async function getAccessToken() {
  const supabase = window.FRC_SUPABASE;
  if (!supabase) {
    return null;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function initTracking() {
  if (!config.supabaseUrl || String(config.supabaseUrl).startsWith("PASTE_")) {
    return;
  }

  const user = await waitForAuth();
  if (!user) {
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return;
  }

  const enteredAt = Date.now();
  const event = {
    id: makeEventId(),
    site_id: config.siteId || "frc-wiki-cn",
    user_id: user.id,
    path: window.location.pathname.split("/").pop() || "index.html",
    full_path: window.location.pathname + window.location.search + window.location.hash,
    title: document.title,
    referrer: document.referrer || "",
    entered_at: new Date(enteredAt).toISOString(),
    duration_ms: 0
  };

  let flushed = false;

  function flush(reason) {
    if (flushed) {
      return;
    }

    flushed = true;
    const leftAt = Date.now();
    const payload = {
      ...event,
      left_at: new Date(leftAt).toISOString(),
      duration_ms: Math.max(0, leftAt - enteredAt),
      reason
    };

    fetch(`${String(config.supabaseUrl).replace(/\/$/, "")}/rest/v1/page_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": config.supabaseAnonKey,
        "Authorization": `Bearer ${accessToken}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush("hidden");
    }
  });

  window.addEventListener("pagehide", () => flush("pagehide"));
}

initTracking();

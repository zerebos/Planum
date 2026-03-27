/**
 * Planum Admin Web Panel
 *
 * Usage:  bun run web
 * URL:    http://127.0.0.1:9090   (override with WEB_PORT env var)
 *
 * This server is intentionally bound to localhost only and carries no
 * authentication — it is meant for local administrator use.
 */
import {Hono} from "hono";
import {count, sql} from "drizzle-orm";
import {
    db,
    getAllCommandStats,
    getGuildConfig,
    getGuildLeaderboard,
    getGuildRewards,
    addGuildReward,
    removeGuildReward,
    getTotalCommandCount,
    upsertGuildConfig,
} from "../db.ts";
import * as schema from "../schema.ts";

const PORT = Number(process.env.WEB_PORT ?? 9090);
const app  = new Hono();

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: unknown): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeJsonArray(json: string): string[] {
    try {
        const arr = JSON.parse(json);
        return Array.isArray(arr) ? arr.map(String) : [];
    } catch { return []; }
}

function layout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} — Planum Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body   { font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; }
    nav    { background: #161b22; border-bottom: 1px solid #30363d; padding: 0 24px;
             display: flex; align-items: center; gap: 20px; height: 56px; }
    nav .brand { font-weight: 700; font-size: 1.1rem; color: #f0f6fc; margin-right: auto; }
    nav a  { color: #58a6ff; text-decoration: none; font-size: .9rem; }
    nav a:hover { text-decoration: underline; }
    main   { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
    h1     { color: #f0f6fc; margin-bottom: 20px; }
    h2     { color: #e6edf3; margin-bottom: 14px; font-size: 1.05rem; }
    .card  { background: #161b22; border: 1px solid #30363d; border-radius: 8px;
             padding: 20px; margin-bottom: 20px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .stat  { background: #21262d; border: 1px solid #30363d; border-radius: 8px;
             padding: 16px; text-align: center; }
    .stat-value { font-size: 1.8rem; font-weight: 700; color: #58a6ff; }
    .stat-label { font-size: .8rem; color: #8b949e; margin-top: 4px; }
    table  { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #21262d; }
    th     { color: #8b949e; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
    tr:hover td { background: #1c2128; }
    a      { color: #58a6ff; }
    .btn   { display: inline-block; padding: 6px 14px; background: #238636; color: #fff;
             border: 1px solid #2ea043; border-radius: 6px; cursor: pointer;
             text-decoration: none; font-size: .85rem; }
    .btn:hover { background: #2ea043; }
    .btn-danger { background: #b62324; border-color: #da3633; }
    .btn-danger:hover { background: #da3633; }
    .form-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 16px; }
    .fg   { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: .8rem; color: #8b949e; }
    input, select { background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
                    color: #c9d1d9; padding: 7px 10px; font-size: .85rem; }
    input:focus, select:focus { outline: none; border-color: #58a6ff; }
    .crumb { color: #8b949e; font-size: .85rem; margin-bottom: 16px; }
    .crumb a { color: #58a6ff; }
    .empty { color: #8b949e; font-style: italic; }
    code   { background: #21262d; padding: 1px 5px; border-radius: 4px; font-size: .85em; }
  </style>
</head>
<body>
  <nav>
    <span class="brand">🌟 Planum Admin</span>
    <a href="/">Dashboard</a>
    <a href="/guilds">Guilds</a>
    <a href="/stats">Stats</a>
  </nav>
  <main>${body}</main>
</body>
</html>`;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get("/", (c) => {
    const guildCount   = db.select({g: schema.userLevels.guildId}).from(schema.userLevels).groupBy(schema.userLevels.guildId).all().length;
    const userCount    = db.select({n: count()}).from(schema.userLevels).get()?.n ?? 0;
    const totalCmds    = getTotalCommandCount();
    const rewardCount  = db.select({n: count()}).from(schema.guildRewards).get()?.n ?? 0;

    return c.html(layout("Dashboard", `
    <h1>Dashboard</h1>
    <div class="stats">
      <div class="stat"><div class="stat-value">${esc(guildCount)}</div><div class="stat-label">Guilds</div></div>
      <div class="stat"><div class="stat-value">${esc(userCount.toLocaleString())}</div><div class="stat-label">Users Tracked</div></div>
      <div class="stat"><div class="stat-value">${esc(totalCmds.toLocaleString())}</div><div class="stat-label">Commands Run</div></div>
      <div class="stat"><div class="stat-value">${esc(rewardCount)}</div><div class="stat-label">Rewards Configured</div></div>
    </div>
    <div class="card">
      <h2>Quick Links</h2>
      <p style="margin-bottom:8px"><a href="/guilds">📋 All Guilds</a></p>
      <p><a href="/stats">📊 Command Statistics</a></p>
    </div>`));
});

// ── Guild list ────────────────────────────────────────────────────────────────

app.get("/guilds", (c) => {
    const guilds = db
        .select({guildId: schema.userLevels.guildId, users: sql<number>`count(*)`})
        .from(schema.userLevels)
        .groupBy(schema.userLevels.guildId)
        .all();

    const rows = guilds.map(g => `
      <tr>
        <td><code>${esc(g.guildId)}</code></td>
        <td>${esc(g.users.toLocaleString())}</td>
        <td>
          <a href="/guilds/${esc(g.guildId)}">Overview</a> ·
          <a href="/guilds/${esc(g.guildId)}/leaderboard">Leaderboard</a> ·
          <a href="/guilds/${esc(g.guildId)}/rewards">Rewards</a> ·
          <a href="/guilds/${esc(g.guildId)}/config">Config</a>
        </td>
      </tr>`).join("");

    return c.html(layout("Guilds", `
    <h1>Guilds</h1>
    <div class="card">
      <table>
        <thead><tr><th>Guild ID</th><th>Users Tracked</th><th>Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="empty">No guilds found.</td></tr>'}</tbody>
      </table>
    </div>`));
});

// ── Guild overview ────────────────────────────────────────────────────────────

app.get("/guilds/:gid", (c) => {
    const gid      = c.req.param("gid");
    const top5     = getGuildLeaderboard(gid).slice(0, 5);
    const rewards  = getGuildRewards(gid);
    const config   = getGuildConfig(gid);

    const userRows = top5.map((u, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><code>${esc(u.userId)}</code></td>
        <td>${esc(u.level)}</td>
        <td>${esc(u.xp.toLocaleString())}</td>
      </tr>`).join("");

    const rewardRows = rewards.map(r => `
      <tr>
        <td>${esc(r.level)}</td>
        <td><code>${esc(r.roleId)}</code></td>
        <td>${r.removePrevious ? "✅" : "❌"}</td>
      </tr>`).join("");

    const cfgHtml = config
        ? `<p><strong>Level-up message:</strong> ${esc(config.levelUpMessage ?? "(default)")}</p>
           <p><strong>DM on level-up:</strong>  ${config.shouldDm ? "Yes" : "No"}</p>
           <p><strong>Ignored roles:</strong>    <code>${esc(safeJsonArray(config.ignoredRoles).join(", ") || "none")}</code></p>
           <p><strong>Ignored channels:</strong> <code>${esc(safeJsonArray(config.ignoredChannels).join(", ") || "none")}</code></p>`
        : `<p class="empty">Using defaults — <a href="/guilds/${esc(gid)}/config">configure now</a>.</p>`;

    return c.html(layout(`Guild ${gid}`, `
    <div class="crumb"><a href="/guilds">Guilds</a> / ${esc(gid)}</div>
    <h1>Guild Overview</h1>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <h2>Top 5 Users &nbsp;<a href="/guilds/${esc(gid)}/leaderboard" style="font-size:.8rem">(see all)</a></h2>
        <table>
          <thead><tr><th>Rank</th><th>User ID</th><th>Level</th><th>XP</th></tr></thead>
          <tbody>${userRows || '<tr><td colspan="4" class="empty">No data yet.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="card">
        <h2>Rewards &nbsp;<a href="/guilds/${esc(gid)}/rewards" style="font-size:.8rem">(manage)</a></h2>
        <table>
          <thead><tr><th>Level</th><th>Role ID</th><th>Remove prev</th></tr></thead>
          <tbody>${rewardRows || '<tr><td colspan="3" class="empty">No rewards set.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h2>Config &nbsp;<a href="/guilds/${esc(gid)}/config" style="font-size:.8rem">(edit)</a></h2>
      ${cfgHtml}
    </div>`));
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

app.get("/guilds/:gid/leaderboard", (c) => {
    const gid  = c.req.param("gid");
    const rows = getGuildLeaderboard(gid).map((u, i) => `
      <tr>
        <td>#${i + 1}</td>
        <td><code>${esc(u.userId)}</code></td>
        <td>${esc(u.level)}</td>
        <td>${esc(u.xp.toLocaleString())}</td>
      </tr>`).join("");

    return c.html(layout(`Leaderboard — ${gid}`, `
    <div class="crumb"><a href="/guilds">Guilds</a> / <a href="/guilds/${esc(gid)}">${esc(gid)}</a> / Leaderboard</div>
    <h1>Leaderboard</h1>
    <div class="card">
      <table>
        <thead><tr><th>Rank</th><th>User ID</th><th>Level</th><th>XP</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="empty">No data yet.</td></tr>'}</tbody>
      </table>
    </div>`));
});

// ── Rewards ───────────────────────────────────────────────────────────────────

app.get("/guilds/:gid/rewards", (c) => {
    const gid     = c.req.param("gid");
    const rewards = getGuildRewards(gid);

    const rewardRows = rewards.map(r => `
      <tr>
        <td>${esc(r.level)}</td>
        <td><code>${esc(r.roleId)}</code></td>
        <td>${r.removePrevious ? "✅ Yes" : "❌ No"}</td>
        <td>
          <form method="POST" action="/guilds/${esc(gid)}/rewards/${esc(r.roleId)}/delete" style="display:inline">
            <button type="submit" class="btn btn-danger" style="padding:3px 10px;font-size:.8rem">Remove</button>
          </form>
        </td>
      </tr>`).join("");

    return c.html(layout(`Rewards — ${gid}`, `
    <div class="crumb"><a href="/guilds">Guilds</a> / <a href="/guilds/${esc(gid)}">${esc(gid)}</a> / Rewards</div>
    <h1>Level Rewards</h1>
    <div class="card">
      <h2>Add Reward</h2>
      <form method="POST" action="/guilds/${esc(gid)}/rewards">
        <div class="form-row">
          <div class="fg"><label>Role ID</label><input name="roleId" placeholder="123456789012345678" required style="width:220px"></div>
          <div class="fg"><label>Level</label><input name="level" type="number" min="1" max="1000" required style="width:80px"></div>
          <div class="fg">
            <label>Remove Previous?</label>
            <select name="removePrevious">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <button type="submit" class="btn">Add</button>
        </div>
      </form>
    </div>
    <div class="card">
      <h2>Current Rewards</h2>
      <table>
        <thead><tr><th>Level</th><th>Role ID</th><th>Remove Prev</th><th>Action</th></tr></thead>
        <tbody>${rewardRows || '<tr><td colspan="4" class="empty">No rewards configured.</td></tr>'}</tbody>
      </table>
    </div>`));
});

app.post("/guilds/:gid/rewards", async (c) => {
    const gid  = c.req.param("gid");
    const body = await c.req.parseBody();

    const roleId         = String(body.roleId ?? "").trim();
    const level          = parseInt(String(body.level ?? "0"), 10);
    const removePrevious = String(body.removePrevious) !== "false";

    if (!roleId || isNaN(level) || level < 1) {
        return c.html(layout("Error", `<div class="card">
          <h2>Invalid input</h2>
          <p>Role ID and a valid level (≥ 1) are required.</p>
          <p><a href="/guilds/${esc(gid)}/rewards">← Back</a></p>
        </div>`), 400);
    }

    try {
        addGuildReward(gid, level, roleId, removePrevious);
    } catch (e) {
        const msg = esc(e instanceof Error ? e.message : "Unknown error");
        return c.html(layout("Error", `<div class="card">
          <h2>Could not add reward</h2>
          <p>${msg}</p>
          <p><a href="/guilds/${esc(gid)}/rewards">← Back</a></p>
        </div>`), 400);
    }
    return c.redirect(`/guilds/${esc(gid)}/rewards`);
});

app.post("/guilds/:gid/rewards/:roleId/delete", (c) => {
    const gid    = c.req.param("gid");
    const roleId = c.req.param("roleId");
    removeGuildReward(gid, roleId);
    return c.redirect(`/guilds/${esc(gid)}/rewards`);
});

// ── Config ────────────────────────────────────────────────────────────────────

app.get("/guilds/:gid/config", (c) => {
    const gid    = c.req.param("gid");
    const config = getGuildConfig(gid);

    return c.html(layout(`Config — ${gid}`, `
    <div class="crumb"><a href="/guilds">Guilds</a> / <a href="/guilds/${esc(gid)}">${esc(gid)}</a> / Config</div>
    <h1>Guild Config</h1>
    <div class="card">
      <form method="POST" action="/guilds/${esc(gid)}/config">
        <div class="fg" style="margin-bottom:14px">
          <label>Level-up message <span style="color:#8b949e">(leave blank for default)</span></label>
          <input name="levelUpMessage" value="${esc(config?.levelUpMessage ?? "")}"
                 placeholder="Good job, {{user}}, you are now level {{level}}!" style="width:100%">
        </div>
        <div class="fg" style="margin-bottom:14px">
          <label>DM user on level-up?</label>
          <select name="shouldDm">
            <option value="false" ${!config?.shouldDm ? "selected" : ""}>No</option>
            <option value="true"  ${config?.shouldDm  ? "selected" : ""}>Yes</option>
          </select>
        </div>
        <div class="fg" style="margin-bottom:14px">
          <label>Ignored role IDs <span style="color:#8b949e">(comma-separated)</span></label>
          <input name="ignoredRoles"
                 value="${esc(safeJsonArray(config?.ignoredRoles ?? "[]").join(","))}"
                 placeholder="role1,role2" style="width:100%">
        </div>
        <div class="fg" style="margin-bottom:18px">
          <label>Ignored channel IDs <span style="color:#8b949e">(comma-separated)</span></label>
          <input name="ignoredChannels"
                 value="${esc(safeJsonArray(config?.ignoredChannels ?? "[]").join(","))}"
                 placeholder="channel1,channel2" style="width:100%">
        </div>
        <button type="submit" class="btn">Save</button>
      </form>
    </div>`));
});

app.post("/guilds/:gid/config", async (c) => {
    const gid  = c.req.param("gid");
    const body = await c.req.parseBody();

    const levelUpMessage  = String(body.levelUpMessage ?? "").trim() || null;
    const shouldDm        = String(body.shouldDm) === "true";
    const ignoredRoles    = JSON.stringify(
        String(body.ignoredRoles ?? "").split(",").map(s => s.trim()).filter(Boolean)
    );
    const ignoredChannels = JSON.stringify(
        String(body.ignoredChannels ?? "").split(",").map(s => s.trim()).filter(Boolean)
    );

    upsertGuildConfig(gid, {levelUpMessage, shouldDm, ignoredRoles, ignoredChannels});
    return c.redirect(`/guilds/${esc(gid)}/config`);
});

// ── Stats ─────────────────────────────────────────────────────────────────────

app.get("/stats", (c) => {
    const statsRows = getAllCommandStats().sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    const total     = statsRows.reduce((sum, s) => sum + (s.total ?? 0), 0);

    const rows = statsRows.map(s => {
        const pct = total > 0 ? (((s.total ?? 0) / total) * 100).toFixed(1) : "0";
        return `<tr>
          <td>${esc(s.commandName)}</td>
          <td>${esc((s.total ?? 0).toLocaleString())}</td>
          <td>${esc(pct)}%</td>
        </tr>`;
    }).join("");

    return c.html(layout("Stats", `
    <h1>Command Statistics</h1>
    <div class="card">
      <p style="margin-bottom:14px;color:#8b949e">Total commands run: <strong style="color:#c9d1d9">${esc(total.toLocaleString())}</strong></p>
      <table>
        <thead><tr><th>Command</th><th>Count</th><th>Share</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="empty">No stats yet.</td></tr>'}</tbody>
      </table>
    </div>`));
});

// ── Start ─────────────────────────────────────────────────────────────────────

export default {
    port:     PORT,
    hostname: "127.0.0.1",
    fetch:    app.fetch,
};

console.log(`🌐  Admin panel → http://127.0.0.1:${PORT}`);

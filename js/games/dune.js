// Dune: Awakening — Shield Watch. Tracks how long each base has power before its shield drops.
// The game exposes no data, so the countdown starts from the time you enter. Saved in this browser only.
const LS_KEY = "gamehub-dune-bases";
const WARN_H = 24;
const CRIT_H = 6;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function load() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") || [];
  } catch {
    return [];
  }
}
function persist(bases) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(bases));
  } catch {
    /* storage blocked: the list still works until the page closes */
  }
}

function split(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}
// Live countdown on each base card, down to the second.
function countHTML(ms) {
  const { d, h, m, s } = split(ms);
  return (d ? `${d}<small>d</small>` : "") + `${pad(h)}<small>h</small>${pad(m)}<small>m</small>${pad(s)}<small>s</small>`;
}
function countText(ms, seconds = false) {
  const { d, h, m, s } = split(ms);
  return (d ? `${d}d ` : "") + `${pad(h)}h ${pad(m)}m` + (seconds ? ` ${pad(s)}s` : "");
}
function agoText(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
function status(ms) {
  if (ms <= 0) return ["out", "No power"];
  if (ms <= CRIT_H * 3600e3) return ["crit", "Critical"];
  if (ms <= WARN_H * 3600e3) return ["warn", "Refuel soon"];
  return ["ok", "Stable"];
}
const num = (input) => {
  const v = parseFloat(input.value);
  return isFinite(v) && v >= 0 ? v : 0;
};

export default {
  id: "dune",
  name: "Dune",
  mount(el) {
    el.innerHTML = `
      <div class="dn-head">
        <div><div class="eyebrow">Dune: Awakening</div><h1>Shield Watch</h1></div>
        <div class="btns">
          <button type="button" id="dn-bulk-btn" hidden>Update all</button>
          <button type="button" class="primary" id="dn-add-btn">+ Add base</button>
        </div>
      </div>

      <section class="summary" id="dn-summary" aria-live="polite"></section>

      <form class="panel" id="dn-form" hidden novalidate>
        <h2 id="dn-form-title">New base</h2>
        <label>Base name <input id="dn-name" type="text" maxlength="40" placeholder="e.g. Hagga North" autocomplete="off" /></label>
        <div class="seg" role="group" aria-label="How to enter the power left">
          <button type="button" id="dn-mode-time" aria-pressed="true">Time left</button>
          <button type="button" id="dn-mode-fuel" aria-pressed="false">Fuel and burn rate</button>
        </div>
        <div class="grid3" id="dn-time">
          <label>Days <input id="dn-d" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
          <label>Hours <input id="dn-h" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
          <label>Minutes <input id="dn-m" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
        </div>
        <div class="grid2" id="dn-fuel" hidden>
          <label>Fuel now <input id="dn-fuel-amt" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 400" /></label>
          <label>Burn per hour <input id="dn-rate" type="number" min="0" step="any" inputmode="decimal" placeholder="e.g. 12" /></label>
        </div>
        <p class="hint" id="dn-preview"></p>
        <p class="hint error" id="dn-err" hidden></p>
        <div class="actions">
          <button type="button" class="ghost" id="dn-cancel">Cancel</button>
          <button type="submit" class="primary" id="dn-save">Save</button>
        </div>
      </form>

      <form class="panel" id="dn-bulk" hidden novalidate>
        <h2>Update all</h2>
        <p class="hint">Enter the time each base shows in game. Leave a base blank to keep it as is.</p>
        <div class="bulk-rows" id="dn-bulk-rows"></div>
        <p class="hint error" id="dn-bulk-err" hidden></p>
        <div class="actions">
          <button type="button" class="ghost" id="dn-bulk-cancel">Cancel</button>
          <button type="submit" class="primary">Save changes</button>
        </div>
      </form>

      <section class="list" id="dn-list"></section>

      <p class="note">The game doesn't share this data, so the countdown runs from what you enter. Each time you refuel a base, update it with the new time. Bases are saved in this browser only.</p>`;

    const $ = (id) => el.querySelector("#" + id);
    let bases = load();
    let editingId = null;
    let confirmId = null;
    let mode = "time";

    function save(b) {
      const i = bases.findIndex((x) => x.id === b.id);
      if (i >= 0) bases[i] = b;
      else bases.push(b);
      persist(bases);
    }

    // ---------- render ----------
    function card(b, example) {
      const left = b.endsAt - Date.now();
      const [s, label] = status(left);
      const pct = b.totalMs > 0 ? Math.max(0, Math.min(100, (left / b.totalMs) * 100)) : 0;
      const controls = example
        ? ""
        : confirmId === b.id
          ? `<div class="confirm"><span>Delete <b>${esc(b.name)}</b>?</span>
              <button type="button" class="danger" data-act="del-yes" data-id="${b.id}">Yes, delete</button>
              <button type="button" class="ghost" data-act="del-no">No</button></div>`
          : `<div class="btns">
              <button type="button" data-act="edit" data-id="${b.id}">Update</button>
              <button type="button" class="ghost" data-act="del" data-id="${b.id}">Delete</button></div>`;
      return `<article class="base s-${s}${example ? " example" : ""}">
        <div class="row-between"><div class="name">${example ? '<span class="tag">Example · </span>' : ""}${esc(b.name)}</div><span class="pill">${label}</span></div>
        <div class="count" data-ends="${b.endsAt}">${countHTML(left)}</div>
        <div class="bar" role="img" aria-label="${Math.round(pct)}% left since last refuel"><span style="width:${pct}%"></span></div>
        <div class="meta">
          <span>${left > 0 ? "Runs out" : "Ran out"}: <b>${fmt.format(new Date(b.endsAt))}</b></span>
          <span>Updated ${agoText(b.setAt)}${b.rate ? ` · ${b.rate}/h` : ""}</span>
        </div>
        ${controls}
      </article>`;
    }

    function render() {
      const sorted = [...bases].sort((a, b) => a.endsAt - b.endsAt);
      $("dn-bulk-btn").hidden = !sorted.length;
      if (!sorted.length) {
        const now = Date.now();
        const examples = [
          { id: "ex1", name: "Hagga North", endsAt: now + 4.5 * 3600e3, totalMs: 48 * 3600e3, setAt: now - 43.5 * 3600e3 },
          { id: "ex2", name: "Canyon Vault", endsAt: now + 3 * 86400e3 + 7 * 3600e3, totalMs: 5 * 86400e3, setAt: now - 41 * 3600e3 },
        ];
        $("dn-summary").innerHTML = `<div class="empty"><p>No bases yet. Add one with the power time the game shows and you'll see how long its shield has left.</p>
          <button type="button" class="primary" data-act="add">Add your first base</button></div>`;
        $("dn-list").innerHTML = examples.map((b) => card(b, true)).join("");
        return;
      }
      const next = sorted[0];
      const left = next.endsAt - Date.now();
      const needRefuel = sorted.filter((b) => b.endsAt - Date.now() <= WARN_H * 3600e3).length;
      $("dn-summary").innerHTML = `
        <div><div class="eyebrow">Next to run out</div><div class="who">${esc(next.name)}</div></div>
        <div><div class="eyebrow">${left > 0 ? "Time left" : "Status"}</div><div class="big" ${left > 0 ? `data-ends-text="${next.endsAt}"` : ""}>${left > 0 ? countText(left, true) : "No power"}</div></div>
        <div><div class="eyebrow">Need refuel</div><div class="big">${needRefuel} of ${sorted.length}</div></div>`;
      $("dn-list").innerHTML = sorted.map((b) => card(b, false)).join("");
    }

    // ---------- single base form ----------
    function formMs() {
      if (mode === "time") return (num($("dn-d")) * 1440 + num($("dn-h")) * 60 + num($("dn-m"))) * 60000;
      const rate = num($("dn-rate"));
      return rate > 0 ? (num($("dn-fuel-amt")) / rate) * 3600e3 : 0;
    }
    function updatePreview() {
      const ms = formMs();
      const p = $("dn-preview");
      if (ms > 0) p.innerHTML = `Lasts <b>${countText(ms)}</b> · runs out <b>${esc(fmt.format(new Date(Date.now() + ms)))}</b>`;
      else p.textContent = mode === "time" ? "Copy the time your base console shows in game." : "Fuel is divided by the burn rate per hour.";
    }
    function setMode(m) {
      mode = m;
      $("dn-mode-time").setAttribute("aria-pressed", String(m === "time"));
      $("dn-mode-fuel").setAttribute("aria-pressed", String(m === "fuel"));
      $("dn-time").hidden = m !== "time";
      $("dn-fuel").hidden = m !== "fuel";
      updatePreview();
    }
    function openForm(b) {
      closeBulk();
      editingId = b ? b.id : null;
      $("dn-form-title").textContent = b ? `Update ${b.name}` : "New base";
      $("dn-name").value = b ? b.name : "";
      ["dn-d", "dn-h", "dn-m", "dn-fuel-amt"].forEach((id) => ($(id).value = ""));
      $("dn-rate").value = b?.rate ? b.rate : "";
      $("dn-err").hidden = true;
      setMode(b?.rate ? "fuel" : "time");
      $("dn-form").hidden = false;
      $("dn-form").scrollIntoView({ behavior: "smooth", block: "start" });
      (b ? (b.rate ? $("dn-fuel-amt") : $("dn-d")) : $("dn-name")).focus({ preventScroll: true });
    }
    function closeForm() {
      $("dn-form").hidden = true;
      editingId = null;
    }

    $("dn-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("dn-name").value.trim();
      const ms = formMs();
      const err = $("dn-err");
      if (!name) {
        err.textContent = "Give the base a name.";
        err.hidden = false;
        return;
      }
      if (ms <= 0) {
        err.textContent = mode === "time" ? "Enter how much time is left (days, hours or minutes)." : "Enter the fuel and a burn rate above 0.";
        err.hidden = false;
        return;
      }
      const now = Date.now();
      save({
        id: editingId || "b" + now.toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        endsAt: now + ms,
        totalMs: ms,
        setAt: now,
        rate: mode === "fuel" ? num($("dn-rate")) : null,
      });
      closeForm();
      render();
    });

    // ---------- update all ----------
    let bulkIds = [];
    const bulkMs = (id) => (num($("dn-bd-" + id)) * 1440 + num($("dn-bh-" + id)) * 60 + num($("dn-bm-" + id))) * 60000;
    function bulkPreview(id) {
      const ms = bulkMs(id);
      const p = $("dn-bp-" + id);
      if (ms > 0) p.innerHTML = `New: <b>${countText(ms)}</b> · runs out <b>${esc(fmt.format(new Date(Date.now() + ms)))}</b>`;
      else p.textContent = "No change";
    }
    function openBulk() {
      closeForm();
      const sorted = [...bases].sort((a, b) => a.endsAt - b.endsAt);
      bulkIds = sorted.map((b) => b.id);
      $("dn-bulk-rows").innerHTML = sorted
        .map((b) => {
          const left = b.endsAt - Date.now();
          return `<div class="bulk-row">
            <div class="row-between"><span class="name"><b>${esc(b.name)}</b></span><span class="mono muted" style="font-size:.8rem">Now: ${left > 0 ? countText(left) : "no power"}</span></div>
            <div class="grid3">
              <label>Days <input id="dn-bd-${b.id}" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
              <label>Hours <input id="dn-bh-${b.id}" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
              <label>Minutes <input id="dn-bm-${b.id}" type="number" min="0" step="1" inputmode="numeric" placeholder="0" /></label>
            </div>
            <p class="hint" id="dn-bp-${b.id}">No change</p>
          </div>`;
        })
        .join("");
      bulkIds.forEach((id) => ["bd", "bh", "bm"].forEach((k) => $(`dn-${k}-${id}`).addEventListener("input", () => bulkPreview(id))));
      $("dn-bulk-err").hidden = true;
      $("dn-bulk").hidden = false;
      $("dn-bulk").scrollIntoView({ behavior: "smooth", block: "start" });
      if (bulkIds.length) $("dn-bd-" + bulkIds[0]).focus({ preventScroll: true });
    }
    function closeBulk() {
      $("dn-bulk").hidden = true;
      $("dn-bulk-rows").innerHTML = "";
      bulkIds = [];
    }

    $("dn-bulk").addEventListener("submit", (e) => {
      e.preventDefault();
      const now = Date.now();
      const changes = bulkIds.map((id) => ({ id, ms: bulkMs(id) })).filter((c) => c.ms > 0);
      if (!changes.length) {
        $("dn-bulk-err").textContent = "You didn't enter any times. Fill in at least one base or press Cancel.";
        $("dn-bulk-err").hidden = false;
        return;
      }
      for (const c of changes) {
        const b = bases.find((x) => x.id === c.id);
        if (b) save({ ...b, endsAt: now + c.ms, totalMs: c.ms, setAt: now, rate: null });
      }
      closeBulk();
      render();
    });

    // ---------- wiring ----------
    ["dn-d", "dn-h", "dn-m", "dn-fuel-amt", "dn-rate"].forEach((id) => $(id).addEventListener("input", updatePreview));
    $("dn-mode-time").addEventListener("click", () => setMode("time"));
    $("dn-mode-fuel").addEventListener("click", () => setMode("fuel"));
    $("dn-cancel").addEventListener("click", closeForm);
    $("dn-add-btn").addEventListener("click", () => openForm(null));
    $("dn-bulk-btn").addEventListener("click", openBulk);
    $("dn-bulk-cancel").addEventListener("click", closeBulk);

    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t) return;
      const { act, id } = t.dataset;
      if (act === "add") openForm(null);
      else if (act === "edit") openForm(bases.find((b) => b.id === id));
      else if (act === "del") confirmId = id;
      else if (act === "del-no") confirmId = null;
      else if (act === "del-yes") {
        confirmId = null;
        bases = bases.filter((b) => b.id !== id);
        persist(bases);
      }
      if (act.startsWith("del")) render();
    });

    // Every second, move just the countdown numbers; redraw everything when a base changes status
    // (e.g. Stable → Refuel soon) or every 30 s so the "Updated … ago" text stays current.
    let lastStatuses = "";
    let lastFull = 0;
    const statuses = () => bases.map((b) => status(b.endsAt - Date.now())[0]).join();
    function tick() {
      const now = Date.now();
      const st = statuses();
      if (st !== lastStatuses || now - lastFull > 30_000) {
        lastStatuses = st;
        lastFull = now;
        render();
        return;
      }
      el.querySelectorAll("[data-ends]").forEach((n) => (n.innerHTML = countHTML(Number(n.dataset.ends) - now)));
      el.querySelectorAll("[data-ends-text]").forEach((n) => (n.textContent = countText(Number(n.dataset.endsText) - now, true)));
    }

    render();
    lastStatuses = statuses();
    lastFull = Date.now();
    const timer = setInterval(tick, 1000);
    const onVisibility = () => !document.hidden && render();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  },
};

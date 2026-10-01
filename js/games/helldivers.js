// Helldivers 2 — Galactic War status from the community API (https://api.helldivers2.dev).
// The API asks every client to identify itself with these two headers and allows ~5 requests per 10 s.
import { biomeArt } from "./helldivers-biomes.js";

const API = "https://api.helldivers2.dev/api/v1";
const HEADERS = {
  "X-Super-Client": "gamehub",
  "X-Super-Contact": "https://github.com/FrankRayo/Gamehub",
  "Accept-Language": "en-US",
};
const REFRESH_MS = 60_000;

const FACTIONS = { 1: "Humans", 2: "Terminids", 3: "Automatons", 4: "Illuminate" };
const FACTION_NAMES = { Humans: "Humans", Terminids: "Terminids", Automaton: "Automatons", Illuminate: "Illuminate" };

// Major Order task "valueTypes" say what each entry in "values" means.
const VT = { FACTION: 1, GOAL: 3, PLANET: 12 };
const TASK_VERBS = {
  2: "Collect",
  3: "Kill",
  7: "Complete missions",
  9: "Complete operations",
  11: "Liberate",
  12: "Defend",
  13: "Hold",
  15: "Liberate more planets than are lost",
};
const REWARDS = { 1: "Medals" };

let planetNames = null; // index -> name, loaded only when a Major Order points at a planet
let cache = null; // last good { war, orders, campaigns, at } — reused when switching tabs back and forth

async function get(path) {
  const res = await fetch(API + path, { headers: HEADERS });
  if (res.status === 429) throw new Error("Too many requests to the war API. Retrying in 15 seconds.");
  if (!res.ok) throw new Error(`The war API answered ${res.status}.`);
  return res.json();
}

async function loadPlanetNames() {
  if (planetNames) return planetNames;
  const planets = await get("/planets");
  planetNames = new Map(planets.map((p) => [p.index, p]));
  return planetNames;
}

// ---------- formatting ----------
const nf = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const titleCase = (s) => String(s ?? "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function factionHTML(name) {
  const label = FACTION_NAMES[name] || name || "Unknown";
  return `<span class="faction ${label.toLowerCase()}">${esc(label)}</span>`;
}

function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!(ms > 0)) return "ended";
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), min = m % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${min}m` : `${min}m`;
}

// How far along the war effort is on a planet: defense progress if under attack, liberation otherwise.
function planetProgress(planet) {
  const ev = planet.event;
  if (ev && ev.maxHealth) {
    return { kind: "Defense", pct: 100 * (1 - ev.health / ev.maxHealth), endsAt: ev.endTime, enemy: FACTIONS[ev.faction] || ev.faction };
  }
  const pct = planet.maxHealth ? 100 * (1 - planet.health / planet.maxHealth) : 0;
  return { kind: "Liberation", pct, enemy: planet.currentOwner };
}

// ---------- Major Order ----------
function taskValue(task, type) {
  const i = task.valueTypes.indexOf(type);
  return i >= 0 ? task.values[i] : undefined;
}

function describeTask(task, progress) {
  const verb = TASK_VERBS[task.type] || "Objective";
  const goal = taskValue(task, VT.GOAL) || 0;
  const faction = FACTIONS[taskValue(task, VT.FACTION)];
  const planetIdx = taskValue(task, VT.PLANET);
  const planet = planetNames && planetIdx ? planetNames.get(planetIdx) : null;

  // Planet objectives report 0/1; show the planet's own progress instead.
  if ((task.type === 11 || task.type === 13) && planetIdx) {
    const name = planet ? titleCase(planet.name) : `planet #${planetIdx}`;
    const done = progress >= 1;
    const pp = planet ? planetProgress(planet) : null;
    return {
      label: `${verb} ${name}`,
      right: done ? "Done" : pp ? `${pp.pct.toFixed(1)}%` : "In progress",
      pct: done ? 100 : pp ? pp.pct : 0,
      done,
    };
  }

  const target = faction ? `${faction}` : "";
  const label = task.type === 3 ? `Kill ${nf.format(goal)} ${target || "enemies"}` : `${verb}${target ? " vs " + target : ""}`;
  const pct = goal > 1 ? Math.min(100, (100 * progress) / goal) : progress >= 1 ? 100 : 0;
  return {
    label,
    right: goal > 1 ? `${compact.format(progress)} / ${compact.format(goal)}` : progress >= goal ? "Done" : "In progress",
    pct,
    done: pct >= 100,
  };
}

function majorOrderHTML(orders) {
  if (!orders.length) {
    return `<section class="card"><div class="eyebrow">Major Order</div><p class="muted" style="margin:0">No Major Order right now. Stand by for orders from Super Earth.</p></section>`;
  }
  return orders
    .map((mo) => {
      const tasks = mo.tasks.map((t, i) => describeTask(t, mo.progress[i] ?? 0));
      const reward = mo.reward ? `${nf.format(mo.reward.amount)} ${REWARDS[mo.reward.type] || "reward"}` : null;
      return `<section class="card mo">
        <div class="row-between"><span class="eyebrow">${esc(mo.title || "Major Order")}</span><span class="pill">${esc(timeLeft(mo.expiration))} left</span></div>
        ${mo.briefing ? `<p class="mo-brief">${esc(mo.briefing)}</p>` : ""}
        <ul class="mo-tasks">
          ${tasks
            .map(
              (t) => `<li class="mo-task${t.done ? " done" : ""}">
                <div class="row-between"><span>${esc(t.label)}</span><span class="mono">${esc(t.right)}</span></div>
                <div class="bar"><span style="width:${t.pct.toFixed(1)}%"></span></div>
              </li>`
            )
            .join("")}
        </ul>
        <div class="mo-meta">
          ${reward ? `<span>Reward: <b>${esc(reward)}</b></span>` : ""}
          <span>Ends: <b>${esc(new Date(mo.expiration).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }))}</b></span>
        </div>
      </section>`;
    })
    .join("");
}

// ---------- planets ----------
function hotPlanetHTML(campaigns) {
  if (!campaigns.length) return "";
  const top = campaigns[0].planet;
  const pp = planetProgress(top);
  return `<section class="card hot">
    <figure class="biome-banner">
      ${biomeArt(top)}
      <figcaption>${esc(top.biome?.name || "Unknown biome")}</figcaption>
    </figure>
    <div class="eyebrow">Most Helldivers deployed</div>
    <div class="row-between">
      <div class="planet-name">${esc(titleCase(top.name))}</div>
      <div class="mono"><b>${nf.format(top.statistics.playerCount)}</b> <span class="muted">divers</span></div>
    </div>
    <div class="row-between muted" style="font-size:.9rem">
      <span>${esc(top.sector)} sector · vs ${factionHTML(pp.enemy)}</span>
      <span>${pp.kind}${pp.endsAt ? ` · ${esc(timeLeft(pp.endsAt))} left` : ""}</span>
    </div>
    <div class="bar"><span style="width:${pp.pct.toFixed(1)}%"></span></div>
    <div class="mono" style="font-size:.9rem">${pp.pct.toFixed(2)}% ${pp.kind === "Defense" ? "defended" : "liberated"}</div>
    ${top.biome?.description ? `<p class="biome-desc">${esc(top.biome.description)}</p>` : ""}
  </section>`;
}

const FRONTS_SHOWN = 8;
let showAllFronts = false; // kept across refreshes and tab switches

function frontsHTML(campaigns) {
  const others = campaigns.slice(1);
  const list = showAllFronts ? others : others.slice(0, FRONTS_SHOWN);
  if (!list.length) return "";
  const toggle =
    others.length > FRONTS_SHOWN
      ? `<button type="button" class="ghost fronts-toggle" data-act="toggle-fronts">${showAllFronts ? "Show fewer" : `Show all ${others.length} fronts`}</button>`
      : "";
  return `<section class="card">
    <div class="row-between"><h2>Other active fronts</h2><span class="muted" style="font-size:.85rem">${campaigns.length} total</span></div>
    <ul class="fronts">
      ${list
        .map((c) => {
          const pp = planetProgress(c.planet);
          return `<li class="front">
            ${biomeArt(c.planet, "biome-thumb")}
            <div class="front-info">
            <div class="row-between"><span><b>${esc(titleCase(c.planet.name))}</b> · ${factionHTML(pp.enemy)}${pp.kind === "Defense" ? ' · <span class="pill">Defense</span>' : ""}</span>
              <span class="players">${nf.format(c.planet.statistics.playerCount)} divers</span></div>
            <div class="bar"><span style="width:${pp.pct.toFixed(1)}%"></span></div>
            </div>
          </li>`;
        })
        .join("")}
    </ul>
    ${toggle}
  </section>`;
}

function statsHTML(war) {
  const s = war.statistics;
  const stats = [
    ["Missions won", compact.format(s.missionsWon)],
    ["Success rate", `${s.missionSuccessRate}%`],
    ["Terminids killed", compact.format(s.terminidKills)],
    ["Automatons killed", compact.format(s.automatonKills)],
    ["Illuminate killed", compact.format(s.illuminateKills)],
    ["Helldivers lost", compact.format(s.deaths)],
  ];
  return `<section class="card">
    <h2>Galactic War totals</h2>
    <div class="stat-grid">${stats.map(([k, v]) => `<div class="stat"><div class="eyebrow">${k}</div><div class="v">${v}</div></div>`).join("")}</div>
  </section>`;
}

// ---------- tab ----------
export default {
  id: "helldivers",
  name: "Helldivers 2",
  mount(el) {
    el.innerHTML = `
      <div class="hd-head">
        <div><div class="eyebrow">Galactic War</div><h1>Helldivers 2</h1></div>
        <div class="hd-divers"><div class="eyebrow">Helldivers active</div><div class="big" id="hd-count">—</div></div>
      </div>
      <p class="error hd-status" id="hd-error" hidden></p>
      <div id="hd-body" class="wrap" style="padding:0;gap:20px"><section class="card skeleton">Contacting Super Earth High Command…</section></div>
      <p class="note">Live data from the community API at api.helldivers2.dev. Updates every minute while this tab is open.</p>`;

    const $ = (id) => el.querySelector("#" + id);
    let timer = null;
    let retry = null;
    let busy = false;
    let lastTry = 0;

    function draw({ war, orders, campaigns }) {
      $("hd-count").textContent = nf.format(war.statistics.playerCount);
      $("hd-body").innerHTML = majorOrderHTML(orders) + hotPlanetHTML(campaigns) + frontsHTML(campaigns) + statsHTML(war);
      $("hd-error").hidden = true;
    }

    async function refresh() {
      if (busy) return;
      busy = true;
      lastTry = Date.now();
      clearTimeout(retry);
      try {
        const [war, orders, campaigns] = await Promise.all([get("/war"), get("/assignments"), get("/campaigns")]);
        const needsPlanets = orders.some((mo) => mo.tasks.some((t) => t.valueTypes.includes(VT.PLANET) && taskValue(t, VT.PLANET)));
        if (needsPlanets) await loadPlanetNames().catch(() => null);

        campaigns.sort((a, b) => b.planet.statistics.playerCount - a.planet.statistics.playerCount);
        cache = { war, orders, campaigns, at: new Date() };
        draw(cache);
      } catch (e) {
        $("hd-error").textContent = e.message || "Could not reach the war API.";
        $("hd-error").hidden = false;
        retry = setTimeout(refresh, 15_000);
      } finally {
        busy = false;
      }
    }

    function start() {
      stop();
      // Coming back to the tab right after a refresh shouldn't spend the API's small request budget again.
      if (Date.now() - lastTry > 15_000) refresh();
      timer = setInterval(refresh, REFRESH_MS);
    }
    function stop() {
      clearInterval(timer);
      clearTimeout(retry);
      timer = null;
    }
    const onVisibility = () => (document.hidden ? stop() : start());

    document.addEventListener("visibilitychange", onVisibility);
    el.addEventListener("click", (e) => {
      if (!e.target.closest('[data-act="toggle-fronts"]') || !cache) return;
      showAllFronts = !showAllFronts;
      draw(cache);
    });
    if (cache) {
      draw(cache);
      lastTry = cache.at.getTime(); // skip the immediate fetch if the cached data is still fresh
      if (Date.now() - lastTry > REFRESH_MS) lastTry = 0;
    }
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  },
};

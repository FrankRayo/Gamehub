// Original illustrated landscapes for Helldivers 2 planet biomes, drawn as SVG.
// Each biome has a palette, a terrain shape and optional features; the planet's index seeds
// the randomness so every planet gets its own variation of its biome.
//
// To use your own pictures instead, add them to BIOME_IMAGES below (biome name -> image URL),
// e.g. "plains": "img/biomes/plains.jpg". Any biome without an image falls back to the drawing.
export const BIOME_IMAGES = {};

const W = 400;
const H = 160;

// sky: [top, horizon]; layers: far → near ground colors; terrain: shape of the ridges.
const BIOMES = {
  "super earth":             { sky: ["#3f7fc4", "#cfe3f2"], layers: ["#8fb3cf", "#6f93b3", "#4b6c8c"], terrain: "hills", features: ["city"] },
  "desert dunes":            { sky: ["#e79a4a", "#f8dca0"], layers: ["#e0a063", "#c9824a", "#a9642f"], terrain: "dunes", sun: "#fff3c4" },
  "desert cliffs":           { sky: ["#e0925a", "#f5d29e"], layers: ["#cf8a57", "#b36a3e", "#8a4c2a"], terrain: "mesas", features: ["dust"] },
  "desert oasis":            { sky: ["#6fbfe4", "#f3e2b4"], layers: ["#e7c88e", "#d7ae6c", "#c49355"], terrain: "dunes", features: ["water", "palms"], sun: "#fffbe0" },
  "plains":                  { sky: ["#8fa9b3", "#dde2d6"], layers: ["#8d9a78", "#6c7d52", "#4d5e36"], terrain: "hills", features: ["grass", "fog"] },
  "moon":                    { sky: ["#07080e", "#20232f"], layers: ["#6d7079", "#51545c", "#393b42"], terrain: "craters", features: ["stars"], sun: "#e9ecf5" },
  "ionic jungle":            { sky: ["#2e1f52", "#7a5aa8"], layers: ["#4c3f7a", "#2f6f78", "#1e4c55"], terrain: "hills", features: ["glowtrees", "stars"] },
  "rocky canyons":           { sky: ["#d9884d", "#f2c48d"], layers: ["#c0714a", "#9e4f2e", "#7a381f"], terrain: "mesas" },
  "acidic badlands":         { sky: ["#8d9a45", "#d9d68a"], layers: ["#8a8650", "#6a6838", "#4b4a26"], terrain: "peaks", features: ["fog", "vents"] },
  "basic swamp":             { sky: ["#63806a", "#b5c2a2"], layers: ["#5e7658", "#435a3e", "#2f422b"], terrain: "flat", features: ["water", "gnarled", "fog"] },
  "tundra":                  { sky: ["#aebfcf", "#e5e9ee"], layers: ["#9da08b", "#83866f", "#666a54"], terrain: "hills", features: ["shrubs"] },
  "icy glaciers":            { sky: ["#8db8e2", "#eaf3fb"], layers: ["#d6e6f4", "#a8c6e2", "#7aa2c8"], terrain: "peaks", features: ["snowcaps"], sun: "#ffffff" },
  "boneyard":                { sky: ["#86939f", "#cdd4d9"], layers: ["#8b9189", "#6b7166", "#50564c"], terrain: "peaks", features: ["snowcaps", "bones"] },
  "ionic crimson":           { sky: ["#4e1622", "#b44448"], layers: ["#8a2a36", "#6c1d2a", "#4c1320"], terrain: "hills", features: ["stars"] },
  "ethereal jungle":         { sky: ["#18344a", "#5a9e9b"], layers: ["#2d5d63", "#1f4a4e", "#143639"], terrain: "hills", features: ["glowtrees", "fog"] },
  "volcanic jungle":         { sky: ["#3a4838", "#8c916c"], layers: ["#4f5a3c", "#35462b", "#23321d"], terrain: "peaks", features: ["smoke", "trees"] },
  "haunted swamp":           { sky: ["#23282e", "#56615c"], layers: ["#3c4641", "#2c3531", "#1d2421"], terrain: "flat", features: ["water", "deadtrees", "fog"] },
  "deadlands":               { sky: ["#62626a", "#a9a8ae"], layers: ["#77767c", "#5d5c62", "#44434a"], terrain: "flat", features: ["flowers"] },
  "scorched moor":           { sky: ["#6e2f1a", "#d9854a"], layers: ["#5a3a2a", "#43291d", "#2d1b13"], terrain: "hills", features: ["embers", "smoke"] },
  "supercolony":             { sky: ["#34230f", "#8a6534"], layers: ["#6a4a26", "#4f361b", "#352411"], terrain: "hive", features: ["spores"] },
  "hive world":              { sky: ["#2f1f0e", "#7d5a2e"], layers: ["#65462a", "#4a321c", "#301f10"], terrain: "hive", features: ["spores"] },
  "cyberstan megafactory":   { sky: ["#1f0c0c", "#6a241d"], layers: ["#3a2522", "#2a1a18", "#1b100f"], terrain: "flat", features: ["factory", "smoke"] },
  "magma":                   { sky: ["#1f0906", "#7a2712"], layers: ["#35201a", "#261612", "#170d0a"], terrain: "peaks", features: ["lava", "embers"] },
  "deciduous forest":        { sky: ["#8fbfdf", "#e3eed9"], layers: ["#7ea36a", "#5c8a4c", "#3f6a36"], terrain: "hills", features: ["water", "trees"] },
  "deciduous autumn forest": { sky: ["#9fbfd6", "#f0e3cc"], layers: ["#b5874a", "#9a6533", "#6e4424"], terrain: "hills", features: ["water", "autumn"] },
};
const UNKNOWN = { sky: ["#0c0d0f", "#2a2d31"], layers: ["#2c2f33", "#202326", "#15171a"], terrain: "flat", features: ["static"] };

// ---------- helpers ----------
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const f1 = (n) => n.toFixed(1);

// Heights across the width for one ridge line.
function ridge(kind, base, amp, r) {
  const pts = [];
  const steps = 40;
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  let walk = 0;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const t = x / W;
    let y;
    switch (kind) {
      case "dunes":
        y = base - amp * (0.6 * Math.abs(Math.sin(t * 5 + ph[0])) + 0.3 * Math.sin(t * 11 + ph[1]));
        break;
      case "peaks":
        walk += (r() - 0.5) * amp * 0.9;
        walk *= 0.8;
        y = base - amp * (0.55 + 0.45 * Math.sin(t * 7 + ph[0])) - walk - (i % 2 ? amp * 0.25 * r() : 0);
        break;
      case "mesas": {
        const band = Math.sin(t * 6 + ph[0]) > 0.1;
        y = base - (band ? amp : amp * 0.25) - r() * 3;
        break;
      }
      case "craters":
        y = base - amp * 0.2 * Math.sin(t * 9 + ph[0]) - r() * 3;
        break;
      case "hive":
        y = base - amp * (0.3 + 0.2 * Math.sin(t * 8 + ph[0])) - (i % 3 === 0 ? amp * (0.6 + r()) : 0);
        break;
      case "flat":
        y = base - amp * 0.15 * Math.sin(t * 4 + ph[0]) - r() * 2;
        break;
      default: // hills
        y = base - amp * (0.55 + 0.3 * Math.sin(t * 4 + ph[0]) + 0.15 * Math.sin(t * 9 + ph[1]));
    }
    pts.push([x, y]);
  }
  return pts;
}

function areaPath(pts, kind) {
  let d = `M0 ${H} L${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (kind === "mesas" && pts[i - 1][1] !== y) d += ` L${f1(x)} ${f1(pts[i - 1][1])}`; // step cliffs
    d += ` L${f1(x)} ${f1(y)}`;
  }
  return d + ` L${W} ${H} Z`;
}

const yAt = (pts, x) => pts[Math.min(pts.length - 1, Math.round((x / W) * (pts.length - 1)))][1];

// ---------- features ----------
function drawFeatures(b, r, ridges) {
  const near = ridges[ridges.length - 1];
  const mid = ridges[1];
  const out = { back: "", front: "" };
  const has = (f) => (b.features || []).includes(f);

  if (has("stars")) {
    for (let i = 0; i < 40; i++) out.back += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H * 0.5)}" r="${f1(0.4 + r() * 0.8)}" fill="#fff" opacity="${f1(0.3 + r() * 0.6)}"/>`;
  }
  if (has("city")) {
    let x = 0;
    while (x < W) {
      const w = 8 + r() * 16, h = 20 + r() * 45;
      out.back += `<rect x="${f1(x)}" y="${f1(yAt(mid, x) - h)}" width="${f1(w)}" height="${f1(h + 20)}" fill="#5d7fa0" opacity=".85"/>`;
      x += w + 2;
    }
  }
  if (has("factory")) {
    let x = 0;
    while (x < W) {
      const w = 18 + r() * 30, h = 18 + r() * 30, base = yAt(near, x) + 4;
      out.front += `<rect x="${f1(x)}" y="${f1(base - h)}" width="${f1(w)}" height="${f1(h)}" fill="#120a09"/>`;
      if (r() > 0.4) out.front += `<rect x="${f1(x + w * 0.6)}" y="${f1(base - h - 22)}" width="5" height="24" fill="#120a09"/><circle cx="${f1(x + w * 0.6 + 2.5)}" cy="${f1(base - h - 24)}" r="1.6" fill="#ff3b2f"/>`;
      for (let k = 0; k < 3; k++) if (r() > 0.5) out.front += `<rect x="${f1(x + 3 + r() * (w - 6))}" y="${f1(base - h + 4 + r() * (h - 10))}" width="2" height="2" fill="#ff6a3d"/>`;
      x += w + 6 + r() * 20;
    }
  }
  if (has("water")) out.back += `<rect x="0" y="${f1(yAt(mid, W / 2) + 6)}" width="${W}" height="${H}" fill="#9fd0e0" opacity=".35"/>`;
  if (has("lava")) {
    let d = `M0 ${f1(H - 18)}`;
    for (let x = 0; x <= W; x += 20) d += ` Q${x + 10} ${f1(H - 22 - r() * 14)} ${x + 20} ${f1(H - 16 - r() * 8)}`;
    out.front += `<path d="${d}" stroke="#ff7a1a" stroke-width="4" fill="none" opacity=".95"/><path d="${d}" stroke="#ffd36b" stroke-width="1.2" fill="none"/>`;
  }
  if (has("snowcaps")) {
    for (const p of mid) if (p[1] < 95 && r() > 0.3) out.back += `<path d="M${f1(p[0] - 7)} ${f1(p[1] + 7)} L${f1(p[0])} ${f1(p[1])} L${f1(p[0] + 7)} ${f1(p[1] + 7)} Z" fill="#fff" opacity=".9"/>`;
  }

  const plant = (count, fn) => {
    for (let i = 0; i < count; i++) {
      const x = r() * W;
      out.front += fn(x, yAt(near, x) + 3, 0.7 + r() * 0.6);
    }
  };
  if (has("trees")) plant(26, (x, y, s) => `<ellipse cx="${f1(x)}" cy="${f1(y - 9 * s)}" rx="${f1(6 * s)}" ry="${f1(10 * s)}" fill="${b.layers[2]}" stroke="#0003"/>`);
  if (has("autumn")) {
    const c = ["#d9772a", "#b8452a", "#e3a23a", "#8a3a22"];
    plant(26, (x, y, s) => `<circle cx="${f1(x)}" cy="${f1(y - 8 * s)}" r="${f1(7 * s)}" fill="${c[Math.floor(r() * c.length)]}"/>`);
  }
  if (has("glowtrees")) plant(18, (x, y, s) => `<path d="M${f1(x)} ${f1(y)} L${f1(x)} ${f1(y - 16 * s)}" stroke="#0b1f22" stroke-width="2"/><circle cx="${f1(x)}" cy="${f1(y - 18 * s)}" r="${f1(5 * s)}" fill="#7ef0d8" opacity=".8"/>`);
  if (has("palms")) plant(7, (x, y, s) => `<path d="M${f1(x)} ${f1(y)} q2 -12 0 -22" stroke="#5a3d22" stroke-width="2" fill="none"/><path d="M${f1(x - 10 * s)} ${f1(y - 18)} q10 -8 20 0 M${f1(x - 8 * s)} ${f1(y - 24)} q8 4 16 0" stroke="#3f7a3a" stroke-width="3" fill="none"/>`);
  if (has("gnarled") || has("deadtrees")) {
    const col = has("deadtrees") ? "#101412" : "#1f2c1c";
    plant(12, (x, y, s) => `<path d="M${f1(x)} ${f1(y)} l${f1(-2 * s)} ${f1(-18 * s)} l${f1(-6 * s)} ${f1(-6 * s)} M${f1(x - 2 * s)} ${f1(y - 14 * s)} l${f1(7 * s)} ${f1(-9 * s)}" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  }
  if (has("shrubs")) {
    const c = ["#b0476a", "#d38b3a", "#7a8f3a", "#8a4fa0"];
    plant(34, (x, y, s) => `<circle cx="${f1(x)}" cy="${f1(y - 2)}" r="${f1(3 * s)}" fill="${c[Math.floor(r() * c.length)]}"/>`);
  }
  if (has("flowers")) plant(40, (x, y) => `<circle cx="${f1(x)}" cy="${f1(y - 1 - r() * 6)}" r="1.4" fill="#b57ae0"/>`);
  if (has("grass")) plant(50, (x, y, s) => `<path d="M${f1(x)} ${f1(y)} l-1 ${f1(-6 * s)} M${f1(x)} ${f1(y)} l2 ${f1(-5 * s)}" stroke="#2f3d22" stroke-width="1"/>`);
  if (has("bones")) plant(5, (x, y, s) => `<path d="M${f1(x)} ${f1(y)} q${f1(12 * s)} ${f1(-26 * s)} ${f1(26 * s)} ${f1(-4 * s)}" stroke="#e6e2d4" stroke-width="3" fill="none"/>`);
  if (has("vents")) plant(6, (x, y) => `<ellipse cx="${f1(x)}" cy="${f1(y - 14)}" rx="10" ry="16" fill="#c7e05a" opacity=".18"/>`);
  if (has("spores")) {
    for (let i = 0; i < 30; i++) out.front += `<circle cx="${f1(r() * W)}" cy="${f1(20 + r() * 100)}" r="${f1(0.8 + r() * 1.4)}" fill="#e8c46a" opacity=".5"/>`;
  }
  if (has("embers")) {
    for (let i = 0; i < 30; i++) out.front += `<circle cx="${f1(r() * W)}" cy="${f1(30 + r() * 110)}" r="${f1(0.6 + r())}" fill="#ffb347" opacity=".8"/>`;
  }
  if (has("smoke")) {
    for (let i = 0; i < 4; i++) out.back += `<ellipse cx="${f1(r() * W)}" cy="${f1(20 + r() * 30)}" rx="${f1(40 + r() * 50)}" ry="${f1(10 + r() * 10)}" fill="#1a1a1a" opacity=".25"/>`;
  }
  if (has("dust")) out.front += `<rect width="${W}" height="${H}" fill="#f0c090" opacity=".12"/>`;
  if (has("fog")) out.front += `<rect y="${H * 0.45}" width="${W}" height="${H * 0.55}" fill="url(#fog)"/>`;
  if (has("static")) {
    for (let i = 0; i < 60; i++) out.front += `<rect x="${f1(r() * W)}" y="${f1(r() * H)}" width="${f1(4 + r() * 20)}" height="1" fill="#fff" opacity="${f1(r() * 0.25)}"/>`;
  }
  return out;
}

// ---------- public ----------
export function biomeArt(planet, className = "biome") {
  const name = (planet.biome?.name || "").toLowerCase();
  const alt = `${planet.biome?.name || "Unknown"} biome`;
  if (BIOME_IMAGES[name]) {
    return `<img class="${className}" src="${BIOME_IMAGES[name]}" alt="${alt}" loading="lazy" />`;
  }

  const b = BIOMES[name] || UNKNOWN;
  const r = rng((planet.index ?? 0) + 7);
  const id = `b${planet.index ?? 0}${Math.floor(r() * 1e6)}`;
  const kind = b.terrain;
  const ridges = [
    ridge(kind === "mesas" || kind === "hive" ? "hills" : kind, 92, 34, r),
    ridge(kind, 112, 30, r),
    ridge(kind === "peaks" ? "hills" : kind, 138, 18, r),
  ];
  const feats = drawFeatures(b, r, ridges);
  const sunX = 60 + r() * 280;

  return `<svg class="${className}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${alt}">
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.sky[0]}"/><stop offset="1" stop-color="${b.sky[1]}"/></linearGradient>
      <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${id}s)"/>
    ${b.sun ? `<circle cx="${f1(sunX)}" cy="34" r="14" fill="${b.sun}" opacity=".85"/>` : ""}
    ${feats.back}
    ${ridges.map((p, i) => `<path d="${areaPath(p, kind)}" fill="${b.layers[i]}"/>`).join("")}
    ${feats.front}
  </svg>`;
}

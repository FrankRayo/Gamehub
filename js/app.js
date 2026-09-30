import helldivers from "./games/helldivers.js";
import dune from "./games/dune.js";

// To add a game: create js/games/<game>.js exporting { id, name, mount(el) }, list it here,
// and give it an accent under [data-game="<id>"] in styles.css.
// mount() may return a cleanup function that runs when the user switches tabs.
const GAMES = [helldivers, dune];

const tabsEl = document.getElementById("tabs");
const view = document.getElementById("view");
let cleanup = null;

tabsEl.innerHTML = GAMES.map(
  (g) => `<a href="#${g.id}" class="tab" data-id="${g.id}">${g.name}</a>`
).join("");

function show() {
  const id = location.hash.slice(1);
  const game = GAMES.find((g) => g.id === id) || GAMES[0];

  if (cleanup) cleanup();
  cleanup = null;

  tabsEl.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.id === game.id;
    t.classList.toggle("active", active);
    if (active) t.setAttribute("aria-current", "page");
    else t.removeAttribute("aria-current");
  });

  document.documentElement.dataset.game = game.id; // each game's accent color lives in styles.css
  document.title = `${game.name} · GameHub`;
  view.innerHTML = "";
  cleanup = game.mount(view) || null;
}

window.addEventListener("hashchange", show);
show();

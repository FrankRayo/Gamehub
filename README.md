# GameHub

A small hub for the games I play, one tab per game. Plain HTML, CSS and JavaScript — no build step — published with GitHub Pages.

## Tabs

- **Helldivers 2** — live Galactic War status: active Helldivers, the current Major Order and its progress, the planet with the most divers, other active fronts, and war totals. Data comes from the community API at [api.helldivers2.dev](https://github.com/helldivers-2/api) and refreshes every minute.
- **Dune** — Shield Watch: a countdown for each base's power, so you know when its shield will drop. Enter the time left (or fuel and burn rate); bases are saved in your browser.

## Run it locally

ES modules need to be served over HTTP, so open the folder with any static server, for example:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Add a game

1. Create `js/games/<game>.js` exporting `{ id, name, mount(el) }`. `mount` draws the tab into `el` and can return a cleanup function.
2. Import it in `js/app.js` and add it to `GAMES`.
3. Give it an accent color under `[data-game="<id>"]` in `styles.css`.

# Changelog

## Phase 0: Shell

**What changed**
- Vite + React 18 + TypeScript (strict) + Tailwind, with colours as CSS custom properties.
- Installable PWA: manifest, icons and precaching, so the app runs with no network after first load.
  New versions show a Reload prompt and never reload by themselves mid-session.
- App layout: SessionBar placeholder, placeholder screens, and the four-tab TabBar. Settings opens from the gear on Crews.
- Sun / Dawn / Auto theme, remembered between launches.
- Wake-lock and haptics hooks. Settings has temporary "Device checks" controls for trying them.
- GitHub Actions workflow: lint, test and build every push to `main`, then deploy to GitHub Pages.

**How to try it**
- Locally: `npm run build && npm run preview`, then open the URL it prints.
- On a phone: open the deployed site, install it, turn on airplane mode, and relaunch it.
  Settings shows the build ID, so you can confirm which deploy you're running.

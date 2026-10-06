# Task List

| Date | Project | Change | Reasoning | Anticipated outcome |
|------|---------|--------|-----------|---------------------|
| 2026-10-06 | PythonLearning | Added home-screen icons (180px apple-touch-icon, 192/512px PNGs, maskable 512px) rendered from a full-bleed version of the favicon, plus `manifest.webmanifest` and `apple-touch-icon`/`manifest`/`apple-mobile-web-app-title` tags in `index.html` | iOS ignores SVG favicons and needs an opaque PNG apple-touch-icon; Android Chrome reads icons from the web manifest; full-bleed art lets each OS apply its own corner mask | Saving the app to the Home Screen on iPhone/iPad and Android shows the yellow `>_` prompt icon on Python blue, labeled "Python Path" |

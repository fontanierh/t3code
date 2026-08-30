# Crab brand assets

The public Crab mark is [`crab-mark.svg`](./crab-mark.svg). The three complete application-icon
sources are:

- [`dev/logo.svg`](./dev/logo.svg)
- [`nightly/logo.svg`](./nightly/logo.svg)
- [`prod/logo.svg`](./prod/logo.svg)

Run this from the repository root after changing a source:

```sh
vp run icons:export
```

The exporter deterministically produces the tracked iOS, macOS, Linux, Windows, Android, and web
assets with Sharp. `vp run icons:check` verifies the generated files without modifying them. The
macOS exports keep the classic 824×824 body centered inside a transparent 1024×1024 canvas; the
other platform exports are full bleed.

The development web icons are also copied to `apps/web/public`, where Vite serves the browser
favicon and splash-screen mark.

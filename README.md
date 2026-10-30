# herdr-mods

My mods and layouts for the [Herdr app](https://herdr.dev). The repo mirrors the Herdr home folder, so `mods/<name>/` and `layouts/<name>.json` here map to the same paths under `~/.config/herdr-app`.

Run `bin/link` to symlink everything into the Herdr home. Herdr follows the links and hot-reloads on save. Run `herdr-app check ~/.config/herdr-app/mods/<name>` after each change.

## What's here

| Path | What it is |
|---|---|
| `layouts/main-emoji.json` | A clone of Herdr's `main` layout that uses `spaces-emoji` for the sidebar and `tabs-emoji` for the tab bar. |
| `mods/tabs-emoji/` | A clone of Herdr's `tabs` bar. It shows the active space's emoji before its tabs. Click it to pick another. |
| `mods/spaces-emoji/` | A clone of Herdr's `spaces` sidebar. It draws a space's emoji in place of its letter tile. Click the tile to pick one. |
| `mods/menu-emoji/` | A clone of Herdr's `menu`. It adds "Set emoji" to the space right-click menu in `spaces-emoji`. |
| `mods/space-emoji/` | The emoji picker popup. It stores picks by space ID in shared `space.emoji`. |

The clones don't get Herdr's updates to `main`, `spaces`, `tabs` and `menu`. To pick those up, clone the shipped versions again and reapply the changes.

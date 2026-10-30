# herdr-mods

My mods and layouts for the [Herdr app](https://herdr.dev). The repo mirrors the Herdr home folder, so `mods/<name>/` and `layouts/<name>.json` here map to the same paths under `~/.config/herdr-app`.

Run `bin/link` to symlink everything into the Herdr home. Herdr follows the links and hot-reloads on save. Run `herdr-app check ~/.config/herdr-app/mods/<name>` after each change.

## What's here

| Path | What it is |
|---|---|
| `layouts/main-emoji.json` | A clone of Herdr's `main` layout that uses `spaces-emoji` for the sidebar. |
| `mods/spaces-emoji/` | A clone of Herdr's `spaces` sidebar. It draws a space's emoji in place of its letter tile. Click the tile to pick one. |
| `mods/space-emoji/` | The emoji picker popup. It stores picks by space ID in shared `space.emoji`. |

The clones don't get Herdr's updates to `main` and `spaces`. To pick those up, clone the shipped versions again and reapply the changes.

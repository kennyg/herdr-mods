# herdr-mods

My layouts and mods for the [Herdr app](https://herdr.dev). Each top-level folder is one share, laid out like the Herdr home folder, with `layouts/` and `mods/` inside it. Each share has its own `RECIPE.md` and `preview.png`.

| Folder | What it is |
|---|---|
| [`main-emoji/`](main-emoji/RECIPE.md) | Herdr's main window with an emoji and a theme for each space. Emoji show in the spaces sidebar, the tab bar and the agents list. Themes come from Herdr and any installed Ghostty theme. |

## Install

Ask your agent to add a folder by its GitHub URL. It reads the recipe and every file first, then copies the layout and mods into `~/.config/herdr-app`.

## Working on these

Run `bin/link` to symlink every share's mods and layouts into the Herdr home. Herdr follows the links, but it doesn't hot-reload a running mod through them. After you edit a mod, run `herdr-app check ~/.config/herdr-app/mods/<name>`, then `bin/reload`. The reload script switches away from the shown layout and back, which restarts its mods.

Issues are welcome. Pull requests are limited to collaborators.

// A space's theme, picked from Herdr's themes and Ghostty's. Opened as a popup with
// props { space }; without one, the active space. Kept by space id in shared
// "space.themes"; the spaces-emoji sidebar applies it when that space shows.
// A Ghostty theme is converted to themes/ghostty-<name>.json the first time it's picked.
// Ghostty's themes are parsed once and kept in data/space-theme/ghostty.json until a
// theme folder changes; the list draws only the rows on screen.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Scrollbar, v_virtual_list } from "gpui-base";
import { spaces, focused, props, closeOverlay, theme, themes, settings, shared, setShared, run, exec, appHome, home, readTextFile, writeTextFile } from "herdr";

const GHOSTTY = ["/Applications/Ghostty.app/Contents/Resources/ghostty/themes", "~/.config/ghostty/themes"];
const ROW = 30;
const HEAD = 26;

const target = (p) => p.space ?? focused()?.space ?? spaces().find((s) => s.active)?.id;
const slug = (name) => "ghostty-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Relative luminance of #rrggbb, 0 (black) to 1 (white).
function luma(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// One Ghostty theme file, as Herdr's theme JSON fields; null if it lacks any of them.
function parse(text) {
  const t = { ansi: [] };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([a-z-]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "palette") {
      const p = value.match(/^(\d+)\s*=\s*(#?[0-9a-fA-F]{6})$/);
      if (p && +p[1] < 16) t.ansi[+p[1]] = "#" + p[2].replace("#", "").toLowerCase();
    } else if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
      const hex = "#" + value.replace("#", "").toLowerCase();
      if (key === "background") t.background = hex;
      else if (key === "foreground") t.foreground = hex;
      else if (key === "cursor-color") t.cursor = hex;
      else if (key === "selection-background") t.selection = hex;
    }
  }
  if (!t.background || !t.foreground || t.ansi.filter(Boolean).length !== 16) return null;
  t.selection ??= t.ansi[8];
  return t;
}

export default class SpaceTheme extends View {
  init(_props, cx) {
    this.ghostty = [];
    this.filter = "";
    this.busy = null;
    this.loading = true;
    this.input = InputState.new({ placeholder: "Search themes" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); cx.notify(); });
    this.input.on("submit", (_e, cx) => { const first = this.list()[0]; if (first) this.pick(first, cx); });
    this.input.focus();
    cx.timer.after(100, () => this.input.focus());
    cx.spawn(async (cx) => {
      this.ghostty = await this.load().catch(() => []);
      this.loading = false;
      cx.notify();
    });
  }

  // Ghostty's themes from the cache, or from their folders when one changed since.
  async load() {
    const dirs = GHOSTTY.map((d) => d.replace(/^~/, home()));
    const stamp = (await exec("sh", ["-c", 'for d in "$@"; do [ -d "$d" ] && stat -f "%N %m" "$d"; done; true', "sh", ...dirs])).stdout;
    const cache = `${appHome()}/data/space-theme/ghostty.json`;
    const old = await readTextFile(cache);
    try { const c = JSON.parse(old ?? "null"); if (c?.stamp === stamp) return c.themes; } catch {}
    // Every file in each folder, read in one go: "@@<name>" then its lines.
    const script = 'for d in "$@"; do [ -d "$d" ] || continue; for f in "$d"/*; do [ -f "$f" ] && printf "@@%s\\n" "${f##*/}" && cat "$f"; done; done';
    const r = await exec("sh", ["-c", script, "sh", ...dirs]);
    const seen = new Set(), out = [];
    for (const chunk of r.stdout.split("@@").slice(1)) {
      const nl = chunk.indexOf("\n");
      const name = chunk.slice(0, nl).trim();
      const t = parse(chunk.slice(nl + 1));
      if (!t || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, label: name, file: slug(name), light: luma(t.background) > 0.5, colors: t, ghostty: true });
    }
    await writeTextFile(cache, JSON.stringify({ stamp, themes: out }), old).catch(() => {});
    return out;
  }

  // Herdr's themes, then Ghostty's, in the system's appearance, matching the search.
  // Worked out again only when one of those changes, not on every frame.
  list() {
    const dark = settings().dark;
    const key = `${dark}\u0000${this.filter}\u0000${this.ghostty.length}\u0000${themes().length}\u0000${this.loading}`;
    if (this.listKey === key) return this.listed;
    const own = themes().filter((t) => !t.name.startsWith("ghostty-")).map((t) => ({
      name: t.name, label: t.name, file: t.name, light: t.light,
      colors: { background: t.colors.background, foreground: t.colors.foreground, ansi: Array.from({ length: 16 }, (_, i) => t.colors[`ansi${i}`]) },
    }));
    const q = this.filter.trim().toLowerCase();
    this.listKey = key;
    this.listed = [...own, ...this.ghostty].filter((t) => t.light !== dark && (!q || t.label.toLowerCase().includes(q)));
    this.byFile = new Map(this.listed.map((t) => [t.file, t]));
    // The list's rows: each source under its own header, Ghostty's shown while it loads.
    const mine = this.listed.filter((t) => !t.ghostty), theirs = this.listed.filter((t) => t.ghostty);
    this.rows = [
      ...(mine.length ? [{ head: "Herdr", count: mine.length }, ...mine] : []),
      ...(theirs.length || this.loading ? [{ head: "Ghostty", count: this.loading ? null : theirs.length }, ...theirs] : []),
    ];
    return this.listed;
  }

  pick(t, cx) {
    const p = props() ?? {};
    const id = target(p);
    if (!id || this.busy) return;
    this.busy = t.file;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        if (t.ghostty) await this.write(t);
        setShared("space.themes", { ...(shared("space.themes") ?? {}), [id]: t.file });
        if (spaces().find((s) => s.id === id)?.active) run("app.theme", { name: t.file });
        closeOverlay(p.overlay);
      } catch (e) {
        this.busy = null;
        this.error = `Couldn't use ${t.label}: ${e?.message ?? e}`;
        cx.notify();
      }
    });
  }

  // themes/ghostty-<name>.json, then a moment for Herdr to see it.
  async write(t) {
    const path = `${appHome()}/themes/${t.file}.json`;
    const { background, foreground, selection, cursor, ansi } = t.colors;
    const text = JSON.stringify({ background, foreground, selection, ...(cursor ? { cursor } : {}), ansi }, null, 2) + "\n";
    const old = await readTextFile(path);
    if (old !== text) await writeTextFile(path, text, old);
    for (let i = 0; i < 20 && !themes().some((x) => x.name === t.file); i++) await exec("sleep", ["0.1"]);
  }

  reset() {
    const p = props() ?? {};
    const id = target(p);
    const all = { ...(shared("space.themes") ?? {}) };
    delete all[id];
    setShared("space.themes", all);
    const base = shared("space.themes.base");
    if (base && spaces().find((s) => s.id === id)?.active) run("app.theme", { name: base });
    closeOverlay(p.overlay);
  }

  render(cx) {
    const t = theme();
    const p = props() ?? {};
    const id = target(p);
    const space = spaces().find((s) => s.id === id);
    const current = (shared("space.themes") ?? {})[id];
    const all = this.list();
    // Rows are drawn by the list, so they hold no handlers: the list reports the key clicked.
    const row = (th) => {
      const c = th.colors;
      return h_flex().h(ROW).px(6).gap(8).items_center().rounded(6).cursor_pointer()
        .when(th.file === current, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .child(h_flex().w(74).h(20).flex_none().px(6).gap(3).items_center().rounded(4).border_1().border_color(t.border).bg(c.background)
          .child(div().text_size(11).font_semibold().text_color(c.foreground).child("Aa"))
          .children([1, 2, 3, 4, 5, 6].map((i) => div().size(5).flex_none().rounded(3).bg(c.ansi[i] ?? c.foreground))))
        .child(div().flex_1().min_w(0).truncate().child(th.label))
        .when(this.busy === th.file, (el) => el.child(div().text_color(t.dim).child("…")));
    };
    const mode = settings().dark ? "dark" : "light";
    const rows = this.rows;
    const head = (r) => h_flex().h(HEAD).px(6).pt(6).gap(6).items_center().text_size(11).font_medium().text_color(t.dim)
      .child(r.head).child(div().text_color(t.dim).child(r.count === null ? "loading…" : String(r.count)))
      .child(div().flex_1().h(1).bg(t.border));
    return v_flex().size_full().bg(t.popover).p(10).gap(8).text_size(12).text_color(t.foreground)
      .child(h_flex().items_center().justify_between()
        .child(div().min_w(0).truncate().text_color(t.muted).child(`Theme for ${space?.name ?? "this space"}`))
        .when(Boolean(current), (el) => el.child(div().id("reset").flex_none().px(6).py(2).rounded(5).text_color(t.dim)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => this.reset())
          .child("Reset"))))
      .child(Input.new(this.input).h(28).flex_none().px(8).rounded(6).border_1().border_color(t.input).bg(t.background).text_size(12))
      .when(Boolean(this.error), (el) => el.child(div().text_color(t.blocked).child(this.error)))
      .child(div().relative().h(340).flex_none()
        .child(v_virtual_list("themes", rows.length, rows.map((r) => (r.head ? HEAD : ROW)), (i) => rows[i].head ? `head-${rows[i].head}` : rows[i].file,
          (range) => rows.slice(range.start, range.end).map((r) => (r.head ? head(r) : row(r))))
          .size_full()
          .on_item_click((file, cx) => { const th = this.byFile.get(file); if (th) this.pick(th, cx); }))
        .child(Scrollbar.vertical("themes").viewport_from_layout().absolute().inset_0()))
      .child(div().text_size(11).text_color(t.dim).child(`${all.length} ${mode} themes`));
  }
}

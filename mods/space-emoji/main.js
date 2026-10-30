// A space's emoji, picked from a grid or typed in. Opened as a popup with
// props { space }. Kept by space id in shared "space.emoji"; the
// spaces-emoji sidebar draws it in place of the space's letter tile.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, props, closeOverlay, theme, shared, setShared } from "herdr";

const GROUPS = [
  ["Work", ["🚀", "🔥", "⚡", "🛠️", "🧪", "🐛", "📦", "🧩", "🔧", "🧰", "📝", "📚"]],
  ["Places", ["🏠", "🏢", "🌍", "🏝️", "🏔️", "🌋", "🌌", "🛰️", "🏰", "🎪", "🗻", "🌉"]],
  ["Things", ["💎", "🎯", "🎲", "🎨", "🎧", "🎮", "🔮", "🧭", "🪐", "🧊", "🕹️", "📡"]],
  ["Nature", ["🌱", "🌵", "🍄", "🌊", "🌙", "☀️", "❄️", "🌈", "🌸", "🍁", "🌻", "🌲"]],
  ["Creatures", ["🐙", "🦊", "🐝", "🦄", "🐉", "🦀", "🐧", "🦉", "🐢", "🦋", "🐳", "🤖"]],
  ["Food", ["☕", "🍕", "🌮", "🍩", "🍣", "🥑", "🍋", "🍒", "🧁", "🍜", "🥨", "🍉"]],
];

function set(id, emoji) {
  const all = { ...(shared("space.emoji") ?? {}) };
  if (emoji) all[id] = emoji;
  else delete all[id];
  setShared("space.emoji", all);
}

export default class SpaceEmoji extends View {
  init(_props, cx) {
    this.input = InputState.new({ placeholder: "Or type or paste one, then Enter" });
    this.input.on("submit", (_e, cx) => {
      const typed = this.input.value().trim();
      if (typed) this.pick(typed);
    });
    this.input.focus();
    cx.timer.after(100, () => this.input.focus());
  }

  pick(emoji) {
    const p = props() ?? {};
    if (p.space) set(p.space, emoji);
    closeOverlay(p.overlay);
  }

  render() {
    const t = theme();
    const p = props() ?? {};
    const space = spaces().find((s) => s.id === p.space);
    const current = (shared("space.emoji") ?? {})[p.space];
    const cell = (e) =>
      h_flex().id(`e-${e}`).size(22).flex_none().rounded(5).items_center().justify_center().text_size(16).cursor_pointer()
        .when(e === current, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .on_click(() => this.pick(e))
        .child(e);
    return v_flex().size_full().bg(t.popover).p(10).gap(8).text_size(12).text_color(t.foreground)
      .child(h_flex().items_center().justify_between()
        .child(div().min_w(0).truncate().text_color(t.muted).child(`Emoji for ${space?.name ?? "this space"}`))
        .when(Boolean(current), (el) => el.child(div().id("remove").flex_none().px(6).py(2).rounded(5).text_color(t.dim)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => this.pick(null))
          .child("Remove"))))
      .child(Input.new(this.input).h(28).flex_none().px(8).rounded(6).border_1().border_color(t.input).bg(t.background).text_size(12))
      .child(v_flex().flex_1().min_h(0).gap(6).overflow_y_scrollbar().children(
        GROUPS.map(([name, list]) => v_flex().gap(2)
          .child(div().text_size(11).text_color(t.dim).child(name))
          .child(h_flex().flex_wrap().gap(1).children(list.map(cell))))));
  }
}

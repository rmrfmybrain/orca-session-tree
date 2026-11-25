// The panel's stylesheet: only Orca's theme variables (`--orca-*`) and a few status colours.
// Shared by the panel (frame.ts) and the screenshot renderer, so the two cannot drift.
export const STYLE = `
:root { color-scheme: light dark; }
html.light { color-scheme: light; } html.dark { color-scheme: dark; }
html, body { margin: 0; padding: 0; }
/* Opaque, the sidebar's own surface: on a transparent frame Orca's light text is drawn dark. */
html { background: var(--orca-card); }
body { font-family: var(--orca-font-sans, system-ui, sans-serif); font-size: 13px; line-height: 1.35;
  color: var(--orca-foreground); -webkit-font-smoothing: antialiased; user-select: none; }
.panel { padding: 4px 6px 24px; }
button { font: inherit; color: inherit; background: none; border: 0; margin: 0; padding: 0; cursor: pointer; text-align: left; }
.section { font-size: 11px; font-weight: 600; color: var(--orca-muted-foreground); padding: 12px 8px 4px; }
.row { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 26px; padding: 3px 8px;
  box-sizing: border-box; border-radius: calc(var(--orca-radius, 8px) - 2px); }
.row:hover { background: var(--orca-accent); color: var(--orca-accent-foreground); }
.row.current { background: var(--orca-accent); }
.d1 { padding-left: 26px; } .d2 { padding-left: 44px; }
.head { font-weight: 500; }
.title { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { flex: 0 0 auto; max-width: 48%; color: var(--orca-muted-foreground); font-size: 11.5px; font-weight: 400;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fold { color: var(--orca-muted-foreground); }
.row.unread .title { font-weight: 600; }
.recent { margin-top: 4px; }
.day { font-size: 11px; font-weight: 600; color: var(--orca-muted-foreground); padding: 10px 8px 3px; }
.recent .row.two { gap: 9px; padding-top: 6px; padding-bottom: 6px; }
.avatar { position: relative; flex: none; width: 22px; height: 22px; margin-top: 1px; border-radius: 6px;
  display: grid; place-items: center; font-size: 11px; font-weight: 700; line-height: 1; }
.avatar .dot { position: absolute; right: -3px; bottom: -3px; width: 9px; height: 9px; margin: 0; box-shadow: 0 0 0 2px var(--orca-card); }
.row:hover .avatar .dot, .row.current .avatar .dot { box-shadow: 0 0 0 2px var(--orca-accent); }
.wt { color: var(--orca-foreground); }
.wt .icon { opacity: .9; }
.c0 { --c: #6366f1; } .c1 { --c: #0284c7; } .c2 { --c: #0d9488; } .c3 { --c: #ea580c; }
.c4 { --c: #db2777; } .c5 { --c: #9333ea; } .c6 { --c: #65a30d; } .c7 { --c: #0891b2; }
html.dark .c0 { --c: #a5b4fc; } html.dark .c1 { --c: #7dd3fc; } html.dark .c2 { --c: #5eead4; } html.dark .c3 { --c: #fdba74; }
html.dark .c4 { --c: #f9a8d4; } html.dark .c5 { --c: #d8b4fe; } html.dark .c6 { --c: #bef264; } html.dark .c7 { --c: #67e8f9; }
.avatar { color: var(--c); background: color-mix(in srgb, var(--c) 20%, transparent); }
.sub { display: block; color: var(--orca-muted-foreground); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub .icon { width: 11px; height: 11px; vertical-align: -1px; margin-right: 3px; }
.row.two { align-items: flex-start; padding-top: 5px; padding-bottom: 5px; }
.row.two .dot { margin-top: 5px; }
.text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.snippet { color: var(--orca-muted-foreground); font-size: 12px; line-height: 1.35; white-space: normal;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.snippet .where { color: var(--orca-foreground); opacity: .8; }
.dot.unread { box-shadow: 0 0 0 2px color-mix(in srgb, var(--orca-foreground) 35%, transparent); }
.read { font-size: 13px; align-self: flex-start; margin-top: 3px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--orca-muted-foreground); }
.dot.working { background: #3b82f6; animation: pulse 1.6s ease-in-out infinite; }
.dot.waiting { background: #f59e0b; } .dot.blocked { background: #ef4444; } .dot.done { background: #22c55e; opacity: .75; }
html.dark .dot.working { background: #60a5fa; } html.dark .dot.blocked { background: #f87171; }
@keyframes pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .dot.working { animation: none; } }
.chev { width: 12px; height: 12px; flex: none; position: relative; color: var(--orca-muted-foreground); }
.chev::before { content: ''; position: absolute; left: 2px; top: 3px; width: 5px; height: 5px;
  border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(-45deg); transition: transform .12s; }
.chev.open::before { transform: rotate(45deg); left: 3px; top: 2px; }
.icon { width: 14px; height: 14px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.3;
  stroke-linecap: round; stroke-linejoin: round; opacity: .7; }
.project { display: flex; align-items: center; gap: 2px; }
.project > .row { flex: 1; min-width: 0; }
.plus { flex: none; width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center;
  color: var(--orca-muted-foreground); font-size: 17px; line-height: 1; opacity: .55; text-align: center; }
.open-ws { font-size: 12px; opacity: 0; }
.project:hover .plus, .plus.on, .plus:focus-visible { opacity: 1; }
.plus:hover, .plus.on { background: var(--orca-accent); color: var(--orca-accent-foreground); }
.row:focus-visible, .plus:focus-visible, .chip:focus-visible, .name:focus-visible, .mi:focus-visible {
  outline: 2px solid var(--orca-ring); outline-offset: -2px; }
.menu { margin: 2px 4px 6px 26px; padding: 8px; display: grid; gap: 6px; border: 1px solid var(--orca-border);
  border-radius: var(--orca-radius, 8px); background: var(--orca-popover); color: var(--orca-popover-foreground);
  box-shadow: 0 6px 18px rgb(0 0 0 / .18); }
.label { font-size: 11px; color: var(--orca-muted-foreground); }
.viewbar { padding: 4px 2px 0; }
.viewbar .segs { display: flex; }
.viewbar .seg { flex: 1; text-align: center; padding: 3px 10px; }
.openas { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.segs { display: inline-flex; padding: 2px; gap: 2px; border-radius: 7px; background: var(--orca-muted); }
.seg { padding: 2px 10px; border-radius: 5px; font-size: 12px; color: var(--orca-muted-foreground); }
.seg.on { background: var(--orca-background); color: var(--orca-foreground); box-shadow: 0 1px 2px rgb(0 0 0 / .25); }
.seg:focus-visible { outline: 2px solid var(--orca-ring); outline-offset: -2px; }
.label + .label, .chips + .label { margin-top: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { padding: 3px 10px; border-radius: 999px; font-size: 12px; border: 1px solid var(--orca-border);
  background: var(--orca-secondary); color: var(--orca-secondary-foreground); }
.chip.main { background: var(--orca-primary); color: var(--orca-primary-foreground); border-color: transparent; }
.chip:hover:not(:disabled) { filter: brightness(1.12); }
.chip:disabled { opacity: .45; cursor: default; }
.name { width: 100%; box-sizing: border-box; padding: 5px 8px; border-radius: 6px; border: 1px solid var(--orca-input);
  background: transparent; color: inherit; font: inherit; font-size: 12px; user-select: text; }
.hint { color: var(--orca-muted-foreground); font-size: 12px; padding: 4px 8px; }
.empty { color: var(--orca-muted-foreground); padding: 12px 8px; }
.banner { margin: 4px 2px; padding: 6px 8px; border-radius: 6px; font-size: 12px;
  background: color-mix(in srgb, var(--orca-destructive) 18%, transparent); }
/* The right-click menu: positioned by frame.ts where the click was. */
.ctx { position: fixed; z-index: 10; min-width: 190px; max-width: 280px; padding: 4px; display: grid; gap: 1px;
  border: 1px solid var(--orca-border); border-radius: var(--orca-radius, 8px);
  background: var(--orca-popover); color: var(--orca-popover-foreground); box-shadow: 0 8px 24px rgb(0 0 0 / .28); }
.mi { padding: 5px 8px; border-radius: 5px; font-size: 12.5px; }
.mi:hover { background: var(--orca-accent); color: var(--orca-accent-foreground); }
.mi.danger { color: var(--orca-destructive); }
.mwarn { padding: 6px 8px 4px; font-size: 12px; color: var(--orca-muted-foreground); white-space: normal; }
.mrow { display: flex; gap: 4px; padding: 2px 4px 4px; }
.mrow .mi { flex: 1; text-align: center; border: 1px solid var(--orca-border); }
`

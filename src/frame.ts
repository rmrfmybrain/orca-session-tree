// The panel's page: what is open, and what clicks, right-clicks and keys do. The markup is
// view.ts and the stylesheet style.ts (both pure, shared with tests and the screenshot renderer);
// this file only wires them to the frame.
import { buildView, type ViewState } from './view'
import type { Snapshot } from './model'
import { NEW_AGENT_KEY, SURFACE_KEY, type ActionResult } from './protocol'
import { STYLE } from './style'

/** Native chats send no status events, so the list is also re-read on this beat. */
const POLL_MS = 15_000
const RELOAD_DEBOUNCE_MS = 250
/** A second click or a double click on the same button within this window acts only once. */
const ONCE_MS = 1000
const OPEN_KEY = 'st.tree'
const MODE_KEY = 'st.view'

const style = document.createElement('style')
style.textContent = STYLE
document.head.append(style)
const root = document.createElement('div')
root.className = 'panel'
document.body.append(root)

let snapshot: Snapshot | null = null
let loadError: string | null = null
const ui: ViewState = {
  open: {},
  menu: null,
  worktreeName: '',
  agent: 'claude',
  surface: 'chat',
  mode: 'tree',
  ctx: null,
  busy: false,
  error: null
}
/** Where the right-click menu opens. */
let ctxAt = { x: 0, y: 0 }
/** The left click that dismissed the menu does nothing else, as in Orca's own menus. */
let swallowClick = false
let last = { key: '', at: 0 }
let loading = false
let again = false
let reloadTimer: ReturnType<typeof setTimeout> | null = null

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** Redraws, puts focus (and a typed caret) back on the same control, and places the menu. */
function render(): void {
  const active = document.activeElement instanceof HTMLElement && root.contains(document.activeElement) ? document.activeElement : null
  const mark = active ? { act: active.dataset.act, key: active.dataset.key, agent: active.dataset.agent, focus: active.dataset.focus } : null
  const caret = active instanceof HTMLInputElement ? [active.selectionStart, active.selectionEnd] : null
  root.innerHTML = buildView(snapshot, ui, Date.now(), orca.locale, loadError)
  const menu = root.querySelector<HTMLElement>('.ctx')
  if (menu) {
    // Kept inside the panel: flipped left or up when it would run past an edge.
    const { width, height } = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(4, Math.min(ctxAt.x, window.innerWidth - width - 4))}px`
    menu.style.top = `${Math.max(4, ctxAt.y + height > window.innerHeight - 4 ? ctxAt.y - height : ctxAt.y)}px`
  }
  if (!mark) return
  const back = Array.from(root.querySelectorAll<HTMLElement>('[data-act], [data-focus]')).find(
    (el) => el.dataset.act === mark.act && el.dataset.key === mark.key && el.dataset.agent === mark.agent && el.dataset.focus === mark.focus
  )
  back?.focus()
  if (back instanceof HTMLInputElement && caret) back.setSelectionRange(caret[0], caret[1])
}

async function load(): Promise<void> {
  if (loading) {
    again = true
    return
  }
  loading = true
  try {
    snapshot = await orca.plugin.request('live.load', undefined, { timeoutMs: 30_000 })
    loadError = null
  } catch (error) {
    loadError = message(error)
  } finally {
    loading = false
    render()
    if (again) {
      again = false
      void load()
    }
  }
}

function scheduleLoad(): void {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => void load(), RELOAD_DEBOUNCE_MS)
}

async function act(run: () => Promise<ActionResult>): Promise<void> {
  if (ui.busy) return
  ui.busy = true
  ui.error = null
  render()
  try {
    const result = await run()
    if (!result.ok) ui.error = result.message ?? result.code ?? null
  } catch (error) {
    ui.error = message(error)
  } finally {
    ui.busy = false
    scheduleLoad()
    render()
  }
}

function once(key: string): boolean {
  const at = Date.now()
  if (last.key === key && at - last.at < ONCE_MS) return false
  last = { key, at }
  return true
}

function useAgent(agent: string): void {
  ui.agent = agent
  void orca.storage.set(NEW_AGENT_KEY, agent)
}

function startWorktree(repo: string, agent: string): void {
  const name = ui.worktreeName.trim()
  if (!name) return
  useAgent(agent)
  ui.menu = null
  ui.worktreeName = ''
  void act(() => orca.plugin.request('worktree.start', { repo, name, agent, surface: ui.surface }))
}

/** Closes the right-click menu without redrawing the rows under the pointer. */
function closeCtx(): void {
  if (!ui.ctx) return
  ui.ctx = null
  root.querySelector('.ctx')?.remove()
}

// The menu closes on a press anywhere outside it (empty space below the list included), when
// focus leaves the panel for the rest of Orca, and when the panel scrolls or resizes.
document.addEventListener(
  'pointerdown',
  (event) => {
    swallowClick = false
    if (!ui.ctx || (event.target instanceof Element && event.target.closest('.ctx'))) return
    closeCtx()
    swallowClick = event.button === 0
  },
  true
)
window.addEventListener('blur', closeCtx)
window.addEventListener('resize', closeCtx)
document.addEventListener('scroll', closeCtx, true)

root.addEventListener('click', (event) => {
  const target = event.target as HTMLElement
  if (swallowClick) {
    swallowClick = false
    return
  }
  // A keyboard click elsewhere (no pointer press first) also just closes the menu.
  if (ui.ctx && !target.closest('.ctx')) return closeCtx()
  const el = target.closest<HTMLElement>('[data-act]')
  if (!el || (el instanceof HTMLButtonElement && el.disabled)) return
  const { act: what = '', key = '', agent = '' } = el.dataset
  if (what === 'ctx-remove' && ui.ctx) {
    ui.ctx = { ...ui.ctx, confirm: true }
    return render()
  }
  // Any other choice in the menu closes it.
  if (el.closest('.ctx')) ui.ctx = null
  if (what === 'ctx-cancel') return render()
  if (what === 'toggle') {
    ui.open[key] = el.getAttribute('aria-expanded') !== 'true'
    void orca.storage.set(OPEN_KEY, ui.open)
    return render()
  }
  if (what === 'menu') {
    ui.menu = ui.menu === key ? null : key
    ui.worktreeName = ''
    return render()
  }
  if (what === 'mode') {
    ui.mode = key === 'recent' ? 'recent' : 'tree'
    void orca.storage.set(MODE_KEY, ui.mode)
    return render()
  }
  if (what === 'surface') {
    ui.surface = key === 'terminal' ? 'terminal' : 'chat'
    void orca.storage.set(SURFACE_KEY, ui.surface)
    return render()
  }
  if (!once(`${what}:${key}:${agent}`)) return
  if (what === 'open') {
    const found = snapshot?.agents.find((a) => a.key === key)
    if (found) void act(() => orca.plugin.request('session.open', { terminalId: found.terminalId, workspaceId: found.workspaceId }))
  } else if (what === 'read' || what === 'ctx-read' || what === 'ctx-unread') {
    void act(() => orca.plugin.request('workspace.mark', { selector: key, read: what !== 'ctx-unread' }))
  } else if (what === 'ctx-close') {
    void act(() => orca.plugin.request('terminal.close', { terminalId: key }))
  } else if (what === 'ctx-remove-yes') {
    void act(() => orca.plugin.request('workspace.remove', { selector: key }))
  } else if (what === 'ctx-hide') {
    void act(() => orca.plugin.request('project.hide', { projectId: key }))
  } else if (what === 'open-ws') {
    void act(() => orca.plugin.request('session.open', { terminalId: null, workspaceId: key }))
  } else if (what === 'chat') {
    const found = snapshot?.targets.find((x) => x.key === key)
    if (!found) return
    useAgent(agent)
    ui.menu = null
    void act(() => orca.plugin.request('chat.start', { selector: found.selector, agent, surface: ui.surface }))
  } else if (what === 'worktree') {
    startWorktree(key, agent)
  }
})

// Right-click: a menu for the session, worktree or project under the pointer.
root.addEventListener('contextmenu', (event) => {
  event.preventDefault()
  const el = (event.target as HTMLElement).closest<HTMLElement>('[data-act]')
  const { act: what = '', key = '' } = el?.dataset ?? {}
  const kind = what === 'open' ? 'session' : key.startsWith('p:') ? 'project' : key.startsWith('w:') ? 'worktree' : null
  ui.ctx = kind ? { kind, key: kind === 'session' ? key : key.slice(2), confirm: false } : null
  ctxAt = { x: event.clientX, y: event.clientY }
  render()
  // No scroll: scrolling closes the menu.
  root.querySelector<HTMLElement>('.ctx .mi')?.focus({ preventScroll: true })
})

root.addEventListener('input', (event) => {
  const el = event.target
  if (el instanceof HTMLInputElement && el.classList.contains('name')) {
    ui.worktreeName = el.value
    render()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && ui.ctx) {
    closeCtx()
  } else if (event.key === 'Escape' && ui.menu) {
    ui.menu = null
    render()
  } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.classList.contains('name')) {
    startWorktree(event.target.dataset.key ?? '', ui.agent)
  }
})

async function start(): Promise<void> {
  const [open, agent, surface, mode] = await Promise.all(
    [OPEN_KEY, NEW_AGENT_KEY, SURFACE_KEY, MODE_KEY].map((key) => orca.storage.get(key).catch(() => null))
  )
  if (open && typeof open === 'object' && !Array.isArray(open)) ui.open = open as Record<string, boolean>
  if (surface === 'terminal') ui.surface = 'terminal'
  if (mode === 'recent') ui.mode = 'recent'
  render()
  await load()
  // The agent last used, else Orca's default one.
  ui.agent = typeof agent === 'string' ? agent : (snapshot?.installed.find((a) => a.default)?.id ?? ui.agent)
  render()
}

orca.plugin.on('live.changed', () => scheduleLoad())
// Moves the highlight to the workspace you switch to.
orca.on('workspace.changed', () => scheduleLoad())
setInterval(() => void load(), POLL_MS)
void start()

// The panel's markup, as a pure function of what Orca listed and what the person opened, so it can
// be tested without a browser. Every piece of text goes through `esc`: titles come from agents.
// Rows carry `data-act` (what a click does) and `data-key`; frame.ts acts on them.
import { strings } from './i18n'
import { DAY_MS, projectTree, type LiveAgent, type ProjectBranch, type Snapshot, type Target } from './model'
import type { Surface } from './protocol'

export interface ViewState {
  /** Row key -> open, as the person left it; unset rows follow their default. */
  open: Record<string, boolean>
  /** The project whose "new chat" menu is open. */
  menu: string | null
  /** What is typed as the new worktree's name. */
  worktreeName: string
  /** The agent last used for a new chat: its button is the prominent one. */
  agent: string
  /** How the next agent opens; kept across runs. */
  surface: Surface
  /** The project tree, or one flat list of every session, newest first; kept across runs. */
  mode: 'tree' | 'recent'
  /** The right-click menu: on a session (its key), a worktree (its workspace id) or a project. */
  ctx: { kind: 'session' | 'worktree' | 'project'; key: string; confirm: boolean } | null
  busy: boolean
  error: string | null
}

// 16px line icons in the style of Orca's own (stroke, round caps); CSS sets size and colour.
const ICON_PATHS: Record<string, string> = {
  folder: '<path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/>',
  group: '<path d="M8 2.5 13.5 5 8 7.5 2.5 5z"/><path d="M2.5 8 8 10.5 13.5 8"/><path d="M2.5 11 8 13.5 13.5 11"/>',
  branch:
    '<circle cx="5" cy="3.5" r="1.5"/><circle cx="5" cy="12.5" r="1.5"/><circle cx="11" cy="5" r="1.5"/><path d="M5 5v6"/><path d="M11 6.5c0 2.5-2 3.5-6 4"/>',
  // A worktree: the checkout forked off into a folder of its own.
  worktree:
    '<circle cx="4" cy="3.5" r="1.5"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="8" cy="12.5" r="1.5"/><path d="M4 5v1.2c0 .7.5 1.3 1.2 1.3h5.6c.7 0 1.2-.6 1.2-1.3V5"/><path d="M8 7.5V11"/>'
}
type IconName = 'folder' | 'group' | 'branch' | 'worktree'
const icon = (name: IconName) => `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true">${ICON_PATHS[name]}</svg>`

/** How many project colours the stylesheet defines (`.c0`…). */
const PALETTE = 8

/** A steady colour per project, so one project's sessions look alike wherever they sit. */
export function colorSlot(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return hash % PALETTE
}

/** Which day heading a time falls under, by the local calendar. */
export function dayBucket(at: number, now: number): 'today' | 'yesterday' | 'older' {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const start = midnight.getTime()
  return at >= start ? 'today' : at >= start - DAY_MS ? 'yesterday' : 'older'
}

/** A path under the home folder as `~/…`. */
const tilde = (path: string) => path.replace(/^\/(?:Users|home)\/[^/]+(?=\/|$)/, '~')

/** An answer's start as one plain line: Markdown marks and line breaks dropped. */
function plain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

const attr = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([k, v]) => ` data-${k}="${esc(v)}"`)
    .join('')

export function buildView(current: Snapshot | null, ui: ViewState, now: number, locale: string, loadError: string | null): string {
  const s = strings(locale)
  const ago = (at: number) => s.ago(now - at)
  const fresh = now - DAY_MS
  const isOpen = (key: string, byDefault: boolean) => ui.open[key] ?? byDefault
  const agentName = (id: string | null) => current?.installed.find((a) => a.id === id)?.name ?? id ?? 'Agent'
  const usual = ui.agent
  const error = ui.error ?? loadError
  const banner = error ? `<div class="banner" role="alert">${esc(s.failed)}: ${esc(error)}</div>` : ''
  if (!current) return `${banner}${loadError ? '' : `<div class="empty">${esc(s.loading)}</div>`}`

  // The right-click menu, drawn last; frame.ts puts it where the click was.
  const item = (act: string, key: string, label: string, danger = false) =>
    `<button class="mi${danger ? ' danger' : ''}" role="menuitem"${attr({ act, key })}>${esc(label)}</button>`
  const removal = (selector: string, worktree: boolean, key: string) =>
    ui.ctx?.confirm
      ? `<div class="mwarn">${esc(worktree ? s.menu.deleteWarn : s.menu.removeWarn)}</div><div class="mrow">` +
        item('ctx-remove-yes', selector, worktree ? s.menu.delete : s.menu.remove, true) +
        item('ctx-cancel', '', s.menu.cancel) +
        `</div>`
      : item('ctx-remove', key, worktree ? s.menu.deleteWorktree : s.menu.removeWorkspace, true)
  const ctxItems = (): string => {
    const ctx = ui.ctx
    if (!ctx) return ''
    if (ctx.kind === 'project') {
      const target = current.targets.find((t) => t.key === ctx.key)
      if (!target) return ''
      return item('menu', target.key, s.menu.newChat) + (target.kind === 'group' ? '' : item('ctx-hide', target.key, s.menu.hideProject))
    }
    if (ctx.kind === 'worktree') {
      const a = current.agents.find((x) => x.workspaceId === ctx.key)
      return item('open-ws', ctx.key, s.menu.open) + (a?.selector && a.removable ? removal(a.selector, a.worktree !== null, ctx.key) : '')
    }
    const a = current.agents.find((x) => x.key === ctx.key)
    if (!a) return ''
    return (
      item('open', a.key, s.menu.open) +
      (a.selector ? item(a.unread ? 'ctx-read' : 'ctx-unread', a.selector, a.unread ? s.markRead : s.menu.markUnread) : '') +
      (a.terminalId ? item('ctx-close', a.terminalId, s.menu.closeTab) : '') +
      (a.selector && a.removable ? removal(a.selector, a.worktree !== null, a.key) : '')
    )
  }
  const items = ctxItems()
  const ctxMenu = items ? `<div class="ctx" role="menu">${items}</div>` : ''

  const dot = (agent: LiveAgent) =>
    `<span class="dot ${agent.state}${agent.unread ? ' unread' : ''}" title="${esc(agent.unread ? s.unread : s.state[agent.state])}"></span>`
  // One line: the title keeps the room; a worktree's name is in the tooltip, not the line.
  const sessionRow = (agent: LiveAgent, depth: number, where: boolean) =>
    `<button class="row d${depth}${agent.current ? ' current' : ''}${agent.unread ? ' unread' : ''}"` +
    (where ? ` title="${esc(`${agent.title} — ${agent.where}`)}"` : '') +
    `${attr({ act: 'open', key: agent.key })}>` +
    `${dot(agent)}<span class="title">${esc(agent.title)}</span>` +
    `<span class="meta">${esc([where ? agent.project : null, agent.agent !== usual ? agentName(agent.agent) : null, ago(agent.updatedAt)].filter(Boolean).join(' · '))}</span>` +
    `</button>`
  const seg = (act: string, value: string, text: string, on: boolean) =>
    `<button class="seg${on ? ' on' : ''}" aria-pressed="${on}"${attr({ act, key: value })}>${esc(text)}</button>`
  const viewBar =
    `<div class="viewbar"><div class="segs" role="group" aria-label="${esc(s.viewLabel)}">` +
    seg('mode', 'tree', s.viewTree, ui.mode === 'tree') +
    seg('mode', 'recent', s.viewRecent, ui.mode === 'recent') +
    `</div></div>`
  if (ui.mode === 'recent') {
    const kindOf = (a: LiveAgent) => current.targets.find((t) => t.key === a.projectKey)?.kind ?? (a.group ? 'group' : 'git')
    /**
     * The second line: the project, then a worktree's icon and branch (or a main checkout's
     * branch), or a folder's or group's place on disk. `html` false gives the tooltip's text.
     */
    const place = (a: LiveAgent, html: boolean) => {
      const kind = kindOf(a)
      const mark = (name: IconName) => (html ? icon(name) : '')
      if (kind !== 'git') return `${esc(a.project)} · ${mark(kind === 'group' ? 'group' : 'folder')}${esc(tilde(a.path))}`
      const branch = a.branch ?? a.worktree
      if (!branch) return esc(a.project)
      return a.worktree
        ? `${esc(a.project)} · <span class="wt">${mark('worktree')}${esc(branch)}</span>`
        : `${esc(a.project)} · ${mark('branch')}${esc(branch)}`
    }
    // A coloured initial per project, the status dot on its corner.
    const avatar = (a: LiveAgent) =>
      `<span class="avatar c${colorSlot(a.projectKey)}" aria-hidden="true">${esc((a.project.match(/\p{L}|\d/u)?.[0] ?? '?').toUpperCase())}${dot(a)}</span>`
    const tip = (a: LiveAgent) =>
      `${a.title} — ${kindOf(a) === 'group' ? s.group(a.project) : a.project}` +
      (a.worktree ? ` · ${s.worktree}: ${a.worktree}` : '') +
      (a.branch ? ` · ${a.branch}` : '')
    // The tooltip holds the whole second line, which a long branch cuts short.
    const recentRow = (a: LiveAgent) =>
      `<button class="row two${a.current ? ' current' : ''}${a.unread ? ' unread' : ''}" title="${esc(tip(a))}"${attr({ act: 'open', key: a.key })}>` +
      `${avatar(a)}<span class="text"><span class="line"><span class="title">${esc(a.title)}</span>` +
      `<span class="meta">${esc([a.agent !== usual ? agentName(a.agent) : null, ago(a.updatedAt)].filter(Boolean).join(' · '))}</span></span>` +
      `<span class="sub">${place(a, true)}</span></span></button>`
    // Every open session, newest first, under a heading for its day.
    let day = ''
    const list = current.agents.map((a) => {
      const bucket = dayBucket(a.updatedAt, now)
      const heading = bucket === day ? '' : `<div class="day">${esc(s.day[bucket])}</div>`
      day = bucket
      return heading + recentRow(a)
    })
    return (
      banner +
      viewBar +
      `<div class="recent">` +
      (current.agents.length === 0 ? `<div class="hint">${esc(s.nothingHint)}</div>` : list.join('')) +
      `</div>` +
      ctxMenu
    )
  }
  const fold = (key: string, depth: number, label: string, open: boolean, extra = '') =>
    `<button class="row fold d${depth}" aria-expanded="${open}"${attr({ act: 'toggle', key })}>` +
    `<span class="chev${open ? ' open' : ''}"></span>${label}${extra}</button>`

  const menu = (target: Target) => {
    const chips = (act: string, disabled: boolean) =>
      `<div class="chips">${current.installed
        .map(
          (a) =>
            `<button class="chip${a.id === usual ? ' main' : ''}"${disabled ? ' disabled' : ''}${attr({ act, key: target.key, agent: a.id })}>${esc(a.name)}</button>`
        )
        .join('')}</div>`
    const here = s.chatHere[target.kind]
    const surface = (value: Surface, text: string) => seg('surface', value, text, ui.surface === value)
    const openAs =
      `<div class="openas"><span class="label">${esc(s.openAs)}</span>` +
      `<div class="segs" role="group" aria-label="${esc(s.openAs)}">${surface('chat', s.surfaceChat)}${surface('terminal', s.surfaceCli)}</div></div>`
    const worktree =
      target.kind === 'git' && !target.worktreesBlocked
        ? `<div class="label">${esc(s.inNewWorktree)}</div>` +
          `<input class="name" placeholder="${esc(s.worktreeName)}" value="${esc(ui.worktreeName)}" maxlength="80"${attr({ focus: `name:${target.key}`, key: target.key })}>` +
          chips('worktree', ui.busy || ui.worktreeName.trim() === '')
        : ''
    return `<div class="menu">${openAs}<div class="label">${esc(here)}</div>${chips('chat', ui.busy)}${worktree}</div>`
  }

  const projectBlock = (key: string, name: string, kind: Target['kind'], project: ProjectBranch | undefined, target: Target | undefined) => {
    const sessions = project?.sessions ?? []
    const worktrees = project?.worktrees ?? []
    const all = [...sessions, ...worktrees.flatMap((w) => w.sessions)]
    const latest = project?.latest ?? target?.lastActivityAt ?? 0
    const open = isOpen(`p:${key}`, project !== undefined && latest >= fresh)
    const busy = all.filter((a) => a.state !== 'done')
    const tone = busy.some((a) => a.state === 'blocked') ? 'blocked' : busy.some((a) => a.state === 'waiting') ? 'waiting' : busy.length > 0 ? 'working' : ''
    const label = kind === 'group' ? s.group(name) : name
    const head =
      `<div class="project${all.some((a) => a.current) ? ' here' : ''}">` +
      `<button class="row head" aria-expanded="${open}"${attr({ act: 'toggle', key: `p:${key}` })}>` +
      `<span class="chev${open ? ' open' : ''}"></span>${icon(kind === 'group' ? 'group' : 'folder')}` +
      `<span class="title">${esc(label)}</span>` +
      (tone ? `<span class="dot ${tone}"></span>` : '') +
      `<span class="meta">${esc([all.length > 0 ? s.sessionsCount(all.length) : null, latest > 0 ? ago(latest) : null].filter(Boolean).join(' · '))}</span>` +
      `</button>` +
      (target
        ? `<button class="plus${ui.menu === target.key ? ' on' : ''}" title="${esc(s.newChatIn(label))}" aria-label="${esc(s.newChatIn(label))}"${attr({ act: 'menu', key: target.key })}>+</button>`
        : '') +
      `</div>`
    const body: string[] = []
    if (target && ui.menu === target.key) body.push(menu(target))
    if (open) {
      const old = latest >= fresh ? sessions.filter((a) => a.updatedAt < fresh) : []
      for (const a of sessions) if (!old.includes(a)) body.push(sessionRow(a, 1, false))
      if (old.length > 0) {
        const olderOpen = isOpen(`o:${key}`, false)
        body.push(fold(`o:${key}`, 1, esc(s.older(old.length)), olderOpen))
        if (olderOpen) for (const a of old) body.push(sessionRow(a, 2, false))
      }
      for (const w of worktrees) {
        const wOpen = isOpen(`w:${w.workspaceId}`, w.latest >= fresh)
        body.push(
          `<div class="project"><button class="row d1" aria-expanded="${wOpen}"${attr({ act: 'toggle', key: `w:${w.workspaceId}` })}>` +
            `<span class="chev${wOpen ? ' open' : ''}"></span>${icon('branch')}<span class="title">${esc(w.name)}</span>` +
            `<span class="meta">${esc(ago(w.latest))}</span></button>` +
            `<button class="plus open-ws" title="${esc(s.openWorktree)}" aria-label="${esc(s.openWorktree)}"${attr({ act: 'open-ws', key: w.workspaceId })}>↗</button></div>`
        )
        if (wOpen) for (const a of w.sessions) body.push(sessionRow(a, 2, false))
      }
      if (all.length === 0 && !(target && ui.menu === target.key)) body.push(`<div class="hint d1">${esc(s.noSessions)}</div>`)
    }
    return head + body.join('')
  }

  const targets = new Map(current.targets.map((x) => [x.key, x]))
  const withSessions = projectTree(current.agents)
  const blocks = withSessions.map((p) => {
    const target = targets.get(p.key)
    return projectBlock(p.key, p.name, target?.kind ?? (p.group ? 'group' : 'git'), p, target)
  })
  const quiet = current.targets.filter((x) => !withSessions.some((p) => p.key === x.key))
  let others = ''
  if (quiet.length > 0) {
    const quietBlocks = quiet.map((x) => projectBlock(x.key, x.name, x.kind, undefined, x))
    if (blocks.length === 0) blocks.push(...quietBlocks)
    else {
      const open = isOpen('g:others', false)
      others = fold('g:others', 0, esc(s.otherProjects(quiet.length)), open) + (open ? quietBlocks.join('') : '')
    }
  }

  const active = current.agents.filter((a) => a.state !== 'done')
  const now_ =
    active.length > 0
      ? `<div class="section">${esc(s.activeCount(active.length))}</div>${active.map((a) => sessionRow(a, 0, true)).join('')}`
      : ''
  // Finished and not looked at: what to read, answer or close. Opening one clears it.
  const unread = current.agents.filter((a) => a.unread)
  const unreadRow = (a: LiveAgent) =>
    `<div class="project">` +
    `<button class="row two unread${a.current ? ' current' : ''}"${attr({ act: 'open', key: a.key })}>` +
    // The title gets the first line to itself; where it ran leads the second, before the answer.
    `${dot(a)}<span class="text"><span class="line"><span class="title">${esc(a.title)}</span>` +
    `<span class="meta">${esc([a.agent !== usual ? agentName(a.agent) : null, ago(a.updatedAt)].filter(Boolean).join(' · '))}</span></span>` +
    `<span class="snippet"><span class="where">${esc(a.where)}</span>${a.lastMessage ? ` · ${esc(plain(a.lastMessage))}` : ''}</span>` +
    `</span></button>` +
    (a.selector
      ? `<button class="plus read" title="${esc(s.markRead)}" aria-label="${esc(`${s.markRead}: ${a.title}`)}"${attr({ act: 'read', key: a.selector })}>✓</button>`
      : '') +
    `</div>`
  const unread_ =
    unread.length > 0 ? `<div class="section">${esc(s.unreadCount(unread.length))}</div>${unread.map(unreadRow).join('')}` : ''
  return (
    banner +
    viewBar +
    now_ +
    unread_ +
    `<div class="section">${esc(s.projects)}</div>` +
    (current.agents.length === 0 ? `<div class="hint">${esc(s.nothingHint)}</div>` : '') +
    blocks.join('') +
    others +
    ctxMenu
  )
}

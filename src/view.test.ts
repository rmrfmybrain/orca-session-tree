import { assert, test } from 'orca/testing'
import { buildView, colorSlot, dayBucket, esc, type ViewState } from './view'
import { NOW, snapshot } from './fixtures'
import { DAY_MS } from './model'
import { strings, tableFor } from './i18n'

const ui = (over: Partial<ViewState> = {}): ViewState => ({
  open: {},
  menu: null,
  worktreeName: '',
  agent: 'claude',
  surface: 'chat',
  mode: 'tree',
  ctx: null,
  busy: false,
  error: null,
  ...over
})
const html = (over: Partial<ViewState> = {}, live = snapshot()) => buildView(live, ui(over), NOW, 'en', null)
/** The text of every row (button) in order, tags stripped. */
const rows = (markup: string) =>
  Array.from(markup.matchAll(/<button[^>]*class="(row[^"]*)"[^>]*>(.*?)<\/button>/g)).map((m) => m[2].replace(/<[^>]+>/g, '').trim())
/** The labels of the right-click menu's items, in order. */
const menuItems = (markup: string) =>
  Array.from(markup.matchAll(/<button class="mi[^"]*" role="menuitem"[^>]*>(.*?)<\/button>/g)).map((m) => m[1])
const count = (markup: string, needle: string) => markup.split(needle).length - 1

test('Now on top with coloured dots; then projects, a worktree’s sessions under it, day-old ones folded', () => {
  const markup = html()
  assert.deepEqual(rows(markup), [
    'Refactor the cartwebshop · 1m',
    'Add Stripe webhookswebshop · Codex · 5m',
    // Unread: title, where and when, and the start of the answer as plain text.
    'Logging2mplatform · Done: logging moved to billing. Next, the API.',
    'webshop4 sessions · 1m',
    'Refactor the cart1m',
    'Quick question30m',
    'Older · 1',
    'payments5m',
    'Add Stripe webhooksCodex · 5m',
    'platform (group)2 sessions · 2m',
    'Logging2m',
    'Older chat1h',
    'Other projects · 1'
  ])
  assert.ok(markup.includes('class="dot working"'))
  assert.ok(markup.includes('class="dot blocked"'))
  // The open workspace's sessions are marked: in Now and in the tree.
  assert.equal(count(markup, ' current"'), 3)
})

test('Unread: finished sessions you have not opened, with a way to dismiss them', () => {
  const markup = html()
  assert.ok(markup.includes('Unread · 1'))
  assert.ok(markup.includes('data-act="read" data-key="folder:group1"'))
  // In the tree it stands out too, and only the newest finished one in that workspace.
  assert.equal(count(markup, 'class="row d1 unread"'), 1)
  assert.equal(count(markup, 'class="dot done unread"'), 2)
  const read = snapshot()
  read.agents = read.agents.map((a) => ({ ...a, unread: false }))
  assert.ok(!html({}, read).includes('Unread ·'))
})

test('+ on a Git project offers a chat without a worktree and one in a new, named worktree', () => {
  assert.ok(html().includes('data-act="menu" data-key="p-shop"'))
  const open = html({ menu: 'p-shop' })
  assert.ok(open.includes('Without a worktree, in the main checkout'))
  assert.ok(open.includes('In a new worktree'))
  assert.equal(count(open, 'data-act="chat"'), 2)
  // No name yet: the worktree buttons wait for one.
  assert.equal(count(open, 'disabled data-act="worktree"'), 2)
  const named = html({ menu: 'p-shop', worktreeName: 'login fix', agent: 'codex' })
  assert.equal(count(named, 'disabled data-act="worktree"'), 0)
  assert.ok(named.includes('class="chip main" data-act="chat" data-key="p-shop" data-agent="codex"'))
  // Chat or CLI, on top of the menu: the chosen one is pressed.
  assert.ok(open.includes('class="seg on" aria-pressed="true" data-act="surface" data-key="chat"'))
  assert.ok(html({ menu: 'p-shop', surface: 'terminal' }).includes('class="seg on" aria-pressed="true" data-act="surface" data-key="terminal"'))
  // A group or a folder has no worktrees to offer.
  const group = html({ menu: 'folder-workspace:g1' })
  assert.ok(group.includes('In the group'))
  assert.ok(!group.includes('In a new worktree'))
})

test('right-click: what each row offers, and removal asks first', () => {
  // A chat in a second workspace on the main checkout: Orca would refuse to remove it.
  assert.deepEqual(menuItems(html({ ctx: { kind: 'session', key: 'chat:3', confirm: false } })), ['Open', 'Mark as unread'])
  // A terminal agent in the main checkout: no removal, the main checkout stays.
  assert.deepEqual(menuItems(html({ ctx: { kind: 'session', key: 'tab1:leaf1', confirm: false } })), [
    'Open',
    'Mark as unread',
    'Close tab'
  ])
  // An unread native chat in a group's workspace: no tab to close; the workspace can go.
  assert.deepEqual(menuItems(html({ ctx: { kind: 'session', key: 'chat:2', confirm: false } })), [
    'Open',
    'Mark as read',
    'Remove workspace…'
  ])
  const ask = html({ ctx: { kind: 'session', key: 'chat:2', confirm: true } })
  assert.deepEqual(menuItems(ask), ['Open', 'Mark as read', 'Remove', 'Cancel'])
  assert.ok(ask.includes('Orca forgets this workspace. Its files stay.'))
  assert.ok(ask.includes('data-act="ctx-remove-yes" data-key="folder:group1"'))
  // A worktree says its folder goes.
  const worktree = html({ ctx: { kind: 'worktree', key: 'identity:shop-pay', confirm: true } })
  assert.deepEqual(menuItems(worktree), ['Open', 'Delete', 'Cancel'])
  assert.ok(worktree.includes('The worktree folder is deleted; its branch stays.'))
  // A project: a new chat, and hiding it in Orca; a group cannot be hidden.
  assert.deepEqual(menuItems(html({ ctx: { kind: 'project', key: 'p-shop', confirm: false } })), ['New chat…', 'Hide project in Orca'])
  assert.deepEqual(menuItems(html({ ctx: { kind: 'project', key: 'folder-workspace:g1', confirm: false } })), ['New chat…'])
  // The menu works in Recent too, and is gone when closed.
  assert.ok(html({ mode: 'recent', ctx: { kind: 'session', key: 'tab1:leaf1', confirm: false } }).includes('class="ctx"'))
  assert.ok(!html().includes('class="ctx"'))
})

test('folds follow what the person chose; a project quiet for a day starts folded', () => {
  assert.ok(!rows(html({ open: { 'p:p-shop': false } })).includes('Quick question30m'))
  assert.ok(rows(html({ open: { 'o:p-shop': true } })).includes('Side chat3d'))
  assert.ok(rows(html({ open: { 'g:others': true } })).some((r) => r.startsWith('docs')))
  const live = snapshot()
  live.agents = live.agents.map((a) => (a.group ? { ...a, updatedAt: NOW - 2 * DAY_MS } : a))
  // Its tree rows are folded away; Unread still lists the unread one.
  assert.ok(!rows(html({}, live)).includes('Older chat2d'))
})

test('text from agents is escaped; nothing open still lists every project; Russian', () => {
  const live = snapshot()
  live.agents[0] = { ...live.agents[0], title: '<img src=x onerror=alert(1)>' }
  assert.ok(!html({}, live).includes('<img'))
  assert.equal(esc(`"'<>&`), '&#34;&#39;&#60;&#62;&#38;')
  const empty = buildView({ ...snapshot(), agents: [] }, ui(), NOW, 'ru', null)
  assert.ok(empty.includes('Открытых сессий нет. Нажми + у проекта'))
  assert.deepEqual(rows(empty).map((r) => r.replace(/\d.*$/, '')), ['webshop', 'platform (группа)', 'docs'])
})

test('every language Orca ships, picked from its tag; each has every string', () => {
  assert.deepEqual(
    ['en', 'ru-RU', 'de', 'es-419', 'fr', 'pt-BR', 'tr', 'ja', 'ko', 'zh-CN', 'zh-TW', 'zh-Hant', 'it', undefined].map(tableFor),
    ['en', 'ru', 'de', 'es', 'fr', 'pt', 'tr', 'ja', 'ko', 'zh', 'zh-Hant', 'zh-Hant', 'en', 'en']
  )
  const shape = (value: unknown): unknown =>
    typeof value === 'object' && value !== null
      ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
      : typeof value
  const en = shape(strings('en'))
  for (const tag of ['ru', 'de', 'es', 'fr', 'pt', 'tr', 'ja', 'ko', 'zh', 'zh-Hant']) {
    const s = strings(tag)
    assert.deepEqual(shape(s), en, tag)
    assert.notEqual(s.viewRecent, strings('en').viewRecent, tag)
    assert.ok(s.sessionsCount(3).includes('3') && s.ago(5 * 60_000).includes('5'), tag)
  }
  assert.equal(strings('de').ago(5 * 60_000), '5 Min.')
  assert.equal(strings('ja').ago(3 * 60 * 60_000), '3時間')
  assert.equal(strings('fr').sessionsCount(1), '1 session')
})

test('Recent: one flat list of every open session, newest first, and nothing else', () => {
  const markup = html({ mode: 'recent' })
  // The project's initial first; second line: a branch, a worktree's branch behind its icon, or
  // a folder or group's place on disk.
  assert.deepEqual(rows(markup), [
    'WRefactor the cart1mwebshop · main',
    'PLogging2mplatform · ~/work/platform',
    'WAdd Stripe webhooksCodex · 5mwebshop · feat/payments',
    'WQuick question30mwebshop · main',
    'POlder chat1hplatform · ~/work/platform',
    // A detached HEAD has no branch to show.
    'WSide chat3dwebshop'
  ])
  assert.ok(markup.includes('<span class="wt"><svg class="icon"'))
  assert.equal(count(markup, `class="avatar c${colorSlot('p-shop')}"`), 4)
  assert.ok(markup.includes('<div class="day">Earlier</div>'))
  assert.ok(markup.includes('class="seg on" aria-pressed="true" data-act="mode" data-key="recent"'))
  assert.ok(!markup.includes('Unread ·') && !markup.includes('data-act="menu"'))
  // Unread and current still show.
  assert.ok(markup.includes('class="row two unread"') && markup.includes('class="row two current"'))
  assert.ok(markup.includes('title="Add Stripe webhooks — webshop · worktree: payments · feat/payments"'))
  assert.ok(html().includes('class="seg on" aria-pressed="true" data-act="mode" data-key="tree"'))
  // In the one-line Now rows the worktree is in the tooltip rather than the line.
  assert.ok(html().includes('title="Add Stripe webhooks — webshop › payments"'))
  const docs = snapshot()
  docs.agents = [{ ...docs.agents[0], projectKey: 'p-docs', project: 'docs', path: '/home/me/notes/docs', branch: null }]
  assert.deepEqual(rows(html({ mode: 'recent' }, docs)), ['DRefactor the cart1mdocs · ~/notes/docs'])
})

test('a project keeps its colour; day headings follow the local calendar', () => {
  assert.equal(colorSlot('p-shop'), colorSlot('p-shop'))
  for (const key of ['a', 'p-shop', 'folder-workspace:g1', '0a1b2c3d-4e5f']) assert.ok(colorSlot(key) >= 0 && colorSlot(key) < 8)
  const noon = new Date(2026, 10, 26, 12, 0).getTime()
  assert.equal(dayBucket(new Date(2026, 10, 26, 0, 5).getTime(), noon), 'today')
  assert.equal(dayBucket(new Date(2026, 10, 25, 23, 55).getTime(), noon), 'yesterday')
  assert.equal(dayBucket(new Date(2026, 10, 24, 23, 55).getTime(), noon), 'older')
})

test('loading and errors', () => {
  assert.ok(buildView(null, ui(), NOW, 'en', null).includes('Reading Orca'))
  const failed = buildView(null, ui(), NOW, 'en', 'Orca is not running')
  assert.ok(failed.includes('role="alert"') && failed.includes('Orca is not running'))
})

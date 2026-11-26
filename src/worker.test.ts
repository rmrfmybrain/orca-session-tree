import { assert, mockHost, mountWorker, test } from 'orca/testing'
import * as main from './worker'
import { fakeOrca, folderProjects, hostResults, ps } from './fixtures'
import { agentsFromPs, currentTarget, projectTree, targetsFromPs, type Snapshot } from './model'
import { strings } from './i18n'

test('Orca’s agent table: top-level agents, newest first, with where, tab and workspace', () => {
  assert.deepEqual(
    agentsFromPs(ps).map((a) => [a.title, a.state, a.where, a.terminalId, a.workspaceId, a.current, a.unread]),
    [
      ['Refactor the cart', 'working', 'webshop', 'term_1', 'identity:shop-main', true, false],
      // Its workspace is unread and it finished last there: not looked at yet.
      ['Logging', 'done', 'platform', null, 'folder:group1', false, true],
      ['Add Stripe webhooks', 'blocked', 'webshop › payments', 'term_2', 'identity:shop-pay', false, false],
      ['Quick question', 'done', 'webshop', null, 'identity:shop-main', true, false],
      ['Older chat', 'done', 'platform', null, 'folder:group1', false, false],
      // On the main checkout: its made-up workspace name is left out.
      ['Side chat', 'done', 'webshop', null, 'p-shop::/home/me/code/webshop::workspace:1', false, false]
    ]
  )
  const logging = agentsFromPs(ps).find((a) => a.title === 'Logging')!
  assert.equal(logging.selector, 'folder:group1')
  assert.match(logging.lastMessage!, /^Done: \*\*logging\*\*/)
})

test('mark as read or unread sets Orca’s unread dot, only for a real workspace selector', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const worker = await mountWorker(main, { host: mockHost({ results: hostResults() }) })
  assert.equal((await worker.request('workspace.mark', { selector: 'folder:group1', read: true })).ok, true)
  assert.deepEqual(log.at(-1), ['worktree', 'set', '--worktree', 'folder:group1', '--read'])
  await worker.request('workspace.mark', { selector: 'folder:group1', read: false })
  assert.deepEqual(log.at(-1), ['worktree', 'set', '--worktree', 'folder:group1', '--unread'])
  assert.equal((await worker.request('workspace.mark', { selector: '--unread', read: true })).code, 'invalid_params')
  assert.equal(log.filter((a) => a[1] === 'set').length, 2)
  await worker.deactivate()
})

test('the right-click actions: remove anything but a main checkout, close a terminal tab, hide a project', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const host = mockHost({ results: hostResults() })
  const worker = await mountWorker(main, { host })
  // A worktree: Orca deletes its folder and keeps the branch; no --force, so it refuses changes.
  assert.equal((await worker.request('workspace.remove', { selector: 'identity:shop-pay' })).ok, true)
  assert.deepEqual(log.at(-1), ['worktree', 'rm', '--worktree', 'identity:shop-pay'])
  const removes = () => log.filter((a) => a[1] === 'rm').length
  assert.equal((await worker.request('workspace.remove', { selector: 'identity:shop-main' })).code, 'invalid_params')
  // A second workspace on the main checkout's path: Orca would refuse it, so it is never asked.
  assert.equal(
    (await worker.request('workspace.remove', { selector: 'id:p-shop::/home/me/code/webshop::workspace:1' })).code,
    'invalid_params'
  )
  // A group's workspace is only forgotten by Orca.
  assert.equal((await worker.request('workspace.remove', { selector: 'folder:old' })).ok, true)
  assert.equal((await worker.request('workspace.remove', { selector: 'identity:nowhere' })).code, 'invalid_params')
  assert.equal((await worker.request('workspace.remove', { selector: '--force' })).code, 'invalid_params')
  assert.equal(removes(), 2)

  assert.equal((await worker.request('terminal.close', { terminalId: 'term_2' })).ok, true)
  assert.deepEqual(log.at(-1), ['terminal', 'close', '--terminal', 'term_2', '--tab'])
  assert.equal((await worker.request('terminal.close', { terminalId: '--all' })).code, 'invalid_params')

  assert.equal((await worker.request('project.hide', { projectId: 'p-shop' })).ok, true)
  assert.deepEqual(host.callsOf('project.setHidden'), [{ projectId: 'p-shop', hidden: true }])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('Orca’s CLI is the one beside the running app, never a bare name on PATH', () => {
  assert.equal(
    main.orcaCli('/Applications/Orca.app/Contents/Frameworks/Orca Helper.app/Contents/MacOS/Orca Helper', 'darwin'),
    '/Applications/Orca.app/Contents/Resources/bin/orca'
  )
  assert.equal(main.orcaCli('/opt/Orca/orca-ide', 'linux'), '/opt/Orca/resources/bin/orca-ide')
  assert.equal(main.orcaCli('C:\\Program Files\\Orca\\Orca.exe', 'win32'), 'C:\\Program Files\\Orca\\resources\\bin\\orca.exe')
})

test('targets: a project’s main checkout, a group’s latest workspace, most recently used first', () => {
  assert.deepEqual(
    targetsFromPs(ps, folderProjects).map((t) => [t.name, t.kind, t.selector]),
    [
      ['webshop', 'git', 'identity:shop-main'],
      ['platform', 'group', 'folder:group1'],
      ['docs', 'folder', 'id:p-docs::/home/me/notes/docs']
    ]
  )
  assert.equal(currentTarget(ps), 'p-shop')
})

test('live.load reads ps every time and the installed agents once', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const worker = await mountWorker(main, { host: mockHost({ results: hostResults() }) })
  const live = await worker.request('live.load')
  await worker.request('live.load')
  assert.equal(live.agents.length, 6)
  assert.deepEqual(live.installed.map((a) => a.id), ['claude', 'codex'])
  assert.deepEqual(log.map((a) => a.slice(0, 2).join(' ')), ['worktree ps', 'agent installed', 'worktree ps'])
  await worker.deactivate()
})

test('a terminal agent gets its tab; a native chat only its workspace, never a resume', async () => {
  const host = mockHost({ results: hostResults() })
  const worker = await mountWorker(main, { host })
  await worker.request('session.open', { terminalId: 'term_2', workspaceId: 'identity:shop-pay' })
  assert.deepEqual(host.callsOf('terminal.focus'), [{ terminalId: 'term_2' }])
  assert.equal(host.callsOf('workspace.open').length, 0)
  await worker.request('session.open', { terminalId: null, workspaceId: 'folder:group1' })
  assert.deepEqual(host.callsOf('workspace.open'), [{ workspaceId: 'folder:group1' }])
  assert.equal(host.callsOf('agent.resume').length, 0)
  await worker.deactivate()
})

test('+ asks Orca to launch the agent in the existing workspace; anything odd is refused', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const worker = await mountWorker(main, { host: mockHost({ results: hostResults() }) })
  assert.equal((await worker.request('chat.start', { selector: 'folder:group1', agent: 'codex', surface: 'chat' })).ok, true)
  assert.deepEqual(log.at(-1), ['agent', 'launch', '--agent', 'codex', '--worktree', 'folder:group1', '--surface', 'chat', '--focus'])
  await worker.request('chat.start', { selector: 'folder:group1', agent: 'codex', surface: 'terminal' })
  assert.deepEqual(log.at(-1)!.slice(6, 8), ['--surface', 'terminal'])
  const launches = () => log.filter((a) => a[1] === 'launch').length
  assert.equal((await worker.request('chat.start', { selector: '--help', agent: 'codex', surface: 'chat' })).code, 'invalid_params')
  assert.equal((await worker.request('chat.start', { selector: 'folder:group1', agent: 'evil', surface: 'chat' })).code, 'invalid_params')
  const odd = { selector: 'folder:group1', agent: 'codex', surface: '--help' } as unknown as { selector: string; agent: string; surface: 'chat' }
  assert.equal((await worker.request('chat.start', odd)).code, 'invalid_params')
  assert.equal(launches(), 2)
  await worker.deactivate()
})

test('a new worktree: only in a Git project, with a sane name and an installed agent', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const worker = await mountWorker(main, { host: mockHost({ results: hostResults() }) })
  const ok = await worker.request('worktree.start', { repo: 'p-shop', name: ' login fix ', agent: 'codex', surface: 'terminal' })
  assert.equal(ok.ok, true)
  assert.deepEqual(log.at(-1), [
    'worktree', 'create', '--repo', 'id:p-shop', '--name', 'login fix',
    '--agent', 'codex', '--surface', 'terminal', '--no-parent', '--activate'
  ])
  const creates = () => log.filter((a) => a[1] === 'create').length
  for (const bad of [
    { repo: 'p-docs', name: 'x', agent: 'claude', surface: 'chat' as const },
    { repo: 'folder-workspace:g1', name: 'x', agent: 'claude', surface: 'chat' as const },
    { repo: 'p-shop', name: '--help', agent: 'claude', surface: 'chat' as const },
    { repo: 'p-shop', name: '   ', agent: 'claude', surface: 'chat' as const },
    { repo: 'p-shop', name: 'x', agent: 'evil', surface: 'chat' as const }
  ]) {
    assert.equal((await worker.request('worktree.start', bad)).code, 'invalid_params', JSON.stringify(bad))
  }
  assert.equal(creates(), 1)
  await worker.deactivate()
})

test('commands: a chat where you are; the worktree ban flips for the open project', async () => {
  const log: string[][] = []
  main.setOrcaRunner(fakeOrca(log))
  const host = mockHost({ results: hostResults(), storage: { 'st.newAgent': 'codex', 'st.surface': 'terminal' } })
  const worker = await mountWorker(main, { host })
  assert.equal(await worker.command('chat.new'), undefined)
  assert.deepEqual(log.at(-1), ['agent', 'launch', '--agent', 'codex', '--worktree', 'identity:shop-main', '--surface', 'terminal', '--focus'])

  assert.match(String(await worker.command('worktrees.toggle')), /webshop: new worktrees blocked/)
  assert.deepEqual(host.data().storage['st.noWorktrees'], ['p-shop'])
  const fire = (kind: 'worktree' | 'folder', projectId: string) =>
    worker.hooks.fire('workspace.create.before', { kind, projectId, name: 'x' })
  assert.equal((await fire('worktree', 'p-shop')).kind, 'deny')
  assert.equal((await fire('worktree', 'p-docs')).kind, 'continue')
  assert.equal((await fire('folder', 'p-shop')).kind, 'continue')
  assert.match(String(await worker.command('worktrees.toggle')), /allowed/)
  assert.equal((await fire('worktree', 'p-shop')).kind, 'continue')
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('No Worktree Mode: new worktrees refused everywhere but the projects you allow; + stops offering them', async () => {
  main.setOrcaRunner(fakeOrca())
  const host = mockHost({ results: hostResults(), settings: { worktrees: 'block' }, storage: { 'st.noWorktrees': ['p-other'] } })
  const worker = await mountWorker(main, { host })
  const fire = (kind: 'worktree' | 'folder', projectId: string) =>
    worker.hooks.fire('workspace.create.before', { kind, projectId, name: 'x' })
  assert.equal((await fire('worktree', 'p-shop')).kind, 'deny')
  assert.equal((await fire('worktree', 'p-anything')).kind, 'deny')
  assert.equal((await fire('folder', 'p-shop')).kind, 'continue')
  const shop = async () => ((await worker.request('live.load')) as Snapshot).targets.find((t) => t.key === 'p-shop')
  assert.equal((await shop())?.worktreesBlocked, true)

  // The command now makes an exception for the open project, and flips it back.
  assert.match(String(await worker.command('worktrees.toggle')), /webshop: new worktrees allowed/)
  assert.deepEqual(host.data().storage['st.worktreesAllowed'], ['p-shop'])
  assert.equal((await fire('worktree', 'p-shop')).kind, 'continue')
  assert.equal((await shop())?.worktreesBlocked, false)
  assert.match(String(await worker.command('worktrees.toggle')), /webshop: new worktrees blocked/)
  assert.equal((await fire('worktree', 'p-shop')).kind, 'deny')
  // Bans made with the mode off stay stored and apply again when it is off.
  assert.deepEqual(host.data().storage['st.noWorktrees'], ['p-other'])
  assert.deepEqual(worker.refusals, [])
  await worker.deactivate()
})

test('agent events are coalesced into one live.changed', async () => {
  const worker = await mountWorker(main, { host: mockHost({ results: hostResults() }) })
  for (const state of ['working', 'waiting', 'done'] as const) {
    await worker.emit('agent.status.changed', { workspaceId: null, paneKey: 'p', state, receivedAt: 1 })
  }
  await new Promise((resolve) => setTimeout(resolve, 1400))
  assert.deepEqual(worker.posts.map((p) => p.event), ['live.changed'])
  await worker.deactivate()
})

test('the tree: projects newest first, worktree sessions under their worktree', () => {
  assert.deepEqual(
    projectTree(agentsFromPs(ps)).map((p) => [p.name, p.group, p.sessions.map((a) => a.title), p.worktrees.map((w) => [w.name, w.sessions.length])]),
    [
      ['webshop', false, ['Refactor the cart', 'Quick question', 'Side chat'], [['payments', 1]]],
      ['platform', true, ['Logging', 'Older chat'], []]
    ]
  )
})

test('Russian plurals', () => {
  assert.deepEqual([1, 2, 5, 11, 21, 22].map(strings('ru').sessionsCount), [
    '1 сессия', '2 сессии', '5 сессий', '11 сессий', '21 сессия', '22 сессии'
  ])
})

test('ages: under a minute is now, then minutes, hours, days', () => {
  const MIN = 60_000
  assert.deepEqual([30_000, 5 * MIN, 3 * 60 * MIN, 2 * 24 * 60 * MIN].map(strings('ru').ago), ['сейчас', '5 мин', '3 ч', '2 д'])
  assert.deepEqual([30_000, 59 * MIN, 61 * MIN].map(strings('en').ago), ['now', '59m', '1h'])
})

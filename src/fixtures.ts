// Invented sample answers for tests (never loaded by Orca itself): every name here is made up.
import { agentsFromPs, currentTarget, targetsFromPs, type InstalledAgent, type PsWorktree, type Snapshot } from './model'

export const NOW = Date.now()
const MIN = 60_000
const HOUR = 60 * MIN

/** What `orca worktree ps --json` lists under `result.worktrees`. */
export const ps: PsWorktree[] = [
  {
    worktreeId: 'p-shop::/home/me/code/webshop',
    repoId: 'p-shop',
    repo: 'webshop',
    path: '/home/me/code/webshop',
    displayName: 'main',
    branch: 'refs/heads/main',
    workspaceKind: 'git',
    isMainWorktree: true,
    isActive: true,
    lastActivityAt: NOW - 1 * MIN,
    identity: { key: 'shop-main' },
    address: { worktree: 'identity:shop-main' },
    agents: [
      { paneKey: 'tab1:leaf1', address: 'term_1', state: 'working', agentType: 'claude', conversationName: 'Refactor the cart', updatedAt: NOW - 1 * MIN },
      // A native chat: no terminal, an Orca session address instead.
      { paneKey: 'chat:1', address: 'orca_session_id:abc', state: 'done', agentType: 'claude', conversationName: 'Quick question', updatedAt: NOW - 30 * MIN },
      // A subagent stays under its parent.
      { paneKey: 'tab1:leaf1:sub', parentPaneKey: 'tab1:leaf1', state: 'working', agentType: 'claude', conversationName: 'Explore', updatedAt: NOW }
    ]
  },
  {
    // A second workspace Orca opened on the main checkout, under a made-up name.
    worktreeId: 'p-shop::/home/me/code/webshop::workspace:1',
    repoId: 'p-shop',
    repo: 'webshop',
    path: '/home/me/code/webshop',
    displayName: 'quiet-harbor',
    // Detached: no branch to show.
    branch: 'HEAD',
    workspaceKind: 'git',
    lastActivityAt: NOW - 3 * 24 * HOUR,
    address: { worktree: 'id:p-shop::/home/me/code/webshop::workspace:1' },
    agents: [{ paneKey: 'chat:3', state: 'done', agentType: 'claude', conversationName: 'Side chat', updatedAt: NOW - 3 * 24 * HOUR }]
  },
  {
    worktreeId: 'p-shop::/home/me/.orca/worktrees/webshop/payments',
    repoId: 'p-shop',
    repo: 'webshop',
    path: '/home/me/.orca/worktrees/webshop/payments',
    displayName: 'payments',
    branch: 'refs/heads/feat/payments',
    workspaceKind: 'git',
    lastActivityAt: NOW - 5 * MIN,
    identity: { key: 'shop-pay' },
    address: { worktree: 'identity:shop-pay' },
    agents: [
      { paneKey: 'tab2:leaf2', address: 'term_2', state: 'blocked', agentType: 'codex', conversationName: 'Add Stripe webhooks', updatedAt: NOW - 5 * MIN }
    ]
  },
  // A folder group: two workspaces, chats start in the latest one.
  {
    worktreeId: 'folder:old',
    repoId: 'folder-workspace:g1',
    repo: 'platform',
    path: '/home/me/work/platform',
    displayName: 'Workspace platform',
    workspaceKind: 'folder-workspace',
    lastActivityAt: NOW - 2 * 24 * HOUR,
    address: { worktree: 'folder:old' },
    agents: []
  },
  {
    worktreeId: 'folder:group1',
    repoId: 'folder-workspace:g1',
    repo: 'platform',
    path: '/home/me/work/platform',
    displayName: 'Workspace platform',
    workspaceKind: 'folder-workspace',
    lastActivityAt: NOW - 2 * MIN,
    // An agent finished here and you have not opened it since.
    unread: true,
    identity: { key: 'ignored-for-folders' },
    address: { worktree: 'folder:group1' },
    agents: [
      {
        paneKey: 'chat:2',
        address: null,
        state: 'done',
        agentType: 'claude',
        displayName: 'Logging',
        lastAssistantMessage: 'Done: **logging** moved to `billing`.\n\n```sh\nmake test\n```\nNext, the API.',
        updatedAt: NOW - 2 * MIN
      },
      // Finished earlier: the unread dot is the newer one's.
      { paneKey: 'chat:4', address: null, state: 'done', agentType: 'claude', displayName: 'Older chat', updatedAt: NOW - 60 * MIN }
    ]
  },
  {
    worktreeId: 'p-docs::/home/me/notes/docs',
    repoId: 'p-docs',
    repo: 'docs',
    path: '/home/me/notes/docs',
    displayName: 'docs',
    workspaceKind: 'folder',
    isMainWorktree: true,
    lastActivityAt: NOW - 10 * 24 * HOUR,
    address: { worktree: 'id:p-docs::/home/me/notes/docs' },
    agents: []
  }
]

export const installed: InstalledAgent[] = [
  { id: 'claude', name: 'Claude', default: true },
  { id: 'codex', name: 'Codex' }
]

/** A stand-in for Orca's CLI: answers ps and agent installed, records every call. */
export function fakeOrca(log: string[][] = []) {
  return async (args: string[]) => {
    log.push(args)
    if (args[0] === 'worktree' && args[1] === 'ps') return { worktrees: ps }
    if (args[0] === 'agent' && args[1] === 'installed') return { agents: installed }
    if (args[0] === 'agent' && args[1] === 'launch') return { outcome: { kind: 'chat' } }
    if (args[0] === 'worktree' && args[1] === 'create') return { worktree: { id: 'new' } }
    if (args[0] === 'worktree' && args[1] === 'set') return { worktree: { id: args[3] } }
    if (args[0] === 'worktree' && args[1] === 'rm') return { removed: true }
    if (args[0] === 'terminal' && args[1] === 'close') return { closed: true }
    throw new Error(`unexpected orca ${args.join(' ')}`)
  }
}

/** `results` for mockHost: the host calls the worker makes. */
export function hostResults(): Record<string, unknown> {
  return {
    'project.list': {
      projects: [
        { id: 'p-shop', name: 'webshop', kind: 'git', hostId: 'local', path: '/home/me/code/webshop' },
        { id: 'p-docs', name: 'docs', kind: 'folder', hostId: 'local', path: '/home/me/notes/docs' }
      ],
      truncated: false
    },
    'terminal.focus': { focused: true },
    'workspace.open': { opened: true },
    'project.setHidden': { hostId: 'local', hidden: true }
  }
}

export const folderProjects: ReadonlySet<string> = new Set(['p-docs'])

/** What `live.load` answers for the fixtures. */
export function snapshot(): Snapshot {
  return { agents: agentsFromPs(ps), targets: targetsFromPs(ps, folderProjects), currentTarget: currentTarget(ps), installed }
}

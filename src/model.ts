// Pure data shaping, no `orca` imports: the worker, the panel and plain tests share it.
// Input is Orca's own agent table (`orca worktree ps --json`), the one its sidebar draws.

export type AgentState = 'working' | 'blocked' | 'waiting' | 'done'

/** One open agent session. */
export interface LiveAgent {
  key: string
  title: string
  agent: string | null
  state: AgentState
  updatedAt: number
  /** "webshop", or "webshop › payments" for a worktree. */
  where: string
  /** The id `workspace.open` takes. */
  workspaceId: string
  /** A terminal agent's tab; null for a native chat or a sleeping terminal, which have none. */
  terminalId: string | null
  /** Its workspace is the one open in Orca now. */
  current: boolean
  /** It finished and you have not opened its workspace since (Orca's unread dot). */
  unread: boolean
  /** The start of its last answer, when Orca has it. */
  lastMessage: string | null
  /** `--worktree` for the CLI, to mark its workspace read. */
  selector: string | null
  /** The checked-out branch, when there is one (not a folder, not a detached HEAD). */
  branch: string | null
  /** Where it runs on disk. */
  path: string
  /** Its workspace can be removed from Orca: anything but a project's main checkout. */
  removable: boolean
  /** The project id, or `folder-workspace:<id>` for a group. */
  projectKey: string
  project: string
  group: boolean
  /** The worktree it runs in; null in a main checkout or a group's workspace. */
  worktree: string | null
}

/** A project (or group) with its open sessions, the worktree ones under their worktree. */
export interface ProjectBranch {
  key: string
  name: string
  group: boolean
  /** The newest session's activity. */
  latest: number
  sessions: LiveAgent[]
  worktrees: { name: string; workspaceId: string; selector: string | null; latest: number; sessions: LiveAgent[] }[]
}

/** Where + starts a chat: a project's main checkout or a folder group's workspace, never a new one. */
export interface Target {
  /** The project id, or `folder-workspace:<id>` for a group. */
  key: string
  name: string
  /** A Git project (chat in its main checkout), a folder project, or a folder group. */
  kind: 'git' | 'folder' | 'group'
  /** `--worktree` for `orca agent launch`. */
  selector: string
  lastActivityAt: number
}

export interface InstalledAgent {
  id: string
  name: string
  default?: boolean
}

export interface Snapshot {
  agents: LiveAgent[]
  /** Most recently used first. */
  targets: Target[]
  /** The target of the workspace open in Orca. */
  currentTarget: string | null
  installed: InstalledAgent[]
}

// `orca worktree ps --json`: the fields used here.
export interface PsAgent {
  paneKey: string
  parentPaneKey?: string | null
  address?: string | null
  state: string
  agentType?: string | null
  conversationName?: string | null
  displayName?: string | null
  taskTitle?: string | null
  lastAssistantMessage?: string | null
  updatedAt?: number | null
  stateStartedAt?: number | null
}
export interface PsWorktree {
  worktreeId: string
  repoId: string
  repo: string
  path: string
  displayName: string
  /** `refs/heads/<name>`, `HEAD` when detached, empty for a folder. */
  branch?: string | null
  workspaceKind: string
  isMainWorktree?: boolean
  isActive?: boolean
  /** Orca's unread dot: an agent finished here since you last opened it. */
  unread?: boolean
  lastActivityAt?: number | null
  identity?: { key?: string | null } | null
  address?: { worktree?: string | null } | null
  agents?: PsAgent[]
}

const STATES: readonly string[] = ['working', 'blocked', 'waiting', 'done']
export const DAY_MS = 24 * 60 * 60_000

const isGroup = (worktree: PsWorktree) => worktree.workspaceKind === 'folder-workspace'

/** The id plugins know a workspace by, as Orca's `pluginWorkspaceId` derives it. */
function pluginWorkspaceId(worktree: PsWorktree): string {
  const key = worktree.identity?.key
  return key && !worktree.worktreeId.startsWith('folder:') ? `identity:${key}` : worktree.worktreeId
}

/** Every top-level agent Orca lists, newest activity first. Subagents stay under their parent. */
/**
 * Whether Orca can remove this workspace without touching a project's main checkout: Orca refuses
 * the checkout itself and any other Git workspace opened on its path.
 */
export function canRemove(worktree: PsWorktree, worktrees: readonly PsWorktree[]): boolean {
  if (worktree.isMainWorktree) return false
  return !(
    worktree.workspaceKind === 'git' &&
    worktrees.some((w) => w.isMainWorktree && w.repoId === worktree.repoId && w.path === worktree.path)
  )
}

export function agentsFromPs(worktrees: readonly PsWorktree[]): LiveAgent[] {
  // Workspaces Orca opens on a main checkout get made-up names: only worktrees,
  // which sit in a folder of their own, are worth naming.
  const mainCheckouts = new Set(worktrees.filter((w) => w.isMainWorktree).map((w) => `${w.repoId}\0${w.path}`))
  const worktreeOf = (worktree: PsWorktree): string | null =>
    isGroup(worktree) ||
    worktree.isMainWorktree ||
    mainCheckouts.has(`${worktree.repoId}\0${worktree.path}`) ||
    worktree.displayName === worktree.repo
      ? null
      : worktree.displayName
  const agents: LiveAgent[] = []
  for (const worktree of worktrees) {
    const branch = worktreeOf(worktree)
    // Orca's unread dot belongs to the workspace; the agent that finished last there set it.
    const top = (worktree.agents ?? []).filter((a) => !a.parentPaneKey)
    const unreadKey = worktree.unread
      ? top
          .filter((a) => a.state === 'done')
          .sort((a, b) => (b.updatedAt ?? b.stateStartedAt ?? 0) - (a.updatedAt ?? a.stateStartedAt ?? 0))[0]?.paneKey
      : undefined
    for (const agent of top) {
      agents.push({
        key: agent.paneKey,
        title:
          (agent.conversationName || agent.displayName || agent.taskTitle || '').trim() || agent.agentType || 'Agent',
        agent: agent.agentType ?? null,
        state: STATES.includes(agent.state) ? (agent.state as AgentState) : 'done',
        updatedAt: agent.updatedAt ?? agent.stateStartedAt ?? 0,
        where: branch ? `${worktree.repo} › ${branch}` : worktree.repo,
        workspaceId: pluginWorkspaceId(worktree),
        terminalId: agent.address?.startsWith('term_') ? agent.address : null,
        current: worktree.isActive === true,
        unread: agent.paneKey === unreadKey,
        lastMessage: agent.lastAssistantMessage?.trim() || null,
        selector: worktree.address?.worktree ?? null,
        branch: worktree.branch && worktree.branch !== 'HEAD' ? worktree.branch.replace(/^refs\/heads\//, '') : null,
        path: worktree.path,
        removable: canRemove(worktree, worktrees),
        projectKey: worktree.repoId,
        project: worktree.repo,
        group: isGroup(worktree),
        worktree: branch
      })
    }
  }
  return agents.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Projects with open sessions, newest activity first; sessions keep their newest-first order. */
export function projectTree(agents: readonly LiveAgent[]): ProjectBranch[] {
  const projects = new Map<string, ProjectBranch>()
  for (const agent of agents) {
    const project = projects.get(agent.projectKey) ?? {
      key: agent.projectKey,
      name: agent.project,
      group: agent.group,
      latest: agent.updatedAt,
      sessions: [],
      worktrees: []
    }
    projects.set(agent.projectKey, project)
    if (!agent.worktree) {
      project.sessions.push(agent)
      continue
    }
    const branch = project.worktrees.find((w) => w.workspaceId === agent.workspaceId)
    if (branch) branch.sessions.push(agent)
    else {
      project.worktrees.push({
        name: agent.worktree,
        workspaceId: agent.workspaceId,
        selector: agent.selector,
        latest: agent.updatedAt,
        sessions: [agent]
      })
    }
  }
  return [...projects.values()]
}

/**
 * Projects (their main checkout) and folder groups (their most recently used workspace), most
 * recently used first, counting every workspace of each. `folderProjects`: ids of folder projects.
 */
export function targetsFromPs(worktrees: readonly PsWorktree[], folderProjects: ReadonlySet<string>): Target[] {
  const targets = new Map<string, Target>()
  const homeAt = new Map<string, number>()
  for (const worktree of worktrees) {
    const at = worktree.lastActivityAt ?? 0
    const group = isGroup(worktree)
    // The table marks a folder project's workspaces `git`; the project list knows better.
    const kind = group ? 'group' : folderProjects.has(worktree.repoId) ? 'folder' : 'git'
    const target = targets.get(worktree.repoId) ?? { key: worktree.repoId, name: worktree.repo, kind, selector: '', lastActivityAt: 0 }
    targets.set(worktree.repoId, target)
    target.lastActivityAt = Math.max(target.lastActivityAt, at)
    const selector = worktree.address?.worktree
    // A project starts chats in its main checkout; a group in its latest workspace.
    if (selector && (group ? at >= (homeAt.get(target.key) ?? -1) : worktree.isMainWorktree)) {
      target.selector = selector
      homeAt.set(target.key, at)
    }
  }
  return [...targets.values()]
    .filter((t) => t.selector !== '')
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt || a.name.localeCompare(b.name))
}

export function currentTarget(worktrees: readonly PsWorktree[]): string | null {
  return worktrees.find((w) => w.isActive)?.repoId ?? null
}

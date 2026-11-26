// The plugin's worker. It reads Orca's own agent table and acts through Orca's CLI (`orca worktree
// ps|set|create|rm`, `orca agent installed|launch`, `orca terminal close`): the plugin host API
// leaves native chats out and always starts agents as terminals. Focus, hiding a project and
// events go through the host API. The CLI runs without a shell, one argument per value.
import { execFile } from 'node:child_process'
import type { OrcaWorkerApi } from 'orca/worker'
import { agentsFromPs, canRemove, currentTarget, targetsFromPs, type InstalledAgent, type PsWorktree, type Snapshot, type Target } from './model'
import { NEW_AGENT_KEY, NO_WORKTREES_KEY, SURFACE_KEY, WORKTREES_ALLOWED_KEY, type ActionResult, type Surface } from './protocol'

const CHANGE_DEBOUNCE_MS = 1200
const CLI_TIMEOUT_MS = 20_000
/** What `--worktree` may name: no options, nothing but Orca's own selectors. */
const SELECTOR = /^(identity|id|folder):[^\s]+$/
const TERMINAL = /^term_[\w-]+$/
const PROJECT = /^[\w-]+$/
// The worker does not know Orca's language; these reach Orca's own error and command toasts.
const WORKTREES_BLOCKED =
  'Session Tree blocks new worktrees in this project. Allow them here with "Ban or allow new worktrees in this project", or change No Worktree Mode in Settings → Plugins.'
const NO_PROJECT = 'Open a project first.'

function failed(error: unknown): ActionResult {
  const code = (error as { code?: unknown } | null)?.code
  return {
    ok: false,
    code: typeof code === 'string' ? code : 'action_failed',
    message: error instanceof Error ? error.message : String(error)
  }
}

/**
 * Orca's CLI from the install that runs this worker, never one found on PATH: on Linux a bare
 * `orca` is GNOME's screen reader. The places are Orca's packaging (`resources/bin`).
 */
export function orcaCli(execPath: string, platform: string): string {
  if (platform === 'darwin') {
    const app = execPath.split('.app/Contents/')[0]
    return `${app}.app/Contents/Resources/bin/orca`
  }
  const dir = execPath.replace(/[\\/][^\\/]*$/, '')
  return platform === 'win32' ? `${dir}\\resources\\bin\\orca.exe` : `${dir}/resources/bin/orca-ide`
}

/** Runs `orca <args> --json` (no shell) and resolves with its `result`. */
export type OrcaRunner = (args: string[]) => Promise<unknown>

let runOrca: OrcaRunner = (args) =>
  new Promise((resolve, reject) => {
    execFile(orcaCli(process.execPath, process.platform), [...args, '--json'], { timeout: CLI_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => {
      let reply: { ok?: boolean; result?: unknown; error?: { message?: string } } | null = null
      try {
        reply = JSON.parse(stdout)
      } catch {
        // Not JSON: the exit error below says why.
      }
      if (reply?.ok) return resolve(reply.result)
      reject(new Error(reply?.error?.message ?? error?.message ?? 'orca CLI gave no answer'))
    })
  })

/** Tests stand in for Orca's CLI. */
export function setOrcaRunner(runner: OrcaRunner): void {
  runOrca = runner
  installed = null
}

const ps = async () => ((await runOrca(['worktree', 'ps'])) as { worktrees: PsWorktree[] }).worktrees

let installed: InstalledAgent[] | null = null
async function installedAgents(): Promise<InstalledAgent[]> {
  // Read once per worker: installing an agent CLI is rare, and the worker restarts often.
  installed ??= ((await runOrca(['agent', 'installed'])) as { agents: InstalledAgent[] }).agents
  return installed
}

/** Orca's table and where chats can start; the host API tells folder projects apart. */
async function readTargets(orca: OrcaWorkerApi): Promise<{ worktrees: PsWorktree[]; targets: Target[] }> {
  const [worktrees, { projects }] = await Promise.all([ps(), orca.host.call('project.list', {})])
  const folders = new Set(projects.filter((p) => p.kind === 'folder').map((p) => p.id))
  return { worktrees, targets: targetsFromPs(worktrees, folders) }
}

export async function loadLive(orca: OrcaWorkerApi): Promise<Snapshot> {
  const [{ worktrees, targets }, agents, blocked] = await Promise.all([readTargets(orca), installedAgents(), worktreePolicy(orca)])
  return {
    agents: agentsFromPs(worktrees),
    targets: targets.map((t) => (t.kind === 'git' ? { ...t, worktreesBlocked: blocked(t.key) } : t)),
    currentTarget: currentTarget(worktrees),
    installed: agents
  }
}

const ids = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])

/**
 * Which projects refuse new worktrees. No Worktree Mode off: only those banned with the command;
 * on: all but those allowed with it.
 */
async function worktreePolicy(orca: OrcaWorkerApi): Promise<(projectId: string) => boolean> {
  const [mode, banned, allowed] = await Promise.all([
    orca.settings.get('worktrees'),
    orca.storage.get(NO_WORKTREES_KEY),
    orca.storage.get(WORKTREES_ALLOWED_KEY)
  ])
  if (mode === 'block') return (id) => !ids(allowed).includes(id)
  return (id) => ids(banned).includes(id)
}

/** A terminal agent's tab when Orca has one, else its workspace (a native chat has no tab id). */
export async function openSession(
  orca: OrcaWorkerApi,
  input: { terminalId: string | null; workspaceId: string }
): Promise<ActionResult> {
  try {
    if (input.terminalId && (await orca.host.call('terminal.focus', { terminalId: input.terminalId })).focused) {
      return { ok: true }
    }
    await orca.host.call('workspace.open', { workspaceId: input.workspaceId })
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

const SURFACES: readonly string[] = ['chat', 'terminal']

/** A new agent in an existing workspace, as Orca's chat or its CLI in a terminal. */
export async function startChat(input: { selector: string; agent: string; surface: Surface }): Promise<ActionResult> {
  try {
    if (!SELECTOR.test(input.selector)) refuse(`bad workspace: ${input.selector}`)
    if (!SURFACES.includes(input.surface)) refuse(`bad surface: ${input.surface}`)
    if (!(await installedAgents()).some((a) => a.id === input.agent)) refuse(`agent not installed: ${input.agent}`)
    await runOrca(['agent', 'launch', '--agent', input.agent, '--worktree', input.selector, '--surface', input.surface, '--focus'])
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

/** Marks a workspace read, as opening it would, or unread again: Orca's own unread dot. */
export async function markWorkspace(input: { selector: string; read: boolean }): Promise<ActionResult> {
  try {
    if (!SELECTOR.test(input.selector)) refuse(`bad workspace: ${input.selector}`)
    await runOrca(['worktree', 'set', '--worktree', input.selector, input.read ? '--read' : '--unread'])
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

/**
 * Removes a workspace that is not a project's main checkout, as Orca's Remove Workspace does:
 * a folder project's or group's workspace is only forgotten; a worktree's folder is deleted, its
 * branch kept. No `--force`, so Orca refuses a worktree with uncommitted changes.
 */
export async function removeWorkspace(input: { selector: string }): Promise<ActionResult> {
  try {
    if (!SELECTOR.test(input.selector)) refuse(`bad workspace: ${input.selector}`)
    const worktrees = await ps()
    const found = worktrees.find((w) => w.address?.worktree === input.selector)
    if (!found) refuse(`Orca lists no workspace ${input.selector}`)
    if (!canRemove(found, worktrees)) refuse('a project’s main checkout cannot be removed here')
    await runOrca(['worktree', 'rm', '--worktree', input.selector])
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

/** Closes a terminal agent's tab, as its close button does. */
export async function closeTab(input: { terminalId: string }): Promise<ActionResult> {
  try {
    if (!TERMINAL.test(input.terminalId)) refuse(`bad terminal: ${input.terminalId}`)
    await runOrca(['terminal', 'close', '--terminal', input.terminalId, '--tab'])
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

/** Hides a project from Orca's sidebar; Orca's Hidden projects list shows it again. */
export async function hideProject(orca: OrcaWorkerApi, input: { projectId: string }): Promise<ActionResult> {
  try {
    if (!PROJECT.test(input.projectId)) refuse(`bad project: ${input.projectId}`)
    await orca.host.call('project.setHidden', { projectId: input.projectId, hidden: true })
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

function refuse(message: string): never {
  throw Object.assign(new Error(message), { code: 'invalid_params' })
}

/** A new worktree in a Git project, named by the person, with the agent started in it. */
export async function startWorktree(
  orca: OrcaWorkerApi,
  input: { repo: string; name: string; agent: string; surface: Surface }
): Promise<ActionResult> {
  try {
    const name = input.name.trim()
    // It goes to the CLI as one argument; a leading dash would read as an option.
    if (!name || name.length > 80 || name.startsWith('-')) refuse(`bad worktree name: ${input.name}`)
    if (!SURFACES.includes(input.surface)) refuse(`bad surface: ${input.surface}`)
    if (!(await installedAgents()).some((a) => a.id === input.agent)) refuse(`agent not installed: ${input.agent}`)
    const { targets } = await readTargets(orca)
    if (!targets.some((t) => t.key === input.repo && t.kind === 'git')) refuse(`not a Git project: ${input.repo}`)
    await runOrca([
      'worktree', 'create', '--repo', `id:${input.repo}`, '--name', name,
      '--agent', input.agent, '--surface', input.surface, '--no-parent', '--activate'
    ])
    return { ok: true }
  } catch (error) {
    return failed(error)
  }
}

/** Command: a chat where you are (a project's main checkout or the group's workspace). */
export async function newChatHere(orca: OrcaWorkerApi): Promise<string | undefined> {
  const { worktrees, targets } = await readTargets(orca)
  const target = targets.find((t) => t.key === currentTarget(worktrees))
  if (!target) return NO_PROJECT
  const [stored, surface] = await Promise.all([orca.storage.get(NEW_AGENT_KEY), orca.storage.get(SURFACE_KEY)])
  const fallback = (await installedAgents()).find((a) => a.default)?.id ?? 'claude'
  const result = await startChat({
    selector: target.selector,
    agent: typeof stored === 'string' ? stored : fallback,
    surface: surface === 'terminal' ? 'terminal' : 'chat'
  })
  return result.ok ? undefined : (result.message ?? result.code)
}

/**
 * Command: flips new worktrees in the open project. With No Worktree Mode off it bans them there;
 * with it on it lets them through there.
 */
export async function toggleWorktrees(orca: OrcaWorkerApi): Promise<string> {
  const { worktrees, targets } = await readTargets(orca)
  const target = targets.find((t) => t.key === currentTarget(worktrees) && t.kind === 'git')
  if (!target) return NO_PROJECT
  const modeOn = (await orca.settings.get('worktrees')) === 'block'
  const key = modeOn ? WORKTREES_ALLOWED_KEY : NO_WORKTREES_KEY
  const list = ids(await orca.storage.get(key))
  const listed = list.includes(target.key)
  await orca.storage.set(key, listed ? list.filter((id) => id !== target.key) : [...list, target.key])
  // Mode on: a listed project was allowed and now is not. Mode off: a listed one was banned.
  return modeOn === listed ? `${target.name}: new worktrees blocked.` : `${target.name}: new worktrees allowed.`
}

export default function activate(orca: OrcaWorkerApi): void {
  orca.panels.handle('live.load', async () => loadLive(orca))
  orca.panels.handle('session.open', async (input) => openSession(orca, input))
  orca.panels.handle('workspace.mark', async (input) => markWorkspace(input))
  orca.panels.handle('workspace.remove', async (input) => removeWorkspace(input))
  orca.panels.handle('terminal.close', async (input) => closeTab(input))
  orca.panels.handle('project.hide', async (input) => hideProject(orca, input))
  orca.panels.handle('chat.start', async (input) => startChat(input))
  orca.panels.handle('worktree.start', async (input) => startWorktree(orca, input))
  orca.commands.register('chat.new', async () => newChatHere(orca))
  orca.commands.register('worktrees.toggle', async () => toggleWorktrees(orca))
  // Folder workspaces are never worktrees, so they always pass.
  orca.hooks.on('workspace.create.before', async (event) => {
    if (event.kind === 'worktree' && (await worktreePolicy(orca))(event.projectId)) {
      return { deny: WORKTREES_BLOCKED }
    }
  })

  // Coalesce bursts of events (an agent streaming status, a batch of worktrees) into one reload.
  let timer: ReturnType<typeof setTimeout> | null = null
  let reasons = new Set<string>()
  const changed = (reason: string): void => {
    reasons.add(reason)
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      const reason = [...reasons].join(',')
      reasons = new Set()
      orca.panels.post('live.changed', { reason })
    }, CHANGE_DEBOUNCE_MS)
  }
  orca.events.on('agent.status.changed', () => changed('agent'))
  orca.events.on('workspace.created', () => changed('workspace'))
  orca.events.on('workspace.removed', () => changed('workspace'))
}

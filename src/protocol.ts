// The panel <-> worker contract, declared once: src/frame.ts and src/worker.ts both read it.
import type { Snapshot } from './model'

/** Plugin storage keys the panel writes and the worker reads. */
export const NEW_AGENT_KEY = 'st.newAgent'
/** Project ids where the worker's hook refuses new worktrees. */
export const NO_WORKTREES_KEY = 'st.noWorktrees'
/** Projects still allowed new worktrees while No Worktree Mode is on. */
export const WORKTREES_ALLOWED_KEY = 'st.worktreesAllowed'
/** How a new agent opens: Orca's chat or its CLI in a terminal. */
export const SURFACE_KEY = 'st.surface'
export type Surface = 'chat' | 'terminal'

export interface ActionResult {
  ok: boolean
  code?: string
  message?: string
}

declare module 'orca' {
  interface PluginRequests {
    /** Every open agent session as Orca lists it, where + can start one, and the agents to pick. */
    'live.load': { output: Snapshot }
    /** Sets or clears Orca's unread dot on a workspace (`LiveAgent.selector`) without opening it. */
    'workspace.mark': { input: { selector: string; read: boolean }; output: ActionResult }
    /** Removes a workspace that is not a main checkout: Orca forgets it, or deletes a worktree's folder. */
    'workspace.remove': { input: { selector: string }; output: ActionResult }
    /** Closes a terminal agent's tab. */
    'terminal.close': { input: { terminalId: string }; output: ActionResult }
    /** Hides a project from Orca's sidebar, as its own Hide Project does. */
    'project.hide': { input: { projectId: string }; output: ActionResult }
    /** Shows a session: a terminal agent's tab, or else its workspace. */
    'session.open': { input: { terminalId: string | null; workspaceId: string }; output: ActionResult }
    /** Starts an agent as your Chat | CLI setting says, in an existing workspace (`Target.selector`). */
    'chat.start': { input: { selector: string; agent: string; surface: Surface }; output: ActionResult }
    /** Creates a worktree in a Git project (`Target.key`) named `name`, with the agent in it. */
    'worktree.start': { input: { repo: string; name: string; agent: string; surface: Surface }; output: ActionResult }
  }
  interface PluginPanelEvents {
    /** Something Orca lists changed; the panel reloads. */
    'live.changed': { reason: string }
  }
}

// The Node built-ins the worker uses; the plugin typings carry no Node types.
declare module 'node:child_process' {
  export function execFile(
    file: string,
    args: readonly string[],
    options: { timeout?: number; maxBuffer?: number },
    callback: (error: Error | null, stdout: string) => void
  ): unknown
}
declare const process: { execPath: string; platform: string }

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: false,
    css: false,

    // One forked child at a time, with a much larger heap than the default.
    //
    // This is not tuning, it is the difference between the suite running and not.
    // Every test mounts the real index.html and evaluates the real js/app.js in a
    // fresh jsdom, and app.js is now about 930KB — 620KB of it hand-authored SVG
    // path data for 26 plant species, 84KB for the animals. jsdom holds a
    // compiled copy per instance, so a file with 70 tests is holding 70 of them
    // by the time it finishes.
    //
    // Without this the run dies partway through with ERR_IPC_CHANNEL_CLOSED and a
    // V8 stack trace, which reads like a broken test and is nothing of the kind.
    //
    // Two details worth keeping:
    //   * execArgv, not the parent process's flags — the tests run in the child,
    //     and a child does not inherit --max-old-space-size.
    //   * one fork at a time (min/maxForks 1), because two children each
    //     allowed 8GB is how the machine runs out of memory rather than the
    //     suite. But NOT singleFork: that reused one child for all 12 files,
    //     and the mounted app instances accumulated across files until the
    //     suite died of heap exhaustion at ~175 tests. With isolate (the
    //     default) and singleFork off, every file gets a fresh child, so the
    //     heap resets between files and the cap only has to hold one file.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        minForks: 1,
        maxForks: 1,
        execArgv: ['--max-old-space-size=8192']
      }
    }
  }
});

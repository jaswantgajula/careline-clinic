import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'index.js'], {
    cwd: new URL('../backend/', import.meta.url),
    stdio: 'inherit',
  }),
  spawn(
    process.execPath,
    [
      new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname,
      '--host',
      '127.0.0.1',
      '--strictPort',
    ],
    { cwd: new URL('../frontend/', import.meta.url), stdio: 'inherit' },
  ),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
for (const child of children)
  child.on('exit', (code) => {
    stop();
    process.exitCode = code || 0;
  });

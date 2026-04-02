import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: [
    'firebase-admin',
    'firebase-functions'
  ],
}).catch(() => process.exit(1));

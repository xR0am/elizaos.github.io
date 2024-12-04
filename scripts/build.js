import * as esbuild from 'esbuild';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const externals = [
  'react',
  'react-dom',
  'react-dom/server',
  'recharts',
  'fs',
  'path',
  'url',
  'stream',
  'util',
  'http',
  'zlib'
];

await esbuild.build({
  entryPoints: ['scripts/generate_site.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/generate_site.js',
  external: externals,
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

console.log('Build complete');
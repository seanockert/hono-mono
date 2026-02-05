const esbuild = require('esbuild');

const isProduction = process.env.NODE_ENV === 'production';

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    outdir: './dist',
    format: 'esm',
    target: 'esnext',
    platform: 'browser',
    conditions: ['workerd', 'worker', 'browser'],
    external: ['bun:sqlite', '__STATIC_CONTENT_MANIFEST'],
    minify: isProduction,
    sourcemap: !isProduction,
    logLevel: 'info',
    metafile: true,
  })
  .then((result) => {
    if (result.metafile) {
      require('fs').writeFileSync('./dist/meta.json', JSON.stringify(result.metafile, null, 2));
      console.log('\n📊 Bundle analysis saved to dist/meta.json');
      console.log('   View it at: https://esbuild.github.io/analyze/\n');
    }
  })
  .catch(() => process.exit(1));

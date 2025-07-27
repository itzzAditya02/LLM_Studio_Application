const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Shows detailed errors when bundling fails
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[esbuild] Build started...');
    });
    build.onEnd((result) => {
      if (result.errors.length) {
        console.error('[esbuild] Build failed with errors:');
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ ${text}`);
          if (location) {
            console.error(`   at ${location.file}:${location.line}:${location.column}`);
          }
        });
      } else {
        console.log('[esbuild] ✅ Build succeeded');
      }
    });
  }
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    platform: 'node',
    external: ['vscode'], // Important for VS Code extensions
    outfile: 'dist/extension.js',
    plugins: [esbuildProblemMatcherPlugin],
    logLevel: 'silent',
  });

  if (watch) {
    console.log('[esbuild] Watching for changes...');
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error('[esbuild] ❌ Fatal error:', e);
  process.exit(1);
});

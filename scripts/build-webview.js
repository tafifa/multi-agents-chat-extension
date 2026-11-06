const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [path.join(__dirname, '../webview/src/main.ts')],
  bundle: true,
  outfile: path.join(__dirname, '../dist-webview/main.js'),
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  target: ['chrome100', 'es2022'],
  loader: {
    '.css': 'css'
  }
};

if (isWatch) {
  esbuild.context(buildOptions).then((ctx) => {
    ctx.watch();
    console.log('Watching webview changes...');
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Webview bundled successfully.');
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

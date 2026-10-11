const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

async function buildOffline() {
  console.log('Building standalone offline PsiEdit...');

  const cacheDir = path.join(__dirname, '..', 'offline_cache');
  if (!fs.existsSync(path.join(cacheDir, 'textures.json'))) {
    throw new Error('Offline cache not found! Run download first.');
  }

  // 1. Read cached assets
  console.log('Reading cached offline assets...');
  const textures = JSON.parse(fs.readFileSync(path.join(cacheDir, 'textures.json'), 'utf8'));
  const psiLang = JSON.parse(fs.readFileSync(path.join(cacheDir, 'psi_lang.json'), 'utf8'));
  const phiLang = JSON.parse(fs.readFileSync(path.join(cacheDir, 'phi_lang.json'), 'utf8'));
  const faWoff2 = fs.readFileSync(path.join(cacheDir, 'fa-solid-900.woff2')).toString('base64');

  // 2. Read binaries
  const wasm2Buf = fs.readFileSync(path.join(__dirname, '..', 'node_modules/psi-spell-encode-wasm/psi_spell_encode_wasm_bg.wasm'));
  const wasm3Buf = fs.readFileSync(path.join(__dirname, '..', 'node_modules/psi-spell-encode-wasm-v3/psi-spell-encode-wasm_bg.wasm'));
  const wasm2B64 = wasm2Buf.toString('base64');
  const wasm3B64 = wasm3Buf.toString('base64');

  const iconB64 = fs.readFileSync(path.join(__dirname, '..', 'src/icon.png')).toString('base64');
  const unknownB64 = fs.readFileSync(path.join(__dirname, '..', 'src/unknown.png')).toString('base64');
  const mcOtfB64 = fs.readFileSync(path.join(__dirname, '..', 'src/mc.otf')).toString('base64');

  // 3. Read template HTMLs
  const controlsHtml = fs.readFileSync(path.join(__dirname, '..', 'src/controls.html'), 'utf8');
  const psiHtml = fs.readFileSync(path.join(__dirname, '..', 'src/pieces/psi.html'), 'utf8');
  const phiHtml = fs.readFileSync(path.join(__dirname, '..', 'src/pieces/phi.html'), 'utf8');

  // 4. Read & process CSS
  console.log('Processing stylesheets and fonts...');
  const cssFiles = [
    'style.css',
    'theme.css',
    'grid.css',
    'piece.css',
    'lines.css',
    'catalog.css',
    'sources.css',
    'error.css',
    'util.css'
  ];

  let combinedCss = '';

  // Process FontAwesome CSS
  let faCss = fs.readFileSync(path.join(cacheDir, 'fa.css'), 'utf8');
  // Inject inlined woff2 for Font Awesome 6 Free
  const faFontFace = `
@font-face {
  font-family: "Font Awesome 6 Free";
  font-style: normal;
  font-weight: 900;
  font-display: block;
  src: url("data:font/woff2;base64,${faWoff2}") format("woff2");
}
@font-face {
  font-family: "Font Awesome 6 Free";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("data:font/woff2;base64,${faWoff2}") format("woff2");
}
`;
  // Remove external @font-face references in fa.css and prepend our inlined one
  faCss = faCss.replace(/@font-face\s*\{[^}]*webfonts[^}]*\}/g, '');
  combinedCss += faFontFace + '\n' + faCss + '\n';

  // Read app CSS files
  for (const file of cssFiles) {
    let content = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    if (file === 'theme.css') {
      content = content.replace(/url\(['"]?mc\.otf['"]?\)/g, `url('data:font/otf;base64,${mcOtfB64}')`);
    }
    if (file === 'piece.css') {
      content = content.replace(/url\(['"]?unknown\.png['"]?\)/g, `url('data:image/png;base64,${unknownB64}')`);
    }
    combinedCss += `\n/* --- ${file} --- */\n` + content + '\n';
  }

  // 5. Bundle JS using esbuild
  console.log('Bundling JavaScript with esbuild...');
  const urlPlugin = {
    name: 'url-query-plugin',
    setup(build) {
      build.onResolve({ filter: /\?url$/ }, args => {
        const cleanPath = args.path.replace(/\?url$/, '');
        const baseName = path.basename(cleanPath);
        return { path: cleanPath, namespace: 'url-stub', pluginData: { name: baseName } };
      });
      build.onLoad({ filter: /.*/, namespace: 'url-stub' }, args => {
        return {
          contents: `export default ${JSON.stringify(args.pluginData.name)};`,
          loader: 'js'
        };
      });
    }
  };

  const bundleResult = await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src/main.mjs')],
    bundle: true,
    format: 'iife',
    minify: false,
    write: false,
    plugins: [urlPlugin],
    target: ['chrome90', 'edge90', 'firefox90']
  });

  const bundledJs = bundleResult.outputFiles[0].text;

  // 6. Build the single HTML document
  console.log('Constructing standalone HTML document...');
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
\t<meta charset="UTF-8">
\t<meta http-equiv="X-UA-Compatible" content="IE=edge">
\t<meta name="viewport" content="width=device-width, initial-scale=1.0">
\t<meta name="theme-color" content="#282828">
\t<title>PsiEdit (Standalone Local)</title>
\t<link rel="icon" href="data:image/png;base64,${iconB64}">
\t<style>
${combinedCss}
\t</style>
</head>
<body>
\t<main class="center">
\t\t<div class="piece-config" id="piece-config">
\t\t\t<div data-piece-name></div>
\t\t\t<div data-piece-desc></div>
\t\t</div>
\t\t<div class="vertical">
\t\t\t<div class="grid" id="spell-grid"></div>
\t\t\t<div class="horizontal hjustify">
\t\t\t\t<div>Name:</div>
\t\t\t\t<input type="text" id="spell-name" style="width: 80%;">
\t\t\t</div>
\t\t</div>
\t\t<div class="vertical catalog-container">
\t\t\t<div class="horizontal">
\t\t\t\t<i class="fa-solid fa-magnifying-glass"></i>
\t\t\t\t<input type="search" class="catalog-search" id="search">
\t\t\t</div>
\t\t\t<div class="catalog" id="piece-catalog"></div>
\t\t\t<div class="horizontal">
\t\t\t\t<button id="import" data-tooltip="Import spell"><i class="fa-solid fa-file-import"></i></button>
\t\t\t\t<button id="export" data-tooltip="Export spell"><i class="fa-solid fa-file-export"></i></button>
\t\t\t\t<button id="delete" data-tooltip="Delete piece"><i class="fa-solid fa-trash"></i></button>
\t\t\t\t<button id="sources" data-tooltip="Addons"><i class="fa-solid fa-puzzle-piece"></i></button>
\t\t\t</div>
\t\t</div>
\t</main>
\t<div class="dialog center" hidden>
\t\t<div class="piece-sources">
\t\t\t<div class="title text-center">Addons</div>
\t\t\t<button class="close-dialog" id="close-sources" data-tooltip="Close"><i class="fa-solid fa-times"></i></button>
\t\t\t<div class="horizontal vcenter-items">
\t\t\t\t<input type="url" id="source-url" placeholder="Piece list URL / addon">
\t\t\t\t<button id="add-source" data-tooltip="Add source"><i class="fa-solid fa-plus"></i></button>
\t\t\t</div>
\t\t\t<div class="sources-list" id="source-list"></div>
\t\t</div>
\t</div>
\t<div class="dialog center" hidden>
\t\t<div class="error-popup">
\t\t\t<div class="title text-center">Error</div>
\t\t\t<button class="close-dialog" id="close-error" data-tooltip="Close"><i class="fa-solid fa-times"></i></button>
\t\t\t<div id="error-message"></div>
\t\t</div>
\t</div>

\t<script>
function __b64ToBytes(b64) {
\tconst bin = atob(b64);
\tconst len = bin.length;
\tconst bytes = new Uint8Array(len);
\tfor (let i = 0; i < len; i++) {
\t\tbytes[i] = bin.charCodeAt(i);
\t}
\treturn bytes;
}

window.__WASM_BYTES_2__ = __b64ToBytes(${JSON.stringify(wasm2B64)});
window.__WASM_BYTES_3__ = __b64ToBytes(${JSON.stringify(wasm3B64)});

window.__EMBEDDED_HTML__ = {
\t"controls.html": ${JSON.stringify(controlsHtml)},
\t"pieces/psi.html": ${JSON.stringify(psiHtml)},
\t"pieces/phi.html": ${JSON.stringify(phiHtml)}
};

window.__OFFLINE_TEXTURES__ = ${JSON.stringify(textures)};

window.__OFFLINE_LANG__ = {
\t"psi": ${JSON.stringify(psiLang)},
\t"phi": ${JSON.stringify(phiLang)}
};
\t</script>
\t<script>
${bundledJs}
\t</script>
</body>
</html>
`;

  // Write outputs
  const distPath = path.join(__dirname, '..', 'dist', 'PsiEdit.html');
  const rootPath = path.join(__dirname, '..', 'PsiEdit.html');
  fs.writeFileSync(distPath, htmlTemplate, 'utf8');
  fs.writeFileSync(rootPath, htmlTemplate, 'utf8');

  console.log(`Success! Standalone PsiEdit generated:`);
  console.log(`  - Root: ${rootPath} (${(htmlTemplate.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  - Dist: ${distPath}`);
}

buildOffline().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});

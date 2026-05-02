import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, 'dist');
const distModuleDir = path.join(distDir, 'module');
const distModelsDir = path.join(distDir, 'models', 'community');
const sourceModelsDir = path.join(rootDir, 'models', 'community');

async function cleanDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distModelsDir, { recursive: true });
  await fs.mkdir(distModuleDir, { recursive: true });
}

async function copyRuntimeFiles() {
  await Promise.all([
    fs.copyFile(path.join(rootDir, 'src', 'index.js'), path.join(distDir, 'index.js')),
    patchAndWritePredictor(
      path.join(rootDir, 'src', 'module', 'Predictor.js'),
      path.join(distModuleDir, 'Predictor.js'),
    ),
  ]);
}

async function patchAndWritePredictor(srcPath, destPath) {
  let src = await fs.readFile(srcPath, 'utf-8');
  // In source the file lives at src/module/ (two levels from package root).
  // In the published package it lives at module/ (one level from package root).
  // Patch the depth so model paths resolve correctly when installed.
  src = src.replace(
    "path.resolve(MODULE_DIR, '..', '..')",
    "path.resolve(MODULE_DIR, '..')",
  );
  await fs.writeFile(destPath, src, 'utf-8');
}

async function bundleBrowserBuild() {
  await build({
    entryPoints: [path.join(rootDir, 'src', 'frspell.browser.global.js')],
    bundle: true,
    outfile: path.join(distDir, 'frspell.browser.js'),
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: false,
  });
}

async function copyModelAssets() {
  const assetFiles = [
    'lemma_type_model.int8.onnx',
    'derive_form_model.int8.onnx',
    'lemma_type_vocab.json',
    'lemma_type_labels.json',
    'derive_form_vocab.json',
  ];

  await Promise.all(
    assetFiles.map((name) =>
      fs.copyFile(path.join(sourceModelsDir, name), path.join(distModelsDir, name)),
    ),
  );
}

const README_OPTS = {
  'README.md': {
    sectionsToStrip: ['## Run Test', '## Run Help', '## Build Browser Bundle', '## Run Benchmark'],
    buildHeading: '## Build Browser Bundle',
    insertBeforeHeading: '## Prediction Parameters',
    browserHeading: '## Browser Usage',
  },
  'README.cn.md': {
    sectionsToStrip: ['## 运行测试', '## 查看帮助', '## 构建浏览器 Bundle', '## 运行基准测试'],
    buildHeading: '## 构建浏览器 Bundle',
    insertBeforeHeading: '## 预测参数说明',
    browserHeading: '## 浏览器用法',
  },
  'README.fr.md': {
    sectionsToStrip: ['## Exécuter les tests', "## Afficher l'aide", '## Construire le bundle navigateur', '## Exécuter les benchmarks'],
    buildHeading: '## Construire le bundle navigateur',
    insertBeforeHeading: '## Parametres de prediction',
    browserHeading: '## Utilisation dans le navigateur',
  },
};

async function reshapeReadme(srcPath, destPath, opts) {
  let content = await fs.readFile(srcPath, 'utf-8');

  // Extract browser HTML snippet from the build section before stripping it
  let browserHtml = '';
  const buildStart = content.indexOf(`\n${opts.buildHeading}`);
  if (buildStart !== -1) {
    const buildEnd = content.indexOf('\n## ', buildStart + 1);
    const buildContent = buildEnd === -1 ? content.slice(buildStart) : content.slice(buildStart, buildEnd);
    const htmlBlockStart = buildContent.indexOf('```html');
    const htmlBlockEnd = buildContent.lastIndexOf('```');
    if (htmlBlockStart !== -1 && htmlBlockEnd > htmlBlockStart) {
      browserHtml = buildContent.slice(htmlBlockStart, htmlBlockEnd + 3);
    }
  }

  // Strip unwanted sections
  for (const heading of opts.sectionsToStrip) {
    const start = content.indexOf(`\n${heading}`);
    if (start === -1) continue;
    const nextSection = content.indexOf('\n## ', start + 1);
    if (nextSection === -1) continue;
    content = content.slice(0, start) + content.slice(nextSection);
  }

  // Insert browser section before the prediction parameters section
  if (browserHtml) {
    const insertAt = content.indexOf(`\n${opts.insertBeforeHeading}`);
    if (insertAt !== -1) {
      const browserSection = `\n\n${opts.browserHeading}\n\n${browserHtml}`;
      content = content.slice(0, insertAt) + browserSection + content.slice(insertAt);
    }
  }

  // Remove benchmark command paragraph (keep only results)
  const benchmarkCommandPhrases = [
    'Benchmark command:\n\n```bash\nnpm run benchmark\n```',
    '基准命令：\n\n```bash\nnpm run benchmark\n```',
    'Commande de benchmark :\n\n```bash\nnpm run benchmark\n```',
  ];
  for (const phrase of benchmarkCommandPhrases) {
    // Try both LF and CRLF variants
    for (const p of [phrase, phrase.replace(/\n/g, '\r\n')]) {
      const idx = content.indexOf(p);
      if (idx !== -1) {
        // Also consume the trailing newline(s) left behind
        let end = idx + p.length;
        while (end < content.length && (content[end] === '\n' || content[end] === '\r')) end++;
        content = content.slice(0, idx) + content.slice(end);
        break;
      }
    }
  }

  await fs.writeFile(destPath, content, 'utf-8');
}

async function copyPackageDocs() {
  await Promise.all([
    reshapeReadme(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md'), README_OPTS['README.md']),
    reshapeReadme(path.join(rootDir, 'README.cn.md'), path.join(distDir, 'README.cn.md'), README_OPTS['README.cn.md']),
    reshapeReadme(path.join(rootDir, 'README.fr.md'), path.join(distDir, 'README.fr.md'), README_OPTS['README.fr.md']),
    fs.copyFile(path.join(rootDir, 'LICENSE'), path.join(distDir, 'LICENSE')),
  ]);
}

function buildDistPackageJson(rootPkg) {
  return {
    name: rootPkg.name,
    version: rootPkg.version,
    description: rootPkg.description,
    type: rootPkg.type,
    main: './index.js',
    exports: {
      '.': './index.js',
      './browser': './frspell.browser.js',
    },
    files: [
      'index.js',
      'frspell.browser.js',
      'module',
      'models',
      'README.md',
      'README.cn.md',
      'README.fr.md',
      'LICENSE',
    ],
    repository: rootPkg.repository,
    keywords: rootPkg.keywords,
    homepage: rootPkg.homepage,
    license: rootPkg.license,
    funding: rootPkg.funding,
    author: rootPkg.author,
    dependencies: rootPkg.dependencies,
  };
}

async function createDistPackageJson() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkgRaw = await fs.readFile(pkgPath, 'utf-8');
  const rootPkg = JSON.parse(pkgRaw);
  const distPkg = buildDistPackageJson(rootPkg);

  await fs.writeFile(path.join(distDir, 'package.json'), `${JSON.stringify(distPkg, null, 2)}\n`, 'utf-8');
}

async function main() {
  await cleanDist();
  await copyRuntimeFiles();
  await bundleBrowserBuild();
  await copyModelAssets();
  await copyPackageDocs();
  await createDistPackageJson();
  console.log('Build completed: dist is now publish-ready for npm publish ./dist.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

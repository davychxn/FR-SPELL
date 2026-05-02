import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, 'dist');
const distModuleDir = path.join(distDir, 'module');
const distScriptsDir = path.join(distDir, 'scripts');
const distModelsDir = path.join(distDir, 'models', 'community');
const sourceModelsDir = path.join(rootDir, 'models', 'community');

async function cleanDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distModelsDir, { recursive: true });
  await fs.mkdir(distModuleDir, { recursive: true });
  await fs.mkdir(distScriptsDir, { recursive: true });
}

async function copyRuntimeFiles() {
  await Promise.all([
    fs.copyFile(path.join(rootDir, 'src', 'index.js'), path.join(distDir, 'index.js')),
    fs.copyFile(path.join(rootDir, 'src', 'module', 'Predictor.js'), path.join(distModuleDir, 'Predictor.js')),
  ]);
}

async function copyPublishScripts() {
  await fs.copyFile(path.join(rootDir, 'scripts', 'help.js'), path.join(distScriptsDir, 'help.js'));
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

async function copyPackageDocs() {
  await Promise.all([
    fs.copyFile(path.join(rootDir, 'README.md'), path.join(distDir, 'README.md')),
    fs.copyFile(path.join(rootDir, 'README.cn.md'), path.join(distDir, 'README.cn.md')),
    fs.copyFile(path.join(rootDir, 'README.fr.md'), path.join(distDir, 'README.fr.md')),
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
      'scripts/help.js',
      'README.md',
      'README.cn.md',
      'README.fr.md',
      'LICENSE',
    ],
    scripts: {
      help: 'node scripts/help.js',
    },
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
  await copyPublishScripts();
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

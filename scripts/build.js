import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const rootDir = path.resolve(process.cwd());
const distDir = path.join(rootDir, 'dist');
const distModelsDir = path.join(distDir, 'models', 'community');
const sourceModelsDir = path.join(rootDir, 'models', 'community');

async function cleanDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distModelsDir, { recursive: true });
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

async function main() {
  await cleanDist();
  await bundleBrowserBuild();
  await copyModelAssets();
  console.log('Build completed: dist/frspell.browser.js and model assets are ready.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

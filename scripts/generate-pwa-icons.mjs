import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const iconsDir = path.join(root, 'apps/web/public/icons');

const renderPng = async (inputPath, outputPath, size) => {
  const svg = await readFile(inputPath);
  await sharp(svg).resize(size, size).png().toFile(outputPath);
};

const main = async () => {
  await mkdir(iconsDir, { recursive: true });

  const iconSvg = path.join(iconsDir, 'icon.svg');
  const maskableSvg = path.join(iconsDir, 'icon-maskable.svg');

  await renderPng(iconSvg, path.join(iconsDir, 'icon-192.png'), 192);
  await renderPng(iconSvg, path.join(iconsDir, 'icon-512.png'), 512);
  await renderPng(maskableSvg, path.join(iconsDir, 'icon-512-maskable.png'), 512);
  await renderPng(iconSvg, path.join(iconsDir, 'apple-touch-icon.png'), 180);
  await renderPng(iconSvg, path.join(iconsDir, 'favicon-32.png'), 32);
  await renderPng(iconSvg, path.join(iconsDir, 'favicon-16.png'), 16);
  console.log('Iconos PWA generados en apps/web/public/icons');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

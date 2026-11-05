import {readFile, writeFile} from 'node:fs/promises';

// Inline the existing dark logo: iOS PDF printing cannot load local file URLs.
const logo = await readFile(new URL('../assets/brand/logo-dark.png', import.meta.url));
await writeFile(new URL('../src/invoice-logo.ts', import.meta.url),
  '// Generated from assets/brand/logo-dark.png; run node scripts/generate-invoice-logo.mjs after replacing it.\n' +
  `export const invoiceLogo = ${JSON.stringify('data:image/png;base64,' + logo.toString('base64'))};\n`);

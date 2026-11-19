// GitHub Pages 用の単体ページを docs/ に作ります： node build.mjs
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';

const src = await readFile('index.html', 'utf8');
const cut = src.indexOf('</style>') + '</style>'.length;
const head = src.slice(0, cut), body = src.slice(cut);
const page = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${head}
</head>
<body>
<script src="standalone.js"></script>${body}</body>
</html>
`;
await mkdir('docs', { recursive: true });
await writeFile('docs/index.html', page);
for (const f of ['qr.js', 'jsqr.js', 'standalone.js']) await copyFile(f, 'docs/' + f);
await mkdir('docs/cards', { recursive: true });
for (const f of await readdir('cards')) await copyFile('cards/' + f, 'docs/cards/' + f);
await writeFile('docs/.nojekyll', '');
console.log('docs/ を更新しました');

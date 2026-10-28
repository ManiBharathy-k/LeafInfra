import { mkdir, rm, copyFile, cp, readdir } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist');
const pages = (await readdir('.')).filter(file => file.endsWith('.html'));
for (const file of [...pages,'robots.txt','sitemap.xml','_headers','_redirects']) await copyFile(file, 'dist/' + file);
await cp('assets', 'dist/assets', {recursive:true});
console.log(`Built ${pages.length} pages and local assets`);

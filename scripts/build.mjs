import { mkdir, rm, copyFile, cp } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist');
for (const file of ['index.html','privacy.html','robots.txt','sitemap.xml','_headers','_redirects']) await copyFile(file, 'dist/' + file);
await cp('assets', 'dist/assets', {recursive:true});

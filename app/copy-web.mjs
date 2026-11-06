// 웹 게임 파일을 앱 안으로 복사합니다. 게임을 고친 뒤 npm run sync로 실행하세요.
import { cp, mkdir, rm } from 'node:fs/promises';

const items = ['index.html', 'privacy.html', 'config.js', 'art.js', 'dex.js', 'glass.js', 'manifest.webmanifest', 'icons', 'vendor', 'fonts'];
await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const item of items) await cp(`../${item}`, `www/${item}`, { recursive: true });
console.log('복사 완료:', items.length, '항목');

/**
 * Prepara la carpeta /docs que publica GitHub Pages:
 * - 404.html = index.html, para que las rutas de React funcionen al recargar la página.
 * - .nojekyll, para que GitHub Pages sirva los archivos tal cual.
 * - v1/, copia de la primera versión del sitio (HTML, CSS y JavaScript).
 */
import { cpSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = join(raiz, 'docs');

copyFileSync(join(docs, 'index.html'), join(docs, '404.html'));
writeFileSync(join(docs, '.nojekyll'), '');
if (existsSync(join(raiz, 'legacy'))) cpSync(join(raiz, 'legacy'), join(docs, 'v1'), { recursive: true });
console.log('Sitio listo en /docs para GitHub Pages');

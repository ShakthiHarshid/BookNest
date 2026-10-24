import { readFile, writeFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, css, catalogue, app, csv] = await Promise.all([
  read('./index.template.html'), read('./styles.css'), read('./src/catalogue.js'), read('./src/app.js'),
  read('./library_books.csv'),
]);

const embeddedCsv = Buffer.from(csv, 'utf8').toString('base64');
const inlineApp = `${catalogue}\n${app.replace(/^import .* from ['"]\.\/catalogue\.js['"];?\s*/m, '')}`;
const preview = html
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/app.js"></script>',
    `<script id="booknest-csv" type="application/octet-stream">${embeddedCsv}</script>\n<script type="module">\n${inlineApp}\n</script>`);

await writeFile(new URL('./index.html', import.meta.url), preview, 'utf8');
console.log('Created a standalone index.html. Open this file directly to preview BookNest without a server.');

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAndSortBooks, parseCSV, recommendBooks } from '../src/catalogue.js';

const sample = 'book_id,title,author,subject,publication_year,availability\n' +
  'A,Alpha,Zoë,Physics,2020,Available\n' +
  'B,"Beta, the Second",Ada Lovelace,Physics,2024,Checked Out\n' +
  'C,Gamma,Sam,History,2020,Checked Out';

test('loads the demonstration CSV with unique, validated records', async () => {
  const text = await readFile(new URL('../library_books.csv', import.meta.url), 'utf8');
  const parsed = parseCSV(text);
  assert.equal(parsed.books.length, 35);
  assert.equal(parsed.errors.length, 0);
  assert.equal(new Set(parsed.books.map((book) => book.book_id)).size, 35);
});

test('the generated index is standalone and embeds the current CSV', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const csv = await readFile(new URL('../library_books.csv', import.meta.url), 'utf8');
  const embedded = html.match(/<script id="booknest-csv" type="application\/octet-stream">([^<]+)<\/script>/);
  assert.ok(embedded, 'generated page includes embedded catalogue data');
  assert.equal(Buffer.from(embedded[1], 'base64').toString('utf8'), csv);
  assert.match(html, /<style>/);
  assert.doesNotMatch(html, /<script type="module" src=/);
});

test('parses quoted commas, Unicode, and validates malformed rows without losing good rows', () => {
  const parsed = parseCSV(`${sample}\nA,Duplicate,Author,Physics,2021,Available\nD,Bad,Author,Nope,2020,Available\nE,Missing,Author,History,,Available\nF,Future,Author,History,2039,Available\nG,Other,Author,History,2020,On Hold`);
  assert.equal(parsed.books.length, 3);
  assert.equal(parsed.books[1].title, 'Beta, the Second');
  assert.equal(parsed.books[0].author, 'Zoë');
  assert.equal(parsed.errors.length, 5);
});

test('searches title and author case-insensitively and combines filters', () => {
  assert.equal(filterAndSortBooks(parseCSV(sample).books, { query: '  ADA ', subject: 'Physics' }).length, 1);
  assert.equal(filterAndSortBooks(parseCSV(sample).books, { query: 'phys' }).length, 0);
});

test('sorts every supported way with deterministic tie breaking', () => {
  const books = parseCSV(sample).books;
  assert.deepEqual(filterAndSortBooks(books).map((book) => book.title), ['Alpha', 'Beta, the Second', 'Gamma']);
  assert.deepEqual(filterAndSortBooks(books, { sort: 'title-desc' }).map((book) => book.title), ['Gamma', 'Beta, the Second', 'Alpha']);
  assert.deepEqual(filterAndSortBooks(books, { sort: 'year-newest' }).map((book) => book.title), ['Beta, the Second', 'Alpha', 'Gamma']);
  assert.deepEqual(filterAndSortBooks(books, { sort: 'year-oldest' }).map((book) => book.title), ['Alpha', 'Gamma', 'Beta, the Second']);
});

test('recommends the selected subject, prefers available books, and excludes a selected book', () => {
  const physics = recommendBooks(parseCSV(sample).books, 'Physics', 'A');
  assert.deepEqual(physics.map((book) => book.title), ['Beta, the Second']);
  assert.deepEqual(recommendBooks(parseCSV(sample).books, 'Chemistry'), []);
});

test('reports empty CSV and missing headers as data errors', () => {
  assert.ok(parseCSV('').errors.length);
  assert.throws(() => parseCSV('title,author\nOne,Two'), /Missing required CSV columns/);
  assert.throws(() => parseCSV('book_id,title,title,author,subject,publication_year,availability'), /duplicate column names/);
  assert.throws(() => parseCSV('book_id,title,author,subject,publication_year,availability\nA,"unfinished'), /unclosed quoted field/);
});

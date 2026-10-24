export const REQUIRED_COLUMNS = ['book_id', 'title', 'author', 'subject', 'publication_year', 'availability'];
export const SUBJECTS = new Set([
  'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Literature', 'History', 'Economics', 'General Reference',
]);
export const AVAILABILITY = new Set(['Available', 'Checked Out']);

export function parseCSV(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = input.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (!rows.length) return { books: [], errors: ['The catalogue file is empty.'] };

  const headers = rows.shift().map((value) => value.trim());
  if (new Set(headers).size !== headers.length) throw new Error('The CSV header contains duplicate column names.');
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(', ')}.`);

  const books = [];
  const errors = [];
  const seenIds = new Set();
  rows.forEach((values, index) => {
    const line = index + 2;
    if (values.length !== headers.length) {
      errors.push(`Row ${line}: expected ${headers.length} columns, found ${values.length}.`);
      return;
    }
    const record = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]));
    const validationError = validateRecord(record, seenIds);
    if (validationError) { errors.push(`Row ${line}: ${validationError}`); return; }
    seenIds.add(record.book_id);
    books.push({ ...record, publication_year: Number(record.publication_year) });
  });
  return { books, errors };
}

function validateRecord(record, seenIds) {
  for (const column of REQUIRED_COLUMNS) {
    if (!record[column]) return `“${column}” is required.`;
  }
  if (seenIds.has(record.book_id)) return `duplicate book_id “${record.book_id}”.`;
  const year = Number(record.publication_year);
  if (!/^\d{4}$/.test(record.publication_year) || year < 1000 || year > new Date().getFullYear()) {
    return `publication_year must be a four-digit year from 1000 to ${new Date().getFullYear()}.`;
  }
  if (!SUBJECTS.has(record.subject)) return `unknown subject “${record.subject}”.`;
  if (!AVAILABILITY.has(record.availability)) return `availability must be Available or Checked Out.`;
  return '';
}

export function filterAndSortBooks(books, { query = '', subject = '', availability = '', sort = 'title-asc' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const result = books.filter((book) =>
    (!normalizedQuery || `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedQuery)) &&
    (!subject || book.subject === subject) &&
    (!availability || book.availability === availability));

  const compareText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  result.sort((a, b) => {
    let order = 0;
    if (sort === 'title-desc') order = compareText(b.title, a.title);
    else if (sort === 'year-newest') order = b.publication_year - a.publication_year;
    else if (sort === 'year-oldest') order = a.publication_year - b.publication_year;
    else order = compareText(a.title, b.title);
    return order || compareText(a.title, b.title) || compareText(a.book_id, b.book_id);
  });
  return result;
}

export function recommendBooks(books, subject, excludedId = '') {
  return books.filter((book) => book.subject === subject && book.book_id !== excludedId)
    .sort((a, b) => Number(b.availability === 'Available') - Number(a.availability === 'Available') ||
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || a.book_id.localeCompare(b.book_id));
}

import { filterAndSortBooks, parseCSV, recommendBooks } from './catalogue.js';

const elements = {
  search: document.querySelector('#search'),
  searchForm: document.querySelector('#search-form'),
  clearSearch: document.querySelector('#clear-search'),
  subject: document.querySelector('#subject-filter'),
  availability: document.querySelector('#availability-filter'),
  sort: document.querySelector('#sort-select'),
  reset: document.querySelector('#reset-filters'),
  count: document.querySelector('#result-count'),
  grid: document.querySelector('#book-grid'),
  state: document.querySelector('#catalogue-state'),
  notice: document.querySelector('#data-notice'),
  dialog: document.querySelector('#book-dialog'),
  dialogContent: document.querySelector('#dialog-content'),
  dialogClose: document.querySelector('#dialog-close'),
  recommendSubject: document.querySelector('#recommend-subject'),
  recommendButton: document.querySelector('#recommend-button'),
  recommendResults: document.querySelector('#recommend-results'),
};

let books = [];
let loadFailed = false;
let recommendationSubject = '';

const coverColors = {
  'Computer Science': ['#526963', '#b5795c'], Mathematics: ['#687788', '#8c7957'],
  Physics: ['#4f6e73', '#8b6b7b'], Chemistry: ['#927657', '#697b64'],
  Biology: ['#65795f', '#92715b'], Literature: ['#8c5f5c', '#5c6e74'],
  History: ['#816a52', '#68705b'], Economics: ['#65706c', '#9a735a'],
  'General Reference': ['#657b7c', '#827259'],
};

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createCover(book) {
  const cover = createElement('div', 'cover');
  const palette = coverColors[book.subject] || ['#657b70', '#87735d'];
  const color = palette[Array.from(book.book_id).reduce((total, char) => total + char.charCodeAt(0), 0) % palette.length];
  cover.style.backgroundColor = color;
  cover.append(createElement('span', 'cover-author', book.author));
  cover.append(createElement('span', 'cover-title', book.title));
  return cover;
}

function createCard(book) {
  const card = createElement('button', 'book-card');
  card.type = 'button';
  card.dataset.bookId = book.book_id;
  card.setAttribute('aria-label', `View details for ${book.title} by ${book.author}`);
  card.append(createCover(book));
  const meta = createElement('div', 'book-meta');
  meta.append(createElement('h3', '', book.title));
  meta.append(createElement('p', 'book-author', book.author));
  const bottom = createElement('div', 'meta-bottom');
  bottom.append(createElement('span', 'subject-chip', book.subject));
  bottom.append(createElement('span', 'year', String(book.publication_year)));
  const availability = createElement('span', `availability${book.availability === 'Checked Out' ? ' checked' : ''}`, book.availability);
  bottom.append(availability);
  meta.append(bottom);
  card.append(meta);
  return card;
}

function setState(title, description, actionLabel, action) {
  elements.state.replaceChildren();
  elements.state.append(createElement('h3', '', title), createElement('p', '', description));
  if (actionLabel && action) {
    const button = createElement('button', '', actionLabel);
    button.type = 'button';
    button.addEventListener('click', action, { once: true });
    elements.state.append(button);
  }
  elements.state.hidden = false;
}

function clearState() {
  elements.state.hidden = true;
  elements.state.replaceChildren();
}

function render() {
  const results = filterAndSortBooks(books, {
    query: elements.search.value,
    subject: elements.subject.value,
    availability: elements.availability.value,
    sort: elements.sort.value,
  });
  elements.count.textContent = `${results.length} ${results.length === 1 ? 'book' : 'books'}`;
  elements.clearSearch.hidden = !elements.search.value;
  elements.grid.replaceChildren(...results.map(createCard));
  elements.grid.setAttribute('aria-busy', 'false');

  if (loadFailed) {
    setState('We couldn’t open the catalogue', 'Check that library_books.csv is present and try refreshing the page.');
    return;
  }
  if (books.length === 0) {
    setState('No books in the catalogue yet', 'Add valid book records to library_books.csv, then refresh to explore them.');
    return;
  }
  if (results.length === 0) {
    const searching = Boolean(elements.search.value.trim());
    setState(searching ? 'No matches just yet' : 'Nothing fits these filters',
      searching ? 'Try another title or author, or clear your search to see the full collection.' : 'Try a different subject or availability, or reset everything to start again.',
      searching ? 'Clear search' : 'Reset filters',
      searching ? clearSearch : resetFilters);
    return;
  }
  clearState();
}

function resetFilters() {
  elements.search.value = '';
  elements.subject.value = '';
  elements.availability.value = '';
  elements.sort.value = 'title-asc';
  render();
}

function makeBookDetails(book) {
  const layout = createElement('div', 'dialog-book');
  layout.append(createCover(book));
  const info = createElement('div', 'dialog-info');
  info.append(createElement('p', 'eyebrow', book.subject.toUpperCase()));
  info.append(createElement('h2', '', book.title));
  info.append(createElement('p', 'detail-author', `by ${book.author}`));
  const details = createElement('p', 'detail-list', `Published ${book.publication_year} · Catalogue ID ${book.book_id}`);
  info.append(details);
  info.append(createElement('p', 'detail-availability', book.availability));
  info.append(createElement('p', 'detail-note', 'This is demonstration catalogue data. Availability does not represent a real library holding.'));
  layout.append(info);
  return layout;
}

function openDetails(book) {
  elements.dialogContent.replaceChildren(makeBookDetails(book));
  const suggestions = recommendBooks(books, book.subject, book.book_id).slice(0, 3);
  if (suggestions.length) {
    const section = createElement('section', 'dialog-recs');
    section.append(createElement('h3', '', `More in ${book.subject}`));
    section.append(createElement('p', '', 'A simple subject match, with available titles shown first.'));
    suggestions.forEach((suggestion) => {
      const line = createElement('p', '', `${suggestion.title} — ${suggestion.author} · ${suggestion.availability}`);
      section.append(line);
    });
    elements.dialogContent.append(section);
  }
  if (!elements.dialog.open) elements.dialog.showModal();
}

function renderRecommendations() {
  elements.recommendResults.replaceChildren();
  const subject = recommendationSubject;
  if (!subject) {
    elements.recommendResults.append(createElement('p', 'detail-note', 'Choose a subject above to see a few books to explore.'));
    return;
  }
  const suggestions = recommendBooks(books, subject).slice(0, 4);
  if (!suggestions.length) {
    elements.recommendResults.append(createElement('p', 'detail-note', `There are no books in ${subject} right now.`));
    return;
  }
  suggestions.forEach((book) => {
    const item = createElement('div', 'recommend-item');
    const button = createElement('button', '', book.title);
    button.type = 'button';
    button.addEventListener('click', () => openDetails(book));
    item.append(button);
    item.append(createElement('p', '', `${book.author} · ${book.availability}`));
    item.append(createElement('p', '', `Suggested because you chose ${subject}.`));
    elements.recommendResults.append(item);
  });
}

async function loadCatalogue() {
  try {
    const embedded = document.querySelector('#booknest-csv');
    let csvText;
    if (window.location.protocol === 'file:' && embedded) {
      const bytes = Uint8Array.from(atob(embedded.textContent.trim()), (character) => character.charCodeAt(0));
      csvText = new TextDecoder().decode(bytes);
    } else {
      const response = await fetch('./library_books.csv', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      csvText = await response.text();
    }
    const parsed = parseCSV(csvText);
    books = parsed.books;
    if (parsed.errors.length) {
      elements.notice.textContent = `${parsed.errors.length} invalid ${parsed.errors.length === 1 ? 'row was' : 'rows were'} skipped. ${parsed.errors.slice(0, 3).join(' ')}${parsed.errors.length > 3 ? ' More row issues were found.' : ''}`;
      elements.notice.hidden = false;
    }
    const subjects = [...new Set(books.map((book) => book.subject))].sort((a, b) => a.localeCompare(b));
    subjects.forEach((subject) => {
      elements.subject.add(new Option(subject, subject));
      elements.recommendSubject.add(new Option(subject, subject));
    });
    elements.grid.setAttribute('aria-busy', 'false');
    render();
  } catch (error) {
    loadFailed = true;
    elements.notice.hidden = false;
    elements.notice.textContent = `Catalogue loading failed: ${error.message}`;
    render();
  }
}

elements.search.addEventListener('input', render);
elements.searchForm.addEventListener('submit', (event) => { event.preventDefault(); render(); });
elements.clearSearch.addEventListener('click', () => { elements.search.value = ''; elements.search.focus(); render(); });
elements.subject.addEventListener('change', render);
elements.availability.addEventListener('change', render);
elements.sort.addEventListener('change', render);
elements.reset.addEventListener('click', resetFilters);
elements.grid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-book-id]');
  if (!card) return;
  const book = books.find((candidate) => candidate.book_id === card.dataset.bookId);
  if (book) openDetails(book);
});
elements.dialogClose.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.recommendSubject.addEventListener('change', () => { recommendationSubject = elements.recommendSubject.value; });
elements.recommendButton.addEventListener('click', () => {
  recommendationSubject = elements.recommendSubject.value;
  renderRecommendations();
});

loadCatalogue();

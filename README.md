# BookNest

BookNest is a small library discovery app for students. It makes a local catalogue easier to explore through title and author search, subject and availability filters, sorting, book details, and simple subject recommendations.

The included catalogue contains fictional demonstration records. It does not represent a real college library, real holdings, or live availability.

## Features

- Search book titles and authors with case-insensitive partial matches.
- Combine search with subject and availability filters; reset all controls at once.
- Sort by title or publication year with deterministic tie-breaking.
- Open accessible book details and see other books from the same subject.
- Choose a subject for transparent, rule-based recommendations. Available books are listed first.
- Load a local CSV file, validate records, and report invalid rows while retaining valid ones.
- Responsive layout, visible keyboard focus, reduced-motion support, and non-network CSS book covers.

## Technology

- Semantic HTML, CSS, and browser-native JavaScript ES modules.
- Node.js built-in HTTP server and test runner. There are no runtime or development dependencies.

## Project structure

```text
BookNest/
├── index.html
├── index.template.html
├── build-preview.mjs
├── styles.css
├── library_books.csv
├── server.mjs
├── package.json
├── src/
│   ├── app.js
│   └── catalogue.js
└── tests/
    └── catalogue.test.mjs
```

## Run locally

Install Node.js 20 or newer. No dependency installation is needed.

```sh
node server.mjs
```

Then open <http://127.0.0.1:4173>. If npm is installed, equivalent scripts are available with `npm run dev` or `npm start`.

You can also open `index.html` directly in a browser without starting the server. It is a self-contained preview generated from the template, app source, styles, and CSV. After editing the source or CSV, regenerate it with:

```sh
node build-preview.mjs
```

If npm is installed, `npm run preview` runs the same generator.

## Dataset

`library_books.csv` is the source of truth for the displayed catalogue. Its required columns are:

| Column | Meaning | Validation |
| --- | --- | --- |
| `book_id` | Unique record ID | Required and unique |
| `title` | Book title | Required text |
| `author` | Author or authors | Required text |
| `subject` | Primary subject | One of the supported subject categories in `src/catalogue.js` |
| `publication_year` | Publication year | Four digits from 1000 through the current year |
| `availability` | Demonstration status | `Available` or `Checked Out` |

To replace or update the catalogue, edit `library_books.csv` while preserving its header and CSV quoting rules (quote values containing commas, quotes, or line breaks). Keep IDs unique and use the accepted subject and availability values. Invalid records are skipped and summarized on the page; the application does not invent replacement fields. If you introduce a new subject category, add it to the validation list in `src/catalogue.js`; filter choices themselves are populated from the validated CSV records. Regenerate `index.html` after changes so the file preview contains the latest catalogue and app code.

All included titles and author names are fictional sample records. Availability values are for demonstration only and are not verified against a real institution.

## Validation and tests

Run the built-in test suite without installing packages:

```sh
node --test
```

The tests cover CSV loading and validation, quoted punctuation and Unicode, search/filter combinations, all sort orders, recommendations, and malformed/empty data. To check the server, start it with `node server.mjs` and open the URL above; a successful load displays the sample books and a count of 35.

## Known limitations

- The catalogue and availability are local demonstration data, not connected to an institution.
- Recommendations use subject matching and availability ordering only; they are not personalized or AI generated.
- There is no borrowing, reservation, account, or live inventory feature.
- Subject categories are intentionally bounded by the validation list. Add a category there before using it in the CSV.
- Browser interaction and visual layout should still be checked in the target browsers and devices before a public deployment.

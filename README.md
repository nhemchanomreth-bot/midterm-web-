# Library REST API

A midterm project built with Node.js core modules. It uses `http.createServer`, CommonJS modules, JSON files, and `EventEmitter`; it does not use Express.

## Run

```sh
npm install
npm start
```

The API listens on port 3000 by default. Set `PORT` to change it. Records are stored in `data/` and the activity log is written to `activity.log` in the project folder.

For automatic restarts during development, run `npm run dev`. Run `npm run check` for the included API self-check.

## Routes

All responses use JSON.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | API welcome and resource paths |
| GET, POST | `/books` | List or create books (`name`, optional `note`) |
| GET, PUT, DELETE | `/books/:id` | Read, update, or delete a book |
| GET, POST | `/members` | List or create members (`name`, optional `phone`) |
| GET, PUT, DELETE | `/members/:id` | Read, update, or delete a member |
| GET, POST | `/loans` | List loans or borrow a book (`itemId`, `personId`) |
| GET, DELETE | `/loans/:id` | Read or delete a loan |
| PUT | `/loans/:id/end` | End an active loan |

Loan creation checks that the book and member exist and prevents lending a book that already has an active loan. Ending the loan makes the book available again.

## File ownership

Replace the names below with your real group members if they differ:

- Core (LEADER: Omareth): `server.js`, `router.js`, `activity.js`, `README.md`
- Books (ITEM: Phin Sopheaktra): `resources/books.js`
- Members (PERSON: Phirom Sok): `resources/members.js`
- Loans (LINK: Run Manil): `resources/loans.js`
- Shared helpers: `lib/`

Each resource file is standalone (its own `loadData`, `saveData`, `findById` and CRUD handler) and exports `path`, `handle`, `findById`.

## Security and performance

- Request bodies are limited to 1MB (`413 Payload Too Large`), collected with `Buffer.concat()`.
- `JSON.parse` errors return `400`; `__proto__`, `constructor` and `prototype` keys are removed.
- Every response sends `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`.
- Data files are pre-loaded into memory at startup, so `GET` requests do not read the disk; writes use `fs.promises`.
- Non-GET requests to `/` return `405`.

Library REST API
 ប្រព័ន្ធ REST API សម្រាប់បណ្ណាល័យ

**SETEC Institute · WBD I · Midterm Project · Class SW33**

A REST API for a small library (books, members, loans), built with pure Node.js core modules only (`http`, `fs.promises`, `events`). **No Express.**

REST API សម្រាប់គ្រប់គ្រងបណ្ណាល័យ (សៀវភៅ សមាជិក និងការខ្ចី) សរសេរដោយ Node.js សុទ្ធ គ្មានប្រើ Express ទេ។

---

 Run / របៀបដំណើរការ

```
npm install
npm start
```

| Command | English | ខ្មែរ |
| --- | --- | --- |
| `npm start` | Start server at http://localhost:3000 | បើក Server |
| `npm run dev` | Start with auto-reload | បើក Server ជាមួយ auto-reload |
| `npm run check` | Run the self-test | រត់តេស្តស្វ័យប្រវត្តិ |

---

## API Routes / បញ្ជី Routes

| Method | Endpoint | English | ខ្មែរ |
| --- | --- | --- | --- |
| GET | `/` | Welcome message | សារស្វាគមន៍ |
| GET | `/books` | List all books | មើលសៀវភៅទាំងអស់ |
| POST | `/books` | Create a book | បង្កើតសៀវភៅ |
| GET / PUT / DELETE | `/books/:id` | Read / update / delete a book | មើល / កែ / លុបសៀវភៅ |
| GET | `/members` | List all members | មើលសមាជិកទាំងអស់ |
| POST | `/members` | Create a member | បង្កើតសមាជិក |
| GET / PUT / DELETE | `/members/:id` | Read / update / delete a member | មើល / កែ / លុបសមាជិក |
| GET | `/loans` | List all loans | មើលការខ្ចីទាំងអស់ |
| POST | `/loans` | Borrow a book | ខ្ចីសៀវភៅ |
| PUT | `/loans/:id/end` | Return a book | សងសៀវភៅ |

**Status codes / កូដឆ្លើយតប:**
`200` OK · `201` Created · `400` Bad request · `404` Not found · `405` Method not allowed · `409` Conflict · `413` Payload too large

---

## Team / ក្រុមការងារ

| Member / សមាជិក | Role / តួនាទី | Files / ឯកសារ |
| --- | --- | --- |
| **Omareth** | Leader (Core) / មេក្រុម | `server.js` `router.js` `activity.js` `README.md` |
| **Phin Sopheaktra** | Books (ITEM) / សៀវភៅ | `resources/books.js` |
| **Phirom Sok** | Members (PERSON) / សមាជិក | `resources/members.js` |
| **Run Manil** | Loans (LINK) / ការខ្ចី | `resources/loans.js` |

---

## Structure / រចនាសម្ព័ន្ធ

```
server.js        → starts the HTTP server / បើក Server
router.js        → routes requests / បញ្ជូន Request
activity.js      → writes activity.log / កត់ត្រា Log
resources/       → books, members, loans
lib/             → shared helpers (events, body, send)
data/            → JSON data files / ទិន្នន័យ JSON
```

**Flow / ដំណើរការ:**
`Client → server.js → router.js → resource → data/*.json → event → activity.js → activity.log`

---

 Features / លក្ខណៈពិសេស

- 1MB request limit (`413`) / កំណត់ទំហំ Request ត្រឹម 1MB
- Safe JSON parsing (`400`) / ការពារ JSON ខុស
- Prototype pollution defense / ការពារ `__proto__`
- Security headers: `nosniff`, `X-Frame-Options: DENY`
- In-memory cache for fast reads / រក្សាទុកក្នុង memory ឱ្យអានលឿន
- Data survives restart; IDs never reused / ទិន្នន័យមិនបាត់ពេលបិទបើកថ្មី

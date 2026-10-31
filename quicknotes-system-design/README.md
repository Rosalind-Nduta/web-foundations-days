# QuickNotes System Design

QuickNotes is a small notes app that is moving from a browser-only tool to an online service for 1 million users. This repository has two halves:

1. **A working API client** (`index.html`, `api.js`, `style.css`) that proves the front end can talk to a REST API. It uses the free [JSONPlaceholder](https://jsonplaceholder.typicode.com/) practice API, where "posts" stand in for notes.
2. **Three design documents** in `docs/` that the backend team can build the real service from: the API, the database and the overall architecture.

## What the client does

- **Load notes (GET):** the "Load notes" button requests `GET /posts?_limit=10` and lists each note's title and body.
- **Create a note (POST):** the form validates the title (required, at most 100 characters; the body is optional), sends `{ title, body, userId: 1 }` and adds the new note to the top of the list.
- **Delete a note (DELETE):** every note has a Delete button that sends `DELETE /posts/{id}` and removes the note from the list.
- **Four states are always visible:** loading ("Loading notes..."), success (green message), error (red, friendly message) and empty (a message inside the list when there are no notes).
- **Buttons are disabled** while any request is running, so nothing is sent twice.
- **User text is inserted with `textContent` only**, never `innerHTML`, so a note titled `<script>` is shown as text and cannot run code.

JSONPlaceholder pretends to save data but never does. A note created here gets the id `101` and disappears on the next "Load notes", and deleting it may return `404`. The client treats that `404` for a note created in this session as "already gone" and removes it. The reasoning is explained in a comment above `deleteNote()` in `api.js`.

## How to run the API client

No build step and no installation are needed. You only need a browser and an internet connection (the app calls JSONPlaceholder).

**Option 1: open the file.** Download or clone the repository and double-click `index.html`.

**Option 2: use a local web server** (also works if your browser is strict about local files):

```bash
git clone https://github.com/your-username/quicknotes-system-design.git
cd quicknotes-system-design
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

Try it:

1. Click **Load notes**. You should see "Loading notes...", then "Loaded 10 notes from the server."
2. Type a title (and optionally a body) and click **Create note**. A new note appears at the top: "Note created (status 201, id 101)."
3. Click **Delete** on any note. It disappears from the list.
4. Submit an empty title, or one longer than 100 characters, to see the validation error.
5. Turn off your internet connection and click **Load notes** to see the error state.

## Design documents

| Document | What it covers |
|----------|----------------|
| [docs/api-design.md](docs/api-design.md) | The real QuickNotes REST API: 12 endpoints with methods, paths and status codes, JSON examples for creating and listing notes, and the error codes (400, 401, 403, 404, 409, 413, 429, 500, 503) with example error bodies |
| [docs/data-model.md](docs/data-model.md) | The `users`, `notes`, `tags` and `note_tags` tables, one-to-many and many-to-many relationships, `CREATE TABLE` statements, example SQL queries (including JOINs), indexes with reasons, and why PostgreSQL (SQL) was chosen over NoSQL |
| [docs/architecture.md](docs/architecture.md) | Functional and non-functional requirements, a load estimate for 1 million users, the architecture diagram (client, DNS, CDN, load balancer, app servers, cache, primary database with read replica, queue and worker), what each component solves, step-by-step flows for `GET /notes` and `POST /notes`, trade-offs and how single points of failure are avoided |

## Project structure

```text
quicknotes-system-design/
├── index.html        page structure: button, status line, form and list
├── api.js            request(), GET / POST / DELETE, validation, UI states
├── style.css         readable layout, distinct success and error messages
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## What I learned

1. **One reusable `request()` function keeps API code honest.** Checking `response.ok` and throwing in a single place means every call (GET, POST, DELETE) fails the same way, and `fetch` alone does *not* throw on a `404` or `500`. Only network failures reject, so forgetting the `ok` check would silently treat errors as success.
2. **Users need to see every state, not just success.** Loading, success, error and empty states, plus disabled buttons during requests, are what make an app feel reliable. A `try / catch / finally` around each request made it easy to always re-enable the buttons, even when something failed.
3. **Never trust user text or practice APIs.** Using `textContent` instead of `innerHTML` blocks script injection, and JSONPlaceholder taught me that a response of `201` does not always mean the data was stored. The client has to handle the gap between "the server said OK" and "the data really exists".
4. **Design the API around resources.** Plural nouns in the URL, the HTTP method as the verb, correct status codes (`201` for create, `204` for delete, `404` rather than `403` for someone else's note) and one consistent error shape make an API predictable for the people who use it.
5. **A many-to-many relationship needs a join table.** Notes and tags cannot be linked with one foreign key, so `note_tags` with a composite primary key turns it into two one-to-many relationships and prevents duplicate links. I also learned that an index must match the query: `(user_id, created_at DESC)` is what makes "my newest notes" fast.
6. **Estimates drive architecture.** Working out about 310 reads and 52 writes per second at peak, and about 0.55 TB of new data per year, showed that one database primary is enough for now and that extra servers are mainly for availability. Every component in the diagram exists to solve a specific problem or to remove a single point of failure, and each one has a trade-off (for example, caching makes reads fast but means data can be slightly out of date).

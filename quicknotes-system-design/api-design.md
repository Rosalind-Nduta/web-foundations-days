# QuickNotes API Design

This document describes the **real QuickNotes REST API** that the backend team should build. It is not the JSONPlaceholder practice API used by the browser client in this repository; it is the service the client will talk to once QuickNotes moves from a browser-only app to an online service for 1 million users.

## 1. Conventions

| Topic | Decision |
|-------|----------|
| Base URL | `https://api.quicknotes.example/v1` (the version lives in the path so breaking changes become `/v2`) |
| Format | JSON for every request and response (`Content-Type: application/json`) |
| Authentication | `Authorization: Bearer <access_token>` on every endpoint except register and login |
| Resource names | Plural nouns (`/notes`, `/tags`); the HTTP method carries the action, never the URL (no `/createNote`) |
| IDs | Integers, assigned by the server |
| Timestamps | ISO 8601 in UTC, e.g. `2026-10-31T19:20:00Z` |
| Ownership | Every note and tag belongs to one user; a user can only ever see and change their own |
| Pagination | Cursor based: `?limit=10&cursor=<opaque string>`. Default limit 20, maximum 100 |
| Filtering | `GET /notes?tag=work` returns only notes with that tag |

Why cursor pagination? With millions of notes, `OFFSET 100000` forces the database to read and throw away 100,000 rows. A cursor ("notes older than this one") uses an index and stays fast on page 1 and page 10,000, and it does not skip or repeat notes when new ones are added while the user is scrolling.

## 2. Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | `POST` | `/users` | Register a new account | `201 Created` |
| 2 | `POST` | `/auth/login` | Exchange email and password for an access token | `200 OK` |
| 3 | `GET` | `/notes` | List the signed-in user's notes (paginated, optional `tag` filter) | `200 OK` |
| 4 | `POST` | `/notes` | Create a note | `201 Created` |
| 5 | `GET` | `/notes/{noteId}` | Get one note, including its tags | `200 OK` |
| 6 | `PUT` | `/notes/{noteId}` | Replace a note (title and body both sent) | `200 OK` |
| 7 | `PATCH` | `/notes/{noteId}` | Change only some fields of a note | `200 OK` |
| 8 | `DELETE` | `/notes/{noteId}` | Delete a note | `204 No Content` |
| 9 | `GET` | `/tags` | List the signed-in user's tags | `200 OK` |
| 10 | `POST` | `/tags` | Create a tag | `201 Created` |
| 11 | `PUT` | `/notes/{noteId}/tags/{tagId}` | Attach a tag to a note (safe to repeat) | `204 No Content` |
| 12 | `DELETE` | `/notes/{noteId}/tags/{tagId}` | Remove a tag from a note | `204 No Content` |

Notes on the design:

- `PUT` replaces the whole note and is **idempotent**: sending it twice gives the same result. `PATCH` is for small edits such as changing only the title.
- Attaching a tag uses `PUT` on the relationship, so a client that retries after a timeout cannot create a duplicate link.
- `DELETE` returns `204` with no body. Deleting a note that is already gone returns `404`.
- `POST /notes` returns a `Location: /v1/notes/{noteId}` header pointing at the new note.

## 3. Request and response examples

### 3.1 Create a note: `POST /notes`

Request:

```http
POST /v1/notes HTTP/1.1
Host: api.quicknotes.example
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "Buy milk",
  "body": "Two litres, and some bread for breakfast.",
  "tags": ["errands"]
}
```

Rules: `title` is required, 1 to 100 characters. `body` is optional, up to 100 KB. `tags` is optional, a list of tag names that already exist for this user. The owner is taken from the access token, never from the request body, so a client cannot create a note for someone else.

Response: `201 Created`

```http
HTTP/1.1 201 Created
Location: /v1/notes/4821
Content-Type: application/json

{
  "id": 4821,
  "title": "Buy milk",
  "body": "Two litres, and some bread for breakfast.",
  "tags": ["errands"],
  "created_at": "2026-10-31T19:20:00Z",
  "updated_at": "2026-10-31T19:20:00Z"
}
```

### 3.2 List notes: `GET /notes`

Request:

```http
GET /v1/notes?limit=2&tag=errands HTTP/1.1
Host: api.quicknotes.example
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Response: `200 OK` (newest first)

```json
{
  "data": [
    {
      "id": 4821,
      "title": "Buy milk",
      "body": "Two litres, and some bread for breakfast.",
      "tags": ["errands"],
      "created_at": "2026-10-31T19:20:00Z",
      "updated_at": "2026-10-31T19:20:00Z"
    },
    {
      "id": 4790,
      "title": "Post office",
      "body": "Collect the parcel before 5 pm.",
      "tags": ["errands", "urgent"],
      "created_at": "2026-10-30T08:05:00Z",
      "updated_at": "2026-10-30T09:12:00Z"
    }
  ],
  "page": {
    "limit": 2,
    "has_more": true,
    "next_cursor": "eyJpZCI6NDc5MH0"
  }
}
```

To get the next page the client repeats the request with `&cursor=eyJpZCI6NDc5MH0`. When there are no notes at all, the API still answers `200` with `"data": []` (an empty list is not an error).

### 3.3 Other short examples

Partial update, `PATCH /notes/4821`, request body and response `200 OK`:

```json
{ "title": "Buy milk and eggs" }
```

```json
{
  "id": 4821,
  "title": "Buy milk and eggs",
  "body": "Two litres, and some bread for breakfast.",
  "tags": ["errands"],
  "created_at": "2026-10-31T19:20:00Z",
  "updated_at": "2026-10-31T19:45:10Z"
}
```

Login, `POST /auth/login`, request body and response `200 OK`:

```json
{ "email": "amina@example.com", "password": "correct horse battery staple" }
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## 4. Error responses

All errors use the same JSON shape so the client needs only one error handler:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": [
      { "field": "title", "issue": "must be between 1 and 100 characters" }
    ],
    "request_id": "req_7f3a9c21"
  }
}
```

`code` is a stable, machine-readable string the client can switch on. `message` is for humans. `details` is optional. `request_id` lets support find the exact request in the server logs.

| Status | Meaning | When the API returns it | `error.code` example |
|--------|---------|-------------------------|----------------------|
| `400 Bad Request` | The request is malformed or fails validation | Invalid JSON, missing `title`, title longer than 100 characters, bad `cursor` or `limit` | `VALIDATION_ERROR` |
| `401 Unauthorized` | The caller is not authenticated | Missing, expired or invalid token; wrong email or password at login | `UNAUTHENTICATED` |
| `403 Forbidden` | The caller is known but not allowed to do this | Account suspended or email not yet verified | `FORBIDDEN` |
| `404 Not Found` | The resource does not exist for this caller | Unknown `noteId` or `tagId`, already-deleted note. A note belonging to another user also returns `404`, so the API never confirms that someone else's note exists | `NOT_FOUND` |
| `409 Conflict` | The request clashes with current state | Registering an email that already exists; creating a tag name the user already has | `CONFLICT` |
| `413 Payload Too Large` | The body is bigger than allowed | Note body over 100 KB | `PAYLOAD_TOO_LARGE` |
| `429 Too Many Requests` | Rate limit exceeded | More than 100 requests per minute per user; includes a `Retry-After` header | `RATE_LIMITED` |
| `500 Internal Server Error` | An unexpected bug on the server | Unhandled exception. The message never exposes stack traces or SQL | `INTERNAL_ERROR` |
| `503 Service Unavailable` | The service is temporarily down | Database failover or maintenance; includes `Retry-After` | `UNAVAILABLE` |

Example `404` body:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Note 9999 was not found.",
    "request_id": "req_b21e55d0"
  }
}
```

Example `401` body:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Your session has expired. Please sign in again.",
    "request_id": "req_09ac4417"
  }
}
```

## 5. Design decisions in short

- **REST and resource oriented.** Nouns in the URL, verbs in the HTTP method, correct status codes. The same ideas the browser client already uses (`GET`, `POST`, `DELETE`) carry over directly.
- **Stateless.** The server keeps no session in memory; every request carries its token. Any app server behind the load balancer can answer any request, which is what makes horizontal scaling possible (see `architecture.md`).
- **Safe retries.** `GET`, `PUT` and `DELETE` are idempotent, so clients and proxies can retry them after a network failure without causing duplicates.
- **Ownership is enforced on the server.** The user id always comes from the token, and every query filters by it.

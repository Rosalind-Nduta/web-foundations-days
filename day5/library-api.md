# Library API Design

A REST API for a library's `books` resource. All requests and responses use JSON.

## Book object

- `id` - number, assigned by the server
- `title` - string
- `author` - string
- `year` - number
- `isbn` - string

## Endpoints

### 1. List books

- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns all books in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book

- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book

- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "9780385474542"
}
```

- **Success status:** `201 Created`

### 4. Update a book

- **Method:** `PUT`
- **Path:** `/books/{id}`
- **Description:** Replaces the book with the given id with the data sent.
- **Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1959,
  "isbn": "9780385474542"
}
```

- **Success status:** `200 OK`

### 5. Delete a book

- **Method:** `DELETE`
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** `204 No Content`

### 6. List books by an author

- **Method:** `GET`
- **Path:** `/books?author={name}` (example: `/books?author=Chinua%20Achebe`)
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Request body:** none
- **Success status:** `200 OK`

## Error codes

### 400 Bad Request

- The request is invalid and the server cannot process it.
- **Example:** `POST /books` with a body that is missing `title`, or with `year` set to `"abc"` instead of a number.

### 404 Not Found

- The requested resource does not exist.
- **Example:** `GET /books/9999` when no book has the id `9999`.
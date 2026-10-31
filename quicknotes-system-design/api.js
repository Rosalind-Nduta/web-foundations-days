"use strict";

// Base URL of the JSONPlaceholder practice API ("posts" stand in for notes).
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const MAX_TITLE_LENGTH = 100;

const loadBtn = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");

// The notes currently shown on the page.
let notes = [];

/* ---------- UI helpers ---------- */

// type is "loading", "success" or "error" (matches the CSS classes).
function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

// Disable every button while a request is running so nothing can be double-clicked.
function setBusy(isBusy) {
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
}

// Turn any error into a short message a normal person can understand.
function friendlyError(error) {
  if (error.status) {
    return `The server answered with an error (status ${error.status}). Please try again.`;
  }
  return "Could not reach the server. Check your internet connection and try again.";
}

// Build one list item. User text goes in through textContent only (never innerHTML).
function createNoteItem(note) {
  const item = document.createElement("li");
  item.dataset.id = note.id;

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body || "";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`);
  deleteBtn.addEventListener("click", () => handleDelete(note));

  item.append(title, body, deleteBtn);
  return item;
}

// Redraw the list from the notes array, with an empty state when there is nothing.
function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No notes yet. Click \"Load notes\" to fetch some.";
    notesList.append(empty);
    return;
  }

  notes.forEach((note) => notesList.append(createNoteItem(note)));
}

/* ---------- API layer ---------- */

// One reusable function for every call: runs fetch, checks response.ok and
// throws on errors. Returns the parsed JSON body and the HTTP status.
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return { data, status: response.status };
}

// GET: load the first 10 notes.
async function getNotes() {
  const { data } = await request(`${API_URL}?_limit=10`);
  return data;
}

// POST: create a note. JSONPlaceholder replies 201 with the note and a new id.
async function createNote(note) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
}

// DELETE: remove one note by id.
//
// NOTE ON JSONPLACEHOLDER: it is a fake API. It accepts POST and DELETE and
// replies as if they worked, but it never stores anything. A note we "create"
// gets id 101, which the server will never remember, so:
//   - DELETE /posts/101 may answer 404 ("not found") even though, from the
//     user's point of view, the note exists on the page.
//   - Reloading the page or clicking "Load notes" always brings back the
//     original 10 notes, and created notes disappear.
// My approach: always send the real DELETE request (so the code works the same
// against a real API). If the server says 404 for a note that was created in
// this session, I treat it as deleted, because the server never had it, and
// remove it from the list. Any other failure keeps the note on the page and
// shows an error message.
async function deleteNote(id) {
  return request(`${API_URL}/${id}`, { method: "DELETE" });
}

/* ---------- Validation ---------- */

// Returns an error message, or "" when the title is fine.
function validateTitle(title) {
  if (title.length === 0) {
    return "Please enter a title.";
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `The title is too long (${title.length} characters). The maximum is ${MAX_TITLE_LENGTH}.`;
  }
  return "";
}

/* ---------- Event handlers ---------- */

async function handleLoad() {
  setBusy(true);
  setStatus("Loading notes...", "loading");

  try {
    notes = await getNotes();
    renderNotes();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function handleDelete(note) {
  setBusy(true);
  setStatus("Deleting note...", "loading");

  try {
    await deleteNote(note.id);
    removeNote(note);
    setStatus(`Note ${note.id} deleted.`, "success");
  } catch (error) {
    // The server never stored notes created in this session, so a 404 here
    // means "already gone" and the delete counts as done.
    if (error.status === 404 && note.createdLocally) {
      removeNote(note);
      setStatus(`Note ${note.id} removed (the practice server never stored it).`, "success");
    } else {
      console.error(error);
      setStatus(friendlyError(error), "error");
    }
  } finally {
    setBusy(false);
  }
}

// Remove by object reference, because every created note shares the id 101.
function removeNote(note) {
  notes = notes.filter((n) => n !== note);
  renderNotes();
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  setBusy(true);
  setStatus("Creating note...", "loading");

  try {
    const { data, status } = await createNote({ title, body, userId: 1 });
    // Mark it as created here: JSONPlaceholder gives every new note id 101 and
    // never stores it (see the note above deleteNote).
    data.createdLocally = true;
    notes.unshift(data); // newest note goes to the top
    renderNotes();
    noteForm.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch (error) {
    console.error(error);
    setStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", handleLoad);
noteForm.addEventListener("submit", handleSubmit);

// Show the empty state straight away.
renderNotes();

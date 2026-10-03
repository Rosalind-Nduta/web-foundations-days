// Notes Toolkit - Day 3

let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const CATEGORIES = ["personal", "work", "study"];
const MAX_LENGTH = 200;

// Lower-case, trim and collapse repeated spaces so comparisons are fair.
function normalise(text) {
  return String(text).trim().replace(/\s+/g, " ").toLowerCase();
}

// Returns every note whose text contains `word`, ignoring case.
function searchNotes(word) {
  const target = String(word).toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(target));
}

// Returns the note with the most characters, or null if there are none.
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// Returns an object such as { personal: 2, study: 2, work: 1 }.
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category] === undefined) {
      counts[note.category] = 0;
    }
    counts[note.category]++;
  }
  return counts;
}

// Returns a sentence such as "5 notes: 2 personal, 1 work, 2 study."
function getSummary() {
  const total = notes.length;
  const noun = total === 1 ? "note" : "notes";
  if (total === 0) {
    return `0 ${noun}.`;
  }
  const counts = countByCategory();
  const parts = CATEGORIES
    .filter((category) => counts[category] > 0)
    .map((category) => `${counts[category]} ${category}`);
  return `${total} ${noun}: ${parts.join(", ")}.`;
}

// True if a note with the same text exists (ignoring case and extra spaces).
function isDuplicate(text) {
  const target = normalise(text);
  return notes.some((note) => normalise(note.text) === target);
}

// Adds a note if valid. Returns true when added, false otherwise.
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Not added: text must be a string.");
    return false;
  }
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length < 1 || cleaned.length > MAX_LENGTH) {
    console.log(`Not added: text must be 1-${MAX_LENGTH} characters (got ${cleaned.length}).`);
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log(`Not added: "${cleaned}" already exists.`);
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log(`Not added: category must be one of ${CATEGORIES.join(", ")}.`);
    return false;
  }
  const nextId = notes.reduce((max, note) => Math.max(max, note.id), 0) + 1;
  notes.push({ id: nextId, text: cleaned, category });
  return true;
}

// ---------------------------------------------------------------- Tests
// Expected output is written in the comment next to each call.

console.log("--- searchNotes ---");
console.log(searchNotes("the"));
// 2 notes: id 2 "Finish the Day 3 assignment" and id 3 "Email the project report to Grace"
console.log(searchNotes("MILK"));
// 1 note: id 1 "Buy milk and bread" (case ignored)
console.log(searchNotes("zebra"));
// [] (no results)

console.log("--- longestNote ---");
console.log(longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log(longestNote());
// null (no notes)
notes = savedNotes;

console.log("--- countByCategory ---");
console.log(countByCategory());
// { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory());
// {} (no notes)
notes = savedNotes;

console.log("--- getSummary ---");
console.log(getSummary());
// "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Only one", category: "work" }];
console.log(getSummary());
// "1 note: 1 work." (singular)
notes = [];
console.log(getSummary());
// "0 notes."
notes = savedNotes;

console.log("--- isDuplicate ---");
console.log(isDuplicate("call mum"));
// true (same text, different case)
console.log(isDuplicate("  Buy   milk and   BREAD "));
// true (extra spaces and case ignored)
console.log(isDuplicate("Walk the dog"));
// false

console.log("--- addNote ---");
console.log(addNote("Walk the dog", "personal"));
// true
console.log(notes.length);
// 6
console.log(addNote("walk the dog", "personal"));
// logs 'Not added: "walk the dog" already exists.' then false
console.log(addNote("", "work"));
// logs "Not added: text must be 1-200 characters (got 0)." then false
console.log(addNote("a".repeat(201), "work"));
// logs "Not added: text must be 1-200 characters (got 201)." then false
console.log(addNote("Plan holiday", "hobby"));
// logs "Not added: category must be one of personal, work, study." then false
console.log(addNote("a".repeat(200), "study"));
// true (exactly 200 characters is allowed)
console.log(getSummary());
// "7 notes: 3 personal, 1 work, 3 study."
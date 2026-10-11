const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

const MAX_CHARS = 200;
const WARN_CHARS = 180;
const DRAFT_KEY = 'day4-draft';
const THEME_KEY = 'day4-theme';

function updateCounts() {
  const text = noteText.value;
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  charCount.textContent = `${chars} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

  charCount.classList.toggle('warning', chars > WARN_CHARS && chars <= MAX_CHARS);
  charCount.classList.toggle('over', chars > MAX_CHARS);
}
function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, noteText.value);
  } catch (e) { /* ignore */ }
}
function clearNote() {
  noteText.value = '';
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  noteText.focus();
}
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-pressed', String(dark));
}

function toggleTheme() {
  const dark = !document.body.classList.contains('dark');
  const theme = dark ? 'dark' : 'light';
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
}
document.addEventListener('DOMContentLoaded', () => {
  // Load the saved draft
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    noteText.value = draft;
  }
   // Load the saved theme
  const theme = localStorage.getItem(THEME_KEY);
  if (theme) {
    applyTheme(theme);
  }

  // Update counts initially
  updateCounts();
});
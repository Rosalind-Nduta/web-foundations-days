const USERS_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusEl = document.getElementById("status");
const usersList = document.getElementById("users-list");

// All users loaded from the API. Filtering works on this array,
// so typing in the filter box never makes a new request.
let allUsers = [];

async function loadUsers() {
  statusEl.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(USERS_URL);

    if (!response.ok) {
      throw new Error("Request failed with status " + response.status);
    }

    allUsers = await response.json();
    filterAndRender();
    statusEl.textContent = "Loaded " + allUsers.length + " users.";
  } catch (error) {
    statusEl.textContent = "Error: could not load users. " + error.message;
  } finally {
    loadButton.disabled = false;
  }
}

function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach(function (user) {
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = "Email: " + user.email;

    const city = document.createElement("div");
    city.textContent = "City: " + user.address.city;

    const company = document.createElement("div");
    company.textContent = "Company: " + user.company.name;

    item.append(name, email, city, company);
    usersList.appendChild(item);
  });
}

function filterAndRender() {
  const text = filterInput.value.trim().toLowerCase();
  const filtered = allUsers.filter(function (user) {
    return user.name.toLowerCase().includes(text);
  });
  renderUsers(filtered);
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", function () {
  // Nothing loaded yet: nothing to filter.
  if (allUsers.length === 0) {
    return;
  }
  filterAndRender();
});
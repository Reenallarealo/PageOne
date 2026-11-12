const form = document.querySelector("form");
const input = document.querySelector("#q");
const list = document.querySelector("#suggestions");

browser.runtime.connect({ name: "suggest" });

const cache = new Map();

let items = [];
let active = -1;
let timer = 0;
let requestId = 0;

function previewFromPrefix(query) {
  const needle = query.toLocaleLowerCase();
  for (let length = query.length - 1; length > 0; length -= 1) {
    const hit = cache.get(query.slice(0, length));
    if (!hit) continue;
    const narrowed = hit.filter((item) => item.toLocaleLowerCase().startsWith(needle));
    if (narrowed.length) return narrowed;
  }
  return null;
}

function remember(query, suggestions) {
  cache.delete(query);
  cache.set(query, suggestions);
  if (cache.size > 20) cache.delete(cache.keys().next().value);
}

function hideSuggestions() {
  items = [];
  active = -1;
  list.hidden = true;
  list.replaceChildren();
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function setActive(index) {
  const buttons = [...list.querySelectorAll("button")];
  buttons.forEach((button) => button.removeAttribute("aria-selected"));
  if (index < 0 || index >= buttons.length) {
    active = -1;
    input.removeAttribute("aria-activedescendant");
    return;
  }
  active = index;
  buttons[index].setAttribute("aria-selected", "true");
  input.setAttribute("aria-activedescendant", buttons[index].id);
}

function search(query) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  location.assign(url.href);
}

function showSuggestions(suggestions) {
  if (items.length === suggestions.length && items.every((item, index) => item === suggestions[index])) {
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    return;
  }

  list.replaceChildren();
  items = suggestions;
  active = -1;
  if (!suggestions.length) {
    hideSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();
  suggestions.forEach((text, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.id = `suggestion-${index}`;
    button.setAttribute("role", "option");
    button.textContent = text;
    item.append(button);
    fragment.append(item);
  });
  list.append(fragment);

  list.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

async function fetchSuggestions(query) {
  const current = ++requestId;

  try {
    const response = await browser.runtime.sendMessage({ type: "suggest", query });
    if (response?.aborted) return;
    const typed = input.value.trim();
    if (!typed || (typed !== query && !typed.startsWith(query) && !query.startsWith(typed))) return;
    const suggestions = Array.isArray(response?.suggestions) ? response.suggestions : [];
    if (!suggestions.length) {
      if (typed === query && current === requestId) hideSuggestions();
      return;
    }
    remember(query, suggestions);
    if (cache.has(typed) && typed !== query) return;
    const needle = typed.toLocaleLowerCase();
    const visible = typed === query
      ? suggestions
      : suggestions.filter((item) => item.toLocaleLowerCase().startsWith(needle));
    if (visible.length) showSuggestions(visible);
  } catch {
    if (current === requestId) hideSuggestions();
  }
}

list.addEventListener("mousedown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && list.contains(button)) search(button.textContent);
});

input.addEventListener("input", () => {
  window.clearTimeout(timer);
  const query = input.value.trim();
  if (!query) {
    requestId += 1;
    hideSuggestions();
    return;
  }
  const cached = cache.get(query);
  if (cached) {
    requestId += 1;
    showSuggestions(cached);
    return;
  }
  const preview = previewFromPrefix(query);
  if (preview) showSuggestions(preview);
  timer = window.setTimeout(() => {
    fetchSuggestions(query);
  }, 40);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!list.hidden) {
      event.preventDefault();
      hideSuggestions();
    }
    return;
  }

  if (list.hidden || !items.length) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    setActive(active + 1 >= items.length ? 0 : active + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActive(active <= 0 ? items.length - 1 : active - 1);
  } else if (event.key === "Enter" && active >= 0) {
    event.preventDefault();
    search(items[active]);
  }
});

form.addEventListener("submit", (event) => {
  if (active >= 0) {
    event.preventDefault();
    search(items[active]);
  }
});

document.addEventListener("click", (event) => {
  if (!form.contains(event.target)) hideSuggestions();
});

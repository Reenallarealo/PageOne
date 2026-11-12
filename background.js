const inflight = new Map();
let warmed = false;

function warmConnection() {
  if (warmed) return;
  warmed = true;
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.searchParams.set("client", "firefox");
  url.searchParams.set("q", "a");
  fetch(url).catch(() => {
    warmed = false;
  });
}

browser.runtime.onConnect.addListener(() => {
  warmConnection();
});

function suggestionText(entry) {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry) && typeof entry[0] === "string") return entry[0];
  return "";
}

function keepAlive(query) {
  const keep = new Set([query]);
  const prefixes = [...inflight.keys()]
    .filter((key) => query.startsWith(key))
    .sort((a, b) => a.length - b.length);
  if (prefixes.length) keep.add(prefixes[0]);
  for (const key of [...inflight.keys()]) {
    if (!keep.has(key)) {
      inflight.get(key).abort();
      inflight.delete(key);
    }
  }
}

async function suggest(query) {
  if (inflight.has(query)) return inflight.get(query).promise;
  keepAlive(query);

  const request = new AbortController();
  const promise = (async () => {
    const url = new URL("https://suggestqueries.google.com/complete/search");
    url.searchParams.set("client", "firefox");
    url.searchParams.set("q", query);
    try {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) return { suggestions: [] };
      const data = await response.json();
      const suggestions = Array.isArray(data?.[1])
        ? data[1].map(suggestionText).filter(Boolean)
        : [];
      return { suggestions };
    } catch (error) {
      if (error.name === "AbortError") return { aborted: true };
      return { suggestions: [] };
    } finally {
      if (inflight.get(query) === request) inflight.delete(query);
    }
  })();

  request.promise = promise;
  inflight.set(query, request);
  return promise;
}

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "suggest" || typeof message.query !== "string" || !message.query) {
    return undefined;
  }
  return suggest(message.query);
});

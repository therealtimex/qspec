// Read the small, deliberately conservative BibTeX surface QSPEC needs. The
// bibliography remains a writer-owned file: this module only resolves keys and
// inspects the fields needed for citation diagnostics.
const { readFileSync } = require("node:fs");

const specialTypes = new Set(["string", "preamble", "comment"]);

function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < Math.min(offset, text.length); i++) if (text[i] === "\n") line++;
  return line;
}

function parseBib(text) {
  text = String(text ?? "");
  const entries = new Map();
  let i = 0;

  const problem = (message, at = i) => {
    const error = new Error(message);
    error.offset = at;
    throw error;
  };
  const skip = () => {
    for (;;) {
      while (/\s/.test(text[i] ?? "")) i++;
      if (text[i] !== "%") return;
      while (i < text.length && text[i] !== "\n") i++;
    }
  };
  const identifier = () => {
    const start = i;
    while (/[A-Za-z0-9_:.+\/-]/.test(text[i] ?? "")) i++;
    return text.slice(start, i);
  };
  const enclosed = (open, close, start) => {
    let depth = 1;
    let quoted = false;
    let escaped = false;
    while (i < text.length) {
      const c = text[i++];
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === '"') { quoted = !quoted; continue; }
      if (quoted) continue;
      if (c === open) depth++;
      else if (c === close && --depth === 0) return;
    }
    problem(`unclosed '${open}'`, start);
  };
  const bracedValue = () => {
    const open = i++;
    const start = i;
    let depth = 1;
    let escaped = false;
    while (i < text.length) {
      const c = text[i++];
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return text.slice(start, i - 1).trim();
    }
    problem("unclosed braced value", open);
  };
  const quotedValue = () => {
    const open = i++;
    const start = i;
    let escaped = false;
    while (i < text.length) {
      const c = text[i++];
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === '"') return text.slice(start, i - 1).trim();
    }
    problem("unclosed quoted value", open);
  };
  const bareValue = (close) => {
    const start = i;
    while (i < text.length && text[i] !== "," && text[i] !== close && text[i] !== "%" && !/\s/.test(text[i])) i++;
    const value = text.slice(start, i).trim();
    if (!value) problem("field has no value", start);
    return value;
  };

  try {
    while (i < text.length) {
      skip();
      if (i >= text.length) break;
      // Bare text is legal BibTeX commentary. Ignore the whole line so an '@'
      // inside prose or an email address is not mistaken for an entry.
      if (text[i] !== "@") { while (i < text.length && text[i] !== "\n") i++; continue; }
      const entryStart = i++;
      skip();
      const type = identifier().toLowerCase();
      if (!type) problem("expected an entry type after '@'", entryStart);
      skip();
      const open = text[i];
      if (open !== "{" && open !== "(") problem(`expected '{' after @${type}`);
      const close = open === "{" ? "}" : ")";
      i++;
      if (specialTypes.has(type)) { enclosed(open, close, entryStart); continue; }

      skip();
      const keyStart = i;
      while (i < text.length && text[i] !== "," && text[i] !== close) i++;
      const key = text.slice(keyStart, i).trim();
      if (!key) problem(`@${type} has no key`, keyStart);
      const fields = {};
      if (text[i] === close) {
        i++;
        entries.set(key, { type, key, fields, line: lineAt(text, entryStart) });
        continue;
      }
      if (text[i] !== ",") problem(`expected ',' after key '${key}'`);
      i++;

      for (;;) {
        skip();
        if (i >= text.length) problem(`unclosed @${type}{${key}`, entryStart);
        if (text[i] === close) { i++; break; }
        if (text[i] === ",") { i++; continue; }
        const fieldStart = i;
        const field = identifier().toLowerCase();
        if (!field) problem(`expected a field name in '${key}'`, fieldStart);
        skip();
        if (text[i] !== "=") problem(`expected '=' after field '${field}'`, fieldStart);
        i++;
        skip();
        const value = text[i] === "{" ? bracedValue() : text[i] === '"' ? quotedValue() : bareValue(close);
        fields[field] = value;
        skip();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === close) { i++; break; }
        problem(`expected ',' or '${close}' after field '${field}'`);
      }
      entries.set(key, { type, key, fields, line: lineAt(text, entryStart) });
    }
    return { entries, error: null };
  } catch (error) {
    return { entries: new Map(), error: { line: lineAt(text, error.offset ?? i), message: error.message } };
  }
}

function readBib(file) {
  return parseBib(readFileSync(file, "utf8"));
}

function citationCounts(specs, entries) {
  let unresolved = 0, unkeyed = 0;
  for (const spec of specs ?? []) {
    const works = Array.isArray(spec?.increment?.closest_work) ? spec.increment.closest_work : [];
    for (const work of works) {
      const key = typeof work?.key === "string" ? work.key.trim() : "";
      if (!key) unkeyed++;
      else if (!entries.has(key)) unresolved++;
    }
  }
  return { unresolved, unkeyed };
}

module.exports = { citationCounts, parseBib, readBib };

// Copied from relaunch/web/src/lib/smartMatch.js (Present and Interview use the same matcher).
// Forgiving text matching, shared by the desk's filters and the Present and
// Interview windows: an acronym finds its expansion and back (CI/CD,
// continuous integration), a synonym its term, and a word within an edit or
// two of the typed one still matches. Pure JS, no React.

const BUILTIN = {
  "ai": ["artificial intelligence"], "ml": ["machine learning"], "llm": ["large language model", "llms", "gpt", "openai", "language model"],
  "rag": ["retrieval augmented generation", "retrieval", "vector search"], "nlp": ["natural language processing"],
  "ner": ["named entity recognition", "entity extraction"], "ocr": ["optical character recognition", "text extraction"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment", "pipelines"],
  "k8s": ["kubernetes"], "iac": ["infrastructure as code", "terraform"], "aws": ["amazon web services"],
  "gcp": ["google cloud", "google cloud platform"], "sre": ["site reliability", "reliability engineering", "observability"],
  "etl": ["extract transform load", "data pipeline"], "saas": ["software as a service", "multi-tenant"],
  "ui": ["user interface", "frontend"], "ux": ["user experience", "design"], "api": ["apis", "interface", "endpoint"],
  "db": ["database", "databases"], "js": ["javascript"], "ts": ["typescript"], "adr": ["architecture decision record"],
  "rpa": ["robotic process automation", "automation"], "seo": ["search engine optimisation", "search engine optimization"],
  "crm": ["customer relationship management"], "hr": ["human resources", "hiring", "recruitment"],
  "kpi": ["metrics", "key performance indicator"], "poc": ["proof of concept", "prototype"], "mvp": ["minimum viable product"]
};

export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9/+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}
export function words(s) { return norm(s).split(/[\s/.-]+/).filter(Boolean); }

// Damerau-free Levenshtein, capped: returns early once past `max`.
export function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}
export function fuzzyWord(q, w) {
  if (w.startsWith(q) || (q.length >= 3 && w.indexOf(q) !== -1)) return true;
  if (q.length < 4) return false;
  return within(q, w.slice(0, q.length + 2), q.length >= 8 ? 2 : 1) || within(q, w, q.length >= 8 ? 2 : 1);
}

// term -> every phrase it should also accept, both directions.
export function buildAliases(data) {
  const map = {};
  function link(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b || a === b) return;
    (map[a] = map[a] || new Set()).add(b);
    (map[b] = map[b] || new Set()).add(a);
  }
  Object.keys(BUILTIN).forEach(function (k) { BUILTIN[k].forEach(function (v) { link(k, v); }); });
  (data.skills || []).forEach(function (s) { (s.aliases || []).forEach(function (a) { link(s.name, a); }); });
  return map;
}


// Does the query match this item? Every query word (or its alias) must be
// found, exactly, as a prefix, inside a word, or within a small typo, in the
// item's text or its extra terms.
export function smartHit(q, parts, aliases, extra) {
  const nq = norm(q);
  if (!nq) return true;
  const hay = norm(parts.concat(extra || []).filter(Boolean).join(" "));
  if (hay.indexOf(nq) !== -1) return true;
  const hw = words(hay);
  const alts = function (term) { return [term].concat(Array.from((aliases && aliases[term]) || [])); };
  // A whole-query alias (e.g. "continuous integration") counts as a hit.
  // ...at word boundaries: "hr" (an alias of hiring) must not match inside "through"
  const bounded = function (a) { return (" " + hay + " ").indexOf(" " + a + " ") !== -1; };
  if (alts(nq).some(bounded)) return true;
  return words(nq).every(function (w) {
    return alts(w).some(function (a) {
      if (a.indexOf(" ") !== -1) return hay.indexOf(a) !== -1;
      return hw.some(function (x) { return fuzzyWord(a, x); });
    });
  });
}

// The built-in acronyms on their own, for filters with no agent aliases.
export const BUILTIN_ALIASES = buildAliases({});

// Suggestions: vocabulary entries whose label (or alias) matches what is typed,
// best first: prefix of the label, then a word in it, then alias or fuzzy.
export function suggest(q, vocab, aliases, limit) {
  const nq = norm(q);
  if (nq.length < 1) return [];
  const scored = [];
  vocab.forEach(function (v) {
    const l = norm(v.label);
    let s = 0;
    if (l.startsWith(nq)) s = 3;
    else if (words(l).some(function (w) { return w.startsWith(nq); })) s = 2;
    else if (nq.length >= 2 && smartHit(nq, [v.label], aliases, v.terms)) s = 1;
    if (s) scored.push({ v: v, s: s });
  });
  scored.sort(function (a, b) { return b.s - a.s || a.v.label.length - b.v.label.length; });
  const seen = {};
  return scored.filter(function (x) { const k = norm(x.v.label); if (seen[k]) return false; seen[k] = true; return true; })
    .slice(0, limit || 8).map(function (x) { return x.v; });
}


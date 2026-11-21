// Code node "Mark as handled": stores the dedupe keys of requests that reached the end without an error.
// Keeps the newest 500 keys. Runs after the Gmail draft was saved.
const store = $getWorkflowStaticData('global');
store.handledKeys = store.handledKeys || {};
const done = $('Write reply').all().map((i) => i.json);
const stamp = new Date().toISOString();
for (const r of done) store.handledKeys[r.dedupeKey] = stamp;
const keys = Object.keys(store.handledKeys).sort((a, b) => store.handledKeys[a].localeCompare(store.handledKeys[b]));
for (const k of keys.slice(0, Math.max(0, keys.length - 500))) delete store.handledKeys[k];
return done.map((r) => ({ json: { rfqId: r.rfqId, dedupeKey: r.dedupeKey, marked: true } }));

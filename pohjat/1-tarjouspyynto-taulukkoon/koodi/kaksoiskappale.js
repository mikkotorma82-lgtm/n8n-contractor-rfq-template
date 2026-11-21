// Code node "Check duplicates": drops requests this workflow has already handled.
// A request is a duplicate when its key (Gmail thread, or sender plus subject) is stored from an
// earlier run, or appears twice in the same batch. Keys are stored by the "Mark as handled" node
// only after the sheet row and the draft succeeded, so a failed run can be retried.
// Static data only persists in an ACTIVE workflow, not in manual test runs.
const store = $getWorkflowStaticData('global');
const handled = store.handledKeys || {};
const seenNow = new Set();
const out = [];
for (const item of $input.all()) {
  const r = item.json;
  const dup = Boolean(handled[r.dedupeKey]) || seenNow.has(r.dedupeKey);
  seenNow.add(r.dedupeKey);
  out.push({ json: { ...r, isDuplicate: dup, duplicateNote: dup ? 'Already handled: ' + r.dedupeKey : '' } });
}
return out;

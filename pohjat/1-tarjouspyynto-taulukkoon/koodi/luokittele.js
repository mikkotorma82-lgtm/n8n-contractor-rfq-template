// Code node "Classify request": adds a request type and a handling level to each parsed row.
// Runs once for all items. No external calls. Rows that are not requests pass through unchanged.
const TYPES = [
  ['Cancellation', /\b(cancel(?:l?ed|lation)?|withdraw(?:n)?|no longer (?:need|require)|project (?:is )?(?:on hold|dead))\b/i],
  ['Addendum', /\b(addendum|addenda|revised (?:drawings?|scope|plans?|bid)|revision|updated (?:drawings?|scope|plans?)|amended)\b/i],
  ['Follow-up', /\b(following up|follow-up|any update|checking in|reminder|still waiting)\b/i],
  ['Bid invitation', /\b(invitation to bid|itb|bid request|bids? due|general contractor|gc\b|bidding)\b/i],
  ['Quote request', /\b(rfq|request for (?:a )?(?:quote|quotation|proposal)s?|quote|estimate|price on|pricing)\b/i],
];
const URGENT = /\b(asap|urgent|emergency|today|tomorrow|rush|immediately)\b/i;

const out = [];
for (const item of $input.all()) {
  const r = item.json;
  if (!r.isRfq) { out.push({ json: { ...r, requestType: 'Not a request', handling: 'Ignore' } }); continue; }
  const text = (r.subject || '') + ' ' + (r.scope || '');
  const requestType = (TYPES.find(([, re]) => re.test(text)) || ['Quote request'])[0];
  const missingCount = r.missing ? r.missing.split(',').length : 0;
  const urgent = r.priority === 'High' || URGENT.test(text);
  // Handling decides what the workflow does next:
  //   Draft reply     a normal request, the reply draft asks for what is missing
  //   Review first    cancellations, addenda and follow-ups: a person decides, no standard reply is written
  //   Call first      urgent and thin on details: a call is faster than an email loop
  let handling = 'Draft reply';
  if (['Cancellation', 'Addendum', 'Follow-up'].includes(requestType)) handling = 'Review first';
  else if (urgent && missingCount >= 2) handling = 'Call first';
  out.push({
    json: {
      ...r,
      requestType,
      handling,
      priority: urgent ? 'High' : r.priority,
      status: handling === 'Draft reply' ? 'Reply drafted' : handling === 'Call first' ? 'Reply drafted, call first' : 'Needs review',
      dedupeKey: (r.threadId || '') !== '' ? 'thread:' + r.threadId
        : 'mail:' + r.email + '|' + String(r.subject || '').toLowerCase().replace(/^((re|fwd?):\s*)+/i, '').replace(/\s+/g, ' ').trim(),
    },
  });
}
return out;

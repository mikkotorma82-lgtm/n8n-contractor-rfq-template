// Code node "Describe error": turns a failed sheet write or draft into a plain note for the owner.
// It receives the error output of "Add row to sheet" or "Save reply as draft". Nothing is retried
// and nothing is sent: the note is saved as a Gmail draft so a person sees it.
const cfg = $('Settings').first().json;
const out = [];
for (const item of $input.all()) {
  const e = item.json;
  const src = $('Write reply').all().map((i) => i.json);
  const rfq = src[0] || {};
  const msg = String(e.error?.message ?? e.error ?? e.message ?? 'Unknown error').slice(0, 300);
  out.push({
    json: {
      alertTo: cfg.ownEmail,
      alertSubject: 'Request workflow problem: ' + (rfq.rfqId || 'unknown request'),
      alertBody: [
        'The request workflow could not finish one request.',
        '',
        'Request: ' + (rfq.rfqId || 'unknown') + ' from ' + (rfq.email || 'unknown sender'),
        'Subject: ' + (rfq.subject || ''),
        'Error: ' + msg,
        '',
        'The request was not marked as handled. Check the sheet for a row with this ID, then answer the sender by hand or run the workflow again on the email.',
      ].join('\n'),
    },
  });
}
return out;

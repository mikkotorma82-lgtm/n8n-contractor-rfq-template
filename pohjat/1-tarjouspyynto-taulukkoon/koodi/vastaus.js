// Code node "Write reply": builds the first reply for each RFQ row.
// The reply confirms receipt, asks for missing details and offers two call times.
// It never states a price or a date for the bid.
const cfg = $('Settings').first().json;
// Call times count from the moment this runs, not from the day the email arrived,
// so a request handled late never gets offered days that have already passed.
// cfg.testNow is only for tests; leave it out of the Settings node.
const now = cfg.testNow ? new Date(cfg.testNow + 'T12:00:00Z') : new Date();

function nextBusinessDays(from, count) {
  const days = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (days.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(new Date(d));
  }
  return days;
}
const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

const out = [];
for (const item of $input.all()) {
  const r = item.json;
  const [d1, d2] = nextBusinessDays(now, 2);
  const lines = [];
  lines.push('Thanks for sending this over. We received your request (reference ' + r.rfqId + ') and one of us will review it.');
  if (r.missing) {
    lines.push('');
    lines.push('To prepare an accurate quote we still need: ' + r.missing + '. Reply to this email with those and we will pick it up from there.');
  }
  lines.push('');
  lines.push('If a short call is easier, we can do ' + fmt(d1) + ' at ' + cfg.slotMorning + ' or ' + fmt(d2) + ' at ' + cfg.slotAfternoon + ' (' + cfg.timezoneLabel + '). Tell us which suits you, or suggest another time.');
  if (r.priority === 'High') {
    lines.push('');
    lines.push('We saw the due date in your message and are looking at it first.');
  }
  lines.push('');
  lines.push(cfg.senderName);
  lines.push(cfg.companyName);
  out.push({
    json: {
      ...r,
      replySubject: /^re:/i.test(r.subject) ? r.subject : 'Re: ' + (r.subject || 'Your request'),
      replyBody: lines.join('\n'),
    },
  });
}
return out;

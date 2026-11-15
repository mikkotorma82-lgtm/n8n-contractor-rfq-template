// Code node "Parse request": turns an incoming email into one structured RFQ row.
// Runs once for all items. Reads the Settings node. No external calls.
const cfg = $('Settings').first().json;
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const TRADES = [
  ['Plumbing', /plumb|pipe|water heater|drain|sewer|fixture/i],
  ['HVAC', /hvac|heating|furnace|air condition|ventilation|duct|boiler|heat pump/i],
  ['Electrical', /electric|wiring|panel|lighting|generator|conduit/i],
  ['Roofing', /roof|shingle|gutter/i],
  ['General', /renovat|remodel|build|construction|concrete|framing|drywall|paint/i],
];

function labelled(body, labels) {
  const re = new RegExp('^\\s*(?:' + labels + ')\\s*[:\\-]\\s*(.+)$', 'im');
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

function parseSender(raw) {
  const text = typeof raw === 'string' ? raw : (raw?.text ?? raw?.value?.[0]?.address ?? '');
  const em = text.match(/([^\s<>"',;]+@[^\s<>"',;]+)/);
  const email = em ? em[1].toLowerCase() : '';
  let name = text.replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
  if (!name || name.includes('@')) name = typeof raw === 'object' && raw?.value?.[0]?.name ? raw.value[0].name : '';
  return { name, email };
}

function parseDeadline(text, received) {
  if (!text) return null;
  let t = text.replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const hasYear = /\b20\d{2}\b/.test(t) || /\d[\/.]\d{1,2}[\/.]\d{2,4}/.test(t);
  if (!hasYear) t += ', ' + received.getUTCFullYear();
  const d = new Date(t + ' 12:00:00 UTC');
  return isNaN(d) ? null : d;
}

const rows = [];
for (const item of $input.all()) {
  const m = item.json;
  const subject = String(m.subject ?? m.Subject ?? '').trim();
  const body = String(m.text ?? m.textPlain ?? m.snippet ?? '').replace(/\r/g, '');
  const sender = parseSender(m.from ?? m.From ?? '');
  const receivedRaw = m.date ?? m.internalDate ?? null;
  const received = receivedRaw && !isNaN(new Date(receivedRaw)) ? new Date(receivedRaw) : new Date();

  const own = String(cfg.ownEmail || '').toLowerCase();
  const automated = /no-?reply|donotreply|mailer-daemon|newsletter|unsubscribe/i.test(sender.email + ' ' + body.slice(-400));
  const looksLikeRfq = /\b(rfq|request for (?:a )?(?:quote|quotation|proposal|bid)s?|invitation to bid|bid request|quote|estimate|tender|proposal|bid)\b/i.test(subject + ' ' + body);
  const isRfq = looksLikeRfq && !automated && sender.email !== '' && sender.email !== own;

  const phoneLabelled = labelled(body, 'phone|tel|mobile|cell');
  const phoneAny = body.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  const phone = phoneLabelled || (phoneAny ? phoneAny[0].trim() : '');

  const location = labelled(body, 'project address|job ?site|site address|address|location|site');

  let deadlineText = labelled(body, 'bids? due|due date|due|deadline|submit by|needed by');
  if (!deadlineText) {
    const dm = body.match(new RegExp('(?:due|by|before|deadline(?: is)?)\\s+(?:on\\s+)?((?:' + MONTHS + ')[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}[\\/.]\\d{1,2}(?:[\\/.]\\d{2,4})?)', 'i'));
    deadlineText = dm ? dm[1].trim() : '';
  }
  const deadline = parseDeadline(deadlineText, received);

  const budgetLabelled = labelled(body, 'budget');
  const budgetAny = body.match(/\$\s?\d[\d,]*(?:\.\d+)?\s?[kK]?/);
  const budget = budgetLabelled || (budgetAny ? budgetAny[0].trim() : '');

  const hay = subject + ' ' + body;
  const trade = (TRADES.find(([, re]) => re.test(hay)) || ['Other'])[0];

  const scopeLabelled = labelled(body, 'scope|project|description|details');
  const scope = (scopeLabelled || body.replace(/\s+/g, ' ').trim()).slice(0, 280);

  const missing = [];
  if (!phone) missing.push('phone number');
  if (!location) missing.push('project address');
  if (!deadline && !deadlineText) missing.push('bid due date');
  if (scope.length < 40) missing.push('scope of work');

  const daysLeft = deadline ? Math.ceil((deadline - received) / 86400000) : null;
  const priority = daysLeft !== null && daysLeft <= 7 ? 'High' : 'Normal';

  const stamp = received.toISOString().slice(0, 10);
  const idTail = String(m.id ?? '0000').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0');

  rows.push({
    json: {
      isRfq,
      rfqId: 'RFQ-' + stamp.replace(/-/g, '') + '-' + idTail,
      received: stamp,
      name: sender.name,
      email: sender.email,
      phone,
      trade,
      location,
      deadline: deadline ? deadline.toISOString().slice(0, 10) : deadlineText,
      budget,
      scope,
      missing: missing.join(', '),
      priority,
      status: 'Reply drafted',
      subject,
      threadId: m.threadId ?? '',
    },
  });
}
return rows;

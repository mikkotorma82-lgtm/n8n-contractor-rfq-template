import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runCode, check, done } from '../testaaja.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const mails = JSON.parse(readFileSync(join(dir, 'testiaineisto', 'sahkopostit.json'), 'utf8'));
const settings = {
  ownEmail: 'office@our-company.example',
  companyName: 'Example Mechanical LLC',
  senderName: 'Sam Rivera',
  timezoneLabel: 'Central Time',
  slotMorning: '10:00 AM',
  slotAfternoon: '2:00 PM',
};
const nodes = { Settings: { ...settings, testNow: '2026-03-03' } };
const parseNodes = { Settings: settings };

const parsed = runCode(join(dir, 'koodi', 'jasenna.js'), mails, parseNodes);
const [a, b, c, d, e] = parsed;

check('five inputs give five rows', parsed.length === 5);
check('full RFQ detected', a.isRfq === true);
check('sender name and email', a.name === 'Dana Whitfield' && a.email === 'dana@fictional-builders.example', JSON.stringify([a.name, a.email]));
check('address read', a.location === '410 Maple Street, Springfield', a.location);
check('deadline normalised', a.deadline === '2026-03-20', a.deadline);
check('budget read', a.budget === '$85,000', a.budget);
check('phone read', a.phone === '(555) 010-4477', a.phone);
check('trade plumbing before HVAC order', a.trade === 'Plumbing', a.trade);
check('full RFQ has nothing missing', a.missing === '', a.missing);
check('deadline 17 days away is Normal', a.priority === 'Normal', a.priority);
check('rfqId format', /^RFQ-20260303-B7A1$/.test(a.rfqId), a.rfqId);

check('short request detected', b.isRfq === true);
check('plain string sender parsed', b.name === 'Marcus Lee' && b.email === 'marcus@example-contractors.example', JSON.stringify([b.name, b.email]));
check('missing fields listed', /phone number/.test(b.missing) && /project address/.test(b.missing), b.missing);
check('deadline inside the text found', b.deadline === '2026-03-06', b.deadline);
check('deadline 3 days away is High', b.priority === 'High', b.priority);
check('trade electrical', b.trade === 'Electrical', b.trade);

check('newsletter is not an RFQ', c.isRfq === false);
check('own address is not an RFQ', d.isRfq === false);

check('slash date without year takes year from mail', e.deadline === '2026-03-10', e.deadline);
check('phone with dashes found', e.phone === '555-010-9921', e.phone);
check('roofing trade', e.trade === 'Roofing', e.trade);

const replies = runCode(join(dir, 'koodi', 'vastaus.js'), parsed.filter((r) => r.isRfq), nodes);
check('three replies', replies.length === 3);
check('reply confirms receipt and request reference', replies[0].replyBody.startsWith('We received your request (reference RFQ-20260303-B7A1)'));
check('reply has no placeholders left', !/\{\{|undefined|null/.test(replies.map((r) => r.replyBody).join('\n')));
check('reply mentions missing info only when missing', !/still need/.test(replies[0].replyBody) && /still need: phone number/.test(replies[1].replyBody));
check('first slot is next business day (Wed Mar 4)', /Wednesday, March 4 at 10:00 AM/.test(replies[0].replyBody), replies[0].replyBody);
check('Friday mail skips the weekend', /Monday, March 9 at 10:00 AM or Tuesday, March 10 at 2:00 PM/.test(runCode(join(dir, 'koodi', 'vastaus.js'), [parsed.filter((r) => r.isRfq)[2]], { Settings: { ...settings, testNow: '2026-03-06' } })[0].replyBody));
check('subject gets Re:', replies[0].replySubject === 'Re: Request for quote: boiler replacement, Maple Street school');
check('reply never gives a price', !/\$\d/.test(replies[0].replyBody));
check('urgent request is flagged in reply', /due date/.test(replies[1].replyBody));
const late = runCode(join(dir, 'koodi', 'vastaus.js'), [parsed[0]], { Settings: { ...settings, testNow: '2026-03-11' } });
check('late handling offers days counted from the run date (Thu Mar 12, Fri Mar 13)', /Thursday, March 12 at 10:00 AM or Friday, March 13 at 2:00 PM/.test(late[0].replyBody), late[0].replyBody);

// --- Extended template: classify, duplicates, error branch, workflow graph ---
const extra = [
  { id: 'x1', threadId: 'T-CANCEL', date: '2026-03-05T10:00:00Z', from: 'Dana Whitfield <dana@fictional-builders.example>', subject: 'Re: Request for quote: boiler replacement, Maple Street school', text: 'Please cancel our quote request, the project is on hold.' },
  { id: 'x2', threadId: 'T-ADD', date: '2026-03-05T11:00:00Z', from: 'Marcus Lee <marcus@example-contractors.example>', subject: 'Addendum 2 to bid request: office rewiring', text: 'Revised drawings attached. Site: 5 Oak Road. Bids due March 12, 2026. Phone: 555-010-1111. Scope: rewire the office after the revised plan, including panel and lighting.' },
  { id: 'x3', threadId: 'T-URG', date: '2026-03-05T12:00:00Z', from: 'Lena Ortiz <lena@example-builders.example>', subject: 'Urgent quote needed', text: 'We need a price on a water heater swap ASAP.' },
];
const cls = runCode(join(dir, 'koodi', 'luokittele.js'), runCode(join(dir, 'koodi', 'jasenna.js'), [...mails, ...extra], parseNodes));
const byThread = Object.fromEntries(cls.map((r) => [r.threadId, r]));
check('classify: normal request gets a draft reply', cls[0].requestType !== 'Not a request' && cls[0].handling === 'Draft reply', cls[0].requestType + '/' + cls[0].handling);
check('classify: newsletter is not a request and is ignored', cls[2].requestType === 'Not a request' && cls[2].handling === 'Ignore');
check('classify: cancellation needs review', byThread['T-CANCEL'].requestType === 'Cancellation' && byThread['T-CANCEL'].handling === 'Review first', byThread['T-CANCEL'].requestType);
check('classify: addendum needs review', byThread['T-ADD'].requestType === 'Addendum' && byThread['T-ADD'].status === 'Needs review', byThread['T-ADD'].requestType);
check('classify: urgent request with little detail means call first', byThread['T-URG'].handling === 'Call first' && byThread['T-URG'].priority === 'High', JSON.stringify([byThread['T-URG'].handling, byThread['T-URG'].priority]));
check('classify: dedupe key uses the Gmail thread', byThread['T-URG'].dedupeKey === 'thread:T-URG');
const noThread = runCode(join(dir, 'koodi', 'luokittele.js'), [{ ...cls[0], threadId: '', subject: 'RE: Re: Need a QUOTE  now' }]);
check('classify: dedupe key without thread ignores Re: and case', noThread[0].dedupeKey === 'mail:dana@fictional-builders.example|need a quote now', noThread[0].dedupeKey);

const store = {};
const first = runCode(join(dir, 'koodi', 'kaksoiskappale.js'), cls.filter((r) => r.isRfq), {}, { staticData: store });
check('duplicates: nothing is a duplicate on the first run', first.every((r) => !r.isDuplicate));
const writeOut = runCode(join(dir, 'koodi', 'vastaus.js'), first, nodes);
check('reply: review rows get no reply text', writeOut.filter((r) => r.handling === 'Review first').every((r) => r.replyBody === ''));
check('reply: other rows still get a reply', writeOut.filter((r) => r.handling !== 'Review first').every((r) => r.replyBody.length > 80));
check('duplicates: nothing is stored before the request is finished', Object.keys(store.handledKeys || {}).length === 0);
const marked = runCode(join(dir, 'koodi', 'merkitse.js'), writeOut, { 'Write reply': writeOut }, { staticData: store });
check('mark: every finished request is stored', marked.length === writeOut.length && Object.keys(store.handledKeys).length === writeOut.length);
const second = runCode(join(dir, 'koodi', 'kaksoiskappale.js'), cls.filter((r) => r.isRfq), {}, { staticData: store });
check('duplicates: the same emails are all caught on the second run', second.every((r) => r.isDuplicate) && /Already handled/.test(second[0].duplicateNote));
const twin = runCode(join(dir, 'koodi', 'kaksoiskappale.js'), [cls[0], { ...cls[0] }], {}, { staticData: {} });
check('duplicates: a repeat inside one batch is caught', twin[0].isDuplicate === false && twin[1].isDuplicate === true);
const big = { handledKeys: {} };
for (let i = 0; i < 510; i++) big.handledKeys['k' + i] = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
runCode(join(dir, 'koodi', 'merkitse.js'), [{}], { 'Write reply': [{ rfqId: 'R', dedupeKey: 'new' }] }, { staticData: big });
check('mark: only the newest 500 keys are kept', Object.keys(big.handledKeys).length === 500 && 'new' in big.handledKeys && !('k0' in big.handledKeys));

const alert = runCode(join(dir, 'koodi', 'virhe.js'), [{ error: { message: 'The caller does not have permission' } }], { Settings: settings, 'Write reply': [writeOut[0]] });
check('error note goes to the owner address', alert[0].alertTo === 'office@our-company.example');
check('error note names the request and the error', /RFQ-20260303-B7A1/.test(alert[0].alertSubject) && /does not have permission/.test(alert[0].alertBody));
check('error note says the request was not marked', /not marked as handled/.test(alert[0].alertBody));
check('error note works with a plain string error', /boom/.test(runCode(join(dir, 'koodi', 'virhe.js'), [{ error: 'boom' }], { Settings: settings, 'Write reply': [writeOut[0]] })[0].alertBody));

const wf = JSON.parse(readFileSync(join(dir, 'workflow.json'), 'utf8'));
const names = new Set(wf.nodes.map((n) => n.name));
const edges = Object.entries(wf.connections).flatMap(([from, c]) => c.main.flatMap((arr, i) => arr.map((t) => ({ from, to: t.node, out: i }))));
check('workflow: has 15 nodes and unique names', wf.nodes.length === 15 && names.size === 15, String(wf.nodes.length));
check('workflow: every connection points at an existing node', edges.every((e) => names.has(e.from) && names.has(e.to)));
check('workflow: every non-note node is reachable from the trigger', (() => {
  const seen = new Set(['Gmail Trigger']); let grew = true;
  while (grew) { grew = false; for (const e of edges) if (seen.has(e.from) && !seen.has(e.to)) { seen.add(e.to); grew = true; } }
  return wf.nodes.filter((n) => !n.type.endsWith('stickyNote')).every((n) => seen.has(n.name));
})());
check('workflow: sheet and draft nodes have an error output that leads to the error note', ['Add row to sheet', 'Save reply as draft'].every((n) => wf.nodes.find((x) => x.name === n).onError === 'continueErrorOutput' && edges.some((e) => e.from === n && e.out === 1 && e.to === 'Describe error')));
check('workflow: a request is marked handled only after the draft step or when no draft is wanted', edges.filter((e) => e.to === 'Mark as handled').map((e) => e.from).sort().join() === 'Reply wanted?,Save reply as draft');
check('workflow: inactive and with no credentials inside', wf.active === false && !JSON.stringify(wf).includes('"credentials"'));
check('workflow: embedded code equals the source files', ['Parse request:jasenna.js', 'Classify request:luokittele.js', 'Check duplicates:kaksoiskappale.js', 'Write reply:vastaus.js', 'Mark as handled:merkitse.js', 'Describe error:virhe.js'].every((s) => { const [n, f] = s.split(':'); return wf.nodes.find((x) => x.name === n).parameters.jsCode === readFileSync(join(dir, 'koodi', f), 'utf8'); }));
done();

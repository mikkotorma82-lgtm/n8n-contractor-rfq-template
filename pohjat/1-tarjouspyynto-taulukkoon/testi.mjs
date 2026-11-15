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
done();

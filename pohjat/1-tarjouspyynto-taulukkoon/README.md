# Request email to sheet and first reply

Reads each new email in your inbox. If it looks like a bid or quote request, it adds a row to a Google Sheet and saves a reply as a Gmail draft.

## Nodes

Gmail Trigger, Edit Fields (Set, named Settings), Code (Parse request), If, Code (Write reply), Google Sheets (append), Gmail (create draft). The two Code nodes hold all the logic; their source is in `koodi/`.

## Accounts you need

Gmail (OAuth) and Google Sheets (OAuth), connected by you in your own n8n. A spreadsheet with a tab named `Requests` and these column names in row 1: RFQ ID, Received, Name, Email, Phone, Trade, Location, Deadline, Budget, Scope, Missing, Priority, Status, Subject, Thread ID.

## Set up

1. Import `workflow.json` (menu, Import from file).
2. Open the red nodes, choose your Gmail and Google Sheets accounts.
3. Edit Settings: your address, company, sender name, time zone label, the two call times.
4. Put your spreadsheet ID in "Add row to sheet".
5. Run once with a test email sent from another address. Read the draft. Then activate.

## What it extracts

Sender name and email, phone, project address, due date, budget, trade (plumbing, HVAC, electrical, roofing, general, other), a short scope, and a list of missing details. A request due within 7 days of receipt gets Priority High. Newsletters, no-reply senders and your own address are skipped.

## Limits

Extraction is rule based: labelled lines ("Address: ...") work best, free text is guessed. Dates without a year take the year of the email. Unusual formats will be missed, which is why the reply is saved as a draft. Replies are English.

## Tests

`node testi.mjs` runs both Code nodes on the made-up emails in `testiaineisto/` and checks 32 things (parsing, missing fields, priority, business-day call times, no price in the reply). All names and addresses are invented and use reserved example domains.

## Email body

The Gmail Trigger is configured with Simplify off. The parser expects the full message body in text or textPlain and falls back to snippet. Check the actual trigger output after connecting your account; the live field mapping has not been verified.

## Not verified

The Code logic is tested. The workflow file was built to the n8n node format but has not been imported into a running n8n here. Check the node parameter screens after import, especially the Gmail Trigger output field names.

## Limits of the parser

The Parse request node reads the email with plain pattern matching. The first match wins for each field, so an email with two addresses or two dates gives the first one, and an unfamiliar layout gives empty fields that are listed under Missing. It is a first filter for a person to check, not a guarantee. Check every row against the email before you rely on it.

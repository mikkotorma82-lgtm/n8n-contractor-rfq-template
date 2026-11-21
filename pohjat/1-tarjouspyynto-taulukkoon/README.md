# Request email to sheet and first reply

Reads each new email in your inbox. If it looks like a bid or quote request, it classifies it, skips repeats, adds a row to a Google Sheet and saves a reply as a Gmail draft. If the sheet or the draft fails, it saves a note about it as a draft to you.

## Nodes (15)

Gmail Trigger, Edit Fields (Set, named Settings), Code (Parse request), Code (Classify request), If (Is it a request?), Code (Check duplicates), If (New request?), Code (Write reply), Google Sheets (Add row to sheet), If (Reply wanted?), Gmail (Save reply as draft), Code (Mark as handled), Code (Describe error), Gmail (Save error note as draft), and a sticky note with setup steps. The Code nodes hold all the logic; their source is in `koodi/`.

## What each step does

1. Parse request reads the email with plain pattern matching: sender, phone, address, due date, budget, trade, short scope, missing details.
2. Classify request sets a request type and what happens next. Types: Quote request, Bid invitation, Follow-up, Addendum, Cancellation. Handling: Draft reply (normal), Call first (urgent and two or more details missing), Review first (cancellation, addendum or follow-up: sheet row, no reply draft). Words like "urgent" or "ASAP" raise the priority to High.
3. Check duplicates drops a request already handled. The key is the Gmail thread, or the sender plus the subject without "Re:" when there is no thread. Repeats inside one batch are caught too.
4. Write reply and Add row to sheet. Replies are English, never state a price and offer two call times on the next business days.
5. Save reply as draft, for every request except Review first.
6. Mark as handled stores the duplicate key, keeping the newest 500. It runs only after the sheet row and the draft succeeded, so a failed request can be tried again.
7. Describe error and Save error note as draft: when the sheet write or the draft fails, a note with the request ID, sender, subject and the error text is saved as a draft addressed to your own address. The request is not marked as handled.

## Accounts you need

Gmail (OAuth) and Google Sheets (OAuth), connected by you in your own n8n. A spreadsheet with a tab named `Requests` and these column names in row 1: RFQ ID, Received, Name, Email, Phone, Trade, Location, Deadline, Budget, Scope, Missing, Priority, Type, Handling, Status, Subject, Thread ID. Type and Handling are new in this version; add them to an existing sheet.

## Set up

1. Import `workflow.json` (menu, Import from file).
2. Open the red nodes, choose your Gmail and Google Sheets accounts.
3. Edit Settings: your address, company, sender name, time zone label, the two call times.
4. Put your spreadsheet ID in "Add row to sheet".
5. Run once with a test email sent from another address. Read the draft. Then activate.

## Limits

Extraction is rule based: labelled lines ("Address: ...") work best, free text is guessed. The first match wins for each field, so an email with two addresses or two dates gives the first one, and an unfamiliar layout gives empty fields that are listed under Missing. Classification is also keyword based: a cancellation written without the usual words is treated as a normal request. Dates without a year take the year of the email. Replies are English. Call times skip weekends but not holidays or calendar availability. This is a first filter for a person to check, not a guarantee. Check every row and draft before you rely on it.

Duplicate memory is stored in the workflow's static data, which n8n keeps only for an active workflow. In a manual test run nothing is remembered. Rewording a subject in a new thread creates a new key, so that email is not treated as a repeat.

## Tests

`node testi.mjs` runs the Code nodes on made-up emails in `testiaineisto/` and checks the workflow file. 58 checks: parsing, missing fields, priority, business-day call times, no price in the reply, request types and handling, duplicate detection and its 500 key limit, the error note, and the workflow graph (15 nodes, all connections valid, error outputs wired, code in the file equals the source). All names and addresses are invented and use reserved example domains.

## Email body

The Gmail Trigger is configured with Simplify off. The parser expects the full message body in text or textPlain and falls back to snippet. Check the actual trigger output after connecting your account; the live field mapping has not been verified.

## Not verified

The Code logic is tested outside n8n with mocked inputs. The workflow file was built to the n8n node format but this version has not been imported into a running n8n, and nothing was run against Gmail or Google Sheets. In particular the error output wiring ("On error: continue using error output") and the shape of the error item are untested in n8n. Check the node parameter screens and the error branch after import.

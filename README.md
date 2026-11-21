# Contractor request email to sheet and reply draft

An n8n workflow for English contractor quote requests. It reads an incoming Gmail message, extracts request details, sorts the request by type (quote request, bid invitation, follow-up, addendum, cancellation), skips requests it has already handled, adds a Google Sheets row and saves a reply as a Gmail draft. Cancellations, addenda and follow-ups get a row but no reply. If the sheet or the draft fails, a note about the failure is saved as a draft to you. A person reviews and sends every draft.

[Download the workflow JSON](pohjat/1-tarjouspyynto-taulukkoon/workflow.json). Import it into your own n8n account using Import from file.

[Setup instructions and parser limits](pohjat/1-tarjouspyynto-taulukkoon/README.md) list the required sheet columns and settings. Connect your own Gmail and Google Sheets accounts. The workflow is inactive on import and includes no connected account credentials.

## Test evidence

Run with Node.js, with no installation or account required:

```sh
node pohjat/1-tarjouspyynto-taulukkoon/testi.mjs
```

The publication copy passed 58 assertions on 2026-11-21 (32 on the earlier single-step version). The tests execute the six Code node source files with invented emails and mocked n8n inputs, and check the workflow file itself: 15 nodes, every connection valid, error outputs wired to the error note, and the code inside the file equal to the source. They cover extracted fields, skipped newsletters, request types, duplicate detection, missing details, draft text, business-day call dates and the error note. All fixture identities are fictional.

The code test is not an end-to-end n8n test. The error branch ("On error: continue using error output") and the duplicate memory in n8n static data have not been run in n8n; static data only persists while the workflow is active. Gmail OAuth, incoming message format, Sheets writes and Gmail draft creation are not verified against live services. Inspect each node after import and test with fictional data before activation. Check every extracted row and reply draft before relying on it. Call dates skip weekends, but do not account for holidays or calendar availability. The configured time zone is a text label.

## Data and operation

Run this workflow in your own n8n and connected accounts. Incoming email content passes through n8n, request fields are written to your Google Sheet, and reply drafts are saved in your Gmail. Execution history may retain the email content depending on your n8n settings. This repository contains fictional fixtures only and does not provide a hosted service.

## AI disclosure

AI assisted with the workflow, code and documentation. The automated code checks and their limits are described above.

## License

The workflow, code and fictional test fixtures in this repository are available under the MIT license. n8n itself has its own license; it is not included here.

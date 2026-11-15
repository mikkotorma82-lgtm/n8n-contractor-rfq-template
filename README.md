# Contractor request email to sheet and reply draft

An n8n workflow for English contractor quote requests. It reads an incoming Gmail message, extracts request details, adds a Google Sheets row and saves a reply as a Gmail draft. A person reviews and sends the draft.

[Download the workflow JSON](pohjat/1-tarjouspyynto-taulukkoon/workflow.json). Import it into your own n8n account using Import from file.

[Setup instructions and parser limits](pohjat/1-tarjouspyynto-taulukkoon/README.md) list the required sheet columns and settings. Connect your own Gmail and Google Sheets accounts. The workflow is inactive on import and includes no connected account credentials.

## Test evidence

Run with Node.js, with no installation or account required:

```sh
node pohjat/1-tarjouspyynto-taulukkoon/testi.mjs
```

The publication copy passed 32 assertions on 2026-11-15. The tests execute the two Code node source files with invented emails and mocked n8n inputs. They check extracted fields, skipped newsletters, missing details, draft text and business-day call dates. All fixture identities are fictional.

The code test is not an end-to-end n8n test. Gmail OAuth, incoming message format, Sheets writes and Gmail draft creation are not verified against live services. Inspect each node after import and test with fictional data before activation. Check every extracted row and reply draft before relying on it. Call dates skip weekends, but do not account for holidays or calendar availability. The configured time zone is a text label.

## Data and operation

Run this workflow in your own n8n and connected accounts. Incoming email content passes through n8n, request fields are written to your Google Sheet, and reply drafts are saved in your Gmail. Execution history may retain the email content depending on your n8n settings. This repository contains fictional fixtures only and does not provide a hosted service.

## AI disclosure

AI assisted with the workflow, code and documentation. The automated code checks and their limits are described above.

## License

The workflow, code and fictional test fixtures in this repository are available under the MIT license. n8n itself has its own license; it is not included here.

# The Record Room AI Legal Records Intake

The Record Room AI is a local-first, source-labeled legal accountability intake system for judges, lawyers, guardians ad litem, prosecutors, custody evaluators, parenting coordinators, court staff, experts/witnesses, agencies, and related legal professionals.

## Safety rules built into this starter

- Scanner/API/manual imports feed the database first; they do **not** feed AI directly.
- Every scanned or imported record is added to `review_queue` before any profile, claim, or public search use.
- Nothing becomes public automatically.
- Public search only returns documents marked `review_status = approved public`, `visibility = public approved`, and not sealed/confidential/needs-redaction.
- Records before `1990-01-01` are rejected by scanner and upload/import workflows.
- Commercial and account-based platforms such as Trellis Law, Westlaw, Lexis, UniCourt, Docket Alarm, PACER, re:SearchTX, re:SearchGA, and county portals are manual/import-only unless an approved API, export, or license-compatible method is configured.
- Connectors must never bypass login, paywall, CAPTCHA, robots.txt, terms of use, anti-bot controls, or sealed/confidential access limits.
- AI summaries are source-bound and separate official findings from allegations.

## Run locally

```bash
npm install
node server.js
```

Open <http://localhost:3000>.

Local data paths:

- Uploads: `/record-room-data/uploads`
- Extracted text: `/record-room-data/extracted-text`
- SQLite database: `/record-room-data/database.sqlite`

You can override the data root with:

```bash
RECORD_ROOM_DATA=/your/private/path node server.js
```

## Admin dashboard

Open <http://localhost:3000/admin/scanner>.

The admin dashboard currently uses an authentication placeholder and sends `X-Admin-Auth-Placeholder` to make the production requirement explicit. Configure real login/auth before public deployment.

Admin pages:

- `/admin/scanner` — run admin-initiated scanner jobs.
- `/admin/raw-results` — review API/scanner results.
- `/admin/research-leads` — manually enter/import Trellis, Westlaw, Lexis, UniCourt, Docket Alarm, PACER, official court, news, or other leads.
- `/admin/review-queue` — view all pending review items.
- `/admin/documents` — review uploaded documents, extraction status, visibility, and redaction status.
- `/admin/profiles` — create profiles and generate source-bound summaries.

## Public upload page

Open <http://localhost:3000/upload>.

Public upload requires all safety warning checkboxes before submission:

1. Do not upload sealed, confidential, protected, or unlawfully obtained documents.
2. Submission does not guarantee publication.
3. Documents may be reviewed, redacted, rejected, or kept private.
4. Submitter certifies a good-faith basis.
5. The Record Room may label submissions as user-submitted, unverified, alleged, court-record-supported, official-record-supported, or rejected.

Submissions are saved as pending/private documents and placed into the review queue.

## Scanner jobs

Scanner jobs are created only from the admin API/UI. The scanner supports saved keyword groups:

1. Judicial Recusal / Disqualification
2. Guardian ad Litem / GAL
3. Attorney / Prosecutor Misconduct
4. Sealing / Protective Orders / Confidentiality
5. Appeals / Reversals

The CourtListener / RECAP connector uses API-based search when possible and stores source URLs/API IDs. Results enter `raw_results` and `review_queue`; they are not public.

If `COURTLISTENER_TOKEN` is set, the connector uses it as a token. Without a token, it attempts public API access.

## Trellis and manual imports

Trellis Law is modeled as a commercial legal research platform source. It is not scraped automatically. Use `/admin/research-leads` to enter:

- Manual entry
- PDF/screenshot upload
- CSV upload if available
- Copy/paste docket text
- Source URL
- Notes
- Official verification source

Trellis records are labeled as research leads and default to `needs official source verification` unless linked to an official source.

## Why commercial platforms are manual/import-only

Commercial platforms and account-based legal databases may have license, access, CAPTCHA, paywall, anti-bot, robots, or terms restrictions. This starter refuses automated scraping for those sources unless you later configure an approved API, export feature, or license-compatible workflow.

## Public search approval

Open <http://localhost:3000/search>.

Public search queries only `search_index` entries marked public and joined to documents that are:

- `review_status = approved public`
- `visibility = public approved`
- not `needs redaction`
- not `confidential/blocked`
- not `sealed/do not publish`

If no approved public result exists, the UI/API says: “No approved public records are currently available for this search.” It does not say “No issues found.”

## Data flow

```text
Scanner/API/manual import
→ raw_results or research_leads
→ review_queue
→ documents/profiles/claims
→ search_index
→ AI source-bound summaries
→ public search only if approved
```

## Document processing

Uploads are limited to 25 MB and validate extensions: PDF, DOCX, TXT, JPG, PNG, CSV. The system saves the original file, creates a document record, extracts text for PDF/DOCX/TXT where possible, adds OCR placeholders for scans/images, stores extracted text, and indexes only for admin search by default. Public indexing happens only after public approval.

Malware scanning and rate limiting are placeholders to configure before production.

## Add new connectors later

Add a connector in `server/connectors`, seed a `sources` row, and wire it into `server/services/scannerService.js`. Connectors must:

- obey terms/robots/access restrictions
- never bypass CAPTCHA/login/paywalls
- save only public or license-compatible data
- mark unavailable documents as manual request/account required/blocked/unknown
- send everything to the review queue
- avoid pre-1990 records

## Deployment later

This starter is local/private mode by default. For public website mode, add production authentication, rate limiting, malware scanning, configured cloud storage/database, HTTPS, audit logging, backup policy, and a formal redaction workflow before exposing admin tools.

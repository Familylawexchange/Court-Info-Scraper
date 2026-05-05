# Court-Info-Scraper / Legal Records Scanner

This repository is the Court-Info-Scraper connector-based legal-records scanner for **The Record Room AI**. The main Record Room AI app is separate and normally runs at <http://localhost:5173>. This scanner normally runs at <http://localhost:3000>.

The scraper/scanner finds legal-record leads from public/open/API/manual-import sources and saves them as raw results for admin review. It **does not publish records publicly**, does **not** bypass access controls, and does **not** replace the Record Room AI app.

## Safety rules

- Scanner results are research leads first.
- All connector/manual-import results go to `raw_results` and then `review_queue`.
- Nothing becomes public automatically.
- Public search excludes pending, private, sealed, confidential, rejected, and needs-redaction records.
- Do not bypass paywalls, logins, CAPTCHA, robots/terms restrictions, sealed records, protected records, or confidential records.
- Trellis Law, Westlaw, Lexis, UniCourt, Docket Alarm, PACER, re:SearchGA, re:SearchTX, and many county court portals are manual/import/API-required unless license-compatible automation is configured.

## Environment

Create or preserve a `.env`/process environment with:

```bash
RECORD_ROOM_API_URL=http://localhost:5173
RECORD_ROOM_ADMIN_TOKEN=local-dev-admin
SCANNER_PORT=3000
```

`RECORD_ROOM_DATA` can optionally point SQLite/uploads to a different local data directory. Existing data is preserved; startup migrations use `ALTER TABLE ... ADD COLUMN` only for missing columns.

## How to run

```bash
npm install
npm start
```

Open the scanner at:

<http://localhost:3000/admin/scanner>

## How to test the mock scanner

```bash
npm run scan
```

The mock connector inserts clearly labeled `TEST DATA ONLY` raw results, including `docket_entry_title`, and creates review queue entries. There is also a local smoke endpoint for the same schema path: `POST /api/admin/raw-results/docket-entry-title-smoke`, which inserts a mock raw result with `docket_entry_title` and enqueues it for review. Check results at:

<http://localhost:3000/admin/raw-results>

Check review queue entries at:

<http://localhost:3000/admin/review>

## How to test Record Room AI integration

Make sure the main Record Room AI app is running at <http://localhost:5173>, then run:

```bash
npm run test:record-room
```

The script sends one fake scanner result to:

```text
POST http://localhost:5173/api/scanner/import
Authorization: Bearer local-dev-admin
```

If Record Room AI is not running, the client reports:

```text
Record Room AI is not reachable at http://localhost:5173. Start Record Room AI first.
```

## Admin routes

- `/admin/scanner` — main admin scanner page with expanded source selector, keyword groups, status logs, connector controls, and Record Room AI status.
- `/admin/raw-results` — raw scanner/API/manual lead results with filters and review actions.
- `/admin/research-leads` — manual import page for Trellis Law, Westlaw, Lexis, UniCourt, Docket Alarm, PACER, clerk results, screenshots, PDFs, CSV exports, and copied docket entries.
- `/admin/review` — review queue for raw results, documents, and research leads.
- `/admin/documents` — document review if documents are stored locally.
- `/admin/profiles` — local profile management if used.
- `/public-upload` — optional public upload page; submissions remain private/pending by default.
- `/public-search` — optional approved-public search alias; it excludes private/pending/rejected records and does not replace the Record Room AI app.

## Sending scanner results to Record Room AI

From `/admin/scanner`, use **Send all new results to Record Room AI** to send all `new result` raw results to the configured Record Room API.

From `/admin/raw-results`, use **send to Record Room AI** on an individual row to send a selected result.

The scanner posts results to `/api/scanner/import` on `RECORD_ROOM_API_URL` using the configured bearer token. Results should enter the Record Room AI review queue, not public pages.

## Source model

Each seeded source includes:

- `source_id`
- `source_name`
- `source_category`
- `state`, `county`, `court`
- `base_url`
- `access_type` (`API`, `open web`, `RSS`, `HTML search`, `manual import`, `licensed export`, `account required`, or `placeholder`)
- `automation_status` (`working connector`, `placeholder only`, `manual import only`, `API required`, `account required`, or `blocked/no automation`)
- terms/robots notes
- login/paid/CAPTCHA flags
- rate-limit notes
- `safe_to_run_boolean`
- notes

If `safe_to_run_boolean` is false, the scanner does not crawl. It returns the manual workflow message: “Search this source manually, download/export permitted records, then upload or paste the result into Research Leads.”

## Included source categories

The source dropdown includes broad open/API legal databases, federal records, commercial legal research platforms, Georgia, Florida, California, Ohio, South Carolina, Texas, official discipline/oversight/ethics sources, and news/public web manual-lead sources.

Commercial/account systems such as Trellis Law, Westlaw, Lexis, UniCourt, Docket Alarm, vLex/Fastcase, PACER, re:SearchGA, and re:SearchTX are treated as manual import, licensed export, or approved API sources unless safe automation is explicitly configured.

## Keyword groups

The scanner seeds expanded keyword groups for recusal/disqualification, GAL removal, evaluators, attorney misconduct, prosecutorial misconduct, sealing/protective orders, appeals/reversals, custody/parenting time, constitutional family law, court officials/clerks, public records/FOIA, discipline/ethics, orders/motions, domestic violence/protective orders, and CPS/dependency.

## Adding a new connector

1. Add a connector module in `server/connectors` with a `search(job, source, keywords)` function.
2. Confirm the source is legally and technically safe to run: public/open/API endpoint, terms/robots compatible, no login/CAPTCHA/paywall bypass, no sealed/confidential access.
3. Add or update the source metadata in `server/config.js` with `safe_to_run_boolean: true` only when automation is allowed.
4. Wire the connector into `server/services/scannerService.js`.
5. Map connector output to raw result fields, especially `source_name`, `source_type`, `case_name`, `case_number`, `docket_entry_title`, `docket_entry_text`, dates, URLs, matched keywords, confidence, `review_status`, and `visibility`.
6. Ensure results are inserted with `db.insertRawResult()` and enqueued with `visibility: admin only`.
7. Add tests using mock or API-safe fixtures.

## Commands

```json
{
  "start": "node server.js",
  "dev": "node server.js",
  "scan": "node src/scan.js",
  "test:record-room": "node src/testRecordRoomImport.js",
  "test": "node --test"
}
```

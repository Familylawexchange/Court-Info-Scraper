const db = require('../server/db/database');
const scanner = require('../server/services/scannerService');
(async () => {
  db.initDatabase();
  const result = await scanner.runMockScannerJob();
  const rows = db.all("SELECT id, docket_entry_title, source_name, review_status FROM raw_results WHERE source_name = 'Mock Connector' ORDER BY id DESC LIMIT 5");
  console.log(JSON.stringify({ result, rawResults: rows }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });

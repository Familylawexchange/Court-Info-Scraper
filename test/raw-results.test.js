const test = require('node:test');
const assert = require('node:assert/strict');
process.env.RECORD_ROOM_DATA = require('node:fs').mkdtempSync('/tmp/record-room-test-');
const db = require('../server/db/database');
const scanner = require('../server/services/scannerService');

test('mock scanner inserts docket_entry_title and review queue item', async () => {
  db.initDatabase();
  const result = await scanner.runMockScannerJob();
  assert.equal(result.status, 'complete');
  const row = db.get('SELECT * FROM raw_results WHERE id = @id', { id: result.raw_result_ids[0] });
  assert.match(row.docket_entry_title, /Mock docket entry title/);
  assert.equal(row.visibility, 'admin only');
  const queue = db.get('SELECT * FROM review_queue WHERE item_type = @type AND item_id = @id', { type: 'raw_result', id: row.id });
  assert.equal(queue.review_status, 'new result');
  assert.equal(queue.visibility, 'admin only');
});

test('raw result insert ignores unknown payload fields safely', () => {
  db.initDatabase();
  const id = db.insertRawResult({ source_name: 'Unit Test', docket_entry_title: 'Named parameter smoke test', unknown_extra_field: 'ignored' });
  const row = db.get('SELECT source_name, docket_entry_title FROM raw_results WHERE id = @id', { id });
  assert.equal(row.docket_entry_title, 'Named parameter smoke test');
});

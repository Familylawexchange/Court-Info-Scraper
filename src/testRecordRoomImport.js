const client = require('../server/services/recordRoomClient');
(async () => {
  const fake = { source_name: 'Mock Connector', source_type: 'public legal database', case_name: 'Fake Record Room Import Test', case_number: 'RR-TEST-001', docket_entry_title: 'Fake docket entry for Record Room import test', docket_entry_text: 'TEST DATA ONLY. This should appear in the Record Room AI review queue.', review_status: 'new result', visibility: 'admin only', notes: 'TEST DATA ONLY' };
  const result = await client.sendResults([fake]);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
})();

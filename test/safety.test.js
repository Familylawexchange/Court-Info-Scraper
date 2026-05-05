const test = require('node:test');
const assert = require('node:assert/strict');
const scanner = require('../server/services/scannerService');
const redaction = require('../server/services/redactionService');

test('scanner rejects date ranges before 1990', () => {
  assert.throws(() => scanner.enforceDateFloor('1989-12-31'), /before 1990/);
  assert.equal(scanner.enforceDateFloor('1990-01-01'), '1990-01-01');
  assert.equal(scanner.enforceDateFloor(), '1990-01-01');
});

test('public eligibility requires approved public and redaction-safe document', () => {
  assert.equal(redaction.publicEligibleDocument({ review_status: 'approved public', visibility: 'public approved', redaction_status: 'reviewed/no redaction needed' }), true);
  assert.equal(redaction.publicEligibleDocument({ review_status: 'approved public', visibility: 'public approved', redaction_status: 'needs redaction' }), false);
  assert.equal(redaction.publicEligibleDocument({ review_status: 'needs manual verification', visibility: 'public approved', redaction_status: 'reviewed/no redaction needed' }), false);
});

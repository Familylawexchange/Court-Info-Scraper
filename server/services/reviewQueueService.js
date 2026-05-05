const db = require('../db/database');
function enqueue(itemType, itemId, reason, priority = 'normal', reviewStatus = 'new result') {
  return db.insert('review_queue', { item_type: itemType, item_id: itemId, reason, priority, review_status: reviewStatus });
}
function list(filters = {}) {
  const clauses = [];
  const params = {};
  if (filters.review_status) { clauses.push('review_status = @review_status'); params.review_status = filters.review_status; }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.all(`SELECT * FROM review_queue ${where} ORDER BY created_at DESC LIMIT 500`, params);
}
function updateStatus(id, reviewStatus, notes) {
  db.run('UPDATE review_queue SET review_status = @reviewStatus, notes = COALESCE(@notes, notes), updated_at = CURRENT_TIMESTAMP WHERE id = @id', { id, reviewStatus, notes });
}
module.exports = { enqueue, list, updateStatus };

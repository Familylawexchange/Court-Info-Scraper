const { RECORD_ROOM_API_URL, RECORD_ROOM_ADMIN_TOKEN } = require('../config');
let lastImportStatus = { ok: null, message: 'No import attempted yet.', at: null };
async function checkConnection() {
  try {
    const response = await fetch(RECORD_ROOM_API_URL, { method: 'GET' });
    return { connected: response.status < 500, status: response.status, apiUrl: RECORD_ROOM_API_URL, lastImportStatus };
  } catch (error) {
    return { connected: false, apiUrl: RECORD_ROOM_API_URL, message: `Record Room AI is not reachable at ${RECORD_ROOM_API_URL}. Start Record Room AI first.`, lastImportStatus };
  }
}
async function sendResults(results) {
  const payload = Array.isArray(results) ? { results } : results;
  try {
    const response = await fetch(`${RECORD_ROOM_API_URL}/api/scanner/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RECORD_ROOM_ADMIN_TOKEN}` }, body: JSON.stringify(payload)
    });
    const text = await response.text();
    let body; try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (!response.ok) throw new Error(`Record Room AI import failed with ${response.status}: ${text}`);
    lastImportStatus = { ok: true, status: response.status, body, at: new Date().toISOString() };
    return lastImportStatus;
  } catch (error) {
    const message = error.cause?.code === 'ECONNREFUSED' || /fetch failed|ECONNREFUSED/i.test(error.message)
      ? `Record Room AI is not reachable at ${RECORD_ROOM_API_URL}. Start Record Room AI first.` : error.message;
    lastImportStatus = { ok: false, message, at: new Date().toISOString() };
    console.error('[record-room] import error:', message);
    return lastImportStatus;
  }
}
function getLastImportStatus() { return lastImportStatus; }
module.exports = { sendResults, checkConnection, getLastImportStatus, RECORD_ROOM_API_URL, RECORD_ROOM_ADMIN_TOKEN };

const db = require('../db/database');
function generateSourceBoundSummary(profileId, publicOnly = true) {
  const profile = db.get('SELECT * FROM profiles WHERE id = @profileId', { profileId });
  if (!profile) throw new Error('Profile not found');
  const visibilityClause = publicOnly ? "AND c.public_visibility = 'public approved'" : '';
  const claims = db.all(`SELECT c.*, cs.source_url, cs.source_label FROM claims c LEFT JOIN claim_sources cs ON cs.claim_id = c.id WHERE c.profile_id = @profileId ${visibilityClause}`, { profileId });
  const sections = { 'verified official information': [], 'appellate findings': [], 'court-record-supported filings/orders': [], 'filed allegations not adjudicated': [], 'disciplinary findings': [], 'user-submitted allegations': [], 'commercial-platform leads': [], 'self-promotional/marketing sources': [], 'conflicting information': [] };
  for (const claim of claims) {
    const text = `${claim.claim_text} (${claim.source_label || claim.reliability_label || 'source required'}${claim.source_url ? `: ${claim.source_url}` : ''})`;
    if (/appellate/i.test(claim.reliability_label || '')) sections['appellate findings'].push(text);
    else if (/disciplinary/i.test(claim.reliability_label || '')) sections['disciplinary findings'].push(text);
    else if (/allegation|not adjudicated/i.test(claim.reliability_label || '')) sections['filed allegations not adjudicated'].push(`A filed record alleged: ${text}`);
    else if (/commercial|Trellis|Westlaw|Lexis|UniCourt|Docket Alarm/i.test(claim.reliability_label || '')) sections['commercial-platform leads'].push(text);
    else sections['court-record-supported filings/orders'].push(text);
  }
  return { profile, warning: 'This source-bound summary separates official findings from allegations and does not use unapproved records for public users.', sections };
}
module.exports = { generateSourceBoundSummary };

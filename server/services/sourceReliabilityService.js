function labelForSource(sourceName, sourceType) {
  if (/trellis/i.test(sourceName || '')) return 'Trellis Law research lead';
  if (/westlaw/i.test(sourceName || '')) return 'Westlaw manual upload';
  if (/lexis/i.test(sourceName || '')) return 'Lexis manual upload';
  if (/unicourt/i.test(sourceName || '')) return 'UniCourt research lead';
  if (/docket alarm/i.test(sourceName || '')) return 'Docket Alarm research lead';
  if (/courtlistener|recap/i.test(sourceName || '') || /RECAP|PACER/i.test(sourceType || '')) return 'RECAP/PACER record';
  if (/appellate/i.test(sourceType || '')) return 'appellate opinion';
  if (/disciplin/i.test(sourceType || '')) return 'official disciplinary record';
  return sourceType || 'unknown source';
}
function defaultReviewStatus(sourceName, verificationSource) {
  if (/trellis|westlaw|lexis|unicourt|docket alarm/i.test(sourceName || '') && !verificationSource) return 'needs official source verification';
  return 'needs manual verification';
}
module.exports = { labelForSource, defaultReviewStatus };

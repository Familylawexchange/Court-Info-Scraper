const REVIEW_STATUSES = [
  'new result','likely relevant','not relevant','duplicate','needs manual verification','needs official source verification','needs redaction','confidential/blocked','sealed/do not publish','approved private','approved public','rejected'
];
const VISIBILITY_STATUSES = ['admin only','private','public approved','public profile summary only','pending','rejected','needs redaction','do not publish'];
const RELIABILITY_LABELS = ['official court source','appellate opinion','trial court order','trial court filing','transcript','public docket','RECAP/PACER record','official disciplinary record','bar record','judicial commission record','prosecutor office/government record','news/public source','commercial legal research platform','Trellis Law research lead','Westlaw manual upload','Lexis manual upload','UniCourt research lead','Docket Alarm research lead','user-submitted document','law firm website','personal website','marketing profile','review','social media','anonymous','unknown source'];
const RELIABILITY_TAGS = ['verified official source','court-record supported','filed allegation, not adjudicated','appellate finding','disciplinary finding','user-submitted','unverified allegation','self-promotional source','adversarial source','anonymous source','conflicting information','needs admin review','needs official verification','do not publish'];
const KEYWORD_GROUPS = {
  'Judicial Recusal / Disqualification': ['motion to recuse','motion for recusal','motion to disqualify judge','judicial disqualification','verified statement of disqualification','affidavit of bias','appearance of impropriety','ex parte','impartiality','bias','prejudice'],
  'Guardian ad Litem / GAL': ['guardian ad litem','GAL','G.A.L.','motion to remove guardian ad litem','motion to disqualify guardian ad litem','motion to strike GAL report','guardian ad litem report','GAL fees','GAL misconduct','guardian ad litem bias','guardian ad litem ex parte'],
  'Attorney / Prosecutor Misconduct': ['attorney misconduct','prosecutorial misconduct','conflict of interest','sanctions','disciplinary order','bar complaint','ethics complaint','motion for sanctions','motion to disqualify counsel','ineffective assistance','Brady','ex parte communication'],
  'Sealing / Protective Orders / Confidentiality': ['motion to seal','protective order','confidentiality order','sealed record','redaction','privacy','minor child','domestic violence','protective filing'],
  'Appeals / Reversals': ['reversed','vacated','remanded','abuse of discretion','due process','fundamental fairness','recusal denied','GAL report','custody','divorce','family court','domestic relations']
};
const COVERED_STATES = ['Georgia','Florida','California','Ohio','South Carolina','Texas'];
const TRACKED_ROLES = ['Judge','Attorney/Lawyer','Guardian ad Litem','Prosecutor','Custody Evaluator','Parenting Coordinator','Court Staff','Expert/Witness','Agency/Office','Other Legal Professional'];
const DATA_ROOT = process.env.RECORD_ROOM_DATA || '/record-room-data';
module.exports = { REVIEW_STATUSES, VISIBILITY_STATUSES, RELIABILITY_LABELS, RELIABILITY_TAGS, KEYWORD_GROUPS, COVERED_STATES, TRACKED_ROLES, DATA_ROOT };

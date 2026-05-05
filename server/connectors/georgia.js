const { placeholder } = require('./stateAppellate');
const STATE = __filename.includes('southCarolina') ? 'South Carolina' : __filename.split('/').pop().replace('.js','').replace(/^[a-z]/, c => c.toUpperCase());
const docketSources = [
  'official appellate opinion connector',
  'county/court public docket placeholder',
  'official judicial discipline connector placeholder',
  'official bar/attorney discipline connector placeholder'
];
async function search() {
  return { blocked: true, message: `${STATE} official docket connectors are placeholders. Configure public endpoints and terms/robots rules; never bypass CAPTCHA, logins, paywalls, account requirements, or sealed/confidential access.`, docketSources };
}
module.exports = { ...placeholder(STATE), search, docketSources };

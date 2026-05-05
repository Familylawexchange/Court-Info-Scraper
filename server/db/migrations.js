const { initDatabase } = require('./database');
function migrate() { return initDatabase(); }
if (require.main === module) migrate();
module.exports = { migrate };

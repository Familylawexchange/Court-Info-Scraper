module.exports = {
  connectorTypes: ['state bar discipline','judicial discipline commissions','judicial qualification commissions','attorney registration/bar status pages','prosecutor office pages','government staff directories'],
  capturedFields: ['name','bar_number','discipline_history','official_orders','complaint_disposition_records','dates','links','source_type'],
  reliabilityLabel: 'official source',
  async search() {
    return { blocked: true, message: 'Discipline source connector placeholder. Configure official source endpoint and access rules before use.' };
  }
};

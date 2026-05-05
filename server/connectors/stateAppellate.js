function placeholder(state) {
  return {
    name: `${state} appellate opinions`,
    async search() {
      return { blocked: true, message: `${state} appellate connector is a configurable placeholder. Add an official API/feed/export endpoint before scanning; no scraping or access bypass is performed.` };
    }
  };
}
module.exports = { placeholder };

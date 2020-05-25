module.exports = (config, db) =>
  async function mainPage(_, res) {
    res.render("index.html", {
      title: config.title,
      schema: await db.getTablesSchemas(),
    });
  };

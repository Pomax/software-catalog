const path = require("path");
const db = require("../db");
const config = require("../../config.json");
const nunjucks = require("nunjucks");

const opts = { autoescape: false, noCache: true };
const env = nunjucks.configure(path.join(process.cwd(), "templates"), opts);

const clearCache = require("./clear-cache.js")(env);
const mainPage = require("./main-page.js")(config, db);
const tableRoutes = require("./table.js");
const recordRoutes = require("./records.js");

module.exports = (app) => {
  env.express(app);

  /**
   * Create a table
   *
   * - GET yields the build form page
   * - POST saves the build form data as new table
   */
  app.get("/create", clearCache, tableRoutes.serveBuildForm);
  app.post("/create", clearCache, tableRoutes.create);

  /**
   * Drop a table
   */
  app.post("/drop", clearCache, tableRoutes.drop);

  /**
   * Create a table record
   */
  app.post("/table/(:tablename)/create", clearCache, recordRoutes.create);

  /**
   * Edit a table record
   */
  app.post("/table/(:tablename)/edit", clearCache, recordRoutes.edit);

  /**
   * Delete a table record (via GET)
   */
  app.get("/table/(:tablename)/delete", clearCache, recordRoutes.delete);

  /**
   * View a table, with a build form for new records.
   */
  app.get("/table/(:tablename)", clearCache, tableRoutes.view);

  /**
   * Main page
   */
  app.get("index.html", clearCache, mainPage);
  app.get("/", clearCache, mainPage);
};

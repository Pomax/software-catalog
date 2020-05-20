const config = require("../config.json");
const nunjucks = require("nunjucks");
const path = require("path");
const URL = require('url');
const opts = { autoescape: false, noCache: true };
const env = nunjucks.configure(path.join(process.cwd(), "templates"), opts);
const db = require("./db");

const routes = {
  /**
   * Main page
   */
  ",index.html": async (req, res) => {
    res.render("index.html", {
      title: config.title,
      schema: await db.getTablesSchemas(),
    });
  },

  drop: async (req, res) => {
    if (req.method === "POST") {
      const tableName = req.body.tablename;
      await db.dropTable(tableName);
    }
    res.redirect("/");
  },

  create: async (req, res) => {
    const tableName = req.query.tablename || req.params.tablename;

    if (req.method === "GET") {
      res.render("create-table.html", {
        title: config.title,
        tableName,
      });
    }

    if (req.method === "POST") {
      const tableName = req.body.tablename;
      delete req.body.tablename;

      const fields = [];
      const constraints = [];
      Object.entries(req.body).forEach((pair) => {
        let [name, value] = pair;
        let i = parseInt(name.substring(name.indexOf("-") + 1));
        name = name.replace(`-${i}`, "");

        if (name === "constraint") {
          constraints.push(value);
        } else {
          let def = (fields[i] = fields[i] || {});
          def[name] = value;
        }
      });

      const schema = {};
      fields
        .filter((v) => !!v)
        .forEach((def) => {
          schema[def.fieldname] = `${def.fieldtype} ${
            def.notnull ? "NOT NULL" : ""
          } ${def.pk ? "PRIMARY KEY" : ""}`.trim();
        });

      await db.createTable(tableName, schema, constraints);

      res.redirect("/");
    }
  },

  "table/(:tablename)/create": async (req, res) => {
    const tableName = req.params.tablename;
    if (req.method === "POST") {
      await db.createRecord(tableName, req.body);
    }
    res.redirect(`/table/${tableName}`);
  },

  "table/(:tablename)/edit": async (req, res) => {
    const tableName = req.params.tablename;
    if (req.method === "POST") {
      const query = req.body.query;
      delete req.body.query;
      const json = `{"${ query.replace(/=/g,'":"').replace(/&/g,',"')}"}`;
      const where = Object.entries(JSON.parse(json));
      await db.updateRecord(tableName, req.body, where);
    }
    res.redirect(`/table/${tableName}`);
  },

  "table/(:tablename)/delete": async (req, res) => {
    const tableName = req.params.tablename;
    await db.deleteRecord(tableName, Object.entries(req.query));
    res.redirect(`/table/${tableName}`);
  },

  "table/(:tablename)": async (req, res) => {
    const tableName = req.params.tablename;
    const schema = (await db.getTablesSchemas())[tableName];
    const pk = schema
      .filter((v) => v.pk !== 0)
      .map((v) => `${v.name}=%${v.name}%`)
      .join("&");
    const data = await db.getTableData(tableName);

    const query = URL.parse(req.url).query;

    let editRecord = false;
    const where = Object.entries(req.query);
    if (where.length) {
      editRecord = await db.getRecord(tableName, where);
    }

    data.forEach((row) => {
      Object.defineProperty(row, "where", {
        enumerable: false,
        value: pk.replace(/=%([^%]+)%/g, (a, b) => `=${row[b]}`),
      });
    });

    res.render("edit-table.html", {
      title: config.title,
      tableName,
      schema,
      data,
      editRecord,
      query,
    });
  },
};

module.exports = (app) => {
  env.express(app);
  const clearCache = (req, res, next) => {
    for (let i = 0; i < env.loaders.length; i += 1) {
      env.loaders[i].cache = {};
    }
    next();
  };

  Object.keys(routes).forEach((route) => {
    const routeFn = routes[route];
    route.split(`,`).forEach((route) => {
      app.get(`/${route}`, clearCache, routeFn);
      app.post(`/${route}`, clearCache, routeFn);
    });
  });
};

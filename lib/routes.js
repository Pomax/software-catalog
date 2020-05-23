const config = require("../config.json");
const nunjucks = require("nunjucks");
const path = require("path");
const URL = require("url");
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

  /**
   * Drop a table
   */
  drop: async (req, res) => {
    if (req.method === "POST") {
      const tableName = req.body.tablename;
      await db.dropTable(tableName);
    }
    res.redirect("/");
  },

  /**
   * Create a table
   *
   * - GET yields the build form page
   * - POST saves the build form data as new table
   */
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

  /**
   * Create a table record
   */
  "table/(:tablename)/create": async (req, res) => {
    const tableName = req.params.tablename;
    if (req.method === "POST") {
      const { more } = getQueryAndMethod(req.body);
      await db.createRecord(tableName, req.body);

      if (more) {
        req.session.carryover = copy(req.body);
      }
    }
    res.redirect(`/table/${tableName}`);
  },

  /**
   * Edit a table record
   */
  "table/(:tablename)/edit": async (req, res) => {
    const tableName = req.params.tablename;
    if (req.method === "POST") {
      const { query, save, more } = getQueryAndMethod(req.body);
      const json = `{"${query.replace(/=/g, '":"').replace(/&/g, ',"')}"}`;
      const where = Object.entries(JSON.parse(json));
      await db.updateRecord(tableName, req.body, where);

      if (more) {
        req.session.carryover = copy(req.body);
      }
    }
    res.redirect(`/table/${tableName}`);
  },

  /**
   * Delete a table record
   */
  "table/(:tablename)/delete": async (req, res) => {
    const tableName = req.params.tablename;
    await db.deleteRecord(tableName, Object.entries(req.query));
    res.redirect(`/table/${tableName}`);
  },

  /**
   * View a table, with a build form for new records.
   */
  "table/(:tablename)": async (req, res) => {
    const tableName = req.params.tablename;
    const schema = (await db.getTablesSchemas())[tableName];
    const query = URL.parse(req.url).query;

    let edit = false;
    let record = false;
    const where = Object.entries(req.query);
    if (where.length) {
      record = await db.getRecord(tableName, where);
      edit = true;
    } else {
      const carryOver = getFromSession(req, "carryover");
      if (carryOver) {
        const fullWhere = Object.entries(carryOver).filter((v) => !!v[1]);
        record = await db.getRecord(tableName, fullWhere);
      }
    }

    const data = await getSortedTableData(tableName, schema);

    res.render("edit-table.html", {
      title: config.title,
      tableName,
      schema,
      data,
      edit,
      record,
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

function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getFromSession(req, propname) {
  let v = req.session[propname];
  if (v) delete req.session[propname];
  return v;
}

function getQueryAndMethod(payload) {
  let result = {};
  ["query", "save", "more"].forEach((p) => {
    if (payload[p]) {
      result[p] = decodeURIComponent(payload[p]);
      delete payload[p];
    }
  });
  return result;
}

async function getSortedTableData(tableName, schema) {
  const data = await db.getTableData(tableName);
  const pk = schema
    .filter((v) => v.pk !== 0)
    .map((v) => `${v.name}=%${v.name}%`)
    .join("&");

  data.forEach((row) => {
    Object.defineProperty(row, "where", {
      enumerable: false,
      value: pk.replace(/=%([^%]+)%/g, (a, b) => `=${row[b]}`),
    });
  });

  ["nowrap", "ellipsed", "omit"].forEach(prop =>{
    Object.defineProperty(data, prop, {
      enumerable: false,
      value: (config[prop] && config[prop][tableName]) || []
    });
  });

  // We want to sort data, so we sort on primary key UNLESS
  // there is a field called "name" because if there is, that
  // should absolutely be the sorting field.
  let spk = "name";
  if (!schema.find((v) => v.name === spk)) {
    spk = schema.filter((v) => v.pk !== 0)[0].name;
  }

  data.sort((a, b) => {
    let input = [a, b];
    input.forEach((v, i) => {
      v = v[spk];
      input[i] = parseInt(v) == v ? parseInt(v) : v.toLowerCase();
    });
    if (input[0] < input[1]) return -1;
    return 1;
  });

  return data;
}

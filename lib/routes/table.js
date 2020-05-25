const URL = require("url");
const config = require("../../config.json");
const db = require("../db");

const TEMPLATE_FILTERS = [
  "autofocus",
  "ellipsed",
  "nowrap",
  "omit",
  "preselect",
  "secure",
  "urlform",
];

// transient storage mechanism
function getFromSession(req, propname) {
  let v = req.session[propname];
  if (v) delete req.session[propname];
  return v;
}

// get table data but filter it according to our config
async function getFilteredTableData(tableName, schema) {
  const order_by = config.defaultSort && config.defaultSort[tableName];
  const data = await db.getTableData(tableName, order_by);

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

  TEMPLATE_FILTERS.forEach((prop) => {
    Object.defineProperty(data, prop, {
      enumerable: false,
      value: (config[prop] && config[prop][tableName]) || [],
    });
  });

  return data;
}

module.exports = {
  /**
   * Serve a form for defining a new table schema, posting to the same route.
   */
  serveBuildForm: async (req, res) => {
    const tableName = req.query.tablename || req.params.tablename;
    res.render("create-table.html", {
      title: config.title,
      tableName,
    });
  },

  /**
   * Form a schema from the posted table creation form,
   * and send that off to the db handler to create the
   * corresponding sqlite table.
   */
  create: async (req, res) => {
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
  },

  /**
   * View a specific table, with UI for creating, editing,
   * and deleting table data.
   */
  view: async (req, res) => {
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

    const data = await getFilteredTableData(tableName, schema);

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

  /**
   * Drop a table. There is no recovering from this, so the
   * main page requires explicit actions to make this happen.
   */
  drop: async (req, res) => {
    const tableName = req.body.tablename;
    await db.dropTable(tableName);
    res.redirect("/");
  },
};

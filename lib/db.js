const sqlite3 = require("sqlite3");

let DBFILE = "default.sqlite3";
const c = process.argv.indexOf("-c");
if (c === -1) {
  console.error("missing: -c dbfilename");
  console.error("using default.sqlite3 as database");
} else {
  DBFILE = process.argv[c + 1];
}

function getColValues(data) {
  const cols = [],
    values = [];
  Object.entries(data).forEach((e) => {
    const [key, val] = e;
    if (!!val) {
      cols.push(key);
      values.push(`'${val.trim()}'`);
    }
  });
  return { cols, values };
}

/**
 *
 */
class Database {
  constructor(dbfile) {
    this.dbfile = dbfile;
    this.db = new sqlite3.Database(this.dbfile);
  }

  /**
   * safely close the database connection
   */
  close() {
    this.db.close();
  }

  /**
   *  query for a single (or first) result
   */
  async query(query) {
    return await new Promise((resolve) => {
      this.db.get(query, (err, row) => {
        resolve(row);
      });
    });
  }

  /**
   *  query for all results
   */
  async queryAll(query) {
    return await new Promise((resolve) => {
      this.db.all(query, (err, rows) => {
        resolve(rows);
      });
    });
  }

  /**
   * Get all table schemas
   */
  async getTablesSchemas() {
    const tables = await this.queryAll(
      `SELECT * FROM sqlite_master WHERE type='table' ORDER BY name`
    );

    return new Promise(async (resolve) => {
      const mapping = {};
      await Promise.all(
        tables.map(async (table) => {
          // First, ensure the key exists, so that the
          // key ordering obeys "order by name".
          mapping[table.name] = true;

          // Then, update it with awaitable data.
          mapping[table.name] = await this.queryAll(
            `PRAGMA table_info(${table.name})`
          );

          const meta = await this.query(
            `SELECT count(*) as count FROM ${table.name}`
          );
          mapping[table.name].count = meta.count;

          const fk = await this.queryAll(
            `PRAGMA foreign_key_list(${table.name})`
          );
          await Promise.all(
            fk.map(async (e) => {
              let field = mapping[table.name].find((d) => d.name === e.from);
              let values = await this.queryAll(
                `SELECT ${e.to} FROM ${e.table} ORDER BY ${e.to}`
              );
              field.fk = {
                table: e.table,
                to: e.to,
                values: values.map((v) => v[e.to]),
              };
            })
          );
        })
      );
      delete mapping.sqlite_sequence;
      resolve(mapping);
    });
  }

  /**
   * Create a table
   */
  async createTable(tableName, schema, constraints = []) {
    let columns = Object.entries(schema).map((e) => `${e[0]} ${e[1]}`);
    if (constraints.length > 0) {
      columns = `${columns}, ${constraints.join(", ")}`;
    }
    const create = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    return await this.db.run(create);
  }

  /**
   * Drop a table
   */
  async dropTable(tableName) {
    return await this.db.run(`DROP TABLE ${tableName}`);
  }

  /**
   *  Get all rows of data from this table
   */
  async getTableData(tableName, order_by = false) {
    const query = `
      SELECT * FROM ${tableName} ${order_by ? `ORDER BY ${order_by}` : ``}
    `;
    return await this.queryAll(query);
  }

  /**
   *  Get a specific rows of data from this table
   */
  async getRecord(tableName, where) {
    const query = `
      SELECT * FROM ${tableName} WHERE ${where
      .map((v) => `${v[0]} = '${v[1]}'`)
      .join(" AND ")}
    `;
    return await this.query(query);
  }

  /**
   *  Create a single record
   */
  async createRecord(tableName, data) {
    const { cols, values } = getColValues(data);
    return await this.db.run(`
      INSERT INTO ${tableName} (${cols.join(",")}) VALUES (${values.join(", ")})
    `);
  }

  /**
   * Update a record
   */
  async updateRecord(tableName, data, where) {
    const { cols, values } = getColValues(data);
    const update = `
      UPDATE ${tableName} SET
      ${cols
        .map((name, i) => {
          let val = values[i];
          return `${name}=${val}`;
        })
        .join(",")}
      WHERE ${where.map((v) => `${v[0]} = '${v[1]}'`).join(" AND ")}
    `;
    return await this.db.run(update);
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableName, where) {
    const del = `DELETE FROM ${tableName} WHERE ${where.map((v) => `${v[0]} = '${v[1]}'`).join(" AND ")}`
    console.log(del);
    return await this.db.run(del);
  }
}

const db = new Database(DBFILE);

module.exports = db;

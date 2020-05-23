const sqlite3 = require("sqlite3");

/**
 * Database class, offering table creation/viewing
 * with "C.R.U.D." operations for records.
 */
class Database {
  constructor(dbfile) {
    this.dbfile = dbfile;
    this.db = new sqlite3.Database(this.dbfile);
    // turn on foreign key constraint enforcement, https://www.sqlite.org/faq.html#q22
    this.run(`PRAGMA foreign_keys=ON`);
  }

  /**
   * safely close the database connection
   */
  close() {
    this.db.close();
  }

  /**
   * Run a non-selecting SQL query
   */
  async run(query) {
    return new Promise((resolve, reject) => {
      this.db.run(query, (err, result) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        else resolve(result);
      });
    });
  }

  /**
   *  query for a single (or first) result
   */
  async query(query) {
    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        else resolve(row);
      });
    });
  }

  /**
   *  query for all results
   */
  async queryAll(query) {
    return new Promise((resolve, reject) => {
      this.db.all(query, (err, rows) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        else resolve(rows);
      });
    });
  }

  /**
   * Get all table schemas
   */
  async getTablesSchemas() {
    const tableQuery = `SELECT * FROM sqlite_master WHERE type='table' ORDER BY name`;
    const tables = await this.queryAll(tableQuery);

    return new Promise(async (resolve) => {
      const mapping = {};
      await Promise.all(
        tables.map(async (table) => {
          // ensure we build keys before we start "await"ing, so that
          // the `mapping` object has the same key ordering as `tables`:
          mapping[table.name] = true;

          const tableInfoQuery = `PRAGMA table_info(${table.name})`;
          mapping[table.name] = await this.queryAll(tableInfoQuery);

          const metaQuery = `SELECT count(*) as count FROM ${table.name}`;
          const meta = await this.query(metaQuery);
          mapping[table.name].count = meta.count;

          const foreignKeyQuery = `PRAGMA foreign_key_list(${table.name})`;
          const foreignKeys = await this.queryAll(foreignKeyQuery);

          await Promise.all(
            foreignKeys.map(async (e) => {
              let field = mapping[table.name].find((d) => d.name === e.from);
              let fkQuery = `SELECT ${e.to} FROM ${e.table} ORDER BY ${e.to}`;
              let values = await this.queryAll(fkQuery);
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
    return this.run(create);
  }

  /**
   * Drop a table
   */
  async dropTable(tableName) {
    return this.run(`DROP TABLE ${tableName}`);
  }

  /**
   *  Get all rows of data from this table
   */
  async getTableData(tableName, order_by = false) {
    if (order_by) {
      order_by = `ORDER BY ${order_by}`;
    }
    const query = `SELECT * FROM ${tableName} ${order_by}`;
    return this.queryAll(query);
  }

  /**
   *  Get a specific rows of data from this table
   */
  async getRecord(tableName, where) {
    const query = `SELECT * FROM ${tableName} WHERE ${formWhereClause(where)}`;
    return this.query(query);
  }

  /**
   *  Create a single record
   */
  async createRecord(tableName, data) {
    const { cols, values } = getColValues(data);
    const colList = `(${cols.join(",")})`;
    const valList = `(${values.join(", ")})`;
    const insert = `INSERT INTO ${tableName} ${colList} VALUES ${valList}`;
    return this.run(insert);
  }

  /**
   * Update a record
   */
  async updateRecord(tableName, data, where) {
    const { cols, values } = getColValues(data);
    const update = `
      UPDATE ${tableName} SET
      ${formColumnAssignments(cols, values)}
      WHERE ${formWhereClause(where)}
    `;
    return this.run(update);
  }

  /**
   * Delete a record
   */
  async deleteRecord(tableName, where) {
    const del = `DELETE FROM ${tableName} WHERE ${formWhereClause(where)}`;
    return this.run(del);
  }
}

/**
 * Split up an object into parallel arrays
 * of property names and values, but crucially:
 * with key/value pairs with empty values removed.
 */
function getColValues(data) {
  const cols = [],
    values = [];
  Object.entries(data).forEach((e) => {
    const [key, val] = e;
    if (!!val) {
      cols.push(key);
      values.push(`'${val.trim().replace(/'/g, "''")}'`);
    }
  });
  return { cols, values };
}

/**
 * Create a "coname1=val1, colname2=val2, ..." list.
 */
function formColumnAssignments(cols, values) {
  return cols
    .map((name, i) => {
      let val = values[i];
      return `${name}=${val}`;
    })
    .join(",");
}

/**
 * Convert an Object.entries map into a SQL "where"
 * @param {*} where
 */
function formWhereClause(where) {
  return where.map((v) => `${v[0]} = '${v[1]}'`).join(" AND ");
}

// Figure out which database file we're using:
let DBFILE = "default.sqlite3";
const c = process.argv.indexOf("-c");
if (c === -1) {
  console.error("missing: -c dbfilename");
  console.error("using default.sqlite3 as database");
} else {
  DBFILE = process.argv[c + 1];
}

// We export a singleton instance of the above class,
// so that anything that `require`s this module will
// get a reference to the exact same db.
module.exports = new Database(DBFILE);

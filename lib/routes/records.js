const db = require("../db");

// object copy
function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// query helper function
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

module.exports = {
  /**
   * Insert new data into a table. If this was a
   * "save and next", we need to make sure that
   * the current information is preserved in the
   * table record form.
   */
  create: async (req, res) => {
    const tableName = req.params.tablename;
    const { more } = getQueryAndMethod(req.body);
    await db.createRecord(tableName, req.body);

    if (more) {
      req.session.carryover = copy(req.body);
    }
    res.redirect(`/table/${tableName}`);
  },

  /**
   * Edit a table record. Again, if the user
   * selected "save and next", make sure to
   * preserve this record's data when showing
   * the table record form.
   */
  edit: async (req, res) => {
    const tableName = req.params.tablename;
    const { query, save, more } = getQueryAndMethod(req.body);
    const json = `{"${query.replace(/=/g, '":"').replace(/&/g, ',"')}"}`;
    const where = Object.entries(JSON.parse(json));
    await db.updateRecord(tableName, req.body, where);

    if (more) {
      req.session.carryover = copy(req.body);
    }
    res.redirect(`/table/${tableName}`);
  },

  /**
   * Delete a table record. There is no recovering
   * from this, so the main page requires explicit
   * actions to make this happen.
   */
  delete: async (req, res) => {
    const tableName = req.params.tablename;
    await db.deleteRecord(tableName, Object.entries(req.query));
    res.redirect(`/table/${tableName}`);
  },
};

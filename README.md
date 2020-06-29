# Software Cataloger

I needed a simple bit of software cataloging software that didn't require a spreadsheet program for writing own which audio software I owned. Several years of [rekkerd](https://rekkerd.org/deals-deals-deals/) have left me with a horribly fragmented list of effects and instruments, and I just need to know what I own. However, in order to write something half-useful I had to make it generic enough to probably be useful to you, too.

- [How to run this](#how-to-run-this)
- [Configuration](#changing-config-json)
- [Screenshots](#screenshots)

## How to run this

This tool required Node.js, which you can install for Windows with [nvm-windows](https://github.com/coreybutler/nvm-windows#node-version-manager-nvm-for-windows) or with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) on basically every other OS.

### One-time steps

You should only have to do this once:

1. [clone this repo](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository).
1. copy `example.config.json` to `config.json`
1. prooooobably [change config.json](#changing-config-json).
1. `npm install`


### To run things

You should do this any time you want to "work" with your catalogue:

1. `npm start`

And that's kind of it

## Changing `config.json`

There's three part of the config: a title and server-port, a database bootstrap section that kicks in if no database exists yet, and a section that lets you specify things like default sorting for which tables, which field should automatically be focussed on when creating a new record for a table, etc.

### General settings

- `title` - this should be fairly obvious.
- `port`- the port that the server will use. Set to to `0` if you want "whatever port is free" as decided by your OS, or a real port number. The standard port is `80`, and common alternates are `8000` and `8080`. Another common port is `3000`, used by Node's `express` server package.

### `bootstrap` options

This section is highly recommended as it will create your database if it doesn't exist yet. Not that it is emphatically **not** used for viewing or editing your database: the bootstrap information is purely used to, unsurprisingly, bootstrap a new database. But it **is** a very good idea to make sure your bootstrap section reflects your actual database.

This section starts with a `path` key, which is the filename to use for your database.

#### tables

The `tables` section is an array of schema definitions for your database. Each schema takes the form:

```json
{
  "name": "YourTableName",
  "schema": {
    "fieldName1": "TYPE [PRIMARY KEY] [NOT NULL]",
    "fieldName2": "...",
    "..."
  },
  "constraints": [
    "FOREIGN KEY(fieldname) REFERENCES otherTable(itsFieldName) ON UPDATE CASCADE",
    "..."
  ]
}
```

Fields can use one of five types, but only four of those make sense: `TEXT`, `INTEGER`, `REAL`, and `BLOB`. The fifth one is `NULL`, and you should never use it. It serves no real-world purpose.

The `PRIMARY KEY` and `NOT NULL` qualifiers are optional, but you want at least one field marked as `PRIMARY KEY`.

The `constraints` section currently exists solely for you to specify foreign key constraints. Foreign key constraints allow the web interface to generate drop down selectors, which means there's nothing to typo.

#### Prepopulate

The `prepopulate` section is an object where each key references a table by name, with an array of records to insert when creating the table.

```json
{
  "tableName1": [
    {
      "fieldName1": "Your field's value goes here",
      "fieldName2": "etc."
    },
    {
      "..."
    },
    "..."
  ],
  "tableName2": "...",
  "..."
}
```

### Special functions

The last section is for specifying which tables and fields should receive special consideration, with the format being the same for all:

```json
  "functionName": {
    "tableName1": ["fieldName1", "fieldName2", "..."],
    "tableName2": ["..."],
    "..."
  }
```

#### `defaultSort`

This specifies which fields to use when sorting tables. Specifying multiple fields will sort on all those fields, in the specified order.

#### `nowrap`

This is used to specify which fields in which tables should not get text wrapping applied in the web interface.

#### `ellipsed`

This is used to specify which fields in which tables should get cut off with an ellipsis when their content runs for too long.

#### `omit`

This is used to "hide" table fields. This lets you do things like never show record `id` or password fields, etc.

#### `secure`

This is used to specify which fields in which tables should be shown as password-strings (e.g. asterisks instead of letters). The only way to see these values is in the edit view.

#### `urlform`

This is used to specify which fields in which tables are URLs, which will automatically turn their value into a hyperlink.

#### `autofocus`

This is used to specify which field in which tables should receive focus when creating/editing table records.

#### `preselect`

This is used to specify what the preselected option should be for a foreign key dropdown. This uses a slightly different format:

```json
  "preselect": {
    "tableName": {
      "fieldName1": "Value to preselect",
      "fieldName2": "...",
      "..."
    }
  },
```

### Running without a config file

You _can_, if you really want, forego the config file entirely. It'd be a bit silly, but if you _absolutely_ just want to start out empty, you most certainly can: the web interface lets you create tables and table records, so you could just start with nothing and take it from there. If you do, though, you can still specify the filename of your database using the `-c database` runtime option.


## Screenshots

Main overview/landing page:

![main view](https://user-images.githubusercontent.com/177243/85972699-8e745900-b985-11ea-8c91-660fe24b96f7.png)

Creating a new table:

![new table](https://user-images.githubusercontent.com/177243/85972787-bd8aca80-b985-11ea-9cef-82fe50851fa8.png)

Table overview:

![table view](https://user-images.githubusercontent.com/177243/85972735-9fbd6580-b985-11ea-9157-bed9f05221ee.png)

Creating/editing a table record:

![edit view](https://user-images.githubusercontent.com/177243/85972758-aba92780-b985-11ea-99c1-47a4a3d9e714.png)

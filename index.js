const config = require("./config.json");
const express = require("express");
const db = require("./lib/db");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(require("nocache")());
app.use(require("connect-slashes")(true));
app.use(require("express-session")({
  secret: 'as a local application, this value does not actually matter',
  resave: false,
  saveUninitialized: false
 }));

require("./lib/routes")(app);

const getRuntimeOption = require("./lib/get-runtime-option");
const PORT = getRuntimeOption("--port", "-p") || process.env.PORT || config.port || 0;
const open = require("open");
const server = app.listen(PORT, () => {
  const url = `http://localhost:${server.address().port}`;
  console.log(`server listening on ${url}`);
  if (process.argv.indexOf("-ns") === -1) open(url);

  app.post(`/shutdown`, (_req, res) => {
    console.log("shutting down.");
    res.send("Shutting down server, you can safely close this tab.");
    res.end();
    db.close();
    server.close();
  });
});

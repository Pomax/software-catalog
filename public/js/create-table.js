const columns = document.getElementById("columns");
const constraints = document.getElementById("constraints");

const fieldButton = document.getElementById("add-field");
fieldButton.addEventListener("click", addField);

const fieldTemplate = (fnum) => `
<td>
    <input type="text" name="fieldname-${fnum}" required>
</td>

<td>
  <select name="fieldtype-${fnum}">
    <option value="TEXT">TEXT</option>
    <option value="INTEGER">INTEGER</option>
    <option value="REAL">REAL</option>
    <option value="BLOB">BLOB</option>
    <option value="NULL">NULL</option>
  </select>
</td>

<td>
  <input type="checkbox" name="notnull-${fnum}">
</td>

<td>
  <input type="checkbox" name="pk-${fnum}">
</td>
`;

function addField() {
  let row = document.createElement("tr");
  row.innerHTML = fieldTemplate(columns.children.length);
  columns.appendChild(row);
}


const constraintButton = document.getElementById("add-constraint");
constraintButton.addEventListener("click", addConstraint);

const constraintTemplate = (fnum) => `
<td>
    <input type="text" name="constraint-${fnum}" required>
</td>
`;

function addConstraint() {
  let row = document.createElement("tr");
  row.innerHTML = constraintTemplate(constraints.children.length);
  constraints.appendChild(row);
}

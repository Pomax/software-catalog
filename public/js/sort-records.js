const table = document.querySelector(`#data-rows`);
const headings = table.querySelectorAll(`th`);

// Make table headings active elements: click to sort.
headings.forEach((th, i) => {
  th.style.cursor = "pointer";
  th.addEventListener("click", (evt) => {
    sortTable(table, i);
  });
});

/**
 * Sort table data by taking advantage of the fact that DOM nodes
 * have a unique parent, and so using `appendChild` will move them.
 */
function sortTable(table, colnum) {
  let rows = Array.from(table.querySelectorAll("tr")).filter((v) =>
    v.querySelector("td")
  );

  rows.sort((a, b) => {
    let input = [a, b];
    input.forEach((e, i) => {
      let v = e.children[colnum].textContent;
      v = parseInt(v) == v ? parseInt(v) : v.toLowerCase();
      input[i] = v;
    });
    if (input[0] < input[1]) return -1;
    if (input[1] < input[0]) return 1;
    return 0;
  });

  rows.forEach((r) => table.appendChild(r));
}

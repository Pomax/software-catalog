const table = document.querySelector(`#data-rows`);
const headings = table.querySelectorAll(`th`);

headings.forEach((th,i) => {
  th.addEventListener("click", evt => {
    sortTable(table, i);
  });
});


function sortTable(table, colnum) {
  let rows = Array.from(table.querySelectorAll('tr')).filter(v => v.querySelector('td'))
  rows.sort( (a,b) => {
    let input = [a, b];
    input.forEach((e,i) => {
      let v = e.children[colnum].textContent;
      v = (parseInt(v) == v) ? parseInt(v) : v.toLowerCase();
      input[i] = v;
    });
    if (input[0] < input[1]) return -1;
    if (input[1] < input[0]) return 1;
    return 0;
  });
  rows.forEach(r => table.appendChild(r));
};

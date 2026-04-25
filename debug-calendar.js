const month = new Date();
const year = month.getFullYear();
const m = month.getMonth();
const first = new Date(year, m, 1);
const startDay = first.getDay();
const daysInMonth = new Date(year, m + 1, 0).getDate();

const cells = [];
for (let i = 0; i < startDay; i++) cells.push(null);
for (let d = 1; d <= daysInMonth; d++) cells.push(d);
while (cells.length % 7 !== 0) cells.push(null);

console.log(cells);

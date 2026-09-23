import fs from 'fs';

const content = fs.readFileSync('f:/ghar_plot/backend/data/work-status.csv', 'utf8');

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

const rows = parseCSV(content);
console.log('Total parsed rows:', rows.length);
console.log('Header:', rows[0]);

const projects = new Set();
const clients = new Set();
const creators = new Set();
let withToday = 0;
let withTomorrow = 0;
let withDayAfter = 0;
let hasAnyContent = 0;
let emptyRows = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[1] && !r[2]) { emptyRows++; continue; }
  projects.add(r[1]);
  clients.add(r[2]);
  const today = (r[4] || '').trim();
  const tomorrow = (r[5] || '').trim();
  const dayAfter = (r[6] || '').trim();
  if (today) withToday++;
  if (tomorrow) withTomorrow++;
  if (dayAfter) withDayAfter++;
  if (today || tomorrow || dayAfter) hasAnyContent++;
  if (r[7] && r[7].trim()) creators.add(r[7].trim());
}

console.log('Unique Projects:', projects.size);
console.log('Unique Clients:', clients.size);
console.log('Projects list sample:', Array.from(projects).slice(0, 15));
console.log('Creators:', Array.from(creators));
console.log('Rows with Any Content (today/tomorrow/dayAfter):', hasAnyContent);
console.log('Rows with Today:', withToday, 'Tomorrow:', withTomorrow, 'DayAfter:', withDayAfter);
console.log('Empty rows (no project or client):', emptyRows);
console.log('Sample row 1:', rows[1]);
const withDataSample = rows.find((r, idx) => idx > 0 && ((r[4]||'').trim() || (r[5]||'').trim() || (r[6]||'').trim()));
console.log('Sample row with data:', withDataSample);

const keys = new Map();
let duplicateCount = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[1] && !r[2]) continue;
  const key = (r[1]||'').trim().toLowerCase() + '___' + (r[3]||'').trim();
  if (keys.has(key)) {
    duplicateCount++;
  } else {
    keys.set(key, i);
  }
}
console.log('Distinct (Project + Date):', keys.size, 'Duplicate (Project + Date):', duplicateCount);


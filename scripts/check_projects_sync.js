import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import Project from '../models/projectSchema.js';
import Client from '../models/clientSchema.js';

dotenv.config();

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
const csvProjects = new Map();
const csvClients = new Set();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[1] && !r[2]) continue;
  const p = (r[1]||'').trim();
  const c = (r[2]||'').trim();
  if (p) csvProjects.set(p, c);
  if (c) csvClients.add(c);
}

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  const dbProjects = await Project.find({}).lean();
  const dbClients = await Client.find({}).lean();
  
  const dbProjectNames = new Set(dbProjects.map(p => p.projectName.toLowerCase().trim()));
  const dbClientNames = new Set(dbClients.map(c => c.name.toLowerCase().trim()));
  
  const missingProjects = [];
  for (const [pName, cName] of csvProjects.entries()) {
    if (!dbProjectNames.has(pName.toLowerCase().trim())) {
      missingProjects.push({ project: pName, client: cName });
    }
  }
  
  const missingClients = [];
  for (const cName of csvClients) {
    if (!dbClientNames.has(cName.toLowerCase().trim())) {
      missingClients.push(cName);
    }
  }
  
  console.log('Total CSV Projects:', csvProjects.size, 'Missing in DB:', missingProjects.length);
  console.log('Missing Projects:', missingProjects);
  console.log('Total CSV Clients:', csvClients.size, 'Missing in DB:', missingClients.length);
  console.log('Missing Clients:', missingClients);
  process.exit(0);
});

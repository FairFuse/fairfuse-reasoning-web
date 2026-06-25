import { PALETTE } from './constants';
import type { Candidate } from './types';

export function generateGroupColors(labels: string[]): Record<string, string> {
  return Object.fromEntries(labels.map((label, i) => [label, PALETTE[i % PALETTE.length]]));
}

export function parseCsv(text: string): { candidates: Candidate[]; rankingCols: string[]; protectedAttr: string } {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

  const rankingCols = headers.filter((h) => h.startsWith('#'));
  let protectedCol = '';
  let nameCol = '';
  let idCol = '';

  headers.forEach((h) => {
    if (h.startsWith('*')) protectedCol = h;
    if (h === '_candidate_name') nameCol = h;
    if (h === '_candidate_id') idCol = h;
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line) {
      const fields: string[] = [];
      let inQuote = false;
      let cur = '';
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; } else if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; } else { cur += ch; }
      }
      fields.push(cur);

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = fields[idx] ?? ''; });
      rows.push(row);
    }
  }

  const colRankById: Record<string, Record<number, number>> = {};
  for (const col of rankingCols) {
    colRankById[col] = {};
    rows.forEach((row, idx) => {
      const candidateId = parseInt(row[col], 10);
      if (!Number.isNaN(candidateId)) colRankById[col][candidateId] = idx + 1;
    });
  }

  const candidates: Candidate[] = rows.map((row) => {
    const id = parseInt(row[idCol], 10);
    const rankings: Record<string, number> = {};
    for (const col of rankingCols) {
      rankings[col] = colRankById[col][id] ?? 9999;
    }
    return {
      id, name: row[nameCol], region: row[protectedCol], rankings,
    };
  });

  const protectedAttr = protectedCol
    ? protectedCol.slice(1).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Group';
  return { candidates, rankingCols, protectedAttr };
}

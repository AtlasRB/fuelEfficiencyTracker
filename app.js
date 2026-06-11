// ─── CONSTANTS ────────────────────────────────────────────────
const LITRES_PER_GALLON = 4.54609;

// ─── DATA LAYER ───────────────────────────────────────────────
function getData() {
  try { return JSON.parse(localStorage.getItem('fuellog_data') || '{"entries":[]}'); }
  catch { return { entries: [] }; }
}

function saveData(data) {
  localStorage.setItem('fuellog_data', JSON.stringify(data));
}

function addEntry(entry) {
  const data = getData();
  entry.id = Date.now() + Math.random();
  data.entries.push(entry);
  data.entries.sort((a, b) => a.date.localeCompare(b.date));
  saveData(data);
}

function deleteEntry(id) {
  const data = getData();
  data.entries = data.entries.filter(e => e.id !== id);
  saveData(data);
}

function updateEntry(id, changes) {
  const data = getData();
  const idx = data.entries.findIndex(e => e.id === id);
  if (idx === -1) return;
  data.entries[idx] = { ...data.entries[idx], ...changes };
  data.entries.sort((a, b) => a.date.localeCompare(b.date));
  saveData(data);
}

// ─── NAV ──────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const navMap = { 'dashboard': 0, 'log-trip': 1, 'log-fuel': 2, 'history': 3 };
  document.querySelectorAll('.nav-btn')[navMap[name]].classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'log-trip')  renderRecentTrips();
  if (name === 'log-fuel')  renderRecentFuel();
  if (name === 'history')   renderHistory();
}

// ─── TRIP LOGGING ─────────────────────────────────────────────
let tripType = 'day';

function setTripType(type) {
  tripType = type;
  document.getElementById('toggle-day').classList.toggle('active', type === 'day');
  document.getElementById('toggle-trip').classList.toggle('active', type === 'trip');
}

function logTrip() {
  const date  = document.getElementById('trip-date').value;
  const miles = Math.round(parseFloat(document.getElementById('trip-miles').value));
  const note  = document.getElementById('trip-note').value.trim();

  if (!date)           { showFeedback('trip', '⚠ Please select a date.', true); return; }
  if (!miles || miles <= 0) { showFeedback('trip', '⚠ Please enter valid miles.', true); return; }

  addEntry({ type: 'trip', subtype: tripType, date, miles, note });
  showFeedback('trip', `✓ Logged ${miles} miles on ${formatDate(date)}`);
  clearTripForm();
  renderRecentTrips();
}

function clearTripForm() {
  document.getElementById('trip-miles').value = '';
  document.getElementById('trip-note').value  = '';
  document.getElementById('trip-date').value  = todayStr();
}

// ─── FUEL LOGGING ─────────────────────────────────────────────
function calcFuelPPL(from) {
  const litres = parseFloat(document.getElementById('fuel-litres').value) || 0;
  const cost   = parseFloat(document.getElementById('fuel-cost').value)   || 0;
  const ppl    = parseFloat(document.getElementById('fuel-ppl').value)    || 0;

  if (from !== 'ppl' && litres > 0 && cost > 0) {
    document.getElementById('fuel-ppl').value = ((cost / litres) * 100).toFixed(1);
  }

  const l = litres || (cost > 0 && ppl > 0 ? (cost / ppl * 100) : 0);
  const c = cost   || (l    > 0 && ppl > 0 ? (l * ppl / 100)    : 0);

  document.getElementById('prev-gallons').textContent = l > 0 ? (l / LITRES_PER_GALLON).toFixed(2) + ' gal' : '—';
  document.getElementById('prev-ppg').textContent     = ppl > 0 ? '£' + ((ppl / 100) * LITRES_PER_GALLON).toFixed(2) : '—';
  document.getElementById('prev-cost').textContent    = c > 0 ? '£' + c.toFixed(2) : '—';
}

function logFuel() {
  const date   = document.getElementById('fuel-date').value;
  const litres = parseFloat(document.getElementById('fuel-litres').value);
  const cost   = parseFloat(document.getElementById('fuel-cost').value);
  const note   = document.getElementById('fuel-note').value.trim();

  if (!date)             { showFeedback('fuel', '⚠ Please select a date.', true); return; }
  if (!litres || litres <= 0) { showFeedback('fuel', '⚠ Please enter litres added.', true); return; }
  if (!cost   || cost   <= 0) { showFeedback('fuel', '⚠ Please enter the total cost.', true); return; }

  const ppl = (cost / litres) * 100;
  addEntry({ type: 'fuel', date, litres, cost, ppl, note });
  showFeedback('fuel', `✓ Logged ${litres.toFixed(1)}L (£${cost.toFixed(2)}) on ${formatDate(date)}`);
  clearFuelForm();
  renderRecentFuel();
}

function clearFuelForm() {
  document.getElementById('fuel-litres').value = '';
  document.getElementById('fuel-cost').value   = '';
  document.getElementById('fuel-ppl').value    = '';
  document.getElementById('fuel-note').value   = '';
  document.getElementById('prev-gallons').textContent = '—';
  document.getElementById('prev-ppg').textContent     = '—';
  document.getElementById('prev-cost').textContent    = '—';
  document.getElementById('fuel-date').value = todayStr();
}

// ─── FEEDBACK ─────────────────────────────────────────────────
function showFeedback(type, msg, isError = false) {
  const el = document.getElementById(type + '-feedback');
  el.textContent   = msg;
  el.style.display = 'block';
  el.style.background = isError ? 'var(--danger-dim)' : 'var(--accent-dim)';
  el.style.color      = isError ? 'var(--danger)'     : 'var(--accent-text)';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ─── RENDER RECENT TRIPS ──────────────────────────────────────
function renderRecentTrips() {
  const { entries } = getData();
  const trips = entries.filter(e => e.type === 'trip').slice().reverse().slice(0, 10);
  const el = document.getElementById('recent-trips-list');
  if (!trips.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🚗</div><h3>No trips yet</h3><p>Log your first trip above</p></div>';
    return;
  }
  el.innerHTML = `<div class="log-table-wrap"><table>
    <thead><tr><th>Date</th><th>Type</th><th>Miles</th><th>Note</th><th></th></tr></thead>
    <tbody>${trips.map(t => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td><span class="badge badge-trip">${t.subtype || 'day'}</span></td>
        <td>${Math.round(t.miles)}</td>
        <td style="font-family:'DM Sans',sans-serif;color:var(--muted2)">${t.note || '—'}</td>
        <td style="display:flex;gap:4px;">
          <button class="edit-btn" onclick="openEditModal(${t.id})" title="Edit">✎</button>
          <button class="delete-btn" onclick="deleteAndRefresh(${t.id},'trip')" title="Delete">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ─── RENDER RECENT FUEL ───────────────────────────────────────
function renderRecentFuel() {
  const { entries } = getData();
  const fuels = entries.filter(e => e.type === 'fuel').slice().reverse().slice(0, 10);
  const el = document.getElementById('recent-fuel-list');
  if (!fuels.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⛽</div><h3>No fill-ups yet</h3><p>Log your first top-up above</p></div>';
    return;
  }
  el.innerHTML = `<div class="log-table-wrap"><table>
    <thead><tr><th>Date</th><th>Litres</th><th>Gallons</th><th>Cost</th><th>p/litre</th><th>Note</th><th></th></tr></thead>
    <tbody>${fuels.map(f => `
      <tr>
        <td>${formatDate(f.date)}</td>
        <td>${f.litres.toFixed(2)}</td>
        <td>${(f.litres / LITRES_PER_GALLON).toFixed(2)}</td>
        <td>£${f.cost.toFixed(2)}</td>
        <td>${f.ppl.toFixed(1)}p</td>
        <td style="font-family:'DM Sans',sans-serif;color:var(--muted2)">${f.note || '—'}</td>
        <td style="display:flex;gap:4px;">
          <button class="edit-btn" onclick="openEditModal(${f.id})" title="Edit">✎</button>
          <button class="delete-btn" onclick="deleteAndRefresh(${f.id},'fuel')" title="Delete">✕</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function deleteAndRefresh(id, type) {
  deleteEntry(id);
  if (type === 'trip') renderRecentTrips();
  else renderRecentFuel();
}

// ─── HISTORY ──────────────────────────────────────────────────
let histFilter = 'all';

function setHistFilter(f) {
  histFilter = f;
  ['all', 'trips', 'fuel'].forEach(x => document.getElementById('hist-' + x).classList.remove('active'));
  document.getElementById('hist-' + f).classList.add('active');
  renderHistory();
}

function renderHistory() {
  const { entries } = getData();
  let filtered = [...entries].reverse();
  if (histFilter === 'trip') filtered = filtered.filter(e => e.type === 'trip');
  if (histFilter === 'fuel') filtered = filtered.filter(e => e.type === 'fuel');

  document.getElementById('history-count').textContent = `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`;

  const el = document.getElementById('history-table-wrap');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📁</div><h3>Nothing logged yet</h3><p>Start adding trips and fill-ups</p></div>';
    return;
  }

  el.innerHTML = `<table>
    <thead><tr><th>Date</th><th>Type</th><th>Detail</th><th>Cost</th><th>Note</th><th></th></tr></thead>
    <tbody>${filtered.map(e => {
      if (e.type === 'trip') {
        return `<tr>
          <td>${formatDate(e.date)}</td>
          <td><span class="badge badge-trip">${e.subtype || 'trip'}</span></td>
          <td>${Math.round(e.miles)} miles</td>
          <td style="color:var(--muted)">—</td>
          <td style="font-family:'DM Sans',sans-serif;color:var(--muted2)">${e.note || '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="edit-btn" onclick="openEditModal(${e.id})" title="Edit">✎</button>
            <button class="delete-btn" onclick="deleteAndRenderHistory(${e.id})" title="Delete">✕</button>
          </td>
        </tr>`;
      } else {
        return `<tr>
          <td>${formatDate(e.date)}</td>
          <td><span class="badge badge-fuel">fuel</span></td>
          <td>${e.litres.toFixed(2)}L / ${(e.litres / LITRES_PER_GALLON).toFixed(2)}gal</td>
          <td>£${e.cost.toFixed(2)}</td>
          <td style="font-family:'DM Sans',sans-serif;color:var(--muted2)">${e.note || '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="edit-btn" onclick="openEditModal(${e.id})" title="Edit">✎</button>
            <button class="delete-btn" onclick="deleteAndRenderHistory(${e.id})" title="Delete">✕</button>
          </td>
        </tr>`;
      }
    }).join('')}
    </tbody>
  </table>`;
}

function deleteAndRenderHistory(id) {
  deleteEntry(id);
  renderHistory();
}

// ─── EDIT MODAL ───────────────────────────────────────────────
function openEditModal(id) {
  const { entries } = getData();
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  document.getElementById('edit-entry-id').value = id;

  if (entry.type === 'trip') {
    document.getElementById('edit-trip-fields').style.display = 'block';
    document.getElementById('edit-fuel-fields').style.display = 'none';
    document.getElementById('edit-modal-title').textContent   = 'Edit trip';
    document.getElementById('edit-trip-date').value    = entry.date;
    document.getElementById('edit-trip-miles').value   = entry.miles;
    document.getElementById('edit-trip-subtype').value = entry.subtype || 'day';
    document.getElementById('edit-trip-note').value    = entry.note || '';
  } else {
    document.getElementById('edit-trip-fields').style.display = 'none';
    document.getElementById('edit-fuel-fields').style.display = 'block';
    document.getElementById('edit-modal-title').textContent   = 'Edit fill-up';
    document.getElementById('edit-fuel-date').value   = entry.date;
    document.getElementById('edit-fuel-litres').value = entry.litres;
    document.getElementById('edit-fuel-cost').value   = entry.cost;
    document.getElementById('edit-fuel-note').value   = entry.note || '';
  }

  document.getElementById('edit-modal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

function saveEdit() {
  const id    = parseFloat(document.getElementById('edit-entry-id').value);
  const { entries } = getData();
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  if (entry.type === 'trip') {
    const date  = document.getElementById('edit-trip-date').value;
    const miles = Math.round(parseFloat(document.getElementById('edit-trip-miles').value));
    const subtype = document.getElementById('edit-trip-subtype').value;
    const note  = document.getElementById('edit-trip-note').value.trim();
    if (!date)           { alert('Please select a date.');      return; }
    if (!miles || miles <= 0) { alert('Please enter valid miles.'); return; }
    updateEntry(id, { date, miles, subtype, note });
  } else {
    const date   = document.getElementById('edit-fuel-date').value;
    const litres = parseFloat(document.getElementById('edit-fuel-litres').value);
    const cost   = parseFloat(document.getElementById('edit-fuel-cost').value);
    const note   = document.getElementById('edit-fuel-note').value.trim();
    if (!date)             { alert('Please select a date.');          return; }
    if (!litres || litres <= 0) { alert('Please enter valid litres.'); return; }
    if (!cost   || cost   <= 0) { alert('Please enter valid cost.');   return; }
    const ppl = (cost / litres) * 100;
    updateEntry(id, { date, litres, cost, ppl, note });
  }

  closeEditModal();
  renderRecentTrips();
  renderRecentFuel();
  renderHistory();
  renderDashboard();
}

// ─── EXPORT CSV ───────────────────────────────────────────────
function exportCSV() {
  const { entries } = getData();
  if (!entries.length) { alert('No data to export.'); return; }
  const header = 'Date,Type,Subtype,Miles,Litres,Gallons,Cost_GBP,Price_per_litre_p,Note';
  const rows = entries.map(e => {
    if (e.type === 'trip') {
      return `${e.date},trip,${e.subtype || 'day'},${e.miles},,,,,"${(e.note || '').replace(/"/g, '""')}"`;
    }
    return `${e.date},fuel,,, ${e.litres},${(e.litres / LITRES_PER_GALLON).toFixed(3)},${e.cost},${e.ppl.toFixed(1)},"${(e.note || '').replace(/"/g, '""')}"`;
  });
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fuellog_export_${todayStr()}.csv`;
  a.click();
}

// ─── IMPORT CSV ───────────────────────────────────────────────
let parsedImportRows = [];

function openImportModal() {
  parsedImportRows = [];
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-preview').textContent   = '';
  document.getElementById('csv-file-input').value = '';
  document.getElementById('import-modal').classList.add('open');
}

function closeImportModal() {
  document.getElementById('import-modal').classList.remove('open');
  parsedImportRows = [];
}

function handleImportFile(e) {
  const file = e.target.files[0] || (e.dataTransfer && e.dataTransfer.files[0]);
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => parseImportCSV(ev.target.result);
  reader.readAsText(file);
}

function parseImportCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) { alert('CSV appears to be empty or invalid.'); return; }

  // Accept both the current export format and a simplified format
  const header = lines[0].toLowerCase();
  const isOurFormat = header.includes('date') && header.includes('type');
  if (!isOurFormat) { alert('Unrecognised CSV format. Please use a file exported from FuelLog.'); return; }

  parsedImportRows = [];
  let trips = 0, fuels = 0, skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const date    = (cols[0] || '').trim();
    const type    = (cols[1] || '').trim().toLowerCase();
    const subtype = (cols[2] || 'day').trim();

    if (!date || !type) { skipped++; continue; }

    if (type === 'trip') {
      const miles = parseFloat(cols[3]);
      if (!miles || miles <= 0) { skipped++; continue; }
      const note = (cols[8] || '').replace(/^"|"$/g, '').trim();
      parsedImportRows.push({ type: 'trip', subtype: subtype || 'day', date, miles, note, id: Date.now() + Math.random() + i });
      trips++;
    } else if (type === 'fuel') {
      const litres = parseFloat(cols[4]);
      const cost   = parseFloat(cols[6]);
      if (!litres || litres <= 0 || !cost || cost <= 0) { skipped++; continue; }
      const ppl  = (cost / litres) * 100;
      const note = (cols[8] || '').replace(/^"|"$/g, '').trim();
      parsedImportRows.push({ type: 'fuel', date, litres, cost, ppl, note, id: Date.now() + Math.random() + i });
      fuels++;
    } else {
      skipped++;
    }
  }

  const prev = document.getElementById('import-preview');
  prev.style.display = 'block';
  prev.textContent = `Found: ${trips} trip${trips !== 1 ? 's' : ''}, ${fuels} fill-up${fuels !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} rows skipped)` : ''}`;
}

// Handles quoted fields with commas inside them
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function doImport(mode) {
  // mode: 'merge' or 'replace'
  if (!parsedImportRows.length) {
    alert('No valid rows to import. Please select a CSV file first.');
    return;
  }

  if (mode === 'replace') {
    if (!confirm(`This will DELETE all existing data and replace it with ${parsedImportRows.length} imported entries. Are you sure?`)) return;
    saveData({ entries: parsedImportRows.sort((a, b) => a.date.localeCompare(b.date)) });
  } else {
    // Merge: combine and deduplicate
    const existing = getData().entries;

    // Build a fingerprint for existing entries to detect duplicates
    const fingerprint = entry => `${entry.type}|${entry.date}|${entry.type === 'trip' ? entry.miles : entry.litres + '|' + entry.cost}`;
    const existingPrints = new Set(existing.map(fingerprint));

    let added = 0;
    for (const row of parsedImportRows) {
      if (!existingPrints.has(fingerprint(row))) {
        existing.push(row);
        added++;
      }
    }

    const skippedDups = parsedImportRows.length - added;
    existing.sort((a, b) => a.date.localeCompare(b.date));
    saveData({ entries: existing });

    closeImportModal();
    renderHistory();
    renderDashboard();

    const msg = skippedDups > 0
      ? `✓ Imported ${added} new entries. ${skippedDups} duplicate${skippedDups !== 1 ? 's' : ''} skipped.`
      : `✓ Imported ${added} new entries.`;
    showHistoryFeedback(msg);
    return;
  }

  closeImportModal();
  renderHistory();
  renderDashboard();
  showHistoryFeedback(`✓ Import complete — ${parsedImportRows.length} entries loaded.`);
}

function showHistoryFeedback(msg, isError = false) {
  const el = document.getElementById('history-feedback');
  el.textContent   = msg;
  el.style.display = 'block';
  el.style.background = isError ? 'var(--danger-dim)' : 'var(--accent-dim)';
  el.style.color      = isError ? 'var(--danger)'     : 'var(--accent-text)';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// Drag-and-drop on the import drop zone
function setupDropZone() {
  const zone = document.getElementById('import-drop-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => parseImportCSV(ev.target.result);
      reader.readAsText(file);
    }
  });
  zone.addEventListener('click', () => document.getElementById('csv-file-input').click());
}

// ─── CLEAR ALL ────────────────────────────────────────────────
function clearAllData() {
  if (!confirm('Delete ALL entries? This cannot be undone.')) return;
  saveData({ entries: [] });
  renderHistory();
  renderDashboard();
}

// ─── DASHBOARD STATS ──────────────────────────────────────────
let costChart = null, effChart = null, usageChart = null;

function getFilteredEntries() {
  const { entries } = getData();
  const period = document.getElementById('period-select').value;
  if (period === 'all') return entries;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(period));
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

function renderDashboard() {
  const entries = getFilteredEntries();
  const trips   = entries.filter(e => e.type === 'trip');
  const fuels   = entries.filter(e => e.type === 'fuel');

  const totalMiles   = trips.reduce((s, e) => s + e.miles,  0);
  const totalLitres  = fuels.reduce((s, e) => s + e.litres, 0);
  const totalCost    = fuels.reduce((s, e) => s + e.cost,   0);
  const totalGallons = totalLitres / LITRES_PER_GALLON;

  const mpl  = totalLitres > 0 && totalMiles > 0 ? totalMiles / totalLitres : null;
  const mpg  = mpl ? mpl * LITRES_PER_GALLON : null;
  const l100 = totalMiles > 0 && totalLitres > 0 ? (totalLitres / (totalMiles * 1.60934)) * 100 : null;
  const cpm  = totalMiles > 0 && totalCost   > 0 ? (totalCost / totalMiles * 100) : null;
  const avgPPL = fuels.length > 0 ? fuels.reduce((s, e) => s + e.ppl, 0) / fuels.length : null;
  const avgPPG = avgPPL ? avgPPL / 100 * LITRES_PER_GALLON : null;

  const fmt = (v, dec = 1) => v !== null ? v.toFixed(dec) : '—';

  document.getElementById('stat-miles').textContent   = totalMiles   > 0 ? Math.round(totalMiles).toString() : '—';
  document.getElementById('stat-litres').textContent  = totalLitres  > 0 ? totalLitres.toFixed(2)  : '—';
  document.getElementById('stat-cost').textContent    = totalCost    > 0 ? '£' + totalCost.toFixed(2) : '—';
  document.getElementById('stat-cpm').textContent     = cpm   ? cpm.toFixed(1) + 'p'   : '—';
  document.getElementById('stat-gallons').textContent = totalGallons > 0 ? totalGallons.toFixed(2) + ' gal' : '—';

  document.getElementById('eff-mpl').textContent  = fmt(mpl)  + (mpl  ? ' mi/L'    : '');
  document.getElementById('eff-mpg').textContent  = fmt(mpg)  + (mpg  ? ' mpg'     : '');
  document.getElementById('eff-l100').textContent = fmt(l100) + (l100 ? ' L/100km' : '');

  document.getElementById('avg-ppl').textContent     = avgPPL ? avgPPL.toFixed(1) + 'p/L' : '—';
  document.getElementById('avg-ppg').textContent     = avgPPG ? '£' + avgPPG.toFixed(2) + '/gal' : '—';
  document.getElementById('avg-per100').textContent  = cpm    ? '£' + (cpm / 100 * 100).toFixed(2) : '—';
  document.getElementById('fuel-count').textContent  = fuels.length;
  document.getElementById('trip-count').textContent  = trips.length;

  if (mpg) {
    document.getElementById('eff-bar-mpg').style.width = Math.min(100, (mpg / 60) * 100) + '%';
    document.getElementById('eff-bar-mpl').style.width = Math.min(100, (mpl / 15) * 100) + '%';
  }

  if (entries.length > 0) {
    const dates = entries.map(e => e.date).sort();
    document.getElementById('date-range-label').textContent = `${formatDate(dates[0])} → ${formatDate(dates[dates.length - 1])}`;
  } else {
    document.getElementById('date-range-label').textContent = 'No entries in this period';
  }

  document.getElementById('no-data-msg').style.display = fuels.length > 0 ? 'none' : 'block';
  renderCharts(fuels, trips);
}

function renderCharts(fuels, trips) {
  const sorted      = [...fuels].sort((a, b) => a.date.localeCompare(b.date));
  const costLabels  = sorted.map(f => formatDate(f.date));
  const costData    = sorted.map(f => parseFloat(f.cost.toFixed(2)));
  const pplData     = sorted.map(f => parseFloat(f.ppl.toFixed(1)));

  // Daily fuel usage — sum litres per calendar day across all trip dates
  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

  // Use trip entries (miles driven) as the usage signal, grouped by day of week
  trips.forEach(t => {
    const dow = dayOrder[new Date(t.date + 'T12:00:00').getDay()];
    dayTotals[dow] += t.miles;
    dayCounts[dow]++;
  });

  const usageLabels = dayOrder;
  const usageData   = dayOrder.map(d => dayCounts[d] > 0 ? Math.round(dayTotals[d] / dayCounts[d]) : 0);

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#2c2840' }, ticks: { color: '#6b6680', font: { family: 'DM Mono', size: 11 } } },
      y: { grid: { color: '#2c2840' }, ticks: { color: '#6b6680', font: { family: 'DM Mono', size: 11 } } }
    }
  };

  if (costChart)   costChart.destroy();
  if (effChart)    effChart.destroy();
  if (usageChart)  usageChart.destroy();

  const c1 = document.getElementById('cost-chart').getContext('2d');
  costChart = new Chart(c1, {
    type: 'bar',
    data: {
      labels: costLabels,
      datasets: [{ data: costData, backgroundColor: '#6B5BFF44', borderColor: '#8b7fff', borderWidth: 1.5, borderRadius: 4 }]
    },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: ctx => '£' + ctx.raw } } } }
  });

  const c2 = document.getElementById('eff-chart').getContext('2d');
  effChart = new Chart(c2, {
    type: 'line',
    data: {
      labels: costLabels,
      datasets: [{
        data: pplData,
        borderColor: '#60a5fa',
        backgroundColor: '#3b82f615',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#60a5fa',
        tension: 0.35,
        fill: true
      }]
    },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: ctx => ctx.raw + 'p/L' } } } }
  });

  const c3 = document.getElementById('usage-chart').getContext('2d');
  usageChart = new Chart(c3, {
    type: 'bar',
    data: {
      labels: usageLabels,
      datasets: [{
        data: usageData,
        backgroundColor: '#fbbf2444',
        borderColor: '#fbbf24',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      ...chartDefaults,
      plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: ctx => 'Avg ' + ctx.raw + ' miles' } } },
      scales: {
        ...chartDefaults.scales,
        y: { ...chartDefaults.scales.y, title: { display: true, text: 'Avg miles', color: '#6b6680', font: { family: 'DM Mono', size: 11 } } }
      }
    }
  });
}

// ─── UTILS ────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('trip-date').value = todayStr();
  document.getElementById('fuel-date').value = todayStr();
  document.getElementById('fuel-litres').addEventListener('input', () => calcFuelPPL('litres'));
  document.getElementById('fuel-cost').addEventListener('input',   () => calcFuelPPL('cost'));
  document.getElementById('fuel-ppl').addEventListener('input',    () => calcFuelPPL('ppl'));
  setupDropZone();
  renderDashboard();
});

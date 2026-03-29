const CATEGORIES = [
  { id: 'food',          label: 'Food & Dining',    color: '#FF6B6B' },
  { id: 'transport',     label: 'Transport',        color: '#FFA94D' },
  { id: 'housing',       label: 'Housing',          color: '#51CF66' },
  { id: 'utilities',     label: 'Utilities',        color: '#339AF0' },
  { id: 'entertainment', label: 'Entertainment',    color: '#CC5DE8' },
  { id: 'shopping',      label: 'Shopping',         color: '#F06595' },
  { id: 'health',        label: 'Health',           color: '#20C997' },
  { id: 'education',     label: 'Education',        color: '#748FFC' },
  { id: 'other',         label: 'Other',            color: '#ADB5BD' }
];

const App = (() => {
  // State
  let editingId = null;
  let entryType = 'expense';
  let selectedCategory = null;
  let analysisPeriod = 'month';
  let listFilter = { type: 'all', start: '', end: '' };

  // Helpers
  const $ = id => document.getElementById(id);
  const fmt = cents =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const today = () => new Date().toISOString().slice(0, 10);

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('visible'), 2200);
  }

  // ── Tabs ────────────────────────────────────────────────────────────────────
  function showTab(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    $('view-' + name).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');
    if (name === 'list')     loadList();
    if (name === 'analysis') loadAnalysis();
  }

  // ── Add / Edit form ─────────────────────────────────────────────────────────
  function setEntryType(type) {
    entryType = type;
    document.querySelectorAll('.toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.type === type));
    $('expense-fields').style.display  = type === 'expense'    ? '' : 'none';
    $('investment-fields').style.display = type === 'investment' ? '' : 'none';
    updateSubmitLabel();
  }

  function updateSubmitLabel() {
    const editing = editingId !== null;
    $('submit-btn').textContent = editing
      ? (entryType === 'expense' ? 'Update Expense' : 'Update Investment')
      : (entryType === 'expense' ? 'Add Expense'    : 'Add Investment');
  }

  function buildCategoryChips() {
    const container = $('category-chips');
    container.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.dataset.id = cat.id;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => selectCategory(cat.id));
      container.appendChild(btn);
    });
  }

  function selectCategory(id) {
    selectedCategory = id;
    document.querySelectorAll('#category-chips .chip').forEach(c =>
      c.classList.toggle('selected', c.dataset.id === id));
  }

  function resetForm() {
    $('entry-form').reset();
    $('entry-date').value = today();
    selectedCategory = null;
    document.querySelectorAll('#category-chips .chip').forEach(c => c.classList.remove('selected'));
    editingId = null;
    $('cancel-btn').style.display = 'none';
    updateSubmitLabel();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const amountRaw = parseFloat($('amount-input').value);
    if (!amountRaw || amountRaw <= 0) { showToast('Enter a valid amount'); return; }
    const amount = Math.round(amountRaw * 100);
    const date = $('entry-date').value || today();

    let category, description;
    if (entryType === 'expense') {
      if (!selectedCategory) { showToast('Select a category'); return; }
      category = selectedCategory;
      description = $('expense-description').value.trim();
    } else {
      category = $('investment-name').value.trim();
      if (!category) { showToast('Enter an investment name'); return; }
      description = $('investment-note').value.trim();
    }

    const entry = { type: entryType, amount, category, date, description };

    if (editingId !== null) {
      await DB.updateEntry(editingId, entry);
      showToast('Entry updated');
    } else {
      await DB.addEntry(entry);
      showToast(entryType === 'expense' ? 'Expense added' : 'Investment recorded');
    }

    resetForm();
    loadRecentEntries();
  }

  function populateFormForEdit(entry) {
    editingId = entry.id;
    setEntryType(entry.type);
    $('amount-input').value = (entry.amount / 100).toFixed(2);
    $('entry-date').value = entry.date;
    if (entry.type === 'expense') {
      selectCategory(entry.category);
      $('expense-description').value = entry.description || '';
    } else {
      $('investment-name').value = entry.category;
      $('investment-note').value = entry.description || '';
    }
    $('cancel-btn').style.display = '';
    updateSubmitLabel();
    showTab('add');
    window.scrollTo(0, 0);
  }

  async function loadRecentEntries() {
    const all = await DB.getAllEntries();
    const recent = all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
    const container = $('recent-list');
    container.innerHTML = recent.length ? recent.map(renderCard).join('') : '<p class="empty-recent">No entries yet</p>';
    attachCardListeners(container);
  }

  // ── List view ───────────────────────────────────────────────────────────────
  async function loadList() {
    const { type, start, end } = listFilter;
    let entries;
    if (type !== 'all' && start && end)   entries = await DB.getEntriesByTypeAndDateRange(type, start, end);
    else if (type !== 'all')              entries = await DB.getEntriesByType(type);
    else if (start && end)                entries = await DB.getEntriesByDateRange(start, end);
    else                                  entries = await DB.getAllEntries();

    entries.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    const list = $('entry-list');
    const empty = $('list-empty');
    const totalEl = $('list-total');

    if (!entries.length) {
      list.innerHTML = '';
      empty.style.display = '';
      totalEl.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = entries.map(renderCard).join('');
    attachCardListeners(list);

    const total = entries.reduce((s, e) => s + e.amount, 0);
    totalEl.style.display = '';
    totalEl.innerHTML = `<span>${entries.length} entries</span><span>${fmt(total)}</span>`;
  }

  function renderCard(entry) {
    const cat = CATEGORIES.find(c => c.id === entry.category);
    const color = entry.type === 'expense' ? (cat ? cat.color : '#ADB5BD') : '#34C759';
    const label = entry.type === 'expense' ? (cat ? cat.label : entry.category) : entry.category;
    const title = entry.description || label;
    const amtClass = entry.type === 'investment' ? 'investment' : 'expense';
    return `
      <div class="entry-card" data-id="${entry.id}">
        <div class="entry-dot" style="background:${color}"></div>
        <div class="entry-info">
          <div class="entry-title">${escHtml(title)}</div>
          <div class="entry-meta">${escHtml(label)} · ${entry.date}</div>
        </div>
        <div class="entry-right">
          <div class="entry-amount ${amtClass}">${fmt(entry.amount)}</div>
          <div class="entry-actions">
            <button class="icon-btn edit-btn" data-id="${entry.id}" title="Edit">${ICONS.edit}</button>
            <button class="icon-btn delete-btn" data-id="${entry.id}" title="Delete">${ICONS.trash}</button>
          </div>
        </div>
      </div>`;
  }

  function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function attachCardListeners(container) {
    container.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        const all = await DB.getAllEntries();
        const entry = all.find(e => e.id === Number(btn.dataset.id));
        if (entry) populateFormForEdit(entry);
      }));
    container.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this entry?')) return;
        await DB.deleteEntry(Number(btn.dataset.id));
        showToast('Entry deleted');
        loadList();
        loadRecentEntries();
      }));
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────
  function getDateRange(period) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (period === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 6);
      return { start: fmt(start), end: fmt(now) };
    }
    if (period === 'month') {
      return { start: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, end: fmt(now) };
    }
    return { start: `${now.getFullYear()}-01-01`, end: fmt(now) };
  }

  function getTrendLabels(period, start, end) {
    const labels = [], expMap = {}, invMap = {};
    const s = new Date(start), e = new Date(end);
    if (period === 'week') {
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        labels.push(k.slice(5)); expMap[k] = 0; invMap[k] = 0;
      }
    } else if (period === 'month') {
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        labels.push(k.slice(8)); expMap[k] = 0; invMap[k] = 0;
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const y = s.getFullYear();
        const k = `${y}-${String(m+1).padStart(2,'0')}`;
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        labels.push(monthNames[m]); expMap[k] = 0; invMap[k] = 0;
      }
    }
    return { labels, expMap, invMap };
  }

  async function loadAnalysis() {
    const { start, end } = getDateRange(analysisPeriod);
    const entries = await DB.getEntriesByDateRange(start, end);

    const expenses = entries.filter(e => e.type === 'expense');
    const investments = entries.filter(e => e.type === 'investment');

    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const totalInv = investments.reduce((s, e) => s + e.amount, 0);
    const total = totalExp + totalInv;

    $('total-outflow').textContent = fmt(total);
    $('expense-total-label').textContent = fmt(totalExp);
    $('investment-total-label').textContent = fmt(totalInv);

    const periodLabels = { week: 'This week', month: 'This month', year: 'This year' };
    $('total-period-label').textContent = periodLabels[analysisPeriod];

    // Category doughnut
    const catMap = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const catLabels = [], catData = [], catColors = [];
    CATEGORIES.forEach(c => {
      if (catMap[c.id]) { catLabels.push(c.label); catData.push(catMap[c.id]); catColors.push(c.color); }
    });
    Charts.updateCategoryChart(catLabels, catData, catColors);

    // Investment bar
    const invMap2 = {};
    investments.forEach(e => { invMap2[e.category] = (invMap2[e.category] || 0) + e.amount; });
    const invLabels = Object.keys(invMap2);
    const invData = invLabels.map(k => invMap2[k]);
    Charts.updateInvestmentChart(invLabels, invData);

    // Trend
    const { labels, expMap, invMap } = getTrendLabels(analysisPeriod, start, end);
    expenses.forEach(e => {
      const k = analysisPeriod === 'year' ? e.date.slice(0, 7) : e.date;
      if (k in expMap) expMap[k] += e.amount;
    });
    investments.forEach(e => {
      const k = analysisPeriod === 'year' ? e.date.slice(0, 7) : e.date;
      if (k in invMap) invMap[k] += e.amount;
    });
    Charts.updateTrendChart(labels, Object.values(expMap), Object.values(invMap));
  }

  // ── CSV Export ───────────────────────────────────────────────────────────────
  async function exportCSV() {
    const entries = await DB.getAllEntries();
    if (!entries.length) { showToast('No data to export'); return; }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const rows = ['Type,Date,Category,Amount,Description'];
    entries.forEach(e => {
      const amt = (e.amount / 100).toFixed(2);
      const desc = `"${(e.description || '').replace(/"/g, '""')}"`;
      rows.push(`${e.type},${e.date},${e.category},${amt},${desc}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${entries.length} entries`);
  }

  // ── CSV Import ───────────────────────────────────────────────────────────────
  function parseCSVLine(line) {
    const fields = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur); cur = '';
      } else { cur += ch; }
    }
    fields.push(cur);
    return fields;
  }

  async function importCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) { showToast('Empty file'); return; }

    let start = 0;
    if (lines[0].toLowerCase().replace(/\s/g,'').startsWith('type,date')) start = 1;

    const entries = [];
    const errors = [];
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = parseCSVLine(line);
      if (fields.length < 4) { errors.push(`Row ${i+1}: too few fields`); continue; }
      const [type, date, category, amountStr, ...rest] = fields;
      const description = rest.join(',');
      if (!['expense','investment'].includes(type.toLowerCase())) { errors.push(`Row ${i+1}: unknown type`); continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { errors.push(`Row ${i+1}: bad date`); continue; }
      const amount = Math.round(parseFloat(amountStr) * 100);
      if (isNaN(amount) || amount <= 0) { errors.push(`Row ${i+1}: bad amount`); continue; }
      entries.push({ type: type.toLowerCase(), date, category: category.trim(), amount, description: description.trim() });
    }

    if (!entries.length) { showToast(errors.length ? `Import failed: ${errors[0]}` : 'No valid rows'); return; }

    const { added, skipped } = await DB.bulkAdd(entries);
    showToast(`Imported ${added}${skipped ? `, ${skipped} skipped (duplicates)` : ''}`);
    if (errors.length) console.warn('Import errors:', errors);
    loadList();
    loadRecentEntries();
  }

  // ── iOS install banner ───────────────────────────────────────────────────────
  function showIOSBanner() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('install-tip-dismissed');
    if (isIOS && !isStandalone && !dismissed) {
      $('ios-install-tip').style.display = '';
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    await DB.init();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    buildCategoryChips();
    $('entry-date').value = today();
    setEntryType('expense');
    showIOSBanner();
    loadRecentEntries();
    showTab('add');

    // Tab bar
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', () => showTab(btn.dataset.tab)));

    // Type toggle
    document.querySelectorAll('.toggle-btn').forEach(btn =>
      btn.addEventListener('click', () => setEntryType(btn.dataset.type)));

    // Form submit
    $('entry-form').addEventListener('submit', handleFormSubmit);

    // Cancel edit
    $('cancel-btn').addEventListener('click', () => { resetForm(); });

    // List filters
    document.querySelectorAll('.filter-pill').forEach(pill =>
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        listFilter.type = pill.dataset.filterType;
        loadList();
      }));

    $('filter-start').addEventListener('change', e => { listFilter.start = e.target.value; loadList(); });
    $('filter-end').addEventListener('change',   e => { listFilter.end   = e.target.value; loadList(); });

    $('filter-clear-btn').addEventListener('click', () => {
      $('filter-start').value = '';
      $('filter-end').value = '';
      listFilter.start = ''; listFilter.end = '';
      loadList();
    });

    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        analysisPeriod = btn.dataset.period;
        loadAnalysis();
      }));

    // Export
    $('export-btn').addEventListener('click', exportCSV);

    // Import
    $('import-btn').addEventListener('click', () => $('csv-file-input').click());
    $('csv-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      e.target.value = '';
      await importCSV(text);
    });

    // Clear all
    $('clear-btn').addEventListener('click', async () => {
      if (!confirm('Delete ALL data? This cannot be undone.')) return;
      if (!confirm('Are you sure? All expenses and investments will be lost.')) return;
      await DB.clearAll();
      Charts.destroyAll();
      resetForm();
      loadRecentEntries();
      showToast('All data cleared');
    });

    // iOS install tip dismiss
    const dismissBtn = $('dismiss-install-tip');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        $('ios-install-tip').style.display = 'none';
        localStorage.setItem('install-tip-dismissed', '1');
      });
    }
  }

  return { init };
})();

// SVG icon library
const ICONS = {
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`
};

document.addEventListener('DOMContentLoaded', () => App.init());

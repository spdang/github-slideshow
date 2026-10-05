/*
 * CordCare CRM — a small, dependency-free CRM for a cord blood / cord tissue
 * stem cell banking company. All data lives in the browser's localStorage;
 * use "Data ▾ → Export backup" to save a copy.
 */
(() => {
  'use strict';

  const STORE_KEY = 'cordcare-crm-v1';

  const STAGES = ['Inquiry', 'Info Sent', 'Consultation', 'Enrolled', 'Kit Shipped', 'Collected', 'Stored', 'Lost'];
  const LEAD_STAGES = ['Inquiry', 'Info Sent', 'Consultation'];
  const PRE_BIRTH_STAGES = ['Enrolled', 'Kit Shipped'];
  const SAMPLE_STATUSES = ['In transit', 'Received', 'Processing', 'Cryopreserved', 'Failed QC', 'Released'];
  const PARTNER_KINDS = ['Hospital', 'OB/GYN', 'Pediatrician', 'Hematologist / Oncologist', 'Transplant center', 'Midwife', 'Doula', 'Birth center'];
  const RX_STATUSES = ['Received', 'Verifying', 'Approved', 'Fulfilled', 'Rejected', 'Cancelled'];
  const RX_OPEN = ['Received', 'Verifying', 'Approved'];

  // Schema-driven entities: forms, tables and CSV export are generated from these.
  const SCHEMAS = {
    families: {
      title: 'Families', singular: 'family', nameKey: 'parent1',
      fields: [
        { key: 'parent1', label: 'Primary parent', required: true },
        { key: 'parent2', label: 'Partner' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'dueDate', label: 'Due date', type: 'date' },
        { key: 'stage', label: 'Stage', type: 'select', options: STAGES, default: 'Inquiry' },
        { key: 'service', label: 'Service', type: 'select', options: ['Undecided', 'Cord blood', 'Cord blood + tissue', 'Cord tissue only'], default: 'Undecided' },
        { key: 'plan', label: 'Storage plan', type: 'select', options: ['Undecided', 'Annual', '18-year prepaid', 'Lifetime'], default: 'Undecided' },
        { key: 'partnerId', label: 'Hospital / provider', type: 'ref', ref: 'partners' },
        { key: 'source', label: 'Lead source', type: 'select', options: ['Website', 'Provider referral', 'Baby expo', 'Friend / family', 'Social media', 'Other'], default: 'Website' },
        { key: 'billing', label: 'Billing', type: 'select', options: ['Not invoiced', 'Pending', 'Paid', 'Overdue'], default: 'Not invoiced' },
        { key: 'renewal', label: 'Next renewal', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: ['parent1', 'dueDate', 'stage', 'service', 'plan', 'partnerId', 'billing'],
      filterKey: 'stage',
    },
    samples: {
      title: 'Samples', singular: 'sample', nameKey: 'sampleId',
      fields: [
        { key: 'sampleId', label: 'Sample ID', required: true },
        { key: 'familyId', label: 'Family', type: 'ref', ref: 'families', required: true },
        { key: 'kind', label: 'Sample type', type: 'select', options: ['Cord blood', 'Cord tissue'], default: 'Cord blood' },
        { key: 'collectionDate', label: 'Collection date', type: 'date' },
        { key: 'status', label: 'Lab status', type: 'select', options: SAMPLE_STATUSES, default: 'In transit' },
        { key: 'courier', label: 'Courier tracking #' },
        { key: 'volume', label: 'Volume (mL)', type: 'number' },
        { key: 'tnc', label: 'TNC (×10⁸)', type: 'number' },
        { key: 'viability', label: 'Viability (%)', type: 'number' },
        { key: 'location', label: 'Storage location (tank / rack / box)' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: ['sampleId', 'familyId', 'kind', 'collectionDate', 'status', 'tnc', 'viability', 'location'],
      filterKey: 'status',
    },
    tasks: {
      title: 'Tasks', singular: 'task', nameKey: 'title',
      fields: [
        { key: 'title', label: 'Task', required: true, wide: true },
        { key: 'familyId', label: 'Family', type: 'ref', ref: 'families' },
        { key: 'kind', label: 'Type', type: 'select', options: ['Call', 'Email', 'Consultation', 'Ship kit', 'Follow-up', 'Billing', 'Other'], default: 'Follow-up' },
        { key: 'due', label: 'Due', type: 'date' },
        { key: 'done', label: 'Done', type: 'checkbox' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: ['done', 'title', 'familyId', 'kind', 'due'],
      defaultSort: 'due',
      filterKey: 'kind',
    },
    partners: {
      title: 'Partners', singular: 'partner', nameKey: 'name',
      fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: PARTNER_KINDS, default: 'Hospital' },
        { key: 'contact', label: 'Contact person' },
        { key: 'license', label: 'Medical license #' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'city', label: 'City' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: ['name', 'kind', 'contact', 'phone', 'city', 'referrals', 'rxCount'],
      filterKey: 'kind',
    },
    orders: {
      title: 'Prescriptions', singular: 'prescription', nameKey: 'orderNo',
      fields: [
        { key: 'orderNo', label: 'Rx / order #', required: true },
        { key: 'kind', label: 'Order type', type: 'select', options: ['Collection order', 'Release for transplant', 'Release for regenerative therapy', 'HLA typing / lab test', 'Other'], default: 'Collection order' },
        { key: 'doctorId', label: 'Prescribing doctor', type: 'ref', ref: 'partners', required: true },
        { key: 'familyId', label: 'Family', type: 'ref', ref: 'families', required: true },
        { key: 'unitId', label: 'Sample to release', type: 'ref', ref: 'samples' },
        { key: 'recipient', label: 'Recipient (patient)' },
        { key: 'indication', label: 'Indication / diagnosis', wide: true },
        { key: 'issued', label: 'Date issued', type: 'date' },
        { key: 'needBy', label: 'Needed by', type: 'date' },
        { key: 'rxStatus', label: 'Status', type: 'select', options: RX_STATUSES, default: 'Received' },
        { key: 'signed', label: 'Signed copy on file', type: 'checkbox' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      columns: ['orderNo', 'kind', 'familyId', 'doctorId', 'issued', 'needBy', 'rxStatus', 'signed'],
      defaultSort: 'needBy',
      filterKey: 'rxStatus',
    },
  };

  // ---------- state & persistence ----------

  let db = load();
  const ui = { search: '', filter: '', sort: {} };

  function emptyDb() { return { families: [], samples: [], tasks: [], partners: [], orders: [] }; }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(emptyDb(), JSON.parse(raw));
    } catch (e) { /* storage unavailable or corrupt: start fresh */ }
    return null;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { toast('Could not save — browser storage is unavailable'); }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const byId = (type, id) => db[type].find(r => r.id === id);

  // ---------- helpers ----------

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function isoToday(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysUntil(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - t) / 86400000);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function relDays(iso) {
    const n = daysUntil(iso);
    if (n === null) return '';
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  }

  function familyName(f) {
    if (!f) return '';
    return f.parent2 ? `${f.parent1} & ${f.parent2}` : f.parent1;
  }

  function refLabel(type, id) {
    const r = byId(type, id);
    if (!r) return '';
    return type === 'families' ? familyName(r) : r[SCHEMAS[type].nameKey];
  }

  const BADGE_TONES = {
    stage: { Inquiry: '', 'Info Sent': 'info', Consultation: 'info', Enrolled: 'accent', 'Kit Shipped': 'accent', Collected: 'warn', Stored: 'ok', Lost: 'bad' },
    billing: { 'Not invoiced': '', Pending: 'warn', Paid: 'ok', Overdue: 'bad' },
    status: { 'In transit': 'info', Received: 'info', Processing: 'warn', Cryopreserved: 'ok', 'Failed QC': 'bad', Released: '' },
    rxStatus: { Received: 'info', Verifying: 'warn', Approved: 'accent', Fulfilled: 'ok', Rejected: 'bad', Cancelled: '' },
  };

  // Columns derived from other records rather than stored on the row.
  const COMPUTED = {
    referrals: { label: 'Referrals', value: row => db.families.filter(f => f.partnerId === row.id).length },
    rxCount: { label: 'Prescriptions', value: row => db.orders.filter(o => o.doctorId === row.id).length },
  };
  const badge = (text, tone = '') => text ? `<span class="badge ${tone}">${esc(text)}</span>` : '';

  function cellHtml(type, key, row) {
    if (COMPUTED[key]) return String(COMPUTED[key].value(row));
    const field = SCHEMAS[type].fields.find(f => f.key === key);
    const v = row[key];
    if (BADGE_TONES[key]) return badge(v, BADGE_TONES[key][v]);
    if (!field) return esc(v);
    switch (field.type) {
      case 'ref': return esc(refLabel(field.ref, v));
      case 'date': {
        if (!v) return '';
        const n = daysUntil(v);
        const overdue = n < 0 && ((type === 'tasks' && !row.done) || (key === 'needBy' && RX_OPEN.includes(row.rxStatus)));
        return `${esc(fmtDate(v))} <span class="badge ${overdue ? 'bad' : ''}">${esc(relDays(v))}</span>`;
      }
      case 'checkbox':
        if (type !== 'tasks') return v ? badge('On file', 'ok') : badge('Missing', 'warn');
        return `<input type="checkbox" data-toggle="${esc(row.id)}" ${v ? 'checked' : ''} aria-label="Mark done">`;
      default: return esc(v);
    }
  }

  // Plain-text value for sorting / searching / CSV.
  function cellText(type, key, row) {
    if (COMPUTED[key]) return COMPUTED[key].value(row);
    const field = SCHEMAS[type].fields.find(f => f.key === key);
    if (field && field.type === 'ref') return refLabel(field.ref, row[key]);
    if (field && field.type === 'checkbox') return row[key] ? 'yes' : 'no';
    return row[key] ?? '';
  }

  function colLabel(type, key) {
    if (COMPUTED[key]) return COMPUTED[key].label;
    return SCHEMAS[type].fields.find(f => f.key === key).label;
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- views ----------

  const view = document.getElementById('view');

  function render() {
    const route = (location.hash || '#dashboard').slice(1);
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + route));
    if (route === 'dashboard') renderDashboard();
    else if (route === 'pipeline') renderPipeline();
    else if (SCHEMAS[route]) renderList(route);
    else location.hash = '#dashboard';
  }

  function renderDashboard() {
    const fams = db.families;
    const leads = fams.filter(f => LEAD_STAGES.includes(f.stage));
    const enrolled = fams.filter(f => PRE_BIRTH_STAGES.includes(f.stage));
    const stored = db.samples.filter(s => s.status === 'Cryopreserved');
    const overdueBilling = fams.filter(f => f.billing === 'Overdue');
    const openTasks = db.tasks.filter(t => !t.done);
    const lateTasks = openTasks.filter(t => t.due && daysUntil(t.due) < 0);
    const won = fams.filter(f => ['Enrolled', 'Kit Shipped', 'Collected', 'Stored'].includes(f.stage)).length;
    const decided = won + fams.filter(f => f.stage === 'Lost').length;
    const conversion = decided ? Math.round((won / decided) * 100) + '%' : '—';

    const births = enrolled
      .filter(f => f.dueDate && daysUntil(f.dueDate) <= 60 && daysUntil(f.dueDate) >= -14)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const tasks = openTasks.slice()
      .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
      .slice(0, 8);
    const renewals = fams
      .filter(f => f.renewal && daysUntil(f.renewal) <= 60)
      .sort((a, b) => a.renewal.localeCompare(b.renewal));
    const lab = db.samples.filter(s => ['In transit', 'Received', 'Processing'].includes(s.status));
    const openRx = db.orders.filter(o => RX_OPEN.includes(o.rxStatus))
      .sort((a, b) => (a.needBy || '9999').localeCompare(b.needBy || '9999'));
    const urgentRx = openRx.filter(o => o.needBy && daysUntil(o.needBy) <= 7);

    const stat = (label, value, sub, alert) =>
      `<div class="card stat ${alert ? 'alert' : ''}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;

    view.innerHTML = `
      <div class="toolbar"><h1>Dashboard</h1>
        <button class="btn" data-new="tasks">+ Task</button>
        <button class="btn primary" data-new="families">+ Family</button>
      </div>
      <div class="stats">
        ${stat('Open leads', leads.length, 'Inquiry → Consultation')}
        ${stat('Enrolled, pre-birth', enrolled.length, `${enrolled.filter(f => f.stage === 'Enrolled').length} still need a kit`)}
        ${stat('Units in storage', stored.length, 'Cryopreserved samples')}
        ${stat('Conversion', conversion, 'Enrolled vs. lost')}
        ${stat('Overdue billing', overdueBilling.length, 'Families', overdueBilling.length > 0)}
        ${stat('Open prescriptions', openRx.length, `${urgentRx.length} needed within 7 days`, urgentRx.length > 0)}
        ${stat('Late tasks', lateTasks.length, `${openTasks.length} open in total`, lateTasks.length > 0)}
      </div>
      <div class="grid-2">
        <section class="card">
          <h3>Upcoming births (60 days)</h3>
          ${listOrEmpty(births, f => {
            const needsKit = f.stage === 'Enrolled';
            return `<li><div class="grow"><div class="title" data-edit="families:${esc(f.id)}">${esc(familyName(f))}</div>
              <div class="meta">${esc(fmtDate(f.dueDate))} · ${esc(relDays(f.dueDate))} · ${esc(refLabel('partners', f.partnerId) || 'No hospital set')}</div></div>
              ${needsKit ? badge('Kit not shipped', daysUntil(f.dueDate) <= 21 ? 'bad' : 'warn') : badge('Kit shipped', 'ok')}</li>`;
          }, 'No enrolled families due in the next 60 days.')}
        </section>
        <section class="card">
          <h3>Tasks</h3>
          ${listOrEmpty(tasks, t => {
            const late = t.due && daysUntil(t.due) < 0;
            return `<li><input type="checkbox" data-toggle="${esc(t.id)}" aria-label="Mark done">
              <div class="grow"><div class="title" data-edit="tasks:${esc(t.id)}">${esc(t.title)}</div>
              <div class="meta">${esc(t.kind)}${t.familyId ? ' · ' + esc(refLabel('families', t.familyId)) : ''}</div></div>
              ${t.due ? badge(relDays(t.due), late ? 'bad' : (daysUntil(t.due) === 0 ? 'warn' : '')) : ''}</li>`;
          }, 'Nothing open. 🎉')}
        </section>
        <section class="card">
          <h3>Samples in the lab</h3>
          ${listOrEmpty(lab, s => `<li><div class="grow"><div class="title" data-edit="samples:${esc(s.id)}">${esc(s.sampleId)}</div>
              <div class="meta">${esc(s.kind)} · ${esc(refLabel('families', s.familyId))} · collected ${esc(relDays(s.collectionDate))}</div></div>
              ${badge(s.status, BADGE_TONES.status[s.status])}</li>`, 'No samples in transit or processing.')}
        </section>
        <section class="card">
          <h3>Open prescriptions</h3>
          ${listOrEmpty(openRx, o => `<li><div class="grow"><div class="title" data-edit="orders:${esc(o.id)}">${esc(o.kind)} · ${esc(o.orderNo)}</div>
              <div class="meta">${esc(refLabel('families', o.familyId))} · by ${esc(refLabel('partners', o.doctorId))}${o.needBy ? ' · needed ' + esc(relDays(o.needBy)) : ''}</div></div>
              ${o.signed ? '' : badge('Unsigned', 'warn')} ${badge(o.rxStatus, BADGE_TONES.rxStatus[o.rxStatus])}</li>`, 'No open prescriptions.')}
        </section>
        <section class="card">
          <h3>Storage renewals (60 days)</h3>
          ${listOrEmpty(renewals, f => `<li><div class="grow"><div class="title" data-edit="families:${esc(f.id)}">${esc(familyName(f))}</div>
              <div class="meta">${esc(f.plan)} · ${esc(fmtDate(f.renewal))}</div></div>
              ${badge(relDays(f.renewal), daysUntil(f.renewal) < 0 ? 'bad' : 'warn')}</li>`, 'No renewals coming up.')}
        </section>
      </div>`;
  }

  function listOrEmpty(rows, fn, emptyMsg) {
    return rows.length ? `<ul class="list">${rows.map(fn).join('')}</ul>` : `<p class="empty">${emptyMsg}</p>`;
  }

  function renderPipeline() {
    const q = ui.search.toLowerCase();
    const fams = db.families.filter(f => !q || familyName(f).toLowerCase().includes(q));
    view.innerHTML = `
      <div class="toolbar"><h1>Pipeline</h1>
        <input class="search" type="search" placeholder="Search families…" value="${esc(ui.search)}" data-search>
        <button class="btn primary" data-new="families">+ Family</button>
      </div>
      <div class="board">
        ${STAGES.map(stage => {
          const cards = fams.filter(f => f.stage === stage)
            .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
          return `<div class="column" data-stage="${esc(stage)}">
            <header><span>${esc(stage)}</span><span class="count">${cards.length}</span></header>
            ${cards.map(f => `<div class="deal" draggable="true" data-id="${esc(f.id)}" data-edit="families:${esc(f.id)}">
              <div class="name">${esc(familyName(f))}</div>
              <div class="meta">${f.dueDate ? `<span>Due ${esc(fmtDate(f.dueDate))}</span>` : ''}
                ${f.service !== 'Undecided' ? badge(f.service) : ''}
                ${f.billing === 'Overdue' ? badge('Overdue', 'bad') : ''}</div>
            </div>`).join('')}
          </div>`;
        }).join('')}
      </div>
      <p class="sub" style="color:var(--muted)">Drag a card to another column to change its stage.</p>`;
  }

  function renderList(type) {
    const s = SCHEMAS[type];
    const filterField = s.fields.find(f => f.key === s.filterKey);
    const sort = ui.sort[type] || { key: s.defaultSort || s.columns[0], dir: 1 };
    const q = ui.search.toLowerCase();

    let rows = db[type].filter(r => !ui.filter || r[s.filterKey] === ui.filter);
    if (q) rows = rows.filter(r => s.fields.some(f => String(cellText(type, f.key, r)).toLowerCase().includes(q)));
    rows.sort((a, b) => {
      const x = cellText(type, sort.key, a), y = cellText(type, sort.key, b);
      if (x === '' && y !== '') return 1;
      if (y === '' && x !== '') return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
    });

    view.innerHTML = `
      <div class="toolbar"><h1>${s.title} <span class="badge">${db[type].length}</span></h1>
        <input class="search" type="search" placeholder="Search…" value="${esc(ui.search)}" data-search>
        <select class="filter" data-filter aria-label="Filter by ${esc(filterField.label)}">
          <option value="">Any ${esc(filterField.label.toLowerCase())}</option>
          ${filterField.options.map(o => `<option ${o === ui.filter ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select>
        <button class="btn primary" data-new="${type}">+ New ${s.singular}</button>
      </div>
      <div class="card table-wrap" style="padding:0">
        ${rows.length ? `<table>
          <thead><tr>${s.columns.map(k => `<th data-sort="${k}">${esc(colLabel(type, k))} <span class="arrow">${sort.key === k ? (sort.dir > 0 ? '▲' : '▼') : ''}</span></th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr data-edit="${type}:${esc(r.id)}" class="${r.done ? 'done' : ''}">${s.columns.map(k => `<td>${cellHtml(type, k, r)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>` : `<p class="empty">No ${s.title.toLowerCase()} ${db[type].length ? 'match these filters' : 'yet'}.</p>`}
      </div>`;
    view.dataset.type = type;
    view.dataset.sortKey = sort.key;
    view.dataset.sortDir = sort.dir;
  }

  // ---------- editor dialog ----------

  const dlg = document.getElementById('editor');
  const form = document.getElementById('editorForm');
  let editing = null; // { type, id|null }

  function openEditor(type, id, preset = {}) {
    const s = SCHEMAS[type];
    const rec = id ? byId(type, id) : preset;
    editing = { type, id };
    document.getElementById('editorTitle').textContent = (id ? 'Edit ' : 'New ') + s.singular;
    document.getElementById('deleteBtn').hidden = !id;
    document.getElementById('editorFields').innerHTML = s.fields.map(f => fieldHtml(f, rec[f.key] ?? f.default ?? '')).join('');
    dlg.showModal();
    const first = form.querySelector('input:not([type=checkbox]), select, textarea');
    if (first) first.focus();
  }

  function fieldHtml(f, value) {
    const req = f.required ? 'required' : '';
    const name = `name="${f.key}"`;
    let control;
    switch (f.type) {
      case 'select':
        control = `<select ${name} ${req}>${f.options.map(o => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        break;
      case 'ref': {
        const opts = db[f.ref].slice().sort((a, b) => refLabel(f.ref, a.id).localeCompare(refLabel(f.ref, b.id)));
        control = `<select ${name} ${req}><option value="">—</option>${opts.map(r => `<option value="${esc(r.id)}" ${r.id === value ? 'selected' : ''}>${esc(refLabel(f.ref, r.id))}</option>`).join('')}</select>`;
        break;
      }
      case 'textarea':
        return `<label class="wide">${esc(f.label)}<textarea ${name} rows="3">${esc(value)}</textarea></label>`;
      case 'checkbox':
        return `<label class="check"><input type="checkbox" ${name} ${value ? 'checked' : ''}> ${esc(f.label)}</label>`;
      case 'number':
        control = `<input type="number" step="any" min="0" ${name} value="${esc(value)}" ${req}>`;
        break;
      default:
        control = `<input type="${f.type || 'text'}" ${name} value="${esc(value)}" ${req}>`;
    }
    return `<label class="${f.wide ? 'wide' : ''}">${esc(f.label)}${f.required ? ' *' : ''}${control}</label>`;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const { type, id } = editing;
    const rec = id ? byId(type, id) : { id: uid(), createdAt: new Date().toISOString() };
    for (const f of SCHEMAS[type].fields) {
      const el = form.elements[f.key];
      if (f.type === 'checkbox') rec[f.key] = el.checked;
      else if (f.type === 'number') rec[f.key] = el.value === '' ? '' : Number(el.value);
      else rec[f.key] = el.value.trim();
    }
    rec.updatedAt = new Date().toISOString();
    if (!id) db[type].push(rec);
    save();
    dlg.close();
    toast(`${capitalize(SCHEMAS[type].singular)} saved`);
    render();
  });

  document.getElementById('cancelBtn').addEventListener('click', () => dlg.close());

  document.getElementById('deleteBtn').addEventListener('click', () => {
    const { type, id } = editing;
    const rec = byId(type, id);
    const label = refLabel(type, id) || 'this record';
    const linked = linkedCount(type, id);
    const warn = linked ? `\n\n${linked} linked record(s) will keep existing but lose this link.` : '';
    if (!confirm(`Delete ${label}?${warn}`)) return;
    db[type] = db[type].filter(r => r !== rec);
    unlink(type, id);
    save();
    dlg.close();
    toast('Deleted');
    render();
  });

  function linkedCount(type, id) {
    let n = 0;
    for (const [t, s] of Object.entries(SCHEMAS)) {
      for (const f of s.fields) if (f.type === 'ref' && f.ref === type) n += db[t].filter(r => r[f.key] === id).length;
    }
    return n;
  }

  function unlink(type, id) {
    for (const [t, s] of Object.entries(SCHEMAS)) {
      for (const f of s.fields) if (f.type === 'ref' && f.ref === type) db[t].forEach(r => { if (r[f.key] === id) r[f.key] = ''; });
    }
  }

  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- event wiring ----------

  view.addEventListener('click', e => {
    const t = e.target;
    if (t.matches('[data-toggle]')) {
      const task = byId('tasks', t.dataset.toggle);
      task.done = t.checked;
      task.updatedAt = new Date().toISOString();
      save();
      toast(task.done ? 'Task completed' : 'Task reopened');
      render();
      return;
    }
    const newBtn = t.closest('[data-new]');
    if (newBtn) return openEditor(newBtn.dataset.new);
    const th = t.closest('th[data-sort]');
    if (th) {
      const type = view.dataset.type;
      const key = th.dataset.sort;
      const dir = view.dataset.sortKey === key ? -Number(view.dataset.sortDir) : 1;
      ui.sort[type] = { key, dir };
      return render();
    }
    const edit = t.closest('[data-edit]');
    if (edit) {
      const [type, id] = edit.dataset.edit.split(':');
      openEditor(type, id);
    }
  });

  view.addEventListener('input', e => {
    if (e.target.matches('[data-search]')) {
      ui.search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const box = view.querySelector('[data-search]');
      box.focus();
      box.setSelectionRange(pos, pos);
    }
  });

  view.addEventListener('change', e => {
    if (e.target.matches('[data-filter]')) { ui.filter = e.target.value; render(); }
  });

  // Pipeline drag & drop
  let dragId = null;
  view.addEventListener('dragstart', e => {
    const card = e.target.closest('.deal');
    if (!card) return;
    dragId = card.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  view.addEventListener('dragover', e => {
    const col = e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    view.querySelectorAll('.column.drop').forEach(c => c !== col && c.classList.remove('drop'));
    col.classList.add('drop');
  });
  view.addEventListener('dragleave', e => {
    const col = e.target.closest('.column');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop');
  });
  view.addEventListener('drop', e => {
    const col = e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    const fam = byId('families', dragId);
    dragId = null;
    if (fam && fam.stage !== col.dataset.stage) {
      fam.stage = col.dataset.stage;
      fam.updatedAt = new Date().toISOString();
      save();
      toast(`${familyName(fam)} → ${fam.stage}`);
    }
    render();
  });
  view.addEventListener('dragend', () => { dragId = null; });

  window.addEventListener('hashchange', () => { if (dlg.open) dlg.close(); ui.search = ''; ui.filter = ''; render(); });

  // Data menu
  const menuBtn = document.getElementById('menuBtn');
  const menuList = document.getElementById('menuList');
  const setMenu = open => { menuList.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(menuList.hidden); });
  document.addEventListener('click', () => setMenu(false));

  menuList.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action) return;
    setMenu(false);
    if (action === 'export-json') download(`cordcare-backup-${isoToday()}.json`, JSON.stringify(db, null, 2), 'application/json');
    if (action === 'import-json') document.getElementById('importFile').click();
    if (action === 'export-csv') exportCsv();
    if (action === 'seed' && confirm('Replace current data with demo data?')) { db = seed(); save(); render(); toast('Demo data loaded'); }
    if (action === 'reset' && confirm('Erase ALL CRM data in this browser? Export a backup first if you need it.')) { db = emptyDb(); save(); render(); toast('All data erased'); }
  });

  document.getElementById('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      // Older backups may predate some lists; those start empty.
      if (!data || !Array.isArray(data.families) || !Object.keys(SCHEMAS).every(k => data[k] === undefined || Array.isArray(data[k]))) throw new Error('bad shape');
      if (!confirm('Replace current data with this backup?')) return;
      db = Object.assign(emptyDb(), data);
      save();
      render();
      toast('Backup imported');
    } catch (err) {
      alert('That file is not a valid CordCare CRM backup.');
    }
  });

  function exportCsv() {
    const route = (location.hash || '#dashboard').slice(1);
    const type = SCHEMAS[route] ? route : 'families';
    const fields = SCHEMAS[type].fields;
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [fields.map(f => q(f.label)).join(',')];
    for (const r of db[type]) lines.push(fields.map(f => q(cellText(type, f.key, r))).join(','));
    download(`cordcare-${type}-${isoToday()}.csv`, lines.join('\r\n'), 'text/csv');
  }

  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- demo data (dates are relative to today so it always looks current) ----------

  function seed() {
    const d = emptyDb();
    const add = (type, rec) => { rec.id = uid(); rec.createdAt = new Date().toISOString(); d[type].push(rec); return rec.id; };

    const stMary = add('partners', { name: "St. Mary's Women's Hospital", kind: 'Hospital', contact: 'Dana Ortiz (L&D manager)', phone: '555-0140', email: 'ld@stmarys.example', city: 'Springfield', notes: 'Collection kits accepted at L&D desk 24/7.' });
    const lakeOb = add('partners', { name: 'Lakeside OB/GYN Group', kind: 'OB/GYN', contact: 'Dr. Priya Raman', phone: '555-0177', email: 'office@lakesideob.example', city: 'Springfield', notes: 'Hands out our brochure at 20-week visits.' });
    const drKim = add('partners', { name: 'Dr. Helen Kim', kind: 'Hematologist / Oncologist', contact: 'Springfield Children\'s Hospital', license: 'MD-448210', phone: '555-0191', email: 'hkim@schildrens.example', city: 'Springfield', notes: 'Pediatric transplant program lead.' });
    const drRaman = add('partners', { name: 'Dr. Priya Raman', kind: 'OB/GYN', contact: 'Lakeside OB/GYN Group', license: 'MD-301877', phone: '555-0177', email: 'praman@lakesideob.example', city: 'Springfield', notes: '' });
    const bloom = add('partners', { name: 'Bloom Birth Center', kind: 'Birth center', contact: 'Ana Silva, CNM', phone: '555-0122', email: 'hello@bloom.example', city: 'Riverton', notes: '' });

    const fam = (o) => add('families', Object.assign({ parent2: '', service: 'Undecided', plan: 'Undecided', source: 'Website', billing: 'Not invoiced', renewal: '', notes: '' }, o));
    const f1 = fam({ parent1: 'Emma Johnson', parent2: 'Liam Johnson', email: 'emma.j@example.com', phone: '555-0101', dueDate: isoToday(12), stage: 'Enrolled', service: 'Cord blood + tissue', plan: '18-year prepaid', partnerId: stMary, source: 'Provider referral', billing: 'Paid', notes: 'First baby. Prefers text messages.' });
    const f2 = fam({ parent1: 'Sofia Martinez', email: 'sofia.m@example.com', phone: '555-0102', dueDate: isoToday(34), stage: 'Kit Shipped', service: 'Cord blood', plan: 'Annual', partnerId: lakeOb, source: 'Provider referral', billing: 'Pending' });
    const f3 = fam({ parent1: 'Aisha Khan', parent2: 'Omar Khan', email: 'aisha.k@example.com', phone: '555-0103', dueDate: isoToday(70), stage: 'Consultation', service: 'Cord blood + tissue', partnerId: stMary, source: 'Baby expo', notes: 'Asked about sibling donor matching.' });
    const f4 = fam({ parent1: 'Chloe Nguyen', email: 'chloe.n@example.com', phone: '555-0104', dueDate: isoToday(110), stage: 'Inquiry', source: 'Social media' });
    const f5 = fam({ parent1: 'Grace Lee', parent2: 'Daniel Lee', email: 'grace.l@example.com', phone: '555-0105', dueDate: isoToday(88), stage: 'Info Sent', partnerId: bloom, source: 'Friend / family' });
    const f6 = fam({ parent1: 'Olivia Brown', email: 'olivia.b@example.com', phone: '555-0106', dueDate: isoToday(-3), stage: 'Collected', service: 'Cord blood', plan: 'Annual', partnerId: stMary, billing: 'Paid', renewal: isoToday(362) });
    const f7 = fam({ parent1: 'Mia Patel', parent2: 'Arjun Patel', email: 'mia.p@example.com', phone: '555-0107', dueDate: isoToday(-340), stage: 'Stored', service: 'Cord blood + tissue', plan: 'Annual', partnerId: lakeOb, source: 'Provider referral', billing: 'Paid', renewal: isoToday(25) });
    const f8 = fam({ parent1: 'Hannah Wilson', email: 'hannah.w@example.com', phone: '555-0108', dueDate: isoToday(-500), stage: 'Stored', service: 'Cord blood', plan: 'Annual', partnerId: stMary, billing: 'Overdue', renewal: isoToday(-9), notes: 'Renewal invoice sent twice, no reply.' });
    fam({ parent1: 'Zoe Carter', email: 'zoe.c@example.com', phone: '555-0109', dueDate: isoToday(40), stage: 'Lost', source: 'Website', notes: 'Chose public donation instead.' });
    const f10 = fam({ parent1: 'Isabella Rossi', email: 'isa.r@example.com', phone: '555-0110', dueDate: isoToday(19), stage: 'Enrolled', service: 'Cord blood', plan: 'Lifetime', partnerId: bloom, source: 'Provider referral', billing: 'Pending' });

    add('samples', { sampleId: 'CB-24-0193', familyId: f6, kind: 'Cord blood', collectionDate: isoToday(-3), status: 'Processing', courier: '1Z999AA10123456784', volume: 92, tnc: '', viability: '', location: '', notes: '' });
    const cb0871 = add('samples', { sampleId: 'CB-23-0871', familyId: f7, kind: 'Cord blood', collectionDate: isoToday(-340), status: 'Cryopreserved', courier: '', volume: 105, tnc: 14.2, viability: 97, location: 'Tank 3 / Rack C / Box 12', notes: '' });
    add('samples', { sampleId: 'CT-23-0871', familyId: f7, kind: 'Cord tissue', collectionDate: isoToday(-340), status: 'Cryopreserved', courier: '', volume: '', tnc: '', viability: '', location: 'Tank 3 / Rack C / Box 13', notes: '' });
    add('samples', { sampleId: 'CB-23-0544', familyId: f8, kind: 'Cord blood', collectionDate: isoToday(-500), status: 'Cryopreserved', courier: '', volume: 78, tnc: 9.6, viability: 95, location: 'Tank 1 / Rack A / Box 4', notes: '' });

    const rx = (o) => add('orders', Object.assign({ unitId: '', recipient: '', indication: '', needBy: '', signed: false, notes: '' }, o));
    rx({ orderNo: 'RX-2026-014', kind: 'Collection order', doctorId: drRaman, familyId: f1, issued: isoToday(-20), needBy: isoToday(12), rxStatus: 'Approved', signed: true, indication: 'Elective family banking' });
    rx({ orderNo: 'RX-2026-019', kind: 'Collection order', doctorId: drRaman, familyId: f10, issued: isoToday(-5), needBy: isoToday(19), rxStatus: 'Received', indication: 'Elective family banking', notes: 'Waiting for signed original.' });
    rx({ orderNo: 'RX-2026-021', kind: 'Release for transplant', doctorId: drKim, familyId: f7, unitId: cb0871, recipient: 'Sibling (age 4)', indication: 'Sibling transplant evaluation', issued: isoToday(-2), needBy: isoToday(5), rxStatus: 'Verifying', signed: true, notes: 'Confirm HLA match report before release.' });
    const task = (o) => add('tasks', Object.assign({ done: false, notes: '' }, o));
    task({ title: 'Ship collection kit', familyId: f1, kind: 'Ship kit', due: isoToday(0) });
    task({ title: 'Ship collection kit', familyId: f10, kind: 'Ship kit', due: isoToday(3) });
    task({ title: 'Consultation call — answer sibling matching questions', familyId: f3, kind: 'Consultation', due: isoToday(2) });
    task({ title: 'Follow up on info pack', familyId: f5, kind: 'Follow-up', due: isoToday(-1) });
    task({ title: 'Intro call', familyId: f4, kind: 'Call', due: isoToday(1) });
    task({ title: 'Chase overdue renewal', familyId: f8, kind: 'Billing', due: isoToday(-4) });
    task({ title: 'Send renewal reminder', familyId: f7, kind: 'Email', due: isoToday(10) });
    task({ title: 'Confirm courier pickup', familyId: f2, kind: 'Follow-up', due: isoToday(-6), done: true });
    task({ title: 'Drop off brochures at Lakeside OB', kind: 'Other', due: isoToday(7) });
    return d;
  }

  // ---------- boot ----------

  if (!db) { db = seed(); save(); }
  render();
})();

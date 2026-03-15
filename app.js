'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORY_META = {
  fruit:     { label: 'Fruit',     icon: '🍎', order: 1 },
  vegetable: { label: 'Vegetable', icon: '🥦', order: 2 },
  dairy:     { label: 'Dairy',     icon: '🧀', order: 3 },
  meat:      { label: 'Meat',      icon: '🥩', order: 4 },
  bread:     { label: 'Bread',     icon: '🍞', order: 5 },
};

const STEP = 10; // gram adjustment step

// ─── State ────────────────────────────────────────────────────────────────────
let dietData = null;
let selectedDays = new Set();
let ingredients = [];    // computed from selection, shape: [{id, name, type, totalWeight, usages[], excluded, adjustedWeight}]
let replacingId = null;  // for replace modal

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const screenDays    = document.getElementById('screen-days');
const screenList    = document.getElementById('screen-list');
const screenSummary = document.getElementById('screen-summary');
const daysGrid      = document.getElementById('days-grid');
const btnGenerate   = document.getElementById('btn-generate');
const btnSelectAll  = document.getElementById('btn-select-all');
const btnBackToDays = document.getElementById('btn-back-to-days');
const btnBackToList = document.getElementById('btn-back-to-list');
const btnReset      = document.getElementById('btn-reset');
const btnFinalize   = document.getElementById('btn-finalize');
const btnCopy       = document.getElementById('btn-copy');
const btnStartOver  = document.getElementById('btn-start-over');
const listContent   = document.getElementById('list-content');
const summaryContent= document.getElementById('summary-content');
const statsBar      = document.getElementById('stats-bar');
const toast         = document.getElementById('toast');
const replaceModal  = document.getElementById('replace-modal');
const replaceInput  = document.getElementById('replace-input');
const replaceDesc   = document.getElementById('replace-desc');
const replaceConfirm= document.getElementById('replace-confirm');
const replaceCancel = document.getElementById('replace-cancel');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('./diet_data.json');
    dietData = await res.json();
    renderDaysGrid();
    registerSW();
  } catch (e) {
    console.error('Failed to load diet data:', e);
    daysGrid.innerHTML = '<p style="color:red;padding:20px">Failed to load diet data.</p>';
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
}

// ─── Screen helpers ───────────────────────────────────────────────────────────
function showScreen(screen) {
  [screenDays, screenList, screenSummary].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
  screen.scrollTop = 0;
}

// ─── Day selection ────────────────────────────────────────────────────────────
function renderDaysGrid() {
  const days = dietData.days;
  // Get unique day numbers
  const dayNums = [...new Set(days.map(d => d.day))].sort((a, b) => a - b);

  daysGrid.innerHTML = dayNums.map(num => {
    // Find all entries for this day
    const entries = days.filter(d => d.day === num);
    const dateStr = entries[0]?.date ?? '';
    const formatted = dateStr ? formatDate(dateStr) : '';
    return `
      <div class="day-card" data-day="${num}" role="checkbox" aria-checked="false" tabindex="0">
        <div class="day-card-top">
          <span class="day-label">Day</span>
          <span class="day-check">✓</span>
        </div>
        <div class="day-number">${String(num).padStart(2, '0')}</div>
        ${formatted ? `<div class="day-date">${formatted}</div>` : ''}
      </div>`;
  }).join('');

  daysGrid.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', () => toggleDay(card));
    card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') toggleDay(card); });
  });
}

function toggleDay(card) {
  const day = Number(card.dataset.day);
  if (selectedDays.has(day)) {
    selectedDays.delete(day);
    card.classList.remove('selected');
    card.setAttribute('aria-checked', 'false');
  } else {
    selectedDays.add(day);
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
  }
  updateGenerateBtn();
  updateSelectAllBtn();
}

function updateGenerateBtn() {
  btnGenerate.disabled = selectedDays.size === 0;
}

function updateSelectAllBtn() {
  const dayNums = [...new Set(dietData.days.map(d => d.day))];
  const allSelected = dayNums.every(d => selectedDays.has(d));
  btnSelectAll.textContent = allSelected ? 'Deselect All' : 'Select All';
}

btnSelectAll.addEventListener('click', () => {
  const dayNums = [...new Set(dietData.days.map(d => d.day))];
  const allSelected = dayNums.every(d => selectedDays.has(d));
  if (allSelected) {
    selectedDays.clear();
    daysGrid.querySelectorAll('.day-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
  } else {
    dayNums.forEach(d => selectedDays.add(d));
    daysGrid.querySelectorAll('.day-card').forEach(c => {
      c.classList.add('selected');
      c.setAttribute('aria-checked', 'true');
    });
  }
  updateGenerateBtn();
  updateSelectAllBtn();
});

btnGenerate.addEventListener('click', generateList);

// ─── List generation ──────────────────────────────────────────────────────────
function generateList() {
  ingredients = buildIngredients([...selectedDays]);
  renderList();
  showScreen(screenList);
}

function buildIngredients(days) {
  const map = {};  // name_type -> ingredient obj

  dietData.days
    .filter(d => days.includes(d.day))
    .forEach(dayEntry => {
      dayEntry.meals.forEach(meal => {
        meal.dishes.forEach(dish => {
          dish.ingredients.forEach(ing => {
            const key = `${ing.name.toLowerCase().trim()}|${ing.type}`;
            if (!map[key]) {
              map[key] = {
                id: key,
                name: ing.name,
                type: ing.type || 'vegetable',
                totalWeight: 0,
                usages: [],
                excluded: false,
                adjustedWeight: 0,
              };
            }
            map[key].totalWeight += ing.weight;
            map[key].usages.push({
              day: dayEntry.day,
              owner: dayEntry.owner,
              meal: meal.mealName,
              dish: dish.dishName,
              weight: ing.weight,
            });
          });
        });
      });
    });

  // set adjustedWeight = totalWeight initially
  Object.values(map).forEach(ing => { ing.adjustedWeight = ing.totalWeight; });

  return Object.values(map);
}

// ─── Render Shopping List (Screen 2) ──────────────────────────────────────────
function renderList() {
  renderStats();

  // Group by type, sorted by category order
  const groups = groupByType(ingredients);

  listContent.innerHTML = groups.map(([type, items]) => {
    const meta = CATEGORY_META[type] || { label: type, icon: '📦', order: 99 };
    return `
      <section class="category-section" data-type="${type}">
        <div class="category-header">
          <div class="category-title cat-${type}">
            <span class="category-dot dot-${type}"></span>
            ${meta.label.toUpperCase()}
          </div>
          <span class="category-count">${items.length} ITEMS</span>
        </div>
        ${items.map(ing => renderIngredientCard(ing)).join('')}
      </section>`;
  }).join('');

  attachListEvents();
}

function renderStats() {
  const active = ingredients.filter(i => !i.excluded);
  const totalWeight = active.reduce((s, i) => s + i.adjustedWeight, 0);
  const inStock = ingredients.filter(i => i.excluded).length;

  statsBar.innerHTML = `
    <div class="stat-chip">
      <div class="stat-chip-label">⚖️ Weight</div>
      <div class="stat-chip-value">${totalWeight}g</div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-label">🛒 Items</div>
      <div class="stat-chip-value">${active.length} total</div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-label">✅ In Stock</div>
      <div class="stat-chip-value">${inStock} marked</div>
    </div>`;
}

function renderIngredientCard(ing) {
  const meta = CATEGORY_META[ing.type] || { icon: '📦' };
  const weightDisplay = ing.adjustedWeight !== ing.totalWeight
    ? `${ing.adjustedWeight}G (orig. ${ing.totalWeight}G)`
    : `${ing.adjustedWeight}G NEEDED`;

  return `
    <div class="ingredient-card ${ing.excluded ? 'excluded' : ''}" data-id="${escHtml(ing.id)}">
      <div class="ingredient-row">
        <div class="ingredient-icon icon-${ing.type}">${meta.icon}</div>
        <div class="ingredient-info">
          <div class="ingredient-name">${escHtml(ing.name)}</div>
          <div class="ingredient-meta">${weightDisplay}</div>
        </div>
        <div class="ingredient-actions">
          <label class="toggle-wrap" title="${ing.excluded ? 'Mark as needed' : 'Mark as in stock'}">
            <input type="checkbox" class="toggle-check" data-id="${escHtml(ing.id)}" ${ing.excluded ? '' : 'checked'} />
            <span class="toggle-slider"></span>
          </label>
          <button class="expand-btn" data-id="${escHtml(ing.id)}" aria-label="Expand details">▼</button>
        </div>
      </div>
      <div class="ingredient-expanded" data-expand="${escHtml(ing.id)}">
        <div class="adjust-row">
          <span class="adjust-label">Adjust total grams:</span>
          <div class="adjust-controls">
            <button class="adjust-btn" data-id="${escHtml(ing.id)}" data-action="minus">−</button>
            <span class="adjust-value" data-weight="${escHtml(ing.id)}">${ing.adjustedWeight}</span>
            <button class="adjust-btn" data-id="${escHtml(ing.id)}" data-action="plus">+</button>
          </div>
        </div>
        <div class="usage-label">Used in plan:</div>
        <div class="usage-list">
          ${ing.usages.map(u => `
            <div class="usage-item">
              <span class="usage-item-name">Day ${u.day}: ${escHtml(u.dish)} (${escHtml(u.owner)})</span>
              <span class="usage-item-amount">${u.weight}g</span>
            </div>`).join('')}
        </div>
        <div class="card-actions">
          <button class="replace-btn" data-id="${escHtml(ing.id)}">↔ REPLACE ITEM</button>
          <button class="delete-btn" data-id="${escHtml(ing.id)}" title="Remove from list">🗑️</button>
        </div>
      </div>
    </div>`;
}

function attachListEvents() {
  // Toggle (in-stock)
  listContent.querySelectorAll('.toggle-check').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const id = e.target.dataset.id;
      const ing = findById(id);
      if (!ing) return;
      ing.excluded = !e.target.checked;
      const card = listContent.querySelector(`.ingredient-card[data-id="${CSS.escape(id)}"]`);
      if (card) card.classList.toggle('excluded', ing.excluded);
      renderStats();
    });
  });

  // Expand/collapse
  listContent.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = btn.dataset.id;
      const expanded = listContent.querySelector(`.ingredient-expanded[data-expand="${CSS.escape(id)}"]`);
      if (!expanded) return;
      const isOpen = expanded.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
    });
  });

  // Adjust weight
  listContent.querySelectorAll('.adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const ing = findById(id);
      if (!ing) return;
      if (action === 'plus') {
        ing.adjustedWeight += STEP;
      } else {
        ing.adjustedWeight = Math.max(0, ing.adjustedWeight - STEP);
      }
      const span = listContent.querySelector(`[data-weight="${CSS.escape(id)}"]`);
      if (span) span.textContent = ing.adjustedWeight;
      // Update meta line
      const card = listContent.querySelector(`.ingredient-card[data-id="${CSS.escape(id)}"]`);
      if (card) {
        const meta = card.querySelector('.ingredient-meta');
        const weightDisplay = ing.adjustedWeight !== ing.totalWeight
          ? `${ing.adjustedWeight}G (orig. ${ing.totalWeight}G)`
          : `${ing.adjustedWeight}G NEEDED`;
        if (meta) meta.textContent = weightDisplay;
      }
      renderStats();
    });
  });

  // Replace item
  listContent.querySelectorAll('.replace-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ing = findById(id);
      if (!ing) return;
      replacingId = id;
      replaceDesc.textContent = `Replace "${ing.name}" with:`;
      replaceInput.value = '';
      replaceModal.hidden = false;
      replaceInput.focus();
    });
  });

  // Delete item
  listContent.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      ingredients = ingredients.filter(i => i.id !== id);
      renderList();
      showToast('Item removed from list');
    });
  });
}

// ─── Replace modal ────────────────────────────────────────────────────────────
replaceConfirm.addEventListener('click', () => {
  const newName = replaceInput.value.trim();
  if (!newName) { replaceInput.focus(); return; }
  const ing = findById(replacingId);
  if (ing) {
    const newId = `${newName.toLowerCase().trim()}|${ing.type}`;
    ing.name = newName;
    ing.id = newId;
    renderList();
    showToast(`Replaced with "${newName}"`);
  }
  replaceModal.hidden = true;
  replacingId = null;
});

replaceCancel.addEventListener('click', () => {
  replaceModal.hidden = true;
  replacingId = null;
});

replaceInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') replaceConfirm.click();
  if (e.key === 'Escape') replaceCancel.click();
});

// ─── Finalize (Screen 3) ──────────────────────────────────────────────────────
btnFinalize.addEventListener('click', () => {
  renderSummary();
  showScreen(screenSummary);
});

function renderSummary() {
  const active = ingredients.filter(i => !i.excluded);
  const groups = groupByType(active);
  const totalWeight = active.reduce((s, i) => s + i.adjustedWeight, 0);
  const totalItems = active.length;

  summaryContent.innerHTML = `
    <div class="summary-total-card">
      <div class="summary-total-title">Your Shopping List</div>
      <div class="summary-total-value">${totalItems} items</div>
      <div class="summary-total-sub">~${totalWeight}g total • Days: ${[...selectedDays].sort().join(', ')}</div>
    </div>
    ${groups.map(([type, items]) => {
      const meta = CATEGORY_META[type] || { label: type, icon: '📦' };
      return `
        <section class="category-section" data-type="${type}">
          <div class="category-header">
            <div class="category-title cat-${type}">
              <span class="category-dot dot-${type}"></span>
              ${meta.label.toUpperCase()}
            </div>
            <span class="category-count">${items.length} ITEMS</span>
          </div>
          ${items.map(ing => `
            <div class="summary-item">
              <span class="summary-item-name">${meta.icon} ${escHtml(ing.name)}</span>
              <span class="summary-item-amount">${ing.adjustedWeight}g</span>
            </div>`).join('')}
        </section>`;
    }).join('')}`;
}

// ─── Copy list ────────────────────────────────────────────────────────────────
btnCopy.addEventListener('click', () => {
  const active = ingredients.filter(i => !i.excluded);
  const groups = groupByType(active);
  const lines = [`Diet Shopping List — Days: ${[...selectedDays].sort().join(', ')}`, ''];
  groups.forEach(([type, items]) => {
    const meta = CATEGORY_META[type] || { label: type };
    lines.push(`--- ${meta.label.toUpperCase()} ---`);
    items.forEach(ing => lines.push(`• ${ing.name}: ${ing.adjustedWeight}g`));
    lines.push('');
  });
  const text = lines.join('\n');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('List copied to clipboard ✓'));
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('List copied to clipboard ✓');
  }
});

// ─── Navigation ───────────────────────────────────────────────────────────────
btnBackToDays.addEventListener('click', () => showScreen(screenDays));
btnBackToList.addEventListener('click', () => {
  renderList();
  showScreen(screenList);
});
btnReset.addEventListener('click', () => {
  if (ingredients.length && confirm('Reset all edits?')) {
    ingredients = buildIngredients([...selectedDays]);
    renderList();
    showToast('List reset to original');
  }
});
btnStartOver.addEventListener('click', () => {
  selectedDays.clear();
  ingredients = [];
  daysGrid.querySelectorAll('.day-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  updateGenerateBtn();
  updateSelectAllBtn();
  showScreen(screenDays);
});

// ─── Utilities ────────────────────────────────────────────────────────────────
function groupByType(items) {
  const map = {};
  items.forEach(ing => {
    const t = ing.type || 'vegetable';
    if (!map[t]) map[t] = [];
    map[t].push(ing);
  });
  return Object.entries(map).sort(([a], [b]) => {
    const oa = CATEGORY_META[a]?.order ?? 99;
    const ob = CATEGORY_META[b]?.order ?? 99;
    return oa - ob;
  });
}

function findById(id) {
  return ingredients.find(i => i.id === id) || null;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch (e) {
    return dateStr;
  }
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();

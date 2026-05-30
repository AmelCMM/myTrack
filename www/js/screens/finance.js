import State from '../state.js';
import i18n from '../i18n.js';
import { today, yesterday, daysAgo, daysFromNow, dateStr, dateStrShort, monthName, monthStart, weekStart, formatCurrency, escapeHtml, groupBy, sumBy, sortBy } from '../helpers.js';
import { FINANCE_CATEGORIES } from '../constants.js';

function formatAmount(amount, currency = 'USD') {
  const abs = Math.abs(amount);
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency + ' ';
  return symbol + abs.toFixed(2);
}

function getBalanceColor(balance) {
  if (Math.abs(balance) < 0.01) return 'var(--warn)';
  return balance > 0 ? 'var(--accent)' : 'var(--danger)';
}

function getBalanceBg(balance) {
  if (Math.abs(balance) < 0.01) return 'rgba(245,166,35,.1)';
  return balance > 0 ? 'rgba(0,229,160,.1)' : 'rgba(255,77,106,.1)';
}

function renderQuickStats(s) {
  const accounts = s.accounts || [];
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const monthTxs = (s.transactions || []).filter(t => t.date && t.date.startsWith(monthStr));
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const txCount = (s.transactions || []).length;
  return `
    <div class="srow" style="padding-bottom:4px">
      <div class="sc">
        <span class="sv" style="font-size:18px">${accounts.length}</span>
        <span class="sl">Accounts</span>
      </div>
      <div class="sc">
        <span class="sv" style="font-size:16px;color:${getBalanceColor(totalBalance)}">${totalBalance.toFixed(2)}</span>
        <span class="sl">Total Balance</span>
      </div>
      <div class="sc">
        <span class="sv" style="font-size:16px;color:var(--tm)">${txCount}</span>
        <span class="sl">Transactions</span>
      </div>
    </div>
    <div class="srow" style="padding-bottom:8px">
      <div class="sc">
        <span class="sv" style="font-size:15px;color:var(--accent)">+${monthIncome.toFixed(2)}</span>
        <span class="sl">Income/mo</span>
      </div>
      <div class="sc">
        <span class="sv" style="font-size:15px;color:var(--danger)">-${monthExpense.toFixed(2)}</span>
        <span class="sl">Spend/mo</span>
      </div>
      <div class="sc">
        <span class="sv" style="font-size:15px;color:${monthIncome - monthExpense >= 0 ? 'var(--accent)' : 'var(--danger)'}">${(monthIncome - monthExpense).toFixed(2)}</span>
        <span class="sl">Net/mo</span>
      </div>
    </div>`;
}

function renderAccountsSection(s) {
  const accounts = s.accounts || [];
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">${i18n.t('finance.accounts')}</span>
        <span class="ca" onclick="App.sheets.account()">${i18n.t('finance.add')}</span>
      </div>
      <div id="acnt-list">
        ${accounts.length === 0 ? `
          <div class="empty" style="text-align:center;padding:18px 4px">
            <div style="font-size:28px;margin-bottom:6px">🏦</div>
            <div style="font-size:13px;color:var(--ts)">No accounts yet.</div>
            <div style="font-size:11px;color:var(--tm);margin-top:2px">Add your first account to start tracking finances.</div>
          </div>
        ` : accounts.map(a => {
          const color = getBalanceColor(a.balance);
          const bg = getBalanceBg(a.balance);
          return `
            <div class="dri" style="padding:10px 0">
              <div class="dri-l">
                <div class="dri-ic" style="background:${bg}">💰</div>
                <div>
                  <div class="dri-name" style="font-size:14px">${escapeHtml(a.name)}</div>
                  <div class="dri-sub">${a.currency || 'USD'} · ${(s.transactions || []).filter(t => t.accountId === a.id).length} txns</div>
                </div>
              </div>
              <div class="dri-r" style="flex-direction:column;align-items:flex-end;gap:2px">
                <span class="dri-val" style="font-size:15px;color:${color};font-weight:600">${formatAmount(a.balance, a.currency)}</span>
                <div style="display:flex;gap:4px">
                  <span class="del-btn" onclick="App._deleteAccount('${a.id}')" style="display:inline-block">${i18n.t('common.delete')}</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderTransactionFilters(currentFilter) {
  return `
    <div style="display:flex;gap:4px;padding:6px 0 2px">
      <span class="ca" style="font-size:11px;background:${currentFilter === 'all' ? 'var(--adim)' : 'transparent'};padding:4px 12px;border-radius:var(--rpill);font-weight:${currentFilter === 'all' ? '600' : '400'};cursor:pointer" onclick="App._setTxFilter('all')">All</span>
      <span class="ca" style="font-size:11px;background:${currentFilter === 'income' ? 'rgba(0,229,160,.15)' : 'transparent'};padding:4px 12px;border-radius:var(--rpill);font-weight:${currentFilter === 'income' ? '600' : '400'};cursor:pointer;color:${currentFilter === 'income' ? 'var(--accent)' : ''}" onclick="App._setTxFilter('income')">Income</span>
      <span class="ca" style="font-size:11px;background:${currentFilter === 'expense' ? 'rgba(255,77,106,.15)' : 'transparent'};padding:4px 12px;border-radius:var(--rpill);font-weight:${currentFilter === 'expense' ? '600' : '400'};cursor:pointer;color:${currentFilter === 'expense' ? 'var(--danger)' : ''}" onclick="App._setTxFilter('expense')">Expenses</span>
    </div>`;
}

function renderTransactionsSection(s, app) {
  const txFilter = app._txFilter || 'all';
  const accounts = s.accounts || [];
  let transactions = s.transactions || [];
  if (txFilter === 'income') transactions = transactions.filter(t => t.type === 'income');
  else if (txFilter === 'expense') transactions = transactions.filter(t => t.type === 'expense');
  const grouped = {};
  const sorted = sortBy(transactions, t => t.date, true).slice(0, 30);
  sorted.forEach(t => {
    const key = t.date || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">${i18n.t('finance.transactions')}</span>
        <span class="ca" onclick="App.sheets.transaction()">${i18n.t('finance.add')}</span>
      </div>
      ${renderTransactionFilters(txFilter)}
      <div class="dr" id="tx-list" style="padding-top:2px">
        ${sorted.length === 0 ? `
          <div class="empty" style="text-align:center;padding:14px 4px">
            <div style="font-size:28px;margin-bottom:4px">📭</div>
            <div style="font-size:13px;color:var(--ts)">${txFilter === 'all' ? 'No transactions yet.' : txFilter === 'income' ? 'No income logged yet.' : 'No expenses logged yet.'}</div>
            <div style="font-size:11px;color:var(--tm);margin-top:2px">Tap + Add to log one.</div>
          </div>
        ` : dateKeys.map(dateKey => `
          <div style="font-size:10px;color:var(--tm);padding:8px 4px 3px;font-family:var(--mono);display:flex;justify-content:space-between;align-items:center">
            <span>${dateKey === today() ? 'Today' : dateKey === yesterday() ? 'Yesterday' : dateStrShort(dateKey)}</span>
            <span style="font-size:9px;color:var(--tm)">${grouped[dateKey].length} ${grouped[dateKey].length === 1 ? 'txn' : 'txns'}</span>
          </div>
          ${grouped[dateKey].map(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            const col = t.type === 'income' ? 'var(--accent)' : 'var(--danger)';
            const bg = t.type === 'income' ? 'rgba(0,229,160,.12)' : 'rgba(255,77,106,.12)';
            return `
              <div class="dri" style="padding:7px 0">
                <div class="dri-l">
                  <div class="dri-ic" style="background:${bg};width:30px;height:30px;font-size:14px">${t.type === 'income' ? '💰' : '💸'}</div>
                  <div style="flex:1;min-width:0">
                    <div class="dri-name" style="font-size:12px">${escapeHtml(t.category)}${t.note ? ' <span style="color:var(--tm);font-weight:400">·</span> ' + escapeHtml(t.note) : ''}</div>
                    <div class="dri-sub" style="font-size:10px">${acc ? escapeHtml(acc.name) : '?'}</div>
                  </div>
                </div>
                <div class="dri-r" style="flex-direction:column;align-items:flex-end;gap:1px">
                  <span class="dri-val" style="color:${col};font-size:13px">${t.type === 'income' ? '+' : ''}${t.amount.toFixed(2)}</span>
                  <span class="del-btn" onclick="App._deleteTx('${t.id}')" style="font-size:9px">${i18n.t('common.delete')}</span>
                </div>
              </div>`;
          }).join('')}
        `).join('')}
      </div>
    </div>`;
}

function renderMonthlySummary(s) {
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const monthTxs = (s.transactions || []).filter(t => t.date && t.date.startsWith(monthStr));
  const prevTxs = (s.transactions || []).filter(t => t.date && t.date.startsWith(prevMonth));
  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpenses;
  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : null;
  const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) : null;

  const spendingByCat = {};
  monthTxs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Other';
    spendingByCat[cat] = (spendingByCat[cat] || 0) + Math.abs(t.amount);
  });
  const sortedCats = Object.entries(spendingByCat).sort((a, b) => b[1] - a[1]);
  const maxSpend = sortedCats.length > 0 ? sortedCats[0][1] : 1;
  const totalSpend = totalExpenses;

  const todayExpenses = monthTxs.filter(t => t.type === 'expense' && t.date === today()).reduce((s, t) => s + Math.abs(t.amount), 0);
  const avgDaily = now.getDate() > 0 ? totalExpenses / now.getDate() : 0;
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Monthly Summary</span>
        <span style="font-size:10px;color:var(--tm)">${monthName(now.toISOString().slice(0,10))}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:2px 0 6px">
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px 6px">
          <div style="font-size:17px;font-weight:600;font-family:var(--mono);color:var(--accent)">+${totalIncome.toFixed(2)}</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Income</div>
          ${incomeChange ? `<div style="font-size:9px;color:${incomeChange >= 0 ? 'var(--accent)' : 'var(--danger)'}">${incomeChange >= 0 ? '↑' : '↓'} ${Math.abs(incomeChange)}%</div>` : ''}
        </div>
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px 6px">
          <div style="font-size:17px;font-weight:600;font-family:var(--mono);color:var(--danger)">-${totalExpenses.toFixed(2)}</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Expenses</div>
          ${expenseChange ? `<div style="font-size:9px;color:${expenseChange <= 0 ? 'var(--accent)' : 'var(--danger)'}">${expenseChange <= 0 ? '↓' : '↑'} ${Math.abs(expenseChange)}%</div>` : ''}
        </div>
        <div style="text-align:center;background:var(--s2);border-radius:var(--rmd);padding:10px 6px">
          <div style="font-size:17px;font-weight:600;font-family:var(--mono);color:${net >= 0 ? 'var(--accent)' : 'var(--danger)'}">${net >= 0 ? '+' : ''}${net.toFixed(2)}</div>
          <div style="font-size:9px;color:var(--tm);text-transform:uppercase;letter-spacing:0.3px">Net</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:2px 0 4px">
        <div style="text-align:center;background:var(--s2);border-radius:var(--rsm);padding:6px">
          <div style="font-size:12px;font-family:var(--mono);color:var(--ts)">${todayExpenses.toFixed(2)}</div>
          <div style="font-size:9px;color:var(--tm)">Today</div>
        </div>
        <div style="text-align:center;background:var(--s2);border-radius:var(--rsm);padding:6px">
          <div style="font-size:12px;font-family:var(--mono);color:var(--ts)">${avgDaily.toFixed(2)}</div>
          <div style="font-size:9px;color:var(--tm)">Avg / Day</div>
        </div>
      </div>
      ${sortedCats.length > 0 ? `
        <div style="border-top:0.5px solid var(--border);padding-top:8px;margin-top:4px">
          <div style="font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;justify-content:space-between">
            <span>Spending by Category</span>
            <span>${totalSpend.toFixed(2)} total</span>
          </div>
          ${sortedCats.slice(0, 10).map(([cat, amt]) => {
            const pct = totalSpend > 0 ? (amt / totalSpend) * 100 : 0;
            const barPct = (amt / maxSpend) * 100;
            return `
              <div class="corrrow" style="padding:4px 0">
                <span class="corr-l" style="font-size:11px;flex:1">${escapeHtml(cat)}</span>
                <div class="corr-r" style="gap:8px">
                  <div class="corrbar" style="width:60px"><div class="corrfill" style="width:${barPct}%;background:var(--accent)"></div></div>
                  <span style="font-size:11px;font-family:var(--mono);color:var(--ts);min-width:65px;text-align:right">${amt.toFixed(2)}</span>
                  <span style="font-size:9px;color:var(--tm);min-width:35px;text-align:right">${pct.toFixed(1)}%</span>
                </div>
              </div>`;
          }).join('')}
          ${sortedCats.length > 10 ? `<div style="text-align:center;padding:4px 0 0;font-size:10px;color:var(--tm)">+${sortedCats.length - 10} more categories</div>` : ''}
        </div>
      ` : '<div class="empty" style="text-align:center">No expenses this month.</div>'}
    </div>`;
}

function renderBudgetSection(s) {
  const budgets = s.budgets || [];
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const monthTxs = (s.transactions || []).filter(t => t.date && t.date.startsWith(monthStr));
  const budgetSpending = {};
  monthTxs.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Other';
    budgetSpending[cat] = (budgetSpending[cat] || 0) + Math.abs(t.amount);
  });
  const budgetWarnings = budgets.filter(b => (budgetSpending[b.category] || 0) > b.limit);
  const onTrack = budgets.filter(b => (budgetSpending[b.category] || 0) <= b.limit * 0.75);
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Budget Progress</span>
        <div style="display:flex;align-items:center;gap:6px">
          ${budgetWarnings.length > 0 ? `<span style="font-size:10px;color:var(--danger);background:rgba(255,77,106,.12);padding:2px 8px;border-radius:var(--rpill)">${budgetWarnings.length} over</span>` : ''}
          <span class="ca" onclick="App.sheets.budget()">+ Add</span>
        </div>
      </div>
      <div id="budget-list">
        ${budgets.length === 0 ? `
          <div class="empty" style="text-align:center;padding:14px 4px">
            <div style="font-size:28px;margin-bottom:4px">📋</div>
            <div style="font-size:13px;color:var(--ts)">No budgets set.</div>
            <div style="font-size:11px;color:var(--tm);margin-top:2px">Add a budget to track spending limits by category.</div>
          </div>
        ` : budgets.map(b => {
          const spent = budgetSpending[b.category] || 0;
          const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
          const over = spent > b.limit;
          const remaining = Math.max(0, b.limit - spent);
          const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
          const dailyAvailable = daysLeftInMonth > 0 ? remaining / daysLeftInMonth : 0;
          return `
            <div class="dri" style="padding:10px 0">
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <div class="dri-l" style="gap:6px">
                    <div class="dri-name" style="font-size:12px">${escapeHtml(b.category)}</div>
                    <span style="font-size:9px;color:var(--tm);font-family:var(--mono)">${b.period || 'monthly'}</span>
                  </div>
                  <div style="text-align:right">
                    <span style="font-size:13px;font-family:var(--mono);font-weight:600;color:${over ? 'var(--danger)' : 'var(--ts)'}">${spent.toFixed(2)}</span>
                    <span style="font-size:10px;color:var(--tm)"> / ${b.limit.toFixed(2)}</span>
                  </div>
                </div>
                <div class="pb" style="margin-top:2px"><div class="pbf" style="width:${pct}%;background:${over ? 'var(--danger)' : pct > 75 ? 'var(--warn)' : 'var(--accent)'};transition:width 0.6s cubic-bezier(0.4,0,0.2,1)"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:4px">
                  <span style="font-size:9px;color:${over ? 'var(--danger)' : 'var(--tm)'}">${over ? `${(spent - b.limit).toFixed(2)} over` : `${remaining.toFixed(2)} left`}</span>
                  <span style="font-size:9px;color:var(--tm)">${pct.toFixed(0)}% used</span>
                </div>
                ${!over && dailyAvailable > 0 ? `<div style="font-size:9px;color:var(--tm)">${dailyAvailable.toFixed(2)}/day remaining</div>` : ''}
              </div>
              <div class="dri-r" style="margin-left:8px">
                <span class="del-btn" onclick="App._deleteBudget('${b.id}')" style="display:inline-block">${i18n.t('common.delete')}</span>
              </div>
            </div>`;
        }).join('')}
      </div>
      ${budgets.length > 0 ? `
        <div style="border-top:0.5px solid var(--border);padding-top:6px;margin-top:2px">
          <div style="display:flex;gap:8px;justify-content:center;font-size:10px;color:var(--tm)">
            <span>🟢 ${onTrack.length} on track</span>
            <span>🟡 ${budgets.length - onTrack.length - budgetWarnings.length} watching</span>
            <span>🔴 ${budgetWarnings.length} over budget</span>
          </div>
        </div>
      ` : ''}
    </div>`;
}

function renderTopCategories(s) {
  const now = new Date();
  const monthStr = now.toISOString().slice(0, 7);
  const monthTxs = (s.transactions || []).filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr));
  const byCategory = {};
  monthTxs.forEach(t => {
    const cat = t.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += Math.abs(t.amount);
    byCategory[cat].count++;
  });
  const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  if (sorted.length === 0) return '';
  const topTotal = sorted.reduce((sum, [, v]) => sum + v.total, 0);
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Top Spending Categories</span>
      </div>
      ${sorted.map(([cat, data], idx) => {
        const pct = (data.total / topTotal) * 100;
        const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
          <div class="corrrow" style="padding:6px 0">
            <span class="corr-l" style="flex:1;font-size:12px">${rankEmojis[idx] || ''} ${escapeHtml(cat)}</span>
            <div class="corr-r" style="gap:6px">
              <span style="font-size:10px;color:var(--tm)">${data.count}x</span>
              <div class="corrbar" style="width:50px"><div class="corrfill" style="width:${pct}%;background:var(--accent)"></div></div>
              <span style="font-size:11px;font-family:var(--mono);color:var(--ts);min-width:55px;text-align:right">${data.total.toFixed(2)}</span>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderYearOverYear(s) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthlyData = {};
  for (let m = 0; m < 12; m++) {
    const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
    monthlyData[key] = { income: 0, expense: 0 };
  }
  (s.transactions || []).forEach(t => {
    if (!t.date) return;
    const key = t.date.slice(0, 7);
    if (monthlyData[key]) {
      if (t.type === 'income') monthlyData[key].income += Math.abs(t.amount);
      else if (t.type === 'expense') monthlyData[key].expense += Math.abs(t.amount);
    }
  });
  const months = Object.entries(monthlyData);
  const maxVal = Math.max(...months.map(([, d]) => Math.max(d.income, d.expense)), 1);
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Year Overview</span>
        <span style="font-size:10px;color:var(--tm)">${currentYear}</span>
      </div>
      <div style="display:flex;gap:3px;height:80px;align-items:flex-end;padding:4px 0">
        ${months.map(([key, data]) => {
          const iH = (data.income / maxVal) * 80;
          const eH = (data.expense / maxVal) * 80;
          const monthLabel = new Date(key + '-01').toLocaleDateString('en-GB', { month: 'short' });
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">
              <div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:80px;gap:1px">
                <div style="width:60%;background:var(--danger);border-radius:2px 2px 0 0;height:${eH}px;min-height:${data.expense > 0 ? 2 : 0}px;transition:height 0.4s"></div>
                <div style="width:60%;background:var(--accent);border-radius:2px 2px 0 0;height:${iH}px;min-height:${data.income > 0 ? 2 : 0}px;transition:height 0.4s"></div>
              </div>
              <span style="font-size:8px;color:var(--tm);font-family:var(--mono)">${monthLabel}</span>
            </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:4px;font-size:9px;color:var(--tm)">
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Income</span>
        <span><span style="display:inline-block;width:8px;height:8px;background:var(--danger);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Expenses</span>
      </div>
    </div>`;
}

function renderRecentActivity(s) {
  const recent = (s.transactions || []).slice(0, 3);
  if (recent.length === 0 && (s.accounts || []).length === 0) return '';
  const recentLogs = (s.logs || []).filter(l => l.type === 'finance').slice(0, 3);
  if (recentLogs.length === 0) return '';
  return `
    <div class="card">
      <div class="ch">
        <span class="ct">Recent Activity</span>
      </div>
      ${recentLogs.map(l => `
        <div class="li">
          <div class="lic" style="background:rgba(245,200,66,.12);font-size:14px">${l.emoji || '💰'}</div>
          <div class="linfo">
            <div class="ltit">${escapeHtml(l.title)}</div>
            <div class="lsub">${l.time} · ${l.date}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderFooter() {
  return `
    <div class="footer" style="padding:4px 0 12px">
      <p>Built by <strong>Neura Lumina</strong> · <a href="https://github.com/AmelCMM" target="_blank">@AmelCMM</a></p>
    </div>
    <div style="height:8px"></div>`;
}

export function renderFinance(s, app) {
  const scrollEl = document.querySelector('#scr-finance .scroll');
  if (!scrollEl) return;
  scrollEl.innerHTML = `
    ${renderQuickStats(s)}
    ${renderAccountsSection(s)}
    ${renderTransactionsSection(s, app)}
    ${renderMonthlySummary(s)}
    ${renderBudgetSection(s)}
    ${renderTopCategories(s)}
    ${renderYearOverYear(s)}
    ${renderRecentActivity(s)}
    ${renderFooter()}
  `;
}

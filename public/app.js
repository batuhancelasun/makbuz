// State management
let expenses = [];
let categories = [];
let settings = {};
let currentView = 'dashboardView';
let currentTab = 'dashboard';
let editingExpenseId = null;
let chart = null;
let monthlyChart = null;
let yearlyChart = null;
let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth();

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    await loadSettings();
    await loadCategories();
    await loadExpenses();
    setupEventListeners();
    setupTabNavigation();
    applyTheme();
    updateStats();
    renderExpenses();
    renderChart();
    renderItemsStats();
    populateFilterCategory();
});

// Load data from API
async function loadExpenses() {
    try {
        const response = await fetch(`${API_BASE}/expenses`);
        expenses = await response.json();
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        renderCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        settings = await response.json();
        applySettings();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Apply settings to UI
function applySettings() {
    if (settings.currency) {
        document.getElementById('currency').value = settings.currency;
    }
    if (settings.theme) {
        document.getElementById('theme').value = settings.theme;
        applyTheme();
    }
    if (settings.startDate) {
        document.getElementById('startDate').value = settings.startDate;
    }
    if (settings.geminiApiKey) {
        document.getElementById('geminiApiKey').value = settings.geminiApiKey;
    }
}

// Theme management
function applyTheme() {
    const theme = settings.theme || 'system';
    let themeValue = theme;
    
    if (theme === 'system') {
        themeValue = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', themeValue);
}

// Tab Navigation
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Hide all tab views and show the selected one
    const tabViews = {
        'dashboard': 'dashboardView',
        'receipts': 'receiptsView',
        'items': 'itemsView',
        'reports': 'reportsView',
        'recurring': 'recurringView'
    };
    
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    const viewId = tabViews[tab];
    if (viewId) {
        document.getElementById(viewId).classList.add('active');
        currentView = viewId;
    }
    
    // Render content for the selected tab
    if (tab === 'receipts') {
        renderAllExpenses();
    } else if (tab === 'items') {
        renderAllItems();
    } else if (tab === 'recurring') {
        renderRecurring();
    } else if (tab === 'reports') {
        renderReports();
    }
}

// Event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('addExpenseBtn')?.addEventListener('click', () => showView('expenseFormView', 'Add Expense'));
    document.getElementById('scanReceiptBtn')?.addEventListener('click', () => showView('scannerView'));
    document.getElementById('settingsBtn').addEventListener('click', () => showView('settingsView'));
    document.getElementById('cancelBtn').addEventListener('click', () => switchTab(currentTab));
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => switchTab(currentTab));
    }
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Additional buttons in other tabs
    document.getElementById('addExpenseBtn2')?.addEventListener('click', () => showView('expenseFormView', 'Add Expense'));
    document.getElementById('scanReceiptBtn2')?.addEventListener('click', () => showView('scannerView'));
    document.getElementById('addRecurringBtn')?.addEventListener('click', () => {
        showView('expenseFormView', 'Add Recurring Transaction');
        document.getElementById('isRecurring').checked = true;
        document.getElementById('recurringOptions').classList.add('visible');
    });
    
    // Filters
    document.getElementById('filterCategory')?.addEventListener('change', renderAllExpenses);
    document.getElementById('filterType')?.addEventListener('change', renderAllExpenses);
    document.getElementById('filterMonth')?.addEventListener('change', renderAllExpenses);
    document.getElementById('itemSearch')?.addEventListener('input', renderAllItems);
    
    // Reports controls
    setupReportsListeners();

    // Forms
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    
    // Items input handling
    setupItemsInput();
    
    // Transaction type buttons
    const expenseTypeBtn = document.getElementById('expenseTypeBtn');
    const incomeTypeBtn = document.getElementById('incomeTypeBtn');
    const isIncomeInput = document.getElementById('isIncome');
    
    if (expenseTypeBtn && incomeTypeBtn && isIncomeInput) {
        expenseTypeBtn.addEventListener('click', () => {
            expenseTypeBtn.classList.add('active');
            incomeTypeBtn.classList.remove('active');
            isIncomeInput.value = 'false';
        });
        
        incomeTypeBtn.addEventListener('click', () => {
            incomeTypeBtn.classList.add('active');
            expenseTypeBtn.classList.remove('active');
            isIncomeInput.value = 'true';
        });
    }
    
    // Recurring expense toggle
    document.getElementById('isRecurring')?.addEventListener('change', (e) => {
        const recurringOptions = document.getElementById('recurringOptions');
        if (recurringOptions) {
            if (e.target.checked) {
                recurringOptions.classList.add('visible');
            } else {
                recurringOptions.classList.remove('visible');
            }
        }
    });

    // Receipt scanning
    document.getElementById('receiptInput').addEventListener('change', handleReceiptUpload);
    document.getElementById('useScanDataBtn').addEventListener('click', useScanData);
    document.getElementById('rescanBtn').addEventListener('click', resetScanner);

    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
}

// View management
function showView(viewId, formTitle = '') {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;

    if (formTitle) {
        document.getElementById('formTitle').textContent = formTitle;
    }

    if (viewId === 'expenseFormView' && !editingExpenseId) {
        resetExpenseForm();
    }
}

// Theme toggle
function toggleTheme() {
    const currentTheme = settings.theme || 'system';
    let newTheme;
    
    if (currentTheme === 'system') {
        newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
    } else if (currentTheme === 'light') {
        newTheme = 'dark';
    } else {
        newTheme = 'light';
    }
    
    settings.theme = newTheme;
    document.getElementById('theme').value = newTheme;
    applyTheme();
    saveSettings();
}

// Category select rendering
function renderCategorySelect() {
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Select category</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Items management - items are stored as objects { name: string, price: number }
let currentItems = [];

function setupItemsInput() {
    const itemsInput = document.getElementById('itemsInput');
    const itemPriceInput = document.getElementById('itemPriceInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsList = document.getElementById('itemsList');
    
    if (!itemsInput || !itemsList) return;
    
    // Add item on Enter key
    itemsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCurrentItem();
        }
    });
    
    // Add item on button click
    if (addItemBtn) {
        addItemBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addCurrentItem();
        });
    }
}

function addCurrentItem() {
    const itemsInput = document.getElementById('itemsInput');
    const itemPriceInput = document.getElementById('itemPriceInput');
    
    const name = itemsInput?.value?.trim();
    const price = parseFloat(itemPriceInput?.value) || 0;
    
    if (name && !currentItems.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        currentItems.push({ name, price });
        updateItemsDisplay();
        if (itemsInput) itemsInput.value = '';
        if (itemPriceInput) itemPriceInput.value = '';
        itemsInput?.focus();
    }
}

function updateItemsDisplay() {
    const itemsList = document.getElementById('itemsList');
    const hiddenInput = document.getElementById('items');
    
    if (!itemsList || !hiddenInput) return;
    
    itemsList.innerHTML = currentItems.map((item, index) => {
        const itemName = typeof item === 'object' ? item.name : item;
        const itemPrice = typeof item === 'object' ? item.price : 0;
        return `
            <span class="item-tag" data-index="${index}">
                <span class="item-tag-name">${itemName}</span>
                ${itemPrice > 0 ? `<span class="item-tag-price">${formatCurrency(itemPrice)}</span>` : ''}
                <button type="button" class="item-tag-remove" onclick="removeItem(${index})">×</button>
            </span>
        `;
    }).join('');
    
    // Store as JSON string for the hidden input
    hiddenInput.value = JSON.stringify(currentItems);
}

function removeItem(index) {
    currentItems.splice(index, 1);
    updateItemsDisplay();
}

// Make removeItem available globally
window.removeItem = removeItem;

// Expense form handling
function resetExpenseForm() {
    editingExpenseId = null;
    document.getElementById('expenseForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('formTitle').textContent = 'Add Expense';
    currentItems = [];
    updateItemsDisplay();
    
    // Reset transaction type to expense
    const expenseTypeBtn = document.getElementById('expenseTypeBtn');
    const incomeTypeBtn = document.getElementById('incomeTypeBtn');
    const isIncomeInput = document.getElementById('isIncome');
    if (expenseTypeBtn) expenseTypeBtn.classList.add('active');
    if (incomeTypeBtn) incomeTypeBtn.classList.remove('active');
    if (isIncomeInput) isIncomeInput.value = 'false';
    
    // Reset recurring options
    const recurringOptions = document.getElementById('recurringOptions');
    if (recurringOptions) recurringOptions.classList.remove('visible');
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Parse items - currentItems now contains objects with name and price
    let items = currentItems.length > 0 ? currentItems : [];
    
    // Fallback: try to parse from hidden input if currentItems is empty
    if (items.length === 0) {
        try {
            const hiddenItems = formData.get('items');
            if (hiddenItems) {
                items = JSON.parse(hiddenItems);
            }
        } catch (e) {
            items = [];
        }
    }
    
    const expense = {
        place: formData.get('place'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        date: formData.get('date'),
        items: items,
        notes: formData.get('notes'),
        isIncome: document.getElementById('isIncome')?.value === 'true',
        isRecurring: formData.get('isRecurring') === 'on',
        recurringFrequency: formData.get('recurringFrequency') || null,
        recurringEndDate: formData.get('recurringEndDate') || null
    };

    if (editingExpenseId) {
        updateExpense(editingExpenseId, expense);
    } else {
        createExpense(expense);
    }
}

async function createExpense(expense) {
    try {
        const response = await fetch(`${API_BASE}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        const result = await response.json();
        
        // Handle recurring expenses (returns object with created count and expenses array)
        if (result.created && result.expenses) {
            expenses.push(...result.expenses);
            alert(`Created ${result.created} recurring expense${result.created > 1 ? 's' : ''}`);
        } else {
            // Single expense
            expenses.push(result);
        }
        
        updateStats();
        renderExpenses();
        renderChart();
        renderItemsStats();
        showView('dashboardView');
    } catch (error) {
        alert('Error creating expense: ' + error.message);
    }
}

async function updateExpense(id, expense) {
    try {
        const response = await fetch(`${API_BASE}/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        const updated = await response.json();
        const index = expenses.findIndex(e => e.id === id);
        if (index !== -1) {
            expenses[index] = updated;
        }
        updateStats();
        renderExpenses();
        renderChart();
        renderItemsStats();
        showView('dashboardView');
    } catch (error) {
        alert('Error updating expense: ' + error.message);
    }
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
        await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
        expenses = expenses.filter(e => e.id !== id);
        updateStats();
        renderExpenses();
        renderChart();
        renderItemsStats();
    } catch (error) {
        alert('Error deleting expense: ' + error.message);
    }
}

function editExpense(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    editingExpenseId = id;
    document.getElementById('place').value = expense.place || '';
    document.getElementById('category').value = expense.category || '';
    document.getElementById('amount').value = expense.amount || '';
    document.getElementById('date').value = expense.date || '';
    
    // Normalize items to new format { name, price }
    if (expense.items && Array.isArray(expense.items)) {
        currentItems = expense.items.map(item => {
            if (typeof item === 'object' && item.name) {
                return { name: item.name, price: item.price || 0 };
            } else if (typeof item === 'string') {
                return { name: item, price: 0 };
            }
            return { name: String(item), price: 0 };
        });
    } else {
        currentItems = [];
    }
    updateItemsDisplay();
    document.getElementById('notes').value = expense.notes || '';
    
    // Handle income/expense type buttons
    const expenseTypeBtn = document.getElementById('expenseTypeBtn');
    const incomeTypeBtn = document.getElementById('incomeTypeBtn');
    const isIncomeInput = document.getElementById('isIncome');
    
    if (expense.isIncome) {
        if (incomeTypeBtn) incomeTypeBtn.classList.add('active');
        if (expenseTypeBtn) expenseTypeBtn.classList.remove('active');
        if (isIncomeInput) isIncomeInput.value = 'true';
    } else {
        if (expenseTypeBtn) expenseTypeBtn.classList.add('active');
        if (incomeTypeBtn) incomeTypeBtn.classList.remove('active');
        if (isIncomeInput) isIncomeInput.value = 'false';
    }
    
    // Handle recurring checkbox and options
    const isRecurringCheckbox = document.getElementById('isRecurring');
    const recurringOptions = document.getElementById('recurringOptions');
    if (isRecurringCheckbox) {
        isRecurringCheckbox.checked = expense.isRecurring || false;
        if (recurringOptions) {
            if (expense.isRecurring) {
                recurringOptions.classList.add('visible');
            } else {
                recurringOptions.classList.remove('visible');
            }
        }
    }
    if (expense.recurringFrequency) {
        document.getElementById('recurringFrequency').value = expense.recurringFrequency;
    }
    if (expense.recurringEndDate) {
        document.getElementById('recurringEndDate').value = expense.recurringEndDate;
    }
    
    document.getElementById('formTitle').textContent = 'Edit Expense';
    showView('expenseFormView');
}

// Render expenses list
function renderExpenses() {
    const container = document.getElementById('expensesList');
    const recent = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No expenses yet. Add your first expense!</p></div>';
        return;
    }

    container.innerHTML = recent.map(expense => `
        <div class="expense-item clickable" onclick="showExpenseDetail('${expense.id}')">
            <div class="expense-info">
                <div class="expense-place">
                    ${expense.isIncome ? '💰 ' : ''}${expense.place || 'Unknown'}
                    ${expense.isRecurring ? ' 🔄' : ''}
                </div>
                <div class="expense-details">
                    ${expense.category} • ${formatDate(expense.date)}${expense.items && expense.items.length > 0 ? ' • ' + expense.items.length + ' items' : ''}
                </div>
            </div>
            <div class="expense-amount ${expense.isIncome ? 'income-amount' : ''}">${expense.isIncome ? '+' : ''}${formatCurrency(expense.amount)}</div>
            <div class="expense-actions" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Stats calculation
function updateStats() {
    const currency = settings.currency || '€';
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startDate = settings.startDate || 1;
    
    // Calculate month range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), startDate);
    if (now.getDate() < startDate) {
        monthStart.setMonth(monthStart.getMonth() - 1);
    }
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // Separate expenses and income
    const todayExpenses = expenses
        .filter(e => e.date === today && !e.isIncome)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayIncome = expenses
        .filter(e => e.date === today && e.isIncome)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayTotal = todayExpenses - todayIncome;

    const monthExpenses = expenses
        .filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= monthStart && expenseDate < monthEnd && !e.isIncome;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthIncome = expenses
        .filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= monthStart && expenseDate < monthEnd && e.isIncome;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthTotal = monthExpenses - monthIncome;

    const totalExpenses = expenses
        .filter(e => !e.isIncome)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncome = expenses
        .filter(e => e.isIncome)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const netTotal = totalExpenses - totalIncome;

    document.getElementById('todayTotal').textContent = formatCurrency(Math.abs(todayTotal), currency);
    document.getElementById('monthTotal').textContent = formatCurrency(Math.abs(monthTotal), currency);
    document.getElementById('totalExpenses').textContent = formatCurrency(Math.abs(netTotal), currency);
}

// Chart rendering
function renderChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }

    // Group expenses by category (only expenses, not income)
    const categoryTotals = {};
    expenses.forEach(expense => {
        if (!expense.isIncome) {
            const cat = expense.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (expense.amount || 0);
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (data.length === 0) {
        ctx.parentElement.innerHTML = '<p class="empty-state">No data to display</p>';
        return;
    }

    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
                    '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const category = labels[index];
                    showCategoryDetail(category);
                }
            }
        }
    });
}

function showCategoryDetail(category) {
    const categoryExpenses = expenses.filter(e => e.category === category);
    
    if (categoryExpenses.length === 0) return;
    
    const totalAmount = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalItems = categoryExpenses.reduce((sum, e) => sum + (e.items ? e.items.length : 0), 0);
    
    const content = `
        <div class="detail-item">
            <span class="detail-label">Category</span>
            <div class="detail-value">${category}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Expenses</span>
            <div class="detail-value">${categoryExpenses.length}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Amount</span>
            <div class="detail-value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Items</span>
            <div class="detail-value">${totalItems}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Expenses</span>
            <div class="detail-items-list">
                ${categoryExpenses.map(expense => `
                    <div class="detail-item-tag clickable" onclick="showExpenseDetail('${expense.id}')" style="display: block; margin-bottom: 0.5rem;">
                        <strong>${expense.place || 'Unknown'}</strong> - ${formatDate(expense.date)} - ${formatCurrency(expense.amount)}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('detailTitle').textContent = 'Category Details';
    document.getElementById('detailContent').innerHTML = content;
    showView('detailView');
}

window.showCategoryDetail = showCategoryDetail;

// Render items statistics
function renderItemsStats() {
    const container = document.getElementById('itemsStats');
    if (!container) return;

    // Count all items across all expenses
    const itemCounts = {};
    expenses.forEach(expense => {
        if (expense.items && Array.isArray(expense.items)) {
            expense.items.forEach(item => {
                const itemName = getItemName(item);
                if (itemName) {
                    itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
                }
            });
        }
    });

    // Sort by count and get top 3
    const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (sortedItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No items tracked yet</p>';
        return;
    }

    container.innerHTML = sortedItems.map(([item, count]) => `
        <div class="item-stat clickable" onclick="showItemDetail('${item}')">
            <span class="item-name">${item.charAt(0).toUpperCase() + item.slice(1)}</span>
            <span class="item-count">${count}x</span>
        </div>
    `).join('');
}

// Populate filter category dropdown
function populateFilterCategory() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Render all expenses for Receipts tab
function renderAllExpenses() {
    const container = document.getElementById('allExpensesList');
    if (!container) return;
    
    // Get filter values
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const typeFilter = document.getElementById('filterType')?.value || '';
    const monthFilter = document.getElementById('filterMonth')?.value || '';
    
    // Filter expenses
    let filtered = [...expenses];
    
    if (categoryFilter) {
        filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    if (typeFilter === 'expense') {
        filtered = filtered.filter(e => !e.isIncome);
    } else if (typeFilter === 'income') {
        filtered = filtered.filter(e => e.isIncome);
    }
    
    if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        filtered = filtered.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
        });
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No receipts found</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(expense => `
        <div class="expense-item clickable" onclick="showExpenseDetail('${expense.id}')">
            <div class="expense-info">
                <div class="expense-place">
                    ${expense.isIncome ? '💰 ' : '🧾 '}${expense.place || 'Unknown'}
                    ${expense.isRecurring ? ' 🔄' : ''}
                </div>
                <div class="expense-details">
                    ${expense.category} • ${formatDate(expense.date)}${expense.items && expense.items.length > 0 ? ' • ' + expense.items.length + ' items' : ''}
                </div>
            </div>
            <div class="expense-amount ${expense.isIncome ? 'income-amount' : ''}">${expense.isIncome ? '+' : ''}${formatCurrency(expense.amount)}</div>
            <div class="expense-actions" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Helper function to get item name (handles both old and new format)
function getItemName(item) {
    if (typeof item === 'object' && item.name) {
        return item.name.trim().toLowerCase();
    } else if (typeof item === 'string') {
        return item.trim().toLowerCase();
    }
    return '';
}

// Helper function to get item price (handles both old and new format)
function getItemPrice(item) {
    if (typeof item === 'object' && item.price !== undefined) {
        return parseFloat(item.price) || 0;
    }
    return 0;
}

// Render all items for Items tab
function renderAllItems() {
    const container = document.getElementById('allItemsList');
    if (!container) return;
    
    const searchQuery = document.getElementById('itemSearch')?.value?.toLowerCase() || '';
    
    // Count all items across all expenses with their individual prices
    const itemData = {};
    expenses.forEach(expense => {
        if (expense.items && Array.isArray(expense.items)) {
            expense.items.forEach(item => {
                const itemName = getItemName(item);
                const itemPrice = getItemPrice(item);
                
                if (itemName) {
                    if (!itemData[itemName]) {
                        itemData[itemName] = { count: 0, totalSpent: 0, lastDate: null, avgPrice: 0 };
                    }
                    itemData[itemName].count++;
                    itemData[itemName].totalSpent += itemPrice;
                    const expenseDate = new Date(expense.date);
                    if (!itemData[itemName].lastDate || expenseDate > new Date(itemData[itemName].lastDate)) {
                        itemData[itemName].lastDate = expense.date;
                    }
                }
            });
        }
    });
    
    // Calculate average price
    Object.values(itemData).forEach(data => {
        if (data.count > 0) {
            data.avgPrice = data.totalSpent / data.count;
        }
    });
    
    // Convert to array and filter by search
    let items = Object.entries(itemData)
        .map(([name, data]) => ({ name, ...data }))
        .filter(item => item.name.includes(searchQuery))
        .sort((a, b) => b.count - a.count);
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>No items found</p></div>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="item-card" onclick="showItemDetail('${item.name}')">
            <div class="item-card-header">
                <span class="item-card-name">${item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>
                <span class="item-card-count">${item.count}x</span>
            </div>
            <div class="item-card-stats">
                <span>💰 ${formatCurrency(item.totalSpent)}</span>
                <span>📊 ~${formatCurrency(item.avgPrice)}/ea</span>
            </div>
        </div>
    `).join('');
}

// Render recurring transactions
function renderRecurring() {
    const container = document.getElementById('recurringList');
    if (!container) return;
    
    // Find unique recurring patterns (group by place + category + amount)
    const recurringMap = new Map();
    
    expenses.filter(e => e.isRecurring).forEach(expense => {
        const key = `${expense.place}-${expense.category}-${expense.amount}-${expense.recurringFrequency}`;
        if (!recurringMap.has(key)) {
            recurringMap.set(key, {
                place: expense.place,
                category: expense.category,
                amount: expense.amount,
                frequency: expense.recurringFrequency,
                isIncome: expense.isIncome,
                count: 0,
                nextDate: null
            });
        }
        const item = recurringMap.get(key);
        item.count++;
        const expenseDate = new Date(expense.date);
        if (!item.nextDate || expenseDate > new Date(item.nextDate)) {
            item.nextDate = expense.date;
        }
    });
    
    const recurring = Array.from(recurringMap.values());
    
    if (recurring.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No recurring transactions</p></div>';
        return;
    }
    
    const frequencyLabels = {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
        yearly: 'Yearly'
    };
    
    container.innerHTML = recurring.map(item => `
        <div class="recurring-item">
            <div class="recurring-info">
                <div class="recurring-place">
                    ${item.isIncome ? '💰' : '💸'} ${item.place || 'Unknown'}
                </div>
                <div class="recurring-details">
                    ${item.category} • ${item.count} transactions
                </div>
            </div>
            <span class="recurring-frequency">🔄 ${frequencyLabels[item.frequency] || item.frequency}</span>
            <div class="recurring-amount ${item.isIncome ? 'income-amount' : ''}">${item.isIncome ? '+' : ''}${formatCurrency(item.amount)}</div>
        </div>
    `).join('');
}

// Reports functions
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function setupReportsListeners() {
    // Period selector
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const period = btn.dataset.period;
            document.getElementById('monthlyReport').classList.toggle('hidden', period !== 'monthly');
            document.getElementById('yearlyReport').classList.toggle('hidden', period !== 'yearly');
            
            if (period === 'monthly') {
                renderMonthlyReport();
            } else {
                renderYearlyReport();
            }
        });
    });
    
    // Month navigation (for monthly view)
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        reportMonth--;
        if (reportMonth < 0) {
            reportMonth = 11;
            reportYear--;
        }
        renderMonthlyReport();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        reportMonth++;
        if (reportMonth > 11) {
            reportMonth = 0;
            reportYear++;
        }
        renderMonthlyReport();
    });
    
    // Year navigation (for yearly view)
    document.getElementById('prevYear')?.addEventListener('click', () => {
        reportYear--;
        renderYearlyReport();
    });
    
    document.getElementById('nextYear')?.addEventListener('click', () => {
        reportYear++;
        renderYearlyReport();
    });
}

function renderReports() {
    renderMonthlyReport();
}

function renderMonthlyReport() {
    // Update header
    document.getElementById('reportMonth').textContent = `${monthNames[reportMonth]} ${reportYear}`;
    
    // Get expenses for this month
    const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === reportYear && d.getMonth() === reportMonth;
    });
    
    const income = monthExpenses.filter(e => e.isIncome).reduce((sum, e) => sum + (e.amount || 0), 0);
    const expense = monthExpenses.filter(e => !e.isIncome).reduce((sum, e) => sum + (e.amount || 0), 0);
    const net = income - expense;
    
    // Update summary
    document.getElementById('monthIncome').textContent = formatCurrency(income);
    document.getElementById('monthExpense').textContent = formatCurrency(expense);
    document.getElementById('monthNet').textContent = formatCurrency(net);
    
    // Group by category for chart
    const categoryData = {};
    monthExpenses.filter(e => !e.isIncome).forEach(e => {
        const cat = e.category || 'Uncategorized';
        categoryData[cat] = (categoryData[cat] || 0) + (e.amount || 0);
    });
    
    // Render chart (pie chart of expenses by category)
    renderMonthlyChart(categoryData);
    
    // Render breakdown (list of expenses)
    const container = document.getElementById('monthlyBreakdown');
    
    if (monthExpenses.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No transactions this month</p></div>';
        return;
    }
    
    // Sort by date descending
    const sorted = monthExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map(e => `
        <div class="month-row clickable" onclick="showExpenseDetail('${e.id}')">
            <span class="month-name">${e.isIncome ? '💰' : '🧾'} ${e.place || 'Unknown'}</span>
            <span class="month-expense">${formatDate(e.date)}</span>
            <span class="month-net ${e.isIncome ? 'positive' : 'negative'}">${e.isIncome ? '+' : '-'}${formatCurrency(e.amount)}</span>
        </div>
    `).join('');
}

function renderMonthlyChart(categoryData) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p class="empty-state">No expense data for this month</p>';
        return;
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
                    '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderYearlyReport() {
    document.getElementById('reportYear').textContent = reportYear;
    
    // Calculate monthly data for this year
    const monthData = [];
    let yearIncome = 0;
    let yearExpense = 0;
    
    for (let month = 0; month < 12; month++) {
        const monthExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === reportYear && d.getMonth() === month;
        });
        
        const income = monthExpenses.filter(e => e.isIncome).reduce((sum, e) => sum + (e.amount || 0), 0);
        const expense = monthExpenses.filter(e => !e.isIncome).reduce((sum, e) => sum + (e.amount || 0), 0);
        
        yearIncome += income;
        yearExpense += expense;
        
        monthData.push({
            name: monthNamesShort[month],
            month: month,
            income,
            expense,
            net: income - expense
        });
    }
    
    // Update summary
    document.getElementById('yearIncome').textContent = formatCurrency(yearIncome);
    document.getElementById('yearExpense').textContent = formatCurrency(yearExpense);
    document.getElementById('yearNet').textContent = formatCurrency(yearIncome - yearExpense);
    
    // Render chart
    renderYearlyChart(monthData);
    
    // Render breakdown
    const container = document.getElementById('yearlyBreakdown');
    container.innerHTML = monthData.map(m => `
        <div class="year-row" onclick="goToMonth(${reportYear}, ${m.month})">
            <span class="year-name">${m.name}</span>
            <span class="year-income">+${formatCurrency(m.income)}</span>
            <span class="year-expense">-${formatCurrency(m.expense)}</span>
            <span class="year-net ${m.net >= 0 ? 'positive' : 'negative'}">${m.net >= 0 ? '+' : ''}${formatCurrency(m.net)}</span>
        </div>
    `).join('');
}

function renderYearlyChart(monthData) {
    const ctx = document.getElementById('yearlyChart');
    if (!ctx) return;
    
    if (yearlyChart) {
        yearlyChart.destroy();
    }
    
    yearlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthData.map(m => m.name),
            datasets: [
                {
                    label: 'Income',
                    data: monthData.map(m => m.income),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: monthData.map(m => m.expense),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function goToMonth(year, month) {
    reportYear = year;
    reportMonth = month;
    // Switch to monthly view
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.period-btn[data-period="monthly"]').classList.add('active');
    document.getElementById('monthlyReport').classList.remove('hidden');
    document.getElementById('yearlyReport').classList.add('hidden');
    renderMonthlyReport();
}

window.goToMonth = goToMonth;

function filterByMonth(year, month) {
    // Switch to receipts tab with filter
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    document.getElementById('filterMonth').value = monthStr;
    switchTab('receipts');
}

function filterByYear(year) {
    // Switch to receipts tab - clear month filter first, then set year
    reportYear = year;
    document.getElementById('filterMonth').value = '';
    switchTab('receipts');
    // Filter by year in the list
    renderAllExpensesByYear(year);
}

function renderAllExpensesByYear(year) {
    const container = document.getElementById('allExpensesList');
    if (!container) return;
    
    const filtered = expenses
        .filter(e => new Date(e.date).getFullYear() === year)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>No receipts in ${year}</p></div>`;
        return;
    }
    
    container.innerHTML = filtered.map(expense => `
        <div class="expense-item clickable" onclick="showExpenseDetail('${expense.id}')">
            <div class="expense-info">
                <div class="expense-place">
                    ${expense.isIncome ? '💰 ' : '🧾 '}${expense.place || 'Unknown'}
                    ${expense.isRecurring ? ' 🔄' : ''}
                </div>
                <div class="expense-details">
                    ${expense.category} • ${formatDate(expense.date)}${expense.items && expense.items.length > 0 ? ' • ' + expense.items.length + ' items' : ''}
                </div>
            </div>
            <div class="expense-amount ${expense.isIncome ? 'income-amount' : ''}">${expense.isIncome ? '+' : ''}${formatCurrency(expense.amount)}</div>
            <div class="expense-actions" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Make filter functions global
window.filterByMonth = filterByMonth;
window.filterByYear = filterByYear;

// Detail view functions
function showExpenseDetail(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
    // Build items HTML with prices if available
    let itemsHtml = '';
    if (expense.items && expense.items.length > 0) {
        itemsHtml = `
        <div class="detail-item">
            <span class="detail-label">Items (${expense.items.length})</span>
            <div class="detail-items-list">
                ${expense.items.map(item => {
                    const name = getItemName(item) || (typeof item === 'string' ? item : '');
                    const price = getItemPrice(item);
                    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                    return `
                        <span class="detail-item-tag" onclick="showItemDetail('${name}')">
                            ${displayName}${price > 0 ? ` <small>(${formatCurrency(price)})</small>` : ''}
                        </span>
                    `;
                }).join('')}
            </div>
        </div>
        `;
    }
    
    const content = `
        <div class="detail-item">
            <span class="detail-label">Place</span>
            <div class="detail-value">${expense.place || 'Unknown'}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Category</span>
            <div class="detail-value">${expense.category || 'Uncategorized'}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Amount</span>
            <div class="detail-value">${expense.isIncome ? '+' : ''}${formatCurrency(expense.amount)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Date</span>
            <div class="detail-value">${formatDate(expense.date)}</div>
        </div>
        ${itemsHtml}
        ${expense.notes ? `
        <div class="detail-item">
            <span class="detail-label">Notes</span>
            <div class="detail-value">${expense.notes}</div>
        </div>
        ` : ''}
        ${expense.isRecurring ? `
        <div class="detail-item">
            <span class="detail-label">Recurring</span>
            <div class="detail-value">${expense.recurringFrequency || 'N/A'}</div>
        </div>
        ` : ''}
    `;
    
    document.getElementById('detailTitle').textContent = expense.isIncome ? 'Income Details' : 'Expense Details';
    document.getElementById('detailContent').innerHTML = content;
    showView('detailView');
}

function showItemDetail(itemName) {
    const itemNameLower = itemName.toLowerCase();
    
    // Find expenses containing this item
    const itemExpenses = expenses.filter(expense => 
        expense.items && expense.items.some(item => getItemName(item) === itemNameLower)
    );
    
    if (itemExpenses.length === 0) return;
    
    // Calculate stats from individual item prices
    let totalCount = 0;
    let totalSpent = 0;
    const purchaseDetails = [];
    
    itemExpenses.forEach(expense => {
        expense.items.forEach(item => {
            if (getItemName(item) === itemNameLower) {
                totalCount++;
                const price = getItemPrice(item);
                totalSpent += price;
                purchaseDetails.push({
                    expenseId: expense.id,
                    place: expense.place,
                    date: expense.date,
                    price: price
                });
            }
        });
    });
    
    const avgPrice = totalCount > 0 ? totalSpent / totalCount : 0;
    
    const content = `
        <div class="detail-item">
            <span class="detail-label">Item Name</span>
            <div class="detail-value">${itemName.charAt(0).toUpperCase() + itemName.slice(1)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Purchases</span>
            <div class="detail-value">${totalCount} time${totalCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Spent on This Item</span>
            <div class="detail-value">${formatCurrency(totalSpent)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Average Price</span>
            <div class="detail-value">${formatCurrency(avgPrice)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Purchase History</span>
            <div class="detail-items-list">
                ${purchaseDetails.map(p => `
                    <div class="detail-item-tag clickable" onclick="showExpenseDetail('${p.expenseId}')" style="display: block; margin-bottom: 0.5rem;">
                        <strong>${p.place || 'Unknown'}</strong> - ${formatDate(p.date)} - ${formatCurrency(p.price)}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('detailTitle').textContent = 'Item Details';
    document.getElementById('detailContent').innerHTML = content;
    showView('detailView');
}

// Make functions available globally
window.showExpenseDetail = showExpenseDetail;
window.showItemDetail = showItemDetail;

// Receipt scanning
let scannedData = null;

async function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('receiptPreview').src = event.target.result;
        document.getElementById('receiptPreview').classList.remove('hidden');
        document.querySelector('.upload-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);

    // Start scanning
    document.getElementById('scanningStatus').classList.remove('hidden');
    document.getElementById('scanResults').classList.add('hidden');

    try {
        const formData = new FormData();
        formData.append('receipt', file);

        const response = await fetch(`${API_BASE}/scan-receipt`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to scan receipt');
        }

        scannedData = await response.json();
        displayScanResults(scannedData);
    } catch (error) {
        alert('Error scanning receipt: ' + error.message);
        document.getElementById('scanningStatus').classList.add('hidden');
    }
}

function displayScanResults(data) {
    document.getElementById('scanningStatus').classList.add('hidden');
    document.getElementById('scanResults').classList.remove('hidden');
    
    document.getElementById('scanPlace').textContent = data.place || 'Not found';
    document.getElementById('scanDate').textContent = data.date || 'Not found';
    document.getElementById('scanAmount').textContent = data.amount ? formatCurrency(data.amount) : 'Not found';
    
    // Display items as a list with prices
    const itemsContainer = document.getElementById('scanItems');
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        // Check if items have price property (new format)
        if (typeof data.items[0] === 'object' && data.items[0].name) {
            itemsContainer.innerHTML = '<ul class="scan-items-list">' + 
                data.items.map(item => `<li><span class="item-name-scan">${item.name}</span><span class="item-price-scan">${formatCurrency(item.price || 0)}</span></li>`).join('') + 
                '</ul>';
        } else {
            // Old format (just strings)
            itemsContainer.innerHTML = '<ul class="scan-items-list">' + 
                data.items.map(item => `<li>${item}</li>`).join('') + 
                '</ul>';
        }
    } else if (data.items && typeof data.items === 'string') {
        const itemsArray = data.items.split(',').map(i => i.trim()).filter(i => i);
        itemsContainer.innerHTML = '<ul class="scan-items-list">' + 
            itemsArray.map(item => `<li>${item}</li>`).join('') + 
            '</ul>';
    } else {
        itemsContainer.textContent = 'Not found';
    }
}

function useScanData() {
    if (!scannedData) return;

    // Show form view first to ensure DOM is ready
    showView('expenseFormView', 'Add Expense (from Receipt)');
    
    // Use setTimeout to ensure the view is fully rendered before filling
    setTimeout(() => {
        // Reset form first
        document.getElementById('expenseForm').reset();
        editingExpenseId = null;
        document.getElementById('formTitle').textContent = 'Add Expense (from Receipt)';

        // Fill form with scanned data
        const placeInput = document.getElementById('place');
        const amountInput = document.getElementById('amount');
        const dateInput = document.getElementById('date');
        
        if (placeInput) {
            placeInput.value = scannedData.place && scannedData.place !== 'Not found' ? scannedData.place : '';
            placeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (amountInput) {
            amountInput.value = scannedData.amount && scannedData.amount !== 'Not found' ? scannedData.amount : '';
            amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Handle date - ensure it's in YYYY-MM-DD format
        let dateValue = scannedData.date || new Date().toISOString().split('T')[0];
        if (dateValue && dateValue !== 'Not found' && !dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
                dateValue = parsedDate.toISOString().split('T')[0];
            } else {
                dateValue = new Date().toISOString().split('T')[0];
            }
        }
        if (dateInput) {
            dateInput.value = dateValue;
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Handle items with prices - populate the items list
        currentItems = [];
        if (scannedData.items && Array.isArray(scannedData.items) && scannedData.items.length > 0) {
            scannedData.items.forEach(item => {
                if (typeof item === 'object' && item.name) {
                    // New format with price
                    currentItems.push({ name: item.name.trim(), price: item.price || 0 });
                } else if (typeof item === 'string' && item.trim()) {
                    // Old format (just string)
                    currentItems.push({ name: item.trim(), price: 0 });
                }
            });
        } else if (scannedData.items && typeof scannedData.items === 'string' && scannedData.items !== 'Not found') {
            // Split comma-separated string
            currentItems = scannedData.items.split(',').map(i => i.trim()).filter(i => i).map(name => ({ name, price: 0 }));
        }
        updateItemsDisplay();
        
        // Reset scanner view
        resetScanner();
    }, 100);
}

function resetScanner() {
    document.getElementById('receiptInput').value = '';
    document.getElementById('receiptPreview').classList.add('hidden');
    document.querySelector('.upload-placeholder').classList.remove('hidden');
    document.getElementById('scanningStatus').classList.add('hidden');
    document.getElementById('scanResults').classList.add('hidden');
    scannedData = null;
}

// Settings
async function handleSettingsSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    settings = {
        ...settings,
        currency: formData.get('currency') || '€',
        theme: formData.get('theme') || 'system',
        startDate: parseInt(formData.get('startDate')) || 1,
        geminiApiKey: formData.get('geminiApiKey') || ''
    };

    await saveSettings();
    applyTheme();
    updateStats();
    alert('Settings saved!');
    showView('dashboardView');
}

async function saveSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        settings = await response.json();
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Utility functions
function formatCurrency(amount, currency = null) {
    const curr = currency || settings.currency || '€';
    return `${curr}${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Make functions available globally for onclick handlers
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;


// State management
let expenses = [];
let categories = [];
let settings = {};
let currentView = 'dashboardView';
let editingExpenseId = null;
let chart = null;

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadCategories();
    await loadExpenses();
    setupEventListeners();
    applyTheme();
    updateStats();
    renderExpenses();
    renderChart();
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

// Event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('addExpenseBtn').addEventListener('click', () => showView('expenseFormView', 'Add Expense'));
    document.getElementById('scanReceiptBtn').addEventListener('click', () => showView('scannerView'));
    document.getElementById('settingsBtn').addEventListener('click', () => showView('settingsView'));
    document.getElementById('cancelBtn').addEventListener('click', () => showView('dashboardView'));
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Forms
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

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

// Expense form handling
function resetExpenseForm() {
    editingExpenseId = null;
    document.getElementById('expenseForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('formTitle').textContent = 'Add Expense';
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const expense = {
        place: formData.get('place'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        date: formData.get('date'),
        items: formData.get('items') ? formData.get('items').split(',').map(i => i.trim()) : [],
        notes: formData.get('notes')
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
        const newExpense = await response.json();
        expenses.push(newExpense);
        updateStats();
        renderExpenses();
        renderChart();
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
    document.getElementById('items').value = expense.items ? expense.items.join(', ') : '';
    document.getElementById('notes').value = expense.notes || '';
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
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-place">${expense.place || 'Unknown'}</div>
                <div class="expense-details">
                    ${expense.category} • ${formatDate(expense.date)}${expense.items && expense.items.length > 0 ? ' • ' + expense.items.length + ' items' : ''}
                </div>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <div class="expense-actions">
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

    const todayTotal = expenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthTotal = expenses
        .filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= monthStart && expenseDate < monthEnd;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpenses = expenses
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    document.getElementById('todayTotal').textContent = formatCurrency(todayTotal, currency);
    document.getElementById('monthTotal').textContent = formatCurrency(monthTotal, currency);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses, currency);
}

// Chart rendering
function renderChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }

    // Group expenses by category
    const categoryTotals = {};
    expenses.forEach(expense => {
        const cat = expense.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (expense.amount || 0);
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
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

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
    document.getElementById('scanItems').textContent = data.items && data.items.length > 0 
        ? data.items.join(', ') 
        : 'Not found';
}

function useScanData() {
    if (!scannedData) return;

    // Fill form with scanned data
    document.getElementById('place').value = scannedData.place || '';
    document.getElementById('amount').value = scannedData.amount || '';
    document.getElementById('date').value = scannedData.date || new Date().toISOString().split('T')[0];
    document.getElementById('items').value = scannedData.items ? scannedData.items.join(', ') : '';

    // Show form view
    showView('expenseFormView', 'Add Expense (from Receipt)');
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


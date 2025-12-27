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
    renderItemsStats();
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
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => showView('dashboardView'));
    }
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Forms
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    
    // Items input handling
    setupItemsInput();
    
    // Recurring expense toggle
    document.getElementById('isRecurring')?.addEventListener('change', (e) => {
        const recurringOptions = document.getElementById('recurringOptions');
        if (recurringOptions) {
            recurringOptions.style.display = e.target.checked ? 'block' : 'none';
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

// Items management
let currentItems = [];

function setupItemsInput() {
    const itemsInput = document.getElementById('itemsInput');
    const itemsList = document.getElementById('itemsList');
    
    if (!itemsInput || !itemsList) return;
    
    itemsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = itemsInput.value.trim();
            if (value && !currentItems.includes(value)) {
                currentItems.push(value);
                updateItemsDisplay();
                itemsInput.value = '';
            }
        }
    });
}

function updateItemsDisplay() {
    const itemsList = document.getElementById('itemsList');
    const hiddenInput = document.getElementById('items');
    
    if (!itemsList || !hiddenInput) return;
    
    itemsList.innerHTML = currentItems.map((item, index) => `
        <span class="item-tag" data-index="${index}">
            ${item}
            <button type="button" class="item-tag-remove" onclick="removeItem(${index})">×</button>
        </span>
    `).join('');
    
    hiddenInput.value = currentItems.join(',');
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
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const expense = {
        place: formData.get('place'),
        category: formData.get('category'),
        amount: parseFloat(formData.get('amount')),
        date: formData.get('date'),
        items: currentItems.length > 0 ? currentItems : (formData.get('items') ? formData.get('items').split(',').map(i => i.trim()).filter(i => i) : []),
        notes: formData.get('notes'),
        isIncome: formData.get('isIncome') === 'on',
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
    currentItems = expense.items && Array.isArray(expense.items) ? [...expense.items] : [];
    updateItemsDisplay();
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
        <div class="expense-item clickable" onclick="showExpenseDetail('${expense.id}')">
            <div class="expense-info">
                <div class="expense-place">${expense.place || 'Unknown'}</div>
                <div class="expense-details">
                    ${expense.category} • ${formatDate(expense.date)}${expense.items && expense.items.length > 0 ? ' • ' + expense.items.length + ' items' : ''}
                </div>
            </div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
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
                const itemName = item.trim().toLowerCase();
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

// Detail view functions
function showExpenseDetail(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    
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
            <div class="detail-value">${formatCurrency(expense.amount)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Date</span>
            <div class="detail-value">${formatDate(expense.date)}</div>
        </div>
        ${expense.items && expense.items.length > 0 ? `
        <div class="detail-item">
            <span class="detail-label">Items</span>
            <div class="detail-items-list">
                ${expense.items.map(item => `
                    <span class="detail-item-tag" onclick="showItemDetail('${item.toLowerCase()}')">${item}</span>
                `).join('')}
            </div>
        </div>
        ` : ''}
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
    
    document.getElementById('detailTitle').textContent = 'Expense Details';
    document.getElementById('detailContent').innerHTML = content;
    showView('detailView');
}

function showItemDetail(itemName) {
    const itemNameLower = itemName.toLowerCase();
    const itemExpenses = expenses.filter(expense => 
        expense.items && expense.items.some(item => item.toLowerCase() === itemNameLower)
    );
    
    if (itemExpenses.length === 0) return;
    
    const totalCount = itemExpenses.reduce((sum, exp) => {
        return sum + (exp.items.filter(i => i.toLowerCase() === itemNameLower).length);
    }, 0);
    
    const totalAmount = itemExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
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
            <span class="detail-label">Total Amount Spent</span>
            <div class="detail-value">${formatCurrency(totalAmount)}</div>
        </div>
        <div class="detail-item">
            <span class="detail-label">Purchased In</span>
            <div class="detail-items-list">
                ${itemExpenses.map(expense => `
                    <div class="detail-item-tag clickable" onclick="showExpenseDetail('${expense.id}')" style="display: block; margin-bottom: 0.5rem;">
                        <strong>${expense.place || 'Unknown'}</strong> - ${formatDate(expense.date)} - ${formatCurrency(expense.amount)}
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
    
    // Display items as a list (one per item)
    const itemsContainer = document.getElementById('scanItems');
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        itemsContainer.innerHTML = '<ul class="scan-items-list">' + 
            data.items.map(item => `<li>${item}</li>`).join('') + 
            '</ul>';
    } else if (data.items && typeof data.items === 'string') {
        // If items is a string, split it
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
        const itemsInput = document.getElementById('items');
        
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
        // If date is in a different format, try to parse it
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
        
        // Handle items - populate the items list
        if (scannedData.items && Array.isArray(scannedData.items) && scannedData.items.length > 0) {
            // Filter out any null or empty items and add to currentItems
            currentItems = scannedData.items.filter(item => item && item.trim());
            updateItemsDisplay();
        } else if (scannedData.items && typeof scannedData.items === 'string' && scannedData.items !== 'Not found') {
            // Split comma-separated string
            currentItems = scannedData.items.split(',').map(i => i.trim()).filter(i => i);
            updateItemsDisplay();
        }
        
        // Also trigger events for other fields to ensure they're recognized
        if (placeInput) placeInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (amountInput) amountInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (dateInput) dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        
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


# Product Context: Makbuz

## Why This Project Exists
ExpenseOwl and similar tools are excellent but too complex for users who just want quick expense tracking. Makbuz fills the gap by providing:
- **Simplicity**: No complex budgeting, accounts, or features you don't need
- **Speed**: Quick monthly overview via pie chart
- **AI-Powered**: Receipt scanning eliminates manual data entry
- **Self-Hosted**: Full control over your data

## User Experience Goals

### Primary Workflow
1. User takes photo of receipt
2. AI extracts: Place, Date, Amount, Items
3. Form auto-fills (user can edit if needed)
4. Save expense
5. View monthly stats and item analytics

### Key Interactions
- **Dashboard**: Quick view of monthly spending, pie chart, top 3 items
- **Add Expense**: Manual entry or scan receipt
- **Item Tracking**: Click items to see purchase history
- **Detail Views**: Click expenses/items/chart segments for details
- **Recurring**: Set up automatic recurring transactions

## Design Philosophy
- **Minimal**: Only essential features
- **Fast**: Quick to add expenses, quick to view stats
- **Visual**: Charts and analytics for quick insights
- **Modern**: Clean UI with dark/light mode support
- **Mobile-Friendly**: Works great on phones (PWA)

## Data Model
- **Expenses**: place, category, amount, date, items[], notes, isIncome, isRecurring
- **Categories**: Predefined list (Food, Groceries, Transport, etc.)
- **Settings**: currency, theme, geminiApiKey, startDate
- **Items**: Tracked across all expenses for analytics


# System Patterns: Makbuz

## Architecture

### Backend (Node.js/Express)
- **Storage**: JSON files in `data/` directory
  - `expenses.json`: All expense records
  - `categories.json`: Category list
  - `settings.json`: App settings including Gemini API key
- **API**: RESTful endpoints under `/api/`
- **Receipt Scanning**: POST `/api/scan-receipt` uses Gemini Flash API
- **File Uploads**: Multer handles receipt image uploads

### Frontend (Vanilla HTML/CSS/JS)
- **SPA**: Single-page application with view switching
- **State Management**: Global variables (expenses, categories, settings)
- **PWA**: Service worker for offline support, manifest for installability
- **Charts**: Chart.js for pie chart visualization
- **Items Input**: Tag-based system (add/remove individual items)

## Key Patterns

### View Management
- Views are sections with `.view` class
- `showView(viewId)` switches active view
- Only one view active at a time

### Data Flow
1. Load data on page load (expenses, categories, settings)
2. User actions trigger API calls
3. Update local state
4. Re-render affected UI components

### Receipt Scanning Flow
1. User uploads image
2. Image sent to `/api/scan-receipt`
3. Server uses Gemini Flash to extract data
4. Returns JSON with place, date, amount, items
5. Frontend displays results
6. User clicks "Use This Data" → fills form
7. User can edit before saving

### Recurring Expenses
- When `isRecurring: true`, backend creates multiple expense records
- Frequency determines date increments
- Optional end date limits occurrences
- All created expenses share same data except dates

## Component Relationships

```
Dashboard View
├── Stats Cards (Today, Month, Net Total)
├── Pie Chart (by category, clickable)
├── Most Bought Items (top 3, clickable)
└── Recent Expenses List (clickable)

Expense Form
├── Basic Fields (place, category, amount, date)
├── Items Input (tag-based)
├── Transaction Type (Expense/Income buttons)
└── Recurring Options (conditional)

Detail View
├── Expense Details
├── Item Details (with receipt history)
└── Category Details (from chart click)
```

## Data Storage Pattern
- All data in JSON files
- No database required
- Simple file-based persistence
- Easy to backup (just copy `data/` directory)


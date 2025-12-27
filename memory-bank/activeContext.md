# Active Context: Makbuz

## Current Focus
Building and refining a self-hosted expense tracker with AI receipt scanning. Recent major updates include:
- Tag-based items input (individual items, not comma-separated)
- Clickable detail views for expenses, items, and categories
- Income and recurring expense support
- Visual improvements (side-by-side layout, bigger logo)

## Recent Changes

### Latest Updates
1. **Transaction Type Buttons**: Replaced checkboxes with icon buttons (💸 Expense / 💰 Income)
2. **Visual Overhaul**: 
   - Chart and items list side by side
   - Logo increased to 48px with dark mode visibility
   - Limited items to top 3
3. **Income Support**: Full income tracking with separate calculations
4. **Recurring Expenses**: Support for daily/weekly/monthly/yearly recurring transactions

### Current State
- ✅ Core expense tracking working
- ✅ Receipt scanning with Gemini Flash
- ✅ Item tracking and analytics
- ✅ Income/expense separation
- ✅ Recurring transactions
- ✅ PWA support
- ✅ Docker Hub deployment
- ✅ GitHub Actions CI/CD

## Active Decisions

### UI/UX Choices
- **Items as Tags**: Individual items displayed as removable tags (better UX than comma-separated)
- **Side-by-Side Layout**: Chart and items list in grid for better space usage
- **Icon Buttons**: Transaction type uses visual buttons instead of checkboxes
- **Clickable Everything**: Expenses, items, and chart segments all clickable for details

### Technical Choices
- **Gemini 2.0 Flash Exp**: Using experimental model for receipt scanning
- **JSON Storage**: Simple file-based storage (no database complexity)
- **Vanilla JS**: No frameworks for simplicity and performance
- **Docker Hub Only**: Images built via GitHub Actions, users pull from Docker Hub

## Next Considerations
- Monitor receipt scanning accuracy
- Consider adding export functionality
- May need to adjust chart sizing based on user feedback
- Consider adding more analytics views


# Technical Context: Makbuz

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **AI Integration**: @google/generative-ai (Gemini Flash API)
- **File Upload**: Multer
- **Storage**: JSON files (fs/promises)

### Frontend
- **HTML/CSS/JavaScript**: Vanilla (no frameworks)
- **Charts**: Chart.js 4.4.0
- **PWA**: Service Worker + Manifest
- **Styling**: CSS Variables for theming

### Deployment
- **Containerization**: Docker
- **Image Registry**: Docker Hub (batubaba619/makbuz-expense-tracker)
- **CI/CD**: GitHub Actions (auto-build on push)
- **Base Image**: node:20-alpine

## Dependencies

### Production
```json
{
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1",
  "@google/generative-ai": "^0.21.0",
  "cors": "^2.8.5"
}
```

### Frontend (CDN)
- Chart.js: https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js

## Configuration

### Environment Variables
- `PORT`: Server port (default: 8080)

### Settings (stored in settings.json)
- `currency`: Currency symbol (default: €)
- `theme`: light/dark/system
- `geminiApiKey`: Google Gemini API key (user configurable via UI)
- `startDate`: Day of month for period calculation (default: 1)

## File Structure
```
Makbuz/
├── server.js              # Express backend
├── package.json
├── Dockerfile
├── docker-compose.yml
├── public/
│   ├── index.html         # Main HTML
│   ├── app.js             # Frontend logic
│   ├── styles.css         # Styling
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   ├── icon.png           # App icon (with background)
│   └── icon-transparent.png # App icon (transparent)
├── data/                  # JSON storage (created at runtime)
│   ├── expenses.json
│   ├── categories.json
│   └── settings.json
└── uploads/              # Temporary receipt uploads
```

## API Endpoints

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create expense(s) (handles recurring)
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add new category

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Receipt Scanning
- `POST /api/scan-receipt` - Upload receipt image, returns extracted data

## Development Setup
```bash
npm install
npm start
# Server runs on http://localhost:8080
```

## Docker Deployment
```bash
docker-compose up -d
# Uses image from Docker Hub: batubaba619/makbuz-expense-tracker:latest
```


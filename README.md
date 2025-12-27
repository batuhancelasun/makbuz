# Makbuz - Expense Tracker with Receipt Scanning

A modern, PWA-enabled expense tracking application with AI-powered receipt scanning using Google Gemini Flash. Built with Node.js, vanilla HTML/CSS/JS, and designed for self-hosting.

## Features

- 📱 **Progressive Web App (PWA)** - Install on your device, works offline
- 📷 **Receipt Scanning** - Take a photo of your receipt and automatically extract:
  - Place (store/merchant name)
  - Date
  - Amount
  - Purchased items
- 🎨 **Modern UI** - Clean, minimal design with dark/light mode support
- 📊 **Visual Analytics** - Monthly pie chart showing spending by category
- 💾 **Simple Storage** - JSON file-based storage (no database required)
- 🐳 **Docker Ready** - Use pre-built images from Docker Hub or build locally
- 🚀 **CI/CD** - Automatic Docker Hub builds via GitHub Actions

## Prerequisites

- Docker and Docker Compose
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

## Quick Start

### Option 1: Using Pre-built Docker Image from Docker Hub (Recommended)

1. Clone this repository:
```bash
git clone https://github.com/batuhancelasun/makbuz.git
cd makbuz
```

2. Start the application:
```bash
docker-compose up -d
```

The `docker-compose.yml` file is configured to use the pre-built image from Docker Hub (`batubaba619/makbuz-expense-tracker:latest`) by default.

3. Open `http://localhost:8080` in your browser

4. Configure Gemini API:
   - Click the Settings (⚙️) button
   - Enter your Gemini API Key
   - Configure other settings (currency, theme, etc.)
   - Save settings

### Option 2: Building from Source Locally

If you want to build from source instead of using the Docker Hub image:

1. Edit `docker-compose.yml`:
   - Comment out the `image:` line
   - Uncomment the `build: .` line

2. Build and start:
```bash
docker-compose up -d --build
```

### Option 3: Using Docker Run (without docker-compose)

If you prefer not to use docker-compose:

```bash
# Using pre-built image
docker run -d \
  --name makbuz-expense-tracker \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  batubaba619/makbuz-expense-tracker:latest

# Or build from source
docker build -t makbuz-expense-tracker .
docker run -d \
  --name makbuz-expense-tracker \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  makbuz-expense-tracker
```

## For Maintainers: GitHub Actions & Docker Hub

This project is distributed exclusively via Docker Hub. All images are automatically built and pushed by GitHub Actions on every commit to the main branch.

### Setup Instructions

1. **Create a Docker Hub account** (if you don't have one): https://hub.docker.com

2. **Create a Docker Hub Access Token**:
   - Go to Docker Hub → Account Settings → Security
   - Click "New Access Token"
   - Give it a name (e.g., "github-actions")
   - Copy the token (you won't see it again!)

3. **Add GitHub Secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DOCKERHUB_USERNAME`: `batubaba619`
     - `DOCKERHUB_TOKEN`: The access token you created

4. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/batuhancelasun/makbuz.git
   git push -u origin main
   ```

6. **Verify**:
   - Check GitHub Actions tab to see the build progress
   - Once complete, your image will be available at:
     `docker.io/batubaba619/makbuz-expense-tracker:latest`

## Usage

### Adding Expenses

1. Click "Add Expense" to manually enter an expense
2. Or click "Scan Receipt" to take a photo and auto-fill the form

### Receipt Scanning

1. Click "Scan Receipt"
2. Take a photo or select an image of your receipt
3. Wait for the AI to extract information
4. Review the extracted data
5. Click "Use This Data" to fill the form
6. Edit any fields if needed
7. Save the expense

### Viewing Expenses

- Dashboard shows monthly statistics and a pie chart
- Recent expenses are listed below the chart
- Click edit (✏️) or delete (🗑️) to manage expenses

## Data Storage

Data is stored in JSON files in the `data/` directory:
- `expenses.json` - All expense records
- `categories.json` - Expense categories
- `settings.json` - Application settings (including encrypted API key)

**Important:** Make sure to backup the `data/` directory regularly!

## API Endpoints

- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Add new category
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `POST /api/scan-receipt` - Scan receipt image

## Docker Commands

```bash
# Pull latest image from Docker Hub
docker-compose pull

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Update to latest version
docker-compose pull && docker-compose up -d
```

## Security Notes

- This app does NOT include authentication
- Deploy behind a reverse proxy (Nginx, Traefik, etc.) with authentication
- The Gemini API key is stored in settings.json (consider encrypting for production)
- Recommended for home lab use only

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **AI:** Google Gemini Flash API
- **Charts:** Chart.js
- **Storage:** JSON files
- **Deployment:** Docker + Docker Hub
- **CI/CD:** GitHub Actions

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows the existing style
- Features maintain simplicity
- PWA functionality is preserved
- Test your changes locally by building from source (see Option 2 in Quick Start)
- All changes are automatically built and pushed to Docker Hub via GitHub Actions

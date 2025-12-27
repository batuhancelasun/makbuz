import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
await fs.mkdir(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Service worker needs specific headers
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
await fs.mkdir('uploads', { recursive: true });

// Helper function to get data file path
const getDataPath = (filename) => path.join(DATA_DIR, filename);

// Helper function to read JSON file
async function readJSON(filename) {
  try {
    const data = await fs.readFile(getDataPath(filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Helper function to write JSON file
async function writeJSON(filename, data) {
  await fs.writeFile(getDataPath(filename), JSON.stringify(data, null, 2), 'utf8');
}

// Initialize data files if they don't exist
async function initDataFiles() {
  const expenses = await readJSON('expenses.json');
  if (!expenses) await writeJSON('expenses.json', []);

  const categories = await readJSON('categories.json');
  if (!categories) await writeJSON('categories.json', ['Food', 'Groceries', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Other']);

  const settings = await readJSON('settings.json');
  if (!settings) await writeJSON('settings.json', {
    currency: '€',
    theme: 'system',
    geminiApiKey: '',
    startDate: 1
  });
}

await initDataFiles();

// API Routes

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await readJSON('expenses.json');
    res.json(expenses || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add expense
app.post('/api/expenses', async (req, res) => {
  try {
    const expenses = await readJSON('expenses.json');
    const newExpense = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    expenses.push(newExpense);
    await writeJSON('expenses.json', expenses);
    res.json(newExpense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expenses = await readJSON('expenses.json');
    const index = expenses.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    expenses[index] = { ...expenses[index], ...req.body };
    await writeJSON('expenses.json', expenses);
    res.json(expenses[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expenses = await readJSON('expenses.json');
    const filtered = expenses.filter(e => e.id !== req.params.id);
    await writeJSON('expenses.json', filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await readJSON('categories.json');
    res.json(categories || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add category
app.post('/api/categories', async (req, res) => {
  try {
    const categories = await readJSON('categories.json');
    if (!categories.includes(req.body.name)) {
      categories.push(req.body.name);
      await writeJSON('categories.json', categories);
    }
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readJSON('settings.json');
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const currentSettings = await readJSON('settings.json');
    const updatedSettings = { ...currentSettings, ...req.body };
    await writeJSON('settings.json', updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receipt scanning endpoint
app.post('/api/scan-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const settings = await readJSON('settings.json');
    if (!settings.geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    // Read the uploaded image
    const imageBuffer = await fs.readFile(req.file.path);
    const base64Image = imageBuffer.toString('base64');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(settings.geminiApiKey);
    // Use gemini-2.0-flash-exp (experimental) - latest fast model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Convert image to Gemini format
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: req.file.mimetype || 'image/jpeg'
      }
    };

    // Create prompt for receipt extraction
    const prompt = `Analyze this receipt image and extract the following information in JSON format:
{
  "place": "store name or merchant name",
  "date": "date in YYYY-MM-DD format",
  "amount": "total amount as a number (without currency symbol)",
  "items": ["item1", "item2", "item3"]
}

Rules:
- Extract the store/merchant name as "place"
- Extract the date and convert to YYYY-MM-DD format
- Extract the total amount as a number (remove currency symbols)
- List all purchased items as an array
- If any field cannot be determined, use null
- Return ONLY valid JSON, no additional text`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean and parse JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse response from Gemini');
      }
    }

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.json(extractedData);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


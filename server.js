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
    const expenseData = req.body;
    
    // Handle recurring expenses
    if (expenseData.isRecurring && expenseData.recurringFrequency) {
      const createdExpenses = [];
      const startDate = new Date(expenseData.date);
      const endDate = expenseData.recurringEndDate ? new Date(expenseData.recurringEndDate) : null;
      
      let currentDate = new Date(startDate);
      let count = 0;
      const maxRecurrences = 365; // Safety limit
      
      while (count < maxRecurrences && (!endDate || currentDate <= endDate)) {
        const newExpense = {
          id: `${Date.now()}-${count}`,
          ...expenseData,
          date: currentDate.toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        delete newExpense.recurringEndDate; // Don't store end date in individual expenses
        expenses.push(newExpense);
        createdExpenses.push(newExpense);
        
        // Calculate next date based on frequency
        if (expenseData.recurringFrequency === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (expenseData.recurringFrequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (expenseData.recurringFrequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (expenseData.recurringFrequency === 'yearly') {
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        
        count++;
      }
      
      await writeJSON('expenses.json', expenses);
      res.json({ created: createdExpenses.length, expenses: createdExpenses });
    } else {
      // Single expense
      const newExpense = {
        id: Date.now().toString(),
        ...expenseData,
        createdAt: new Date().toISOString()
      };
      expenses.push(newExpense);
      await writeJSON('expenses.json', expenses);
      res.json(newExpense);
    }
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
  "items": [
    {"name": "item name", "price": 1.99},
    {"name": "another item", "price": 2.50}
  ]
}

Rules:
- Extract the store/merchant name as "place"
- Extract the date and convert to YYYY-MM-DD format
- Extract the total amount as a number (remove currency symbols)
- List all purchased items as an array of objects with "name" and "price" (price as number)
- If item price cannot be determined, set price to 0
- If any field cannot be determined, use null
- Return ONLY valid JSON, no additional text`;

    // Models to try in order: primary -> fallback
    const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash'];
    let result;
    let usedModel;
    let lastError;

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([prompt, imagePart]);
        usedModel = modelName;
        console.log(`Success with model: ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`Model ${modelName} failed: ${modelError.message}`);
        lastError = modelError;
        // Continue to next model
      }
    }

    if (!result) {
      throw lastError || new Error('All models failed');
    }

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

    // Add which model was used (for debugging/info)
    extractedData._model = usedModel;

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


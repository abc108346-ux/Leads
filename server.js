import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON parsing for potential POST bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const OVERPASS_INSTANCES = [
  'https://overpass.openstreetmap.fr/api/interpreter', // Currently most reliable
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

app.all('/api/overpass', async (req, res) => {
  const query = req.query.data || req.body.data;
  
  if (!query) {
    return res.status(400).json({ error: "No data provided" });
  }

  let lastError = null;

  for (const instance of OVERPASS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      // Prefer POST to avoid URI too long and to be nice to caches
      const response = await fetch(instance, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LeadProspectingApp/1.0 (Contact: webmaster@localhost)'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      } else {
        console.warn(`Instance ${instance} returned ${response.status}`);
        lastError = `Status ${response.status}`;
      }
    } catch (err) {
      console.warn(`Instance ${instance} failed: ${err.message}`);
      lastError = err.message;
    }
  }
  
  console.error("All Overpass instances failed.");
  return res.status(502).json({ error: "Todos os servidores de busca estão ocupados. Tente novamente.", details: lastError });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Send all other requests to the React/Vite index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


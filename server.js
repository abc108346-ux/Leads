import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint to determine Geoapify categories based on user query
app.post('/api/gemini/categories', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `The user wants to find businesses in this niche: "${query}".
Identify the most relevant Geoapify Places API categories for this search.

Geoapify categories guide:
- commercial: for stores, shops, supermarkets (e.g., commercial.clothing, commercial.health_and_beauty)
- catering: for food/drinks (e.g., catering.restaurant, catering.cafe, catering.fast_food, catering.bar)
- service: for services (e.g., service.vehicle, service.beauty, service.financial)
- healthcare: for clinics, doctors, dentists, vets (e.g., healthcare.clinic_or_praxis, healthcare.dentist, healthcare.hospital.veterinary)
- sport: for gyms, fitness (e.g., sport.fitness, sport.sports_centre)
- education: for schools (e.g., education.school, education.driving_school)
- accommodation: for hotels (e.g., accommodation.hotel)
- office: for corporate offices, real estate (e.g., office.estate_agent)

Return ONLY a JSON array of strings containing the most appropriate Geoapify category strings to use for the API call (max 4 specific categories). Do not include any explanations. If the query is broad, return the broad category (e.g., "commercial").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
      }
    });

    const categories = JSON.parse(response.text);
    res.json({ categories: categories.length > 0 ? categories : ['commercial'] });

  } catch (error) {
    console.error('Error generating categories:', error);
    res.status(500).json({ error: 'Failed to generate categories' });
  }
});

// Endpoint to semantically filter and score Geoapify results
app.post('/api/gemini/filter', async (req, res) => {
  try {
    const { query, city, places } = req.body;
    
    if (!query || !places || !Array.isArray(places)) {
      return res.status(400).json({ error: 'Query and places array are required' });
    }

    if (places.length === 0) {
      return res.json({ validIds: [] });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `You are an AI filtering system for a lead generation CRM.
The user is searching for: "${query}" in the city of "${city}".
Your goal is to find REAL businesses matching this intention and discard irrelevant results.

IMPORTANT RULES:
- The goal is to find BUSINESSES/ESTABLISHMENTS.
- NEVER accept streets, avenues, generic neighborhoods, or pure geographical points without a business name.
- If the user searches "restaurante", "Av. Assis Brasil" or "Rua X" is IRRELEVANT.
- Evaluate the semantic match. If they search "loja de roupas femininas", a place named "Boutique Maria" with category "commercial.clothing" is highly relevant.
- Validate if the place seems to be in the requested city or nearby.

Here are the places:
${JSON.stringify(places, null, 2)}

Return a JSON array containing ONLY the IDs (strings) of the places that are highly relevant businesses. Do NOT return scores or reasons, just the IDs of the valid ones.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
      }
    });

    const validIds = JSON.parse(response.text);
    res.json({ validIds });

  } catch (error) {
    console.error('Error filtering places:', error);
    res.status(500).json({ error: 'Failed to filter places' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();

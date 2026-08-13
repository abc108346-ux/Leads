import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

const OVERPASS_INSTANCES = [
  'https://overpass.openstreetmap.fr/api/interpreter', // Currently most reliable
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const customApiPlugin = () => {
  return {
    name: 'custom-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/overpass', async (req, res) => {
        // Simple body parser
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          let query = '';
          if (req.method === 'POST') {
            const params = new URLSearchParams(body);
            query = params.get('data') || '';
          } else {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            query = urlObj.searchParams.get('data') || '';
          }
          
          if (!query) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: "No data provided" }));
          }

          let lastError = null;

          for (const instance of OVERPASS_INSTANCES) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 25000); 

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
                const data = await response.text();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(data);
              } else {
                console.warn(`Instance ${instance} returned ${response.status}`);
                lastError = `Status ${response.status}`;
              }
            } catch (err) {
              console.warn(`Instance ${instance} failed: ${err.message}`);
              lastError = err.message;
            }
          }
          
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: "Todos os servidores de busca estão ocupados. Tente novamente.", details: lastError }));
        });
      });
    }
  }
}

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), customApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {}
    },
  };
});

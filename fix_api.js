import fs from 'fs';

const apiFile = 'src/services/api.js';
let content = fs.readFileSync(apiFile, 'utf8');

content = content.replace(/this\.overpassInstances = \[[\s\S]*?\];/, "this.baseUrl = '/api/overpass';");

content = content.replace(/\/\/ Step 3: Fetch with fallback instances[\s\S]*?throw lastError \|\| new Error\('Não foi possível conectar a nenhum servidor de busca\.'\);/, `// Step 3: Fetch using our local robust backend proxy
    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('data', overpassQuery);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || \`Falha no servidor (\${response.status}).\`);
      }

      const data = await response.json();
      return this.formatResults(data.elements, onlyWithoutWebsite);
    } catch (error) {
      console.error("Search Error:", error);
      throw error;
    }`);

fs.writeFileSync(apiFile, content);
console.log('Fixed api.js');

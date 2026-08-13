// Configurações do Sistema
// Insira sua API Key da Geoapify abaixo
const GEOAPIFY_API_KEY = "COLE_SUA_CHAVE_AQUI";

// Business Search Service
// Integration with Geoapify Places API to find real businesses
export class GeoapifySearchService {
  constructor() {
    let envKey = undefined;
    try {
      // Vite replaces this string exactly, so we avoid optional chaining
      envKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    } catch(e) {
      console.warn("import.meta.env não disponível no contexto atual");
    }
    
    this.apiKey = envKey || GEOAPIFY_API_KEY;
  }

  async searchCompanies(query, city, state, country, onlyWithoutWebsite) {
    const term = query.trim().toLowerCase();
    const cityTerm = city.trim();
    if (!term || !cityTerm) return [];
    
    let key = this.apiKey ? this.apiKey.trim() : "";
    if (key === "COLE_SUA_CHAVE_AQUI" || !key) {
      throw new Error("API Key inválida. Por favor, cole a sua chave no arquivo src/services/api.js ou adicione o secret VITE_GEOAPIFY_API_KEY.");
    }

    // 1. Obter o place_id da cidade via Geocoding API
    const locationStr = state ? `${cityTerm}, ${state}, ${country}` : `${cityTerm}, ${country}`;
    let placeId = null;

    try {
      const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(locationStr)}&limit=1&apiKey=${key}`);
      if (!geoResponse.ok) {
        if (geoResponse.status === 401) throw new Error("API Key da Geoapify inválida ou não autorizada.");
        if (geoResponse.status === 429) throw new Error("Limite de requisições da Geoapify atingido.");
        throw new Error("Erro de conexão ao buscar a cidade na Geoapify.");
      }
      
      const geoData = await geoResponse.json();
      if (!geoData.features || geoData.features.length === 0) {
        throw new Error(`A cidade/região "${locationStr}" não foi encontrada.`);
      }

      placeId = geoData.features[0].properties.place_id;
    } catch (err) {
      console.error("Geocoding Error:", err);
      throw err;
    }

    // 2. Mapear o termo de busca para as categorias da Geoapify usando a IA no backend
    let categories = 'commercial';
    try {
      const catResponse = await fetch('/api/gemini/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (catResponse.ok) {
        const catData = await catResponse.json();
        if (catData.categories && catData.categories.length > 0) {
          categories = catData.categories.join(',');
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar categorias na IA, usando fallback 'commercial'", err);
    }

    // 3. Buscar os locais via Places API (com paginação para garantir resultados suficientes)
    let validFeatures = [];
    const targetResults = 20; // Alvo de resultados válidos
    const maxPages = 3;
    const limit = 50;

    let offset = 0;
    const scoresMap = new Map();

    for (let page = 0; page < maxPages; page++) {
      try {
        const placesResponse = await fetch(`https://api.geoapify.com/v2/places?categories=${categories}&filter=place:${placeId}&limit=${limit}&offset=${offset}&apiKey=${key}`);
        
        if (!placesResponse.ok) {
          if (placesResponse.status === 401) throw new Error("API Key da Geoapify inválida ou não autorizada.");
          if (placesResponse.status === 429) throw new Error("Limite de requisições da Geoapify atingido.");
          throw new Error("Erro da Geoapify ao buscar estabelecimentos.");
        }

        const placesData = await placesResponse.json();
        const features = placesData.features || [];
        
        if (features.length === 0) {
          break; // Sem mais resultados na API
        }

        // 4. Filtrar semanticamente os resultados desta página usando a IA
        const simplifiedPlaces = features.map(f => ({
          id: f.properties.place_id,
          name: f.properties.name || "Sem nome",
          address: f.properties.formatted || "",
          categories: f.properties.categories || []
        }));

        try {
          const filterResponse = await fetch('/api/gemini/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, city, places: simplifiedPlaces })
          });
          
          if (filterResponse.ok) {
            const { evaluatedPlaces } = await filterResponse.json();
            
            if (evaluatedPlaces && evaluatedPlaces.length > 0) {
               evaluatedPlaces.forEach(ep => scoresMap.set(ep.id, ep.score));
               
               // Adiciona os válidos desta página
               const validPageFeatures = features.filter(f => (scoresMap.get(f.properties.place_id) || 0) >= 70);
               
               // Remove duplicatas manuais antes de adicionar à lista principal
               validPageFeatures.forEach(vf => {
                 if (!validFeatures.some(existing => existing.properties.place_id === vf.properties.place_id)) {
                   validFeatures.push(vf);
                 }
               });
            }
          }
        } catch (err) {
          console.warn("Erro no filtro semântico da IA. Ignorando página.", err);
        }

        // Se já alcançamos o alvo de 20 resultados bons, paramos a busca
        if (validFeatures.length >= targetResults) {
          break;
        }

        // Próxima página
        offset += limit;

      } catch (err) {
        console.error("Places API Error during pagination:", err);
        if (validFeatures.length > 0) {
          break; // Retorna o que já conseguiu se der erro em páginas seguintes
        }
        throw err;
      }
    }

    if (validFeatures.length === 0) {
      throw new Error(`A IA analisou as regiões, mas não encontrou empresas altamente relevantes para "${query}". Tente outro termo ou verifique se a cidade possui esses estabelecimentos.`);
    }

    // Ordena todos os resultados válidos capturados (decrescente por score)
    validFeatures.sort((a, b) => (scoresMap.get(b.properties.place_id) || 0) - (scoresMap.get(a.properties.place_id) || 0));

    // Limita ao alvo solicitado
    const finalFeatures = validFeatures.slice(0, targetResults);

    return this.formatResults(finalFeatures, onlyWithoutWebsite);
  }

  formatResults(features, onlyWithoutWebsite) {
    return features.map(feature => {
      const props = feature.properties;
      
      let hasWebsite = false;
      let websiteUrl = props.website || props.contact?.website || null;
      let isSocialOrDirectory = false;
      
      if (websiteUrl) {
        const urlLower = websiteUrl.toLowerCase();
        isSocialOrDirectory = 
          urlLower.includes('instagram.com') || 
          urlLower.includes('facebook.com') || 
          urlLower.includes('ifood.com.br') || 
          urlLower.includes('tripadvisor.com') ||
          urlLower.includes('google.com/maps') ||
          urlLower.includes('linktr.ee') ||
          urlLower.includes('whatsapp.com');
          
        if (!isSocialOrDirectory) {
          hasWebsite = true;
        }
      }

      // If filtering for only no website, skip places that have a real website
      if (onlyWithoutWebsite && hasWebsite) return null;

      const name = props.name || props.address_line1 || 'Empresa sem nome';
      let category = 'Comércio Geral';
      if (props.categories && props.categories.length > 0) {
        const parts = props.categories[0].split('.');
        category = parts.pop().replace(/_/g, ' ');
      }
      
      const address = props.formatted || 'Endereço não detalhado';
      const phone = props.contact?.phone || null;
      const city = props.city || 'Cidade não especificada'; 

      return {
        id: `geoapify-${props.place_id}`,
        name,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        address,
        city,
        phone,
        whatsapp: null,
        instagram: isSocialOrDirectory && websiteUrl?.toLowerCase().includes('instagram') ? websiteUrl : null,
        websiteStatus: hasWebsite ? 'Possui site' : 'SEM SITE',
        website: hasWebsite ? websiteUrl : null,
        lat: props.lat,
        lon: props.lon, 
        rating: null,
        reviewsCount: null
      };
    }).filter(Boolean); // Remove nulls
  }
}

export const api = new GeoapifySearchService();

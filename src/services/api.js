// API Service
// Integration with Overpass API (OpenStreetMap) to find real businesses
// This completely avoids fake data and returns real-world results.

export class LeadProspectingService {
  constructor() {
    this.baseUrl = '/api/overpass';
  }

  async searchCompanies(query, city, state, country, onlyWithoutWebsite) {
    const term = query.toLowerCase();
    let tag = '';
    
    if (term.includes('restaurante') || term.includes('comida') || term.includes('lanchonete')) {
      tag = '"amenity"~"restaurant|cafe|fast_food"';
    } else if (term.includes('academia')) {
      tag = '"leisure"="fitness_centre"';
    } else if (term.includes('salão') || term.includes('beleza')) {
      tag = '"shop"="beauty"';
    } else if (term.includes('dentista')) {
      tag = '"healthcare"="dentist"';
    } else if (term.includes('oficina') || term.includes('carro')) {
      tag = '"shop"="car_repair"';
    } else if (term.includes('loja')) {
      tag = '"shop"';
    } else {
      tag = `"name"~"${query}",i`;
    }

    const websiteFilter = onlyWithoutWebsite ? '[!"website"][!"contact:website"]' : '';
    
    // Step 1: Geocoding via Nominatim to get Bounding Box (Much faster than Area)
    let bboxString = '';
    const locationStr = city ? (state ? `${city}, ${state}, Brasil` : `${city}, Brasil`) : 'Brasil';
    
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0 && geoData[0].boundingbox) {
          const b = geoData[0].boundingbox;
          bboxString = `[bbox:${b[0]},${b[2]},${b[1]},${b[3]}]`;
        }
      }
    } catch (e) {
      console.warn("Geocoding falhou, usando busca por área", e);
    }

    // Step 2: Build the Overpass Query
    let overpassQuery = '';
    if (bboxString) {
      overpassQuery = `
        [out:json][timeout:25]${bboxString};
        (
          node[${tag}]${websiteFilter};
          way[${tag}]${websiteFilter};
          relation[${tag}]${websiteFilter};
        );
        out center 150;
      `;
    } else {
      const locationQuery = city ? `area["name"~"${city}",i]["admin_level"="8"]->.searchArea;` : `area["name"~"Brasil",i]["admin_level"="2"]->.searchArea;`;
      const searchArea = city ? '(area.searchArea)' : '(area.searchArea)';
      overpassQuery = `
        [out:json][timeout:25];
        ${locationQuery}
        (
          node[${tag}]${websiteFilter}${searchArea};
          way[${tag}]${websiteFilter}${searchArea};
          relation[${tag}]${websiteFilter}${searchArea};
        );
        out center 150;
      `;
    }

    // Step 3: Fetch using our local robust backend proxy
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
        throw new Error(errData.error || `Falha no servidor (${response.status}).`);
      }

      const data = await response.json();
      return this.formatResults(data.elements, onlyWithoutWebsite);
    } catch (error) {
      console.error("Search Error:", error);
      throw error;
    }
  }

  formatResults(elements, onlyWithoutWebsite) {
    if (!elements) return [];

    return elements.map(el => {
      const tags = el.tags || {};
      const hasWebsite = !!(tags.website || tags['contact:website'] || tags.url);
      
      // If the query was to find only without website, and it has one, skip (handled by query, but double check)
      if (onlyWithoutWebsite && hasWebsite) return null;

      const name = tags.name || tags.brand || 'Empresa sem nome registrado';
      const category = tags.amenity || tags.shop || tags.leisure || tags.healthcare || 'Comércio Geral';
      
      const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;
      const whatsapp = tags['contact:whatsapp'] || null;
      const instagram = tags['contact:instagram'] || null;

      let address = '';
      if (tags['addr:street']) {
        address += tags['addr:street'];
        if (tags['addr:housenumber']) address += `, ${tags['addr:housenumber']}`;
        if (tags['addr:suburb']) address += ` - ${tags['addr:suburb']}`;
      } else {
        address = 'Endereço não detalhado';
      }

      const city = tags['addr:city'] || tags['addr:municipality'] || 'Cidade não especificada';

      return {
        id: `osm-${el.type}-${el.id}`,
        name,
        category: this.translateCategory(category),
        address,
        city,
        phone,
        whatsapp,
        instagram,
        websiteStatus: hasWebsite ? 'Site encontrado' : 'Sem site',
        website: hasWebsite ? (tags.website || tags['contact:website'] || tags.url) : null,
        lat: el.lat || (el.center && el.center.lat),
        lon: el.lon || (el.center && el.center.lon),
        rating: null, // OSM doesn't typically store dynamic ratings
        reviewsCount: null
      };
    }).filter(Boolean); // Remove nulls
  }

  translateCategory(cat) {
    const map = {
      'restaurant': 'Restaurante',
      'cafe': 'Café',
      'fast_food': 'Fast Food',
      'fitness_centre': 'Academia',
      'beauty': 'Salão de Beleza',
      'dentist': 'Dentista',
      'car_repair': 'Oficina Mecânica',
      'supermarket': 'Supermercado',
      'bakery': 'Padaria',
      'pharmacy': 'Farmácia',
      'clothes': 'Loja de Roupas'
    };
    return map[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ');
  }
}

export const api = new LeadProspectingService();

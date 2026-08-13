// API Service
// Integration with Overpass API (OpenStreetMap) to find real businesses
// This completely avoids fake data and returns real-world results.

export class LeadProspectingService {
  constructor() {
    this.baseUrl = '/api/overpass';
  }

  async searchCompanies(query, city, state, country, onlyWithoutWebsite) {
    // Basic mapping of user query to OSM tags. 
    // In a production environment, this would be more robust.
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
      // General fallback using name
      tag = `"name"~"${query}",i`;
    }

    const websiteFilter = onlyWithoutWebsite ? '[!"website"][!"contact:website"]' : '';
    
    // Construct Overpass QL query
    // Search within the specific city (admin_level 8) or Country (admin_level 2).
    const locationQuery = city ? `area["name"~"${city}",i]["admin_level"="8"]->.searchArea;` : `area["name"~"Brasil",i]["admin_level"="2"]->.searchArea;`;
    const searchArea = city ? '(area.searchArea)' : '(area.searchArea)';

    const overpassQuery = `
      [out:json][timeout:25];
      ${locationQuery}
      (
        node[${tag}]${websiteFilter}${searchArea};
        way[${tag}]${websiteFilter}${searchArea};
        relation[${tag}]${websiteFilter}${searchArea};
      );
      out center 150;
    `;

    try {
      const response = await fetch(`${this.baseUrl}?data=${encodeURIComponent(overpassQuery)}`);

      if (response.status === 429) {
        throw new Error('Serviço de busca sobrecarregado. Tente novamente em alguns segundos.');
      }
      if (!response.ok) {
        throw new Error('Falha ao conectar com o serviço de busca.');
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

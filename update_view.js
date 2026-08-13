import fs from 'fs';

const filePath = 'src/views/searchView.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetFunction = `function renderResultCards(container, results) {`;
const newFunction = `function renderResultCards(container, results) {
  container.innerHTML = results.map((lead, index) => {
    const hasPhone = !!lead.phone;
    const isNoSite = lead.websiteStatus === 'SEM SITE';
    
    // Fallbacks and extra data
    const phoneToCopy = lead.phone || 'Não disponível';
    const addressToCopy = lead.address || 'Não disponível';
    const mapLink = lead.lat && lead.lon ? \`https://www.google.com/maps/search/?api=1&query=\${lead.lat},\${lead.lon}\` : \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(lead.address)}\`;
    
    return \`
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
        <div class="p-5 flex-1">
          <div class="flex justify-between items-start mb-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${isNoSite ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
              <i data-lucide="\${isNoSite ? 'globe-2' : 'globe'}" class="w-3 h-3 mr-1"></i> \${lead.websiteStatus}
            </span>
            <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wider">\${lead.category}</span>
          </div>
          
          <h4 class="text-lg font-bold text-gray-900 mb-1 leading-tight">\${lead.name}</h4>
          \${lead.rating ? \`
          <div class="flex items-center gap-1 text-sm text-yellow-600 font-medium mb-2">
            <i data-lucide="star" class="w-4 h-4 fill-current"></i>
            <span>\${lead.rating}</span>
            <span class="text-gray-400 font-normal ml-1">(\${lead.reviewsCount} avaliações)</span>
          </div>\` : ''}
          
          <div class="space-y-3 mt-4">
            <div class="flex items-start gap-2 text-sm text-gray-600">
              <i data-lucide="map-pin" class="w-4 h-4 shrink-0 mt-0.5 text-gray-400"></i>
              <div class="flex-1">
                <span class="line-clamp-2">\${lead.address}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-2 text-sm \${hasPhone ? 'text-gray-600' : 'text-gray-400 italic'}">
              <i data-lucide="phone" class="w-4 h-4 shrink-0 \${hasPhone ? 'text-gray-400' : ''}"></i>
              <span>\${hasPhone ? lead.phone : 'Telefone não disponível'}</span>
            </div>
            
            <div class="flex items-center gap-2 text-sm text-gray-600">
               <i data-lucide="globe" class="w-4 h-4 shrink-0 text-gray-400"></i>
               <span class="truncate">\${lead.website ? lead.website : (lead.instagram ? lead.instagram : 'Não encontrado')}</span>
            </div>
          </div>
        </div>
        
        <div class="px-5 pb-3 flex flex-wrap gap-2">
          \${hasPhone ? \`<button onclick="navigator.clipboard.writeText('\${phoneToCopy}')" class="text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-2 py-1.5 rounded flex items-center gap-1" title="Copiar Telefone">
            <i data-lucide="copy" class="w-3 h-3"></i> Telefone
          </button>\` : ''}
          <button onclick="navigator.clipboard.writeText('\${addressToCopy}')" class="text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-2 py-1.5 rounded flex items-center gap-1" title="Copiar Endereço">
            <i data-lucide="copy" class="w-3 h-3"></i> Endereço
          </button>
          <a href="\${mapLink}" target="_blank" class="text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-2 py-1.5 rounded flex items-center gap-1" title="Abrir no Mapa">
            <i data-lucide="map" class="w-3 h-3"></i> Mapa
          </a>
          \${lead.website || lead.instagram ? \`<a href="\${lead.website || lead.instagram}" target="_blank" class="text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-2 py-1.5 rounded flex items-center gap-1" title="Abrir Site">
            <i data-lucide="external-link" class="w-3 h-3"></i> Site
          </a>\` : ''}
        </div>
        
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button data-index="\${index}" class="add-lead-btn flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Adicionar ao CRM
          </button>
        </div>
      </div>
    \`;
  }).join('');

  createIcons({ icons: { MapPin, Phone, MessageCircle, Plus, Star, Copy, Map, ExternalLink, Globe, Globe2, Loader2, Check } });

  // Attach event listeners to Add buttons
  container.querySelectorAll('.add-lead-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.currentTarget.dataset.index;
      const lead = results[idx];
      
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
      btn.disabled = true;
      createIcons({ icons: { Loader2 }, nameAttr: 'data-lucide' });

      try {
        await db.saveLead(lead);
        btn.innerHTML = '<span class="text-green-600 flex items-center gap-1"><i data-lucide="check" class="w-4 h-4"></i> Adicionado</span>';
        btn.classList.remove('hover:text-blue-600', 'hover:bg-gray-50', 'text-gray-700');
        btn.classList.add('border-green-300', 'bg-green-50');
        createIcons({ icons: { Check }, nameAttr: 'data-lucide' });
      } catch (err) {
        alert(err.message || 'Erro ao salvar lead.');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    });
  });
}
`;

const startIndex = code.indexOf(targetFunction);
if (startIndex !== -1) {
  code = code.substring(0, startIndex) + newFunction;
}

const importTarget = `import { Search, MapPin, Phone, MessageCircle, Plus, Loader2, AlertCircle, Check, Star } from 'lucide';`;
const importReplacement = `import { Search, MapPin, Phone, MessageCircle, Plus, Loader2, AlertCircle, Check, Star, Copy, Map, ExternalLink, Globe, Globe2 } from 'lucide';`;
code = code.replace(importTarget, importReplacement);
code = code.replace('base do Google Places', 'Geoapify Places API');

fs.writeFileSync(filePath, code);

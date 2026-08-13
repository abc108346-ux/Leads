import { api } from '../services/api.js';
import { db } from '../services/db.js';
import { createIcons, MapPin, Phone, MessageCircle, Plus, AlertCircle, Loader2, Check, Search } from 'lucide';

let currentResults = [];

export function renderSearchPage(container) {
  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Procurar Leads</h2>
          <p class="text-gray-500 text-sm mt-1">Encontre empresas reais que não possuem presença digital estruturada.</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <form id="search-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">O que você procura?</label>
              <input type="text" id="query" required class="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: restaurantes, academias, salão de beleza">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" id="city" required class="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: São Paulo">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input type="text" id="state" class="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: SP">
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-6 pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="only-no-website" checked class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
              <span class="text-sm font-medium text-gray-700">Somente empresas sem site</span>
            </label>
            <div class="flex-1"></div>
            <button type="submit" id="search-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
              <i data-lucide="search" class="w-4 h-4"></i> Encontrar Leads
            </button>
          </div>
        </form>
      </div>

      <div id="results-container" class="hidden space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-800">Resultados da Busca</h3>
          <span id="results-count" class="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1 rounded-full">0 encontrados</span>
        </div>
        <div id="results-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <!-- Results will be injected here -->
        </div>
      </div>

      <div id="loading-state" class="hidden flex-col items-center justify-center py-12">
        <i data-lucide="loader-2" class="w-8 h-8 text-blue-600 animate-spin mb-4"></i>
        <p class="text-gray-600 font-medium">Buscando empresas reais na base de dados (OSM)...</p>
        <p class="text-gray-400 text-sm mt-1">Isso pode levar alguns segundos dependendo da região.</p>
      </div>
      
      <div id="error-state" class="hidden bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
        <i data-lucide="alert-circle" class="w-5 h-5 shrink-0 mt-0.5"></i>
        <div>
          <h4 class="font-semibold">Erro na busca</h4>
          <p id="error-message" class="text-sm mt-1">Ocorreu um erro ao conectar com o serviço de busca.</p>
        </div>
      </div>
    </div>
  `;

  createIcons({ icons: { Search, Loader2, AlertCircle } });

  const form = document.getElementById('search-form');
  const btn = document.getElementById('search-btn');
  const resultsContainer = document.getElementById('results-container');
  const resultsGrid = document.getElementById('results-grid');
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const countSpan = document.getElementById('results-count');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = document.getElementById('query').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const country = 'Brasil';
    const onlyNoWebsite = document.getElementById('only-no-website').checked;

    if (!query || !city) return;

    // UI Updates
    resultsContainer.classList.add('hidden');
    errorState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    btn.disabled = true;
    btn.classList.add('opacity-70');

    try {
      currentResults = await api.searchCompanies(query, city, state, country, onlyNoWebsite);
      
      loadingState.classList.add('hidden');
      
      if (currentResults.length === 0) {
        resultsGrid.innerHTML = `
          <div class="col-span-full py-12 text-center">
            <p class="text-gray-500 font-medium">Nenhuma empresa encontrada com estes critérios.</p>
            <p class="text-gray-400 text-sm mt-1">Tente buscar por termos mais genéricos ou mudar a cidade.</p>
          </div>
        `;
      } else {
        renderResultCards(resultsGrid, currentResults);
      }
      
      countSpan.textContent = `${currentResults.length} encontrado${currentResults.length === 1 ? '' : 's'}`;
      resultsContainer.classList.remove('hidden');
    } catch (err) {
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      document.getElementById('error-message').textContent = err.message || 'Erro ao consultar a API pública. Tente novamente mais tarde.';
    } finally {
      btn.disabled = false;
      btn.classList.remove('opacity-70');
    }
  });
}

function renderResultCards(container, results) {
  container.innerHTML = results.map((lead, index) => {
    const hasPhone = !!lead.phone;
    const isNoSite = lead.websiteStatus === 'Sem site';

    return `
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
        <div class="p-5 flex-1">
          <div class="flex justify-between items-start mb-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isNoSite ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
              ${lead.websiteStatus}
            </span>
            <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-wider">${lead.category}</span>
          </div>
          
          <h4 class="text-lg font-bold text-gray-900 mb-1 leading-tight">${lead.name}</h4>
          
          <div class="space-y-2 mt-4">
            <div class="flex items-start gap-2 text-sm text-gray-600">
              <i data-lucide="map-pin" class="w-4 h-4 shrink-0 mt-0.5 text-gray-400"></i>
              <span class="line-clamp-2">${lead.address}</span>
            </div>
            
            ${hasPhone ? `
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <i data-lucide="phone" class="w-4 h-4 shrink-0 text-gray-400"></i>
                <span>${lead.phone}</span>
              </div>
            ` : `
              <div class="flex items-center gap-2 text-sm text-gray-400 italic">
                <i data-lucide="phone" class="w-4 h-4 shrink-0"></i>
                <span>Telefone não disponível</span>
              </div>
            `}
          </div>
        </div>
        
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button data-index="${index}" class="add-lead-btn flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Adicionar ao CRM
          </button>
        </div>
      </div>
    `;
  }).join('');

  createIcons({ icons: { MapPin, Phone, MessageCircle, Plus } });

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

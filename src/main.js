import './index.css';
import { createIcons, Search, Users, LayoutDashboard, Settings } from 'lucide';
import { renderSearchPage } from './views/searchView.js';
import { renderCrmPage } from './views/crmView.js';
import { renderDashboardPage } from './views/dashboardView.js';

const app = document.getElementById('app');

const state = {
  currentRoute: 'search'
};

function renderLayout() {
  app.innerHTML = `
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
      <div class="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 class="text-lg font-bold text-gray-800">Prospecção</h1>
      </div>
      <nav class="flex-1 py-4 space-y-1 px-3">
        <a href="#search" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors" data-route="search">
          <i data-lucide="search" class="w-5 h-5"></i> Procurar Leads
        </a>
        <a href="#crm" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors" data-route="crm">
          <i data-lucide="users" class="w-5 h-5"></i> CRM
        </a>
        <a href="#dashboard" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors" data-route="dashboard">
          <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Dashboard
        </a>
      </nav>
      <div class="p-4 border-t border-gray-200">
        <a href="#settings" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <i data-lucide="settings" class="w-5 h-5"></i> Configurações
        </a>
      </div>
    </aside>

    <div class="flex-1 flex flex-col h-full overflow-hidden relative">
      <!-- Mobile header -->
      <header class="md:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
        <h1 class="text-lg font-bold text-gray-800">Prospecção</h1>
        <div class="flex gap-4">
          <a href="#search"><i data-lucide="search" class="w-5 h-5 text-gray-600"></i></a>
          <a href="#crm"><i data-lucide="users" class="w-5 h-5 text-gray-600"></i></a>
          <a href="#dashboard"><i data-lucide="layout-dashboard" class="w-5 h-5 text-gray-600"></i></a>
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content" class="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8"></main>
    </div>
  `;
}

function updateNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.route === state.currentRoute) {
      link.classList.add('bg-blue-50', 'text-blue-700');
      link.classList.remove('text-gray-600', 'hover:bg-gray-50');
    } else {
      link.classList.remove('bg-blue-50', 'text-blue-700');
      link.classList.add('text-gray-600', 'hover:bg-gray-50');
    }
  });
}

function router() {
  const hash = window.location.hash.slice(1) || 'search';
  state.currentRoute = hash;
  
  updateNavigation();
  
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '';

  switch (hash) {
    case 'search':
      renderSearchPage(mainContent);
      break;
    case 'crm':
      renderCrmPage(mainContent);
      break;
    case 'dashboard':
      renderDashboardPage(mainContent);
      break;
    case 'settings':
      renderSettingsPage(mainContent);
      break;
    default:
      renderSearchPage(mainContent);
  }
  
  // Initialize lucide icons
  createIcons({
    icons: { Search, Users, LayoutDashboard, Settings }
  });
}

function renderSettingsPage(container) {
  container.innerHTML = `
    <div class="max-w-3xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Integração de API de Busca</h3>
        <p class="text-sm text-gray-600 mb-6">
          Para realizar buscas de empresas reais sem limites artificiais, configure a chave de acesso da API de Busca.
          O sistema foi preparado para se integrar de forma real, retornando empresas verificadas.
        </p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Chave da API</label>
            <input type="password" id="api-key-input" class="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Insira sua API Key aqui">
          </div>
          <button id="save-settings" class="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">Salvar Configurações</button>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById('api-key-input');
  const btn = document.getElementById('save-settings');
  
  input.value = localStorage.getItem('PROSPECT_API_KEY') || '';
  
  btn.addEventListener('click', () => {
    localStorage.setItem('PROSPECT_API_KEY', input.value.trim());
    alert('Configurações salvas com sucesso!');
  });
}

// Init
window.addEventListener('hashchange', router);
renderLayout();
router();

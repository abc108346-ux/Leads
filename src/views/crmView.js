import { db, STATUSES } from '../services/db.js';
import { exportToCSV } from '../utils/export.js';
import { createIcons, Search, Download, Trash2, Phone, MapPin, Edit3, MessageCircle } from 'lucide';

let currentLeads = [];
let currentView = 'kanban';

export async function renderCrmPage(container) {
  container.innerHTML = `
    <div class="h-full flex flex-col space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">CRM de Leads</h2>
          <p class="text-gray-500 text-sm mt-1">Gerencie seus contatos e acompanhe o funil de vendas.</p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <div class="bg-white border border-gray-200 rounded-lg p-1 flex">
            <button id="view-kanban" class="${currentView === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'} px-3 py-1.5 rounded-md text-sm font-medium transition-colors">Kanban</button>
            <button id="view-table" class="${currentView === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'} px-3 py-1.5 rounded-md text-sm font-medium transition-colors">Tabela</button>
          </div>
          <button id="export-csv" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <i data-lucide="download" class="w-4 h-4"></i> Exportar
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0 flex gap-4">
        <div class="relative flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
          </div>
          <input type="text" id="crm-search" class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Buscar por nome ou cidade...">
        </div>
      </div>

      <!-- Main CRM Area -->
      <div id="crm-content" class="flex-1 overflow-hidden">
        <div class="flex h-full items-center justify-center">
          <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-blue-600"></i>
        </div>
      </div>
    </div>
  `;

  createIcons({ icons: { Search, Download } });

  document.getElementById('view-kanban').addEventListener('click', () => setView('kanban', container));
  document.getElementById('view-table').addEventListener('click', () => setView('table', container));
  
  document.getElementById('export-csv').addEventListener('click', () => {
    if (currentLeads.length > 0) {
      exportToCSV(currentLeads, 'prospeccao_leads.csv');
    } else {
      alert('Nenhum lead para exportar.');
    }
  });

  const searchInput = document.getElementById('crm-search');
  searchInput.addEventListener('input', (e) => {
    renderContent(e.target.value.toLowerCase());
  });

  await loadLeads();
}

async function loadLeads() {
  try {
    currentLeads = await db.getLeads();
    // Sort by newest first
    currentLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderContent(document.getElementById('crm-search').value.toLowerCase());
  } catch (err) {
    console.error("Failed to load leads", err);
  }
}

function setView(view, container) {
  currentView = view;
  // Quick re-render of active tab state
  const kBtn = document.getElementById('view-kanban');
  const tBtn = document.getElementById('view-table');
  
  if (view === 'kanban') {
    kBtn.className = 'bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium transition-colors';
    tBtn.className = 'text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors';
  } else {
    tBtn.className = 'bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md text-sm font-medium transition-colors';
    kBtn.className = 'text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors';
  }

  renderContent(document.getElementById('crm-search').value.toLowerCase());
}

function renderContent(searchQuery = '') {
  const content = document.getElementById('crm-content');
  
  let filteredLeads = currentLeads;
  if (searchQuery) {
    filteredLeads = currentLeads.filter(l => 
      l.name.toLowerCase().includes(searchQuery) || 
      (l.city && l.city.toLowerCase().includes(searchQuery))
    );
  }

  if (currentView === 'kanban') {
    content.innerHTML = renderKanban(filteredLeads);
    setupKanbanDragAndDrop();
  } else {
    content.innerHTML = renderTable(filteredLeads);
  }
  
  createIcons({ icons: { Phone, MapPin, Trash2, Edit3, MessageCircle } });
  
  // Attach delete handlers
  document.querySelectorAll('.delete-lead').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Tem certeza que deseja excluir este lead?')) {
        const id = e.currentTarget.dataset.id;
        await db.deleteLead(id);
        await loadLeads();
      }
    });
  });

  // Attach status change for table view
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      await db.updateLeadStatus(id, newStatus);
      await loadLeads();
    });
  });
}

function renderKanban(leads) {
  const columns = STATUSES.map(status => {
    const colLeads = leads.filter(l => l.status === status);
    
    return `
      <div class="flex-shrink-0 w-80 bg-gray-100 rounded-xl flex flex-col max-h-full overflow-hidden border border-gray-200">
        <div class="p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex justify-between items-center shrink-0">
          <h3 class="font-semibold text-gray-700 text-sm">${status}</h3>
          <span class="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">${colLeads.length}</span>
        </div>
        <div class="p-3 flex-1 overflow-y-auto space-y-3 kanban-column" data-status="${status}">
          ${colLeads.map(lead => `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:border-blue-300 transition-colors kanban-card relative group" draggable="true" data-id="${lead.id}">
              <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">${lead.category}</span>
                <button class="delete-lead text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-id="${lead.id}" title="Excluir">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
              <h4 class="font-bold text-gray-900 text-sm mb-2 leading-tight">${lead.name}</h4>
              <div class="text-xs text-gray-500 space-y-1.5">
                <div class="flex items-start gap-1.5">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5 shrink-0"></i>
                  <span class="line-clamp-1">${lead.city}</span>
                </div>
                ${lead.phone ? `
                  <div class="flex items-center gap-1.5">
                    <i data-lucide="phone" class="w-3.5 h-3.5 shrink-0"></i>
                    <span>${lead.phone}</span>
                  </div>
                ` : ''}
              </div>
              <div class="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                ${lead.phone ? `
                  <a href="https://wa.me/${lead.phone.replace(/\\D/g, '')}" target="_blank" class="flex-1 bg-green-50 text-green-700 hover:bg-green-100 text-xs py-1.5 rounded text-center font-medium transition-colors flex justify-center items-center gap-1">
                    <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Whats
                  </a>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="flex gap-4 h-full overflow-x-auto pb-4 custom-scrollbar items-start">
      ${columns}
    </div>
  `;
}

function renderTable(leads) {
  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div class="overflow-x-auto flex-1">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${leads.map(lead => `
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-bold text-gray-900">${lead.name}</div>
                  <div class="text-xs text-gray-500">${lead.category}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${lead.phone || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${lead.city}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <select class="status-select block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-1" data-id="${lead.id}">
                    ${STATUSES.map(s => `
                      <option value="${s}" ${lead.status === s ? 'selected' : ''}>${s}</option>
                    `).join('')}
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  ${lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/\\D/g, '')}" target="_blank" class="text-green-600 hover:text-green-900 mr-3" title="WhatsApp"><i data-lucide="message-circle" class="w-4 h-4 inline"></i></a>` : ''}
                  <button class="delete-lead text-red-600 hover:text-red-900" data-id="${lead.id}" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${leads.length === 0 ? '<div class="p-8 text-center text-gray-500">Nenhum lead encontrado.</div>' : ''}
      </div>
    </div>
  `;
}

function setupKanbanDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.kanban-column');
  
  let draggedCard = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
      draggedCard = card;
      card.classList.add('opacity-50', 'ring-2', 'ring-blue-500');
    });

    card.addEventListener('dragend', () => {
      draggedCard.classList.remove('opacity-50', 'ring-2', 'ring-blue-500');
      draggedCard = null;
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', e => {
      e.preventDefault();
      column.classList.add('bg-blue-50');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('bg-blue-50');
    });

    column.addEventListener('drop', async e => {
      e.preventDefault();
      column.classList.remove('bg-blue-50');
      
      if (draggedCard) {
        const newStatus = column.dataset.status;
        const leadId = draggedCard.dataset.id;
        
        column.appendChild(draggedCard);
        
        try {
          await db.updateLeadStatus(leadId, newStatus);
          // Don't fully reload, just keep DOM updated for performance, but we should update counters
          loadLeads(); // Simple approach to re-sync
        } catch (err) {
          console.error(err);
          alert('Erro ao atualizar status');
        }
      }
    });
  });
}

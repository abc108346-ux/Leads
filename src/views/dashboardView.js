import { db } from '../services/db.js';
import { createIcons, TrendingUp, Users, CheckCircle, Clock } from 'lucide';
import Chart from 'chart.js/auto';

export async function renderDashboardPage(container) {
  container.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Dashboard de Conversão</h2>
        <p class="text-gray-500 text-sm mt-1">Acompanhe suas métricas e o desempenho do seu funil.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Stat Cards -->
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="bg-blue-100 p-3 rounded-lg text-blue-600">
            <i data-lucide="users" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Total no CRM</p>
            <h3 id="stat-total" class="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="bg-amber-100 p-3 rounded-lg text-amber-600">
            <i data-lucide="clock" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Em Negociação</p>
            <h3 id="stat-neg" class="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="bg-green-100 p-3 rounded-lg text-green-600">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Clientes Fechados</p>
            <h3 id="stat-fechados" class="text-2xl font-bold text-gray-900">0</h3>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="bg-purple-100 p-3 rounded-lg text-purple-600">
            <i data-lucide="trending-up" class="w-6 h-6"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Taxa de Conversão</p>
            <h3 id="stat-taxa" class="text-2xl font-bold text-gray-900">0%</h3>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 class="text-base font-semibold text-gray-800 mb-4">Funil de Vendas</h3>
          <div class="h-64 relative w-full">
            <canvas id="funnelChart"></canvas>
          </div>
        </div>
        
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 class="text-base font-semibold text-gray-800 mb-4">Leads por Categoria</h3>
          <div class="h-64 relative w-full flex justify-center">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  createIcons({ icons: { TrendingUp, Users, CheckCircle, Clock } });

  await loadDashboardData();
}

async function loadDashboardData() {
  const stats = await db.getStats();
  
  document.getElementById('stat-total').textContent = stats.total;
  
  const inNeg = (stats.byStatus['NEGOCIAÇÃO'] || 0) + (stats.byStatus['PROPOSTA ENVIADA'] || 0);
  document.getElementById('stat-neg').textContent = inNeg;
  
  const closed = stats.byStatus['FECHADO'] || 0;
  document.getElementById('stat-fechados').textContent = closed;
  
  const conversionRate = stats.total > 0 ? Math.round((closed / stats.total) * 100) : 0;
  document.getElementById('stat-taxa').textContent = `${conversionRate}%`;

  renderCharts(stats);
}

let funnelChartInstance = null;
let categoryChartInstance = null;

function renderCharts(stats) {
  // Funnel Data
  const funnelCtx = document.getElementById('funnelChart').getContext('2d');
  
  if (funnelChartInstance) funnelChartInstance.destroy();
  
  funnelChartInstance = new Chart(funnelCtx, {
    type: 'bar',
    data: {
      labels: ['Novos', 'Contatados', 'Negociação/Proposta', 'Fechados'],
      datasets: [{
        label: 'Quantidade de Leads',
        data: [
          stats.byStatus['NOVO'] || 0,
          (stats.byStatus['CONTATADO'] || 0) + (stats.byStatus['RESPONDEU'] || 0),
          (stats.byStatus['NEGOCIAÇÃO'] || 0) + (stats.byStatus['PROPOSTA ENVIADA'] || 0),
          stats.byStatus['FECHADO'] || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(139, 92, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
          'rgb(16, 185, 129)'
        ],
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });

  // Category Data
  const catCtx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  const catLabels = Object.keys(stats.byCategory);
  const catData = Object.values(stats.byCategory);

  if (catLabels.length === 0) {
    catLabels.push('Sem dados');
    catData.push(1);
  }

  categoryChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#6366f1'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, usePointStyle: true }
        }
      }
    }
  });
}

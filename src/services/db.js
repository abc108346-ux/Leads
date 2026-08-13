// Database Service
// Prepared to be swapped with a real database like Firebase, Supabase, or PostgreSQL via REST

const STATUSES = ['NOVO', 'CONTATADO', 'RESPONDEU', 'NEGOCIAÇÃO', 'PROPOSTA ENVIADA', 'FECHADO', 'PERDIDO'];

export class DatabaseService {
  constructor() {
    this.storageKey = 'prospect_crm_leads';
    this.initialize();
  }

  initialize() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  async getLeads() {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 150));
    return JSON.parse(localStorage.getItem(this.storageKey));
  }

  async getLead(id) {
    const leads = await this.getLeads();
    return leads.find(l => l.id === id);
  }

  async saveLead(leadData) {
    const leads = await this.getLeads();
    
    // Check if lead already exists based on name & address
    const exists = leads.find(l => l.name === leadData.name && l.address === leadData.address);
    if (exists) {
      throw new Error('Lead já existe no CRM.');
    }

    const newLead = {
      ...leadData,
      id: crypto.randomUUID(),
      status: 'NOVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: []
    };

    leads.push(newLead);
    localStorage.setItem(this.storageKey, JSON.stringify(leads));
    return newLead;
  }

  async updateLeadStatus(id, newStatus) {
    if (!STATUSES.includes(newStatus)) throw new Error('Status inválido');
    
    const leads = await this.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lead não encontrado');

    leads[index].status = newStatus;
    leads[index].updatedAt = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(leads));
    return leads[index];
  }

  async addNote(id, noteText) {
    const leads = await this.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lead não encontrado');

    leads[index].notes.push({
      id: crypto.randomUUID(),
      text: noteText,
      createdAt: new Date().toISOString()
    });
    leads[index].updatedAt = new Date().toISOString();
    localStorage.setItem(this.storageKey, JSON.stringify(leads));
    return leads[index];
  }

  async deleteLead(id) {
    const leads = await this.getLeads();
    const filtered = leads.filter(l => l.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async getStats() {
    const leads = await this.getLeads();
    const stats = {
      total: leads.length,
      byStatus: {},
      byCategory: {}
    };

    STATUSES.forEach(s => stats.byStatus[s] = 0);

    leads.forEach(l => {
      stats.byStatus[l.status]++;
      if (l.category) {
        stats.byCategory[l.category] = (stats.byCategory[l.category] || 0) + 1;
      }
    });

    return stats;
  }
}

export const db = new DatabaseService();
export { STATUSES };

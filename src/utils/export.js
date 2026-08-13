import Papa from 'papaparse';

export function exportToCSV(leads, filename = 'leads.csv') {
  if (!leads || leads.length === 0) return;

  const data = leads.map(l => ({
    'Nome da Empresa': l.name || '',
    'Categoria': l.category || '',
    'Telefone': l.phone || '',
    'WhatsApp': l.whatsapp || '',
    'Endereço': l.address || '',
    'Cidade': l.city || '',
    'Status do Site': l.websiteStatus || '',
    'Status CRM': l.status || '',
    'Data de Entrada': new Date(l.createdAt).toLocaleDateString('pt-BR') || ''
  }));

  const csv = Papa.unparse(data);
  
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

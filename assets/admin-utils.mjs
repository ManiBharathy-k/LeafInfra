export const labels = {new:'New',contacted:'Contacted',site_visit:'Site visit',quote_sent:'Quote sent',won:'Won',lost:'Lost'};
export const indiaToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function csvCell(value) {
  let text = String(value ?? '');
  // Spreadsheet applications may execute formula-like values, even inside quoted CSV fields.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function leadsCsv(leads) {
  return '\ufeff'+[['Reference','Received','Name','Phone','Email','Project','Location','Source','Status','Follow-up'],
    ...leads.map(l=>[l.id,l.created_at,l.name,l.phone,l.email,l.project_type,l.location,l.lead_source,labels[l.status] || l.status,l.follow_up_date])]
    .map(row=>row.map(csvCell).join(',')).join('\r\n');
}

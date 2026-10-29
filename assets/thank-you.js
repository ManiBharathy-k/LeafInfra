let receipt;
try {receipt=JSON.parse(sessionStorage.getItem('leafinfra:last-enquiry')||'null');}catch{}
if(receipt && /^[0-9a-f-]{36}$/i.test(receipt.reference) && Number.isFinite(receipt.savedAt) && Date.now()-receipt.savedAt<86400000 && receipt.savedAt<=Date.now()) {
  document.getElementById('thanks-title').textContent='Your vision. Our next conversation.';
  document.getElementById('thanks-copy').textContent='Thank you. Your enquiry has been saved, and the Leaf Infra team can now review your project details. Keep your reference below for any follow-up.';
  document.getElementById('receipt-reference').textContent=receipt.reference;
  document.getElementById('receipt').hidden=false;
  document.getElementById('thanks-eyebrow').textContent='ENQUIRY RECEIVED / THANK YOU';
}

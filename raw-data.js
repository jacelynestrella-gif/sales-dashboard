let rawCurrentPage=1;
let rawRowsPerPage=25;
let rawSearchTerm='';
let rawSortKey='';
let rawSortDirection='asc';
let rawVisibleRows=[];
let rawEditRow=null;
let rawModalMode='edit';

function initRawDataView(){
  const container=document.getElementById('rawDataTableContainer');
  if(!container)return;

  const search=document.getElementById('rawSearchInput');
  const rowsSelect=document.getElementById('rawRowsPerPage');
  const addBtn=document.getElementById('rawAddBtn');

  ensureRawEditModal();

  if(search&&!search.dataset.bound){
    search.dataset.bound='1';
    search.addEventListener('input',()=>{
      rawSearchTerm=search.value.toLowerCase().trim();
      rawCurrentPage=1;
      renderRawDataTable();
    });
  }

  if(rowsSelect&&!rowsSelect.dataset.bound){
    rowsSelect.dataset.bound='1';
    rowsSelect.addEventListener('change',()=>{
      rawRowsPerPage=Number(rowsSelect.value||25);
      rawCurrentPage=1;
      renderRawDataTable();
    });
  }

  if(addBtn&&!addBtn.dataset.bound){
    addBtn.dataset.bound='1';
    addBtn.addEventListener('click',openRawAddModal);
  }

  renderRawDataTable();
}

function getRawRows(){
  if(typeof dashboardData!=='object'||!Array.isArray(dashboardData.raw))return[];
  return typeof filterRows==='function'?filterRows(dashboardData.raw):dashboardData.raw;
}

function getAllRawRows(){
  if(typeof dashboardData!=='object'||!Array.isArray(dashboardData.raw))return[];
  return dashboardData.raw;
}

function getRawRowsForSuggestions(){
  return getAllRawRows().length?getAllRawRows():getRawRows();
}

function isFormulaOrSystemField(header){
  const key=String(header||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const hiddenKeys=new Set(['controlno','total','month','year','monthyear','monthof','salesmonth','salesyear','salesmonthyear']);
  return hiddenKeys.has(key);
}

function getRawHeaders(rows){
  const preferred=['CONTROL_NO','DATE','SO#',"DEALER'S NAME",'BRAND','ORDER','QTY','PRICE','DISCOUNT','DISCOUNTED PRICE','TOTAL','CLIENT TOTAL AMOUNT','DOC. PROCESSED','SALES AGENT','CM STATUS','STATUS','CONCERN/PROMO','NOTES','Month','Year'];
  const allHeaders=[];
  rows.slice(0,50).forEach(row=>{
    Object.keys(row||{}).forEach(key=>{
      if(key&&!allHeaders.includes(key))allHeaders.push(key);
    });
  });
  const preferredExisting=preferred.filter(key=>allHeaders.includes(key));
  const others=allHeaders.filter(key=>!preferredExisting.includes(key));
  return ['Actions',...preferredExisting,...others];
}

function getEditableRawHeaders(row){
  return Object.keys(row||{}).filter(key=>key&&!isFormulaOrSystemField(key));
}

function getRawFormHeaders(){
  const rows=getRawRowsForSuggestions();
  if(rows.length)return getEditableRawHeaders(rows[0]);
  return ['DATE','SO#',"DEALER'S NAME",'BRAND','ORDER','QTY','PRICE','DISCOUNT','DISCOUNTED PRICE','CLIENT TOTAL AMOUNT','DOC. PROCESSED','SALES AGENT','CM STATUS','STATUS','CONCERN/PROMO','NOTES'];
}

function shouldUseSuggestions(header){
  const key=String(header||'').toLowerCase();
  return key.includes('dealer')||key.includes('brand')||key.includes('order')||key.includes('item')||key.includes('product')||key.includes('customer')||key.includes('doc')||key.includes('agent')||key.includes('status')||key.includes('concern')||key.includes('promo');
}

function getSuggestionListId(header){
  return 'rawList_'+String(header||'field').replace(/[^a-zA-Z0-9_-]/g,'_');
}

function getSuggestionsForHeader(header){
  const rows=getRawRowsForSuggestions();
  const values=new Set();
  rows.forEach(row=>{
    const value=row?.[header];
    if(value!==undefined&&value!==null&&String(value).trim()!=='')values.add(String(value).trim());
  });
  return [...values].sort((a,b)=>a.localeCompare(b)).slice(0,300);
}

function buildRawDatalist(header){
  if(!shouldUseSuggestions(header))return'';
  const listId=getSuggestionListId(header);
  const suggestions=getSuggestionsForHeader(header);
  return `<datalist id="${escapeHtml(listId)}">${suggestions.map(value=>`<option value="${escapeHtml(value)}"></option>`).join('')}</datalist>`;
}

function filterRawRows(rows){
  let output=[...rows];
  if(rawSearchTerm){
    output=output.filter(row=>Object.values(row||{}).some(value=>String(value||'').toLowerCase().includes(rawSearchTerm)));
  }
  if(rawSortKey){
    output.sort((a,b)=>{
      const aVal=a[rawSortKey]??'';
      const bVal=b[rawSortKey]??'';
      const aNum=typeof cleanNumber==='function'?cleanNumber(aVal):Number(aVal)||0;
      const bNum=typeof cleanNumber==='function'?cleanNumber(bVal):Number(bVal)||0;
      let result=0;
      if(aNum||bNum){result=aNum-bNum;}else{result=String(aVal).localeCompare(String(bVal));}
      return rawSortDirection==='asc'?result:-result;
    });
  }
  return output;
}

function renderRawDataTable(){
  const container=document.getElementById('rawDataTableContainer');
  const info=document.getElementById('rawTableInfo');
  const pagination=document.getElementById('rawPagination');
  if(!container)return;

  const rawRows=getRawRows();
  const filteredRows=filterRawRows(rawRows);
  rawVisibleRows=filteredRows;
  const headers=getRawHeaders(filteredRows.length?filteredRows:rawRows);
  const totalPages=Math.max(Math.ceil(filteredRows.length/rawRowsPerPage),1);
  rawCurrentPage=Math.min(rawCurrentPage,totalPages);

  const start=(rawCurrentPage-1)*rawRowsPerPage;
  const pageRows=filteredRows.slice(start,start+rawRowsPerPage);

  if(info){
    const from=filteredRows.length?start+1:0;
    const to=Math.min(start+rawRowsPerPage,filteredRows.length);
    info.textContent=`Showing ${from}-${to} of ${filteredRows.length} record(s)`;
  }

  if(!rawRows.length){
    container.innerHTML='<div class="empty-card">No RAW data available.</div>';
    if(pagination)pagination.innerHTML='';
    return;
  }

  container.innerHTML=`<div class="raw-table-wrap"><table class="raw-data-table"><thead><tr>${headers.map(header=>`<th data-raw-sort="${escapeHtml(header)}">${escapeHtml(header)}${rawSortKey===header?` <span>${rawSortDirection==='asc'?'▲':'▼'}</span>`:''}</th>`).join('')}</tr></thead><tbody>${pageRows.map((row,index)=>`<tr>${headers.map(header=>renderRawCell(header,row,start+index)).join('')}</tr>`).join('')}</tbody></table></div>`;

  container.querySelectorAll('th[data-raw-sort]').forEach(th=>{
    const key=th.dataset.rawSort;
    if(key==='Actions')return;
    th.addEventListener('click',()=>{
      if(rawSortKey===key){rawSortDirection=rawSortDirection==='asc'?'desc':'asc';}else{rawSortKey=key;rawSortDirection='asc';}
      renderRawDataTable();
    });
  });

  container.querySelectorAll('.raw-edit-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const index=Number(btn.dataset.rawIndex);
      openRawEditModal(rawVisibleRows[index]);
    });
  });

  renderRawPagination(totalPages);
}

function renderRawCell(header,row,index){
  if(header==='Actions')return `<td class="raw-actions"><button type="button" class="raw-edit-btn" data-raw-index="${index}">✎</button></td>`;
  const value=row[header]??'';
  return `<td>${escapeHtml(formatRawValue(value))}</td>`;
}

function ensureRawEditModal(){
  if(document.getElementById('rawEditModal'))return;
  const modal=document.createElement('div');
  modal.id='rawEditModal';
  modal.className='raw-modal-overlay';
  modal.innerHTML=`<div class="raw-modal"><div class="raw-modal-header"><div><h2 id="rawModalTitle">Edit Raw Record</h2><p id="rawEditControlNo">CONTROL_NO: -</p></div><button type="button" id="rawEditCloseBtn" class="raw-modal-close">×</button></div><div id="rawEditForm" class="raw-edit-form"></div><div class="raw-modal-footer"><button type="button" id="rawEditCancelBtn" class="raw-secondary-btn">Cancel</button><button type="button" id="rawEditSaveBtn" class="raw-primary-btn">Save Changes</button></div></div>`;
  document.body.appendChild(modal);
  document.getElementById('rawEditCloseBtn')?.addEventListener('click',closeRawEditModal);
  document.getElementById('rawEditCancelBtn')?.addEventListener('click',closeRawEditModal);
  document.getElementById('rawEditModal')?.addEventListener('click',event=>{if(event.target.id==='rawEditModal')closeRawEditModal();});
  document.getElementById('rawEditSaveBtn')?.addEventListener('click',()=>saveRawRecordToBackend(rawModalMode));
}

function buildRawForm(headers,row){
  return headers.map(header=>{
    const value=formatRawValue(row?.[header]??'');
    const listId=getSuggestionListId(header);
    const listAttr=shouldUseSuggestions(header)?` list="${escapeHtml(listId)}" autocomplete="off"`:'';
    const helper=shouldUseSuggestions(header)?'<small>Choose from list or type manually</small>':'';
    const inputType=String(header).toUpperCase()==='DATE'?'date':'text';
    return `<label class="raw-field"><span>${escapeHtml(header)}</span><input type="${inputType}" data-field="${escapeHtml(header)}" value="${escapeHtml(value)}"${listAttr}>${helper}${buildRawDatalist(header)}</label>`;
  }).join('');
}

function openRawEditModal(row){
  if(!row)return;
  rawModalMode='edit';
  rawEditRow=row;
  ensureRawEditModal();
  const controlNo=row.CONTROL_NO||row['Control No']||row['CONTROL NO']||'-';
  document.getElementById('rawModalTitle').textContent='Edit Raw Record';
  document.getElementById('rawEditControlNo').textContent='CONTROL_NO: '+controlNo;
  document.getElementById('rawEditSaveBtn').textContent='Save Changes';
  const headers=getEditableRawHeaders(row);
  document.getElementById('rawEditForm').innerHTML=buildRawForm(headers,row);
  document.getElementById('rawEditModal')?.classList.add('show');
}

function openRawAddModal(){
  rawModalMode='add';
  rawEditRow=null;
  ensureRawEditModal();
  document.getElementById('rawModalTitle').textContent='Add Raw Record';
  document.getElementById('rawEditControlNo').textContent='New CONTROL_NO will be generated on save';
  document.getElementById('rawEditSaveBtn').textContent='Add Record';
  const headers=getRawFormHeaders();
  document.getElementById('rawEditForm').innerHTML=buildRawForm(headers,{});
  document.getElementById('rawEditModal')?.classList.add('show');
}

function closeRawEditModal(){
  document.getElementById('rawEditModal')?.classList.remove('show');
  rawEditRow=null;
  rawModalMode='edit';
}

function collectRawFormData(){
  const form=document.getElementById('rawEditForm');
  const data={};
  if(!form)return data;
  form.querySelectorAll('input[data-field]').forEach(input=>{
    data[input.dataset.field]=input.value;
  });
  if(rawModalMode==='edit'&&rawEditRow){
    data.CONTROL_NO=rawEditRow.CONTROL_NO||rawEditRow['CONTROL_NO']||rawEditRow['Control No']||rawEditRow['CONTROL NO'];
  }
  return data;
}

async function saveRawRecordToBackend(mode){
  const saveBtn=document.getElementById('rawEditSaveBtn');
  if(!saveBtn)return;
  const originalText=saveBtn.textContent;
  const payload=collectRawFormData();

  if(mode==='edit'&&!payload.CONTROL_NO){
    alert('Cannot save: CONTROL_NO missing.');
    return;
  }

  try{
    saveBtn.disabled=true;
    saveBtn.textContent='Saving...';

    const res=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({
        action:mode==='add'?'addRawRecord':'updateRawRecord',
        data:payload
      })
    });

    const result=await res.json();
    if(!result.success)throw new Error(result.error||'Save failed.');

    closeRawEditModal();
    alert(mode==='add'?'Record added successfully!':'Record updated successfully!');
    await refreshDashboardData();
  }catch(error){
    console.error('Raw save error:',error);
    alert(error.message||'Save failed.');
  }finally{
    saveBtn.disabled=false;
    saveBtn.textContent=originalText;
  }
}

async function refreshDashboardData(){
  try{
    const res=await fetch(API_URL+'?t='+Date.now());
    const data=await res.json();
    dashboardData=data||{};
    dashboardData.kpi=cleanRows(data.kpi||[]);
    dashboardData.brandTarget=cleanRows(data.brandTarget||[]);
    dashboardData.monthlySales=cleanRows(data.monthlySales||[]);
    dashboardData.topDealers=cleanRows(data.topDealers||[]);
    dashboardData.topDealerPerBrand=cleanRows(data.topDealerPerBrand||[]);
    dashboardData.dealerBreakdown=cleanRows(data.dealerBreakdown||[]);
    dashboardData.raw=cleanRows(data.raw||[]);
    if(typeof updateDashboard==='function')updateDashboard();
    renderRawDataTable();
  }catch(error){
    console.error('Dashboard refresh error:',error);
  }
}

function formatRawValue(value){
  if(value instanceof Date)return value.toISOString().split('T')[0];
  const text=String(value??'');
  if(text.includes('T')&&text.includes('Z')){
    const date=new Date(text);
    if(!isNaN(date))return date.toISOString().split('T')[0];
  }
  return text;
}

function renderRawPagination(totalPages){
  const pagination=document.getElementById('rawPagination');
  if(!pagination)return;
  pagination.innerHTML=`<button type="button" ${rawCurrentPage<=1?'disabled':''} id="rawPrevBtn">Prev</button><span>Page ${rawCurrentPage} of ${totalPages}</span><button type="button" ${rawCurrentPage>=totalPages?'disabled':''} id="rawNextBtn">Next</button>`;
  document.getElementById('rawPrevBtn')?.addEventListener('click',()=>{if(rawCurrentPage>1){rawCurrentPage--;renderRawDataTable();}});
  document.getElementById('rawNextBtn')?.addEventListener('click',()=>{if(rawCurrentPage<totalPages){rawCurrentPage++;renderRawDataTable();}});
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[match]));
}

const rawDataTimer=setInterval(()=>{
  if(typeof dashboardData==='object'&&Array.isArray(dashboardData.raw)){
    initRawDataView();
    clearInterval(rawDataTimer);
  }
},400);

setTimeout(()=>initRawDataView(),1500);

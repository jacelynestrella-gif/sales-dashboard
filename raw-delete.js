(function(){
  const style=document.createElement('style');
  style.textContent=`
    .raw-action-buttons{display:flex;align-items:center;justify-content:center;gap:7px;}
    .raw-delete-btn{width:32px!important;height:32px;border-radius:10px;border:1px solid rgba(248,113,113,.4);background:rgba(220,38,38,.16);color:#fecaca;cursor:pointer;font-weight:900;}
    .raw-delete-btn:hover{background:rgba(220,38,38,.28);}
  `;
  document.head.appendChild(style);

  const originalRenderRawCell=window.renderRawCell;

  window.renderRawCell=function(header,row,index){
    if(header==='Actions'){
      return `<td class="raw-actions"><div class="raw-action-buttons"><button type="button" class="raw-edit-btn" data-raw-index="${index}">✎</button><button type="button" class="raw-delete-btn" data-raw-index="${index}">🗑</button></div></td>`;
    }
    return originalRenderRawCell(header,row,index);
  };

  document.addEventListener('click',function(event){
    const btn=event.target.closest('.raw-delete-btn');
    if(!btn)return;
    const index=Number(btn.dataset.rawIndex);
    const row=rawVisibleRows[index];
    deleteRawRecord(row);
  });

  async function deleteRawRecord(row){
    if(!row)return;
    const controlNo=row.CONTROL_NO||row['Control No']||row['CONTROL NO'];
    if(!controlNo){
      alert('Cannot delete: CONTROL_NO missing.');
      return;
    }

    const dealer=row["DEALER'S NAME"]||row.Dealer||'';
    const so=row['SO#']||'';
    const message=`Are you sure you want to delete this record?\n\nCONTROL_NO: ${controlNo}${dealer?'\nDealer: '+dealer:''}${so?'\nSO#: '+so:''}`;
    if(!confirm(message))return;

    try{
      btnState(true);
      const client=(typeof getRawSupabaseClient==='function')?getRawSupabaseClient():window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {error}=await client.from('raw_sales').delete().eq('control_no',controlNo);
      if(error)throw error;

      if(typeof recomputeClientTotals==='function'){
        await recomputeClientTotals();
      }

      if(typeof refreshDashboardData==='function'){
        await refreshDashboardData();
      }

      alert('Record deleted successfully!');
    }catch(error){
      console.error('Raw delete error:',error);
      alert(error.message||'Delete failed.');
    }finally{
      btnState(false);
    }
  }

  function btnState(disabled){
    document.querySelectorAll('.raw-delete-btn').forEach(btn=>btn.disabled=disabled);
  }

  setTimeout(()=>{
    if(typeof renderRawDataTable==='function')renderRawDataTable();
  },1200);
})();

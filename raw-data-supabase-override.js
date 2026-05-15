window.recomputeClientTotals = async function(){
  const client=(typeof getRawSupabaseClient==='function')?getRawSupabaseClient():window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const {error}=await client.rpc('refresh_client_total_amounts');
  if(error){
    console.warn('Client total recompute warning:',error.message||error);
    return false;
  }
  return true;
};

window.saveRawRecordToBackend = async function(mode){
  const saveBtn=document.getElementById('rawEditSaveBtn');
  if(!saveBtn)return;

  const originalText=saveBtn.textContent;
  const formData=collectRawFormData();
  const client=(typeof getRawSupabaseClient==='function')?getRawSupabaseClient():window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const payload=toSupabaseRawPayload(formData,mode);

  try{
    saveBtn.disabled=true;
    saveBtn.textContent='Saving...';

    let response;

    if(mode==='add'){
      response=await client.from('raw_sales').insert(payload).select().single();
    }else{
      const controlNo=formData.CONTROL_NO;
      if(!controlNo)throw new Error('Cannot save: CONTROL_NO missing.');

      response=await client
        .from('raw_sales')
        .update(payload)
        .eq('control_no',controlNo)
        .select()
        .single();
    }

    if(response.error)throw response.error;

    saveBtn.textContent='Recomputing...';
    await recomputeClientTotals();

    closeRawEditModal();

    if(typeof refreshDashboardData==='function'){
      await refreshDashboardData();
    }

    alert(mode==='add'?'Record added successfully!':'Record updated successfully!');

  }catch(error){
    console.error('Supabase raw save error:',error);
    alert(error.message||'Save failed.');
  }finally{
    saveBtn.disabled=false;
    saveBtn.textContent=originalText;
  }
};

window.refreshDashboardData = async function(){
  try{
    const currentYear=document.getElementById('yearFilter')?.value || 'ALL';
    const currentMonth=document.getElementById('monthFilter')?.value || 'ALL';

    await loadSupabaseData();

    const yearFilter=document.getElementById('yearFilter');
    const monthFilter=document.getElementById('monthFilter');
    if(yearFilter)yearFilter.value=currentYear;
    if(monthFilter)monthFilter.value=currentMonth;

    if(typeof rebuildDashboardTables==='function')rebuildDashboardTables();
    if(typeof populateDealerList==='function')populateDealerList();
    if(typeof updateDashboard==='function')updateDashboard();
    if(typeof renderRawDataTable==='function')renderRawDataTable();

  }catch(error){
    console.error('Supabase dashboard refresh error:',error);
  }
};

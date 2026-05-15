window.loadSupabaseData = async function(){
  const pageSize=1000;
  let from=0;
  let allRows=[];

  while(true){
    const to=from+pageSize-1;
    const {data,error}=await supabaseClient
      .from('raw_sales')
      .select('*')
      .order('id',{ascending:true})
      .range(from,to);

    if(error)throw error;

    const batch=data||[];
    allRows=allRows.concat(batch);

    if(batch.length<pageSize)break;
    from+=pageSize;
  }

  dashboardData.raw=mapSupabaseRows(allRows);
  rebuildDashboardTables();
  console.log('Loaded all Supabase rows:',allRows.length);
};

setTimeout(async function(){
  try{
    if(!supabaseClient)return;
    await loadSupabaseData();
    if(typeof populateFilters==='function')populateFilters();
    if(typeof updateDashboard==='function')updateDashboard();
    if(typeof renderRawDataTable==='function')renderRawDataTable();
  }catch(error){
    console.error('Load all rows fix failed:',error);
  }
},1200);

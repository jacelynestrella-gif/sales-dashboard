window.loadSupabaseData = async function(){
  const pageSize=1000;
  let from=0;
  let allRows=[];

  while(true){
    const {data,error}=await supabaseClient
      .from('raw_sales')
      .select('*')
      .order('id',{ascending:true})
      .range(from,from+pageSize-1);

    if(error)throw error;

    const rows=data||[];
    allRows=allRows.concat(rows);

    if(rows.length<pageSize)break;
    from+=pageSize;
  }

  dashboardData.raw=mapSupabaseRows(allRows);
  rebuildDashboardTables();
  console.log('Loaded all Supabase rows:',dashboardData.raw.length);
};

setTimeout(async()=>{
  try{
    if(typeof loadSupabaseData==='function'){
      await loadSupabaseData();
    }
    if(typeof populateFilters==='function')populateFilters();
    if(typeof populateDealerList==='function')populateDealerList();
    if(typeof updateDashboard==='function')updateDashboard();
    if(typeof renderRawDataTable==='function')renderRawDataTable();
  }catch(error){
    console.error('Supabase full load fix failed:',error);
  }
},1200);

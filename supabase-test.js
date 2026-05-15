async function testSupabaseConnection(){
  try{
    if(!window.supabase||!SUPABASE_URL||!SUPABASE_KEY){
      console.warn('Supabase library/config not loaded yet.');
      return;
    }

    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await client
      .from('raw_sales')
      .select('*')
      .limit(5);

    if(error){
      console.error('Supabase test error:',error);
      return;
    }

    console.log('Supabase connected. Sample rows:',data);
  }catch(error){
    console.error('Supabase connection failed:',error);
  }
}

setTimeout(testSupabaseConnection,1500);

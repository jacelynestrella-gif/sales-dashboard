function getRawSupabaseClient(){
  if(typeof supabaseClient!=='undefined'&&supabaseClient)return supabaseClient;
  return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
}

function generateRawControlNo(){
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return 'RAW-'+now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds());
}

function rawNumber(value){
  if(value===undefined||value===null||value==='')return null;
  const n=Number(String(value).replace(/[₱,%\s,]/g,''));
  return Number.isFinite(n)?n:null;
}

function rawYearMonthFromDate(value){
  if(!value)return {month:'',year:null};
  const date=new Date(value);
  if(isNaN(date))return {month:'',year:null};
  return {month:MONTH_ORDER[date.getMonth()],year:date.getFullYear()};
}

function toSupabaseRawPayload(data,mode){
  const dateValue=data.DATE||'';
  const ym=rawYearMonthFromDate(dateValue);
  const price=rawNumber(data.PRICE)||0;
  const discount=rawNumber(data.DISCOUNT)||0;
  const discounted=price-discount;
  const qty=rawNumber(data.QTY)||0;
  const total=qty*discounted;

  const payload={
    sale_date:dateValue||null,
    so_no:data['SO#']||null,
    dealer_name:data["DEALER'S NAME"]||null,
    brand:data.BRAND||null,
    order_name:data.ORDER||null,
    qty:qty,
    price:price,
    discount:discount,
    discounted_price:discounted,
    total:total,
    client_total_amount:rawNumber(data['CLIENT TOTAL AMOUNT'])||total,
    doc_processed:data['DOC. PROCESSED']||null,
    sales_agent:data['SALES AGENT']||null,
    cm_status:data['CM STATUS']||null,
    status:data.STATUS||null,
    concern_promo:data['CONCERN/PROMO']||null,
    notes:data.NOTES||null,
    month:ym.month,
    year:ym.year,
    updated_at:new Date().toISOString()
  };

  if(mode==='add'){
    payload.control_no=generateRawControlNo();
    payload.created_at=new Date().toISOString();
  }

  return payload;
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadRawSalesFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('raw_sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (error) {
      console.error('Supabase RAW fetch error:', error);
      return;
    }

    const mapped = (data || []).map(row => ({
      CONTROL_NO: row.control_no || '',
      DATE: row.sale_date || '',
      'SO#': row.so_no || '',
      "DEALER'S NAME": row.dealer_name || '',
      BRAND: row.brand || '',
      ORDER: row.order_name || '',
      QTY: row.qty || 0,
      PRICE: row.price || 0,
      DISCOUNT: row.discount || 0,
      'DISCOUNTED PRICE': row.discounted_price || 0,
      TOTAL: row.total || 0,
      'CLIENT TOTAL AMOUNT': row.client_total_amount || 0,
      'DOC. PROCESSED': row.doc_processed || '',
      'SALES AGENT': row.sales_agent || '',
      'CM STATUS': row.cm_status || '',
      STATUS: row.status || '',
      'CONCERN/PROMO': row.concern_promo || '',
      NOTES: row.notes || '',
      Month: row.month || '',
      Year: row.year || ''
    }));

    dashboardData = dashboardData || {};
    dashboardData.raw = mapped;

    if (typeof renderRawDataTable === 'function') {
      renderRawDataTable();
    }

    console.log('Supabase RAW loaded:', mapped.length);

  } catch (err) {
    console.error('Supabase load failed:', err);
  }
}

setTimeout(loadRawSalesFromSupabase, 2000);

function getSelectedDashboardFilters(){
  return {
    year: String(document.getElementById('yearFilter')?.value || 'ALL'),
    month: String(document.getElementById('monthFilter')?.value || 'ALL')
  };
}

function filterSupabaseRows(rows){
  const {year,month}=getSelectedDashboardFilters();
  return (rows||[]).filter(row=>{
    const rowYear=String(row.Year||row.year||'');
    const rowMonth=String(row.Month||row.month||'');
    return (year==='ALL'||rowYear===year)&&(month==='ALL'||rowMonth===month);
  });
}

function updateDashboardKpisFromSupabase(){
  const rawRows=filterSupabaseRows(dashboardData.raw||[]);
  const dealerSet=new Set();

  let totalSales=0;
  let totalOrders=0;

  rawRows.forEach(row=>{
    const dealer=String(row["DEALER'S NAME"]||row.dealer_name||'').trim();
    if(dealer)dealerSet.add(dealer.toUpperCase());

    totalSales+=cleanNumber(row['CLIENT TOTAL AMOUNT']||row.client_total_amount||row.TOTAL||row.total||0);
    totalOrders+=1;
  });

  const totalSalesEl=document.getElementById('totalSales');
  const totalOrdersEl=document.getElementById('totalOrders');
  const dealerCountEl=document.getElementById('dealerCount');

  if(totalSalesEl)totalSalesEl.textContent=formatPeso(totalSales);
  if(totalOrdersEl)totalOrdersEl.textContent=totalOrders.toLocaleString();
  if(dealerCountEl)dealerCountEl.textContent=dealerSet.size.toLocaleString();
}

const originalUpdateDashboard=window.updateDashboard;
window.updateDashboard=function(){
  if(typeof originalUpdateDashboard==='function')originalUpdateDashboard();
  updateDashboardKpisFromSupabase();
};

setTimeout(updateDashboardKpisFromSupabase,2500);

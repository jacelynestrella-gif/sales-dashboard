function rawDelay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function refreshDashboardData(retries=4){
  for(let attempt=1;attempt<=retries;attempt++){
    try{
      const res=await fetch(API_URL+'?t='+Date.now()+'&attempt='+attempt,{cache:'no-store'});
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
      if(typeof renderRawDataTable==='function'){
        rawCurrentPage=1;
        renderRawDataTable();
      }
      return;
    }catch(error){
      console.error('Refresh attempt failed:',attempt,error);
      await rawDelay(700);
    }
  }
}

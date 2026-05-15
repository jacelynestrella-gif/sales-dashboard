window.populateFilters = function(){
  const yearFilter=document.getElementById('yearFilter');
  const monthFilter=document.getElementById('monthFilter');
  if(!yearFilter||!monthFilter)return;

  const today=new Date();
  const currentYear=String(today.getFullYear());
  const currentMonth=MONTH_ORDER[today.getMonth()];

  const previousYear=yearFilter.value||'ALL';
  const previousMonth=monthFilter.value||'ALL';
  const hasUserSelected=yearFilter.dataset.userSelected==='1'||monthFilter.dataset.userSelected==='1';

  const years=[...new Set((dashboardData.raw||[])
    .map(row=>getRowYear(row))
    .filter(value=>value!==''&&value!==null&&value!==undefined)
    .map(String)
  )].sort();

  yearFilter.innerHTML='<option value="ALL">All</option>';
  monthFilter.innerHTML='<option value="ALL">All</option>';

  years.forEach(year=>{
    yearFilter.innerHTML+=`<option value="${year}">${year}</option>`;
  });

  MONTH_ORDER.forEach(month=>{
    monthFilter.innerHTML+=`<option value="${month}">${month}</option>`;
  });

  if(hasUserSelected&&years.includes(previousYear)){
    yearFilter.value=previousYear;
  }else if(years.includes(currentYear)){
    yearFilter.value=currentYear;
  }else{
    yearFilter.value='ALL';
  }

  if(hasUserSelected&&MONTH_ORDER.includes(previousMonth)){
    monthFilter.value=previousMonth;
  }else{
    monthFilter.value=currentMonth;
  }

  yearFilter.onchange=function(){
    yearFilter.dataset.userSelected='1';
    handleFilterChange();
  };

  monthFilter.onchange=function(){
    monthFilter.dataset.userSelected='1';
    handleFilterChange();
  };
};

setTimeout(()=>{
  if(typeof populateFilters==='function')populateFilters();
  if(typeof updateDashboard==='function')updateDashboard();
  if(typeof renderRawDataTable==='function')renderRawDataTable();
},600);

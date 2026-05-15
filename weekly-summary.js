function updateDailySalesByWeek(rows){
  const container=document.getElementById('weeklySalesCharts');
  if(!container)return;

  const selectedMonth=document.getElementById('monthFilter')?.value||'ALL';
  const selectedYear=document.getElementById('yearFilter')?.value||'ALL';
  const startInput=document.getElementById('weeklyStartDate');
  const endInput=document.getElementById('weeklyEndDate');
  const resetBtn=document.getElementById('weeklyResetBtn');

  if(!rows||!rows.length){
    container.innerHTML='<div class="empty-card">No RAW data found.</div>';
    return;
  }

  const today=new Date();
  const currentMonday=getMonday(today);
  const currentSunday=new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate()+6);

  if(startInput&&!startInput.value)startInput.value=formatInputDate(currentMonday);
  if(endInput&&!endInput.value)endInput.value=formatInputDate(currentSunday);

  const startDate=startInput?.value?new Date(startInput.value):currentMonday;
  const endDate=endInput?.value?new Date(endInput.value):currentSunday;
  endDate.setHours(23,59,59,999);

  if(startInput&&!startInput.dataset.bound){
    startInput.dataset.bound='1';
    startInput.addEventListener('change',()=>renderWeeklySummaryOnly());
  }

  if(endInput&&!endInput.dataset.bound){
    endInput.dataset.bound='1';
    endInput.addEventListener('change',()=>renderWeeklySummaryOnly());
  }

  if(resetBtn&&!resetBtn.dataset.bound){
    resetBtn.dataset.bound='1';
    resetBtn.addEventListener('click',()=>{
      startInput.value=formatInputDate(currentMonday);
      endInput.value=formatInputDate(currentSunday);
      renderWeeklySummaryOnly();
    });
  }

  const filteredRows=rows.filter(row=>{
    const date=getDateFromRow(row);
    if(!date)return false;
    return date>=startDate&&date<=endDate;
  });

  const weeks={};

  filteredRows.forEach(row=>{
    const date=getDateFromRow(row);
    if(!date)return;

    const dealer=getDealerName(row);
    const brand=getBrandName(row);
    const sales=getSalesValue(row);
    if(!sales)return;

    const monday=getMonday(date);
    const sunday=new Date(monday);
    sunday.setDate(monday.getDate()+6);
    const key=formatWeekKey(monday);

    if(!weeks[key])weeks[key]={startDate:new Date(monday),endDate:new Date(sunday),dealers:{},brands:new Set(),brandTotals:{}};

    weeks[key].brands.add(brand);
    if(!weeks[key].dealers[dealer])weeks[key].dealers[dealer]={};
    weeks[key].dealers[dealer][brand]=(weeks[key].dealers[dealer][brand]||0)+sales;
    weeks[key].brandTotals[brand]=(weeks[key].brandTotals[brand]||0)+sales;
  });

  const weekList=Object.values(weeks).sort((a,b)=>a.startDate-b.startDate);

  if(!weekList.length){
    container.innerHTML='<div class="empty-card">No weekly sales data found for selected date range.</div>';
    return;
  }

  container.innerHTML=weekList.map((w,index)=>{
    const brands=[...w.brands].sort((a,b)=>(w.brandTotals[b]||0)-(w.brandTotals[a]||0));
    const dealers=Object.keys(w.dealers).sort((a,b)=>{
      const totalB=brands.reduce((s,brand)=>s+(w.dealers[b][brand]||0),0);
      const totalA=brands.reduce((s,brand)=>s+(w.dealers[a][brand]||0),0);
      return totalB-totalA;
    });
    const grandTotal=brands.reduce((s,brand)=>s+(w.brandTotals[brand]||0),0);

    return '<details class="weekly-accordion" '+(index===0?'open':'')+'>'+ 
      '<summary class="weekly-accordion-header">'+
        '<span class="weekly-title">Weekly Summary</span>'+ 
        '<span class="weekly-date-range">'+formatDateLabel(w.startDate)+' - '+formatDateLabel(w.endDate)+'</span>'+ 
        '<span class="weekly-pill">Dealers: '+dealers.length+'</span>'+ 
        '<span class="weekly-pill">Brands: '+brands.length+'</span>'+ 
        '<span class="weekly-pill total">'+formatPeso(grandTotal)+'</span>'+ 
      '</summary>'+ 
      '<div class="weekly-table-wrap">'+
        '<table class="weekly-summary-table">'+
          '<thead><tr><th>DEALER | BRAND</th>'+brands.map(brand=>'<th>'+brand+'</th>').join('')+'<th>GRAND TOTAL</th></tr></thead>'+ 
          '<tbody>'+dealers.map(dealer=>{
            const dealerTotal=brands.reduce((s,brand)=>s+(w.dealers[dealer][brand]||0),0);
            return '<tr><td class="dealer-name">'+dealer+'</td>'+brands.map(brand=>'<td>'+(w.dealers[dealer][brand]?formatNumberOnly(w.dealers[dealer][brand]):'-')+'</td>').join('')+'<td class="grand-total-cell">'+formatNumberOnly(dealerTotal)+'</td></tr>';
          }).join('')+'</tbody>'+ 
          '<tfoot><tr class="weekly-total-row"><td>WEEKLY BRAND TOTAL</td>'+brands.map(brand=>'<td>'+formatNumberOnly(w.brandTotals[brand]||0)+'</td>').join('')+'<td>'+formatNumberOnly(grandTotal)+'</td></tr></tfoot>'+ 
        '</table>'+ 
      '</div>'+ 
    '</details>';
  }).join('');
}

function renderWeeklySummaryOnly(){
  if(typeof dashboardData==='object'&&Array.isArray(dashboardData.raw)){
    updateDailySalesByWeek(dashboardData.raw);
  }
}

function formatInputDate(date){return date.toISOString().split('T')[0];}

function getMonday(date){
  const d=new Date(date);
  const day=d.getDay();
  const diff=day===0?-6:1-day;
  d.setDate(d.getDate()+diff);
  d.setHours(0,0,0,0);
  return d;
}

function formatWeekKey(date){return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();}

function getDealerName(row){
  const direct=getValue(row,['Dealer','DEALER','Dealer Name','DEALER NAME','Dealers','DEALERS','Account Name','ACCOUNT NAME','Customer','CUSTOMER','Customer Name','CUSTOMER NAME','Client','CLIENT','Client Name','CLIENT NAME','Company','COMPANY','Company Name','COMPANY NAME','Business','BUSINESS','Business Name','BUSINESS NAME','Store','STORE','Store Name','STORE NAME','Reseller','RESELLER','Partner','PARTNER','Sold To','SOLD TO','Sold To Name','SOLD TO NAME']);
  if(direct)return direct;

  const brand=String(getBrandName(row)).toLowerCase();
  const keys=Object.keys(row||{});
  const avoid=['date','year','month','brand','order','item','sku','qty','quantity','sales','amount','total','price','target','actual','commission','balance','percent','revenue'];

  for(const key of keys){
    const lowerKey=String(key).toLowerCase();
    const value=row[key];
    if(value===undefined||value===null||value==='')continue;
    if(avoid.some(word=>lowerKey.includes(word)))continue;
    if(typeof value==='number')continue;
    const text=String(value).trim();
    const lowerText=text.toLowerCase();
    if(!text||text.length<3)continue;
    if(lowerText===brand)continue;
    if(MONTH_ORDER.map(m=>m.toLowerCase()).includes(lowerText))continue;
    if(!/[a-zA-Z]/.test(text))continue;
    return text;
  }

  return 'NO DEALER';
}

function getBrandName(row){return getValue(row,['Brand','BRAND','Product Brand','PRODUCT BRAND','Brand Name','BRAND NAME','Manufacturer','MANUFACTURER'])||'NO BRAND';}
function getSalesValue(row){return cleanNumber(getValue(row,['Total Sales','TOTAL SALES','Sales','SALES','Amount','AMOUNT','Total','TOTAL','Actual','ACTUAL','Revenue','REVENUE','Net Sales','NET SALES']));}
function formatDateLabel(date){return date.toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'});}
function formatNumberOnly(value){return Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}

setTimeout(()=>renderWeeklySummaryOnly(),800);

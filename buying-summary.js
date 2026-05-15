function initBuyingDealerSummary(){
  const cards=document.querySelector('#tabDashboard .cards');
  if(!cards)return;

  let card=document.getElementById('buyingDealerSummaryCard');

  if(!card){
    card=document.createElement('div');
    card.className='card buying-summary-card';
    card.id='buyingDealerSummaryCard';
    card.innerHTML=`
      <h3>Buying Dealer Summary</h3>
      <table class="buying-summary-table">
        <tbody>
          <tr><td>Dealer/s Need to Reach 100</td><td id="dealerNeedReach">0</td></tr>
          <tr><td>Dealer Count</td><td><input type="number" id="editableDealerCount" min="0" value="0"></td></tr>
          <tr><td id="buyingDealerMonthLabel">Buying Dealer Month of</td><td id="buyingDealerMonth">0</td></tr>
          <tr><td>Non Buying</td><td id="nonBuyingDealer">0</td></tr>
          <tr><td>Percentage</td><td id="buyingPercentage">0%</td></tr>
          <tr><td>Points</td><td id="buyingPoints">0 Points</td></tr>
        </tbody>
      </table>
    `;
    cards.appendChild(card);
  }

  const input=document.getElementById('editableDealerCount');
  if(input&&!input.dataset.bound){
    input.dataset.bound='1';

    const saved=localStorage.getItem('manualDealerCount');
    if(saved!==null){
      input.value=saved;
      input.dataset.manual='1';
    }

    input.addEventListener('input',()=>{
      input.dataset.manual='1';
      localStorage.setItem('manualDealerCount',input.value||'0');
      updateBuyingDealerSummary();
    });
  }

  bindBuyingSummaryFilters();
  updateBuyingDealerSummary();
}

function bindBuyingSummaryFilters(){
  const yearFilter=document.getElementById('yearFilter');
  const monthFilter=document.getElementById('monthFilter');

  if(yearFilter&&!yearFilter.dataset.buyingBound){
    yearFilter.dataset.buyingBound='1';
    yearFilter.addEventListener('change',()=>setTimeout(()=>updateBuyingDealerSummary(),100));
  }

  if(monthFilter&&!monthFilter.dataset.buyingBound){
    monthFilter.dataset.buyingBound='1';
    monthFilter.addEventListener('change',()=>setTimeout(()=>updateBuyingDealerSummary(),100));
  }
}

function getBuyingDealerRows(){
  if(typeof dashboardData!=='object')return[];
  if(Array.isArray(dashboardData.dealerBreakdown)&&dashboardData.dealerBreakdown.length)return filterRows(dashboardData.dealerBreakdown);
  if(Array.isArray(dashboardData.topDealers)&&dashboardData.topDealers.length)return filterRows(dashboardData.topDealers);
  if(Array.isArray(dashboardData.raw)&&dashboardData.raw.length)return filterRows(dashboardData.raw);
  return[];
}

function getBuyingDealerName(row){
  return String(getValue(row,[
    'Dealer','DEALER','Dealer Name','DEALER NAME','Dealer\'s Name','DEALER\'S NAME',
    'Account Name','ACCOUNT NAME','Customer','CUSTOMER','Customer Name','CUSTOMER NAME',
    'Client','CLIENT','Company','COMPANY','Business','BUSINESS','Store','STORE'
  ])||'').trim();
}

function getBuyingSalesValue(row){
  return cleanNumber(getValue(row,['Total Sales','TOTAL SALES','Sales','SALES','Amount','AMOUNT','Total','TOTAL','Revenue','REVENUE']));
}

function getSelectedMonthYearLabel(){
  const month=document.getElementById('monthFilter')?.value||'';
  const year=document.getElementById('yearFilter')?.value||'';
  if(month&&month!=='ALL'&&year&&year!=='ALL')return month+' '+year;
  if(month&&month!=='ALL')return month;
  if(year&&year!=='ALL')return year;
  return 'Selected Period';
}

function updateBuyingDealerSummary(){
  const input=document.getElementById('editableDealerCount');
  if(!input)return;

  const rows=getBuyingDealerRows();
  const uniqueBuyingDealers=new Set();

  rows.forEach(row=>{
    const dealer=getBuyingDealerName(row);
    const sales=getBuyingSalesValue(row);
    if(dealer&&sales>0)uniqueBuyingDealers.add(dealer.toUpperCase());
  });

  const buying=uniqueBuyingDealers.size;

  if(!input.dataset.manual&&Number(input.value||0)===0){
    input.value=buying;
    localStorage.setItem('manualDealerCount',String(buying));
  }

  const dealerCount=Number(input.value||0);
  const nonBuying=Math.max(dealerCount-buying,0);
  const percentage=dealerCount>0?buying/dealerCount:0;
  const needToReach=Math.max(Math.ceil(dealerCount*0.60)-buying,0);
  const points=getBuyingDealerPoints(percentage);

  setText('buyingDealerMonthLabel','Buying Dealer Month of '+getSelectedMonthYearLabel());
  setText('dealerNeedReach',needToReach.toLocaleString());
  setText('buyingDealerMonth',buying.toLocaleString());
  setText('nonBuyingDealer',nonBuying.toLocaleString());
  setText('buyingPercentage',Math.round(percentage*100)+'%');
  setText('buyingPoints',points);
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}

function getBuyingDealerPoints(value){
  if(value<0.4)return'0 Points';
  if(value<=0.5)return'50 Points';
  if(value<=0.6)return'75 Points';
  return'100 Points';
}

const buyingSummaryTimer=setInterval(()=>{
  if(typeof dashboardData==='object'&&dashboardData.dealerBreakdown){
    initBuyingDealerSummary();
    clearInterval(buyingSummaryTimer);
  }
},300);

setTimeout(()=>initBuyingDealerSummary(),1200);

(function(){
  const hiddenTableFields=new Set(['id','CONTROL_NO','DISCOUNTED PRICE','Month','Year']);
  const hiddenFormFields=new Set(['id','CONTROL_NO','DISCOUNTED PRICE','TOTAL','CLIENT TOTAL AMOUNT','Month','Year']);

  const originalGetRawHeaders=window.getRawHeaders;
  if(typeof originalGetRawHeaders==='function'){
    window.getRawHeaders=function(rows){
      return originalGetRawHeaders(rows).filter(header=>!hiddenTableFields.has(header));
    };
  }

  const originalGetEditableRawHeaders=window.getEditableRawHeaders;
  if(typeof originalGetEditableRawHeaders==='function'){
    window.getEditableRawHeaders=function(row){
      return originalGetEditableRawHeaders(row).filter(header=>!hiddenFormFields.has(header));
    };
  }

  const originalGetRawFormHeaders=window.getRawFormHeaders;
  if(typeof originalGetRawFormHeaders==='function'){
    window.getRawFormHeaders=function(){
      return originalGetRawFormHeaders().filter(header=>!hiddenFormFields.has(header));
    };
  }

  document.addEventListener('click',function(event){
    if(event.target&&event.target.id==='rawEditModal'){
      event.stopPropagation();
      event.preventDefault();
    }
  },true);

  setTimeout(function(){
    if(typeof renderRawDataTable==='function')renderRawDataTable();
  },800);
})();

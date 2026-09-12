export const period=date=>`${date.slice(0,7)} · Quincena ${Number(date.slice(8))<=15?1:2}`;
export function payrollTotals(lines){
 const totals={earnings:0,deductions:0,information:0,vouchers:0};
 for(const l of lines){if(!['earnings','deductions','information'].includes(l.section)||!Number.isSafeInteger(l.amount)||l.amount<0)throw Error('Importe de nómina inválido');totals[l.section]+=l.amount;if(l.section==='information'&&l.voucher)totals.vouchers+=l.amount;}
 return {...totals,net:totals.earnings-totals.deductions};
}
export function openPayroll({state,modal,persist,uid,today,esc,money}){
 const labels={earnings:'Percepciones',deductions:'Deducciones',information:'Informativos'};
 const accounts=state.accounts.filter(a=>!a.archived&&a.currency==='MXN'&&!['credit','loan'].includes(a.type));
 if(!accounts.length)throw Error('Agrega una cuenta en MXN para registrar la nómina.');
 let section='earnings',lines=[];
 const templates=state.payrollTemplates||[];
 const options=accounts.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
 modal('Registrar nómina',`<label>Fecha de depósito<input name="payDate" type="date" value="${today()}" required></label><p id="pay-period"></p><label>Cuenta para el neto<select name="payAccount">${options}</select></label><label>Cuenta de vales (Cashi)<select name="voucherAccount"><option value="">Selecciona si hay vales</option>${options}</select></label><label>Estado<select name="payStatus"><option value="pending">Programado</option><option value="done">Recibido</option></select></label><div class="pay-tabs" role="tablist">${Object.entries(labels).map(([k,v])=>`<button type="button" role="tab" data-pay-tab="${k}">${v}</button>`).join('')}</div><div id="pay-editor"></div><div id="pay-lines"></div><div id="pay-totals" aria-live="polite"></div>`,async f=>{
  if(!lines.length)throw Error('Agrega al menos una percepción.');
  if(lines.some(l=>period(l.date)!==period(f.payDate)))throw Error('Las fechas deben pertenecer a la quincena del depósito. Registra otra nómina para otra quincena.');
  if(new Set(lines.map(l=>l.company.toLowerCase())).size!==1)throw Error('Registra una nómina por empresa.');
  const t=payrollTotals(lines);if(t.net<=0)throw Error('El ingreso neto debe ser positivo.');
  if(t.vouchers&&!f.voucherAccount)throw Error('Selecciona la cuenta Cashi para los vales.');
  if(t.vouchers&&f.voucherAccount===f.payAccount)throw Error('Selecciona una cuenta distinta para los vales.');
  const next=structuredClone(state),id=uid(),company=lines[0].company;
  next.payrolls??=[];next.payrolls.push({id,date:f.payDate,period:period(f.payDate),company,lines,totals:t});
  const tx=(amount,to,concept)=>({id:uid(),payrollId:id,kind:'income',category:'Nómina',business:company,date:f.payDate,status:f.payStatus,amount,to,concept});
  next.transactions.push(tx(t.net,f.payAccount,`Nómina · ${period(f.payDate)}`));
  if(t.vouchers)next.transactions.push(tx(t.vouchers,f.voucherAccount,`Vales de despensa · ${period(f.payDate)}`));
  next.payrollTemplates??=[];
  for(const l of lines){const existing=next.payrollTemplates.find(x=>x.company===l.company&&x.code===l.code&&x.section===l.section);if(!existing)next.payrollTemplates.push({...l,fixed:false});}
  await persist(next);
 });
 const root=document.querySelector('#fields'),q=s=>root.querySelector(s);
 const update=()=>{
  q('#pay-period').textContent=period(q('[name=payDate]').value);
  const t=payrollTotals(lines);
  q('#pay-totals').innerHTML=`<p>Percepciones ${money(t.earnings)} · Deducciones ${money(-t.deductions)}</p><h3>Neto a depositar ${money(t.net)}</h3><p>Vales aparte ${money(t.vouchers)} · Informativos ${money(t.information,'MXN','neutral')}</p>`;
  q('#pay-lines').innerHTML=lines.map((l,i)=>`<div class="row"><div class="grow"><strong>${esc(l.code)} · ${esc(l.concept)}</strong><small>${esc(labels[l.section])} · ${esc(l.company)} · ${l.date} · ${period(l.date)}</small></div>${money(l.section==='deductions'?-l.amount:l.amount,'MXN',l.section==='information'?'neutral':undefined)}<button type="button" data-remove-pay="${i}" aria-label="Quitar ${esc(l.concept)}">Quitar</button></div>`).join('');
  root.querySelectorAll('[data-remove-pay]').forEach(b=>b.onclick=()=>{lines.splice(Number(b.dataset.removePay),1);update();});
 };
 function editor(){
  root.querySelectorAll('[data-pay-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.payTab===section);b.setAttribute('aria-selected',b.dataset.payTab===section);});
  const suggestions=templates.filter(t=>t.section===section);
  q('#pay-editor').innerHTML=`<h3>${labels[section]}</h3><label>Fecha del concepto<input id="line-date" type="date" value="${q('[name=payDate]').value}"></label><small id="line-period">${period(q('[name=payDate]').value)}</small><label>Empresa<input id="line-company" list="pay-companies" value="${esc(lines[0]?.company||templates[0]?.company||'')}"></label><datalist id="pay-companies">${[...new Set(templates.map(t=>t.company))].map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist><label>Código<input id="line-code" list="pay-codes"></label><datalist id="pay-codes"></datalist><label>Concepto<input id="line-concept" list="pay-concepts"></label><datalist id="pay-concepts"></datalist><label>Monto en MXN<input id="line-amount" type="number" min="0" step="0.01"></label><small id="amount-hint">Puedes seleccionar una sugerencia o escribir un concepto nuevo.</small>${section==='information'?'<label><input id="line-voucher" type="checkbox"> Depositar aparte en Cashi (vales)</label>':''}<button type="button" id="add-pay-line">＋ Agregar concepto</button><p id="line-error" role="alert"></p>`;
  const matches=()=>suggestions.filter(t=>t.company.toLowerCase()===q('#line-company').value.trim().toLowerCase());
  const refresh=()=>{q('#pay-codes').innerHTML=matches().map(t=>`<option value="${esc(t.code)}">${esc(t.concept)}</option>`).join('');q('#pay-concepts').innerHTML=matches().map(t=>`<option value="${esc(t.concept)}">${esc(t.code)}</option>`).join('');};
  const suggest=key=>{const t=matches().find(t=>String(t[key])===q(key==='code'?'#line-code':'#line-concept').value);if(!t)return;q('#line-code').value=t.code;q('#line-concept').value=t.concept;q('#line-amount').value=t.fixed?(t.amount/100).toFixed(2):'';q('#amount-hint').textContent=t.fixed?'Monto fijo sugerido; puedes ajustarlo.':`Monto variable. Ejemplo: ${(t.amount/100).toFixed(2)} MXN; escribe el importe de esta quincena.`;if(q('#line-voucher'))q('#line-voucher').checked=!!t.voucher;};
  q('#line-company').oninput=refresh;q('#line-code').onchange=()=>suggest('code');q('#line-concept').onchange=()=>suggest('concept');q('#line-date').onchange=()=>q('#line-period').textContent=period(q('#line-date').value);
  q('#add-pay-line').onclick=()=>{const company=q('#line-company').value.trim(),code=q('#line-code').value.trim(),concept=q('#line-concept').value.trim(),date=q('#line-date').value,raw=q('#line-amount').value,amount=Math.round(Number(raw)*100);if(!company||!code||!concept||!date||raw===''||!Number.isSafeInteger(amount)||amount<0){q('#line-error').textContent='Completa fecha, empresa, código, concepto y un monto válido.';return;}lines.push({section,company,code,concept,date,amount,voucher:!!q('#line-voucher')?.checked});editor();update();};refresh();
 }
 root.querySelectorAll('[data-pay-tab]').forEach(b=>b.onclick=()=>{section=b.dataset.payTab;editor();});q('[name=payDate]').onchange=update;editor();update();
}

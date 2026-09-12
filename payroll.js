export const period=date=>`${date.slice(0,7)} · Quincena ${Number(date.slice(8))<=15?1:2}`;
export function payrollTotals(lines){
 const totals={earnings:0,deductions:0,information:0,vouchers:0};
 for(const l of lines){if(!['earnings','deductions','information'].includes(l.section)||!Number.isSafeInteger(l.amount)||l.amount<0)throw Error('Importe de nómina inválido');totals[l.section]+=l.amount;if(l.section==='information'&&l.voucher)totals.vouchers+=l.amount;}
 return {...totals,net:totals.earnings-totals.deductions};
}
export function reconciliation(lines,bankNet){const t=payrollTotals(lines);return {...t,bankNet,difference:bankNet-t.net,itemized:lines.length>0};}
export function savePayroll(state,record,uid){
 const next=structuredClone(state);next.payrolls??=[];
 const old=next.payrolls.find(p=>p.id===record.id);
 const linked=next.transactions.filter(t=>t.payrollId===record.id);
 const bank=linked.find(t=>t.payrollPart==='bank')||linked.find(t=>!t.payrollPart&&!t.concept.startsWith('Vales de despensa'));

 const totals=reconciliation(record.lines,record.bankNet);
 if(!Number.isSafeInteger(record.bankNet)||record.bankNet<=0)throw Error('El neto recibido debe ser positivo.');
 if(!record.company.trim())throw Error('Indica la empresa.');
 if(record.lines.some(l=>period(l.date)!==period(record.date)||l.company.toLowerCase()!==record.company.trim().toLowerCase()))throw Error('Los conceptos deben corresponder a la empresa y quincena del depósito.');

 for(const id of [record.account]){if(!next.accounts.some(a=>a.id===id&&!a.archived&&a.currency==='MXN'&&!['credit','loan'].includes(a.type)))throw Error('Selecciona una cuenta activa en MXN.');}
 const receipt={...record,period:period(record.date),totals};
 if(old)next.payrolls[next.payrolls.indexOf(old)]=receipt;else next.payrolls.push(receipt);
 const upsert=(previous,amount,to,part,concept)=>{const tx={...previous,id:previous?.id||uid(),payrollId:record.id,payrollPart:part,kind:'income',category:'Nómina',business:record.company,date:record.date,status:record.status,amount,to,concept};if(previous)next.transactions[next.transactions.findIndex(t=>t.id===previous.id)]=tx;else next.transactions.push(tx);};
 upsert(bank,record.bankNet,record.account,'bank',`Nómina · ${period(record.date)}`);
 // Los informativos no crean movimientos; los depósitos históricos de vales se conservan.
 next.payrollTemplates??=[];
 for(const l of record.lines){if(!next.payrollTemplates.some(x=>x.company===l.company&&x.code===l.code&&x.section===l.section))next.payrollTemplates.push({...l,fixed:false});}
 return next;
}
export function openPayroll({state,modal,persist,uid,today,esc,money,existing}){
 const labels={earnings:'Percepciones',deductions:'Deducciones',information:'Informativos'};
 const accounts=state.accounts.filter(a=>!a.archived&&a.currency==='MXN'&&!['credit','loan'].includes(a.type));
 if(!accounts.length)throw Error('Agrega una cuenta en MXN para registrar la nómina.');
 let section='earnings',lines=structuredClone(existing?.lines||[]);
 const bank=existing&&state.transactions.find(t=>t.payrollId===existing?.id&&(t.payrollPart==='bank'||(!t.payrollPart&&!t.concept.startsWith('Vales de despensa'))));

 const templates=state.payrollTemplates||[];
 const options=accounts.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
 modal('Registrar nómina',`<label>Fecha de depósito<input name="payDate" type="date" value="${today()}" required></label><p id="pay-period"></p><label>Cuenta para el neto<select name="payAccount">${options}</select></label><label>Estado<select name="payStatus"><option value="done">Recibido</option><option value="pending">Programado</option></select></label><div class="pay-tabs" role="tablist">${Object.entries(labels).map(([k,v])=>`<button type="button" role="tab" data-pay-tab="${k}">${v}</button>`).join('')}</div><div id="pay-editor"></div><div id="pay-lines"></div><div id="pay-totals" aria-live="polite"></div>`,async f=>{
  if(document.querySelector('#line-code').value||document.querySelector('#line-concept').value||document.querySelector('#line-amount').value)throw Error('Pulsa Agregar concepto para incluir el concepto que estás capturando antes de guardar.');
  const bankNet=Math.round(Number(f.bankNet)*100);
  if(lines.some(l=>period(l.date)!==period(f.payDate)))throw Error('Las fechas deben pertenecer a la quincena del depósito. Registra otra nómina para otra quincena.');
  if(new Set(lines.map(l=>l.company.toLowerCase())).size>1)throw Error('Registra una nómina por empresa.');
  const t=payrollTotals(lines);


  const next=savePayroll(state,{id:existing?.id||uid(),date:f.payDate,company:f.payCompany.trim(),account:f.payAccount,status:f.payStatus,bankNet,lines},uid);
  await persist(next);
 });
 const root=document.querySelector('#fields'),q=s=>root.querySelector(s);
 root.insertAdjacentHTML('afterbegin',`<label>Empresa de la nómina<input name="payCompany" value="${esc(existing?.company||templates[0]?.company||'')}" required></label><label>Líquido recibido en el banco · MXN<input name="bankNet" type="number" min="0.01" step="0.01" value="${existing?(bank?.amount??existing.bankNet??existing.totals.net)/100:''}" required></label><p>Puedes guardar solo el depósito y agregar el desglose después. Solo este líquido afecta el saldo. El desglose, incluidos los vales, sirve como referencia y comparación.</p>`);
 if(existing){q('[name=payDate]').value=bank?.date||existing.date;q('[name=payAccount]').value=bank?.to||existing.account;q('[name=payStatus]').value=bank?.status||existing.status||'pending';document.querySelector('#modal-title').textContent='Completar o editar nómina';}
 const update=()=>{
  q('#pay-period').textContent=period(q('[name=payDate]').value);
  const t=payrollTotals(lines);
  const raw=q('[name=bankNet]').value,received=Math.round(Number(raw)*100),difference=received-t.net;
  q('#pay-totals').innerHTML=`<p>Percepciones ${money(t.earnings)} · Deducciones ${money(-t.deductions)}</p><h3>Neto calculado ${money(t.net)}</h3><p>Neto bancario ${raw?money(received):'Por capturar'}</p><p>${!lines.length?'Desglose pendiente':!raw?'Captura el neto bancario para comparar':difference===0?'Sin desviación: ambos netos coinciden':`Desviación (banco − calculado): ${money(difference)} · ${difference>0?'Recibiste más':'Recibiste menos'} que el desglose capturado`}</p><p>Vales informativos ${money(t.vouchers,'MXN','neutral')} · Total informativos ${money(t.information,'MXN','neutral')}</p>`;
  q('#pay-lines').innerHTML=lines.map((l,i)=>`<div class="row"><div class="grow"><strong>${esc(l.code)} · ${esc(l.concept)}</strong><small>${esc(labels[l.section])} · ${esc(l.company)} · ${l.date} · ${period(l.date)}</small></div>${money(l.section==='deductions'?-l.amount:l.amount,'MXN',l.section==='information'?'neutral':undefined)}<button type="button" data-remove-pay="${i}" aria-label="Quitar ${esc(l.concept)}">Quitar</button></div>`).join('');
  root.querySelectorAll('[data-remove-pay]').forEach(b=>b.onclick=()=>{lines.splice(Number(b.dataset.removePay),1);update();});
 };
 function editor(){
  root.querySelectorAll('[data-pay-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.payTab===section);b.setAttribute('aria-selected',b.dataset.payTab===section);});
  const suggestions=templates.filter(t=>t.section===section);
  q('#pay-editor').innerHTML=`<h3>${labels[section]}</h3><label>Fecha del concepto<input id="line-date" type="date" value="${q('[name=payDate]').value}"></label><small id="line-period">${period(q('[name=payDate]').value)}</small><label>Empresa<input id="line-company" list="pay-companies" value="${esc(q('[name=payCompany]').value||lines[0]?.company||'')}"></label><datalist id="pay-companies">${[...new Set(templates.map(t=>t.company))].map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist><label>Código<input id="line-code" list="pay-codes"></label><datalist id="pay-codes"></datalist><label>Concepto<input id="line-concept" list="pay-concepts"></label><datalist id="pay-concepts"></datalist><label>Monto en MXN<input id="line-amount" type="number" min="0" step="0.01"></label><small id="amount-hint">Puedes seleccionar una sugerencia o escribir un concepto nuevo.</small>${section==='information'?'<label><input id="line-voucher" type="checkbox"> Este concepto corresponde a vales (solo informativo)</label>':''}<button type="button" id="add-pay-line">＋ Agregar concepto</button><p id="line-error" role="alert"></p>`;
  const matches=()=>suggestions.filter(t=>t.company.toLowerCase()===q('#line-company').value.trim().toLowerCase());
  const refresh=()=>{q('#pay-codes').innerHTML=matches().map(t=>`<option value="${esc(t.code)}">${esc(t.concept)}</option>`).join('');q('#pay-concepts').innerHTML=matches().map(t=>`<option value="${esc(t.concept)}">${esc(t.code)}</option>`).join('');};
  const suggest=key=>{const t=matches().find(t=>String(t[key])===q(key==='code'?'#line-code':'#line-concept').value);if(!t)return;q('#line-code').value=t.code;q('#line-concept').value=t.concept;q('#line-amount').value=t.fixed?(t.amount/100).toFixed(2):'';q('#amount-hint').textContent=t.fixed?'Monto fijo sugerido; puedes ajustarlo.':`Monto variable. Ejemplo: ${(t.amount/100).toFixed(2)} MXN; escribe el importe de esta quincena.`;if(q('#line-voucher'))q('#line-voucher').checked=!!t.voucher;};
  q('#line-company').oninput=refresh;q('#line-code').oninput=()=>suggest('code');q('#line-code').onchange=()=>suggest('code');q('#line-concept').oninput=()=>suggest('concept');q('#line-concept').onchange=()=>suggest('concept');q('#line-date').onchange=()=>q('#line-period').textContent=period(q('#line-date').value);
  q('#add-pay-line').onclick=()=>{const company=q('#line-company').value.trim(),code=q('#line-code').value.trim(),concept=q('#line-concept').value.trim(),date=q('#line-date').value,raw=q('#line-amount').value,amount=Math.round(Number(raw)*100);if(!company||!code||!concept||!date||raw===''||!Number.isSafeInteger(amount)||amount<0){q('#line-error').textContent='Completa fecha, empresa, código, concepto y un monto válido.';return;}lines.push({section,company,code,concept,date,amount,voucher:!!q('#line-voucher')?.checked});editor();update();};refresh();
 }
 root.querySelectorAll('[data-pay-tab]').forEach(b=>b.onclick=()=>{section=b.dataset.payTab;editor();});q('[name=payDate]').onchange=update;q('[name=bankNet]').oninput=update;q('[name=payCompany]').oninput=()=>{q('#line-company').value=q('[name=payCompany]').value;q('#line-company').oninput();};editor();update();
}

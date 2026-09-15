import {transactionActions} from './transaction-actions.js?v=20260915-3';
import {balance,today,debt} from './finance.js?v=20260915-3';
export const effect=(t,id)=>(t.to===id?(t.received??t.amount):0)-(t.from===id?t.amount:0);
export function accountHistory(state,id){
 const a=state.accounts.find(a=>a.id===id);if(!a)return [];
 let actual=a.opening,projected=a.opening;
 return state.transactions.map((t,index)=>({...t,index})).filter(t=>t.from===id||t.to===id).sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index).map(t=>{
  const change=effect(t,id);if(t.date<a.asOf)return {...t,change,actual:null,projected:null};
  projected+=change;if(t.status==='done')actual+=change;return {...t,change,actual,projected};
 });
}
export function payoff(state,id,current=today()){
 const a=state.accounts.find(a=>a.id===id);if(!a||!['credit','loan','receivable'].includes(a.type))return null;
 const sign=a.type==='receivable'?1:-1;let value=balance(state,id,current),date=sign*value<=0?current:null,overdue=0;
 const outstanding=Math.max(0,sign*value);
 const events=state.transactions.filter(t=>(t.from===id||t.to===id)&&t.date>=a.asOf&&(t.date>current||t.status==='pending')).map(t=>({...t,projectionDate:t.date<current?current:t.date})).sort((a,b)=>a.projectionDate.localeCompare(b.projectionDate));
 // Group same-day activity so a payment followed by a charge is not treated as payoff.
 const days=new Map();for(const t of events){days.set(t.projectionDate,(days.get(t.projectionDate)||0)+effect(t,id));if(t.status==='pending'&&t.date<current)overdue++;}
 for(const [day,change] of days){value+=change;if(sign*value>0)date=null;else if(!date)date=day;}
 return {outstanding,remaining:Math.max(0,sign*value),date,overdue,projected:value};
}
export function duplicateDraft(t,current=today()){
 // Copy descriptive fields only: never reuse IDs, recurrence, CSV or payroll links.
 return {kind:t.kind,concept:t.concept,category:t.category,business:t.business,notes:t.notes,date:current,from:t.from,to:t.to,amount:t.amount,received:t.received,fx:t.fx?{anchor:t.fx.anchor,mode:'auto'}:undefined,status:t.status||'pending'};
}
export function insightsView(state,{currency,selected,money,esc}){
 const current=today(),accounts=state.accounts,chosen=accounts.find(a=>a.id===selected)||accounts[0],liquid=accounts.filter(a=>a.currency===currency&&a.available&&!debt(a));
 const available=liquid.reduce((s,a)=>s+balance(state,a.id,current),0),owed=accounts.filter(a=>a.currency===currency&&debt(a)).reduce((s,a)=>s+Math.max(0,-balance(state,a.id,current)),0);
 const pending=state.transactions.filter(t=>t.status==='pending'&&accounts.find(a=>a.id===(t.from||t.to))?.currency===currency);
 const categories=new Map();for(const t of state.transactions){if(t.status==='done'&&t.date<=current&&['expense','msi'].includes(t.kind)&&accounts.find(a=>a.id===t.from)?.currency===currency)categories.set(t.category||'Sin Categoria',(categories.get(t.category||'Sin Categoria')||0)+t.amount);}
 const top=[...categories].sort((a,b)=>b[1]-a[1]).slice(0,6),max=Math.max(1,...top.map(([,n])=>n));
 const history=chosen?accountHistory(state,chosen.id):[];
 return `<p class="subtle">Tu panorama al ${current}. Los historiales por cuenta incluyen todas las fechas.</p><div class="filters"><select id="currency" aria-label="Moneda"><option ${currency==='MXN'?'selected':''}>MXN</option><option ${currency==='CAD'?'selected':''}>CAD</option></select></div><section class="kpis"><div class="card"><small>Disponible hoy · ${currency}</small><strong>${money(available,currency)}</strong></div><div class="card"><small>Deuda actual · ${currency}</small><strong>${money(-owed,currency)}</strong></div><div class="card"><small>Movimientos pendientes · ${currency}</small><strong>${pending.length}</strong></div><div class="card"><small>Pendientes vencidos · ${currency}</small><strong>${pending.filter(t=>t.date<current).length}</strong></div></section><section class="panel"><h2>Principales categorías de gasto</h2><p class="subtle">Gastos realizados hasta hoy · todo el historial · ${currency}</p>${top.map(([label,n])=>`<div class="spending-bar"><div><span>${esc(label)}</span><strong>${money(-n,currency)}</strong></div><div class="bar-track"><div style="width:${n/max*100}%"></div></div></div>`).join('')||'<p>No hay gastos realizados en esta moneda.</p>'}</section><h2>Explorar mis cuentas</h2><div class="account-buttons">${accounts.map(a=>{const p=payoff(state,a.id);return `<button class="account-tile ${a.id===chosen?.id?'selected':''}" data-insight-account="${esc(a.id)}" aria-pressed="${a.id===chosen?.id}"><strong>${esc(a.name)}</strong><span>${money(balance(state,a.id,current),a.currency)}</span><small>${a.archived?'Archivada · ':''}${a.currency}</small>${p?`<small>${p.remaining?`Falta programar ${money(p.remaining,a.currency,'negative')}`:p.outstanding===0&&p.date===current?'Sin saldo pendiente':`${a.type==='receivable'?'Cobro':'Liquidación'} proyectada: ${p.date}`}</small>${p.overdue?`<small>${p.overdue} pendientes vencidos incluidos en la proyección</small>`:''}`:''}</button>`;}).join('')}</div>${chosen?`<section class="panel account-ledger"><h2>${esc(chosen.name)} · historial completo</h2><p class="subtle">Saldo inicial: ${money(chosen.opening,chosen.currency)} al ${chosen.asOf}. Orden cronológico; para empates se usa el orden de registro. El proyectado incluye pendientes. Los movimientos anteriores al saldo inicial se muestran sin saldo calculado.</p>${lineChart(history,chosen.currency,money)}<div class="ledger-scroll"><table><thead><tr><th>Fecha / concepto</th><th>Estado</th><th>Movimiento</th><th>Saldo realizado</th><th>Saldo proyectado</th></tr></thead><tbody>${history.map(t=>`<tr><td>${transactionActions(t,esc,{edit:t.status!=='done'})}<strong>${esc(t.concept)}</strong><small>${t.date} · ${esc(t.category||'')}<br>${esc(accounts.find(a=>a.id===t.from)?.name||'')} ${t.from&&t.to?'→':''} ${esc(accounts.find(a=>a.id===t.to)?.name||'')}</small></td><td data-label="Estado">${t.status==='done'?'Realizado':'Programado'}</td><td data-label="Movimiento">${money(t.change,chosen.currency,t.kind==='transfer'?'neutral':undefined)}</td><td data-label="Saldo realizado">${t.actual===null?'—':money(t.actual,chosen.currency)}</td><td data-label="Saldo proyectado">${t.projected===null?'—':money(t.projected,chosen.currency)}</td></tr>`).join('')||'<tr><td colspan="5">Esta cuenta todavía no tiene movimientos.</td></tr>'}</tbody></table></div></section>`:'<p>Agrega una cuenta para explorar sus movimientos.</p>'}<p class="subtle">Las fechas de liquidación consideran los cargos y pagos registrados, sin estimar intereses o cargos que aún no has capturado. Los vencidos se proyectan para hoy; confirma o ajusta sus fechas en Movimientos.</p>`;
}
function lineChart(rows,currency,money){
 const values=rows.filter(t=>t.projected!==null);if(values.length<2)return '';
 const low=Math.min(0,...values.map(t=>t.projected)),high=Math.max(0,...values.map(t=>t.projected)),range=high-low||1;
 const start=new Date(values[0].date+'T12:00:00Z').getTime(),end=new Date(values.at(-1).date+'T12:00:00Z').getTime();
 const points=values.map(t=>`${20+((new Date(t.date+'T12:00:00Z').getTime()-start)/(end-start||1))*760},${170-(t.projected-low)/range*140}`).join(' ');
 return `<figure class="balance-chart"><figcaption>Saldo proyectado por fecha · ${currency}</figcaption><div class="chart-labels"><span>Máximo ${money(Math.max(...values.map(t=>t.projected)),currency)}</span><span>Mínimo ${money(Math.min(...values.map(t=>t.projected)),currency)}</span></div><svg viewBox="0 0 800 200" role="img" aria-label="Evolución del saldo proyectado. Los valores exactos están en la tabla."><line x1="20" x2="780" y1="${170-(0-low)/range*140}" y2="${170-(0-low)/range*140}" stroke="#71717a" stroke-dasharray="5 5"/><polyline points="${points}" fill="none" stroke="#ff827a" stroke-width="3"/></svg><div class="chart-labels"><span>${values[0].date}</span><span>${values.at(-1).date}</span></div></figure>`;
}

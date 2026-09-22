import {today} from './finance.js?v=20260922-1';
const cache=new Map();
export function crossCurrency(t,accounts){const a=accounts.find(a=>a.id===t.from),b=accounts.find(a=>a.id===t.to);return ['payment','transfer'].includes(t.kind)&&a&&b&&a.currency!==b.currency?{from:a.currency,to:b.currency}:null;}
export async function quote(from,to,date=today(),fetcher=fetch){
 const key=`${from}/${to}/${date}`,cached=cache.get(key);if(cached&&Date.now()-cached.time<3600000)return cached.promise;
 const promise=(async()=>{const response=await fetcher(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}?date=${date}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('No se pudo consultar la tasa de cambio.');const data=await response.json();if(!(data.rate>0)||!Number.isFinite(data.rate)||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||data.date>date)throw Error('La tasa recibida no es válida.');return {rate:data.rate,date:data.date};})();
 cache.set(key,{time:Date.now(),promise});try{return await promise;}catch(e){cache.delete(key);throw e;}
}
export function convert(t,rate,anchor=t.fx?.anchor||'from'){
 if(!(rate>0)||!Number.isFinite(rate))throw Error('Indica una tasa mayor a cero.');
 const values=anchor==='to'?{amount:Math.round(t.received/rate),received:t.received}:{amount:t.amount,received:Math.round(t.amount*rate)};
 if(Object.values(values).some(v=>!Number.isSafeInteger(v)||v<=0))throw Error('Revisa los importes de la conversión.');return values;
}
export async function refreshPending(state,getQuote=quote){
 const next=structuredClone(state);let failures=0;
 await Promise.all(next.transactions.map(async t=>{const pair=crossCurrency(t,next.accounts);if(!pair||t.status!=='pending')return;try{const q=await getQuote(pair.from,pair.to);Object.assign(t,convert(t,q.rate));t.fx={...t.fx,mode:'auto',anchor:t.fx?.anchor||'from',rate:q.rate,rateDate:q.date};}catch{failures++;}}));return {state:next,failures};
}
export function exchangeFields(t){return `<div id="exchange-controls" class="exchange-controls" hidden><label>Conversión<select name="fxMode"><option value="auto">Tasa de referencia</option><option value="manual" ${t.id&&t.status==='done'?'selected':''}>Tasa manual / importes reales</option></select></label><label>Tasa: moneda destino por 1 de origen<input name="fxRate" type="number" min="0.00000001" step="any" value="${t.amount&&t.received?t.received/t.amount:''}"></label><p id="exchange-info" class="subtle" aria-live="polite"></p></div>`;}
export function bindExchange(root,t,accounts){
 const field=n=>root.querySelector(`[name="${n}"]`),info=root.querySelector('#exchange-info'),panel=root.querySelector('#exchange-controls');let anchor=t.fx?.anchor||'from',sequence=0,lastQuote;
 const draft=()=>({...t,kind:t.kind||field('kind').value,from:field('from').value,to:field('to').value,amount:Math.round(Number(field('amount').value)*100),received:Math.round(Number(field('received').value)*100)});
 const update=async()=>{const ticket=++sequence,d=draft(),pair=crossCurrency(d,accounts);panel.hidden=!pair;if(!pair)return;const pending=field('status').value==='pending';if(pending)field('fxMode').value='auto';field('fxMode').disabled=pending;const manual=field('fxMode').value==='manual';field('fxRate').readOnly=!manual;
  try{if(!manual){info.textContent='Consultando tasa…';const q=await quote(pair.from,pair.to,pending?today():field('date').value);if(ticket!==sequence)return;lastQuote=q;field('fxRate').value=q.rate;}const rate=Number(field('fxRate').value);if((anchor==='from'?d.amount:d.received)>0){const v=convert(d,rate,anchor);field(anchor==='from'?'received':'amount').value=((anchor==='from'?v.received:v.amount)/100).toFixed(2);}info.textContent=`1 ${pair.from} = ${rate} ${pair.to}. ${manual?'Tasa manual; se guardará fija.':`Referencia del ${lastQuote.date}. ${pending?'Estimación variable hasta confirmar.':'Se guardará fija.'}`} Puedes escribir el importe de origen o destino.`;}catch(e){info.textContent=e.message+' Puedes usar una tasa manual al registrar un movimiento realizado.';}
 };
 for(const n of ['from','to','date','status','fxMode'])field(n).addEventListener('change',update);
 field('fxRate').addEventListener('input',update);
 for(const [n,side] of [['amount','from'],['received','to']])field(n).addEventListener('input',()=>{anchor=side;if(field('fxMode').value==='manual'){const d=draft();if(d.amount>0&&d.received>0)field('fxRate').value=d.received/d.amount;}update();});
 field('fxRate').inputMode='decimal';update();return async item=>{const pair=crossCurrency(item,accounts);if(!pair){delete item.fx;item.received=item.amount;return item;}const manual=item.status==='done'&&field('fxMode').value==='manual';const q=manual?{rate:Number(field('fxRate').value),date:item.date}:await quote(pair.from,pair.to,item.status==='pending'?today():item.date);Object.assign(item,convert(item,q.rate,anchor));item.fx={mode:manual?'manual':'auto',anchor,rate:q.rate,rateDate:q.date,fixed:item.status==='done'};return item;};
}

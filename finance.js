export const today=()=>new Date().toLocaleDateString('en-CA');
export function monthDate(date,offset,day){const [y,m]=date.split('-').map(Number);const d=new Date(y,m-1+offset,1);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`;}
export function installments(total,count,first){const base=Math.floor(total/count);return Array.from({length:count},(_,i)=>({amount:base+(i===count-1?total-base*count:0),date:monthDate(first,i,Number(first.slice(8)))}));}
export function balance(state,id,date,projected=false){const a=state.accounts.find(a=>a.id===id);if(!a)return 0;return a.opening+state.transactions.filter(t=>t.date>=a.asOf&&t.date<=date&&(projected||t.status==='done')).reduce((sum,t)=>sum+(t.to===id?(t.received??t.amount):0)-(t.from===id?t.amount:0),0);}
export const debt=a=>['credit','loan'].includes(a.type);
export function validate(s){if(!Array.isArray(s.accounts)||!Array.isArray(s.transactions)||!Array.isArray(s.rules))throw Error('Datos inválidos');const ids=new Set(s.accounts.map(a=>a.id));for(const t of s.transactions){if(!Number.isSafeInteger(t.amount)||t.amount<=0)throw Error('El importe debe ser positivo');if(t.from&&!ids.has(t.from)||t.to&&!ids.has(t.to))throw Error('Cuenta inexistente');if(t.from&&t.from===t.to)throw Error('Selecciona cuentas diferentes');}return s;}

export function recurringDate(first,index,every=1,unit='months'){
 if(!Number.isInteger(every)||every<1||!Number.isInteger(index)||index<0)throw Error('Frecuencia inválida');
 if(unit==='months'||unit==='years')return monthDate(first,index*every*(unit==='years'?12:1),Number(first.slice(8)));
 if(!['days','weeks'].includes(unit))throw Error('Unidad inválida');
 const d=new Date(first+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+index*every*(unit==='weeks'?7:1));return d.toISOString().slice(0,10);
}

export const CATEGORIES=['Alimentación','Supermercado','Vivienda','Servicios','Transporte','Gasolina','Salud','Educación','Entretenimiento','Suscripciones','Compras','Viajes','Deporte','Mascotas','Regalos','Impuestos','Nómina','Ahorro','Transferencias','Pago de tarjeta','Pago de préstamo','Telefono','Médicos','Hormiga'].sort((a,b)=>a.localeCompare(b,'es')).concat(['Sin Categoria','Otros Ingresos','Otros']);
export const categoryKey=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function canonicalCategory(value){const key=categoryKey(value);const aliases={subscriptions:'Suscripciones',phone:'Telefono',medicos:'Médicos',comida:'Alimentación'};return aliases[key]||CATEGORIES.find(c=>categoryKey(c)===key)||(key?String(value).trim():'Sin Categoria');}
export function migrateCategories(state){const next=structuredClone(state);for(const list of [next.transactions,next.rules])for(const item of list||[])item.category=canonicalCategory(item.category);return next;}
export function removeTransaction(state,id,cancelInstallments=false){
 const next=structuredClone(state),t=next.transactions.find(t=>t.id===id);if(!t)throw Error('El movimiento ya no existe.');
 const rule=next.rules.find(r=>r.id===t.parent);
 if(rule){rule.excludedDates=[...new Set([...(rule.excludedDates||[]),t.scheduledDate||t.date])];}
 next.transactions=next.transactions.filter(x=>x.id!==id&&!(cancelInstallments&&t.kind==='msi'&&x.parent===id&&x.status==='pending'));
 if(t.payrollId&&(t.payrollPart==='bank'||(!t.payrollPart&&!t.concept.startsWith('Vales de despensa')))){
  next.payrolls=(next.payrolls||[]).filter(p=>p.id!==t.payrollId);
  next.transactions=next.transactions.map(x=>{if(x.payrollId!==t.payrollId)return x;const copy={...x};delete copy.payrollId;delete copy.payrollPart;return copy;});
 }
 return next;
}
export function removeRule(state,id,removePending=true){
 const next=structuredClone(state);next.rules=next.rules.filter(r=>r.id!==id);
 next.transactions=next.transactions.filter(t=>!(removePending&&t.parent===id&&t.status==='pending')).map(t=>{if(t.parent!==id)return t;const copy={...t};delete copy.parent;return copy;});return next;
}
export function saveRule(state,rule,uid){
 if(!Number.isSafeInteger(rule.amount)||rule.amount<=0||!Number.isInteger(rule.count)||rule.count<1||rule.count>60||!Number.isInteger(rule.every)||rule.every<1||rule.every>365)throw Error('Revisa monto, frecuencia y número de pagos.');
 const next=structuredClone(state),old=next.rules.find(r=>r.id===rule.id);
 const linked=next.transactions.filter(t=>t.parent===rule.id);
 const protectedDates=new Set([...linked.filter(t=>t.status==='done'||t.individualOverride).map(t=>t.scheduledDate||t.date),...(old?.excludedDates||[])]);
 const protectedSlots=new Set(old?.protectedSlots||[]);if(old)for(let i=0;i<old.count;i++){if(protectedDates.has(recurringDate(old.first,i,old.every||1,old.unit||'months')))protectedSlots.add(i);}
 const r={...rule,excludedDates:old?.excludedDates||[],protectedSlots:[...protectedSlots]};
 if(old)next.rules[next.rules.indexOf(old)]=r;else next.rules.push(r);
 next.transactions=next.transactions.filter(t=>t.parent!==r.id||t.status!=='pending'||t.individualOverride);
 for(let i=0;i<r.count;i++){
  const date=recurringDate(r.first,i,r.every,r.unit);if(protectedDates.has(date)||protectedSlots.has(i))continue;
  const previous=linked.find(t=>t.status==='pending'&&!t.individualOverride&&(t.scheduledDate||t.date)===date);
  next.transactions.push({id:previous?.id||uid(),parent:r.id,kind:'expense',concept:r.concept,category:r.category||'',business:r.business||'',from:r.from,amount:r.amount,date,status:'pending'});
 }
 return next;
}
export function monthlyLists(transactions,month){
 const rows=transactions.filter(t=>t.date.startsWith(month));
 return {done:rows.filter(t=>t.status==='done').sort((a,b)=>b.date.localeCompare(a.date)),pending:rows.filter(t=>t.status==='pending').sort((a,b)=>a.date.localeCompare(b.date))};
}
export function longDate(value){const d=new Date(value+'T12:00:00');const cap=s=>s[0].toUpperCase()+s.slice(1);return `${cap(d.toLocaleDateString('es-MX',{weekday:'long'}))}, ${String(d.getDate()).padStart(2,'0')}/${cap(d.toLocaleDateString('es-MX',{month:'long'}))}/${d.getFullYear()}`;}
export function balanceAfter(state,transaction){
 const id=transaction.from||transaction.to,a=state.accounts.find(a=>a.id===id);if(!a||transaction.date<a.asOf)return null;
 const index=state.transactions.findIndex(t=>t.id===transaction.id);
 return a.opening+state.transactions.reduce((sum,t,i)=>{
 if(t.date<a.asOf||t.date>transaction.date||(t.date===transaction.date&&i>index))return sum;
 if(!['pending','done'].includes(t.status))return sum;
 return sum+(t.to===id?(t.received??t.amount):0)-(t.from===id?t.amount:0);
 },0);
}
export function saveTransactionEdit(state,item,scope='one'){
 const old=state.transactions.find(t=>t.id===item.id);
 if(!old){state.transactions.push(item);return;}
 const anchor=old.scheduledDate||old.date;
 const fields=['concept','category','business','notes','amount','received','from','to'];
 if(scope==='future'&&old.status==='pending'&&item.status==='pending'&&old.parent){
 for(const t of state.transactions){if(t.id!==old.id&&t.parent===old.parent&&t.status==='pending'&&!t.individualOverride&&(t.scheduledDate||t.date)>=anchor){for(const key of fields)t[key]=item[key];}}
 const rule=state.rules.find(r=>r.id===old.parent);if(rule)for(const key of ['concept','category','business','notes','amount','from'])rule[key]=item[key];
 }
 item.scheduledDate=old.scheduledDate||old.date;
 item.individualOverride=scope!=='future';
 state.transactions=state.transactions.map(t=>t.id===item.id?item:t);
}

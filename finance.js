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

export const CATEGORIES=['Sin categoría','Alimentación','Supermercado','Vivienda','Servicios','Transporte','Gasolina','Salud','Educación','Entretenimiento','Suscripciones','Compras','Viajes','Deporte','Mascotas','Regalos','Impuestos','Nómina','Otros ingresos','Ahorro','Transferencias','Pago de tarjeta','Pago de préstamo','Otros'];
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

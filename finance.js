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

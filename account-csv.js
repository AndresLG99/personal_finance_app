// Editor de movimientos de una cuenta por CSV: reemplaza al antiguo "Descargar
// plantilla" / "Cargar CSV" (que solo servía para agregar pagos programados).
// Ahora se descarga la "base de datos" completa de UNA cuenta (todo lo que la
// toca: gastos, ingresos, transferencias, pagos, incluyendo las compras y
// mensualidades de MSI, para que se vean en contexto), se edita en Excel y se
// vuelve a cargar: el archivo se compara contra el estado actual y se aplican
// altas (filas sin id), cambios (filas con un id existente) y bajas (un
// movimiento editable que ya no aparece en el archivo).
//
// No todo movimiento de la cuenta se puede editar por este medio: las compras
// a MSI (la compra en sí y cada mensualidad), los movimientos generados por
// una regla recurrente y los ligados a una nómina tienen su propia pantalla
// con reglas especiales (reparto de mensualidades, repetición, desglose de
// nómina) que este CSV no reproduce. Esas filas se incluyen en la descarga
// solo como referencia (columna "editable" en "no") y cualquier cambio o
// borrado suyo en el archivo se ignora al volver a cargarlo, para no romper
// esa estructura por accidente. Lo mismo para movimientos donde la otra
// cuenta es una cuenta compartida (se editan desde "Movimientos
// compartidos").
import {parseCSV,csvDate,csvMoney} from './csv-import.js?v=20261029-2';
import {CATEGORIES,canonicalCategory,categoryKey,saveTransactionEdit,removeTransaction} from './finance.js?v=20261024-1';

export const ACCOUNT_CSV_HEADER='id,fecha,tipo,estado,concepto,cuenta_origen,cuenta_destino,monto,monto_recibido,categoria,negocio,notas,editable';
const KIND_LABELS={expense:'gasto',income:'ingreso',transfer:'transferencia',payment:'pago'};
const KIND_FROM_LABEL={gasto:'expense',expense:'expense',ingreso:'income',income:'income',transferencia:'transfer',transfer:'transfer',pago:'payment',payment:'payment'};

export const accountTouches=(t,id)=>t.from===id||t.to===id;
// Ver nota al inicio del archivo: estos movimientos no se tocan desde este CSV.
export function isCsvEditable(t,sharedIds=new Set()){
 return t.kind!=='msi'&&!t.parent&&!t.payrollId&&!sharedIds.has(t.from)&&!sharedIds.has(t.to);
}
function rowKind(t){if(t.kind==='msi')return 'compra_msi';if(t.kind==='payment'&&t.parent)return 'pago_msi';return KIND_LABELS[t.kind]||t.kind;}
function csvCell(value){const s=String(value??'');return /[",\r\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}

export function exportAccountCSV(state,accountId,sharedIds=new Set()){
 const a=state.accounts.find(x=>x.id===accountId);if(!a)throw Error('Cuenta inexistente.');
 const nameOf=id=>state.accounts.find(x=>x.id===id)?.name||'';
 const rows=state.transactions.filter(t=>accountTouches(t,accountId)).sort((x,y)=>x.date.localeCompare(y.date)||String(x.id).localeCompare(String(y.id)));
 const lines=[ACCOUNT_CSV_HEADER];
 for(const t of rows)lines.push([t.id,t.date,rowKind(t),t.status==='done'?'realizado':'programado',t.concept,nameOf(t.from),nameOf(t.to),(t.amount/100).toFixed(2),t.received&&t.received!==t.amount?(t.received/100).toFixed(2):'',t.category||'',t.business||'',t.notes||'',isCsvEditable(t,sharedIds)?'si':'no'].map(csvCell).join(','));
 return lines.join('\r\n')+'\r\n';
}

// Compara el CSV recién cargado contra el estado actual para la cuenta `accountId`.
// No requiere ninguna fecha de referencia: a diferencia del antiguo importador (solo
// pagos programados futuros), este editor cubre todo el historial de la cuenta.
export function diffAccountCSV(text,state,accountId,sharedIds=new Set()){
 const acc=state.accounts.find(x=>x.id===accountId);if(!acc)throw Error('Cuenta inexistente.');
 const parsed=parseCSV(text);
 const byId=new Map(state.transactions.map(t=>[t.id,t]));
 const touching=state.transactions.filter(t=>accountTouches(t,accountId));
 const findAccount=value=>{if(!value)return null;const matches=state.accounts.filter(x=>!x.archived&&(x.id===value||categoryKey(x.name)===categoryKey(value)));if(matches.length!==1)throw Error(`Cuenta inexistente o ambigua: ${value}.`);if(sharedIds.has(matches[0].id))throw Error(`${value} es una cuenta compartida: edita esos movimientos desde "Movimientos compartidos".`);return matches[0];};
 const seenIds=new Set(),toAdd=[],toEdit=[],skipped=[],errors=[];
 for(const row of parsed){try{
  const id=(row.id||'').trim();
  if(id&&byId.has(id)&&!isCsvEditable(byId.get(id),sharedIds)){
   if(!accountTouches(byId.get(id),accountId))throw Error('Ese ID no corresponde a un movimiento de esta cuenta.');
   skipped.push({line:row.line,id});continue;
  }
  if(id&&!byId.has(id))throw Error('ID no reconocido; deja la columna id vacía para un movimiento nuevo.');
  if(id&&!accountTouches(byId.get(id),accountId))throw Error('Ese ID no corresponde a un movimiento de esta cuenta.');
  if(id&&seenIds.has(id))throw Error('ID duplicado en el archivo.');
  const kindKey=categoryKey(row.tipo);
  if(['compra_msi','msi','pago_msi'].includes(kindKey))throw Error('Las compras a MSI (y sus mensualidades) no se crean ni editan desde este CSV; hazlo desde Movimientos.');
  const kind=KIND_FROM_LABEL[kindKey];if(!kind)throw Error('Tipo válido: gasto, ingreso, transferencia o pago.');
  const date=csvDate(row.fecha);
  if(!row.concepto)throw Error('Falta el concepto.');
  const from=findAccount(row.cuenta_origen),to=findAccount(row.cuenta_destino),amount=csvMoney(row.monto);
  if(kind==='income'&&(!to||from))throw Error('Un ingreso necesita solo cuenta_destino.');
  if(kind==='expense'&&(!from||to))throw Error('Un gasto necesita solo cuenta_origen.');
  if(['payment','transfer'].includes(kind)&&(!from||!to))throw Error('Un pago o transferencia necesita ambas cuentas.');
  if(from&&to&&from.id===to.id)throw Error('Las cuentas deben ser distintas.');
  if(from?.id!==accountId&&to?.id!==accountId)throw Error('El movimiento debe incluir esta cuenta en origen o destino.');
  const category=canonicalCategory(row.categoria);if(row.categoria&&!CATEGORIES.includes(category))throw Error(`Categoría fuera del catálogo: ${row.categoria}.`);
  let received=amount;if(from&&to){if(from.currency!==to.currency&&!row.monto_recibido)throw Error('Indica monto_recibido cuando cambia la moneda.');received=row.monto_recibido?csvMoney(row.monto_recibido):amount;if(from.currency===to.currency&&received!==amount)throw Error('En la misma moneda el importe recibido debe coincidir.');}
  const estadoKey=categoryKey(row.estado||'programado');
  if(!['realizado','done','programado','pending'].includes(estadoKey))throw Error('Estado válido: realizado o programado.');
  const status=['realizado','done'].includes(estadoKey)?'done':'pending';
  const item={kind,concept:row.concepto,date,from:from?.id||null,to:to?.id||null,amount,received,category,business:row.negocio||'',notes:row.notas||'',status};
  if(id){
   seenIds.add(id);const old=byId.get(id);
   // canonicalCategory('') ya resuelve a 'Sin Categoria' (no a ''), así que el lado viejo se
   // normaliza igual: si no, un movimiento sin categoría asignada se marcaría como "cambiado"
   // con solo volver a cargar su propia fila sin tocarla.
   const changed=old.date!==item.date||old.kind!==item.kind||old.concept!==item.concept||(old.from||null)!==item.from||(old.to||null)!==item.to||old.amount!==item.amount||(old.received??old.amount)!==item.received||canonicalCategory(old.category||'')!==item.category||(old.business||'')!==item.business||(old.notes||'')!==item.notes||old.status!==item.status;
   if(changed)toEdit.push({id,before:old,after:{...old,...item,id}});
  } else toAdd.push(item);
 }catch(e){errors.push(`Fila ${row.line}: ${e.message}`);}}
 const toDelete=touching.filter(t=>isCsvEditable(t,sharedIds)&&!seenIds.has(t.id));
 return {toAdd,toEdit,toDelete,skipped,errors,account:acc};
}

export function applyAccountCSV(state,diff,uid){
 let next=structuredClone(state);
 for(const del of diff.toDelete)next=removeTransaction(next,del.id,false);
 for(const add of diff.toAdd)next.transactions.push({...add,id:uid()});
 for(const edit of diff.toEdit)saveTransactionEdit(next,{...edit.after},'one');
 return next;
}

export function downloadAccountCSV(state,accountId,sharedIds,accountName){
 const csv=exportAccountCSV(state,accountId,sharedIds);
 const url=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
 const l=document.createElement('a');l.href=url;
 const slug=String(accountName||'cuenta').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'cuenta';
 l.download=`movimientos-${slug}.csv`;l.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function accountCsvImportUI({state,getState,accountId,modal,persist,uid,esc,money,notify,sharedAccountIds=()=>new Set()}){
 // Se agrega al documento (oculto) antes de abrir el selector de archivos: algunos
 // navegadores no abren el diálogo nativo desde un <input> que nunca estuvo en el DOM.
 const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.style.display='none';document.body.append(input);
 input.onchange=async()=>{try{
  const file=input.files[0];if(!file)return;if(file.size>4500000)throw Error('El archivo supera 4.5 MB. Divídelo en archivos más pequeños.');
  const text=await file.text(),diff=diffAccountCSV(text,getState(),accountId,sharedAccountIds());
  const names=id=>getState().accounts.find(a=>a.id===id)?.name||'—';
  const cur=diff.account.currency,fmtAmt=t=>money(t.kind==='income'?t.amount:-t.amount,cur,t.kind==='transfer'?'neutral':undefined);
  const row=t=>`<div class="row"><div class="grow"><strong>${esc(t.concept)}</strong><small>${t.date} · ${esc(names(t.from))} ${t.from&&t.to?'→':''} ${esc(names(t.to))}</small></div>${fmtAmt(t)}</div>`;
  const section=(title,list)=>list.length?`<h3 style="font-size:14px;color:var(--muted)">${title} (${list.length})</h3><div class="csv-preview">${list.slice(0,50).map(row).join('')}</div>${list.length>50?'<p class="subtle">Mostrando las primeras 50.</p>':''}`:'';
  const body=`<p>Archivo: ${esc(file.name)}.</p><p>${diff.toAdd.length} nuevos · ${diff.toEdit.length} con cambios · ${diff.toDelete.length} para eliminar (no están en el archivo) · ${diff.skipped.length} filas no editables omitidas.</p>`
   +(diff.errors.length?`<p class="negative">Corrige los ${diff.errors.length} errores y vuelve a cargar el CSV. No se guardará ningún cambio.</p>${diff.errors.slice(0,30).map(e=>`<p>${esc(e)}</p>`).join('')}`:'')
   +section('Nuevos movimientos',diff.toAdd)+section('Cambios',diff.toEdit.map(e=>e.after))+section('Se eliminarán (no aparecen en el archivo)',diff.toDelete);
  modal('Aplicar CSV de '+esc(diff.account.name),body,async()=>{
   if(diff.errors.length)throw Error('Corrige el archivo antes de aplicarlo.');
   // Se vuelve a comparar por si el estado cambió mientras se revisaba la vista previa.
   const current=getState(),fresh=diffAccountCSV(text,current,accountId,sharedAccountIds());
   if(fresh.errors.length)throw Error(fresh.errors[0]);
   if(!fresh.toAdd.length&&!fresh.toEdit.length&&!fresh.toDelete.length){notify('No hay cambios que aplicar.');return;}
   await persist(applyAccountCSV(current,fresh,uid));
   notify(`${fresh.toAdd.length} agregados · ${fresh.toEdit.length} editados · ${fresh.toDelete.length} eliminados.`);
  });
 }catch(e){notify(e.message);}finally{input.remove();}};input.click();
}

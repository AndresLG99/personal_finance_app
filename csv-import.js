import {CATEGORIES,canonicalCategory,categoryKey,today} from './finance.js?v=20260922-1';

export const CSV_TEMPLATE='id,fecha,tipo,concepto,cuenta_origen,cuenta_destino,monto,categoria,negocio,notas,monto_recibido\r\npago-001,2031-01-22,pago,Pago tarjeta,Mi banco,Mi tarjeta,1500.00,Pago de tarjeta,,,\r\n';
export function parseCSV(text){
 text=String(text).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0];const separator=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false;};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Comillas inesperadas en el CSV.');quoted=true;}
  else if(c===separator)push();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(c=>c.trim()))rows.push(row);row=[];}
  else if(closed){if(!/\s/.test(c))throw Error('Texto inesperado después de una celda entre comillas.');}
  else cell+=c;
 }
 if(quoted)throw Error('Hay una celda con comillas sin cerrar.');push();if(row.some(c=>c.trim()))rows.push(row);
 if(!rows.length)throw Error('El CSV está vacío.');
 const headers=rows.shift().map(h=>categoryKey(h).replace(/\s+/g,'_'));
 if(new Set(headers).size!==headers.length)throw Error('El CSV contiene encabezados repetidos.');
 for(const name of ['fecha','tipo','concepto','monto'])if(!headers.includes(name))throw Error(`Falta la columna ${name}. Usa la plantilla.`);
 return rows.map((cells,i)=>{if(cells.length!==headers.length)throw Error(`Fila ${i+2}: número de columnas incorrecto.`);return {line:i+2,...Object.fromEntries(headers.map((h,j)=>[h,cells[j].trim()]))};});
}
export function csvDate(raw){
 let value=raw;const local=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);if(local)value=`${local[3]}-${local[2]}-${local[1]}`;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Fecha inválida; usa AAAA-MM-DD o DD/MM/AAAA.');
 const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('La fecha no existe.');return value;
}
export function csvMoney(raw){
 let s=String(raw).trim().replace(/\s|\$/g,'');
 if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s))s=s.replace(/,/g,'');
 else if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Monto inválido; usa un número positivo con hasta dos decimales.');
 const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n<=0)throw Error('El monto debe ser positivo.');return n;
}
const signature=t=>JSON.stringify([t.date,t.kind,t.from||'',t.to||'',t.amount,t.received||t.amount,categoryKey(t.concept)]);
export function previewCSV(text,state,current=today()){
 const parsed=parseCSV(text),transactions=[],errors=[];let past=0,duplicates=0;
 const seen=new Set(state.transactions.map(signature));const ids=new Map(state.transactions.filter(t=>t.csvId).map(t=>[t.csvId,signature(t)]));
 const account=value=>{if(!value)return null;const matches=state.accounts.filter(a=>!a.archived&&(a.id===value||categoryKey(a.name)===categoryKey(value)));if(matches.length!==1)throw Error(`Cuenta inexistente o ambigua: ${value}. Usa su nombre exacto o ID.`);return matches[0];};
 const kinds={pago:'payment',payment:'payment',gasto:'expense',expense:'expense',ingreso:'income',income:'income',transferencia:'transfer',transfer:'transfer'};
 for(const row of parsed){try{
  const date=csvDate(row.fecha);if(date<current){past++;continue;}
  const kind=kinds[categoryKey(row.tipo)];if(!kind)throw Error('Tipo válido: pago, gasto, ingreso o transferencia.');
  if(!row.concepto)throw Error('Falta el concepto.');
  const from=account(row.cuenta_origen),to=account(row.cuenta_destino),amount=csvMoney(row.monto);
  if(kind==='income'&&(!to||from))throw Error('Un ingreso necesita solo cuenta_destino.');
  if(kind==='expense'&&(!from||to))throw Error('Un gasto necesita solo cuenta_origen.');
  if(['payment','transfer'].includes(kind)&&(!from||!to))throw Error('Un pago o transferencia necesita ambas cuentas.');
  if(from&&to&&from.id===to.id)throw Error('Las cuentas deben ser distintas.');
  if(kind==='payment'&&!['credit','loan','receivable'].includes(to.type))throw Error('El destino del pago debe ser una tarjeta, deuda o préstamo.');
  const category=canonicalCategory(row.categoria);if(!CATEGORIES.includes(category))throw Error(`Categoría fuera del catálogo: ${row.categoria}.`);
  let received;if(from&&to){if(from.currency!==to.currency&&!row.monto_recibido)throw Error('Indica monto_recibido cuando cambia la moneda.');received=row.monto_recibido?csvMoney(row.monto_recibido):amount;if(from.currency===to.currency&&received!==amount)throw Error('En la misma moneda el importe recibido debe coincidir.');}
  const tx={kind,concept:row.concepto,date,from:from?.id||null,to:to?.id||null,amount,received,category,business:row.negocio||'',notes:row.notas||'',status:'pending',csvId:row.id||undefined};
  const key=signature(tx);
  if(tx.csvId&&ids.has(tx.csvId)){if(ids.get(tx.csvId)!==key)throw Error(`El ID ${tx.csvId} ya existe con datos distintos.`);duplicates++;continue;}
  if(seen.has(key)){duplicates++;continue;}
  if(tx.csvId)ids.set(tx.csvId,key);seen.add(key);transactions.push(tx);
 }catch(e){errors.push(`Fila ${row.line}: ${e.message}`);}}
 return {transactions,errors,past,duplicates,total:parsed.length};
}
export function csvImportUI({state,getState,modal,persist,uid,esc,money,notify}){
 const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';
 input.onchange=async()=>{try{
  const file=input.files[0];if(!file)return;if(file.size>4500000)throw Error('El archivo supera 4.5 MB. Divídelo en archivos más pequeños.');
  const text=await file.text(),report=previewCSV(text,getState()),date=today();
  const names=id=>getState().accounts.find(a=>a.id===id)?.name||'—';
  modal('Importar pagos programados',`<p>Archivo: ${esc(file.name)}. Fecha de referencia: ${date}.</p><p>${report.transactions.length} por importar · ${report.past} anteriores a hoy omitidos · ${report.duplicates} duplicados omitidos.</p><p>Se incluyen hoy y fechas posteriores, sin límite de año. Todos se guardan como programados sin confirmar.</p>${report.errors.length?`<p class="negative">Corrige los ${report.errors.length} errores y vuelve a cargar el CSV. No se guardará ninguna fila.</p>${report.errors.slice(0,30).map(e=>`<p>${esc(e)}</p>`).join('')}`:''}<div class="csv-preview">${report.transactions.slice(0,100).map(t=>`<div class="row"><div class="grow"><strong>${esc(t.concept)}</strong><small>${t.date} · ${esc(names(t.from))} → ${esc(names(t.to))}</small></div>${money(t.kind==='income'?t.amount:-t.amount,getState().accounts.find(a=>a.id===(t.from||t.to))?.currency,t.kind==='transfer'?'neutral':undefined)}</div>`).join('')}</div>${report.transactions.length>100?'<p>Vista previa de las primeras 100 filas; se importarán todas las válidas.</p>':''}`,async()=>{
   if(report.errors.length)throw Error('Corrige el archivo antes de importarlo.');
   // Volver a comparar evita duplicados si cambian los datos o la fecha mientras se revisa.
   const current=getState(),fresh=previewCSV(text,current);if(fresh.errors.length)throw Error(fresh.errors[0]);if(!fresh.transactions.length)throw Error('No hay programaciones nuevas para importar.');
   const next=structuredClone(current);next.transactions.push(...fresh.transactions.map(t=>({...t,id:uid()})));await persist(next);notify(`${fresh.transactions.length} pagos programados importados.`);
  });
 }catch(e){notify(e.message);}};input.click();
}

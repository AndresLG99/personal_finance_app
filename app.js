import {paymentCandidates,allocateExpense,autoPaymentWindow,defaultPaymentSource,createAutoPayment} from './payment-allocation.js?v=20260924-1';
import {walletTheme,walletColors,merchantIcon} from './wallet.js?v=20260922-1';
import {activityLists,chronological,stampTransactions} from './activity.js?v=20260917-1';
import {needsWelcome,openWelcome} from './onboarding.js?v=20260924-1';
import {orderedAccounts,accountGroupSections} from './account-groups.js?v=20261012-1';
import {swipeRow,iconButton,passwordToggles} from './transaction-actions.js?v=20261019-1';
import {crossCurrency,refreshPending,exchangeFields,bindExchange} from './exchange.js?v=20260915-3';
import {accountHistory,payoff,duplicateDraft} from './insights.js?v=20260924-2';
import {enhanceMoneyInputs} from './money-input.js?v=20260922-1';
import {CSV_TEMPLATE,csvImportUI} from './csv-import.js?v=20260912-6';
import {openPayroll} from './payroll.js?v=20260922-1';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js?v=20260908-2';

import {today,monthDate,installments,balance,debt,validate,recurringDate,CATEGORIES,monthlyLists,longDate,balanceAfter,saveTransactionEdit,removeTransaction,removeRule,saveRule,canonicalCategory,migrateCategories,addDays,cardDate,billingWindow,visibleAccounts} from './finance.js?v=20260922-1';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),uid=()=>crypto.randomUUID(),money=(n,c='MXN',tone)=>`<span class="${tone||(n<0?'negative':n>0?'positive':'neutral')}">${new Intl.NumberFormat('es-MX',{style:'currency',currency:c}).format((n||0)/100)}</span>`;
const fmt=(n,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c}).format((n||0)/100);
const fmt0=(n,c='MXN')=>new Intl.NumberFormat('es-MX',{style:'currency',currency:c,maximumFractionDigits:0}).format((n||0)/100);
const signed=(n,c)=>(n>0?'+':n<0?'−':'')+fmt(Math.abs(n),c);
const signed0=(n,c)=>(n>0?'+':n<0?'−':'')+fmt0(Math.abs(n),c);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const monthName=m=>cap(new Date(m+'-01T12:00:00').toLocaleDateString('es-MX',{month:'long'}));
const monthYear=m=>cap(new Date(m+'-01T12:00:00').toLocaleDateString('es-MX',{month:'long',year:'numeric'}));
const shortDate=d=>{const x=new Date(d+'T12:00:00');return x.getDate()+' '+cap(x.toLocaleDateString('es-MX',{month:'short'}).replace('.',''))+' '+x.getFullYear();};
const dayLabel=d=>{const t=today();if(d===t)return 'Hoy';if(d===addDays(t,-1))return 'Ayer';if(d===addDays(t,1))return 'Mañana';const x=new Date(d+'T12:00:00');return cap(x.toLocaleDateString('es-MX',{weekday:'long'}))+' '+x.getDate()+(d.slice(0,7)!==t.slice(0,7)?' de '+cap(x.toLocaleDateString('es-MX',{month:'short'}).replace('.',''))+' '+x.getFullYear():'');};
const pct=v=>v===null||!isFinite(v)?'—':Math.round(v*100)+'%';
const monthsTxt=v=>v===null||!isFinite(v)?'—':(v>=10?Math.round(v):v.toFixed(1))+(v>=0.95&&v<1.05?' mes':' meses');

let client,user,revision=0,busy=false,channel,connectionText='',loginText='Iniciar sesión';

const empty=()=>({accounts:[],transactions:[],rules:[],goals:[]});

const sample=()=>({accounts:[{id:'bank',name:'Cuenta principal · ejemplo',type:'debit',currency:'MXN',opening:2400000,asOf:today(),available:true},{id:'cash',name:'Efectivo · ejemplo',type:'cash',currency:'MXN',opening:120000,asOf:today(),available:true},{id:'credit',name:'Tarjeta · ejemplo',type:'credit',currency:'MXN',opening:-450000,asOf:today(),limit:3000000,cut:2,pay:22}],transactions:[{id:'example',kind:'expense',concept:'Supermercado · ejemplo',date:today(),from:'bank',amount:84500,status:'done'},{id:'payment',kind:'payment',concept:'Pago de tarjeta · ejemplo',date:monthDate(today(),1,22),from:'bank',to:'credit',amount:150000,status:'pending'}],rules:[]});

let state=SUPABASE_URL?empty():sample();const types={debit:'Débito',cash:'Efectivo',saving:'Ahorro',vouchers:'Vales',credit:'Tarjeta de crédito',loan:'Deuda por pagar',receivable:'Préstamo por cobrar'};const kinds={expense:'Gasto',income:'Ingreso',transfer:'Transferencia',payment:'Pago de deuda / tarjeta',msi:'Compra a meses sin intereses'};

const account=id=>state.accounts.find(a=>a.id===id);const name=id=>account(id)?.name||'—';
const active=()=>state.accounts.filter(a=>!a.archived);
const txCur=t=>account(t.from||t.to)?.currency||ui.currency;

const ui={tab:'insights',currency:'MXN',month:today().slice(0,7),calMonth:today().slice(0,7),selDay:today(),seg:'done',acct:'all',q:'',push:null,scroll:{},compact:false,strategySeg:'recomendaciones',priority:'snowball'};
const currencies=()=>{const s=[...new Set(active().map(a=>a.currency))];return s.length?s:['MXN'];};
function ensureCurrency(){if(!currencies().includes(ui.currency))ui.currency=currencies()[0];}

function welcomeSeen(owner){try{return !!localStorage.getItem('welcome:'+owner);}catch{return false;}}
function welcome(){const owner=user?.id;openWelcome({visit:(section,target)=>{setTab(section);requestAnimationFrame(()=>document.querySelector(target)?.scrollIntoView({block:'start',behavior:'smooth'}));},finish:async()=>{if(!owner&&SUPABASE_URL)return;if(user?.id!==owner)throw Error('La sesión cambió. Vuelve a iniciar sesión.');const next=structuredClone(state);next.onboarding={version:2,dismissedAt:new Date().toISOString()};try{localStorage.setItem('welcome:'+owner,next.onboarding.dismissedAt);}catch{}try{await persist(next);}catch(e){notify('Tutorial completado en este dispositivo. No se sincronizó el avance: '+e.message);}},start:()=>{setTab('ajustes');accountForm();}});}
async function saveBook(payload,version){const owner=user?.id;const sessionResult=await client.auth.getSession();if(sessionResult.error||!sessionResult.data.session||sessionResult.data.session.user.id!==owner)throw Error('Tu sesión no está activa. Inicia sesión de nuevo; tus cambios no se han guardado.');let result=await client.rpc('save_finance_book',{p_payload:payload,p_revision:version});if(result.error&&/permission denied|JWT expired/i.test(result.error.message)){const refreshed=await client.auth.refreshSession();if(refreshed.error||refreshed.data.session?.user.id!==owner)throw Error('Vuelve a iniciar sesión para guardar tus cambios.');result=await client.rpc('save_finance_book',{p_payload:payload,p_revision:version});}if(user?.id!==owner)throw Error('La sesión cambió durante el guardado.');return result;}

function notify(s){const t=$('#notice');if(!s){t.classList.remove('show');return;}t.textContent=s;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),3200);}

async function load(){if(!user)return;const owner=user.id;for(let attempt=0;attempt<2;attempt++){const {data,error}=await client.from('finance_books').select('payload,revision').eq('user_id',owner).maybeSingle();if(error)throw error;if(user?.id!==owner)return;const original=data?.payload||empty(),next=migrateCategories(original);let nextRevision=data?.revision||0;if(JSON.stringify(original)!==JSON.stringify(next)){const result=await saveBook(next,nextRevision);if(result.error){if(result.error.message.includes('CONFLICT')&&attempt===0)continue;throw result.error;}nextRevision=result.data;}if(user?.id!==owner)return;state=next;revision=nextRevision;ensureCurrency();renderAll();if(needsWelcome(state)&&!welcomeSeen(owner))welcome();return;}}

async function persist(next){next=stampTransactions(state,migrateCategories(next));if(SUPABASE_URL&&!user)throw Error('Inicia sesión para guardar tus movimientos.');validate(next);if(!user){state=next;notify('Modo de ejemplo: estos cambios se perderán al recargar.');ensureCurrency();renderAll();return;}const {data,error}=await saveBook(next,revision);if(error){if(error.message.includes('CONFLICT')){await load();throw Error('Hubo un cambio desde otro dispositivo. Recargamos los datos; vuelve a realizar esta operación.');}throw error;}state=next;revision=data;ensureCurrency();renderAll();}

async function mutate(fn){if(busy)return;busy=true;try{const next=structuredClone(state);fn(next);await persist(next);}catch(e){notify(e.message);}finally{busy=false;}}

let exchangeRefreshAt=0,exchangeRefreshing=false;
async function refreshExchange(){if(exchangeRefreshing||Date.now()-exchangeRefreshAt<3600000||!state.transactions.some(t=>t.status==='pending'&&crossCurrency(t,state.accounts)))return;exchangeRefreshing=true;const original=state;try{const result=await refreshPending(original);if(state===original){state=result.state;exchangeRefreshAt=Date.now()-(result.failures?3300000:0);renderAll();if(result.failures)notify('No se actualizaron algunas conversiones. Se conservan las últimas estimaciones; revisa la conexión.');}}finally{exchangeRefreshing=false;}}
setInterval(refreshExchange,60000);window.addEventListener('focus',()=>refreshExchange());

/* ========================================================================
   Cálculos de presentación (derivados de state; ninguna lógica de datos nueva)
   ======================================================================== */
function liquidAccounts(cur){return active().filter(a=>a.currency===cur&&!debt(a)&&a.available);}
function sumBal(list,date,proj){return list.reduce((s,a)=>s+balance(state,a.id,date,proj),0);}
function monthTotalsCur(month,cur){const tx=state.transactions.filter(t=>t.date.startsWith(month)&&t.status==='done');const inc=tx.filter(t=>t.kind==='income'&&account(t.to)?.currency===cur).reduce((s,t)=>s+(t.received??t.amount),0);const exp=tx.filter(t=>['expense','msi'].includes(t.kind)&&account(t.from)?.currency===cur).reduce((s,t)=>s+t.amount,0);return {inc,exp};}
function monthSeries(month,cur){const T=today(),last=Number(monthDate(month+'-01',0,31).slice(8)),L=liquidAccounts(cur);return Array.from({length:last},(_,i)=>{const d=month+'-'+String(i+1).padStart(2,'0');return {d,v:sumBal(L,d,d>T)};});}
function categoriesFor(month,cur){const m=new Map();for(const t of state.transactions){if(!t.date.startsWith(month)||t.status!=='done'||!['expense','msi'].includes(t.kind)||account(t.from)?.currency!==cur)continue;const c=canonicalCategory(t.category);m.set(c,(m.get(c)||0)+t.amount);}return [...m].sort((a,b)=>b[1]-a[1]);}
const monthlyFactor=r=>({months:1/(r.every||1),years:1/(12*(r.every||1)),weeks:4.345/(r.every||1),days:30.44/(r.every||1)}[r.unit||'months']||1);
function ruleActive(r,ref){if(!r.first)return false;if(r.first>ref)return true;const n=Number(r.count)||1,unit=r.unit||'months',every=r.every||1;let lastDate;if(unit==='months'||unit==='years')lastDate=monthDate(r.first,(n-1)*every*(unit==='years'?12:1),Number(r.first.slice(8)));else lastDate=addDays(r.first,(n-1)*every*(unit==='weeks'?7:1));return lastDate>=ref;}
function health(cur,ref=today()){
  const firstAsOf=active().filter(a=>a.currency===cur).map(a=>a.asOf).sort()[0]||ref;
  const spanDays=clamp(Math.round((new Date(ref+'T12:00:00Z')-new Date(firstAsOf+'T12:00:00Z'))/86400000),1,90),months=spanDays/30.44,start=addDays(ref,-spanDays);
  const win=state.transactions.filter(t=>t.status==='done'&&t.date>start&&t.date<=ref);
  const inc=win.filter(t=>t.kind==='income'&&account(t.to)?.currency===cur).reduce((s,t)=>s+(t.received??t.amount),0)/months;
  const exp=win.filter(t=>['expense','msi'].includes(t.kind)&&account(t.from)?.currency===cur).reduce((s,t)=>s+t.amount,0)/months;
  let pay=win.filter(t=>t.kind==='payment'&&account(t.from)?.currency===cur&&account(t.to)&&debt(account(t.to))).reduce((s,t)=>s+t.amount,0)/months;
  if(!pay)pay=state.transactions.filter(t=>t.kind==='payment'&&t.status==='pending'&&t.date>ref&&t.date<=addDays(ref,30)&&account(t.from)?.currency===cur).reduce((s,t)=>s+t.amount,0);
  const cash=active().filter(a=>a.currency===cur&&!debt(a)&&a.type!=='receivable').reduce((s,a)=>s+Math.max(0,balance(state,a.id,ref)),0);
  const cards=active().filter(a=>a.currency===cur&&a.type==='credit'&&a.limit>0);
  const owed=cards.reduce((s,a)=>s+Math.max(0,-balance(state,a.id,ref)),0),lim=cards.reduce((s,a)=>s+a.limit,0);
  const fixed=state.rules.filter(r=>r.kind!=='income'&&ruleActive(r,ref)&&account(r.from)?.currency===cur).reduce((s,r)=>s+r.amount*monthlyFactor(r),0);
  const net=active().filter(a=>a.currency===cur).reduce((s,a)=>s+balance(state,a.id,ref),0);
  const I={savings:inc>0?(inc-exp)/inc:null,emergency:exp>0?cash/exp:null,util:lim>0?owed/lim:null,dti:inc>0?pay/inc:null,fixed:inc>0&&fixed>0?fixed/inc:null};
  const pts={savings:v=>v>=.2?100:v>=.1?50+(v-.1)*500:v>=0?v*500:0,emergency:v=>v>=6?100:v>=3?75+(v-3)*25/3:v>=1?35+(v-1)*20:v*35,util:v=>v<=.1?100:v<=.3?100-(v-.1)*125:v<=.5?75-(v-.3)*175:Math.max(0,40-(v-.5)*80),dti:v=>v<=.15?100:v<=.36?100-(v-.15)*142.9:v<=.5?70-(v-.36)*285.7:Math.max(0,30-(v-.5)*60),fixed:v=>v<=.4?100:v<=.5?100-(v-.4)*300:v<=.7?70-(v-.5)*200:Math.max(0,30-(v-.7)*100)};
  const W={savings:.25,emergency:.25,util:.2,dti:.15,fixed:.15};
  let sw=0,ss=0;for(const k in W)if(I[k]!==null&&isFinite(I[k])){sw+=W[k];ss+=W[k]*clamp(pts[k](I[k]),0,100);}
  const score=sw?Math.round(ss/sw):null;
  return {I,score,inc,exp,pay,cash,owed,lim,fixed,net,pts};
}
const scoreLabel=s=>s===null?'Sin datos':s>=85?'Excelente':s>=70?'Buena':s>=50?'Regular':'Débil';
const scoreColor=s=>s===null?'var(--muted)':s>=70?'var(--pos)':s>=50?'var(--warn)':'var(--neg)';
function indicatorDefs(h,cur){
  const I=h.I,st=(ok,warn)=>ok?['Bien','st-ok']:warn?['Atención','st-warn']:['Riesgo','st-bad'];
  const z=(a,b,c)=>[a,b,c];const bad='#6B2E22',mid='#6B5420',good='#1F5A47';
  return [
    {k:'savings',name:'Tasa de ahorro',value:pct(I.savings),goal:'Meta: 20% o más',s:I.savings===null?null:st(I.savings>=.2,I.savings>=.1),zones:z([20,bad],[20,mid],[60,good]),m:I.savings===null?0:clamp(I.savings/.5,0,1)*100,desc:I.savings===null?'Registra ingresos para calcularla.':`En promedio entran ${fmt0(h.inc,cur)} al mes y salen ${fmt0(h.exp,cur)} en gastos.`},
    {k:'emergency',name:'Fondo de emergencia',value:monthsTxt(I.emergency),goal:'Meta: 3 a 6 meses',s:I.emergency===null?null:st(I.emergency>=3,I.emergency>=1),zones:z([17,bad],[33,mid],[50,good]),m:I.emergency===null?0:clamp(I.emergency/6,0,1)*100,desc:`Tus cuentas de débito, efectivo y ahorro suman ${fmt0(h.cash,cur)}; cubrirían ese tiempo de gastos sin ingresos.`},
    {k:'util',name:'Uso de crédito',value:pct(I.util),goal:'Meta: menos de 30%',s:I.util===null?null:st(I.util<.3,I.util<.5),zones:z([30,good],[20,mid],[50,bad]),m:I.util===null?0:clamp(I.util,0,1)*100,desc:I.util===null?'Agrega el límite de tus tarjetas para calcularlo.':`Debes ${fmt0(h.owed,cur)} de un límite total de ${fmt0(h.lim,cur)}.`},
    {k:'dti',name:'Deuda / ingreso',value:pct(I.dti),goal:'Meta: menos de 36%',s:I.dti===null?null:st(I.dti<.36,I.dti<.5),zones:z([60,good],[12,mid],[28,bad]),m:I.dti===null?0:clamp(I.dti/.6,0,1)*100,desc:`Pagos a tarjetas y deudas: ${fmt0(h.pay,cur)} al mes frente a lo que ganas.`},
    {k:'fixed',name:'Gastos fijos / ingreso',value:pct(I.fixed),goal:'Meta: 50% o menos',s:I.fixed===null?null:st(I.fixed<=.5,I.fixed<=.6),zones:z([50,good],[13,mid],[37,bad]),m:I.fixed===null?0:clamp(I.fixed/.8,0,1)*100,desc:I.fixed===null?'Registra tus costos recurrentes para calcularlo.':`Tus costos recurrentes suman ${fmt0(h.fixed,cur)} al mes.`}
  ];
}
function ring(score,size,stroke){const r=(size-stroke)/2,c=2*Math.PI*r,dash=score===null?0:c*score/100;return `<span style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;display:block"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#2A2B34" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${scoreColor(score)}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} 999" transform="rotate(-90 ${size/2} ${size/2})"/></svg><span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font-size:${size>120?40:32}px;font-weight:700;letter-spacing:-1px">${score??'—'}</span><span class="small">de 100</span></span></span>`;}
function lineChart(series,todayStr,w=326,h=96){
  if(!series.length)return '';const vals=series.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),pad=Math.max((max-min)*.15,100),lo=min-pad,hi=max+pad;
  const x=i=>series.length>1?i/(series.length-1)*w:0,y=v=>h-6-(v-lo)/(hi-lo)*(h-12);
  let ti=series.findIndex(p=>p.d>todayStr);if(ti===-1)ti=series.length;const pastEnd=Math.max(0,ti-1);
  const past=series.slice(0,ti).map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ');
  const fut=series.slice(pastEnd).map((p,i)=>(i?'L':'M')+x(i+pastEnd).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ');
  const tx=x(pastEnd),tyv=y(series[pastEnd].v);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Saldo diario del mes; la línea punteada es la proyección">${past?`<path d="${past}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`:''}${ti<series.length?`<path d="${fut}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="5 7" stroke-linecap="round" opacity=".7" vector-effect="non-scaling-stroke"/>`:''}${ti>0&&ti<=series.length?`<line x1="${tx}" y1="2" x2="${tx}" y2="${h-2}" stroke="#FFFFFF24" vector-effect="non-scaling-stroke"/><circle cx="${tx}" cy="${tyv}" r="5" fill="var(--bg)" stroke="var(--accent)" stroke-width="3" vector-effect="non-scaling-stroke"/>`:''}</svg>`;
}
const svgI={insights:'M3 17l5-5 4 3 8-10M15 5h5v5',movimientos:'M8 3l-4 4 4 4M4 7h16M16 13l4 4-4 4M20 17H4',calendario:'M7 3v4M17 3v4M3 11h18M7 5h10a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z',ajustes:'M4 7h16M4 17h16M9 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM15 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',estrategia:'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 12m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0M12 3v3M12 18v3M3 12h3M18 12h3'};

function txIcon(t){if(t.kind==='income'||t.kind==='transfer'||t.kind==='payment')return merchantIcon(t);return merchantIcon(t);}
function txAmount(t){const c=txCur(t);if(t.kind==='income')return `<span class="amt num pos">+${fmt(t.received??t.amount,c)}</span>`;if(t.kind==='transfer'||t.kind==='payment')return `<span class="amt num neutral">${fmt(t.amount,c)}</span>`;return `<span class="amt num neg">−${fmt(t.amount,c)}</span>`;}
function txSub(t){const parts=[];if(t.kind==='transfer'||t.kind==='payment')parts.push(esc(name(t.from))+' → '+esc(name(t.to)));else parts.push(esc(name(t.from||t.to)));if(t.category&&t.kind!=='transfer')parts.push(esc(canonicalCategory(t.category)));return parts.join(' · ');}
const confirmBtn=(t,style='margin-left:8px')=>`<button type="button" class="btn sm icon-confirm" style="${style}" data-action="confirm" data-id="${esc(t.id)}" title="Confirmar" aria-label="Confirmar ${esc(t.concept)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg></button>`;
function txRow(t){const inst=/·\s*\d+\/\d+$/.test(t.concept||'');const content=`<div class="tx" style="padding-right:0"><button class="tx" style="padding:0;border:0;flex:1;min-width:0" data-action="edit" data-id="${esc(t.id)}">${txIcon(t)}<span class="mid-col"><span class="t1">${esc(t.concept)}</span><span class="t2">${txSub(t)}</span>${t.kind==='msi'||inst?`<span><span class="badge">${t.kind==='msi'?'Compra a MSI':'Mensualidad MSI'}</span></span>`:''}${t.status==='pending'?'<span><span class="badge">Programado</span></span>':''}</span>${txAmount(t)}</button>${t.status==='pending'?confirmBtn(t):''}</div>`;return swipeRow(content,t,esc);}
function walletCard(a,date,proj,action='account'){const v=balance(state,a.id,date||today(),proj);const isDebt=debt(a);return `<button class="wallet w-${walletTheme(a)}" data-action="${action}" data-id="${esc(a.id)}"><span class="wn">${esc(a.name)}</span><span style="display:flex;flex-direction:column"><span class="wv num">${isDebt?fmt(Math.abs(Math.min(0,v)),a.currency):fmt(v,a.currency)}</span><span class="ws">${isDebt?(a.limit?'debes · límite '+fmt0(a.limit,a.currency):'debes'):types[a.type]+' · '+a.currency}</span></span></button>`;}
function freqText(r){const e=r.every||1,u=r.unit||'months';const n={days:['día','días'],weeks:['semana','semanas'],months:['mes','meses'],years:['año','años']}[u];return e===1?'Cada '+n[0]:`Cada ${e} ${n[1]}`;}

/* ========================================================================
   Pantallas
   ======================================================================== */
function vInsights(){
  ensureCurrency();const cur=ui.currency,T=today(),m=T.slice(0,7),L=liquidAccounts(cur),end=monthDate(m+'-01',0,31);
  const now=sumBal(L,T,false),close=sumBal(L,end,true),{inc,exp}=monthTotalsCur(m,cur),h=health(cur),defs=indicatorDefs(h,cur);
  const owed=active().filter(a=>a.currency===cur&&debt(a)).reduce((s,a)=>s+Math.max(0,-balance(state,a.id,T)),0);
  const cats=categoriesFor(m,cur),totalCat=cats.reduce((s,c)=>s+c[1],0),top=cats.slice(0,3),rest=totalCat-top.reduce((s,c)=>s+c[1],0);
  const colors=['var(--accent)','#C9603A','#8E4430','#3A3B45'];const catRows=[...top,...(rest>0?[['Otras',rest]]:[])];
  const weakest=defs.filter(d=>d.s).sort((a,b)=>h.pts[a.k](h.I[a.k])-h.pts[b.k](h.I[b.k]))[0];
  const prevRef=monthDate(T,-1,31),prev=health(cur,prevRef),since='desde el '+shortDate(prevRef);const diff=h.score!==null&&prev.score!==null?h.score-prev.score:null;
  const todayTx=state.transactions.filter(t=>t.date===T&&t.status==='done').slice(0,4);
  const next=state.transactions.filter(t=>t.status==='pending'&&t.date>=T&&t.date<=addDays(T,30)).sort((a,b)=>a.date.localeCompare(b.date));
  const overdue=state.transactions.filter(t=>t.status==='pending'&&t.date<T).length;
  const tiles=[defs[0],defs[1],defs[2]];
  const proximosHtml=`<div style="display:flex;flex-direction:column;gap:8px"><div class="row-between" style="padding:0 4px"><h2>Próximos 30 días</h2><span class="small">${next.length} programados</span></div>
    ${next.length?`<div class="list" id="proximos-list">${next.slice(0,5).map(t=>swipeRow(`<div class="tx" style="gap:12px"><span style="width:44px;display:flex;flex-direction:column;align-items:center;flex-shrink:0"><span style="font-size:12px;font-weight:700;color:#FFB18A">${new Date(t.date+'T12:00:00').toLocaleDateString('es-MX',{month:'short'}).replace('.','').toUpperCase()}</span><span style="font-size:20px;font-weight:700;line-height:1.1">${Number(t.date.slice(8))}</span></span><button data-action="edit" data-id="${esc(t.id)}" class="mid-col" style="display:flex;flex-direction:column;flex:1;min-width:0;text-align:left;min-height:44px;justify-content:center"><span class="t1">${esc(t.concept)}</span><span class="t2">${txSub(t)}</span></button>${confirmBtn(t,'')}</div>`,t,esc)).join('')}</div>${next.length>5?`<button class="link" data-action="pending-view" style="align-self:center">Ver los ${next.length} programados</button>`:''}`:'<div class="list"><p class="empty">Nada programado en los próximos 30 días.</p></div>'}
  </div>`;
  const hoyHtml=todayTx.length?`<div style="display:flex;flex-direction:column;gap:8px"><h2 style="padding:0 4px">Hoy</h2><div class="list">${todayTx.map(txRow).join('')}</div></div>`:'';
  return `
  <div class="head"><div><div class="kicker">Tu dinero, día a día</div><h1>Insights</h1></div>
  <div style="display:flex;gap:8px">${currencies().length>1?`<button class="pill" data-action="currency" aria-label="Cambiar moneda, actual ${cur}">${cur}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`:`<span class="pill" aria-label="Moneda ${cur}">${cur}</span>`}</div></div>
  ${!SUPABASE_URL||!user?`<button class="banner" data-action="tab" data-tab="ajustes" style="text-align:left"><span style="flex:1"><span style="display:block;font-size:15px;font-weight:600">${!SUPABASE_URL?'Vista de ejemplo':'Inicia sesión para ver tus datos'}</span><span class="small">${!SUPABASE_URL?'Los cambios no se guardan en este modo.':'Tus cuentas y movimientos están guardados en la nube.'}</span></span><span style="color:var(--accent);font-size:15px;font-weight:600">Ajustes</span></button>`:''}
  <div class="card" style="gap:12px">
    <div style="display:flex;flex-direction:column;gap:2px"><span class="label" style="font-size:15px">Disponible hoy</span><span class="big num">${fmt(now,cur)}</span><span style="font-size:15px;color:var(--soft)">Al cierre de ${monthName(m).toLowerCase()}: <strong class="num" style="color:var(--text)">${fmt(close,cur)}</strong></span></div>
    ${lineChart(monthSeries(m,cur),T)}
    <div class="axis"><span>1 ${monthName(m).slice(0,3).toLowerCase()}</span><span style="font-weight:600;color:var(--text)">Hoy</span><span>${end.slice(8)} ${monthName(m).slice(0,3).toLowerCase()}</span></div>
  </div>
  <div class="grid2">
    <div class="card tight"><span class="label">Ingresos del mes</span><span class="mid num pos">${signed0(inc,cur)}</span></div>
    <div class="card tight"><span class="label">Gastos del mes</span><span class="mid num neg">${exp?'−'+fmt0(exp,cur):fmt0(0,cur)}</span></div>
  </div>
  <div class="row2">
  <button class="card" data-action="salud" style="text-align:left;width:100%" aria-label="Abrir salud financiera">
    <span class="row-between" style="width:100%"><span style="font-size:20px;font-weight:700">Salud financiera</span><span style="font-size:16px;color:var(--accent);font-weight:500">Ver detalle ›</span></span>
    <span style="display:flex;align-items:center;gap:18px">${ring(h.score,112,12)}<span style="display:flex;flex-direction:column;gap:6px"><span style="font-size:20px;font-weight:700;color:${scoreColor(h.score)}">${scoreLabel(h.score)}</span><span style="font-size:15px;line-height:1.4;color:var(--soft)">${diff===null?'':diff>0?`Subiste ${diff} puntos ${since}. `:diff<0?`Bajaste ${-diff} puntos ${since}. `:`Sin cambios ${since}. `}${weakest?`Lo que más te resta: ${weakest.name.toLowerCase()}.`:''}</span></span></span>
    <span class="grid2" style="width:100%;gap:10px">${tiles.map(d=>`<span style="background:var(--surface2);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px"><span class="small">${d.name}</span><span style="font-size:22px;font-weight:700" class="num">${d.value}</span><span class="small" style="font-weight:600;color:${d.s?(d.s[1]==='st-ok'?'var(--pos)':d.s[1]==='st-warn'?'var(--warn)':'var(--neg)'):'var(--muted)'}">${d.s?d.s[0]:'Sin datos'}</span></span>`).join('')}<span style="background:var(--surface2);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px"><span class="small">Patrimonio neto</span><span style="font-size:22px;font-weight:700" class="num">${fmt0(h.net,cur)}</span><span class="small" style="font-weight:600;color:${h.net-prev.net>=0?'var(--pos)':'var(--neg)'}">${signed0(h.net-prev.net,cur)} ${since}</span></span></span>
  </button>
  <div class="card"><div class="row-between"><h2>Gastos por categoría</h2><button class="link" data-action="tab" data-tab="movimientos">Ver todo</button></div>
    ${totalCat?`<div class="segbar">${catRows.map((c,i)=>`<div class="gw" style="--w:${(c[1]/totalCat*100).toFixed(1)}%;background:${colors[i]}"></div>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:12px">${catRows.map((c,i)=>`<div style="display:flex;align-items:center;gap:12px"><span class="dot" style="background:${colors[i]}"></span><span style="font-size:16px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c[0])}</span><span class="small">${Math.round(c[1]/totalCat*100)}%</span><span class="num" style="font-size:16px;font-weight:600;min-width:80px;text-align:right">${fmt0(c[1],cur)}</span></div>`).join('')}</div>`:'<p class="empty">Aún no hay gastos este mes.</p>'}
  </div>
  </div>
  ${overdue?`<button type="button" class="banner" data-action="overdue" style="border-color:#FFCF6A55;background:#241C10;width:100%;text-align:left;cursor:pointer"><span style="flex:1;font-size:15px;color:#F3E3C0">Tienes <strong>${overdue}</strong> ${overdue===1?'movimiento programado vencido':'movimientos programados vencidos'} sin confirmar.</span><span class="btn sm" aria-hidden="true">Revisar</span></button>`:''}
  ${hoyHtml?`<div class="row2 even">${proximosHtml}${hoyHtml}</div>`:proximosHtml}
  <div style="display:flex;flex-direction:column;gap:10px"><div class="row-between" style="padding:0 4px"><h2>Explorar mis cuentas</h2></div>${accountGroupSections(visibleAccounts(state,active()),a=>walletCard(a))}</div>`;
}

function vMovimientos(){
  ensureCurrency();const m=ui.month;const segIdx=ui.seg==='done'?0:1;
  const rows=state.transactions.filter(t=>t.date.startsWith(m));const nd=rows.filter(t=>t.status==='done').length,np=rows.filter(t=>t.status==='pending').length;
  return `
  <div class="head"><div><div class="kicker">${monthYear(m)}</div><h1>Movimientos</h1></div>
  <div style="display:flex;gap:8px"><button class="icon-btn" data-action="month" data-d="-1" aria-label="Mes anterior">‹</button><button class="icon-btn" data-action="month" data-d="1" aria-label="Mes siguiente">›</button></div></div>
  <div class="seg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><span class="thumb" style="width:calc(50% - 3px);transform:translateX(${segIdx*100}%)"></span><button data-action="seg" data-v="done" aria-pressed="${ui.seg==='done'}">Realizados · ${nd}</button><button data-action="seg" data-v="pending" aria-pressed="${ui.seg==='pending'}">Programados · ${np}</button></div>
  <label class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A9BA6" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Buscar movimientos</span><input id="q" type="search" placeholder="Buscar concepto, categoría o negocio" value="${esc(ui.q)}"></label>
  <div class="chips">${[['all','Todas']].concat(visibleAccounts(state,active()).map(a=>[a.id,a.name])).map(([id,n])=>`<button class="chip" data-action="acct" data-id="${esc(id)}" aria-pressed="${ui.acct===id}">${esc(n)}</button>`).join('')}</div>
  <div id="mov-list" style="display:flex;flex-direction:column;gap:14px">${movList()}</div>`;
}
function movList(){
  const m=ui.month,q=String(ui.q||'').trim().toLowerCase();
  let rows=state.transactions.map((t,index)=>({...t,index})).filter(t=>t.date.startsWith(m)&&t.status===ui.seg);
  if(ui.acct!=='all')rows=rows.filter(t=>t.from===ui.acct||t.to===ui.acct);
  if(q)rows=rows.filter(t=>[t.concept,t.category,t.business,t.notes,name(t.from),name(t.to)].filter(Boolean).join(' ').toLowerCase().includes(q));
  rows.sort((a,b)=>ui.seg==='done'?chronological(b,a):chronological(a,b));
  if(!rows.length)return `<div class="list"><p class="empty">${q?'Ningún movimiento coincide con tu búsqueda.':ui.seg==='done'?'Sin movimientos realizados en este mes.':'Sin movimientos programados en este mes.'}</p></div>`;
  const groups=new Map();for(const t of rows){if(!groups.has(t.date))groups.set(t.date,[]);groups.get(t.date).push(t);}
  const cur=ui.acct!=='all'?account(ui.acct)?.currency:null;
  return [...groups].map(([d,list])=>{const c=cur||ui.currency;const n=list.reduce((s,t)=>{if(txCur(t)!==c)return s;if(ui.acct!=='all')return s+(t.to===ui.acct?(t.received??t.amount):0)-(t.from===ui.acct?t.amount:0);return s+(t.kind==='income'?(t.received??t.amount):['expense','msi'].includes(t.kind)?-t.amount:0);},0);const tot=n?signed(n,c):'';
    return `<div style="display:flex;flex-direction:column;gap:8px"><div class="group-h"><span>${dayLabel(d)}</span><span class="num">${tot}</span></div><div class="list">${list.map(txRow).join('')}</div></div>`;}).join('');
}

function vCalendario(){
  ensureCurrency();const m=ui.calMonth,T=today(),first=m+'-01',offset=(new Date(first+'T12:00:00').getDay()+6)%7,days=Number(monthDate(first,0,31).slice(8));
  const has=new Set(state.transactions.filter(t=>t.date.startsWith(m)).map(t=>t.date));
  const cur=ui.currency,L=liquidAccounts(cur),h=health(cur);
  const from=m===T.slice(0,7)?T:first,endM=monthDate(first,0,31);let low=null,lowD=null;
  if(from<=endM){for(let d=from;d<=endM;d=addDays(d,1)){const v=sumBal(L,d,d>T);if(low===null||v<low){low=v;lowD=d;}}}
  const daily=h.exp/30.44,now=sumBal(L,T,false),lasts=daily>0?Math.floor(now/daily):null;
  const sel=ui.selDay.startsWith(m)?ui.selDay:(m===T.slice(0,7)?T:first);ui.selDay=sel;
  const dayTx=state.transactions.map((t,index)=>({...t,index})).filter(t=>t.date===sel).sort((a,b)=>a.status===b.status?chronological(a,b):a.status==='done'?-1:1);
  const proj=sel>T;
  return `
  <div class="head"><div><div class="kicker">Calendario y saldos</div><h1>${monthYear(m)}</h1></div>
  <div style="display:flex;gap:8px"><button class="icon-btn" data-action="cal-month" data-d="-1" aria-label="Mes anterior">‹</button><button class="icon-btn" data-action="cal-month" data-d="1" aria-label="Mes siguiente">›</button></div></div>
  <div class="card" style="padding:12px 10px 10px;gap:4px"><div class="cal">${['L','M','M','J','V','S','D'].map(d=>`<span class="wd">${d}</span>`).join('')}${'<span></span>'.repeat(offset)}${Array.from({length:days},(_,i)=>{const d=m+'-'+String(i+1).padStart(2,'0');return `<button data-action="day" data-d="${d}" class="${has.has(d)?'has':''} ${d<T?'past':''} ${d===T?'today':''} ${d===sel?'sel':''}" aria-label="${i+1} de ${monthName(m).toLowerCase()}${has.has(d)?', con movimientos':''}" aria-pressed="${d===sel}"><span>${i+1}</span><span class="d"></span></button>`;}).join('')}</div></div>
  <div class="grid2">
    <div class="card tight" style="${low!==null&&low<now*.5?'background:#241C10;border-color:#FFCF6A40':''}"><span class="label">Saldo más bajo</span><span class="mid num ${low!==null&&low<now*.5?'warn':''}">${low===null?'—':fmt0(low,cur)}</span><span class="small">${lowD?'el '+shortDate(lowD):'mes pasado'}</span></div>
    <div class="card tight"><span class="label">Gasto diario prom.</span><span class="mid num">${daily?fmt0(daily,cur):'—'}</span><span class="small">${lasts===null?'sin gastos aún':'te alcanza '+lasts+' días'}</span></div>
  </div>
  <div class="row-between" style="padding:0 4px;align-items:baseline"><h2>Saldos · ${dayLabel(sel).toLowerCase()==='hoy'?'hoy':dayLabel(sel).toLowerCase()}</h2><span class="small">${proj?'proyectado':'real'}</span></div>
  ${accountGroupSections(visibleAccounts(state,active(),T),a=>walletCard(a,sel,proj))}
  <h2 style="padding:0 4px">Movimientos del día</h2>
  <div class="list">${dayTx.length?dayTx.map(txRow).join(''):'<p class="empty">Un día sin movimientos.</p>'}</div>`;
}

function vAjustes(){
  const rulesE=state.rules.filter(r=>(r.kind||'expense')!=='income'),rulesI=state.rules.filter(r=>r.kind==='income');
  return `
  <div class="head"><div><div class="kicker">Configuración</div><h1>Ajustes</h1></div></div>
  <div class="card" id="account-card"><div style="display:flex;flex-direction:column;gap:4px"><h2>Mi cuenta</h2><span class="small" style="line-height:1.5">${esc(connectionText||(SUPABASE_URL?'Inicia sesión para ver tus datos.':'Vista de ejemplo: los cambios no se guardan.'))}</span></div><button class="btn" data-action="login">${esc(loginText)}</button><button class="btn ghost" data-action="tutorial">Ver tutorial</button></div>
  ${currencies().length>1?`<div style="display:flex;flex-direction:column;gap:8px"><h3 style="padding:0 4px;color:var(--muted);font-size:14px">Moneda de los indicadores</h3><div class="seg" style="grid-template-columns:repeat(${currencies().length},minmax(0,1fr))"><span class="thumb" style="width:calc(${100/currencies().length}% - ${6/currencies().length}px);transform:translateX(${currencies().indexOf(ui.currency)*100}%)"></span>${currencies().map(c=>`<button data-action="set-cur" data-v="${c}" aria-pressed="${c===ui.currency}">${c}</button>`).join('')}</div></div>`:''}
  <div style="display:flex;flex-direction:column;gap:10px"><div class="row-between" style="padding:0 4px"><h2>Mis cuentas</h2><button class="link" id="add-account" data-action="add-account">＋ Agregar</button></div>${accountGroupSections(orderedAccounts(state.accounts),a=>walletCard(a,today(),false,'account-edit'),' style="flex-wrap:wrap;overflow:visible"')}${!state.accounts.length?'<p class="empty">Comienza agregando una cuenta y su saldo actual.</p>':''}</div>
  <div class="row2 even">${[['Costos recurrentes',rulesE,'rule'],['Ingresos recurrentes',rulesI,'income-rule']].map(([title,list,kindKey])=>`<div style="display:flex;flex-direction:column;gap:8px"><div class="row-between" style="padding:0 4px"><h3 style="color:var(--muted);font-size:14px">${title}</h3><button class="link" id="${kindKey==='income-rule'?'add-income-rule':'add-rule'}" data-action="${kindKey==='income-rule'?'add-income-rule':'add-rule'}">＋ Agregar</button></div><div class="list">${list.length?list.map(r=>`<div class="settings-row"><span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.concept)}</span><span class="small">${freqText(r)} · ${esc(name(r.from||r.to))}</span></span><span style="display:flex;align-items:center;gap:8px"><span class="v num" style="color:${r.kind==='income'?'var(--pos)':'var(--text)'};font-weight:600">${fmt(r.amount,account(r.from||r.to)?.currency||'MXN')}</span>${iconButton('edit','rule-edit',r.id,'Editar '+r.concept,esc)}${iconButton('delete','rule-delete',r.id,'Eliminar '+r.concept,esc)}</span></div>`).join(''):'<p class="empty">Ninguno registrado.</p>'}</div></div>`).join('')}</div>
  <div style="display:flex;flex-direction:column;gap:10px"><div class="row-between" style="padding:0 4px"><h2>Nóminas</h2><button class="link" data-action="payroll">＋ Registrar</button></div><div class="list">${(state.payrolls||[]).length?(state.payrolls||[]).map(p=>{const bankTx=state.transactions.find(t=>t.payrollId===p.id&&(t.payrollPart==='bank'||(!t.payrollPart&&!t.concept.startsWith('Vales de despensa'))));return `<div class="settings-row"><span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:16px">${esc(p.company)} · ${esc(p.period)}</span><span class="small">Neto bancario ${fmt(bankTx?.amount??p.bankNet??p.totals.net)}</span></span><span style="display:flex;align-items:center;gap:8px"><span class="v num">${fmt(p.totals.net)}</span>${iconButton('edit','payroll-edit',p.id,'Editar nómina de '+p.company,esc)}</span></div>`;}).join(''):'<p class="empty">Todavía no hay nóminas registradas.</p>'}</div><button class="link" data-action="import-payroll">Importar sugerencias de nómina</button></div>
  <div style="display:flex;flex-direction:column;gap:10px"><h2 style="padding:0 4px">Importar pagos programados</h2><p class="subtle" style="padding:0 4px">Carga un CSV con fechas desde hoy, sin límite de año. Revisa la vista previa antes de guardar.</p><div class="grid2"><button class="btn ghost" data-action="csv-template">Descargar plantilla</button><button class="btn ghost" data-action="csv-import">Cargar CSV</button></div><details class="card"><summary style="font-size:15px;font-weight:600">Ver formato y categorías</summary><p class="subtle">Columnas: id (opcional), fecha, tipo, concepto, cuenta_origen, cuenta_destino, monto, categoria, negocio, notas, monto_recibido. Tipos: pago, gasto, ingreso o transferencia. Fechas AAAA-MM-DD o DD/MM/AAAA.</p><p class="subtle">${CATEGORIES.map(esc).join(' · ')}</p></details></div>
  <button class="btn ghost" data-action="export">Exportar respaldo JSON</button>`;
}

/* ========================================================================
   Estrategia: panorama con 3 formas de decidir hacia dónde mandar el dinero
   (recomendaciones, metas y un simulador de pagos extra), elegibles por el
   usuario desde un segmentador.
   ======================================================================== */
function debtAccounts(cur){return active().filter(a=>a.currency===cur&&debt(a)).map(a=>({a,p:payoff(state,a.id)})).filter(x=>x.p&&x.p.outstanding>0);}
function strategyOrder(list,mode){
  const sorted=[...list];
  if(mode==='avalanche')sorted.sort((x,y)=>(y.a.limit?y.p.outstanding/y.a.limit:0)-(x.a.limit?x.p.outstanding/x.a.limit:0));
  else sorted.sort((x,y)=>x.p.outstanding-y.p.outstanding);
  return sorted;
}
function vRecomendaciones(){
  const cur=ui.currency,h=health(cur),defs=indicatorDefs(h,cur);
  const weakest=defs.filter(d=>d.s).sort((a,b)=>h.pts[a.k](h.I[a.k])-h.pts[b.k](h.I[b.k]))[0];
  const list=strategyOrder(debtAccounts(cur),ui.priority);
  return `
  <div class="card"><h2>Lo más urgente</h2>${weakest?`<p class="subtle">Tu indicador más débil es <strong>${esc(weakest.name)}</strong> (${weakest.value}, ${esc(weakest.goal).toLowerCase()}). ${esc(weakest.desc)}</p>`:'<p class="subtle">Registra más movimientos realizados para calcular tu salud financiera y recibir recomendaciones.</p>'}</div>
  <div class="card"><h2>Orden para pagar tus deudas</h2>
  <div class="seg" style="grid-template-columns:repeat(2,minmax(0,1fr))"><span class="thumb" style="width:calc(50% - 3px);transform:translateX(${ui.priority==='avalanche'?100:0}%)"></span><button data-action="priority" data-v="snowball" aria-pressed="${ui.priority==='snowball'}">Bola de nieve</button><button data-action="priority" data-v="avalanche" aria-pressed="${ui.priority==='avalanche'}">Avalancha</button></div>
  <p class="subtle">${ui.priority==='snowball'?'Primero la deuda con el saldo más pequeño: liquidarla rápido te da impulso.':'Primero la tarjeta con mayor porcentaje usado de su límite.'}</p>
  ${list.length?`<div class="list">${list.map((x,i)=>`<div class="settings-row"><span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:16px;font-weight:600">${i+1}. ${esc(x.a.name)}</span><span class="small">${x.a.limit?'Uso: '+pct(x.p.outstanding/x.a.limit)+' · ':''}${x.p.date?'Se liquida: '+shortDate(x.p.date):'Sin fecha programada'}</span></span><span class="v num" style="font-weight:600">${fmt0(x.p.outstanding,x.a.currency)}</span></div>`).join('')}</div>`:'<p class="empty">No tienes deudas pendientes en esta moneda.</p>'}
  </div>
  ${list.length?`<p class="subtle">Sugerencia: destina cualquier dinero extra de este mes primero a <strong>${esc(list[0].a.name)}</strong>. Cuando la liquides, suma lo que le pagabas al siguiente de la lista.</p>`:''}`;
}
function goalsList(){return state.goals||[];}
function goalProgress(g){
  const a=account(g.accountId);
  if(g.kind==='save'){const bal=a?Math.max(0,balance(state,a.id,today())):0;return {current:bal,ratio:g.target?clamp(bal/g.target,0,1):0};}
  const p=a?payoff(state,a.id):null,outstanding=p?p.outstanding:0,base=g.baseline||outstanding;
  const paid=Math.max(0,base-outstanding);return {current:outstanding,ratio:base?clamp(paid/base,0,1):(outstanding===0?1:0)};
}
function vMetas(){
  const list=goalsList();
  return `<div class="row-between" style="padding:0 4px"><h2>Tus metas</h2><button class="link" data-action="add-goal">＋ Agregar</button></div>
  ${list.length?list.map(g=>{const pr=goalProgress(g),a=account(g.accountId),cur=a?.currency||'MXN';return `<div class="card tight" style="gap:10px"><div class="row-between"><span style="font-size:16px;font-weight:600">${esc(g.name)}</span><span style="display:flex;gap:4px">${iconButton('edit','goal-edit',g.id,'Editar '+g.name,esc)}${iconButton('delete','goal-delete',g.id,'Eliminar '+g.name,esc)}</span></div><div style="height:8px;border-radius:4px;background:#2A2B34;overflow:hidden"><div style="height:100%;width:${Math.round(pr.ratio*100)}%;background:${pr.ratio>=1?'var(--pos)':'var(--accent)'}"></div></div><span class="small">${g.kind==='save'?`${fmt0(pr.current,cur)} de ${fmt0(g.target,cur)} · ${Math.round(pr.ratio*100)}%`:`Debes ${fmt0(pr.current,cur)} · ${Math.round(pr.ratio*100)}% pagado`}${g.targetDate?' · meta: '+shortDate(g.targetDate):''}</span></div>`;}).join(''):'<p class="empty">Crea una meta de ahorro o de pago de deuda para seguir tu avance.</p>'}`;
}
function vSimulador(){
  const cur=ui.currency,debts=debtAccounts(cur);
  if(!debts.length)return '<div class="card"><h2>¿Qué pasa si pago más?</h2><p class="subtle">No tienes deudas pendientes en esta moneda para simular un abono extra.</p></div>';
  return `<div class="card"><h2>¿Qué pasa si pago más?</h2><p class="subtle">Agrega un monto extra a una tarjeta o deuda y mira el efecto inmediato en el saldo. Esta app no registra tasas de interés, así que el cálculo es solo el efecto directo del abono, sin estimar intereses.</p>
  <div class="fields" style="margin-top:4px">${select('sim-account','Cuenta',Object.fromEntries(debts.map(x=>[x.a.id,x.a.name])),debts[0].a.id)}${input('sim-extra','Abono extra',0,'number','min="0" step="0.01"')}</div>
  <div id="sim-result" class="card tight" style="margin-top:10px"></div></div>`;
}
function wireEstrategia(){
  const sel=$('#s-estrategia [name=sim-account]'),inp=$('#s-estrategia [name=sim-extra]'),out=$('#sim-result');
  if(!sel||!inp||!out)return;
  const update=()=>{
    const a=account(sel.value),p=a?payoff(state,a.id):null;if(!a||!p){out.innerHTML='';return;}
    const extra=Math.round((Number(inp.value)||0)*100),newOutstanding=Math.max(0,p.outstanding-extra);
    out.innerHTML=`<span class="label">Saldo actual</span><span class="mid num">${fmt0(p.outstanding,a.currency)}</span><span class="label" style="margin-top:8px">Saldo si abonas ${fmt0(extra,a.currency)} extra</span><span class="mid num" style="color:${extra?'var(--pos)':'inherit'}">${fmt0(newOutstanding,a.currency)}</span>${a.limit?`<span class="small">Crédito disponible: de ${fmt0(a.limit-p.outstanding,a.currency)} a ${fmt0(a.limit-newOutstanding,a.currency)}</span>`:''}`;
  };
  sel.onchange=update;inp.oninput=update;update();
}
function vEstrategia(){
  const segs=[['recomendaciones','Recomendaciones'],['metas','Metas'],['simulador','Simulador']];
  const idx=Math.max(0,segs.findIndex(([k])=>k===ui.strategySeg));
  const body=ui.strategySeg==='metas'?vMetas():ui.strategySeg==='simulador'?vSimulador():vRecomendaciones();
  return `<div class="head"><div><div class="kicker">Hacia dónde mandar tu dinero</div><h1>Estrategia</h1></div></div>
  <div class="seg" style="grid-template-columns:repeat(3,minmax(0,1fr))"><span class="thumb" style="width:calc(33.333% - 2px);transform:translateX(${idx*100}%)"></span>${segs.map(([k,l])=>`<button data-action="strategy-seg" data-v="${k}" aria-pressed="${ui.strategySeg===k}" style="font-size:13px">${l}</button>`).join('')}</div>
  <div id="estrategia-body" style="display:flex;flex-direction:column;gap:14px">${body}</div>`;
}
function goalForm(existing){
  if(!state.accounts.length){accountForm();return;}
  const g=existing||{},kind=g.kind||'save';
  modal(g.id?'Editar meta':'Nueva meta',input('name','Nombre de la meta',g.name||'','text','required maxlength="80"')+select('kind','Tipo',{save:'Ahorrar un monto',payoff:'Liquidar una deuda'},kind)+select('accountId',kind==='save'?'Cuenta donde ahorras':'Deuda a liquidar',opts(a=>kind==='save'?!debt(a):debt(a)),g.accountId)+(kind==='save'?input('target','Monto meta',g.target?g.target/100:'','number','required min="0.01" step="0.01"'):'<p class="subtle">El avance se calcula desde el saldo que debes hoy hasta $0.</p>')+input('targetDate','Fecha meta (opcional)',g.targetDate||'','date',''),async f=>{
    const next=structuredClone(state);next.goals??=[];
    const a=account(f.accountId);if(!a)throw Error('Selecciona una cuenta válida.');
    const item={id:g.id||uid(),name:f.name,kind:f.kind,accountId:f.accountId,targetDate:f.targetDate||null};
    if(f.kind==='save'){item.target=cents(f.target);}else{const p=payoff(state,f.accountId);item.baseline=(g.kind==='payoff'&&g.accountId===f.accountId&&g.baseline)||(p?p.outstanding:0);}
    if(g.id)next.goals=next.goals.map(x=>x.id===g.id?item:x);else next.goals.push(item);
    await persist(next);
  });
  const kSel=$('[name=kind]');kSel.onchange=()=>{const draft=Object.fromEntries(new FormData($('#form')));goalForm({...g,kind:draft.kind,name:draft.name});};
}
function deleteGoalForm(g){if(!g)return;modal('Eliminar meta',`<p>Vas a eliminar la meta <strong>${esc(g.name)}</strong>.</p>`,async()=>{const next=structuredClone(state);next.goals=(next.goals||[]).filter(x=>x.id!==g.id);await persist(next);});}

function vSalud(){
  const cur=ui.currency,T=today(),h=health(cur),defs=indicatorDefs(h,cur);
  const refs=[];for(let i=5;i>=1;i--)refs.push(monthDate(T,-i,31));refs.push(T);
  const hist=refs.map(r=>({r,h:health(cur,r)}));const maxNet=Math.max(1,...hist.map(x=>Math.abs(x.h.net)));
  const weakest=defs.filter(d=>d.s).sort((a,b)=>h.pts[a.k](h.I[a.k])-h.pts[b.k](h.I[b.k]))[0];
  const strong=defs.filter(d=>d.s&&d.s[1]==='st-ok').map(d=>d.name.toLowerCase());
  const okN=defs.filter(d=>d.s&&d.s[1]==='st-ok').length,warnN=defs.filter(d=>d.s&&d.s[1]!=='st-ok').length;
  const mlabel=r=>cap(new Date(r+'T12:00:00').toLocaleDateString('es-MX',{month:'short'}).replace('.',''));
  return `
  <div style="display:flex;flex-direction:column;gap:2px;padding:0 4px"><div class="kicker">${monthYear(T.slice(0,7))} · ${cur}</div><h1>Salud financiera</h1></div>
  <div class="card" style="gap:18px">
    <div style="display:flex;align-items:center;gap:20px">${ring(h.score,136,14)}<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:24px;font-weight:700;color:${scoreColor(h.score)}">${scoreLabel(h.score)}</span><span style="font-size:15px;line-height:1.4;color:var(--soft)">${strong.length?cap(strong.slice(0,2).join(' y '))+' van bien. ':''}${weakest&&weakest.s[1]!=='st-ok'?'Mejorar tu '+weakest.name.toLowerCase()+' es lo que más te haría avanzar.':''}</span></div></div>
    <div style="display:flex;flex-direction:column;gap:10px"><span class="label">Evolución del puntaje</span>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:end;height:76px">${hist.map((x,i)=>`<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:76px;gap:4px"><span class="small" style="font-size:12px">${x.h.score??''}</span><div style="width:100%;border-radius:8px;height:${Math.max(6,(x.h.score||0)*.56)}px;background:${i===5?scoreColor(x.h.score):'#2E3A36'}"></div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;text-align:center;font-size:13px;color:var(--muted)">${hist.map((x,i)=>`<span style="${i===5?'font-weight:700;color:var(--text)':''}">${i===5?'Hoy':mlabel(x.r)}</span>`).join('')}</div>
    </div>
  </div>
  <div class="row-between" style="padding:4px 4px 0;align-items:baseline"><h2 style="font-size:22px">Indicadores</h2><span class="small">${okN} bien · ${warnN} por mejorar</span></div>
  ${defs.map(d=>`<div class="card" style="gap:12px;border-radius:24px;padding:18px"><div class="row-between"><h3>${d.name}</h3><span class="status ${d.s?d.s[1]:'st-na'}">${d.s?d.s[0]:'Sin datos'}</span></div><div class="row-between" style="align-items:baseline"><span class="num" style="font-size:30px;font-weight:700;letter-spacing:-.8px">${d.value}</span><span class="small" style="font-size:14px;text-align:right">${d.goal}</span></div><div class="gauge"><div class="zones">${d.zones.map(z=>`<div style="width:${z[0]}%;background:${z[1]}"></div>`).join('')}</div>${d.s?`<span class="marker" style="--m:${d.m.toFixed(1)}%"></span>`:''}</div><p style="margin:0;font-size:15px;line-height:1.45;color:var(--soft)">${d.desc}</p></div>`).join('')}
  <div class="card" style="gap:12px;border-radius:24px;padding:18px"><div class="row-between"><h3>Patrimonio neto</h3><span class="status ${hist[5].h.net>=hist[4].h.net?'st-ok':'st-warn'}">${hist[5].h.net>=hist[4].h.net?'Creciendo':'Bajando'}</span></div><div class="row-between" style="align-items:baseline"><span class="num" style="font-size:30px;font-weight:700;letter-spacing:-.8px">${fmt0(h.net,cur)}</span><span class="num" style="font-size:15px;font-weight:600;color:${h.net-hist[4].h.net>=0?'var(--pos)':'var(--neg)'}">${signed0(h.net-hist[4].h.net,cur)} vs ${mlabel(refs[4]).toLowerCase()}</span></div>
    <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:end;height:64px">${hist.map((x,i)=>`<div style="border-radius:8px;height:${Math.max(6,Math.abs(x.h.net)/maxNet*62).toFixed(0)}px;background:${x.h.net<0?'#6B2E22':i===5?'var(--accent)':'#3A3B45'}"></div>`).join('')}</div>
    <p style="margin:0;font-size:15px;line-height:1.45;color:var(--soft)">Lo que tienes en todas tus cuentas en ${cur} menos lo que debes en tarjetas y deudas.</p></div>
  <details class="card" style="gap:10px"><summary style="font-size:16px;font-weight:600">Cómo se calcula</summary><p style="margin:0;font-size:15px;line-height:1.5;color:var(--soft)">Se usan tus movimientos realizados de los últimos 90 días, promediados por mes. El fondo de emergencia toma débito, efectivo, vales y ahorro. El uso de crédito compara lo que debes contra el límite de tus tarjetas. Los gastos fijos salen de tus costos recurrentes activos. El puntaje pondera ahorro (25%), fondo de emergencia (25%), crédito (20%), deuda (15%) y gastos fijos (15%); los indicadores sin datos no cuentan.</p></details>`;
}

function vAccount(id){
  const a=account(id);if(!a)return '<p class="empty">Esta cuenta ya no existe.</p>';
  const T=today(),v=balance(state,id,T),vp=balance(state,id,addDays(T,30),true),isDebt=debt(a);
  const days=Array.from({length:31},(_,i)=>{const d=addDays(T,i);return {d,v:d<a.asOf?null:balance(state,id,d,true)};}).filter(x=>x.v!==null);
  const po=isDebt?payoff(state,id):null;
  const events=[];for(let off=0;off<=1;off++){if(a.type==='credit'&&a.cut)events.push({d:cardDate(T,off,a.cut),l:'Fecha de corte'});if(isDebt&&a.pay)events.push({d:cardDate(T,off,a.pay),l:'Fecha de pago'});}
  for(const t of state.transactions)if(t.status==='pending'&&(t.from===id||t.to===id)&&t.date>=T&&t.date<=addDays(T,30))events.push({d:t.date,l:t.concept,amt:(t.to===id?(t.received??t.amount):0)-(t.from===id?t.amount:0),id:t.id});
  events.sort((x,y)=>x.d.localeCompare(y.d));const evs=events.filter(e=>e.d>=T&&e.d<=addDays(T,30)).slice(0,6);
  let chart='';if(days.length>1)chart=lineChart(days.map(x=>({d:x.d,v:x.v})),addDays(T,-1),326,110)+`<div class="axis"><span>Hoy</span><span>+30 d</span></div>`;
  const hist=accountHistory(state,id).filter(t=>t.actual!==null).reverse();
  return `
  <div class="wallet w-${walletTheme(a)}" style="width:100%;min-height:170px;padding:20px;border-radius:28px;cursor:default"><span style="display:flex;justify-content:space-between;gap:10px"><span style="font-size:15px;font-weight:600;opacity:.9">${esc(a.name)}</span><span style="font-size:13px;opacity:.85">${types[a.type]} · ${a.currency}</span></span><span style="display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;opacity:.85">${isDebt?'Debes hoy':'Saldo hoy'}</span><span class="num" style="font-size:36px;font-weight:700;letter-spacing:-1px">${fmt(isDebt?Math.abs(Math.min(0,v)):v,a.currency)}</span></span></div>
  <div class="grid2">
    ${isDebt?`<div class="card tight"><span class="label">Crédito disponible</span><span class="mid num">${a.limit?fmt0(a.limit+v,a.currency):'—'}</span><span class="small">${a.limit?'de '+fmt0(a.limit,a.currency):'sin límite registrado'}</span></div><div class="card tight"><span class="label">Se liquida</span><span class="mid">${po&&po.date?shortDate(po.date):po&&po.outstanding===0?'Al corriente':'Sin fecha'}</span><span class="small">${po&&po.date?'con los pagos programados':'faltan pagos por programar'}</span></div>`:`<div class="card tight"><span class="label">En 30 días</span><span class="mid num">${fmt0(vp,a.currency)}</span><span class="small">proyectado</span></div><div class="card tight"><span class="label">Cambio</span><span class="mid num ${vp-v>=0?'pos':'neg'}">${signed0(vp-v,a.currency)}</span><span class="small">por programados</span></div>`}
  </div>
  ${isDebt&&(a.cut||a.pay)?`<div class="card tight" style="flex-direction:row;justify-content:space-around;text-align:center"><span><span class="label" style="display:block">Corte</span><span class="mid">día ${a.cut||'—'}</span></span><span><span class="label" style="display:block">Pago</span><span class="mid">día ${a.pay||'—'}</span></span></div>`:''}
  <div class="card"><h2>Próximos 30 días</h2>${chart||'<p class="empty">Sin saldo inicial en este periodo.</p>'}${evs.length?`<div style="display:flex;flex-direction:column">${evs.map(e=>{const row=`<div class="settings-row" style="min-height:48px">${e.id?`<button type="button" class="mid-col" style="display:flex;flex-direction:column;min-width:0;text-align:left" data-action="edit" data-id="${esc(e.id)}">`:'<span style="display:flex;flex-direction:column;min-width:0">'}<span style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.l)}</span><span class="small">${dayLabel(e.d)}</span>${e.id?'</button>':'</span>'}${e.amt!==undefined?`<span class="num" style="font-size:15px;font-weight:600;color:${e.amt>=0?'var(--pos)':'var(--text)'}">${signed(e.amt,a.currency)}</span>`:''}</div>`;return e.id?swipeRow(row,{id:e.id,concept:e.l},esc):row;}).join('')}</div>`:''}</div>
  <div style="display:flex;flex-direction:column;gap:8px"><div class="row-between" style="padding:0 4px"><h2>Historial</h2><span class="small">saldo tras cada movimiento</span></div><div class="list">${hist.length?hist.map(t=>swipeRow(`<div class="tx" style="padding-right:0"><button class="tx" style="padding:0;border:0;flex:1;min-width:0" data-action="edit" data-id="${esc(t.id)}">${txIcon(t)}<span class="mid-col"><span class="t1">${esc(t.concept)}</span><span class="t2">${dayLabel(t.date)}${t.status==='pending'?' · programado':''}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end"><span class="amt num ${t.change>=0?'pos':'neg'}">${signed(t.change,a.currency)}</span><span class="small num">${fmt(t.status==='done'?t.actual:t.projected,a.currency)}</span></span></button></div>`,t,esc)).join(''):'<p class="empty">Sin movimientos todavía.</p>'}</div></div>
  <button class="btn ghost" data-action="account-edit" data-id="${esc(a.id)}">Editar cuenta</button>`;
}

/* ========================================================================
   Hoja (modal genérico): campos de formulario — misma lógica de datos que antes
   ======================================================================== */
const input=(key,label,value='',type='text',extra='')=>`<label>${label}<input name="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;

const select=(key,label,options,value)=>`<label>${label}<select name="${key}">${Object.entries(options).map(([k,v])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;

const categoryOptions=()=>CATEGORIES;
const categoryField=(value='')=>select('category','Categoría',Object.fromEntries(categoryOptions().map(c=>[c,c])),canonicalCategory(value));
function checkCategory(value){if(!categoryOptions().includes(value))throw Error('Selecciona una categoría de la lista.');}
function businessField(value=''){const businesses=[...new Set([...state.transactions,...state.rules].map(t=>t.business?.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));return input('business','Negocio (selecciona o escribe uno nuevo)',value||'','text','maxlength="100" list="business-options"')+`<datalist id="business-options">${businesses.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`;}
const opts=(predicate=()=>true)=>Object.fromEntries(state.accounts.filter(a=>!a.archived&&predicate(a)).map(a=>[a.id,a.name+' · '+a.currency]));

function modal(title,html,save){$('#modal-title').textContent=title;$('#save').textContent=title.startsWith('Eliminar')?'Eliminar':'Guardar';$('#fields').innerHTML=html;enhanceMoneyInputs($('#fields'));$('#error').textContent='';$('#form').onsubmit=async e=>{e.preventDefault();$('#fields').querySelectorAll('.money-entry').forEach(el=>el.dispatchEvent(new Event('blur')));if(!e.target.reportValidity())return;$('#save').disabled=true;try{const after=await save(Object.fromEntries(new FormData(e.target)));closeModalSheet();if(typeof after==='function')after();}catch(e){$('#error').textContent=e.message;}finally{$('#save').disabled=false;}};openModalSheet();}

const cents=s=>{const n=Number(s);if(!Number.isFinite(n)||n<0)throw Error('Revisa el importe');return Math.round(n*100);};

function transactionForm(t={},confirming=false){if(!state.accounts.length){accountForm();return;}let finalizeExchange;const kind=t.kind||'expense',dual=['transfer','payment'].includes(kind);const currentSource=t.id&&kind==='msi'?(state.transactions.find(x=>x.parent===t.id&&x.status==='pending')||state.transactions.find(x=>x.parent===t.id))?.from||'':'';modal(confirming?'Confirmar movimiento':t.id?'Editar movimiento':'Nuevo movimiento',(t.paymentAllocation?'<p class="subtle">Este gasto ya se sumó a un pago programado. Si cambias su importe o cuenta, ajusta también ese pago.</p>':'')+select('kind','Tipo',kinds,kind)+input('concept','Concepto',t.concept||'','text','required maxlength="150"')+categoryField(t.category)+businessField(t.business)+input('notes','Notas de este movimiento',t.notes||'','text','maxlength="500"')+(t.id&&t.parent&&t.status==='pending'&&!confirming?select('scope','Aplicar cambios a',{one:'Solo este movimiento',future:'Este y siguientes pendientes de la recurrencia'},'one'):'')+input('date','Fecha',confirming?today():(t.date||today()),'date','required')+select('from',kind==='income'?'Cuenta de ingreso':'Cuenta de origen',opts(a=>kind!=='msi'||debt(a)),t.from||t.to)+ (dual?select('to','Cuenta destino',opts(a=>kind!=='payment'||debt(a)||a.type==='receivable'),t.to):'')+input('amount','Importe',t.amount?t.amount/100:'','number','required min="0.01" step="0.01"')+(dual?input('received','Importe recibido (si cambia la moneda)',t.received?t.received/100:'','number','min="0.01" step="0.01"'):'')+(dual?exchangeFields({...t,status:confirming?'pending':t.status}):'')+select('status','Estado',{done:'Realizado',pending:'Programado'},t.status||'done')+(kind==='msi'&&!t.id?input('count','Mensualidades',6,'number','required min="2" max="60"')+input('first','Primer pago',monthDate(today(),1,22),'date','required')+select('source','Cuenta desde la que pagarás',opts(a=>!debt(a))):'')+(kind==='msi'&&t.id?'<p class="subtle">Si cambias la tarjeta o la cuenta de pago, se actualizan automáticamente todas las mensualidades pendientes de esta compra. Las ya confirmadas no se tocan.</p>'+select('source','Cuenta desde la que pagas las mensualidades',opts(a=>!debt(a)),currentSource):''),async f=>{checkCategory(f.category);const next=structuredClone(state),a=account(f.from),amount=cents(f.amount);if(!amount)throw Error('El importe debe ser mayor a cero');if(dual&&f.from===f.to)throw Error('Las cuentas deben ser diferentes');if(dual&&a.currency!==account(f.to)?.currency&&!f.received)throw Error('Indica el importe recibido en la moneda destino');const item={...t,id:t.id||uid(),concept:f.concept,category:f.category||'',business:f.business||'',notes:f.notes||'',date:f.date,kind:kind,amount,status:f.status,from:kind==='income'?null:f.from,to:kind==='income'?f.from:dual?f.to:null,received:dual?(f.received?cents(f.received):amount):undefined};if(t.id && t.kind==='msi' && amount!==t.amount)throw Error('El importe de un plan MSI existente no se puede cambiar sin reestructurar sus cuotas.');if(finalizeExchange)await finalizeExchange(item);saveTransactionEdit(next,item,confirming?'one':f.scope||'one');if(kind==='msi'&&!t.id){if(f.first<f.date)throw Error('El primer pago no puede preceder a la compra');if(!f.source||account(f.source).currency!==a.currency)throw Error('Selecciona una cuenta de pago en la misma moneda');installments(amount,Number(f.count),f.first).forEach((p,i)=>next.transactions.push({id:uid(),parent:item.id,category:f.category||'',business:f.business||'',kind:'payment',concept:f.concept+' · '+(i+1)+'/'+f.count,from:f.source,to:f.from,date:p.date,amount:p.amount,status:'pending'}));}if(kind==='msi'&&t.id){const pend=next.transactions.filter(x=>x.parent===item.id&&x.status==='pending');if(item.from!==t.from)pend.forEach(x=>x.to=item.from);if(f.source){if(!account(f.source)||account(f.source).currency!==a.currency)throw Error('Selecciona una cuenta de pago en la misma moneda.');pend.forEach(x=>x.from=f.source);}}await persist(next);if(kind==='expense'&&debt(a)&&!item.paymentAllocation)return ()=>allocationForm(item.id);});if(dual)finalizeExchange=bindExchange($('#fields'),t,state.accounts);const k=$('[name=kind]');k.disabled=!!t.id;k.onchange=()=>{const draft=Object.fromEntries(new FormData($('#form')));transactionForm({kind:draft.kind,concept:draft.concept,category:draft.category,business:draft.business,notes:draft.notes,date:draft.date,amount:draft.amount?cents(draft.amount):undefined});};if(kind==='msi'&&!t.id){const suggest=()=>{const a=account($('[name=from]').value),d=$('[name=date]').value;if(!a||!d)return;const shift=Number(d.slice(8))>(a.cut||31)?1:0;let first=cardDate(d,shift,Number(a.pay)||22);if(first<=d)first=cardDate(first,1,Number(a.pay)||22);$('[name=first]').value=first;};$('[name=from]').onchange=suggest;$('[name=date]').onchange=suggest;suggest();}}

function allocationForm(expenseId){
 const expense=state.transactions.find(t=>t.id===expenseId);if(!expense)return;
 const a=account(expense.from),candidates=paymentCandidates(state,expense),auto=autoPaymentWindow(state,expense);
 const format=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:a.currency}).format(n/100);
 const autoCreates=!!(auto&&!auto.candidate);
 const showMode=candidates.length>1||(autoCreates&&candidates.length>0);
 const needsSource=autoCreates&&!defaultPaymentSource(state,a.id);
 const autoLabel=!auto?'Sumar automáticamente al pago más próximo':auto.candidate?`Sumar automáticamente al pago del ${auto.candidate.date} (periodo de corte hasta el ${auto.cutEnd})`:`Crear un pago nuevo el ${auto.payDate} (periodo de corte hasta el ${auto.cutEnd})`;
 const canAllocate=candidates.length>0||autoCreates;
 modal('Asignar gasto a un pago',`<p>El gasto <strong>${esc(expense.concept)}</strong> por ${money(-expense.amount,a.currency)} ya está guardado.</p>`+(canAllocate?(showMode?select('mode','Cómo asignarlo',{auto:autoLabel,choose:'Elegir el pago'},'auto'):'')+(needsSource?`<div id="alloc-source"><p>No hay un pago registrado antes para esta tarjeta: elige desde qué cuenta se pagará.</p>`+select('source','Cuenta de origen',opts(x=>!debt(x)&&x.currency===a.currency))+`</div>`:'')+(candidates.length?`<div id="alloc-choice"${showMode?' hidden':''}><p>Elige el pago de ${esc(a.name)} al que quieres sumarlo. Solo cambiará este pago.</p>`+select('payment','Pago programado',Object.fromEntries(candidates.map(t=>[t.id,`${t.date} · ${t.concept} · ${format(t.received??t.amount)} → ${format((t.received??t.amount)+expense.amount)}`])),candidates[0].id)+`</div>`:'')+`<p class="subtle">En otra moneda se conserva el importe destino y se estima el origen con la tasa del pago. Si después editas o eliminas el gasto, revisa también el pago asignado.</p>`:'<p>No hay pagos pendientes ni una fecha de corte/pago configurada para crear uno automáticamente. Crea un pago desde + → Pago de deuda / tarjeta, o configura el día de corte y de pago de la tarjeta. El gasto se conservará aunque cierres este aviso.</p>'),async f=>{
  if(!canAllocate)return;
  const mode=showMode?f.mode:'auto';
  if(mode==='choose'){if(!candidates.length)return;await persist(allocateExpense(state,expenseId,f.payment));notify('Gasto sumado al pago seleccionado.');return;}
  if(auto&&auto.candidate){await persist(allocateExpense(state,expenseId,auto.candidate.id));notify('Gasto sumado al pago seleccionado.');return;}
  if(autoCreates){
   const sourceId=f.source||defaultPaymentSource(state,a.id);
   const source=account(sourceId);
   if(!source)throw Error('Selecciona la cuenta desde la que pagarás.');
   if(source.currency!==a.currency)throw Error('La cuenta de origen debe tener la misma moneda que la tarjeta.');
   const payment={id:uid(),kind:'payment',concept:'Pago de '+a.name,category:'Pago de tarjeta',from:sourceId,to:a.id,date:auto.payDate,amount:expense.amount,received:expense.amount,status:'pending'};
   await persist(createAutoPayment(state,expenseId,payment));
   notify('Se creó un pago nuevo el '+auto.payDate+' y se le sumó el gasto.');
   return;
  }
  if(!candidates.length)return;
  await persist(allocateExpense(state,expenseId,candidates[0].id));
  notify('Gasto sumado al pago seleccionado.');
 });
 $('#save').textContent=canAllocate?'Sumar al pago':'Entendido';
 if(showMode){const modeSel=$('[name=mode]'),box=$('#alloc-choice'),src=$('#alloc-source');modeSel.onchange=()=>{if(box)box.hidden=modeSel.value!=='choose';if(src)src.hidden=modeSel.value!=='auto';};}
}

function accountForm(a={}){modal('Configurar cuenta',input('name','Nombre',a.name||'','text','required maxlength="80"')+select('type','Tipo',types,a.type||'debit')+input('model','Modelo de tarjeta (opcional)',a.model||'','text','maxlength=80')+select('color','Color de la tarjeta',walletColors,a.color||'auto')+select('currency','Moneda',{MXN:'MXN',CAD:'CAD',USD:'USD',EUR:'EUR'},a.currency||'MXN')+input('opening','Saldo inicial (negativo si debes)',(a.opening||0)/100,'number','required step="0.01"')+input('asOf','Saldo al inicio del día',a.asOf||today(),'date','required')+input('limit','Límite de crédito',(a.limit||0)/100,'number','min="0" step="0.01"')+input('cut','Día de corte',a.cut||'','number','min="1" max="31"')+input('pay','Día de pago',a.pay||'','number','min="1" max="31"')+select('available','Incluir en dinero disponible',{yes:'Sí',no:'No'},a.available?'yes':'no')+select('archived','Estado',{no:'Activa',yes:'Archivada'},a.archived?'yes':'no'),async f=>{const next=structuredClone(state);if(a.id&&next.transactions.some(t=>t.from===a.id||t.to===a.id)&&(a.currency!==f.currency||a.type!==f.type))throw Error('Una cuenta con movimientos debe conservar su moneda y tipo. Crea otra cuenta.');const item={id:a.id||uid(),name:f.name,model:f.model,color:f.color,type:f.type,currency:f.currency,opening:Math.round(Number(f.opening)*100),asOf:f.asOf,limit:cents(f.limit),cut:Number(f.cut)||null,pay:Number(f.pay)||null,available:f.available==='yes'&&!['credit','loan','vouchers','receivable'].includes(f.type),archived:f.archived==='yes'};if(a.id)next.accounts=next.accounts.map(x=>x.id===a.id?item:x);else next.accounts.push(item);await persist(next);});}

function ruleForm(existing){const r=existing||{},income=r.kind==='income';if(!state.accounts.length)return accountForm();modal((r.id?'Editar ':'Programar ')+(income?'ingreso recurrente':'costo recurrente'),(r.id?'<p>Se reemplazarán los pagos pendientes de esta regla. Los realizados y los ajustados individualmente se conservan. Las fechas eliminadas no se vuelven a generar.</p>':'')+input('concept','Concepto',r.concept||'','text','required')+categoryField(r.category)+businessField(r.business)+select(income?'to':'from',income?'Cuenta de ingreso':'Cuenta',opts(),income?r.to:r.from)+input('amount','Importe por pago',r.amount?r.amount/100:'','number','required min="0.01" step="0.01"')+input('first','Primera fecha del calendario',r.first||today(),'date','required')+input('every','Repetir cada',r.every||1,'number','required min="1" max="365"')+select('unit','Unidad',{days:'Días',weeks:'Semanas',months:'Meses',years:'Años'},r.unit||'months')+input('count','Número de fechas del calendario',r.count||12,'number','required min="1" max="60"'),async f=>{checkCategory(f.category);await persist(saveRule(state,{...f,kind:income?'income':'expense',id:r.id||uid(),amount:cents(f.amount),count:Number(f.count),every:Number(f.every)},uid));});}
function deleteTransactionForm(t){if(!t)return;const bankPayroll=t.payrollId&&(t.payrollPart==='bank'||(!t.payrollPart&&!t.concept.startsWith('Vales de despensa')));modal('Eliminar movimiento',`<p>Vas a eliminar <strong>${esc(t.concept)}</strong>, del ${t.date}, por ${money(t.amount,account(t.from||t.to)?.currency)}. Los saldos se recalcularán.</p>${t.paymentAllocation?'<p>Este gasto se sumó a un pago programado. Revisa ese pago después de eliminarlo.</p>':''}${bankPayroll?'<p>También se eliminará el desglose asociado a esta nómina. Otros depósitos vinculados, como vales históricos, se conservarán.</p>':''}${t.parent?'<p>Se elimina solo este movimiento; los demás pagos de la recurrencia se conservan.</p>':''}`+(t.kind==='msi'?select('cancel','Cuotas programadas de esta compra',{yes:'Eliminar también las pendientes; conservar las realizadas',no:'Conservar todas las cuotas'},'yes'):''),async f=>{await persist(removeTransaction(state,t.id,f.cancel==='yes'));});}
function deleteRuleForm(r){if(!r)return;modal('Eliminar regla recurrente',`<p>Vas a eliminar la regla <strong>${esc(r.concept)}</strong>. Sus movimientos ya realizados se conservarán.</p>`+select('pending','Movimientos pendientes',{remove:'Eliminar los pendientes de esta regla',keep:'Conservarlos como movimientos independientes'},'remove'),async f=>{await persist(removeRule(state,r.id,f.pending==='remove'));});}

function payrollForm(existing){try{openPayroll({state,modal,persist,uid,today,esc,money,existing:existing?.id?existing:undefined});}catch(e){notify(e.message);}}

new MutationObserver(()=>enhanceMoneyInputs($('#fields'))).observe($('#fields'),{childList:true,subtree:true});

function accessForm(register=false){
 modal(register?'Crear cuenta':'Iniciar sesión',`<p class="subtle">${register?'Crea tu acceso personal. Tus cuentas y movimientos estarán separados de los de otros usuarios.':'Accede a tus cuentas y movimientos.'}</p>`+input('email','Correo','','email','required autocomplete="email"')+input('password','Contraseña','','password',`required minlength="8" autocomplete="${register?'new-password':'current-password'}"`)+(register?input('confirmPassword','Confirmar contraseña','','password','required minlength="8" autocomplete="new-password"'):'')+`<p>${register?'¿Ya tienes cuenta?':'¿No tienes cuenta?'} <button type="button" id="switch-access">${register?'Iniciar sesión':'Crear cuenta'}</button></p>`,async f=>{
  if(!register){const {error}=await client.auth.signInWithPassword({email:f.email.trim(),password:f.password});if(error)throw error;return;}
  if(f.password!==f.confirmPassword)throw Error('Las contraseñas no coinciden.');
  const {data,error}=await client.auth.signUp({email:f.email.trim(),password:f.password,options:{emailRedirectTo:new URL('./',window.location.href).href}});
  if(error){const messages={signup_disabled:'El registro aún no está habilitado. Contacta al administrador.',email_address_not_authorized:'El envío de confirmaciones aún no está habilitado para este correo. Contacta al administrador.',over_email_send_rate_limit:'Se alcanzó el límite de correos. Inténtalo más tarde.',weak_password:'Elige una contraseña más segura.'};throw Error(messages[error.code]||error.message);}
  notify(data.session?'Cuenta creada. Ya puedes configurar tus cuentas.':'Revisa tu correo para confirmar el registro. Si ya tenías cuenta, inicia sesión con tu contraseña.');
 });passwordToggles($('#fields'));$('#save').textContent=register?'Crear cuenta':'Iniciar sesión';$('#switch-access').onclick=()=>accessForm(!register);
}
function login(){if(!client){notify(SUPABASE_URL?'La conexión aún no está lista. Espera unos segundos o recarga la página.':'La conexión a Supabase está pendiente. Esta vista solo contiene ejemplos.');return;}if(user){client.auth.signOut();return;}accessForm();}

/* ========================================================================
   Hoja (modal genérico): abrir/cerrar
   ======================================================================== */
function openModalSheet(){document.body.classList.add('sheet-open');$('#sheet-body').scrollTop=0;}
function closeModalSheet(){document.body.classList.remove('sheet-open');}

/* ========================================================================
   Render y navegación (pantallas persistentes, panel push, pestañas)
   ======================================================================== */
const views={insights:vInsights,movimientos:vMovimientos,calendario:vCalendario,ajustes:vAjustes,estrategia:vEstrategia};
function reveal(el){if(!el)return;el.classList.remove('in');void el.offsetWidth;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('in')));}
function render(which,animate){const el=$('#s-'+which);if(!el)return;el.innerHTML=views[which]();if(which==='estrategia')wireEstrategia();if(animate)reveal(el);else el.classList.add('in');}
function renderAll(){ensureCurrency();Object.keys(views).forEach(k=>render(k,false));if(ui.push)renderPush(false);}
function setTab(id){
  if(id===ui.tab){if(ui.push){pop();return;}const sc=document.querySelector(`[data-screen="${id}"] .scroller`);sc&&sc.scrollTo({top:0,behavior:'smooth'});return;}
  if(ui.push)pop();ui.tab=id;document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===id));
  document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const i=['insights','movimientos','calendario','ajustes','estrategia'].indexOf(id);const pill=$('#tpill');if(pill)pill.style.transform=`translateX(${i*69}px)`;
  const mini=$('#mini-icon');if(mini)mini.innerHTML=`<path d="${svgI[id]}"/>`;setCompact(false);render(id,true);
}
function setCompact(v){ui.compact=v;document.body.classList.toggle('compact',v);}
function vOverdue(){
  const T=today(),list=state.transactions.filter(t=>t.status==='pending'&&t.date<T).sort((a,b)=>a.date.localeCompare(b.date));
  return `<div class="head"><div><div class="kicker">Sin confirmar</div><h1>Programados vencidos</h1></div></div>
  <p class="subtle">${list.length} ${list.length===1?'movimiento programado':'movimientos programados'} con fecha anterior a hoy, sin confirmar todavía.</p>
  <div class="list">${list.length?list.map(txRow).join(''):'<p class="empty">No tienes movimientos vencidos sin confirmar.</p>'}</div>`;
}
function renderPush(animate){const el=$('#push-content');el.innerHTML=ui.push.type==='salud'?vSalud():ui.push.type==='overdue'?vOverdue():vAccount(ui.push.id);$('#ptitle').textContent=ui.push.type==='salud'?'Salud financiera':ui.push.type==='overdue'?'Vencidos':(account(ui.push.id)?.name||'Cuenta');if(animate){el.classList.remove('in');setTimeout(()=>reveal(el),260);}else el.classList.add('in');}
function pushView(p){const backs={insights:'Insights',movimientos:'Movimientos',calendario:'Calendario',ajustes:'Ajustes',estrategia:'Estrategia'};$('#back-label').textContent=backs[ui.tab];ui.push=p;const sc=document.querySelector('[data-key="push"]');if(sc){sc.scrollTop=0;onScroll(sc);}renderPush(true);setCompact(false);requestAnimationFrame(()=>document.body.classList.add('pushed'));}
function pop(){document.body.classList.remove('pushed');ui.push=null;}
function onScroll(sc){const key=sc.dataset.key,y=sc.scrollTop,last=ui.scroll[key]||0;ui.scroll[key]=y;
  if(key==='push'){const bar=$('#pushbar');bar.classList.toggle('solid',y>20);$('#ptitle').style.opacity=clamp((y-30)/26,0,1);}
  else{const nb=sc.parentElement.querySelector('.navbar');if(nb)nb.style.opacity=clamp((y-24)/28,0,1);}
  if(y>140&&y>last+3)setCompact(true);else if(y<last-3||y<80)setCompact(false);}
document.addEventListener('DOMContentLoaded',bindScrollers);function bindScrollers(){document.querySelectorAll('.scroller').forEach(sc=>{if(sc.dataset.bound)return;sc.dataset.bound='1';let raf;sc.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=null;onScroll(sc);});},{passive:true});});}
bindScrollers();

/* Gesto de regresar desde el borde izquierdo (solo en vista móvil) */
(function(){const p=$('#push');let x0=null,dx=0;p.addEventListener('touchstart',e=>{if(!ui.push||window.innerWidth>=1100)return;const t=e.touches[0];if(t.clientX-p.getBoundingClientRect().left<28){x0=t.clientX;dx=0;p.style.transition='none';}},{passive:true});
p.addEventListener('touchmove',e=>{if(x0===null)return;dx=Math.max(0,e.touches[0].clientX-x0);p.style.transform=`translateX(${dx}px)`;},{passive:true});
p.addEventListener('touchend',()=>{if(x0===null)return;p.style.transition='';const go=dx>p.offsetWidth*.33;x0=null;p.style.transform='';if(go)pop();});})();

/* Deslizar un movimiento (estilo iOS): a la derecha revela "Duplicar", a la
   izquierda revela "Eliminar". Con Pointer Events, así funciona igual con
   touch que con mouse. Se usa delegación de eventos en document para no
   tener que volver a enlazar nada cada vez que una lista se vuelve a
   renderizar. */
const SWIPE_W=64;
// El contenido deslizable es siempre el último hijo de .swipe-row (los otros
// dos hijos son las acciones, position:absolute) — ver swipeRow() en
// transaction-actions.js. El estado abierto/cerrado vive en .swipe-row
// (open-left/open-right), que sí es el hermano real dentro de .list para
// efectos del divisor entre filas (ver interface.css).
function closeSwipes(except){document.querySelectorAll('.swipe-row.open-left,.swipe-row.open-right').forEach(row=>{if(row===except)return;row.classList.remove('open-left','open-right');row.lastElementChild.style.transform='';});}
let swipe=null,swipeSuppressClick=false;
document.addEventListener('pointerdown',e=>{
  if(e.target.closest('.swipe-btn'))return;
  const row=e.target.closest('.swipe-row');
  if(!row){closeSwipes();return;}
  closeSwipes(row);
  const content=row.lastElementChild;
  const base=row.classList.contains('open-left')?SWIPE_W:row.classList.contains('open-right')?-SWIPE_W:0;
  swipe={row,content,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,base,dx:base,axis:null,moved:false};
  content.style.transition='none';
},{passive:true});
document.addEventListener('pointermove',e=>{
  if(!swipe||swipe.pointerId!==e.pointerId)return;
  const mx=e.clientX-swipe.startX,my=e.clientY-swipe.startY;
  if(swipe.axis===null){
    if(Math.abs(mx)<6&&Math.abs(my)<6)return;
    swipe.axis=Math.abs(mx)>Math.abs(my)?'x':'y';
    if(swipe.axis==='y'){swipe=null;return;}
  }
  if(swipe.axis!=='x')return;
  swipe.moved=true;swipe.dx=Math.max(-SWIPE_W,Math.min(SWIPE_W,swipe.base+mx));
  swipe.content.style.transform=`translateX(${swipe.dx}px)`;
  e.preventDefault();
},{passive:false});
function endSwipe(){
  if(!swipe)return;const {row,content,dx,moved}=swipe;content.style.transition='';
  if(moved){
    // El click que el navegador dispara justo después de este pointerup (el
    // mismo gesto, ya sea que haya abierto, cerrado o quedado igual) no debe
    // tratarse como un tap: lo absorbemos para que no vuelva a cerrar la fila
    // que acabamos de abrir ni dispare "editar" sobre el contenido.
    swipeSuppressClick=true;
    if(dx>SWIPE_W/2){row.classList.add('open-left');row.classList.remove('open-right');content.style.transform=`translateX(${SWIPE_W}px)`;}
    else if(dx<-SWIPE_W/2){row.classList.add('open-right');row.classList.remove('open-left');content.style.transform=`translateX(${-SWIPE_W}px)`;}
    else{row.classList.remove('open-left','open-right');content.style.transform='';}
  }
  swipe=null;
}
document.addEventListener('pointerup',endSwipe);
document.addEventListener('pointercancel',endSwipe);
document.addEventListener('click',e=>{
  if(swipeSuppressClick){swipeSuppressClick=false;e.stopPropagation();e.preventDefault();return;}
  if(e.target.closest('.swipe-btn'))return;
  const row=e.target.closest('.swipe-row');
  if(row&&(row.classList.contains('open-left')||row.classList.contains('open-right'))){row.classList.remove('open-left','open-right');row.lastElementChild.style.transform='';e.stopPropagation();e.preventDefault();}
},true);

/* ========================================================================
   Eventos
   ======================================================================== */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-tab],[data-action]');if(!b)return;
  if(b.dataset.tab&&!b.dataset.action){setTab(b.dataset.tab);return;}
  const a=b.dataset.action,id=b.dataset.id;
  try{switch(a){
    case 'tab':setTab(b.dataset.tab);break;
    case 'expand':setCompact(false);break;
    case 'salud':pushView({type:'salud'});break;
    case 'overdue':pushView({type:'overdue'});break;
    case 'account':pushView({type:'account',id});break;
    case 'account-edit':accountForm(account(id)||{});break;
    case 'pop':pop();break;
    case 'new':transactionForm();break;
    case 'currency':{const c=currencies();ui.currency=c[(c.indexOf(ui.currency)+1)%c.length];renderAll();notify('Moneda: '+ui.currency);break;}
    case 'set-cur':ui.currency=b.dataset.v;renderAll();break;
    case 'pending-view':ui.seg='pending';ui.month=today().slice(0,7);setTab('movimientos');break;
    case 'month':ui.month=monthDate(ui.month+'-01',Number(b.dataset.d),1).slice(0,7);render('movimientos');break;
    case 'cal-month':ui.calMonth=monthDate(ui.calMonth+'-01',Number(b.dataset.d),1).slice(0,7);render('calendario');break;
    case 'seg':ui.seg=b.dataset.v;{const th=document.querySelector('#s-movimientos .seg .thumb');if(th)th.style.transform=`translateX(${ui.seg==='done'?0:100}%)`;document.querySelectorAll('#s-movimientos .seg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===ui.seg));const l=$('#mov-list');if(l)l.innerHTML=movList();}break;
    case 'acct':ui.acct=id;document.querySelectorAll('#s-movimientos .chip').forEach(x=>x.setAttribute('aria-pressed',x.dataset.id===id));{const l=$('#mov-list');if(l)l.innerHTML=movList();}break;
    case 'day':ui.selDay=b.dataset.d;{const sc=document.querySelector('[data-key="calendario"]'),y=sc?sc.scrollTop:0;render('calendario');if(sc)sc.scrollTop=y;}break;
    case 'edit':transactionForm(state.transactions.find(t=>t.id===id));break;
    case 'confirm':transactionForm({...state.transactions.find(t=>t.id===id),status:'done'},true);break;
    case 'duplicate':transactionForm(duplicateDraft(state.transactions.find(t=>t.id===id)));break;
    case 'delete':deleteTransactionForm(state.transactions.find(t=>t.id===id));break;
    case 'rule-edit':ruleForm(state.rules.find(r=>r.id===id));break;
    case 'rule-delete':deleteRuleForm(state.rules.find(r=>r.id===id));break;
    case 'payroll-edit':payrollForm(state.payrolls.find(p=>p.id===id));break;
    case 'payroll':payrollForm();break;
    case 'add-account':accountForm();break;
    case 'add-rule':ruleForm();break;
    case 'add-income-rule':ruleForm({kind:'income'});break;
    case 'strategy-seg':ui.strategySeg=b.dataset.v;render('estrategia');break;
    case 'priority':ui.priority=b.dataset.v;render('estrategia');break;
    case 'add-goal':goalForm();break;
    case 'goal-edit':goalForm(goalsList().find(g=>g.id===id));break;
    case 'goal-delete':deleteGoalForm(goalsList().find(g=>g.id===id));break;
    case 'import-payroll':$('#payroll-file').click();break;
    case 'csv-import':csvImportUI({state,getState:()=>state,modal,persist,uid,esc,money,notify});break;
    case 'csv-template':{const url=URL.createObjectURL(new Blob(['﻿'+CSV_TEMPLATE],{type:'text/csv;charset=utf-8'}));const l=document.createElement('a');l.href=url;l.download='plantilla-pagos-programados.csv';l.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}break;
    case 'export':{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const l=document.createElement('a');l.href=url;l.download='finanzas-'+today()+'.json';l.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}break;
    case 'login':login();break;
    case 'tutorial':welcome();break;
    case 'close-sheet':case 'close':closeModalSheet();break;
  }}catch(err){const el=$('#error');if(el&&document.body.classList.contains('sheet-open')){el.textContent=err.message;}else notify(err.message);}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){ui.q=e.target.value;const l=$('#mov-list');if(l)l.innerHTML=movList();}});
$('#payroll-file').addEventListener('change',async e=>{try{const list=JSON.parse(await e.target.files[0].text());if(!Array.isArray(list)||list.some(t=>!['earnings','deductions','information'].includes(t.section)||typeof t.company!=='string'||typeof t.code!=='string'||typeof t.concept!=='string'||!Number.isSafeInteger(t.amount)||t.amount<0))throw Error('Catálogo inválido');const next=structuredClone(state);next.payrollTemplates??=[];for(const t of list){const i=next.payrollTemplates.findIndex(x=>x.company===t.company&&x.code===t.code&&x.section===t.section);if(i<0)next.payrollTemplates.push(t);else next.payrollTemplates[i]=t;}await persist(next);notify('Sugerencias de nómina guardadas en tu espacio privado.');}catch(e){notify(e.message);}finally{e.target.value='';}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.body.classList.contains('sheet-open'))closeModalSheet();else if(ui.push)pop();}});

renderAll();

if(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY){try{if(!window.supabase)throw Error('No se pudo cargar la librería de conexión (vendor/supabase.umd.js). Revisa tu conexión e inténtalo de nuevo.');const {createClient}=window.supabase;client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);client.auth.onAuthStateChange((_event,session)=>{if(_event==='TOKEN_REFRESHED'&&session?.user.id===user?.id){user=session.user;return;}setTimeout(async()=>{try{user=session?.user;if(channel)await client.removeChannel(channel);loginText=user?'Cerrar sesión':'Iniciar sesión';connectionText=user?'Conectado · sincronizando':'Inicia sesión para ver tus datos';renderAll();if(user){await load();channel=client.channel('book-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'finance_books',filter:'user_id=eq.'+user.id},()=>{if(!busy)load().catch(e=>notify(e.message));}).subscribe(status=>{connectionText=status==='SUBSCRIBED'?'Sincronizado en la nube':'Conectado · sincronización pendiente';render('ajustes');});}else{document.querySelector('#welcome')?.remove();state=empty();ensureCurrency();renderAll();}}catch(e){notify(e.message);}},0);});window.addEventListener('focus',()=>{if(user&&!document.body.classList.contains('sheet-open'))load().catch(e=>notify(e.message));});}catch(e){notify('No se pudo conectar: '+e.message);}}

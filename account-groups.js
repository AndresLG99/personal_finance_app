import {walletTheme} from './wallet.js?v=20261024-1';
const groups=[{name:'Líquido',types:['debit','cash','saving','vouchers']},{name:'Deudas',types:['credit','loan']},{name:'Por cobrar',types:['receivable']}];
export function orderedAccounts(accounts){return groups.flatMap(g=>accounts.filter(a=>g.types.includes(a.type))).concat(accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))));}
export function groupedAccounts(accounts,render){return groups.map(g=>{const rows=accounts.filter(a=>g.types.includes(a.type));return rows.length?`<h3 class="account-group-label">${g.name}</h3>${rows.map(render).join('')}`:'';}).join('')+accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))).map(render).join('');}
// Dentro de una misma división (Líquido/Deudas/Por cobrar), agrupa las cuentas por el color
// de su tarjeta (walletTheme ya resuelve "auto" al color real, así que dos cuentas "auto"
// que caen en colores distintos NO quedan juntas por error) y ordena: primero los grupos de
// color cuya suma de montos (valor absoluto) es mayor, y dentro de cada color, la cuenta de
// mayor monto primero. amountFor(a) debe devolver el mismo número que se muestra en la
// tarjeta (balance o deuda, antes de aplicar valor absoluto).
function sortByColorAndAmount(accounts,amountFor){
 const byColor=new Map();
 for(const a of accounts){const key=walletTheme(a);if(!byColor.has(key))byColor.set(key,[]);byColor.get(key).push(a);}
 return [...byColor.values()]
  .map(list=>({list:list.slice().sort((x,y)=>Math.abs(amountFor(y))-Math.abs(amountFor(x))),total:list.reduce((s,a)=>s+Math.abs(amountFor(a)),0)}))
  .sort((a,b)=>b.total-a.total)
  .flatMap(g=>g.list);
}
// Renders each division (Líquido / Deudas / Por cobrar) as its own labeled
// row of cards, so the horizontal-scroll (mobile) / flex-wrap (desktop)
// behavior of the card row still applies within each division. Within each
// division, cards are grouped by card color and ordered by amount (see
// sortByColorAndAmount above). amountFor(a) returns the number used for that
// ordering; wrapAttrs lets a caller force the inner row to always wrap (e.g.
// the accounts editor in Ajustes, which lists every account and never
// scrolls).
export function accountGroupSections(accounts,render,amountFor=()=>0,wrapAttrs=''){
 const row=rows=>`<div class="wallets"${wrapAttrs}>${rows.map(render).join('')}</div>`;
 const sections=groups.map(g=>{const rows=sortByColorAndAmount(accounts.filter(a=>g.types.includes(a.type)),amountFor);return rows.length?`<div class="account-group"><h3 class="account-group-label">${g.name}</h3>${row(rows)}</div>`:'';}).join('');
 const rest=sortByColorAndAmount(accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))),amountFor);
 return sections+(rest.length?`<div class="account-group">${row(rest)}</div>`:'');
}

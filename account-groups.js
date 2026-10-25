const groups=[{name:'Líquido',types:['debit','cash','saving','vouchers']},{name:'Deudas',types:['credit','loan']},{name:'Por cobrar',types:['receivable']}];
export function orderedAccounts(accounts){return groups.flatMap(g=>accounts.filter(a=>g.types.includes(a.type))).concat(accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))));}
export function groupedAccounts(accounts,render){return groups.map(g=>{const rows=accounts.filter(a=>g.types.includes(a.type));return rows.length?`<h3 class="account-group-label">${g.name}</h3>${rows.map(render).join('')}`:'';}).join('')+accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))).map(render).join('');}
// Dentro de una misma división (Líquido/Deudas/Por cobrar), ordena las cuentas de mayor a
// menor monto en valor absoluto. amountFor(a) debe devolver el mismo número que se muestra
// en la tarjeta (balance o deuda, antes de aplicar valor absoluto).
// (2026-10-24: se probó agrupar además por color de tarjeta antes de ordenar por monto; se
// quitó esa agrupación a pedido del usuario, que prefiere solo el orden por monto.)
const sortByAmount=(accounts,amountFor)=>accounts.slice().sort((x,y)=>Math.abs(amountFor(y))-Math.abs(amountFor(x)));
// Renders each division (Líquido / Deudas / Por cobrar) as its own labeled
// row of cards, so the horizontal-scroll (mobile) / flex-wrap (desktop)
// behavior of the card row still applies within each division. Within each
// division, cards are ordered by amount (see sortByAmount above). amountFor(a)
// returns the number used for that ordering; wrapAttrs lets a caller force
// the inner row to always wrap (e.g. the accounts editor in Ajustes, which
// lists every account and never scrolls).
export function accountGroupSections(accounts,render,amountFor=()=>0,wrapAttrs=''){
 const row=rows=>`<div class="wallets"${wrapAttrs}>${rows.map(render).join('')}</div>`;
 const sections=groups.map(g=>{const rows=sortByAmount(accounts.filter(a=>g.types.includes(a.type)),amountFor);return rows.length?`<div class="account-group"><h3 class="account-group-label">${g.name}</h3>${row(rows)}</div>`:'';}).join('');
 const rest=sortByAmount(accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))),amountFor);
 return sections+(rest.length?`<div class="account-group">${row(rest)}</div>`:'');
}

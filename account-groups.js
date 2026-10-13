const groups=[{name:'Líquido',types:['debit','cash','saving','vouchers']},{name:'Deudas',types:['credit','loan']},{name:'Por cobrar',types:['receivable']}];
export function orderedAccounts(accounts){return groups.flatMap(g=>accounts.filter(a=>g.types.includes(a.type))).concat(accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))));}
export function groupedAccounts(accounts,render){return groups.map(g=>{const rows=accounts.filter(a=>g.types.includes(a.type));return rows.length?`<h3 class="account-group-label">${g.name}</h3>${rows.map(render).join('')}`:'';}).join('')+accounts.filter(a=>!groups.some(g=>g.types.includes(a.type))).map(render).join('');}
// Renders each division (Líquido / Deudas / Por cobrar) as its own labeled
// row of cards, so the horizontal-scroll (mobile) / flex-wrap (desktop)
// behavior of the card row still applies within each division. wrapAttrs
// lets a caller force the inner row to always wrap (e.g. the accounts
// editor in Ajustes, which lists every account and never scrolls).
export function accountGroupSections(accounts,render,wrapAttrs=''){
 const row=rows=>`<div class="wallets"${wrapAttrs}>${rows.map(render).join('')}</div>`;
 const sections=groups.map(g=>{const rows=accounts.filter(a=>g.types.includes(a.type));return rows.length?`<div class="account-group"><h3 class="account-group-label">${g.name}</h3>${row(rows)}</div>`:'';}).join('');
 const rest=accounts.filter(a=>!groups.some(g=>g.types.includes(a.type)));
 return sections+(rest.length?`<div class="account-group">${row(rest)}</div>`:'');
}

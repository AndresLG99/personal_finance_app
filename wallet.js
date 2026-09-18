import {merchantIcons} from './merchant-icons.js?v=20260917-2';
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const themes=[[/\bbbva\b/,'blue'],[/american express|\bamex\b/,'gold'],[/\bnu\b|nubank/,'purple'],[/santander|banorte/,'red'],[/hey banco|cashi/,'green']];
export function walletTheme(a){return themes.find(([re])=>re.test(clean(a.name)))?.[1]||({cash:'green',saving:'teal',vouchers:'purple',credit:'red',loan:'slate',receivable:'teal'}[a.type]||'slate');}
export const accountType=a=>({debit:'Débito',cash:'Efectivo',saving:'Ahorro',vouchers:'Vales',credit:'Crédito',loan:'Deuda por pagar',receivable:'Préstamo por cobrar'}[a.type]||'Cuenta');
const brands=[[/\bwal ?mart\b/,'walmart'],[/\bstarbucks\b/,'starbucks'],[/\boxxo\b/,'oxxo'],[/\b7 ?eleven\b|\bseven(?: eleven)?\b/,'seven'],[/\bamazon\b/,'amazon'],[/\bnetflix\b/,'netflix'],[/\bspotify\b/,'spotify'],[/\buber(?: eats)?\b/,'uber'],[/\bapple\b/,'apple'],[/\bcostco\b/,'costco'],[/\bmcdonald s?\b|\bmcdonalds\b/,'mcdonalds']];
export function merchantKey(t){return brands.find(([re])=>re.test(clean(t.business||t.concept)))?.[1];}
export function merchantIcon(t){const key=merchantKey(t),src=merchantIcons[key];const symbol=t.kind==='income'?'↙':t.kind==='transfer'?'⇄':t.kind==='payment'?'↗':'−';return `<span class="merchant-icon" aria-hidden="true">${src?`<img src="${src}" width="40" height="40" alt="" loading="lazy">`:symbol}</span>`;}

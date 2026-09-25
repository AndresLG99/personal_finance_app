import {today,debt,saveTransactionEdit} from './finance.js?v=20260922-1';
export function paymentCandidates(state,expense,current=today()) {
 const a=state.accounts.find(a=>a.id===expense?.from);
 if(!a||!debt(a)||expense.kind!=='expense')return [];
 return state.transactions.filter(t=>t.kind==='payment'&&t.status==='pending'&&t.to===a.id&&t.date>=current&&t.date>=expense.date).sort((a,b)=>a.date.localeCompare(b.date));
}
export function allocateExpense(state,expenseId,paymentId,current=today()) {
 const next=structuredClone(state),e=next.transactions.find(t=>t.id===expenseId);
 if(!e)throw Error('El gasto ya no existe.');
 if(e.paymentAllocation)throw Error('Este gasto ya se asignó a un pago.');
 const p=paymentCandidates(next,e,current).find(t=>t.id===paymentId);
 if(!p)throw Error('El pago ya no está disponible. Revisa su fecha y estado.');
 const from=next.accounts.find(a=>a.id===p.from),to=next.accounts.find(a=>a.id===p.to);
 const updated={...p},received=(p.received??p.amount)+e.amount;
 if(from.currency===to.currency){updated.amount=received;updated.received=received;}
 else {const rate=p.fx?.rate||p.received/p.amount;if(!(rate>0)||!Number.isFinite(rate))throw Error('Actualiza la conversión del pago antes de asignarle el gasto.');updated.received=received;updated.amount=Math.round(received/rate);updated.fx={...p.fx,anchor:'to',rate,mode:'auto',fixed:false};}
 if(!Number.isSafeInteger(updated.amount)||updated.amount<=0||!Number.isSafeInteger(received))throw Error('Revisa los importes del pago.');
 saveTransactionEdit(next,updated,'one');
 e.paymentAllocation={paymentId,amount:e.amount};
 return next;
}

// Dates are local calendar dates; createdAt is immutable registration time.
export function chronological(a,b){return a.date.localeCompare(b.date)||(a.createdAt||'').localeCompare(b.createdAt||'')||(a.index??0)-(b.index??0);}
export function activityLists(transactions,current){
 const end=new Date(current+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);const last=end.toISOString().slice(0,10);
 const rows=transactions.map((t,index)=>({...t,index}));
 return {done:rows.filter(t=>t.status==='done'&&t.date===current).sort((a,b)=>chronological(b,a)),pending:rows.filter(t=>t.status==='pending'&&t.date>=current&&t.date<=last).sort(chronological),last};
}
export function stampTransactions(previous,next,now=new Date().toISOString()){
 const old=new Map(previous.transactions.map(t=>[t.id,t]));
 for(const t of next.transactions){const prior=old.get(t.id);if(prior){if(prior.createdAt)t.createdAt=prior.createdAt;else delete t.createdAt;}else t.createdAt=now;}
 return next;
}

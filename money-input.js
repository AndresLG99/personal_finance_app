export function calculate(expression){
 const s=String(expression).replace(/,(\d{1,2})(?=[+\-*/()×÷\s]|$)/g,'.$1').replace(/[\s$,]/g,'').replace(/×/g,'*').replace(/÷/g,'/');let i=0;
 if(!s||s.length>200)throw Error('Escribe una operación de hasta 200 caracteres.');
 const primary=()=>{if(s[i]==='+'){i++;return primary();}if(s[i]==='-'){i++;return -primary();}if(s[i]==='('){i++;const n=sum();if(s[i++]!==')')throw Error('Revisa los paréntesis.');return n;}const match=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(s.slice(i));if(!match)throw Error('Revisa la operación.');i+=match[0].length;return Number(match[0]);};
 const product=()=>{let n=primary();while(s[i]==='*'||s[i]==='/'){const op=s[i++],v=primary();if(op==='/'&&v===0)throw Error('No se puede dividir entre cero.');n=op==='*'?n*v:n/v;}return n;};
 const sum=()=>{let n=product();while(s[i]==='+'||s[i]==='-'){const op=s[i++],v=product();n=op==='+'?n+v:n-v;}return n;};
 const result=sum();if(i!==s.length||!Number.isFinite(result)||!Number.isSafeInteger(Math.round(result*100)))throw Error('Operación inválida o importe demasiado grande.');return Math.round((result+Math.sign(result)*Number.EPSILON)*100)/100;
}
const formatted=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
export function enhanceMoneyInputs(root){
 root.querySelectorAll('input[type=number]').forEach(original=>{
  if(original.step!=='0.01'){original.inputMode='numeric';return;}
  if(original.dataset.moneyReady)return;original.dataset.moneyReady='1';
  const required=original.required,min=original.min,max=original.max;
  const label=original.closest('label'),title=label?.childNodes[0]?.textContent?.trim()||'Importe';
  const visible=document.createElement('input');visible.type='text';visible.inputMode='decimal';visible.autocomplete='off';visible.placeholder='$0.00';visible.setAttribute('aria-label',title);visible.required=required;visible.className='money-entry';
  original.before(visible);original.type='hidden';original.required=false;
  const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  const sync=()=>{visible.value=original.value===''?'':formatted(original.value);visible.setCustomValidity('');};
  Object.defineProperty(original,'value',{configurable:true,get(){return desc.get.call(this);},set(v){desc.set.call(this,v);sync();}});sync();
  const validate=()=>{const raw=original.value,n=Number(raw);visible.setCustomValidity(raw===''?(required?'Indica el importe.':''):!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100))?'Revisa el importe.':min!==''&&n<Number(min)?`El importe mínimo es ${min}.`:max!==''&&n>Number(max)?`El importe máximo es ${max}.`:'');};
  visible.oninput=event=>{
   const source=visible.value,decimalComma=event.data===','||!source.includes('$')||event.inputType==='insertFromPaste';
   const text=(decimalComma?source.replace(/,(\d{0,2})$/,(match,decimals)=>source.includes('.')?match:'.'+decimals):source).replace(/[$,\s]/g,''),caret=visible.selectionStart||0,digitsBefore=visible.value.slice(0,caret).replace(/[^\d.\-]/g,'').length;
   if(/[+*/×÷()]|\d\s*-/.test(text)){desc.set.call(original,'');visible.setCustomValidity('');return;}
   if(!/^-?\d*(\.\d{0,2})?$/.test(text)){visible.setCustomValidity('Usa hasta dos decimales.');return;}
   desc.set.call(original,text&&text!=='-'&&text!=='.'?text:'');
   const parts=text.split('.'),negative=parts[0].startsWith('-'),whole=parts[0].replace('-','').replace(/^0+(?=\d)/,'');
   visible.value=text?`${negative?'-$':'$'}${whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')}${parts.length>1?'.'+parts[1]:''}`:'';
   let pos=0,count=0;while(pos<visible.value.length&&count<digitsBefore){if(/[\d.\-]/.test(visible.value[pos]))count++;pos++;}visible.setSelectionRange(pos,pos);validate();original.dispatchEvent(new Event('input',{bubbles:true}));
  };
  visible.onblur=()=>{if(/[+*/×÷()]|\d\s*-/.test(visible.value)){try{original.value=calculate(visible.value).toFixed(2);}catch(e){visible.setCustomValidity(e.message);return;}}if(visible.validity.customError)return;sync();validate();original.dispatchEvent(new Event('change',{bubbles:true}));};
  const ops=document.createElement('div');ops.className='money-ops';ops.setAttribute('role','group');ops.setAttribute('aria-label',`Operadores para ${title}`);
  for(const[insert,symbol]of[['+','+'],['-','−'],['×','×'],['÷','÷']]){
   const b=document.createElement('button');b.type='button';b.className='op-btn';b.textContent=symbol;b.setAttribute('aria-label',symbol);
   b.onmousedown=e=>e.preventDefault();
   b.onclick=()=>{
    const start=visible.selectionStart??visible.value.length,end=visible.selectionEnd??visible.value.length;
    visible.value=visible.value.slice(0,start)+insert+visible.value.slice(end);
    const pos=start+insert.length;
    visible.focus();visible.setSelectionRange(pos,pos);
    visible.dispatchEvent(new Event('input',{bubbles:true}));
   };
   ops.append(b);
  }
  visible.after(ops);
 });
}

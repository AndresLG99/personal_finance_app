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
  const visible=document.createElement('input');visible.type='text';visible.inputMode=min===''?'text':'decimal';visible.autocomplete='off';visible.placeholder='$0.00';visible.setAttribute('aria-label',title);visible.required=required;visible.className='money-entry';
  original.before(visible);original.type='hidden';original.required=false;
  const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  const sync=()=>{visible.value=original.value===''?'':formatted(original.value);visible.setCustomValidity('');};
  Object.defineProperty(original,'value',{configurable:true,get(){return desc.get.call(this);},set(v){desc.set.call(this,v);sync();}});sync();
  const validate=()=>{const raw=original.value,n=Number(raw);visible.setCustomValidity(raw===''?(required?'Indica el importe.':''):!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100))?'Revisa el importe.':min!==''&&n<Number(min)?`El importe mínimo es ${min}.`:max!==''&&n>Number(max)?`El importe máximo es ${max}.`:'');};
  visible.oninput=event=>{
   const source=visible.value,decimalComma=event.data===','||!source.includes('$')||event.inputType==='insertFromPaste';
   const text=(decimalComma?source.replace(/,(\d{0,2})$/,(match,decimals)=>source.includes('.')?match:'.'+decimals):source).replace(/[$,\s]/g,''),caret=visible.selectionStart||0,digitsBefore=visible.value.slice(0,caret).replace(/[^\d.\-]/g,'').length;
   if(/[+*/×÷()]|\d\s*-/.test(text)){desc.set.call(original,'');visible.setCustomValidity('');return;}
   if(!/^-?\d*(\.\d{0,2})?$/.test(text)){visible.setCustomValidity('Usa hasta dos decimales o abre la calculadora.');return;}
   desc.set.call(original,text&&text!=='-'&&text!=='.'?text:'');
   const parts=text.split('.'),negative=parts[0].startsWith('-'),whole=parts[0].replace('-','').replace(/^0+(?=\d)/,'');
   visible.value=text?`${negative?'-$':'$'}${whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')}${parts.length>1?'.'+parts[1]:''}`:'';
   let pos=0,count=0;while(pos<visible.value.length&&count<digitsBefore){if(/[\d.\-]/.test(visible.value[pos]))count++;pos++;}visible.setSelectionRange(pos,pos);validate();original.dispatchEvent(new Event('input',{bubbles:true}));
  };
  visible.onblur=()=>{if(/[+*/×÷()]|\d\s*-/.test(visible.value)){try{original.value=calculate(visible.value).toFixed(2);}catch(e){visible.setCustomValidity(e.message);return;}}if(visible.validity.customError)return;sync();validate();original.dispatchEvent(new Event('change',{bubbles:true}));};
  const keyboard=document.createElement('button');keyboard.type='button';keyboard.className='calculator-trigger';const keyboardLabel=()=>keyboard.textContent=visible.inputMode==='decimal'?'Teclado con signos (+ − × ÷)':'Teclado numérico';keyboardLabel();keyboard.onclick=()=>{visible.inputMode=visible.inputMode==='decimal'?'text':'decimal';keyboardLabel();visible.blur();visible.focus();};visible.after(keyboard);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='calculator-trigger';trigger.textContent='▦ Calcular';trigger.setAttribute('aria-label',`Calcular ${title}`);visible.after(trigger);
  trigger.onclick=()=>{
   root.querySelectorAll('.money-calculator').forEach(n=>n.remove());
   const panel=document.createElement('div');panel.className='money-calculator';panel.setAttribute('role','group');panel.setAttribute('aria-label',`Calculadora de ${title}`);
   const expression=document.createElement('input');expression.type='text';expression.inputMode='text';expression.setAttribute('aria-label','Operación');expression.placeholder='Ejemplo: 150 + 80 × 2';
   const result=document.createElement('output');result.setAttribute('aria-live','polite');const keys=document.createElement('div');keys.className='calculator-keys';
   const preview=()=>{try{result.textContent=formatted(calculate(expression.value));}catch(e){result.textContent=e.message;}};
   for(const key of ['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','(',')','+','⌫','C']){const b=document.createElement('button');b.type='button';b.textContent=key;b.onclick=()=>{if(key==='C')expression.value='';else if(key==='⌫')expression.value=expression.value.slice(0,-1);else expression.value+=key==='−'?'-':key;preview();};keys.append(b);}
   const apply=document.createElement('button');apply.type='button';apply.className='primary';apply.textContent='Usar resultado';apply.onclick=()=>{try{const n=calculate(expression.value);if(min!==''&&n<Number(min))throw Error(`El importe mínimo es ${min}.`);if(max!==''&&n>Number(max))throw Error(`El importe máximo es ${max}.`);original.value=n.toFixed(2);validate();original.dispatchEvent(new Event('input',{bubbles:true}));original.dispatchEvent(new Event('change',{bubbles:true}));panel.remove();visible.focus();}catch(e){result.textContent=e.message;}};
   const close=document.createElement('button');close.type='button';close.textContent='Cerrar calculadora';close.onclick=()=>panel.remove();expression.oninput=preview;expression.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply.click();}};
   panel.append(expression,result,keys,apply,close);label?.append(panel);expression.focus();
  };
 });
}

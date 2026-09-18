export const needsWelcome = state => !state.onboarding?.dismissedAt && !['accounts','transactions','rules','payrolls'].some(key => state[key]?.length);

const steps = [
  ['Bienvenido a Mis finanzas', 'Tu dinero, con claridad', 'Organiza lo que tienes hoy y lo que viene después. Esta guía no crea movimientos ni modifica tus saldos.', 'Tus registros se guardan en tu cuenta. Cada integrante de tu familia tiene su propio espacio.'],
  ['Primero, tus cuentas', 'Configuración → Agregar cuenta', 'Agrega tu banco, efectivo, ahorros, vales, tarjetas o préstamos. Indica la moneda, el saldo inicial y la fecha a la que corresponde.', 'Si debes dinero, registra el saldo negativo. En tarjetas, agrega también los días de corte y pago. Evita volver a registrar movimientos que ya estén incluidos en el saldo inicial.'],
  ['Registra tu día a día', 'Botón + → Nuevo movimiento', 'Elige gasto, ingreso, transferencia, pago de deuda o compra a meses sin intereses. Selecciona cuenta, fecha, categoría e importe.', 'Mover dinero entre tus cuentas —incluido retirar efectivo— es una transferencia. Para pagar una tarjeta o deuda, indica la cuenta de origen y la de destino.'],
  ['Planea y confirma', 'Movimientos → Programados sin confirmar', 'Usa Programado para lo que todavía no ocurre. Cuando se realice, pulsa Confirmar y revisa el importe y la fecha reales.', 'Al confirmar puedes ajustar esa operación sin cambiar toda la recurrencia. En Configuración puedes crear costos recurrentes, importar pagos futuros desde CSV y registrar el líquido de tu nómina; el desglose sirve para compararlo.'],
  ['Mira lo que viene', 'Calendario y Saldos · Insights', 'Selecciona un día para consultar movimientos y saldos reales o proyectados. En Insights, elige una cuenta para ver su historial completo y sus próximas fechas importantes.', 'Las proyecciones incluyen lo programado; no significan que ya se pagó. Los movimientos se confirman desde Movimientos.'],
  ['Todo listo para empezar', 'A tu ritmo', 'Comienza con una cuenta y su saldo actual. Después registra tu primer movimiento y revisa cómo cambia el saldo.', 'Puedes volver a esta guía cuando quieras desde Configuración → Ver tutorial.']
];

export function openWelcome({finish, start}) {
  if(document.querySelector('#welcome')) return;
  const dialog=document.createElement('dialog');
  dialog.id='welcome'; dialog.className='welcome';
  dialog.setAttribute('aria-labelledby','welcome-title');
  document.body.append(dialog);
  let index=0, saving=false;
  const close=async (setup=false)=>{
    if(saving)return; saving=true;
    dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try { await finish(); dialog.close(); dialog.remove(); if(setup)start(); }
    catch(error){dialog.querySelector('[role=alert]').textContent='No se pudo guardar el avance. '+error.message; saving=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);dialog.querySelector('#welcome-back').disabled=index===0;}
  };
  const draw=()=>{
    const [title,label,body,tip]=steps[index];
    dialog.innerHTML=`<div class="welcome-top"><span class="eyebrow">GUÍA DE INICIO</span><button type="button" id="welcome-skip">Omitir por ahora</button></div><p class="subtle" aria-live="polite">Paso ${index+1} de ${steps.length}</p><progress max="${steps.length}" value="${index+1}" aria-label="Progreso del tutorial"></progress><h2 id="welcome-title" tabindex="-1">${title}</h2><p class="welcome-label">${label}</p><p>${body}</p><aside>${tip}</aside><p role="alert"></p><div class="welcome-actions"><button type="button" id="welcome-back" ${index===0?'disabled':''}>Anterior</button><button type="button" class="primary" id="welcome-next">${index===steps.length-1?'Configurar mi cuenta':'Siguiente'}</button></div>`;
    dialog.querySelector('#welcome-skip').onclick=()=>close();
    dialog.querySelector('#welcome-back').onclick=()=>{index--;draw();};
    dialog.querySelector('#welcome-next').onclick=()=>{if(index===steps.length-1)close(true);else{index++;draw();}};
    dialog.querySelector('h2').focus();
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  draw();dialog.showModal();dialog.querySelector('h2').focus();
}

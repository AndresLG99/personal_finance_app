export const needsWelcome = state => !state.onboarding?.dismissedAt && !['accounts','transactions','rules','payrolls'].some(key => state[key]?.length);

const steps = [
 ['Bienvenido a Mis finanzas','Tu dinero, con claridad','Esta guía te lleva por las secciones de la app. Puedes usar la pantalla mientras lees y avanzar a tu ritmo.','Tus datos pertenecen a tu cuenta. La guía no crea movimientos ni cambia saldos.','insights','#title'],
 ['Primero, tus cuentas','Configuración → Agregar cuenta','Agrega banco, efectivo, ahorro, tarjeta o préstamo. Indica el saldo inicial y su fecha, el modelo y el color de tu tarjeta.','Registra negativo lo que debes. En crédito, agrega límite, corte y pago. No dupliques movimientos ya incluidos en el saldo inicial.','settings','#add-account'],
 ['Registra tu día a día','Botón + → Nuevo movimiento','Elige gasto, ingreso, transferencia, pago o compra a meses. Selecciona cuentas, fecha, categoría e importe.','Una transferencia mueve dinero entre tus propias cuentas, incluido retirar efectivo. El botón + permanece en la esquina.','transactions','#title'],
 ['Planea y confirma','Movimientos → Programados','Los realizados muestran hoy y los programados abarcan hoy a 30 días. Confirma lo programado cuando ocurra.','Al confirmar puedes ajustar fecha e importe de esa operación sin cambiar la recurrencia. Usa los iconos para editar, duplicar o eliminar.','transactions','#content'],
 ['Repite sin capturar todo','Configuración → Recurrentes','Programa gastos o ingresos por días, semanas, meses o años. Los ingresos recurrentes sirven para trabajos extra, rentas o apoyos.','Las nóminas tienen su propio registro: el líquido es el ingreso oficial y el desglose sirve para compararlo.','settings','#add-income-rule'],
 ['Consulta un día','Calendario y Saldos','Selecciona una fecha para ver los movimientos del día y el saldo real o proyectado de cada cuenta.','Lo programado aparece en la proyección, pero no significa que el dinero ya se haya movido.','calendar','#content'],
 ['Explora tus cuentas','Insights','Selecciona una tarjeta para ver su historial completo, realizados y programados, y el saldo después de cada operación.','La gráfica abarca 30 días. Las tarjetas de crédito muestran crédito disponible, corte y pago.','insights','.account-buttons'],
 ['Todo listo para empezar','A tu ritmo','Comienza agregando una cuenta y su saldo actual. Después registra tu primer movimiento.','Puedes repetir esta guía desde Configuración → Ver tutorial.','settings','#add-account']
];

export function openWelcome({finish, start, visit=()=>{}}) {
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
    const [title,label,body,tip,section,target]=steps[index];
    visit(section,target);
    dialog.innerHTML=`<div class="welcome-top"><span class="eyebrow">GUÍA DE INICIO</span><button type="button" id="welcome-skip">Omitir por ahora</button></div><p class="subtle" aria-live="polite">Paso ${index+1} de ${steps.length}</p><progress max="${steps.length}" value="${index+1}" aria-label="Progreso del tutorial"></progress><h2 id="welcome-title" tabindex="-1">${title}</h2><p class="welcome-label">${label}</p><p>${body}</p><aside>${tip}</aside><p role="alert"></p><div class="welcome-actions"><button type="button" id="welcome-back" ${index===0?'disabled':''}>Anterior</button><button type="button" class="primary" id="welcome-next">${index===steps.length-1?'Configurar mi cuenta':'Siguiente'}</button></div>`;
    dialog.querySelector('#welcome-skip').onclick=()=>close();
    dialog.querySelector('#welcome-back').onclick=()=>{index--;draw();};
    dialog.querySelector('#welcome-next').onclick=()=>{if(index===steps.length-1)close(true);else{index++;draw();}};
    dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  draw();dialog.show();dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});
}

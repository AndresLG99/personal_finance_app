export const needsWelcome = state => !state.onboarding?.dismissedAt && !['accounts','transactions','rules','payrolls'].some(key => state[key]?.length);

const steps = [
 ['Bienvenido a ZAXA Finance','Tu dinero, con claridad','Esta guía te lleva por las secciones de la app. Puedes usar la pantalla mientras lees y avanzar a tu ritmo.','Tus datos pertenecen a tu cuenta. La guía no crea movimientos ni cambia saldos.','insights','[data-screen="insights"] h1'],
 ['Primero, tus cuentas','Ajustes → Agregar cuenta','Agrega banco, efectivo, ahorro, tarjeta o préstamo. Indica el saldo inicial y su fecha, el modelo y el color de tu tarjeta.','Registra negativo lo que debes. En crédito, agrega límite, corte y pago. No dupliques movimientos ya incluidos en el saldo inicial.','ajustes','#add-account'],
 ['Comparte una cuenta','Editar cuenta → Compartir esta cuenta','Desde el formulario de cualquier cuenta puedes compartirla y generar un código; la otra persona lo usa en "Unirme con código" para verla también.','Una vez compartida, los movimientos nuevos de esa cuenta se agregan desde "Movimientos compartidos" (no desde el + normal), así ambos ven quién agregó cada uno.','ajustes','#join-shared-account'],
 ['Registra tu día a día','Botón + → Nuevo movimiento','Elige gasto, ingreso, transferencia, pago o compra a meses. Selecciona cuentas, fecha, categoría e importe.','Una transferencia mueve dinero entre tus propias cuentas, incluido retirar efectivo. El botón + siempre está a la mano, abajo en el celular y arriba en la barra lateral en escritorio.','movimientos','[data-action="new"]'],
 ['Planea y confirma','Insights → Próximos 30 días','Los realizados muestran hoy y los programados abarcan hoy a 30 días. Confirma lo programado cuando ocurra.','Al confirmar puedes ajustar fecha e importe de esa operación sin cambiar la recurrencia. Toca un movimiento para editarlo, duplicarlo o eliminarlo.','insights','#s-insights'],
 ['Repite sin capturar todo','Ajustes → Recurrentes','Programa gastos o ingresos por días, semanas, meses o años. Los ingresos recurrentes sirven para trabajos extra, rentas o apoyos.','Las nóminas tienen su propio registro: el líquido es el ingreso oficial y el desglose sirve para compararlo.','ajustes','#add-income-rule'],
 ['Consulta un día','Calendario y Saldos','Selecciona una fecha para ver los movimientos del día y el saldo real o proyectado de cada cuenta.','Lo programado aparece en la proyección, pero no significa que el dinero ya se haya movido.','calendario','#s-calendario'],
 ['Explora tus cuentas','Insights → Explorar mis cuentas','Selecciona una tarjeta para ver su historial completo, realizados y programados, y el saldo después de cada operación.','La gráfica de cada cuenta abarca 30 días. Las tarjetas de crédito muestran crédito disponible, corte y pago.','insights','.wallets'],
 ['Personaliza tu perfil','Ajustes → Mi cuenta','Agrega tu nombre, apellido, teléfono y una foto desde "Mi cuenta". Así te reconocen fácilmente en Movimientos compartidos.','También puedes cambiar tu contraseña desde ahí, sin cerrar sesión.','ajustes','#account-card'],
 ['A tu gusto','Ajustes → Apariencia','Elige modo claro, oscuro o seguir a tu sistema, y cualquier color de acentuación que prefieras.','Tu elección se guarda en este dispositivo.','ajustes','#appearance-card'],
 ['Todo listo para empezar','A tu ritmo','Comienza agregando una cuenta y su saldo actual. Después registra tu primer movimiento.','Puedes repetir esta guía desde Ajustes → Ver tutorial.','ajustes','#add-account']
];

// Punto 6 (2026-11-19): "spotlight" del recorrido guiado. Mientras la guía está abierta,
// todo lo que no sea el elemento del paso actual (ni la propia ventana del tutorial) se ve
// difuminado y oscurecido, para que la atención quede solo ahí — p. ej. en el paso del
// botón "+", solo ese botón y la ventana del tutorial quedan en foco.
//
// Un solo elemento fijo de pantalla completa (.welcome-spotlight) pinta el difuminado
// (backdrop-filter: blur, que difumina lo que hay DETRÁS suyo) y un tinte oscuro; el
// recorte de "agujero" sobre el objetivo se logra con un único clip-path: polygon(evenodd,
// …) cuyos puntos forman dos trazos cerrados — el rectángulo exterior y, dentro, el del
// objetivo — ya que polygon() no admite varios sub-trazos salvo con esta técnica (estándar
// para "agujeros" con clip-path). El área del agujero queda sin pintar: ahí se ve la app
// real, nítida, tal cual está detrás. Un segundo elemento (.welcome-spotlight-ring) dibuja
// un contorno sutil alrededor de ese agujero para remarcarlo.
//
// La posición se recalcula en un bucle de requestAnimationFrame mientras la guía esté
// abierta (no solo al cambiar de paso): así sigue al objetivo automáticamente durante la
// animación de scrollIntoView de visit(), un cambio de tamaño de ventana, o si el elemento
// tarda un instante en existir tras cambiar de pestaña — sin necesitar listeners para cada
// caso por separado.
const SPOTLIGHT_PAD = 10;
function visibleTarget(sel) {
  if (!sel) return null;
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function openWelcome({finish, start, visit=()=>{}}) {
  if(document.querySelector('#welcome')) return;
  const dialog=document.createElement('dialog');
  dialog.id='welcome'; dialog.className='welcome';
  dialog.setAttribute('aria-labelledby','welcome-title');
  const spotlight=document.createElement('div');
  spotlight.className='welcome-spotlight';spotlight.setAttribute('aria-hidden','true');
  const ring=document.createElement('div');
  ring.className='welcome-spotlight-ring';ring.setAttribute('aria-hidden','true');
  document.body.append(spotlight,ring,dialog);
  let index=0, saving=false, currentTarget=null, raf=null;
  const positionSpotlight=()=>{
    const el=visibleTarget(currentTarget);
    if(!el){spotlight.style.clipPath='none';ring.style.opacity='0';raf=requestAnimationFrame(positionSpotlight);return;}
    const r=el.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight;
    const x1=Math.max(0,r.left-SPOTLIGHT_PAD),y1=Math.max(0,r.top-SPOTLIGHT_PAD),x2=Math.min(vw,r.right+SPOTLIGHT_PAD),y2=Math.min(vh,r.bottom+SPOTLIGHT_PAD);
    spotlight.style.clipPath=`polygon(evenodd,0px 0px,${vw}px 0px,${vw}px ${vh}px,0px ${vh}px,0px 0px,${x1}px ${y1}px,${x2}px ${y1}px,${x2}px ${y2}px,${x1}px ${y2}px,${x1}px ${y1}px)`;
    ring.style.opacity='1';ring.style.left=x1+'px';ring.style.top=y1+'px';ring.style.width=(x2-x1)+'px';ring.style.height=(y2-y1)+'px';
    raf=requestAnimationFrame(positionSpotlight);
  };
  const cleanupSpotlight=()=>{if(raf)cancelAnimationFrame(raf);raf=null;spotlight.remove();ring.remove();};
  const close=async (setup=false)=>{
    if(saving)return; saving=true;
    dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try { await finish(); cleanupSpotlight(); dialog.close(); dialog.remove(); if(setup)start(); }
    catch(error){dialog.querySelector('[role=alert]').textContent='No se pudo guardar el avance. '+error.message; saving=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);dialog.querySelector('#welcome-back').disabled=index===0;}
  };
  const draw=()=>{
    const [title,label,body,tip,section,target]=steps[index];
    currentTarget=target;
    visit(section,target);
    dialog.innerHTML=`<div class="welcome-top"><span class="eyebrow">GUÍA DE INICIO</span><button type="button" id="welcome-skip">Omitir por ahora</button></div><p class="subtle" aria-live="polite">Paso ${index+1} de ${steps.length}</p><progress max="${steps.length}" value="${index+1}" aria-label="Progreso del tutorial"></progress><h2 id="welcome-title" tabindex="-1">${title}</h2><p class="welcome-label">${label}</p><p>${body}</p><aside>${tip}</aside><p role="alert"></p><div class="welcome-actions"><button type="button" id="welcome-back" ${index===0?'disabled':''}>Anterior</button><button type="button" class="primary" id="welcome-next">${index===steps.length-1?'Configurar mi cuenta':'Siguiente'}</button></div>`;
    dialog.querySelector('#welcome-skip').onclick=()=>close();
    dialog.querySelector('#welcome-back').onclick=()=>{index--;draw();};
    dialog.querySelector('#welcome-next').onclick=()=>{if(index===steps.length-1)close(true);else{index++;draw();}};
    dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  draw();dialog.show();dialog.scrollTop=0;dialog.querySelector('h2').focus({preventScroll:true});
  raf=requestAnimationFrame(positionSpotlight);
}

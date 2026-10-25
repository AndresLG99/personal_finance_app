// Suite de pruebas de humo para correr ANTES de cualquier commit/push.
// No requiere Supabase: sirve un config.js vacío (modo demo con datos de ejemplo).
//
// Uso:
//   node tests/pre-push-check.mjs [URL_BASE]
//   (por defecto usa http://127.0.0.1:8901/index.html — levanta tu propio server
//    estático con config.js vacío apuntando a esa URL antes de correr este script)
//
// Esta lista crece cada vez que se reporta y corrige un bug real de la app:
// cada bug nuevo debería añadir aquí la prueba que lo habría detectado.
//
// Historial de bugs cubiertos:
// - 2026-10-13: el botón de lápiz/basura en "Costos recurrentes", nóminas y
//   movimientos (duplicar/eliminar) no funcionaba: transaction-actions.js
//   generaba atributos data-edit/data-duplicate/data-rule-edit en vez de
//   data-action + data-id, que es lo que escucha el delegador de clics en
//   app.js. Ver pruebas "icon-action: *".
// - 2026-10-13: en escritorio, los chips de cuenta en la pestaña Movimientos
//   se cortaban contra el borde y no había forma de hacer scroll horizontal
//   (sin barra visible, sin soporte de mouse). .wallets ya tenía el ajuste
//   de "envolver en vez de hacer scroll" para escritorio pero .chips no lo
//   tenía. Ver prueba "escritorio ancho: los chips de cuenta envuelven...".
// - 2026-10-13: shortDate() (usado en "Se liquida", "Saldo más bajo" y el
//   resumen de salud financiera) mostraba el mes en minúsculas y sin año,
//   p. ej. "3 abr". Corregido a "3 Abr 2027".
// - 2026-10-13: dayLabel() (usado en Historial de cuenta, "Próximos 30
//   días" y agrupadores de Movimientos) tenía el mismo problema al cruzar
//   de mes: "Domingo 1 de nov" en vez de "Domingo 1 de Nov 2026". También
//   se agregó el año al encabezado de mes de Calendario (monthName →
//   monthYear), que nunca lo mostraba. Regla general: toda fecha que
//   muestre su mes debe llevar mayúscula inicial y año — ver pruebas
//   "shortDate" y "dayLabel" más abajo.
// - 2026-10-13: las tarjetas de cuenta ("Explorar mis cuentas" en Insights,
//   "Saldos" en Calendario, "Mis cuentas" en Ajustes) se mostraban todas en
//   una sola fila, sin separar cuentas líquidas, deudas y cuentas por
//   cobrar. Se agregó accountGroupSections() en account-groups.js (reusando
//   las divisiones ya definidas ahí: Líquido = débito/efectivo/ahorro/
//   vales, Deudas = tarjetas de crédito/deudas por pagar, Por cobrar =
//   préstamos por cobrar) y se usó en las tres secciones. Ver pruebas
//   "separa las tarjetas en divisiones Líquido / Deudas / Por cobrar".
// - 2026-10-15: en una laptop real se veía la versión móvil en vez de la de
//   escritorio. interface.css activaba el layout de escritorio con
//   "min-width:860px and min-height:700px", y muchas laptops con escalado
//   de Windows (125%/150%) o con la barra de marcadores visible terminan
//   con menos de 700px de alto disponible aunque sean una laptop normal.
//   Se cambió la condición de alto por tipo de puntero: "hover:hover and
//   pointer:fine" (mouse/trackpad) en vez de min-height, que distingue
//   laptop de celular/tablet táctil sin depender de cuánto mida la
//   ventana. Ver pruebas "laptop ancha con poca altura..." (debe verse
//   escritorio) y "celular en horizontal...pantalla táctil" (debe seguir
//   viéndose móvil, ahora emulando una pantalla táctil de verdad).
// - 2026-10-15: en Movimientos, los gastos se mostraban en el mismo color
//   que los ingresos (faltaba la clase CSS "neg" en el monto), tanto en la
//   lista de movimientos como en el historial de cuenta. Se agregó la
//   clase "neg" en txAmount() y en la fila de historial de vAccount. Ver
//   prueba "color de montos: gasto se ve en rojo (clase neg)".
// - 2026-10-15: la app dependía en tiempo de ejecución de un CDN externo
//   (esm.sh) para cargar el SDK de Supabase; con conexión lenta o
//   inestable (datos móviles) esto podía fallar o tardar demasiado sin dar
//   ningún mensaje, dejando la pantalla en negro. Se vendorizó el SDK como
//   vendor/supabase.umd.js (cargado antes de app.js con <script defer>) y
//   se agregó un watchdog de arranque en index.html que, si la app no
//   renderiza en 12s, muestra un mensaje de error con botón de reintentar.
//   Ver pruebas "no depende de esm.sh para cargar Supabase" y "si la app
//   no carga en 12s, se muestra el mensaje de reintentar".
// - 2026-10-15: el historial de una cuenta (p. ej. Nu Credit) se limitaba
//   a los últimos 25 movimientos con .slice(0,25), ocultando movimientos
//   más antiguos sin ningún aviso. Se quitó el límite en vAccount. Ver
//   prueba "historial de cuenta no se corta a 25 movimientos".
// - 2026-10-15: en Movimientos → Programados, cuando una fila de
//   transacción mostraba también el botón de acción (lápiz/basura), el
//   flexbox se saturaba y la descripción/concepto se colapsaba a 0px de
//   ancho (invisible). Se ajustó interface.css para que la fila envuelva y
//   el botón se vaya a su propia línea en vez de aplastar la descripción.
//   Ver prueba "Programados: la descripción no se colapsa cuando hay
//   botón de acción".
// - 2026-10-15: la corrección del historial sin tope de 25 solo se había probado con
//   la tarjeta de ejemplo; como el fix es genérico (no depende del tipo de cuenta), se
//   agregó una prueba explícita con una cuenta de débito para confirmarlo también ahí.
//   Ver prueba "cuenta de débito (no tarjeta): el Historial también muestra todo".
// - 2026-10-15: varias listas de movimientos —los "Próximos 30 días" del dashboard de
//   Insights y el Historial dentro del detalle de una cuenta— solo dejaban editar el
//   movimiento tocando la fila entera, sin los botones de duplicar/eliminar que sí
//   tenían Movimientos y Calendario. Se agregó transactionActions() en esos lugares
//   (y un id #proximos-list para poder probarlo sin ambigüedad). Ver pruebas
//   "Próximos 30 días: cada movimiento tiene botones..." y "Historial: cada
//   movimiento tiene botones...".
// - 2026-10-15: al asignar un gasto de tarjeta a un pago programado, la opción
//   automática elegía siempre el pago pendiente más próximo, sin importar si ese pago
//   correspondía al ciclo de facturación correcto del gasto (el gasto podía quedar
//   sumado a un pago de un periodo distinto). Se agregó billingWindow() en finance.js:
//   calcula el corte (con el ajuste de fin de semana) al que pertenece la fecha del
//   gasto y la fecha de pago correspondiente; si ya existe un pago programado en esa
//   ventana se suma ahí, si no, se crea uno nuevo automáticamente. Ver pruebas
//   "billingWindow(): ..." y "Asignar gasto a un pago: con corte=22/pago=5...".
// - 2026-10-15: las cuentas de Deudas o Por cobrar que ya se saldaron (saldo 0 al día de
//   hoy) seguían mostrándose en "Explorar mis cuentas" (Insights), "Saldos" (Calendario) y
//   los chips de cuenta de Movimientos, mezcladas con las cuentas activas. Se agregaron
//   isSettled()/visibleAccounts() en finance.js y se usan en esas tres vistas para
//   ocultarlas; Ajustes → Mis cuentas sigue mostrando todas las cuentas (para poder
//   administrarlas) y las cuentas de Líquido nunca se ocultan por esta regla. Ver pruebas
//   "...oculta la cuenta de Deudas ya saldada (0)" y "...NO oculta una cuenta de Líquido
//   con saldo 0...".
// - 2026-10-18: lote de 5 ajustes solicitados juntos.
//   1) Se quitaron los botones de ícono siempre visibles (duplicar/eliminar) de la fila de
//      movimiento (Movimientos, Próximos 30 días del dashboard, Próximos 30 días de una
//      cuenta e Historial de una cuenta) y se reemplazaron por el gesto de deslizar estilo
//      iOS: swipeRow() en transaction-actions.js envuelve la fila y un bloque de Pointer
//      Events con delegación en document (app.js) maneja el arrastre con eje bloqueado
//      (6px de umbral, horizontal vs. vertical) para no interferir con el scroll de la
//      lista. Deslizar a la izquierda revela "Eliminar" (ancla a la derecha, open-right) y
//      a la derecha revela "Duplicar" (ancla a la izquierda, open-left). Al implementarlo
//      aparecieron dos bugs que se corrigieron antes de probar nada: (a) envolver la fila
//      en un div extra rompía el divisor entre filas, porque el elemento interno se volvía
//      ":last-child" trivial de su propio envoltorio — se movió esa regla a .swipe-row y se
//      canceló el borde propio del elemento interno; (b) el listener de "tocar fuera para
//      cerrar" no excluía los clics en los botones revelados, así que tocar "Duplicar"/
//      "Eliminar" nunca llegaba a disparar la acción. Ya con eventos de puntero confirmados
//      (pointerdown/pointermove/pointerup se disparaban bien), un tercer bug seguía
//      impidiendo que la fila quedara abierta: el "click" que el navegador dispara justo
//      después de soltar el arrastre (mismo gesto) llegaba también al listener de "tocar
//      fuera" y cerraba de inmediato la fila que el propio arrastre acababa de abrir. Se
//      agregó swipeSuppressClick, una bandera que absorbe ese click cuando el gesto tuvo
//      movimiento real. Ver pruebas "Movimientos: deslizar..." y "...swipe-row con
//      Duplicar/Eliminar...".
//   2) El botón "Confirmar" ahora muestra solo un ícono de check (clase icon-confirm) en vez
//      del texto "Confirmar", para ocupar menos espacio; conserva aria-label/title
//      descriptivos. Ver prueba "...ya no muestra el texto Confirmar...".
//   3) Al confirmar un movimiento programado, el campo de fecha ahora se precarga con la
//      fecha de HOY (el día en que se confirma) en vez de la fecha original con la que se
//      programó, porque a veces se confirma adelantado o atrasado. Ver prueba "Confirmar un
//      movimiento programado precarga la fecha de HOY...".
//   4) El formulario de cuenta ahora ofrece USD y EUR además de MXN/CAD. El formateo
//      (Intl.NumberFormat) y las cotizaciones (exchange.js, frankfurter.dev) ya eran
//      genéricos por divisa, así que no necesitaron cambios. Ver prueba "...ofrece MXN,
//      CAD, USD y EUR...".
//   5) Las cuentas de Deudas/Por cobrar ya saldadas (ver bug de 2026-10-15 arriba) se
//      ocultan de las pantallas principales pero deben seguir pudiendo elegirse al
//      registrar un "Nuevo movimiento", porque pueden volver a usarse y tener saldo de
//      nuevo. No hizo falta cambiar código: opts() (los <select> de cuenta en los
//      formularios de movimiento) nunca filtró por isSettled()/visibleAccounts(), así que
//      ya se comportaba así; se agregó la prueba de regresión para dejarlo fijo. Ver prueba
//      '"Nuevo movimiento" SÍ permite elegir una cuenta de Deudas ya saldada...'.
// - 2026-10-19: el gesto de deslizar del punto 1 de arriba (2026-10-18) funcionaba igual con
//   mouse que con touch porque usa Pointer Events sin distinguir el tipo — en escritorio
//   (mouse/trackpad real) eso significa arrastrar la fila con el mouse para ver
//   duplicar/eliminar, un gesto que nadie espera ni tiene ninguna pista visual ahí. Se
//   agregó isDesktopPointer() en app.js (mismo breakpoint que ya usa el layout de
//   escritorio: "min-width:860px and hover:hover and pointer:fine") que desactiva el
//   gesto de deslizar en ese caso; interface.css reordena con flex para que los botones
//   aparezcan como botones normales al final de la fila al pasar el mouse (hover) o
//   enfocarlos con teclado (focus-within), igual que cualquier lista de escritorio. El
//   deslizar sigue intacto en móvil/táctil. Ver pruebas "Escritorio: los botones de
//   duplicar/eliminar están ocultos hasta pasar el mouse..." y las demás del mismo bloque.
// - 2026-10-24: lote de 4 pedidos juntos.
//   1) Recuperar contraseña: accessForm() ahora muestra "¿Olvidaste tu contraseña?" (solo en
//      inicio de sesión, no en registro), que abre forgotPasswordForm() y llama a
//      client.auth.resetPasswordForEmail() con un aviso genérico (no revela si el correo
//      existe). Al volver del enlace del correo, Supabase dispara el evento
//      PASSWORD_RECOVERY (ya escuchado en onAuthStateChange), que ahora abre
//      newPasswordForm() y llama a client.auth.updateUser() para fijar la nueva contraseña.
//      El modo demo de este archivo de pruebas (SUPABASE_URL vacío) nunca muestra la
//      pantalla de inicio de sesión, así que esta prueba sirve su propio config.js y
//      vendor/supabase.umd.js falsos (un cliente de Supabase simulado) solo para este
//      bloque. Ver pruebas "...¿Olvidaste tu contraseña?..." y las demás del mismo bloque.
//   2) MSI: cambiar el importe total de una compra a meses sin intereses ya existente
//      lanzaba un error bloqueante. Ahora transactionForm() reparte el importe nuevo menos
//      lo ya pagado entre las mensualidades pendientes (las confirmadas no se tocan). Ver
//      pruebas "MSI: cambiar el importe total...".
//   3) MSI: al editar una mensualidad programada, además de la cuenta de origen/destino
//      (ya soportado), ahora también puede elegirse si el cambio de importe aplica solo a
//      esa mensualidad o a esa y las siguientes pendientes — reusando el "scope" que ya
//      existía para reglas recurrentes (saveTransactionEdit() en finance.js), con la
//      etiqueta aclarada a "Este y los siguientes pagos pendientes". Bug encontrado y
//      corregido mientras se escribía esta prueba: cada mensualidad lleva su número de
//      cuota pegado al concepto ("Compra · 2/4"); al propagar el concepto con scope=future,
//      se copiaba completo (con el número de la cuota editada) a las demás, así que todas
//      terminaban mostrando el mismo número. Se corrigió para propagar solo el nombre base
//      y conservar el número de cuota de cada una. Ver pruebas "Editar la cuota 2/4 con
//      scope future...".
//   4) Se agregó la opción de eliminar una cuenta por completo desde su formulario en
//      Ajustes (antes solo se podía archivar). removeAccount()/accountRefs() en finance.js
//      bloquean la eliminación si la cuenta tiene movimientos, reglas recurrentes o metas
//      asociadas (para no perder ese historial ni dejar referencias rotas) y en ese caso
//      ofrecen archivarla en su lugar; sin ninguna referencia, se elimina de verdad. Ver
//      pruebas "Eliminar una cuenta CON movimientos..." y "...SIN referencias...".
// - 2026-10-24 (2): lote de 2 pedidos juntos.
//   1) Más colores para las tarjetas de cuenta (de 9 a 20, sin renombrar los que ya existían,
//      para no romper cuentas ya guardadas) con un selector visual estilo el de Excel —
//      colorField()/bindColorField() en app.js reemplazan el <select> de texto por un botón
//      "Automático" + una cuadrícula de muestras — y cada color se pinta con un degradado de
//      3 paradas (clara/base/oscura) en vez de un color plano, para dar sensación de
//      profundidad (ver las clases .w-* en interface.css). Ver pruebas "...cuadrícula con al
//      menos 15 colores..." y las demás del mismo bloque.
//   2) En todas las vistas donde aparecen las tarjetas de cuenta (Insights → "Explorar mis
//      cuentas", Calendario → "Saldos", Ajustes → "Mis cuentas"), dentro de cada división ya
//      existente (Líquido/Deudas/Por cobrar) las tarjetas ahora se agrupan por el color de la
//      tarjeta y se ordenan de mayor a menor monto (en valor absoluto): primero los grupos de
//      color con más monto acumulado, y dentro de cada color, la cuenta de mayor monto
//      primero. accountGroupSections() en account-groups.js recibe ahora una función
//      amountFor(a) (cardAmount() en app.js, compartida con walletCard() para usar siempre el
//      mismo número) y hace el agrupado/orden antes de repartir cada división en divs. Ver
//      pruebas "...se agrupan por color y se ordenan de mayor a menor monto" (una por cada
//      vista).

import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8901/index.html';
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const consoleErrors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('404')) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  const tap = async (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) throw new Error('not found: ' + s);
      el.click();
    }, sel);
  const exists = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
  const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
  const closeSheet = async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  };

  // ---------- Carga inicial ----------
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('la app carga sin pantalla en blanco', await exists('.app'));

  // ---------- Navegación entre pestañas, sin errores de consola ----------
  for (const tabId of ['movimientos', 'calendario', 'ajustes', 'estrategia', 'insights']) {
    await tap(`.tabbar [data-tab="${tabId}"]`);
    await page.waitForTimeout(300);
  }
  check('sin errores de consola tras navegar las 5 pestañas', consoleErrors.length === 0, consoleErrors.join(' | '));

  // ---------- Botones de operadores del teclado de importes ----------
  await tap('.tabbar [data-tab="ajustes"]');
  await page.waitForTimeout(300);
  await tap('#add-rule');
  await page.waitForTimeout(400);
  check('el formulario de regla recurrente abre (hoja visible)', await exists('body.sheet-open'));
  const amountSel = 'input[aria-label="Importe por pago"]';
  check('el campo de importe tiene teclado de operadores', await exists(amountSel + ' ~ .money-ops, label:has(' + amountSel + ') .money-ops'));
  await page.fill(amountSel, '100');
  const opsLabel = await page.evaluate((s) => {
    const input = document.querySelector(s);
    const label = input?.closest('label');
    return !!label?.querySelector('.money-ops .op-btn');
  }, amountSel);
  if (opsLabel) {
    await page.evaluate((s) => {
      const input = document.querySelector(s);
      const label = input.closest('label');
      const plus = [...label.querySelectorAll('.money-ops .op-btn')].find((b) => b.textContent.includes('+'));
      plus.click();
    }, amountSel);
    await page.type(amountSel, '50');
    await page.evaluate((s) => document.querySelector(s).blur(), amountSel);
    await page.waitForTimeout(150);
    const val = await page.evaluate((s) => document.querySelector(s).value, amountSel);
    check('operador "+" en el teclado de importes calcula correctamente (100+50=$150.00)', val === '$150.00', 'valor obtenido: ' + val);
  } else {
    check('operador "+" en el teclado de importes calcula correctamente (100+50=$150.00)', false, 'no se encontraron botones .op-btn');
  }

  // Completa el resto del formulario y guarda, para poder probar editar/eliminar después.
  await page.fill('[name=concept]', 'Prueba automática de regla');
  await page.evaluate(() => {
    const sel = document.querySelector('[name=from]');
    if (sel && sel.options.length) sel.selectedIndex = 0;
  });
  await tap('#save');
  await page.waitForTimeout(500);
  check('guardar la regla recurrente cierra la hoja sin error', !(await exists('body.sheet-open')), await text('#error'));

  // ---------- Regresión: botones de ícono (lápiz/basura) en Costos recurrentes ----------
  const ruleEditBtn = 'button[data-action="rule-edit"]';
  const ruleDeleteBtn = 'button[data-action="rule-delete"]';
  check('existe el botón de editar (lápiz) en la regla recién creada', await exists(ruleEditBtn));
  if (await exists(ruleEditBtn)) {
    await tap(ruleEditBtn);
    await page.waitForTimeout(400);
    check('icon-action: el lápiz de "Costos recurrentes" SÍ abre el formulario de edición', await exists('body.sheet-open'), await text('#modal-title'));
    const conceptVal = await page.evaluate(() => document.querySelector('[name=concept]')?.value);
    check('icon-action: el formulario de edición trae el concepto precargado', conceptVal === 'Prueba automática de regla', 'valor: ' + conceptVal);
    await closeSheet();
  }
  if (await exists(ruleDeleteBtn)) {
    await tap(ruleDeleteBtn);
    await page.waitForTimeout(400);
    check('icon-action: la basura de "Costos recurrentes" SÍ abre la confirmación de eliminar', await exists('body.sheet-open') && /Eliminar/i.test(await text('#modal-title') || ''), await text('#modal-title'));
    await closeSheet();
  }

  // ---------- Regresión (2026-10-18): deslizar (estilo iOS) revela duplicar/eliminar ----------
  // Los botones de ícono siempre visibles (duplicar/eliminar) se quitaron de la fila de
  // movimiento para darle más espacio al texto. En su lugar: deslizar hacia la izquierda
  // revela "Eliminar" (ancla a la derecha, clase open-right) y hacia la derecha revela
  // "Duplicar" (ancla a la izquierda, clase open-left). Ver swipeRow() en
  // transaction-actions.js y el bloque de gestos con Pointer Events en app.js.
  //
  // Bug encontrado y corregido mientras se implementaba esta prueba: el "click" que el
  // navegador dispara justo después de soltar el arrastre (mouseup) llegaba al listener de
  // "tocar fuera para cerrar" y cerraba de inmediato la fila que el propio arrastre acababa
  // de abrir. Se agregó una bandera (swipeSuppressClick) que absorbe ese click cuando el
  // gesto tuvo movimiento real, para no deshacer lo que el gesto acaba de hacer.
  await tap('.tabbar [data-tab="movimientos"]');
  await page.waitForTimeout(400);
  check(
    'Movimientos: ya no hay botones de duplicar/eliminar siempre visibles en la fila',
    !(await exists('#mov-list .icon-action, #mov-list .transaction-actions'))
  );

  const dragSwipeRow = async (rowSel, dxTarget) => {
    const rect = await page.evaluate((s) => {
      const r = document.querySelector(s);
      if (!r) return null;
      const rc = r.getBoundingClientRect();
      return { x: rc.x, y: rc.y, width: rc.width, height: rc.height };
    }, rowSel);
    if (!rect) return false;
    const cy = rect.y + rect.height / 2;
    const startX = rect.x + rect.width / 2;
    await page.mouse.move(startX, cy);
    await page.mouse.down();
    await page.mouse.move(startX + dxTarget * 0.5, cy, { steps: 5 });
    await page.mouse.move(startX + dxTarget, cy, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    return true;
  };
  const rowClass = (sel) => page.evaluate((s) => document.querySelector(s)?.className || null, sel);
  // Cierra cualquier fila abierta tocando fuera de ella (el mismo gesto que un usuario real
  // haría), para que el siguiente arrastre de la prueba empiece desde cero (base=0).
  const closeOpenSwipeRows = async () => {
    await page.evaluate(() => {
      const h = document.querySelector('#s-movimientos h1') || document.body;
      h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 2, clientY: 2, pointerId: 999 }));
      h.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 2, clientY: 2, pointerId: 999 }));
    });
    await page.waitForTimeout(100);
  };

  const movRowSel = '#mov-list .swipe-row';
  if (await exists(movRowSel)) {
    await dragSwipeRow(movRowSel, -90);
    const openRight = ((await rowClass(movRowSel)) || '').includes('open-right');
    check('Movimientos: deslizar una fila hacia la izquierda revela "Eliminar" (open-right)', openRight, await rowClass(movRowSel));
    if (openRight) {
      await tap(movRowSel + ' .swipe-btn.delete');
      await page.waitForTimeout(400);
      check(
        'Movimientos: tocar "Eliminar" tras deslizar SÍ abre la confirmación',
        (await exists('body.sheet-open')) && /Eliminar/i.test((await text('#modal-title')) || ''),
        await text('#modal-title')
      );
      await closeSheet();
    } else {
      check('Movimientos: tocar "Eliminar" tras deslizar SÍ abre la confirmación', false, 'la fila no quedó abierta (open-right)');
    }
    await closeOpenSwipeRows();

    await dragSwipeRow(movRowSel, 90);
    const openLeft = ((await rowClass(movRowSel)) || '').includes('open-left');
    check('Movimientos: deslizar una fila hacia la derecha revela "Duplicar" (open-left)', openLeft, await rowClass(movRowSel));
    if (openLeft) {
      await tap(movRowSel + ' .swipe-btn.duplicate');
      await page.waitForTimeout(400);
      check('Movimientos: tocar "Duplicar" tras deslizar SÍ abre el formulario', await exists('body.sheet-open'), await text('#modal-title'));
      await closeSheet();
    } else {
      check('Movimientos: tocar "Duplicar" tras deslizar SÍ abre el formulario', false, 'la fila no quedó abierta (open-left)');
    }
    await closeOpenSwipeRows();

    // El click que termina el propio gesto de arrastre no debe interpretarse como un toque:
    // no debe volver a cerrar la fila ni disparar "editar" por accidente (el bug de arriba).
    await dragSwipeRow(movRowSel, -90);
    await page.waitForTimeout(250);
    const staysOpenAfterDrag = ((await rowClass(movRowSel)) || '').includes('open-right');
    check(
      'Movimientos: tras soltar el arrastre, la fila NO se cierra sola (el click final del gesto no cuenta como "tocar fuera")',
      staysOpenAfterDrag
    );
    check('Movimientos: ese mismo arrastre no abrió por accidente el formulario de editar', !(await exists('body.sheet-open')));

    // Tocar (sin arrastrar) el contenido de una fila ya abierta debe cerrarla, sin abrir "editar".
    await page.evaluate((s) => {
      const row = document.querySelector(s);
      const content = row.lastElementChild;
      const rc = content.getBoundingClientRect();
      const x = rc.x + rc.width / 2,
        y = rc.y + rc.height / 2;
      content.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 77 }));
      content.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 77 }));
      content.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    }, movRowSel);
    await page.waitForTimeout(150);
    const closedAfterTap = !((await rowClass(movRowSel)) || '').match(/open-(left|right)/);
    check(
      'Movimientos: tocar (sin arrastrar) una fila ya abierta la cierra sin disparar "editar"',
      closedAfterTap && !(await exists('body.sheet-open'))
    );
  } else {
    check('Movimientos: deslizar una fila hacia la izquierda revela "Eliminar" (open-right)', false, 'no hay movimientos de ejemplo para probar');
    check('Movimientos: deslizar una fila hacia la derecha revela "Duplicar" (open-left)', false, 'no hay movimientos de ejemplo para probar');
  }

  // ---------- Regresión (2026-10-19): en escritorio, hover en vez de deslizar ----------
  // Pedido: el deslizar queda solo para móvil/táctil; en escritorio (mouse/trackpad real)
  // los botones de duplicar/eliminar deben verse como botones normales al pasar el mouse
  // (hover) o al enfocarlos con teclado, porque arrastrar una fila con el mouse no es un
  // gesto descubrible ahí. isDesktopPointer() en app.js desactiva el gesto de deslizar en
  // ese caso (mismo breakpoint que el layout de escritorio: "min-width:860px and
  // hover:hover and pointer:fine"); interface.css reordena con flex para mostrarlos al
  // final de la fila, ocultos hasta :hover/:focus-within.
  {
    const deskPage = await context.newPage();
    await deskPage.setViewportSize({ width: 1280, height: 900 });
    await deskPage.goto(BASE, { waitUntil: 'networkidle' });
    await deskPage.waitForTimeout(700);
    await deskPage.evaluate(() => document.querySelector('.side-tab[data-tab="movimientos"]').click());
    await deskPage.waitForTimeout(400);
    const deskRowSel = '#mov-list .swipe-row';

    const hiddenState = await deskPage.evaluate((s) => {
      const actions = [...document.querySelectorAll(s + ' .swipe-actions')];
      if (!actions.length) return null;
      return actions.map((a) => {
        const cs = getComputedStyle(a);
        return { opacity: cs.opacity, pointerEvents: cs.pointerEvents };
      });
    }, deskRowSel);
    check(
      'Escritorio: los botones de duplicar/eliminar están ocultos hasta pasar el mouse (hover)',
      !!hiddenState && hiddenState.every((a) => a.opacity === '0' && a.pointerEvents === 'none'),
      JSON.stringify(hiddenState)
    );

    // Arrastrar la fila con el mouse NO debe abrirla: el gesto de deslizar está desactivado.
    const deskRect = await deskPage.evaluate((s) => {
      const r = document.querySelector(s);
      const rc = r.getBoundingClientRect();
      return { x: rc.x, y: rc.y, width: rc.width, height: rc.height };
    }, deskRowSel);
    const deskCy = deskRect.y + deskRect.height / 2;
    const deskStartX = deskRect.x + deskRect.width / 2;
    await deskPage.mouse.move(deskStartX, deskCy);
    await deskPage.mouse.down();
    await deskPage.mouse.move(deskStartX - 45, deskCy, { steps: 5 });
    await deskPage.mouse.move(deskStartX - 90, deskCy, { steps: 5 });
    await deskPage.mouse.up();
    await deskPage.waitForTimeout(150);
    const classAfterDrag = await deskPage.evaluate((s) => document.querySelector(s)?.className, deskRowSel);
    check(
      'Escritorio: arrastrar una fila con el mouse NO la abre (el gesto de deslizar está desactivado ahí)',
      !/open-(left|right)/.test(classAfterDrag || ''),
      classAfterDrag
    );
    // El mouseup del arrastre puede terminar como un click normal sobre el contenido
    // (editar); eso es aparte de lo que se prueba aquí, así que se cierra si se abrió.
    if (await deskPage.evaluate(() => document.body.classList.contains('sheet-open'))) {
      await deskPage.keyboard.press('Escape');
      await deskPage.waitForTimeout(300);
    }

    // Al pasar el mouse sobre la fila, los botones se vuelven visibles y funcionan.
    await deskPage.hover(deskRowSel);
    await deskPage.waitForTimeout(150);
    const hoverState = await deskPage.evaluate((s) => {
      const a = document.querySelector(s + ' .swipe-actions.action-right');
      if (!a) return null;
      const cs = getComputedStyle(a);
      return { opacity: cs.opacity, pointerEvents: cs.pointerEvents };
    }, deskRowSel);
    check(
      'Escritorio: al pasar el mouse sobre la fila, los botones de duplicar/eliminar se vuelven visibles',
      !!hoverState && hoverState.opacity === '1' && hoverState.pointerEvents === 'auto',
      JSON.stringify(hoverState)
    );
    await deskPage.click(deskRowSel + ' .swipe-btn.delete');
    await deskPage.waitForTimeout(400);
    const deskModalTitle = await deskPage.evaluate(() => document.getElementById('modal-title')?.textContent);
    check(
      'Escritorio: tocar "Eliminar" (revelado por hover) SÍ abre la confirmación',
      (await deskPage.evaluate(() => document.body.classList.contains('sheet-open'))) && /Eliminar/i.test(deskModalTitle || ''),
      deskModalTitle
    );
    await deskPage.keyboard.press('Escape');
    await deskPage.waitForTimeout(300);
    await deskPage.close();
  }

  // ---------- Formato de fechas: mes con mayúscula inicial + año, SIEMPRE ----------
  // Regla general del proyecto: cualquier fecha que se muestre con su mes debe
  // llevar el mes con mayúscula inicial y el año (p. ej. "3 Abr 2027",
  // "Domingo 1 de Dic 2026"), nunca en minúsculas ni sin año.
  // Programa un pago, con fecha a dos meses en el futuro, que liquide por
  // completo la tarjeta de ejemplo — así probamos "Se liquida" (shortDate)
  // y el renglón del Historial (dayLabel) con una fecha real.
  const futureDate = (() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 2, 1);
    return d.toISOString().slice(0, 10);
  })();
  await tap('.fab[data-action="new"]');
  await page.waitForTimeout(400);
  await page.selectOption('[name=kind]', 'payment');
  await page.waitForTimeout(400);
  await page.fill('[name=concept]', 'Pago de prueba automática');
  await page.selectOption('[name=from]', 'bank');
  await page.selectOption('[name=status]', 'pending');
  await page.fill('[name=date]', futureDate);
  await page.fill('input[aria-label="Importe"]', '10000');
  await page.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
  await tap('#save');
  await page.waitForTimeout(500);
  check('se puede programar un pago que liquide la tarjeta (preparación de las pruebas siguientes)', !(await exists('body.sheet-open')), await text('#error'));

  await tap('.tabbar [data-tab="insights"]');
  await page.waitForTimeout(400);
  const creditWallet = '.wallet[data-id="credit"]';
  if (await exists(creditWallet)) {
    await tap(creditWallet);
    await page.waitForTimeout(500);
    const liquidaText = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('#push-content .card.tight .label')];
      const label = labels.find((l) => l.textContent.trim() === 'Se liquida');
      return label ? label.nextElementSibling?.textContent.trim() : null;
    });
    const shortDatePattern = /^\d{1,2} [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \d{4}$/;
    check(
      '"Se liquida" (shortDate) muestra el mes con mayúscula inicial y el año (p. ej. "3 Abr 2027")',
      !!liquidaText && shortDatePattern.test(liquidaText),
      'valor obtenido: ' + liquidaText
    );

    const historyRowText = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#push-content .list .tx')];
      const row = rows.find((r) => r.querySelector('.t1')?.textContent.trim() === 'Pago de prueba automática');
      return row ? row.querySelector('.t2')?.textContent.trim() : null;
    });
    const dayLabelPattern = /de [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \d{4}/;
    check(
      'el Historial de la cuenta (dayLabel) muestra el mes con mayúscula inicial y el año (p. ej. "Domingo 1 de Dic 2026")',
      !!historyRowText && dayLabelPattern.test(historyRowText),
      'valor obtenido: ' + historyRowText
    );

    await tap('[data-action="pop"]');
    await page.waitForTimeout(300);
  } else {
    check('"Se liquida" (shortDate) muestra el mes con mayúscula inicial y el año (p. ej. "3 Abr 2027")', false, 'no se encontró la tarjeta de crédito de ejemplo');
    check('el Historial de la cuenta (dayLabel) muestra el mes con mayúscula inicial y el año (p. ej. "Domingo 1 de Dic 2026")', false, 'no se encontró la tarjeta de crédito de ejemplo');
  }

  // ---------- Regresión: las tarjetas de cuenta se agrupan en Líquido / Deudas / Por cobrar ----------
  // "Explorar mis cuentas" (Insights), "Saldos" (Calendario) y "Mis cuentas"
  // (Ajustes) mostraban todas las cuentas en una sola fila sin distinguir
  // entre cuentas líquidas, deudas y cuentas por cobrar. Ahora cada una
  // separa sus tarjetas con un encabezado por división.
  const groupsIn = async (containerSel) =>
    page.evaluate((sel) => {
      const groups = [...document.querySelectorAll(sel + ' .account-group')];
      return groups.map((g) => ({
        label: g.querySelector('.account-group-label')?.textContent.trim() || null,
        ids: [...g.querySelectorAll('.wallet')].map((w) => w.dataset.id),
      }));
    }, containerSel);
  const checkGrouping = (name, groups) => {
    const liquido = groups.find((g) => g.label === 'Líquido');
    const deudas = groups.find((g) => g.label === 'Deudas');
    check(
      name,
      !!liquido &&
        liquido.ids.includes('bank') &&
        liquido.ids.includes('cash') &&
        !!deudas &&
        deudas.ids.includes('credit') &&
        groups.indexOf(liquido) < groups.indexOf(deudas),
      JSON.stringify(groups)
    );
  };

  await tap('.tabbar [data-tab="insights"]');
  await page.waitForTimeout(400);
  checkGrouping(
    'Insights: "Explorar mis cuentas" separa las tarjetas en divisiones Líquido / Deudas / Por cobrar',
    await groupsIn('#s-insights')
  );

  await tap('.tabbar [data-tab="calendario"]');
  await page.waitForTimeout(400);
  checkGrouping(
    'Calendario: "Saldos" separa las tarjetas en divisiones Líquido / Deudas / Por cobrar',
    await groupsIn('#s-calendario')
  );

  await tap('.tabbar [data-tab="ajustes"]');
  await page.waitForTimeout(400);
  checkGrouping(
    'Ajustes: "Mis cuentas" separa las tarjetas en divisiones Líquido / Deudas / Por cobrar',
    await groupsIn('#s-ajustes')
  );

  // ---------- Layout responsivo: escritorio ancho y alto (mouse/trackpad) ----------
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const desktopLayout = await page.evaluate(() => ({
    sidenav: getComputedStyle(document.querySelector('.sidenav')).display,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
  }));
  check('escritorio ancho: aparece la barra lateral y se oculta la de pestañas', desktopLayout.sidenav === 'flex' && desktopLayout.tabbar === 'none', JSON.stringify(desktopLayout));

  const chipsDesktop = await page.evaluate(() => {
    const el = document.querySelector('.chips');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const viewportW = window.innerWidth;
    const chips = [...el.querySelectorAll('.chip')];
    const clipped = chips.some((c) => c.getBoundingClientRect().right > viewportW + 1);
    return { flexWrap: cs.flexWrap, overflowX: cs.overflowX, chipCount: chips.length, clipped };
  });
  check(
    'escritorio ancho: los chips de cuenta en Movimientos envuelven en vez de cortarse sin forma de hacer scroll',
    !!chipsDesktop && chipsDesktop.flexWrap === 'wrap' && chipsDesktop.overflowX !== 'auto' && !chipsDesktop.clipped,
    JSON.stringify(chipsDesktop)
  );

  // ---------- Regresión: laptop con poca altura de ventana SÍ debe activar escritorio ----------
  // Reportado: en una laptop real (ventana ancha, mouse/trackpad) se veía la versión
  // móvil. Causa: el layout de escritorio exigía además min-height:700px, y muchas
  // laptops con escalado de Windows (125%/150%) o con barra de marcadores visible
  // terminan con menos de 700px de alto disponible aunque sean una laptop normal.
  // El layout de escritorio ahora se activa por ancho + tipo de puntero (mouse/
  // trackpad = hover:hover y pointer:fine), no por el alto de la ventana — esta
  // prueba usa un viewport ancho pero bajo (como esa laptop) sin emular pantalla
  // táctil, y debe mostrar la versión de escritorio de todas formas.
  await page.setViewportSize({ width: 1200, height: 560 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const shortLaptopLayout = await page.evaluate(() => ({
    sidenav: getComputedStyle(document.querySelector('.sidenav')).display,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
  }));
  check(
    'laptop ancha con poca altura (1200×560, con mouse/trackpad): SÍ muestra la versión de escritorio',
    shortLaptopLayout.sidenav === 'flex' && shortLaptopLayout.tabbar === 'none',
    JSON.stringify(shortLaptopLayout)
  );

  // ---------- Layout responsivo: celular grande en horizontal (pantalla táctil) NO debe activar escritorio ----------
  // Ahora que escritorio se decide por tipo de puntero y no por alto de ventana, esta
  // prueba necesita emular de verdad una pantalla táctil (hasTouch+isMobile) — si no,
  // Chromium reporta pointer:fine por defecto (como una laptop) y la comparación ya
  // no estaría probando un celular real.
  const phoneContext = await browser.newContext({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true });
  const phonePage = await phoneContext.newPage();
  await phonePage.goto(BASE, { waitUntil: 'networkidle' });
  await phonePage.waitForTimeout(700);
  const landscapeLayout = await phonePage.evaluate(() => ({
    sidenav: getComputedStyle(document.querySelector('.sidenav')).display,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
  }));
  check('celular en horizontal (932×430, pantalla táctil): se mantiene en modo móvil', landscapeLayout.sidenav === 'none' && landscapeLayout.tabbar === 'flex', JSON.stringify(landscapeLayout));
  await phoneContext.close();

  // ---------- Regresión: los gastos se muestran en rojo, igual que los ingresos en verde ----------
  // txAmount() (lista de Movimientos) y el Historial de cuenta (vAccount) no le ponían
  // la clase "neg" a los montos negativos, así que salían en el color de texto normal
  // en vez de rojo, mientras los ingresos sí llevaban "pos" (verde).
  {
    const colorPage = await context.newPage();
    await colorPage.goto(BASE, { waitUntil: 'networkidle' });
    await colorPage.waitForTimeout(700);
    await colorPage.evaluate(() => document.querySelector('.tabbar [data-tab="movimientos"]').click());
    await colorPage.waitForTimeout(400);
    const movColor = await colorPage.evaluate(() => {
      const amt = document.querySelector('#mov-list .amt');
      return amt ? { cls: amt.className, color: getComputedStyle(amt).color } : null;
    });
    check(
      'Movimientos: un gasto (egreso) se muestra en rojo (clase "neg"), igual que un ingreso en verde',
      !!movColor && movColor.cls.includes('neg') && movColor.color === 'rgb(255, 138, 126)',
      JSON.stringify(movColor)
    );
    await colorPage.close();
  }

  // ---------- Regresión: Nu Credit (o cualquier cuenta) en Insights debe mostrar TODO el historial ----------
  // vAccount() le hacía .slice(0,25) al historial de la cuenta, así que una cuenta con
  // más de 25 movimientos solo mostraba los 25 más recientes sin ninguna forma de ver
  // el resto. Aquí se generan más de 25 movimientos en la tarjeta de ejemplo y se
  // confirma que el Historial los lista todos, sin tope.
  {
    const histPage = await context.newPage();
    await histPage.goto(BASE, { waitUntil: 'networkidle' });
    await histPage.waitForTimeout(700);
    const tap2 = (sel) => histPage.evaluate((s) => document.querySelector(s).click(), sel);
    const EXTRA = 27;
    for (let i = 0; i < EXTRA; i++) {
      await tap2('.fab[data-action="new"]');
      await histPage.waitForTimeout(250);
      await histPage.fill('[name=concept]', 'Historial de prueba ' + i);
      await histPage.selectOption('[name=from]', 'credit');
      await histPage.fill('input[aria-label="Importe"]', '10');
      await histPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
      await tap2('#save');
      await histPage.waitForTimeout(250);
    }
    await histPage.evaluate(() => document.querySelector('.tabbar [data-tab="insights"]').click());
    await histPage.waitForTimeout(300);
    await tap2('.wallet[data-id="credit"]');
    await histPage.waitForTimeout(500);
    const histCount = await histPage.evaluate(
      () => document.querySelectorAll('#push-content .list .tx[data-action="edit"]').length
    );
    // 27 gastos nuevos + el pago de ejemplo que ya trae el modo demo = 28.
    check(
      'Insights → cuenta: el Historial muestra todos los movimientos, sin tope de 25',
      histCount === EXTRA + 1,
      'movimientos mostrados: ' + histCount + ' (se esperaban ' + (EXTRA + 1) + ')'
    );
    await histPage.close();
  }

  // ---------- Regresión: en Movimientos → Programados SÍ se ve la descripción ----------
  // El botón "Confirmar" se sumaba en la misma fila que el ícono+concepto+subtítulo
  // (ambos con class="tx", flex:1 y min-width:0), así que en pantallas angostas
  // ".mid-col" (que tiene el concepto y la cuenta/categoría) quedaba con 0px de ancho
  // y el texto desaparecía — solo en Programados, porque solo ahí aparece el botón
  // "Confirmar" compitiendo por espacio con el texto.
  {
    const progPage = await context.newPage();
    await progPage.goto(BASE, { waitUntil: 'networkidle' });
    await progPage.waitForTimeout(700);
    await progPage.evaluate(() => document.querySelector('.tabbar [data-tab="movimientos"]').click());
    await progPage.waitForTimeout(300);
    await progPage.evaluate(() => document.querySelector('[data-action="seg"][data-v="pending"]').click());
    await progPage.waitForTimeout(300);
    await progPage.evaluate(() => document.querySelector('[data-action="month"][data-d="1"]').click());
    await progPage.waitForTimeout(400);
    const progInfo = await progPage.evaluate(() => {
      const row = document.querySelector('#mov-list .tx .tx');
      const midCol = row?.querySelector('.mid-col');
      const t2 = row?.querySelector('.t2');
      return midCol ? { midColWidth: midCol.getBoundingClientRect().width, t2Text: t2?.textContent || '' } : null;
    });
    check(
      'Movimientos → Programados: la descripción (cuenta/categoría) del movimiento es visible, no se aplasta a 0px',
      !!progInfo && progInfo.midColWidth > 40 && progInfo.t2Text.length > 0,
      JSON.stringify(progInfo)
    );
    await progPage.close();
  }

  // ---------- Regresión: la app no debe depender de esm.sh en tiempo real para abrir ----------
  // Reportado: con datos móviles la app tarda mucho y a veces no abre; con wifi sí. Una
  // causa concreta: el cliente de Supabase se importaba en cada arranque desde
  // "https://esm.sh/@supabase/supabase-js@...", un CDN externo con su propia conexión
  // (DNS/TLS aparte) y sub-peticiones propias — un punto de falla extra que una red
  // móvil inestable puede bloquear o hacer lento. Ahora se sirve como vendor/supabase.umd.js
  // (mismo origen, sin esm.sh) cargado con <script defer> antes del módulo de la app.
  {
    const vendorPage = await context.newPage();
    const vendorErrors = [];
    vendorPage.on('pageerror', (e) => vendorErrors.push(e.message));
    await vendorPage.route('**esm.sh/**', (route) => route.abort());
    await vendorPage.goto(BASE, { waitUntil: 'networkidle' });
    await vendorPage.waitForTimeout(700);
    const vendorInfo = await vendorPage.evaluate(() => ({
      hasSupabaseGlobal: typeof window.supabase === 'object' && typeof window.supabase?.createClient === 'function',
      appRendered: document.getElementById('s-insights')?.childElementCount > 0,
    }));
    check(
      'La app carga el cliente de Supabase localmente (vendor/), sin depender de esm.sh',
      vendorInfo.hasSupabaseGlobal && vendorInfo.appRendered && vendorErrors.length === 0,
      JSON.stringify({ vendorInfo, vendorErrors })
    );
    await vendorPage.close();
  }

  // ---------- Regresión: si la app no termina de cargar, se avisa en vez de quedar en negro ----------
  // Complemento del punto anterior: cuando la carga sí falla por completo (red muy mala,
  // algún archivo nunca responde), antes la pantalla se quedaba negra sin explicación.
  // Ahora, si a los 12s la app no ha renderizado nada, aparece un aviso con botón de
  // reintentar (ver el <script> al inicio de index.html).
  {
    const hangPage = await context.newPage();
    await hangPage.route('**/finance.js*', () => {}); // nunca responde: simula una red que se cuelga
    await hangPage.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await hangPage.waitForTimeout(13000);
    const fallback = await hangPage.evaluate(() => ({
      visible: !!document.getElementById('boot-fallback'),
      appRendered: document.getElementById('s-insights')?.childElementCount > 0,
    }));
    check(
      'Si la carga se cuelga, a los 12s aparece un aviso de "no se pudo cargar" con botón de reintentar',
      fallback.visible && !fallback.appRendered,
      JSON.stringify(fallback)
    );
    await hangPage.close();
  }

  // ---------- Regresión: el Historial sin tope de 25 aplica a CUALQUIER cuenta, no solo tarjetas ----------
  // La corrección anterior solo se había probado con la tarjeta de ejemplo (credit).
  // Como el fix quita el .slice(0,25) de forma genérica (aplica al id de cuenta que sea),
  // aquí se confirma explícitamente con una cuenta de débito (bank), que no es tarjeta.
  {
    const histPage2 = await context.newPage();
    await histPage2.goto(BASE, { waitUntil: 'networkidle' });
    await histPage2.waitForTimeout(700);
    const tap3 = (sel) => histPage2.evaluate((s) => document.querySelector(s).click(), sel);
    const EXTRA2 = 27;
    for (let i = 0; i < EXTRA2; i++) {
      await tap3('.fab[data-action="new"]');
      await histPage2.waitForTimeout(250);
      await histPage2.fill('[name=concept]', 'Historial debito ' + i);
      await histPage2.selectOption('[name=from]', 'bank');
      await histPage2.fill('input[aria-label="Importe"]', '10');
      await histPage2.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
      await tap3('#save');
      await histPage2.waitForTimeout(250);
    }
    await histPage2.evaluate(() => document.querySelector('.tabbar [data-tab="calendario"]').click());
    await histPage2.waitForTimeout(300);
    await tap3('.wallet[data-id="bank"]');
    await histPage2.waitForTimeout(500);
    const histCount2 = await histPage2.evaluate(
      () => document.querySelectorAll('#push-content .list .tx[data-action="edit"]').length
    );
    check(
      'Insights → cuenta de débito (no tarjeta): el Historial también muestra todo, sin tope de 25',
      histCount2 >= EXTRA2,
      'movimientos mostrados: ' + histCount2 + ' (se esperaban al menos ' + EXTRA2 + ')'
    );
    await histPage2.close();
  }

  // ---------- Regresión: deslizar para revelar duplicar/eliminar en TODA vista de movimientos ----------
  // Varias listas de movimientos (los "Próximos 30 días" del dashboard de Insights y el
  // Historial dentro del detalle de una cuenta) solo dejaban editar el movimiento tocando
  // la fila entera. Primero se agregó ahí transactionActions() (botones de ícono siempre
  // visibles); el 2026-10-18 se reemplazó por swipeRow() en todas partes (ver el bloque de
  // "Regresión (2026-10-18): deslizar..." en Movimientos más arriba, donde se prueba el
  // gesto en sí). Aquí solo se confirma que estas otras dos listas quedaron igual de bien
  // conectadas (los botones de deslizar existen y los íconos siempre visibles ya no).
  {
    const actPage = await context.newPage();
    await actPage.goto(BASE, { waitUntil: 'networkidle' });
    await actPage.waitForTimeout(700);
    // El pago de ejemplo del modo demo no siempre cae dentro de los próximos 30 días
    // (depende de la fecha real en la que se corra la prueba), así que se crea un
    // programado con fecha de hoy para no depender de eso.
    await actPage.evaluate(() => document.querySelector('.fab[data-action="new"]').click());
    await actPage.waitForTimeout(250);
    await actPage.fill('[name=concept]', 'Programado próximos 30');
    await actPage.fill('input[aria-label="Importe"]', '20');
    await actPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await actPage.selectOption('[name=status]', 'pending');
    await actPage.evaluate(() => document.getElementById('save').click());
    await actPage.waitForTimeout(400);
    // Próximos 30 días (dashboard de Insights). Se usa el id dedicado #proximos-list
    // (no ".tx" a secas) para no confundirse con la lista de "Hoy", que ya tenía estos
    // botones antes.
    const swipeWiring = (sel) =>
      actPage.evaluate((s) => {
        const row = document.querySelector(s);
        if (!row) return null;
        return {
          hasDup: !!row.querySelector(':scope > .swipe-actions.action-left > .swipe-btn[data-action="duplicate"]'),
          hasDel: !!row.querySelector(':scope > .swipe-actions.action-right > .swipe-btn[data-action="delete"]'),
          noOldIconAction: row.querySelectorAll('.icon-action, .transaction-actions').length === 0,
        };
      }, sel);
    const proximosWiring = await swipeWiring('#proximos-list .swipe-row');
    check(
      'Insights → "Próximos 30 días": cada movimiento está envuelto en swipe-row con Duplicar/Eliminar (y ya no tiene los íconos siempre visibles)',
      !!proximosWiring && proximosWiring.hasDup && proximosWiring.hasDel && proximosWiring.noOldIconAction,
      JSON.stringify(proximosWiring)
    );
    // Historial dentro del detalle de una cuenta (push panel).
    await actPage.evaluate(() => document.querySelector('.tabbar [data-tab="calendario"]').click());
    await actPage.waitForTimeout(300);
    await actPage.evaluate(() => document.querySelector('.wallet[data-id="credit"]').click());
    await actPage.waitForTimeout(500);
    const histWiring = await swipeWiring('#push-content .list > .swipe-row');
    check(
      'Detalle de cuenta → Historial: cada movimiento está envuelto en swipe-row con Duplicar/Eliminar (y ya no tiene los íconos siempre visibles)',
      !!histWiring && histWiring.hasDup && histWiring.hasDel && histWiring.noOldIconAction,
      JSON.stringify(histWiring)
    );
    await actPage.evaluate(() => document.querySelector('[data-action="pop"]').click());
    await actPage.waitForTimeout(300);
    await actPage.close();
  }

  // ---------- Regresión: ciclo de facturación correcto al asignar un gasto a un pago ----------
  // Pedido: un gasto de tarjeta debe ir al pago que cae entre la fecha de corte a la que
  // pertenece (ya con el ajuste de fin de semana) y la siguiente fecha de pago; si el gasto
  // cae DESPUÉS del corte, debe ir al ciclo siguiente, no al pago más próximo sin más. Si no
  // existe ya un pago en esa ventana, la app debe crear uno automáticamente. Se verifica la
  // función pura billingWindow() (sin red ni UI) y, por separado, el flujo completo en la app.
  {
    const { billingWindow } = await import(new URL('../finance.js', import.meta.url));
    const card = { cut: 22, pay: 5 };
    const before = billingWindow(card, '2026-10-20'); // antes del corte del mes
    const onCut = billingWindow(card, '2026-10-22'); // exactamente el día de corte
    const after = billingWindow(card, '2026-10-23'); // después del corte: ciclo siguiente
    check(
      'billingWindow(): un gasto antes o el día del corte cae en el ciclo que cierra ese corte',
      before.cutEnd === '2026-10-22' && before.payDate === '2026-11-05' &&
        onCut.cutEnd === '2026-10-22' && onCut.payDate === '2026-11-05',
      JSON.stringify({ before, onCut })
    );
    check(
      'billingWindow(): un gasto después del corte cae en el ciclo siguiente (no en el pago más próximo)',
      after.cutEnd === '2026-11-20' && after.payDate === '2026-12-04' && after.cutEnd !== before.cutEnd,
      JSON.stringify({ after })
    );

    const cyclePage = await context.newPage();
    await cyclePage.goto(BASE, { waitUntil: 'networkidle' });
    await cyclePage.waitForTimeout(700);
    const tap5 = (sel) => cyclePage.evaluate((s) => document.querySelector(s).click(), sel);
    // Configura la tarjeta de ejemplo con corte=22, pago=5.
    await tap5('.tabbar [data-tab="ajustes"]');
    await cyclePage.waitForTimeout(300);
    await tap5('[data-action="account-edit"][data-id="credit"]');
    await cyclePage.waitForTimeout(300);
    await cyclePage.evaluate(() => {
      document.querySelector('[name=cut]').value = '22';
      document.querySelector('[name=pay]').value = '5';
    });
    await tap5('#save');
    await cyclePage.waitForTimeout(400);
    // Gasto el día 20 (antes del corte), sin pago existente en esa ventana -> debe ofrecer
    // crear uno nuevo automáticamente el 2026-11-05.
    await tap5('.fab[data-action="new"]');
    await cyclePage.waitForTimeout(250);
    await cyclePage.fill('[name=concept]', 'Compra ciclo de facturación');
    await cyclePage.selectOption('[name=from]', 'credit');
    await cyclePage.fill('input[aria-label="Importe"]', '350');
    await cyclePage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await cyclePage.evaluate(() => { document.querySelector('[name=date]').value = '2026-10-20'; });
    await tap5('#save');
    await cyclePage.waitForTimeout(500);
    const allocLabel = await cyclePage.evaluate(() => document.getElementById('fields')?.innerText || '');
    await tap5('#save');
    await cyclePage.waitForTimeout(500);
    const toastText = await cyclePage.evaluate(() => document.getElementById('notice')?.textContent || '');
    check(
      'Asignar gasto a un pago: con corte=22/pago=5 y un gasto el día 20, crea/asigna el pago en 2026-11-05',
      allocLabel.includes('2026-11-05') && toastText.includes('2026-11-05'),
      JSON.stringify({ allocLabel, toastText })
    );
    await cyclePage.close();
  }

  // ---------- Regresión (2026-10-18): el botón "Confirmar" ahora es solo un ícono ----------
  // Pedido: que el botón diga solo un check en vez de "Confirmar", para que ocupe menos
  // espacio en la fila. Debe conservar un aria-label descriptivo para accesibilidad.
  {
    const confirmPage = await context.newPage();
    await confirmPage.goto(BASE, { waitUntil: 'networkidle' });
    await confirmPage.waitForTimeout(700);
    await confirmPage.evaluate(() => document.querySelector('.tabbar [data-tab="movimientos"]').click());
    await confirmPage.waitForTimeout(300);
    await confirmPage.evaluate(() => document.querySelector('[data-action="seg"][data-v="pending"]').click());
    await confirmPage.waitForTimeout(300);
    // El pago de ejemplo (pendiente) está fechado el día 22 del mes siguiente a hoy.
    await confirmPage.evaluate(() => document.querySelector('[data-action="month"][data-d="1"]').click());
    await confirmPage.waitForTimeout(300);
    const confirmInfo = await confirmPage.evaluate(() => {
      const btn = document.querySelector('#mov-list [data-action="confirm"]');
      return btn
        ? { text: btn.textContent.trim(), hasSvg: !!btn.querySelector('svg'), ariaLabel: btn.getAttribute('aria-label') }
        : null;
    });
    check(
      'El botón "Confirmar" ya no muestra el texto "Confirmar" (solo un ícono de check)',
      !!confirmInfo && confirmInfo.text === '' && confirmInfo.hasSvg,
      JSON.stringify(confirmInfo)
    );
    check(
      'El botón "Confirmar" conserva un aria-label descriptivo para accesibilidad',
      !!confirmInfo && /Confirmar/i.test(confirmInfo.ariaLabel || ''),
      JSON.stringify(confirmInfo)
    );
    await confirmPage.close();
  }

  // ---------- Regresión (2026-10-18): confirmar precarga la fecha de HOY, no la original ----------
  // Pedido: al confirmar un movimiento programado, la fecha debe ser la de hoy (el día en que
  // se confirma), no la fecha original con la que se programó, porque a veces se confirman
  // adelantados o atrasados respecto a su calendario original.
  {
    const confirmDatePage = await context.newPage();
    await confirmDatePage.goto(BASE, { waitUntil: 'networkidle' });
    await confirmDatePage.waitForTimeout(700);
    const todayStr = await confirmDatePage.evaluate(() => new Date().toLocaleDateString('en-CA'));
    await confirmDatePage.evaluate(() => document.querySelector('.tabbar [data-tab="movimientos"]').click());
    await confirmDatePage.waitForTimeout(300);
    await confirmDatePage.evaluate(() => document.querySelector('[data-action="seg"][data-v="pending"]').click());
    await confirmDatePage.waitForTimeout(300);
    // El pago de ejemplo (pendiente) está fechado el día 22 del mes siguiente a hoy.
    await confirmDatePage.evaluate(() => document.querySelector('[data-action="month"][data-d="1"]').click());
    await confirmDatePage.waitForTimeout(300);
    const confirmBtnSel = '#mov-list [data-action="confirm"]';
    let dateInfo = null;
    if (await confirmDatePage.evaluate((s) => !!document.querySelector(s), confirmBtnSel)) {
      await confirmDatePage.evaluate((s) => document.querySelector(s).click(), confirmBtnSel);
      await confirmDatePage.waitForTimeout(400);
      dateInfo = await confirmDatePage.evaluate(() => ({
        title: document.getElementById('modal-title')?.textContent,
        dateVal: document.querySelector('[name=date]')?.value,
      }));
    }
    check(
      'Confirmar un movimiento programado precarga la fecha de HOY, no la fecha original con la que se programó',
      !!dateInfo && /Confirmar/i.test(dateInfo.title || '') && dateInfo.dateVal === todayStr,
      JSON.stringify({ dateInfo, todayStr })
    );
    await confirmDatePage.close();
  }

  // ---------- Regresión (2026-10-18): el formulario de cuenta admite USD y EUR ----------
  // Pedido: agregar dos divisas más (antes solo MXN y CAD).
  {
    const curPage = await context.newPage();
    await curPage.goto(BASE, { waitUntil: 'networkidle' });
    await curPage.waitForTimeout(700);
    await curPage.evaluate(() => document.querySelector('.tabbar [data-tab="ajustes"]').click());
    await curPage.waitForTimeout(300);
    await curPage.evaluate(() => document.querySelector('#add-account').click());
    await curPage.waitForTimeout(300);
    const currencyOptions = await curPage.evaluate(() => [...document.querySelectorAll('[name=currency] option')].map((o) => o.value));
    check(
      'El formulario de cuenta ofrece MXN, CAD, USD y EUR como moneda',
      ['MXN', 'CAD', 'USD', 'EUR'].every((c) => currencyOptions.includes(c)),
      'opciones encontradas: ' + currencyOptions.join(', ')
    );
    await curPage.close();
  }

  // ---------- Regresión: cuentas de Deudas/Por cobrar ya saldadas (saldo 0 hoy) se ocultan ----------
  // Pedido: si una cuenta de Deudas o de Por cobrar ya quedó saldada o está en 0 al día de
  // hoy, debe ocultarse de todas las pestañas EXCEPTO Ajustes (donde se administran las
  // cuentas); esto NO aplica a las cuentas de Líquido, que siempre se muestran aunque su
  // saldo sea 0. Se agregó visibleAccounts()/isSettled() en finance.js, usado en "Explorar
  // mis cuentas" (Insights), "Saldos" (Calendario) y los chips de cuenta de Movimientos.
  {
    const settledPage = await context.newPage();
    await settledPage.goto(BASE, { waitUntil: 'networkidle' });
    await settledPage.waitForTimeout(700);
    const tapS = (sel) => settledPage.evaluate((s) => document.querySelector(s).click(), sel);

    await tapS('.tabbar [data-tab="ajustes"]');
    await settledPage.waitForTimeout(300);

    // Cuenta de "Deuda por pagar" (división Deudas) ya saldada: saldo inicial 0, sin movimientos.
    await tapS('#add-account');
    await settledPage.waitForTimeout(300);
    await settledPage.fill('[name=name]', 'Deuda saldada · prueba');
    await settledPage.selectOption('[name=type]', 'loan');
    // El saldo inicial ya es 0 por defecto en una cuenta nueva; no hace falta tocarlo.
    await tapS('#save');
    await settledPage.waitForTimeout(400);

    // Cuenta de Líquido con saldo 0 también, para confirmar que a Líquido NO le aplica la regla.
    await tapS('#add-account');
    await settledPage.waitForTimeout(300);
    await settledPage.fill('[name=name]', 'Débito en cero · prueba');
    await settledPage.selectOption('[name=type]', 'debit');
    // El saldo inicial ya es 0 por defecto en una cuenta nueva; no hace falta tocarlo.
    await tapS('#save');
    await settledPage.waitForTimeout(400);

    const findId = (n) =>
      settledPage.evaluate((name) => {
        const btn = [...document.querySelectorAll('.wallet')].find((w) => w.querySelector('.wn')?.textContent.trim() === name);
        return btn ? btn.dataset.id : null;
      }, n);
    const debtId = await findId('Deuda saldada · prueba');
    const liquidId = await findId('Débito en cero · prueba');

    const ajustesGroups = await settledPage.evaluate(() =>
      [...document.querySelectorAll('#s-ajustes .account-group')].map((g) => ({
        label: g.querySelector('.account-group-label')?.textContent.trim() || null,
        ids: [...g.querySelectorAll('.wallet')].map((w) => w.dataset.id),
      }))
    );
    const ajustesDeudas = ajustesGroups.find((g) => g.label === 'Deudas');
    check(
      'Ajustes → Mis cuentas sigue mostrando una cuenta de Deudas ya saldada (0)',
      !!debtId && !!ajustesDeudas && ajustesDeudas.ids.includes(debtId),
      JSON.stringify({ debtId, ajustesGroups })
    );

    const hasId = (sel, id) => settledPage.evaluate(({ sel, id }) => !!document.querySelector(`${sel} [data-id="${id}"]`), { sel, id });

    check(
      'Insights → "Explorar mis cuentas" oculta la cuenta de Deudas ya saldada (0)',
      !!debtId && !(await hasId('#s-insights', debtId)),
      'debtId=' + debtId
    );
    check(
      'Insights → "Explorar mis cuentas" NO oculta una cuenta de Líquido con saldo 0 (la regla no le aplica)',
      !!liquidId && (await hasId('#s-insights', liquidId)),
      'liquidId=' + liquidId
    );
    check(
      'Calendario → "Saldos" oculta la cuenta de Deudas ya saldada (0)',
      !!debtId && !(await hasId('#s-calendario', debtId)),
      'debtId=' + debtId
    );
    check(
      'Movimientos → chips de cuenta: no aparece la cuenta de Deudas ya saldada (0)',
      !!debtId && !(await hasId('.chips', debtId)),
      'debtId=' + debtId
    );

    // Pedido (2026-10-18): aunque se oculte en las pantallas principales, una cuenta ya
    // saldada (0) debe seguir pudiendo elegirse en "Nuevo movimiento", porque puede volver a
    // usarse y tener saldo de nuevo más adelante.
    await tapS('.fab[data-action="new"]');
    await settledPage.waitForTimeout(300);
    const fromOptions = await settledPage.evaluate(() => [...document.querySelectorAll('[name=from] option')].map((o) => o.value));
    check(
      '"Nuevo movimiento" SÍ permite elegir una cuenta de Deudas ya saldada (0) como origen',
      !!debtId && fromOptions.includes(debtId),
      JSON.stringify({ debtId, fromOptions })
    );
    await settledPage.evaluate(() => document.getElementById('close').click());
    await settledPage.waitForTimeout(300);

    await settledPage.close();
  }

  // ---------- Lote 2026-10-24, punto 1: recuperar contraseña ----------
  // El modo demo (SUPABASE_URL vacío) nunca muestra la pantalla de inicio de sesión —
  // login() ni siquiera llama a accessForm() sin un cliente de Supabase — así que este
  // flujo no se puede probar con el servidor de pruebas normal. Para probarlo de verdad
  // (en vez de solo leer el código) se sirve este único page con un config.js y un
  // vendor/supabase.umd.js falsos: un cliente de Supabase simulado que registra cada
  // llamada en localStorage (sobrevive a la recarga que hace newPasswordForm() al
  // terminar) y permite disparar a mano el evento PASSWORD_RECOVERY que en producción
  // llega al volver del enlace del correo.
  {
    const authPage = await context.newPage();
    const fakeConfig = `export const SUPABASE_URL='https://fake-test.supabase.co'; export const SUPABASE_PUBLISHABLE_KEY='fake-key';`;
    const fakeSupabase = `
      window.supabase = {
        createClient: function () {
          function log(name, payload) {
            try {
              const arr = JSON.parse(localStorage.getItem('__testAuthCalls') || '[]');
              arr.push([name, payload]);
              localStorage.setItem('__testAuthCalls', JSON.stringify(arr));
            } catch (e) {}
          }
          return {
            auth: {
              onAuthStateChange: function (cb) { window.__testAuthEmit = function (event, session) { cb(event, session); }; },
              signInWithPassword: async function (args) { log('signInWithPassword', args); return { error: null }; },
              signUp: async function (args) { log('signUp', args); return { data: {}, error: null }; },
              resetPasswordForEmail: async function (email, opts) { log('resetPasswordForEmail', { email, opts }); return { error: null }; },
              updateUser: async function (args) { log('updateUser', args); return { error: null }; },
              signOut: async function () { log('signOut', {}); return { error: null }; },
              getSession: async function () { return { data: { session: null }, error: null }; },
              refreshSession: async function () { return { data: { session: null }, error: null }; },
            },
            channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
            removeChannel: async function () {},
            rpc: async function () { return { data: null, error: null }; },
          };
        },
      };
    `;
    await authPage.route('**/config.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeConfig }));
    await authPage.route('**/vendor/supabase.umd.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeSupabase }));
    await authPage.goto(BASE, { waitUntil: 'networkidle' });
    await authPage.waitForTimeout(700);
    await authPage.evaluate(() => localStorage.removeItem('__testAuthCalls'));
    const tapA = (sel) => authPage.evaluate((s) => document.querySelector(s).click(), sel);
    const textA = (sel) => authPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const authCalls = () => authPage.evaluate(() => JSON.parse(localStorage.getItem('__testAuthCalls') || '[]'));

    await tapA('.tabbar [data-tab="ajustes"]');
    await authPage.waitForTimeout(300);
    await tapA('[data-action="login"]');
    await authPage.waitForTimeout(400);
    check('Con un cliente de Supabase disponible, "Iniciar sesión" SÍ abre el formulario de acceso', await textA('#modal-title') === 'Iniciar sesión');
    check('El formulario de acceso (no registro) muestra el botón "¿Olvidaste tu contraseña?"', await authPage.evaluate(() => !!document.querySelector('#forgot-password')));

    await tapA('#forgot-password');
    await authPage.waitForTimeout(400);
    check('"¿Olvidaste tu contraseña?" abre el formulario de recuperación con un campo de correo', (await textA('#modal-title')) === 'Recuperar contraseña' && (await authPage.evaluate(() => !!document.querySelector('[name=email]'))));
    await authPage.fill('[name=email]', 'prueba@example.com');
    await tapA('#save');
    const callsAfterReset = await authCalls();
    check(
      'Enviar el formulario de recuperación llama a resetPasswordForEmail con el correo escrito',
      callsAfterReset.some((c) => c[0] === 'resetPasswordForEmail' && c[1]?.email === 'prueba@example.com'),
      JSON.stringify(callsAfterReset)
    );
    await authPage.waitForTimeout(300);
    check(
      'Tras enviar el enlace, se muestra un aviso genérico (no revela si el correo existe)',
      /Si ese correo tiene una cuenta/i.test((await textA('#notice')) || '')
    );

    // Simula el regreso desde el enlace del correo: Supabase dispara PASSWORD_RECOVERY.
    await authPage.keyboard.press('Escape');
    await authPage.waitForTimeout(300);
    await authPage.evaluate(() => window.__testAuthEmit && window.__testAuthEmit('PASSWORD_RECOVERY', { user: { id: 'fake-user' } }));
    await authPage.waitForTimeout(400);
    const recoveryFields = await authPage.evaluate(() => ({
      title: document.getElementById('modal-title')?.textContent,
      hasPassword: !!document.querySelector('[name=password]'),
      hasConfirm: !!document.querySelector('[name=confirmPassword]'),
    }));
    check(
      'El evento PASSWORD_RECOVERY de Supabase abre el formulario de nueva contraseña',
      recoveryFields.title === 'Nueva contraseña' && recoveryFields.hasPassword && recoveryFields.hasConfirm,
      JSON.stringify(recoveryFields)
    );

    // Contraseñas que no coinciden: debe rechazarse SIN llamar a updateUser.
    await authPage.fill('[name=password]', 'passwordUno123');
    await authPage.fill('[name=confirmPassword]', 'passwordDos456');
    await tapA('#save');
    await authPage.waitForTimeout(300);
    const callsAfterMismatch = await authCalls();
    check(
      'Nueva contraseña: si las contraseñas no coinciden, se rechaza sin llamar a updateUser',
      /no coinciden/i.test((await textA('#error')) || '') && !callsAfterMismatch.some((c) => c[0] === 'updateUser'),
      JSON.stringify({ error: await textA('#error'), callsAfterMismatch })
    );

    // Contraseñas que sí coinciden: debe llamar a updateUser con la nueva contraseña. Tras
    // guardar, newPasswordForm() navega de vuelta a la app (location.assign) para iniciar
    // sesión normal, así que hay que esperar esa navegación antes de poder volver a leer
    // localStorage (sigue ahí: mismo origen, sobrevive a la recarga).
    await authPage.fill('[name=password]', 'nuevaClaveSegura1');
    await authPage.fill('[name=confirmPassword]', 'nuevaClaveSegura1');
    await tapA('#save');
    await authPage.waitForLoadState('load').catch(() => {});
    await authPage.waitForTimeout(300);
    const callsAfterUpdate = await authCalls().catch(() => []);
    check(
      'Nueva contraseña: si coinciden, se llama a updateUser con la nueva contraseña (y luego la app recarga para iniciar sesión normal)',
      callsAfterUpdate.some((c) => c[0] === 'updateUser' && c[1]?.password === 'nuevaClaveSegura1'),
      JSON.stringify(callsAfterUpdate)
    );
    await authPage.close();
  }

  // ---------- Lote 2026-10-24, punto 2: cambiar el importe de una MSI reestructura las mensualidades ----------
  // Pedido: si se cambia el monto total de una compra a meses sin intereses (MSI), las
  // mensualidades pendientes deben repartirse automáticamente con el nuevo monto; las ya
  // confirmadas no se tocan. Antes, cambiar el importe de una MSI existente lanzaba un error
  // bloqueante ("no se puede cambiar sin reestructurar sus cuotas"); ahora transactionForm()
  // reparte lo que falte (importe nuevo − lo ya pagado) entre las cuotas pendientes.
  {
    const msiPage = await context.newPage();
    await msiPage.goto(BASE, { waitUntil: 'networkidle' });
    await msiPage.waitForTimeout(700);
    const tapM = (sel) => msiPage.evaluate((s) => document.querySelector(s).click(), sel);
    const textM = (sel) => msiPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const creditHistoryM = async () => {
      await msiPage.evaluate(() => document.querySelector('.tabbar [data-tab="calendario"]').click());
      await msiPage.waitForTimeout(300);
      await msiPage.evaluate(() => document.querySelector('.wallet[data-id="credit"]').click());
      await msiPage.waitForTimeout(500);
      const rows = await msiPage.evaluate(() =>
        [...document.querySelectorAll('#push-content .list .swipe-row')].map((r) => ({
          concept: r.querySelector('.t1')?.textContent,
          amt: r.querySelector('.amt,.num')?.textContent?.trim(),
        }))
      );
      await msiPage.evaluate(() => document.querySelector('[data-action="pop"]').click());
      await msiPage.waitForTimeout(300);
      return rows;
    };

    // Compra MSI de $6,000 en 6 mensualidades sobre la tarjeta de ejemplo.
    await tapM('.tabbar [data-tab="movimientos"]');
    await msiPage.waitForTimeout(300);
    await tapM('.fab[data-action="new"]');
    await msiPage.waitForTimeout(300);
    await msiPage.selectOption('[name=kind]', 'msi');
    await msiPage.waitForTimeout(200);
    await msiPage.fill('[name=concept]', 'MSI reestructura prueba');
    await msiPage.selectOption('[name=from]', 'credit');
    await msiPage.fill('input[aria-label="Importe"]', '6000');
    await msiPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await msiPage.evaluate(() => { document.querySelector('[name=count]').value = '6'; });
    await msiPage.selectOption('[name=source]', 'bank');
    await tapM('#save');
    await msiPage.waitForTimeout(400);

    const msiId = await msiPage.evaluate(() => {
      const row = [...document.querySelectorAll('.swipe-row .t1')].find((e) => e.textContent.trim() === 'MSI reestructura prueba');
      return row ? row.closest('.swipe-row').querySelector('[data-action="edit"]')?.dataset.id : null;
    });

    // Confirma la primera mensualidad (queda "ya pagada", no debe tocarse al reestructurar).
    await tapM('.tabbar [data-tab="insights"]');
    await msiPage.waitForTimeout(400);
    const firstConfirmId = await msiPage.evaluate(() => {
      const btns = [...document.querySelectorAll('#proximos-list [data-action="confirm"]')];
      const row = btns.find((b) => b.closest('.swipe-row').querySelector('.t1')?.textContent.includes('MSI reestructura prueba'));
      return row?.dataset.id;
    });
    if (firstConfirmId) {
      await msiPage.evaluate((id) => document.querySelector(`[data-action="confirm"][data-id="${id}"]`).click(), firstConfirmId);
      await msiPage.waitForTimeout(400);
      await tapM('#save');
      await msiPage.waitForTimeout(400);
    }
    check('MSI: se pudo confirmar la primera mensualidad (preparación)', !!firstConfirmId);

    // Cambia el importe total de la compra: 6000 -> 9000.
    if (msiId) {
      await msiPage.evaluate(() => document.querySelector('.tabbar [data-tab="movimientos"]').click());
      await msiPage.waitForTimeout(300);
      await msiPage.evaluate(() => document.querySelector('[data-action="seg"][data-v="done"]')?.click());
      await msiPage.waitForTimeout(300);
      await msiPage.evaluate((id) => document.querySelector(`[data-action="edit"][data-id="${id}"]`)?.click(), msiId);
      await msiPage.waitForTimeout(400);
      await msiPage.fill('input[aria-label="Importe"]', '9000');
      await msiPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
      await tapM('#save');
      await msiPage.waitForTimeout(400);
    }
    check(
      'MSI: cambiar el importe total de una compra existente ya no lanza un error bloqueante',
      !(await msiPage.evaluate(() => document.body.classList.contains('sheet-open'))),
      await textM('#error')
    );

    const histAfterRestructure = await creditHistoryM();
    const installmentRows = histAfterRestructure.filter((r) => /^MSI reestructura prueba · \d\/6$/.test(r.concept || ''));
    const doneOne = installmentRows.find((r) => r.concept.endsWith('1/6'));
    const pendingFive = installmentRows.filter((r) => !r.concept.endsWith('1/6'));
    check(
      'MSI: la mensualidad ya confirmada (1/6, $1,000.00) NO cambia al reestructurar el importe total',
      doneOne?.amt === '+$1,000.00',
      JSON.stringify(doneOne)
    );
    check(
      'MSI: las 5 mensualidades pendientes se reestructuran a (9000-1000)/5 = $1,600.00 cada una',
      pendingFive.length === 5 && pendingFive.every((r) => r.amt === '+$1,600.00'),
      JSON.stringify(pendingFive)
    );
    await msiPage.close();
  }

  // ---------- Lote 2026-10-24, punto 3: editar una mensualidad MSI con "aplicar a los siguientes" ----------
  // Pedido: al modificar una mensualidad programada de una MSI, debe poder elegirse si el
  // cambio aplica solo a esa mensualidad o a esa y las siguientes pendientes (las ya
  // confirmadas nunca se tocan). saveTransactionEdit() en finance.js ya soportaba este
  // "scope" de forma genérica (comparte el mecanismo con las reglas recurrentes), así que
  // aquí se prueba que funciona también para mensualidades MSI con el nuevo texto de la
  // etiqueta ("Este y los siguientes pagos pendientes").
  //
  // Bug encontrado y corregido mientras se escribía esta prueba: cada mensualidad lleva su
  // número de cuota pegado al concepto ("Compra · 2/4", "Compra · 3/4", …); al propagar el
  // concepto a las siguientes mensualidades pendientes, saveTransactionEdit() copiaba el
  // concepto completo de la cuota editada (con SU número), así que las demás cuotas perdían
  // su propio número y todas terminaban mostrando el mismo "· 2/4". Se corrigió para que solo
  // se propague el nombre base del concepto, conservando el número de cuota de cada una.
  {
    const scopePage = await context.newPage();
    await scopePage.goto(BASE, { waitUntil: 'networkidle' });
    await scopePage.waitForTimeout(700);
    const tapS2 = (sel) => scopePage.evaluate((s) => document.querySelector(s).click(), sel);
    const existsS = (sel) => scopePage.evaluate((s) => !!document.querySelector(s), sel);
    const textS = (sel) => scopePage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const openCreditS = async () => {
      await scopePage.evaluate(() => document.querySelector('.tabbar [data-tab="calendario"]').click());
      await scopePage.waitForTimeout(300);
      await scopePage.evaluate(() => document.querySelector('.wallet[data-id="credit"]').click());
      await scopePage.waitForTimeout(500);
    };
    const closePushS = async () => {
      await scopePage.evaluate(() => document.querySelector('[data-action="pop"]').click());
      await scopePage.waitForTimeout(300);
    };
    const readHistoryS = () =>
      scopePage.evaluate(() =>
        [...document.querySelectorAll('#push-content .list .swipe-row')].map((r) => ({
          concept: r.querySelector('.t1')?.textContent,
          amt: r.querySelector('.amt,.num')?.textContent?.trim(),
        }))
      );

    // Compra MSI de $4,000 en 4 mensualidades; confirma la primera.
    await tapS2('.tabbar [data-tab="movimientos"]');
    await scopePage.waitForTimeout(300);
    await tapS2('.fab[data-action="new"]');
    await scopePage.waitForTimeout(300);
    await scopePage.selectOption('[name=kind]', 'msi');
    await scopePage.waitForTimeout(200);
    await scopePage.fill('[name=concept]', 'MSI scope prueba');
    await scopePage.selectOption('[name=from]', 'credit');
    await scopePage.fill('input[aria-label="Importe"]', '4000');
    await scopePage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await scopePage.evaluate(() => { document.querySelector('[name=count]').value = '4'; });
    await scopePage.selectOption('[name=source]', 'bank');
    await tapS2('#save');
    await scopePage.waitForTimeout(400);

    await scopePage.evaluate(() => document.querySelector('.tabbar [data-tab="insights"]').click());
    await scopePage.waitForTimeout(400);
    const conf1 = await scopePage.evaluate(() => {
      const btns = [...document.querySelectorAll('#proximos-list [data-action="confirm"]')];
      const row = btns.find((b) => b.closest('.swipe-row').querySelector('.t1')?.textContent.includes('MSI scope prueba'));
      return row?.dataset.id;
    });
    if (conf1) {
      await scopePage.evaluate((id) => document.querySelector(`[data-action="confirm"][data-id="${id}"]`).click(), conf1);
      await scopePage.waitForTimeout(400);
      await tapS2('#save');
      await scopePage.waitForTimeout(400);
    }

    // Edita la mensualidad 2/4 (todavía pendiente) desde el Historial de la tarjeta, con
    // scope="future": cambia el concepto y el importe a $1,200.
    await openCreditS();
    const edit2Id = await scopePage.evaluate(() => {
      const rows = [...document.querySelectorAll('#push-content .list .swipe-row')];
      const row = rows.find((r) => r.querySelector('.t1')?.textContent?.includes('MSI scope prueba · 2/4'));
      return row?.querySelector('[data-action="edit"]')?.dataset.id;
    });
    check('MSI: se encontró la mensualidad 2/4 pendiente para editarla', !!edit2Id);
    if (edit2Id) {
      await scopePage.evaluate((id) => document.querySelector(`#push-content [data-action="edit"][data-id="${id}"]`).click(), edit2Id);
      await scopePage.waitForTimeout(400);
      check('Al editar una mensualidad pendiente de una MSI, aparece el selector "Aplicar cambios a"', await existsS('[name=scope]'));
      check(
        'La opción de aplicar a las siguientes dice "Este y los siguientes pagos pendientes"',
        (await scopePage.evaluate(() => document.querySelector('[name=scope] option[value=future]')?.textContent)) === 'Este y los siguientes pagos pendientes'
      );
      await scopePage.selectOption('[name=scope]', 'future');
      await scopePage.fill('input[aria-label="Importe"]', '1200');
      await scopePage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
      await tapS2('#save');
      await scopePage.waitForTimeout(400);
    }
    check('Guardar la edición con scope "future" cierra la hoja sin error', !(await existsS('body.sheet-open')), await textS('#error'));

    await closePushS();
    await openCreditS();
    const histAfterScope = await readHistoryS();
    const row1 = histAfterScope.find((r) => r.concept === 'MSI scope prueba · 1/4');
    const row2 = histAfterScope.find((r) => r.concept === 'MSI scope prueba · 2/4');
    const row3 = histAfterScope.find((r) => r.concept === 'MSI scope prueba · 3/4');
    const row4 = histAfterScope.find((r) => r.concept === 'MSI scope prueba · 4/4');
    check(
      'Editar la cuota 2/4 con scope "future": la cuota 1/4 (ya confirmada) NO cambia',
      row1?.amt === '+$1,000.00',
      JSON.stringify(row1)
    );
    check(
      'Editar la cuota 2/4 con scope "future": las cuotas 2/4, 3/4 y 4/4 SÍ cambian a $1,200.00',
      row2?.amt === '+$1,200.00' && row3?.amt === '+$1,200.00' && row4?.amt === '+$1,200.00',
      JSON.stringify({ row2, row3, row4 })
    );
    check(
      'Editar la cuota 2/4 con scope "future": cada cuota conserva su propio número (no todas quedan como "2/4")',
      !!row3 && !!row4 && row3.concept === 'MSI scope prueba · 3/4' && row4.concept === 'MSI scope prueba · 4/4',
      JSON.stringify({ row3, row4 })
    );
    await closePushS();
    await scopePage.close();
  }

  // ---------- Lote 2026-10-24, punto 4: eliminar cuentas desde Configuración/Ajustes ----------
  // Pedido: poder eliminar una cuenta que ya no se usa, desde el formulario de cuenta en
  // Ajustes. Si la cuenta tiene movimientos, reglas recurrentes o metas asociadas, no se
  // puede eliminar sin perder ese historial, así que se bloquea y se ofrece archivarla en su
  // lugar (lo que ya existía); solo una cuenta sin ninguna referencia se elimina de verdad.
  {
    const delPage = await context.newPage();
    await delPage.goto(BASE, { waitUntil: 'networkidle' });
    await delPage.waitForTimeout(700);
    const tapD = (sel) => delPage.evaluate((s) => document.querySelector(s).click(), sel);
    const existsD = (sel) => delPage.evaluate((s) => !!document.querySelector(s), sel);
    const textD = (sel) => delPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);

    // Caso A: la tarjeta de ejemplo tiene movimientos -> eliminar debe bloquearse y ofrecer archivar.
    await tapD('.tabbar [data-tab="ajustes"]');
    await delPage.waitForTimeout(400);
    await tapD('[data-action="account-edit"][data-id="credit"]');
    await delPage.waitForTimeout(400);
    check('El formulario de una cuenta existente muestra el botón "Eliminar esta cuenta"', await existsD('#delete-account'));
    await tapD('#delete-account');
    await delPage.waitForTimeout(400);
    check(
      'Eliminar una cuenta CON movimientos asociados se bloquea y explica por qué',
      (await textD('#modal-title')) === 'No se puede eliminar' && /movimiento/i.test((await textD('#fields')) || ''),
      await textD('#fields')
    );
    check(
      'Al bloquear la eliminación, se ofrece archivar la cuenta en su lugar',
      (await textD('#save')) === 'Archivar en su lugar'
    );
    await delPage.keyboard.press('Escape');
    await delPage.waitForTimeout(300);
    await delPage.keyboard.press('Escape');
    await delPage.waitForTimeout(300);

    // Caso B: una cuenta nueva, sin ningún movimiento/regla/meta asociada -> sí se elimina.
    await tapD('.tabbar [data-tab="ajustes"]');
    await delPage.waitForTimeout(300);
    await tapD('#add-account');
    await delPage.waitForTimeout(300);
    await delPage.fill('[name=name]', 'Cuenta sin usar · prueba');
    await delPage.selectOption('[name=type]', 'debit');
    await tapD('#save');
    await delPage.waitForTimeout(400);
    const newAccId = await delPage.evaluate(() => {
      const row = [...document.querySelectorAll('[data-action="account-edit"]')].find((b) => b.closest('.wallet')?.textContent?.includes('Cuenta sin usar · prueba'));
      return row?.dataset.id || null;
    });
    check('Se pudo crear una cuenta nueva sin movimientos (preparación)', !!newAccId);
    if (newAccId) {
      await delPage.evaluate((id) => document.querySelector(`[data-action="account-edit"][data-id="${id}"]`).click(), newAccId);
      await delPage.waitForTimeout(400);
      await tapD('#delete-account');
      await delPage.waitForTimeout(400);
      check(
        'Eliminar una cuenta SIN referencias muestra una confirmación simple (no el bloqueo)',
        (await textD('#modal-title')) === 'Eliminar cuenta' && (await textD('#save')) === 'Eliminar'
      );
      await tapD('#save');
      await delPage.waitForTimeout(400);
      const stillExists = await delPage.evaluate((id) => !!document.querySelector(`[data-action="account-edit"][data-id="${id}"]`), newAccId);
      check('Tras confirmar, la cuenta sin referencias se elimina de verdad (ya no aparece en Ajustes)', !stillExists);
    }
    await delPage.close();
  }

  // ---------- Lote 2026-10-24 (2), punto 1: selector de color estilo Excel, con degradado ----------
  // Pedido: más opciones de color para las tarjetas, con un selector visual tipo el de Excel
  // (cuadrícula de muestras) en vez del <select> de texto que había, y que el color elegido
  // se vea con un degradado para dar sensación de profundidad. colorField()/bindColorField()
  // en app.js reemplazan el <select name=color> por un botón "Automático" + una cuadrícula de
  // muestras (una por cada color de walletColors, excepto "auto"); cada una usa la clase
  // w-<color>, cuyo fondo en interface.css ahora es un linear-gradient de 3 paradas (clara/
  // base/oscura) en vez de un color plano.
  {
    const colorPage = await context.newPage();
    await colorPage.goto(BASE, { waitUntil: 'networkidle' });
    await colorPage.waitForTimeout(700);
    const tapC = (sel) => colorPage.evaluate((s) => document.querySelector(s)?.click(), sel);
    const existsC = (sel) => colorPage.evaluate((s) => !!document.querySelector(s), sel);
    const textC = (sel) => colorPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);

    await tapC('.tabbar [data-tab="ajustes"]');
    await colorPage.waitForTimeout(300);
    await tapC('[data-action="account-edit"][data-id="credit"]');
    await colorPage.waitForTimeout(400);

    const swatchCount = await colorPage.evaluate(() => document.querySelectorAll('.color-swatch').length);
    check(
      'El formulario de cuenta ya no usa un <select> de texto para el color: muestra una cuadrícula con al menos 15 colores',
      !(await existsC('select[name=color]')) && swatchCount >= 15,
      'select[name=color] existe: ' + (await existsC('select[name=color]')) + ', muestras: ' + swatchCount
    );
    check('El selector de color incluye el botón "Automático" (color según el nombre del banco)', await existsC('.color-auto-btn'));

    check(
      'Cada muestra de color se pinta con un degradado de varias paradas (no un color plano), para dar sensación de profundidad',
      await colorPage.evaluate(() => {
        const bg = getComputedStyle(document.querySelector('.color-swatch[data-color=emerald]')).backgroundImage;
        return bg.startsWith('linear-gradient') && (bg.match(/rgb\(/g) || []).length >= 3;
      })
    );

    await tapC('.color-swatch[data-color=emerald]');
    await colorPage.waitForTimeout(100);
    check(
      'Elegir una muestra actualiza el valor guardado (campo oculto) y marca esa muestra como seleccionada',
      (await colorPage.evaluate(() => document.querySelector('input[name=color]')?.value)) === 'emerald' &&
        (await colorPage.evaluate(() => document.querySelector('.color-swatch[data-color=emerald]')?.getAttribute('aria-pressed'))) === 'true' &&
        (await colorPage.evaluate(() => document.querySelector('.color-auto-btn')?.getAttribute('aria-pressed'))) === 'false'
    );
    await tapC('#save');
    await colorPage.waitForTimeout(400);
    check(
      'Guardar el color elegido se refleja en la tarjeta de la cuenta (clase w-emerald)',
      (await colorPage.evaluate(() => document.querySelector('[data-action="account-edit"][data-id="credit"]')?.className)) === 'wallet w-emerald',
      await textC('#error')
    );
    await colorPage.close();
  }

  // ---------- Lote 2026-10-24 (2), punto 2: las cards de cuentas se agrupan por color y se ordenan por monto ----------
  // Pedido: en todas las secciones donde aparecen las tarjetas de cuenta, agruparlas por el
  // color de la tarjeta y ordenarlas de mayor a menor monto en valor absoluto. Dentro de cada
  // división (Líquido/Deudas/Por cobrar) ya existente, accountGroupSections() ahora agrupa por
  // walletTheme(a) y ordena los grupos de color por la suma de montos (de mayor a menor), y
  // dentro de cada color, cada cuenta por su propio monto (de mayor a menor). Se verifica con 3
  // cuentas de prueba (2 del mismo color con distinto monto, 1 de otro color) en las 3 vistas
  // donde se listan las tarjetas de cuenta: Ajustes, Insights y Calendario.
  {
    const orderPage = await context.newPage();
    await orderPage.goto(BASE, { waitUntil: 'networkidle' });
    await orderPage.waitForTimeout(700);
    const tapO = (sel) => orderPage.evaluate((s) => document.querySelector(s)?.click(), sel);

    const createDebitAccount = async (name, color, opening) => {
      await tapO('.tabbar [data-tab="ajustes"]');
      await orderPage.waitForTimeout(300);
      await tapO('#add-account');
      await orderPage.waitForTimeout(400);
      await orderPage.fill('[name=name]', name);
      await orderPage.selectOption('[name=type]', 'debit');
      await tapO(`.color-swatch[data-color=${color}]`);
      await orderPage.fill('input[aria-label="Saldo inicial (negativo si debes)"]', String(opening));
      await orderPage.evaluate(() => document.querySelector('input[aria-label="Saldo inicial (negativo si debes)"]').blur());
      await tapO('#save');
      await orderPage.waitForTimeout(400);
    };
    // Cuenta de ejemplo "bank" (slate, saldo ~$23,155) y "cash" (green, $1,200) ya existen.
    // Se agregan 3 más, todas de tipo débito (misma división "Líquido"): dos azules (montos
    // distintos) y una roja (el mayor monto de las 3 nuevas).
    await createDebitAccount('Acc1 azul chica', 'blue', 500);
    await createDebitAccount('Acc2 azul grande', 'blue', 2000);
    await createDebitAccount('Acc3 roja', 'red', 3000);

    // Orden esperado en "Líquido": bank (slate, ~23,155: el mayor de todos) > Acc3 (red, 3000:
    // el grupo de color con más monto entre las 3 nuevas) > Acc2 (blue, 2000: el mayor de su
    // grupo) > Acc1 (blue, 500) > cash (green, 1200: el grupo de color con menos monto).
    const expectedOrder = ['Cuenta principal · ejemplo', 'Acc3 roja', 'Acc2 azul grande', 'Acc1 azul chica', 'Efectivo · ejemplo'];
    const liquidoNames = (containerSel) =>
      orderPage.evaluate((sel) => {
        const groups = [...document.querySelectorAll(sel + ' .account-group')];
        const liquido = groups.find((g) => g.querySelector('.account-group-label')?.textContent.trim() === 'Líquido');
        return liquido ? [...liquido.querySelectorAll('.wallet .wn')].map((n) => n.textContent.trim()) : null;
      }, containerSel);

    await tapO('.tabbar [data-tab="ajustes"]');
    await orderPage.waitForTimeout(400);
    const ajustesOrder = await liquidoNames('#s-ajustes');
    check(
      'Ajustes → "Mis cuentas": dentro de Líquido, las tarjetas se agrupan por color y se ordenan de mayor a menor monto',
      JSON.stringify(ajustesOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(ajustesOrder)
    );

    await tapO('.tabbar [data-tab="insights"]');
    await orderPage.waitForTimeout(400);
    const insightsOrder = await liquidoNames('#s-insights');
    check(
      'Insights → "Explorar mis cuentas": el mismo orden (agrupado por color, de mayor a menor monto)',
      JSON.stringify(insightsOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(insightsOrder)
    );

    await tapO('.tabbar [data-tab="calendario"]');
    await orderPage.waitForTimeout(400);
    const calendarioOrder = await liquidoNames('#s-calendario');
    check(
      'Calendario → "Saldos": el mismo orden (agrupado por color, de mayor a menor monto)',
      JSON.stringify(calendarioOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(calendarioOrder)
    );

    await orderPage.close();
  }

  await browser.close();

  // ---------- Reporte ----------
  const failed = results.filter((r) => !r.pass);
  console.log('\n=== Resultado de pruebas pre-push ===');
  for (const r of results) {
    console.log((r.pass ? '✔' : '✘') + ' ' + r.name + (r.pass ? '' : '  → ' + (r.detail || '(sin detalle)')));
  }
  console.log(`\n${results.length - failed.length}/${results.length} pruebas pasaron.`);
  if (failed.length) {
    console.log('\nNO subas estos cambios todavía — corrige lo anterior primero.');
    process.exit(1);
  } else {
    console.log('\nTodo bien: puedes hacer commit y push.');
    process.exit(0);
  }
})();

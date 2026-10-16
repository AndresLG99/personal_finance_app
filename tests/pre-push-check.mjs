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
  for (const tabId of ['movimientos', 'calendario', 'ajustes', 'insights']) {
    await tap(`.tabbar [data-tab="${tabId}"]`);
    await page.waitForTimeout(300);
  }
  check('sin errores de consola tras navegar las 4 pestañas', consoleErrors.length === 0, consoleErrors.join(' | '));

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

  // ---------- Regresión: duplicar/eliminar un movimiento desde el ícono ----------
  await tap('.tabbar [data-tab="movimientos"]');
  await page.waitForTimeout(400);
  const dupBtn = '.tx .icon-action[data-action="duplicate"]';
  const delBtn = '.tx .icon-action[data-action="delete"]';
  if (await exists(dupBtn)) {
    await tap(dupBtn);
    await page.waitForTimeout(400);
    check('icon-action: duplicar movimiento SÍ abre el formulario', await exists('body.sheet-open'), await text('#modal-title'));
    await closeSheet();
  } else {
    check('icon-action: duplicar movimiento SÍ abre el formulario', false, 'no hay movimientos de ejemplo para probar');
  }
  if (await exists(delBtn)) {
    await tap(delBtn);
    await page.waitForTimeout(400);
    check('icon-action: eliminar movimiento SÍ abre la confirmación', await exists('body.sheet-open') && /Eliminar/i.test(await text('#modal-title') || ''), await text('#modal-title'));
    await closeSheet();
  } else {
    check('icon-action: eliminar movimiento SÍ abre la confirmación', false, 'no hay movimientos de ejemplo para probar');
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

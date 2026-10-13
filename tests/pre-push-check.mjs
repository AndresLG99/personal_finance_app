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

  // ---------- Layout responsivo: escritorio (≥1100 ancho, ≥700 alto) ----------
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

  // ---------- Layout responsivo: celular grande en horizontal NO debe activar escritorio ----------
  await page.setViewportSize({ width: 932, height: 430 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const landscapeLayout = await page.evaluate(() => ({
    sidenav: getComputedStyle(document.querySelector('.sidenav')).display,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
  }));
  check('celular en horizontal (932×430): se mantiene en modo móvil', landscapeLayout.sidenav === 'none' && landscapeLayout.tabbar === 'flex', JSON.stringify(landscapeLayout));

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

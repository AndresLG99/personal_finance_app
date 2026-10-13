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

  // ---------- Layout responsivo: escritorio (≥1100 ancho, ≥700 alto) ----------
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const desktopLayout = await page.evaluate(() => ({
    sidenav: getComputedStyle(document.querySelector('.sidenav')).display,
    tabbar: getComputedStyle(document.querySelector('.tabbar')).display,
  }));
  check('escritorio ancho: aparece la barra lateral y se oculta la de pestañas', desktopLayout.sidenav === 'flex' && desktopLayout.tabbar === 'none', JSON.stringify(desktopLayout));

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

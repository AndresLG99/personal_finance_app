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
// - 2026-10-24 (3): el usuario pidió quitar la agrupación por color del punto 2 de arriba
//   (2026-10-24 (2)) y dejar solo el orden por monto, que le parece más simple y conveniente.
//   accountGroupSections() en account-groups.js ya no agrupa por walletTheme(a): dentro de
//   cada división, sortByAmount() solo ordena las cuentas por su propio monto (de mayor a
//   menor), sin importar el color de cada una. Se reescribieron las 3 pruebas del punto 2 de
//   arriba para reflejar el nuevo orden esperado (con cuentas de colores intercalados a
//   propósito, para que una agrupación por color accidental sí se note). Ver pruebas
//   "...se ordenan de mayor a menor monto (sin agrupar por color)" (una por cada vista).
// - 2026-10-25: el orden por monto (punto anterior) comparaba los números tal cual, sin
//   convertir divisa: una cuenta en CAD con un número pequeño (p. ej. $2,000 CAD) podía quedar
//   muy abajo aunque, convertida a la misma moneda, valiera más que una cuenta en MXN con un
//   número mayor ("el monto que está en CAD se ve pequeño porque está en CAD, pero si haces la
//   conversión de currency, queda más arriba"). Se agregaron sortRate()/sortAmount() en app.js:
//   solo para decidir el ORDEN (nunca el monto que se muestra en la tarjeta, que sigue en su
//   propia moneda) convierten a MXN reusando quote() de exchange.js, con la misma caché de 1h;
//   mientras no haya tasa disponible para una divisa se usa el monto sin convertir para esa
//   cuenta en vez de bloquear el orden, y en cuanto la cotización llega (de forma perezosa, en
//   segundo plano) se vuelve a renderizar con el orden ya corregido. Ver pruebas "...queda
//   arriba de ... una vez convertida" y "...no rompe la app" (con la API de cotizaciones
//   simulada y caída, respectivamente).
// - 2026-10-25 (2): cuentas compartidas. Pedido: "que dos personas con cuenta propia puedan
//   agregar movimientos a una cuenta, pero solamente pueda modificar los movimientos que ese
//   usuario creó, y que la cuenta como tal viva en la sesión de uno de los usuarios solamente
//   [...] compartir un código para que el otro usuario pueda linkearse a esa cuenta". Nuevo
//   archivo shared-accounts.js (+ supabase-cuentas-compartidas.sql, hay que correrlo una vez
//   en el SQL Editor de Supabase): el dueño comparte una cuenta con un código desde su
//   formulario de edición ("Compartir esta cuenta"/"Dejar de compartir"); otra persona se une
//   con ese código desde Ajustes → "Unirme con código". La cuenta sigue viviendo solo en el
//   documento del dueño; los movimientos que agregue la persona invitada (solo gasto/ingreso
//   directo, botón "＋ Agregar" dentro de la sección "Movimientos compartidos" del detalle de
//   la cuenta) se guardan aparte, con quién los creó, para que cada quien solo pueda
//   editar/eliminar los suyos (reforzado también por los permisos en Supabase, no solo en la
//   interfaz). Alcance de v1: la persona invitada no ve el historial de antes de unirse (sí ve
//   el saldo real, que incluye su parte); no se soportan transferencias/pagos/MSI compartidos,
//   solo gasto/ingreso. Como esto depende de verdad de Supabase (no del modo demo que usan casi
//   todas las pruebas de este archivo), se prueba simulando un cliente de Supabase falso con
//   datos propios (mismo mecanismo que ya se usaba para "recuperar contraseña" más abajo) en
//   vez de con el servidor de pruebas normal. Ver pruebas "Cuentas compartidas: ...".
// - 2026-10-28: Perfil. Pedido: nombre, apellido, teléfono (con código de país), ver el
//   correo registrado, cambiar contraseña, foto de perfil (o iniciales si no hay foto).
//   Nuevo archivo profile.js + tabla public.profiles y bucket de Storage "avatars" (ver
//   supabase-perfil.sql). "Mi cuenta" en Ajustes ahora muestra la foto/iniciales y el
//   nombre (o "Completa tu perfil"); tocarla abre "Mi perfil", con un botón aparte para
//   "Cambiar contraseña" (reusa auth.updateUser(), pero a diferencia de "nueva contraseña"
//   de la recuperación por correo, aquí la sesión ya es válida y no se recarga la página).
//   Se prueba igual que "Cuentas compartidas" arriba, con fakeSupabaseShared (extendido con
//   una tabla profiles, auth.updateUser y client.storage.from('avatars').upload/
//   getPublicUrl). Ver pruebas "Perfil: ...".
// - 2026-10-28 (2): al agregar el punto anterior, correr la batería completa justo antes de
//   hacer commit (como marca la disciplina de este proyecto) encontró 3 pruebas que
//   empezaron a fallar SIN que el código de Perfil tuviera relación directa con ellas (el
//   mismo fallo salía dos veces seguidas, así que no era aleatorio): la del orden por FX de
//   CAD y las dos de "el saldo del dueño incluye lo agregado por la persona invitada". La
//   causa real NO fue Perfil en sí, sino dos problemas que Perfil dejó al descubierto:
//   (a) shared-accounts.js calculaba su propio "hoy" con new Date().toISOString() (fecha en
//   UTC) para el saldo base (asOf) de una cuenta compartida a la que te uniste, mientras que
//   el resto de la app (today() en finance.js) usa la fecha LOCAL (en-CA); en zonas horarias
//   con offset negativo (la mayoría de América) hay varias horas cada noche en las que "hoy"
//   en UTC ya es "mañana" en local, y esa fecha compartida quedaba un día adelantada. La
//   prueba de "Cuentas compartidas" en este archivo tenía el MISMO problema al sembrar la
//   fecha de su movimiento de prueba, así que el síntoma (saldo sin el movimiento del
//   invitado) se veía tanto en la app real como en la prueba — se corrigió en ambos lados
//   (shared-accounts.js ahora importa today() de finance.js; este archivo usa
//   toLocaleDateString('en-CA') en vez de toISOString() al sembrar esa fecha). (b) en el
//   flujo de inicio de sesión, el nuevo fetchProfile(client,user.id) se esperaba (await)
//   ANTES de renderAll(), agregando una llamada de red más, en serie, antes de que la app
//   terminara de "asentarse" — eso retrasaba lo suficiente la cotización de cambio en
//   segundo plano (quote(), usada para ordenar cuentas en otra divisa) como para que la
//   prueba de orden por FX, con una espera fija, la encontrara todavía sin resolver. Se
//   corrigió para que el perfil cargue en SEGUNDO PLANO (sin bloquear renderAll ni el resto
//   del arranque) y solo vuelva a pintar Ajustes cuando llega — igual que ya se hacía con la
//   cotización de cambio — para que agregar Perfil no haga más lento el arranque del resto
//   de la app. Lección para la próxima vez que algo "deje de pasar" sin relación aparente:
//   antes de asumir que es un bug nuevo en el código que se acaba de tocar, revisar si la
//   hora del día (medianoche UTC) o un cambio de timing pueden explicarlo.
// - 2026-10-29: en "Movimientos compartidos", mostrar la foto de perfil de quien hizo cada
//   movimiento en vez del ícono de flecha (que no distinguía entre participantes). Se agregó
//   sharedCreatorIds() en shared-accounts.js (ids distintos de creator_user_id ya cacheados)
//   y cachedProfile()/refreshOtherProfiles() en profile.js (perfiles de OTRAS personas,
//   permitido por self_or_participant_read en supabase-perfil.sql: solo de alguien con quien
//   comparte al menos una cuenta). refreshSharedData() en app.js envuelve refreshShared() y
//   además precarga esos perfiles en segundo plano (sin bloquear, igual que myProfile); se
//   usa en TODOS los lugares que antes llamaban a refreshShared() directamente (unirse,
//   agregar/editar/eliminar movimiento, compartir/dejar de compartir, los tres canales de
//   tiempo real, y el login). sharedTxAvatarMarkup() en app.js decide, por movimiento: tu
//   propia foto/iniciales (myProfile) si lo creaste tú, o las de la otra persona (del caché)
//   si no. Ver pruebas "Movimientos compartidos: ...".
// - 2026-10-29 (2): bloquear movimientos individuales en cuentas compartidas. Pedido:
//   evitar que el dueño siga agregando gasto/ingreso "normal" (desde Nuevo movimiento, una
//   regla recurrente, la asignación automática de pagos de tarjeta, o un CSV importado) a
//   una cuenta que ya comparte, porque esos movimientos nunca los ve la otra persona pero sí
//   cambian el saldo que ella sí ve (se "cuelan" en el base_balance que sincroniza
//   syncSharedBase en cada guardado) — rompe la transparencia que es el punto de compartir
//   una cuenta. Se agregó isSharedAccount(a) en app.js (envuelve sharedOwnedInfo) y se usó
//   para: (a) excluir esas cuentas de opts(), el selector de cuentas que usan Nuevo
//   movimiento, reglas recurrentes y metas — conservando la cuenta ya asignada si el
//   movimiento/regla/meta se creó ANTES de compartirla, para no romper su edición; (b) una
//   segunda validación, en el propio guardado de cada formulario, por si el valor llegara
//   igual (defensa en profundidad, igual que ya se hacía con "las cuentas deben ser
//   diferentes"); (c) en la asignación automática de pago de tarjeta (allocationForm +
//   defaultPaymentSource en payment-allocation.js), si la cuenta sugerida por el último pago
//   ya es compartida, se obliga a elegir otra en vez de reusarla en automático; (d) en la
//   importación de CSV, previewCSV() ahora recibe el set de ids de cuentas compartidas y
//   rechaza cualquier fila que apunte a una de ellas con un error claro. Además, al tocar
//   "Compartir esta cuenta" en una cuenta que ya tiene saldo o movimientos, ahora se muestra
//   antes una advertencia (shareAccountForm en app.js): ese saldo se "migra" como el punto de
//   partida que verá la otra persona, pero el detalle de los movimientos que lo formaron
//   sigue siendo privado — de ahí en adelante, los movimientos nuevos deben agregarse como
//   "Movimiento compartido". No se tocó el base_balance ni se creó una fila nueva en
//   shared_account_transactions para "migrar" el saldo (evita contarlo doble: el saldo
//   compartido ya es base_balance + movimientos compartidos, y base_balance sigue
//   reflejando el saldo privado real, que de aquí en adelante ya no cambia porque los
//   movimientos nuevos están bloqueados). Ver pruebas "Cuentas compartidas: los movimientos
//   individuales nuevos..." y la prueba de previewCSV al inicio del archivo.
// - 2026-10-29 (3): modo claro/oscuro (por default "Sistema", con "Claro"/"Oscuro" como
//   elección explícita que siempre gana) y color de acentuación libre (cualquier HEX, ya
//   no una paleta fija). El cálculo de color vive UNA sola vez, en un <script> normal al
//   inicio de <head> en index.html (ANTES de las hojas de estilo, para que la primera
//   pintura ya salga con lo guardado en localStorage sin parpadeo): ahí se deriva
//   --accent-ink (blanco u oscuro #1A0E08 según la luminancia relativa WCAG del color
//   elegido, para que el texto/ícono encima siempre se lea) y --accent-soft/-dark/-hover/
//   -border/-shadow/-tint-weak a partir de ese único color base. theme.js (módulo que
//   importa app.js) solo agrega la persistencia en localStorage (theme:mode, theme:accent)
//   y llama a esas mismas funciones (window.__theme), sin duplicar la fórmula. styles.css
//   mantiene oscuro como default de :root y agrega overrides de variables bajo
//   :root[data-theme="light"] y @media(prefers-color-scheme:light) (solo si no hay
//   elección explícita en contra). Se auditaron interface.css/styles.css/app.js en busca
//   de colores fijos que asumían SIEMPRE fondo oscuro o SIEMPRE el naranja original
//   (entre otros: navbar/pushbar/tabs ahora usan --chrome-bg; .sheet/.fields usan
//   --surface/--field; .seg, .chip[aria-pressed], .color-auto-btn, .color-swatch,
//   .side-tab, .fab y sharedTxAvatarMarkup()/avatarMarkup() en app.js ahora usan variables
//   en vez de un literal) para que ningún control se vuelva invisible o de bajo contraste
//   al cambiar de tema o de acento. Ver pruebas "Apariencia: ...".
// - 2026-10-30: la fecha de liquidación de tarjetas/deudas (payoff() en insights.js, que
//   alimenta "Se liquida" en vAccount y vRecomendaciones) mostraba la ÚLTIMA fecha en que
//   el saldo proyectado llegaba a $0, no la primera: el bucle que recorre los movimientos
//   futuros reseteaba la fecha encontrada a null cada vez que el saldo volvía a subir (p.
//   ej. por un cargo futuro programado o una regla recurrente), y la volvía a fijar en el
//   siguiente momento en que llegara a $0 — así que, con un ciclo de "se salda → se
//   vuelve a endeudar → se vuelve a saldar", se reportaba la fecha del último ciclo. Ahora,
//   una vez encontrada la primera fecha en $0, ya no se vuelve a mover. Ver prueba "Fecha
//   de liquidación: ...".

import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://127.0.0.1:8901/index.html';
const AVATAR_FIXTURE = fileURLToPath(new URL('./fixtures/avatar-test.png', import.meta.url));
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
}

// Cliente de Supabase falso y genérico (reusado por las pruebas de cuentas compartidas más
// abajo): guarda sus "tablas" en memoria (seedDb + lo que se inserte durante la prueba) y
// registra cada llamada en localStorage (clave '__testCalls') para poder revisar qué se
// mandó a guardar. currentUserId es el id del usuario "con el que inicias sesión" en esa
// página; bookPayload/bookRevision, si se dan, precargan finance_books como si ya existiera
// (para no depender de que load() tenga que guardar algo al iniciar).
function fakeSupabaseShared(currentUserId, seedDb, book) {
  const seedJson = JSON.stringify(seedDb || {});
  const bookJson = JSON.stringify(book || null);
  const uidJson = JSON.stringify(currentUserId);
  return `
    window.supabase = {
      createClient: function () {
        const db = Object.assign({ finance_books: [], shared_accounts: [], shared_account_members: [], shared_account_transactions: [], profiles: [] }, ${seedJson});
        const storageFiles = {};
        const userEmail = ${uidJson} + '@example.com';
        const bookSeed = ${bookJson};
        if (bookSeed) db.finance_books.push({ user_id: ${uidJson}, payload: bookSeed.payload, revision: bookSeed.revision });
        let seq = 0;
        function log(name, payload) {
          try {
            const arr = JSON.parse(localStorage.getItem('__testCalls') || '[]');
            arr.push([name, payload]);
            localStorage.setItem('__testCalls', JSON.stringify(arr));
          } catch (e) {}
        }
        function matchOne(row, filters) { return filters.every((f) => f(row)); }
        function builder(table) {
          let filters = [];
          let pendingInsert = null, pendingUpdate = null, pendingDelete = false;
          const self = {
            select: function () { return self; },
            eq: function (col, val) { filters.push((r) => r[col] === val); return self; },
            in: function (col, vals) { filters.push((r) => vals.includes(r[col])); return self; },
            insert: function (row) { pendingInsert = Array.isArray(row) ? row : [row]; return self; },
            update: function (patch) { pendingUpdate = patch; return self; },
            delete: function () { pendingDelete = true; return self; },
            maybeSingle: function () { return exec().then((res) => Object.assign({}, res, { data: (res.data && res.data[0]) || null })); },
            single: function () { return exec().then((res) => Object.assign({}, res, { data: (res.data && res.data[0]) || null })); },
            then: function (resolve, reject) { return exec().then(resolve, reject); },
          };
          function exec() {
            log('from:' + table, { filters: filters.length, pendingInsert, pendingUpdate, pendingDelete });
            if (pendingInsert) {
              const rows = pendingInsert.map((r) => Object.assign({ id: table + '_' + ++seq, share_code: 'CODE' + seq, revoked: false }, r));
              db[table].push.apply(db[table], rows);
              return Promise.resolve({ data: rows, error: null });
            }
            if (pendingUpdate) {
              const changed = [];
              db[table] = db[table].map((r) => { if (matchOne(r, filters)) { const nr = Object.assign({}, r, pendingUpdate); changed.push(nr); return nr; } return r; });
              return Promise.resolve({ data: changed, error: null });
            }
            if (pendingDelete) {
              db[table] = db[table].filter((r) => !matchOne(r, filters));
              return Promise.resolve({ data: null, error: null });
            }
            const rows = db[table].filter((r) => matchOne(r, filters));
            return Promise.resolve({ data: rows, error: null });
          }
          return self;
        }
        return {
          auth: {
            onAuthStateChange: function (cb) {
              window.__testEmit = function (event, session) { cb(event, session); };
              setTimeout(function () { cb('SIGNED_IN', { user: { id: ${uidJson}, email: userEmail } }); }, 0);
            },
            getSession: async function () { return { data: { session: { user: { id: ${uidJson}, email: userEmail } } }, error: null }; },
            refreshSession: async function () { return { data: { session: { user: { id: ${uidJson}, email: userEmail } } }, error: null }; },
            updateUser: async function (args) { log('updateUser', args); return { error: null }; },
            signOut: async function () { return { error: null }; },
          },
          storage: {
            from: function (bucket) {
              return {
                upload: async function (path, blob, opts) {
                  log('storage:' + bucket + ':upload', { path, size: blob && blob.size, contentType: opts && opts.contentType });
                  storageFiles[bucket + '/' + path] = blob;
                  return { data: { path }, error: null };
                },
                getPublicUrl: function (path) {
                  return { data: { publicUrl: 'https://fake-test.supabase.co/storage/v1/object/public/' + bucket + '/' + path } };
                },
              };
            },
          },
          from: builder,
          rpc: async function (name, args) {
            log('rpc:' + name, args);
            if (name === 'save_finance_book') {
              const rows = db.finance_books.filter((r) => r.user_id === ${uidJson});
              if (rows.length) { rows[0].payload = args.p_payload; rows[0].revision = (rows[0].revision || 0) + 1; return { data: rows[0].revision, error: null }; }
              db.finance_books.push({ user_id: ${uidJson}, payload: args.p_payload, revision: 1 });
              return { data: 1, error: null };
            }
            if (name === 'join_shared_account') {
              const code = String(args.p_code || '').trim().toLowerCase();
              const row = db.shared_accounts.find((r) => String(r.share_code).toLowerCase() === code && !r.revoked);
              if (!row) return { data: null, error: { message: 'CODIGO_INVALIDO' } };
              if (row.owner_user_id === ${uidJson}) return { data: null, error: { message: 'ES_TU_PROPIA_CUENTA' } };
              db.shared_account_members.push({ shared_account_id: row.id, user_id: ${uidJson} });
              return { data: [{ id: row.id, owner_user_id: row.owner_user_id, account_id: row.account_id, name: row.name, type: row.type, currency: row.currency, color: row.color, base_balance: row.base_balance }], error: null };
            }
            return { data: null, error: null };
          },
          channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
          removeChannel: async function () {},
        };
      },
    };
  `;
}
const FAKE_CONFIG = `export const SUPABASE_URL='https://fake-test.supabase.co'; export const SUPABASE_PUBLISHABLE_KEY='fake-key';`;

// Reusado por las pruebas de "Cuentas compartidas" (lote 2026-10-29) para inspeccionar qué
// se está mostrando en vez del ícono de flecha en una fila de "Movimientos compartidos":
// null si no se encontró la fila, o { hasImg, src, text } (si tiene foto, hasImg=true y src
// es la URL; si no, hasImg=false y text son las iniciales mostradas).
function sharedRowAvatar(page, concept) {
  return page.evaluate((c) => {
    const h2s = [...document.querySelectorAll('#push-content h2')];
    const h2 = h2s.find((x) => x.textContent.trim() === 'Movimientos compartidos');
    const card = h2 ? h2.closest('.card') : null;
    const t1 = card ? [...card.querySelectorAll('.t1')].find((e) => e.textContent.trim() === c) : null;
    const icon = t1 ? t1.closest('.tx')?.querySelector('.merchant-icon') : null;
    if (!icon) return null;
    const img = icon.querySelector('img');
    return { hasImg: !!img, src: img ? img.getAttribute('src') : null, text: img ? null : icon.textContent.trim() };
  }, concept);
}

(async () => {
  // ---------- previewCSV: rechaza filas que apuntan a una cuenta ya compartida (punto 3,
  // 2026-10-29 (2)) — prueba directa de la función pura, sin navegador: no depende del DOM,
  // así que no hace falta levantar Chromium ni el servidor estático para esta parte. ----------
  {
    const { previewCSV } = await import('../csv-import.js');
    const csvState = { accounts: [
      { id: 'acc1', name: 'Compartida', currency: 'MXN', archived: false },
      { id: 'acc2', name: 'Normal', currency: 'MXN', archived: false },
    ], transactions: [] };
    const csvText = 'id,fecha,tipo,concepto,cuenta_origen,cuenta_destino,monto,categoria,negocio,notas,monto_recibido\r\n1,2026-01-01,gasto,Prueba CSV,acc1,,100.00,Otros,,,\r\n';
    const withoutBlock = previewCSV(csvText, csvState, '2020-01-01');
    const withBlock = previewCSV(csvText, csvState, '2020-01-01', new Set(['acc1']));
    check(
      'previewCSV: sin marcar ninguna cuenta como compartida, una fila con cuenta_origen=acc1 se acepta normalmente',
      withoutBlock.errors.length === 0 && withoutBlock.transactions.length === 1,
      JSON.stringify(withoutBlock)
    );
    check(
      'previewCSV: con acc1 en el set de cuentas compartidas, la misma fila se rechaza con un error que lo explica',
      withBlock.errors.length === 1 && /compartida/i.test(withBlock.errors[0]) && withBlock.transactions.length === 0,
      JSON.stringify(withBlock)
    );
  }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const consoleErrors = [];
  // colorScheme:'dark' fija la preferencia de SO que simula el navegador — sin esto, el
  // color por default que usa Chromium headless no está garantizado (puede ser claro u
  // oscuro según el entorno) y, desde que existe el modo claro (punto 5, 2026-10-29 (3)),
  // eso decide qué paleta aplica cuando no hay data-theme explícito, lo que volvía
  // impredecibles pruebas de color escritas asumiendo el oscuro original.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
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

  // ---------- Fecha de liquidación (payoff en insights.js): debe ser la PRIMERA vez que el
  // saldo llega a $0, no la última (2026-10-30). Antes, el bucle reseteaba la fecha a null
  // cada vez que el saldo proyectado volvía a subir (p. ej. por un cargo futuro programado)
  // y la fijaba de nuevo en el siguiente momento en que volviera a $0 — así que, con un
  // cargo futuro que vuelve a generar deuda y un segundo pago que la vuelve a saldar más
  // adelante, "Se liquida" mostraba la fecha de ESE segundo saldo en vez de la primera.
  // Aquí se arma justo ese escenario en la tarjeta de ejemplo (que ya trae un pago pendiente
  // de $1,500 el día 22 del próximo mes, dejando $3,000 de deuda): un pago que la salda por
  // completo unos días después, luego un cargo que la vuelve a endeudar $500 dos meses
  // adelante, y un segundo pago que la vuelve a saldar poco después — "Se liquida" debe
  // seguir mostrando la fecha del PRIMER pago, no la del segundo. ----------
  {
    const payoffPage = await context.newPage();
    await payoffPage.goto(BASE, { waitUntil: 'networkidle' });
    await payoffPage.waitForTimeout(700);

    const monthsFromNow = (months, day) => {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() + months, day);
      return d.toISOString().slice(0, 10);
    };
    const firstPayoffDate = monthsFromNow(1, 25);
    const chargeDate = monthsFromNow(2, 10);
    const secondPayoffDate = monthsFromNow(2, 20);

    const addTx = async (kind, from, date, amount) => {
      await payoffPage.evaluate(() => document.querySelector('.fab[data-action="new"]').click());
      await payoffPage.waitForTimeout(400);
      await payoffPage.selectOption('[name=kind]', kind);
      await payoffPage.waitForTimeout(300);
      await payoffPage.fill('[name=concept]', 'Prueba payoff ' + kind + ' ' + date);
      await payoffPage.selectOption('[name=from]', from);
      await payoffPage.selectOption('[name=status]', 'pending');
      await payoffPage.fill('[name=date]', date);
      await payoffPage.fill('input[aria-label="Importe"]', String(amount));
      await payoffPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
      await payoffPage.evaluate(() => document.querySelector('#save').click());
      await payoffPage.waitForTimeout(500);
    };

    await addTx('payment', 'bank', firstPayoffDate, '3000'); // salda los $3,000 que quedan tras el pago de ejemplo
    await addTx('expense', 'credit', chargeDate, '500'); // un cargo futuro vuelve a generar $500 de deuda
    await addTx('payment', 'bank', secondPayoffDate, '500'); // y un segundo pago la vuelve a saldar

    check(
      'Fecha de liquidación: se pudieron programar los 3 movimientos de la prueba (sin quedar la hoja abierta por un error)',
      !(await payoffPage.evaluate(() => document.body.classList.contains('sheet-open')))
    );

    await payoffPage.evaluate(() => document.querySelector('.tabbar [data-tab="insights"]').click());
    await payoffPage.waitForTimeout(400);
    await payoffPage.evaluate(() => document.querySelector('.wallet[data-id="credit"]').click());
    await payoffPage.waitForTimeout(500);
    const liquidaText = await payoffPage.evaluate(() => {
      const labels = [...document.querySelectorAll('#push-content .card.tight .label')];
      const label = labels.find((l) => l.textContent.trim() === 'Se liquida');
      return label ? label.nextElementSibling?.textContent.trim() : null;
    });
    const expectedLabel = await payoffPage.evaluate((d) => {
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      const x = new Date(d + 'T12:00:00');
      return x.getDate() + ' ' + cap(x.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')) + ' ' + x.getFullYear();
    }, firstPayoffDate);
    check(
      'Fecha de liquidación: "Se liquida" muestra la PRIMERA fecha en que la tarjeta llega a $0, aunque un cargo futuro programado la vuelva a endeudar y otro pago posterior la vuelva a saldar',
      liquidaText === expectedLabel,
      'esperado: ' + expectedLabel + ' · obtenido: ' + liquidaText
    );

    await payoffPage.close();
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
  const phoneContext = await browser.newContext({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, colorScheme: 'dark' });
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

  // ---------- Lote 2026-10-24 (2), punto 2: las cards de cuentas se ordenan por monto (sin agrupar por color) ----------
  // Pedido original: en todas las secciones donde aparecen las tarjetas de cuenta, ordenarlas
  // de mayor a menor monto en valor absoluto. Primero se agregó además una agrupación por
  // color de tarjeta dentro de cada división; el usuario pidió quitar esa agrupación y dejar
  // solo el orden por monto (más simple). accountGroupSections() ya no agrupa por
  // walletTheme(a): dentro de cada división (Líquido/Deudas/Por cobrar), sortByAmount() en
  // account-groups.js solo ordena las cuentas por su propio monto, de mayor a menor, sin
  // importar el color de cada una. Se verifica con 3 cuentas de prueba de distinto color y
  // monto en las 3 vistas donde se listan las tarjetas de cuenta: Ajustes, Insights y
  // Calendario.
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
    // Cuenta de ejemplo "bank" (saldo ~$23,155) y "cash" ($1,200) ya existen. Se agregan 3 más,
    // todas de tipo débito (misma división "Líquido"), con colores distintos a propósito: si
    // el código agrupara por color por error, Acc1/Acc2 (ambas azules) quedarían juntas aunque
    // su monto no sea el más cercano; el orden correcto por monto puro las separa.
    await createDebitAccount('Acc1 azul chica', 'blue', 500);
    await createDebitAccount('Acc2 azul grande', 'blue', 2000);
    await createDebitAccount('Acc3 roja', 'red', 3000);

    // Orden esperado en "Líquido", solo por monto (de mayor a menor), SIN agrupar por color:
    // bank (~23,155) > Acc3 (3000) > Acc2 (2000) > cash (1200) > Acc1 (500). Nótese que cash
    // queda entre Acc2 y Acc1 — si hubiera agrupación por color, cash (verde) no podría
    // meterse entre las dos cuentas azules.
    const expectedOrder = ['Cuenta principal · ejemplo', 'Acc3 roja', 'Acc2 azul grande', 'Efectivo · ejemplo', 'Acc1 azul chica'];
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
      'Ajustes → "Mis cuentas": dentro de Líquido, las tarjetas se ordenan de mayor a menor monto (sin agrupar por color)',
      JSON.stringify(ajustesOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(ajustesOrder)
    );

    await tapO('.tabbar [data-tab="insights"]');
    await orderPage.waitForTimeout(400);
    const insightsOrder = await liquidoNames('#s-insights');
    check(
      'Insights → "Explorar mis cuentas": el mismo orden (solo por monto, sin agrupar por color)',
      JSON.stringify(insightsOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(insightsOrder)
    );

    await tapO('.tabbar [data-tab="calendario"]');
    await orderPage.waitForTimeout(400);
    const calendarioOrder = await liquidoNames('#s-calendario');
    check(
      'Calendario → "Saldos": el mismo orden (solo por monto, sin agrupar por color)',
      JSON.stringify(calendarioOrder) === JSON.stringify(expectedOrder),
      JSON.stringify(calendarioOrder)
    );

    await orderPage.close();
  }

  // ---------- 2026-10-25: el orden por monto convierte a una moneda común (justo entre divisas) ----------
  // Pedido: "Considera que el monto que esta en CAD se ve pequeño porque esta en CAD, pero si
  // haces la conversion de currency, queda mas arriba." Se prueban dos escenarios: (a) con
  // cotización disponible (simulada, para no depender de la red real), una cuenta en CAD con
  // número pequeño debe pasar a quedar ARRIBA de una cuenta en MXN con número mayor, una vez
  // convertida — y el monto que se MUESTRA en su tarjeta debe seguir en CAD, sin convertir; (b)
  // con la API de cotizaciones caída, crear esa misma cuenta no debe romper nada (cae de nuevo a
  // comparar montos sin convertir).
  {
    const fxPage = await context.newPage();
    const fxErrors = [];
    fxPage.on('pageerror', (e) => fxErrors.push(e.message));
    fxPage.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('404')) fxErrors.push(m.text());
    });
    const today = new Date().toISOString().slice(0, 10);
    await fxPage.route('**api.frankfurter.dev/v2/rate/CAD/MXN**', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ amount: 1, base: 'CAD', date: today, rates: { MXN: 15 }, rate: 15 }) })
    );
    await fxPage.goto(BASE, { waitUntil: 'networkidle' });
    await fxPage.waitForTimeout(700);
    const tapFx = (sel) => fxPage.evaluate((s) => document.querySelector(s)?.click(), sel);

    await tapFx('.tabbar [data-tab="ajustes"]');
    await fxPage.waitForTimeout(300);
    await tapFx('#add-account');
    await fxPage.waitForTimeout(400);
    await fxPage.fill('[name=name]', 'Acc CAD chica en numero');
    await fxPage.selectOption('[name=type]', 'debit');
    await fxPage.selectOption('[name=currency]', 'CAD');
    await fxPage.fill('input[aria-label="Saldo inicial (negativo si debes)"]', '2000');
    await fxPage.evaluate(() => document.querySelector('input[aria-label="Saldo inicial (negativo si debes)"]').blur());
    await tapFx('#save');
    // Tiempo para que se resuelva la cotización simulada en segundo plano y se vuelva a renderizar.
    await fxPage.waitForTimeout(1200);

    const liquidoOrderFx = await fxPage.evaluate(() => {
      const groups = [...document.querySelectorAll('#s-ajustes .account-group')];
      const liquido = groups.find((g) => g.querySelector('.account-group-label')?.textContent.trim() === 'Líquido');
      return liquido ? [...liquido.querySelectorAll('.wallet .wn')].map((n) => n.textContent.trim()) : null;
    });
    check(
      'Ajustes → "Mis cuentas": una cuenta en CAD con número chico ($2,000 CAD ≈ $30,000 MXN con la tasa simulada) queda arriba de "Cuenta principal · ejemplo" (≈$23,155 MXN) una vez convertida para ordenar',
      Array.isArray(liquidoOrderFx) &&
        liquidoOrderFx.includes('Acc CAD chica en numero') &&
        liquidoOrderFx.includes('Cuenta principal · ejemplo') &&
        liquidoOrderFx.indexOf('Acc CAD chica en numero') < liquidoOrderFx.indexOf('Cuenta principal · ejemplo'),
      JSON.stringify(liquidoOrderFx)
    );

    const cadCardText = await fxPage.evaluate(() => {
      const card = [...document.querySelectorAll('#s-ajustes .wallet')].find((w) => w.querySelector('.wn')?.textContent.trim() === 'Acc CAD chica en numero');
      return card ? { monto: card.querySelector('.wv')?.textContent || '', tipo: card.querySelector('.ws')?.textContent || '' } : null;
    });
    check(
      'La conversión solo decide el ORDEN de las tarjetas: el monto que se muestra en la tarjeta de la cuenta CAD sigue en su propia moneda (no aparece convertido a MXN en pantalla)',
      !!cadCardText && /CAD/.test(cadCardText.tipo) && /2,000/.test(cadCardText.monto) && !/30,000/.test(cadCardText.monto),
      JSON.stringify(cadCardText)
    );

    await fxPage.close();
  }

  {
    const fxFailPage = await context.newPage();
    const fxFailErrors = [];
    fxFailPage.on('pageerror', (e) => fxFailErrors.push(e.message));
    fxFailPage.on('console', (m) => {
      // ERR_FAILED es el aviso normal del navegador de que la petición se abortó a propósito
      // (es justo lo que estamos simulando); no cuenta como error de la app.
      if (m.type() === 'error' && !m.text().includes('404') && !m.text().includes('ERR_FAILED')) fxFailErrors.push(m.text());
    });
    await fxFailPage.route('**api.frankfurter.dev/**', (route) => route.abort());
    await fxFailPage.goto(BASE, { waitUntil: 'networkidle' });
    await fxFailPage.waitForTimeout(700);
    const tapFxF = (sel) => fxFailPage.evaluate((s) => document.querySelector(s)?.click(), sel);

    await tapFxF('.tabbar [data-tab="ajustes"]');
    await fxFailPage.waitForTimeout(300);
    await tapFxF('#add-account');
    await fxFailPage.waitForTimeout(400);
    await fxFailPage.fill('[name=name]', 'Acc CAD sin red');
    await fxFailPage.selectOption('[name=type]', 'debit');
    await fxFailPage.selectOption('[name=currency]', 'CAD');
    await fxFailPage.fill('input[aria-label="Saldo inicial (negativo si debes)"]', '2000');
    await fxFailPage.evaluate(() => document.querySelector('input[aria-label="Saldo inicial (negativo si debes)"]').blur());
    await tapFxF('#save');
    await fxFailPage.waitForTimeout(1000);

    const stillRendered = await fxFailPage.evaluate(
      () => document.querySelectorAll('#s-ajustes .wallet').length > 0 && !!document.querySelector('[data-action="account-edit"][data-id]')
    );
    check(
      'Si la API de cotizaciones no responde, crear una cuenta en otra divisa no rompe la app (sin errores de JS; cae de nuevo a comparar montos sin convertir)',
      stillRendered && fxFailErrors.length === 0,
      'rendered=' + stillRendered + ' errors=' + JSON.stringify(fxFailErrors)
    );

    await fxFailPage.close();
  }

  // ---------- 2026-10-25 (2): cuentas compartidas — lado del dueño ----------
  {
    // OJO: usar la fecha LOCAL (en-CA), igual que today() en finance.js — no
    // toISOString(), que es UTC. En zonas horarias con offset negativo (la mayoría de
    // América), hay varias horas cada noche en las que "hoy" en UTC ya es "mañana" en
    // local; si se sembrara con la fecha UTC, el movimiento compartido de prueba quedaría
    // fechado un día "en el futuro" respecto al today() de la app durante esas horas, y el
    // filtro r.date<=date de sharedContribution lo excluiría del saldo (bug 2026-10-28:
    // así se detectó esta inconsistencia, ver también shared-accounts.js).
    const TODAY = new Date().toLocaleDateString('en-CA');
    const ownerSeed = {
      shared_accounts: [{ id: 'sa1', owner_user_id: 'owner-1', account_id: 'acc1', share_code: 'preset1', name: 'Cuenta para compartir', type: 'debit', currency: 'MXN', color: 'auto', base_balance: 0, revoked: false }],
      shared_account_members: [],
      shared_account_transactions: [{ id: 'tx1', shared_account_id: 'sa1', creator_user_id: 'guest-9', kind: 'income', amount: 200000, concept: 'Depósito de X', category: '', date: TODAY }],
      // Perfil de la persona invitada (con foto) para probar que "Movimientos compartidos"
      // muestra SU foto en vez del ícono de flecha — ver sharedTxAvatarMarkup() en app.js.
      // A propósito NO se siembra un perfil para 'owner-1' (el dueño): así se prueba también
      // que, sin fila de perfil propia, el movimiento que agrega el dueño cae de nuevo a sus
      // iniciales (de su correo, "owner-1@example.com" → "OW").
      profiles: [{ id: 'guest-9', first_name: 'Gabriela', last_name: 'Soto', phone_country_code: '+52', phone_number: '', avatar_url: 'https://fake-test.supabase.co/storage/v1/object/public/avatars/guest-9/avatar.jpg' }],
    };
    const ownerBook = { payload: { accounts: [
      { id: 'acc1', name: 'Cuenta para compartir', type: 'debit', currency: 'MXN', opening: 500000, asOf: '2026-01-01', available: true, archived: false },
      { id: 'acc2', name: 'Cuenta sin compartir', type: 'debit', currency: 'MXN', opening: 100000, asOf: '2026-01-01', available: true, archived: false },
      // Saldo 0 y sin movimientos a propósito: para probar que compartir una cuenta SIN
      // nada que migrar no muestra la advertencia de saldo/movimientos existentes (punto 3,
      // 2026-10-29 (2)).
      { id: 'acc3', name: 'Cuenta vacía', type: 'debit', currency: 'MXN', opening: 0, asOf: '2026-01-01', available: true, archived: false },
    // Movimiento de ANTES de compartir acc1 (ya estaba ahí cuando se sembró sa1 arriba):
    // sirve para probar que, al bloquear movimientos NUEVOS en una cuenta compartida, los
    // que ya existían de antes siguen pudiéndose editar sin romperse.
    ], transactions: [{ id: 'oldtx1', kind: 'expense', concept: 'Gasto viejo en cuenta compartida', category: 'Otros', from: 'acc1', date: '2026-01-10', amount: 50000, status: 'done' }], rules: [], goals: [] }, revision: 1 };

    const ownerPage = await context.newPage();
    await ownerPage.route('**/config.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: FAKE_CONFIG }));
    await ownerPage.route('**/vendor/supabase.umd.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeSupabaseShared('owner-1', ownerSeed, ownerBook) }));
    await ownerPage.goto(BASE, { waitUntil: 'networkidle' });
    await ownerPage.waitForTimeout(900);
    const tapO2 = (sel) => ownerPage.evaluate((s) => document.querySelector(s)?.click(), sel);
    const textO2 = (sel) => ownerPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const callsO = () => ownerPage.evaluate(() => JSON.parse(localStorage.getItem('__testCalls') || '[]'));

    // Cuenta SIN compartir todavía: el formulario debe ofrecer "Compartir esta cuenta".
    await tapO2('.tabbar [data-tab="ajustes"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('[data-action="account-edit"][data-id="acc2"]');
    await ownerPage.waitForTimeout(400);
    check(
      'Cuentas compartidas: una cuenta sin compartir muestra el botón "Compartir esta cuenta" (no "Compartida")',
      (await ownerPage.evaluate(() => !!document.querySelector('#share-account'))) && !(await ownerPage.evaluate(() => !!document.querySelector('#unshare-account')))
    );
    // 2026-10-29 (2): "Compartir esta cuenta" ya no comparte de inmediato — primero muestra
    // una advertencia (acc2 tiene saldo de $1,000.00, aunque sin movimientos todavía) y solo
    // comparte cuando se confirma.
    await tapO2('#share-account');
    await ownerPage.waitForTimeout(400);
    const warnBody = (await textO2('#fields')) || '';
    check(
      'Cuentas compartidas: al tocar "Compartir esta cuenta" en una con saldo, se muestra antes una advertencia (con el saldo actual y que de ahí en adelante se usa "Movimientos compartidos")',
      (await textO2('#modal-title')) === 'Compartir esta cuenta' && /\$1,000\.00/.test(warnBody) && /Movimientos compartidos/.test(warnBody),
      warnBody
    );
    await tapO2('#save');
    await ownerPage.waitForTimeout(500);
    check(
      'Cuentas compartidas: al confirmar la advertencia, se comparte de verdad: se guarda en shared_accounts y se muestra el código',
      /Compartida · código\s+CODE1/.test((await textO2('#fields')) || ''),
      await textO2('#fields')
    );
    await tapO2('#unshare-account');
    await ownerPage.waitForTimeout(500);
    check(
      'Cuentas compartidas: "Dejar de compartir" quita el código y vuelve a ofrecer "Compartir esta cuenta"',
      (await ownerPage.evaluate(() => !!document.querySelector('#share-account'))) && !(await ownerPage.evaluate(() => !!document.querySelector('#unshare-account')))
    );
    await ownerPage.keyboard.press('Escape');
    await ownerPage.waitForTimeout(300);

    // acc3 no tiene saldo ni movimientos: compartirla no debería mostrar la advertencia de
    // "ya tiene saldo/movimientos" (solo el aviso simple de que los nuevos movimientos van
    // por "Movimientos compartidos").
    await tapO2('[data-action="account-edit"][data-id="acc3"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('#share-account');
    await ownerPage.waitForTimeout(400);
    const emptyWarnBody = (await textO2('#fields')) || '';
    check(
      'Cuentas compartidas: compartir una cuenta sin saldo ni movimientos no muestra la advertencia de "ya tiene..." (solo el aviso simple)',
      !/ya tiene/.test(emptyWarnBody) && /Movimientos compartidos/.test(emptyWarnBody),
      emptyWarnBody
    );
    await tapO2('#save');
    await ownerPage.waitForTimeout(500);
    check(
      'Cuentas compartidas: esa cuenta sin nada que migrar igual queda compartida al confirmar',
      /Compartida · código\s+CODE2/.test((await textO2('#fields')) || ''),
      await textO2('#fields')
    );
    await ownerPage.keyboard.press('Escape');
    await ownerPage.waitForTimeout(300);

    // Cuenta YA compartida (acc1, sembrada con un movimiento compartido de "guest-9"): el
    // saldo debe incluir ese movimiento, y no debe poder editarse/eliminarse (no es suyo).
    await tapO2('.tabbar [data-tab="insights"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('.wallet[data-id="acc1"]');
    await ownerPage.waitForTimeout(500);
    const saldoTexto = await ownerPage.evaluate(() => document.querySelector('#push-content .wallet .num')?.textContent?.trim());
    check(
      'Cuentas compartidas: el saldo del dueño incluye lo agregado por la persona invitada ($5,000 − $500 del gasto previo + $2,000 = $6,500.00)',
      saldoTexto === '$6,500.00',
      saldoTexto
    );
    const otherRowReadonly = await ownerPage.evaluate(() => {
      const h2s = [...document.querySelectorAll('#push-content h2')];
      const h2 = h2s.find((x) => x.textContent.trim() === 'Movimientos compartidos');
      const card = h2 ? h2.closest('.card') : null;
      const row = card ? [...card.querySelectorAll('.t1')].find((e) => e.textContent.trim() === 'Depósito de X') : null;
      return row ? !row.closest('.swipe-row') : null;
    });
    check(
      'Cuentas compartidas: un movimiento agregado por la otra persona se ve, pero sin opción de editar/eliminar (no es del dueño)',
      otherRowReadonly === true,
      String(otherRowReadonly)
    );

    // 2026-10-29: en vez del ícono de flecha, "Movimientos compartidos" debe mostrar la
    // foto de perfil de quien hizo cada movimiento (o sus iniciales si no tiene foto).
    const depositoAvatar = await sharedRowAvatar(ownerPage, 'Depósito de X');
    check(
      'Movimientos compartidos: el movimiento de la persona invitada (con foto en su perfil) muestra su foto, no un ícono',
      depositoAvatar?.hasImg === true && depositoAvatar?.src === 'https://fake-test.supabase.co/storage/v1/object/public/avatars/guest-9/avatar.jpg',
      JSON.stringify(depositoAvatar)
    );

    // El dueño agrega su propio movimiento compartido: debe quedar con su propio creator_user_id.
    await tapO2('[data-action="add-shared-tx"]');
    await ownerPage.waitForTimeout(400);
    await ownerPage.selectOption('[name=kind]', 'expense');
    await ownerPage.fill('[name=concept]', 'Café compartido');
    await ownerPage.fill('input[aria-label="Importe"]', '300');
    await ownerPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await tapO2('#save');
    await ownerPage.waitForTimeout(600);
    const insertCalls = (await callsO()).filter((c) => c[0] === 'from:shared_account_transactions' && c[1]?.pendingInsert);
    const myInsert = insertCalls.flatMap((c) => c[1].pendingInsert).find((r) => r.concept === 'Café compartido');
    check(
      'Cuentas compartidas: el movimiento que agrega el dueño se guarda con su propio creator_user_id (no el de la cuenta)',
      myInsert?.creator_user_id === 'owner-1' && myInsert?.kind === 'expense' && myInsert?.amount === 30000,
      JSON.stringify(myInsert)
    );
    const cafeAvatar = await sharedRowAvatar(ownerPage, 'Café compartido');
    check(
      'Movimientos compartidos: tu propio movimiento muestra TUS iniciales (de tu correo, "owner-1@example.com" → "OW") al no tener foto ni nombre guardados',
      cafeAvatar?.hasImg === false && cafeAvatar?.text === 'OW',
      JSON.stringify(cafeAvatar)
    );
    const saldoTrasGasto = await ownerPage.evaluate(() => document.querySelector('#push-content .wallet .num')?.textContent?.trim());
    check(
      'Cuentas compartidas: el saldo baja de inmediato con el nuevo movimiento ($6,500 − $300 = $6,200.00)',
      saldoTrasGasto === '$6,200.00',
      saldoTrasGasto
    );
    const myRowEditable = await ownerPage.evaluate(() => {
      const h2s = [...document.querySelectorAll('#push-content h2')];
      const h2 = h2s.find((x) => x.textContent.trim() === 'Movimientos compartidos');
      const card = h2 ? h2.closest('.card') : null;
      const row = card ? [...card.querySelectorAll('.t1')].find((e) => e.textContent.trim() === 'Café compartido') : null;
      return row ? !!row.closest('.swipe-row') : null;
    });
    check(
      'Cuentas compartidas: el movimiento que SÍ creó el dueño se puede eliminar/editar (aparece como swipe-row)',
      myRowEditable === true,
      String(myRowEditable)
    );

    // ---------- 2026-10-29 (2): bloquear movimientos individuales en cuentas compartidas.
    // En este punto del flujo, acc1 y acc3 ya están compartidas (acc1 desde la semilla,
    // acc3 confirmada arriba) y acc2 no (se compartió y se dejó de compartir). ----------
    await tapO2('.tabbar [data-tab="movimientos"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('[data-action="new"]');
    await ownerPage.waitForTimeout(400);
    const fromOptions = await ownerPage.evaluate(() => [...document.querySelectorAll('[name=from] option')].map((o) => o.value));
    check(
      'Cuentas compartidas: "Nuevo movimiento" no ofrece cuentas ya compartidas (acc1 ni acc3) como origen, pero sí la que no se comparte (acc2)',
      !fromOptions.includes('acc1') && !fromOptions.includes('acc3') && fromOptions.includes('acc2'),
      JSON.stringify(fromOptions)
    );
    const blockNote = (await textO2('#fields')) || '';
    check(
      'Cuentas compartidas: "Nuevo movimiento" explica que esas cuentas se agregan desde "Movimientos compartidos"',
      /Movimientos compartidos/.test(blockNote),
      blockNote
    );

    // Defensa en profundidad: aunque el selector ya no ofrezca la cuenta compartida,
    // forzar su valor igual (simulando manipulación del DOM) debe rechazarse al guardar.
    await ownerPage.evaluate(() => {
      const sel = document.querySelector('[name=from]');
      const opt = document.createElement('option');
      opt.value = 'acc1';
      sel.appendChild(opt);
      sel.value = 'acc1';
    });
    await ownerPage.fill('[name=concept]', 'Intento de movimiento individual');
    await ownerPage.fill('input[aria-label="Importe"]', '10');
    await ownerPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await tapO2('#save');
    await ownerPage.waitForTimeout(400);
    check(
      'Cuentas compartidas: si se fuerza igual el valor de una cuenta compartida (manipulando el DOM), el guardado lo rechaza con un mensaje claro',
      /es compartida/i.test((await textO2('#error')) || ''),
      await textO2('#error')
    );
    await ownerPage.keyboard.press('Escape');
    await ownerPage.waitForTimeout(300);

    // Un movimiento que YA existía en acc1 desde antes de compartirla (oldtx1, sembrado
    // arriba) debe seguir pudiéndose editar sin romperse.
    await tapO2('.tabbar [data-tab="insights"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('.wallet[data-id="acc1"]');
    await ownerPage.waitForTimeout(500);
    await ownerPage.evaluate(() => {
      const row = [...document.querySelectorAll('#push-content .t1')].find((e) => e.textContent.trim() === 'Gasto viejo en cuenta compartida');
      row?.closest('button[data-action="edit"]')?.click();
    });
    await ownerPage.waitForTimeout(400);
    const oldTxFromValue = await ownerPage.evaluate(() => document.querySelector('[name=from]')?.value);
    check(
      'Cuentas compartidas: un movimiento de ANTES de compartir la cuenta sigue mostrando esa cuenta seleccionada al editarlo (no se rompe su edición)',
      oldTxFromValue === 'acc1',
      oldTxFromValue
    );
    await tapO2('#save');
    await ownerPage.waitForTimeout(400);
    check(
      'Cuentas compartidas: guardar sin cambios ese movimiento viejo no lo rechaza (solo se bloquean movimientos NUEVOS)',
      !(await ownerPage.evaluate(() => document.body.classList.contains('sheet-open'))),
      await textO2('#error')
    );

    // Una regla recurrente nueva tampoco debe poder apuntar a una cuenta compartida.
    await tapO2('.tabbar [data-tab="ajustes"]');
    await ownerPage.waitForTimeout(400);
    await tapO2('[data-action="add-rule"]');
    await ownerPage.waitForTimeout(400);
    const ruleOptions = await ownerPage.evaluate(() => [...document.querySelectorAll('[name=from] option')].map((o) => o.value));
    check(
      'Cuentas compartidas: una regla recurrente nueva tampoco ofrece cuentas compartidas como cuenta',
      !ruleOptions.includes('acc1') && !ruleOptions.includes('acc3') && ruleOptions.includes('acc2'),
      JSON.stringify(ruleOptions)
    );
    await ownerPage.keyboard.press('Escape');
    await ownerPage.waitForTimeout(300);

    await ownerPage.close();
  }

  // ---------- 2026-10-25 (2): cuentas compartidas — lado de la persona invitada ----------
  {
    const guestSeed = {
      shared_accounts: [{ id: 'sa2', owner_user_id: 'owner-7', account_id: 'accX', share_code: 'joincode', name: 'Ahorro compartido', type: 'saving', currency: 'MXN', color: 'auto', base_balance: 500000, revoked: false }],
      shared_account_members: [],
      shared_account_transactions: [],
    };
    const guestBook = { payload: { accounts: [], transactions: [], rules: [], goals: [] }, revision: 1 };

    const guestPage = await context.newPage();
    await guestPage.route('**/config.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: FAKE_CONFIG }));
    await guestPage.route('**/vendor/supabase.umd.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeSupabaseShared('guest-9', guestSeed, guestBook) }));
    await guestPage.goto(BASE, { waitUntil: 'networkidle' });
    await guestPage.waitForTimeout(900);
    const tapG = (sel) => guestPage.evaluate((s) => document.querySelector(s)?.click(), sel);
    const textG = (sel) => guestPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const callsG = () => guestPage.evaluate(() => JSON.parse(localStorage.getItem('__testCalls') || '[]'));

    await tapG('.tabbar [data-tab="ajustes"]');
    await guestPage.waitForTimeout(400);
    check(
      'Cuentas compartidas: Ajustes ofrece "Unirme con código" con sesión activa, y antes de unirte la cuenta de otra persona no aparece',
      (await guestPage.evaluate(() => !!document.querySelector('[data-action="join-shared"]'))) &&
        !(await guestPage.evaluate(() => [...document.querySelectorAll('.wn')].some((n) => n.textContent.trim() === 'Ahorro compartido')))
    );

    // Código inválido: debe rechazarse sin agregar nada.
    await tapG('[data-action="join-shared"]');
    await guestPage.waitForTimeout(400);
    await guestPage.fill('[name=code]', 'nope');
    await tapG('#save');
    await guestPage.waitForTimeout(400);
    check('Cuentas compartidas: un código que no existe se rechaza con un mensaje claro', /no es válido/i.test((await textG('#error')) || ''), await textG('#error'));
    await guestPage.fill('[name=code]', 'JOINCODE');
    await tapG('#save');
    await guestPage.waitForTimeout(600);
    const joinedNow = await guestPage.evaluate(() => [...document.querySelectorAll('.wn')].some((n) => n.textContent.trim() === 'Ahorro compartido'));
    check('Cuentas compartidas: con el código correcto (sin importar mayúsculas), la cuenta de la otra persona aparece en tu lista', joinedNow);

    await tapG('.tabbar [data-tab="ajustes"]');
    await guestPage.waitForTimeout(400);
    await tapG('[data-action="account"][data-id^="shared:"]');
    await guestPage.waitForTimeout(500);
    const hasEditBtn = await guestPage.evaluate(() => !!document.querySelector('[data-action="account-edit"]'));
    check('Cuentas compartidas: la persona invitada NO ve el botón "Editar cuenta" (no es su cuenta)', !hasEditBtn);
    const saldoGuest = await guestPage.evaluate(() => document.querySelector('#push-content .wallet .num')?.textContent?.trim());
    check('Cuentas compartidas: la persona invitada ve el saldo real sincronizado por el dueño ($5,000.00), sin ver historial previo', saldoGuest === '$5,000.00', saldoGuest);
    check(
      'Cuentas compartidas: sin movimientos compartidos todavía, se muestra el mensaje vacío correspondiente',
      /Nadie ha agregado movimientos compartidos todavía/.test((await textG('#push-content')) || '')
    );

    await tapG('[data-action="add-shared-tx"]');
    await guestPage.waitForTimeout(400);
    await guestPage.selectOption('[name=kind]', 'expense');
    await guestPage.fill('[name=concept]', 'Refresco');
    await guestPage.fill('input[aria-label="Importe"]', '50');
    await guestPage.evaluate(() => document.querySelector('input[aria-label="Importe"]').blur());
    await tapG('#save');
    await guestPage.waitForTimeout(600);
    const guestInsert = (await callsG())
      .filter((c) => c[0] === 'from:shared_account_transactions' && c[1]?.pendingInsert)
      .flatMap((c) => c[1].pendingInsert)
      .find((r) => r.concept === 'Refresco');
    check(
      'Cuentas compartidas: el movimiento que agrega la persona invitada queda con SU propio creator_user_id',
      guestInsert?.creator_user_id === 'guest-9' && guestInsert?.shared_account_id === 'sa2',
      JSON.stringify(guestInsert)
    );
    const refrescoAvatar = await sharedRowAvatar(guestPage, 'Refresco');
    check(
      'Movimientos compartidos: también funciona para la persona invitada — su propio movimiento muestra SUS iniciales (de "guest-9@example.com" → "GU")',
      refrescoAvatar?.hasImg === false && refrescoAvatar?.text === 'GU',
      JSON.stringify(refrescoAvatar)
    );
    const saldoGuestTrasGasto = await guestPage.evaluate(() => document.querySelector('#push-content .wallet .num')?.textContent?.trim());
    check('Cuentas compartidas: el saldo de la persona invitada también baja de inmediato ($5,000 − $50 = $4,950.00)', saldoGuestTrasGasto === '$4,950.00', saldoGuestTrasGasto);
    await guestPage.close();
  }

  // ---------- 2026-10-28: Perfil (nombre, apellido, teléfono, foto/iniciales, cambiar
  // contraseña con sesión ya iniciada) ----------
  // Igual que "Cuentas compartidas" arriba, depende de verdad de Supabase (tabla
  // public.profiles + bucket de Storage "avatars", ver supabase-perfil.sql), así que se
  // prueba con fakeSupabaseShared en vez del servidor de pruebas normal. Se sembró la fila
  // de perfil vacía (igual que handle_new_user() la crearía en el proyecto real) para que
  // el guardado haga un UPDATE real sobre una fila existente, no sobre una que no existe.
  {
    const profileSeed = { profiles: [{ id: 'perfil-1', first_name: '', last_name: '', phone_country_code: '+52', phone_number: '', avatar_url: null }] };
    const pfPage = await context.newPage();
    await pfPage.route('**/config.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: FAKE_CONFIG }));
    await pfPage.route('**/vendor/supabase.umd.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeSupabaseShared('perfil-1', profileSeed, null) }));
    await pfPage.goto(BASE, { waitUntil: 'networkidle' });
    await pfPage.waitForTimeout(900);
    const tapP = (sel) => pfPage.evaluate((s) => document.querySelector(s)?.click(), sel);
    const textP = (sel) => pfPage.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
    const callsP = () => pfPage.evaluate(() => JSON.parse(localStorage.getItem('__testCalls') || '[]'));

    await tapP('.tabbar [data-tab="ajustes"]');
    await pfPage.waitForTimeout(400);

    // Sin nombre ni foto todavía: iniciales a partir del correo, y la fila invita a
    // "Completa tu perfil".
    check(
      'Perfil: antes de llenarlo, "Mi cuenta" invita a "Completa tu perfil" y muestra tus iniciales (de tu correo) en vez de foto',
      (await textP('#account-card [data-action="profile"] .t1')) === 'Completa tu perfil' &&
        (await pfPage.evaluate(() => !document.querySelector('#account-card [data-action="profile"] img'))) &&
        (await textP('#account-card [data-action="profile"] span')) === 'PE',
      JSON.stringify({ t1: await textP('#account-card [data-action="profile"] .t1'), initials: await textP('#account-card [data-action="profile"] span') })
    );
    check(
      'Perfil: "Mi cuenta" muestra el correo registrado en la cuenta',
      (await textP('#account-card [data-action="profile"] .t2')) === 'perfil-1@example.com'
    );

    await tapP('[data-action="profile"]');
    await pfPage.waitForTimeout(400);
    check('Perfil: abre una hoja "Mi perfil" con el correo (no editable)', (await textP('#modal-title')) === 'Mi perfil' && (await pfPage.evaluate(() => document.querySelector('[type=email]')?.disabled === true && document.querySelector('[type=email]')?.value === 'perfil-1@example.com')));

    await pfPage.fill('[name=first_name]', 'Ana');
    await pfPage.fill('[name=last_name]', 'Pérez');
    await pfPage.selectOption('[name=phone_country_code]', '+1');
    await pfPage.fill('[name=phone_number]', '5551234567');
    await tapP('#save');
    await pfPage.waitForTimeout(500);
    const profileUpdateCall = (await callsP()).filter((c) => c[0] === 'from:profiles' && c[1]?.pendingUpdate).map((c) => c[1].pendingUpdate).find((u) => u.first_name === 'Ana');
    check(
      'Perfil: guardar nombre/apellido/teléfono llama a un UPDATE en profiles con esos datos',
      profileUpdateCall?.first_name === 'Ana' && profileUpdateCall?.last_name === 'Pérez' && profileUpdateCall?.phone_country_code === '+1' && profileUpdateCall?.phone_number === '5551234567',
      JSON.stringify(profileUpdateCall)
    );
    check(
      'Perfil: tras guardar, "Mi cuenta" ya muestra el nombre completo y las iniciales correctas (sin necesitar recargar)',
      (await textP('#account-card [data-action="profile"] .t1')) === 'Ana Pérez' && (await textP('#account-card [data-action="profile"] span')) === 'AP'
    );

    // Foto de perfil: subirla reemplaza las iniciales por una <img>, y la hoja (que sigue
    // abierta, porque uploadAvatar() la reconstruye) también la muestra de inmediato.
    await tapP('[data-action="profile"]');
    await pfPage.waitForTimeout(400);
    check('Perfil: sin foto todavía, el botón dice "Agregar foto"', (await textP('#change-avatar')) === 'Agregar foto');
    await pfPage.setInputFiles('#avatar-file', AVATAR_FIXTURE);
    await pfPage.waitForTimeout(700);
    const uploadCall = (await callsP()).find((c) => c[0] === 'storage:avatars:upload');
    check('Perfil: subir una foto llama a storage.from("avatars").upload con la ruta "<id>/avatar.jpg"', uploadCall?.[1]?.path === 'perfil-1/avatar.jpg', JSON.stringify(uploadCall));
    const avatarUpdateCall = (await callsP()).filter((c) => c[0] === 'from:profiles' && c[1]?.pendingUpdate).map((c) => c[1].pendingUpdate).find((u) => u.avatar_url);
    check('Perfil: tras subirla, se guarda avatar_url en profiles (URL pública del bucket)', /\/storage\/v1\/object\/public\/avatars\/perfil-1\/avatar\.jpg/.test(avatarUpdateCall?.avatar_url || ''), avatarUpdateCall?.avatar_url);
    check(
      'Perfil: la hoja sigue abierta tras subir la foto y ahora muestra una <img> (ya no iniciales), con el botón "Cambiar foto"',
      (await pfPage.evaluate(() => !!document.querySelector('#modal img'))) && (await textP('#change-avatar')) === 'Cambiar foto'
    );
    await tapP('[data-action="profile"]');
    await pfPage.waitForTimeout(400);
    check(
      'Perfil: "Mi cuenta" también muestra ya la foto (no iniciales) tras recargar la hoja',
      await pfPage.evaluate(() => !!document.querySelector('#account-card [data-action="profile"] img'))
    );
    await pfPage.keyboard.press('Escape');
    await pfPage.waitForTimeout(300);

    // Cambiar contraseña con sesión ya iniciada: a diferencia de "nueva contraseña" (que
    // viene del enlace de recuperación y recarga la página al terminar), aquí la sesión ya
    // es válida, así que debe quedarse en la app y regresar al formulario de perfil.
    await tapP('[data-action="profile"]');
    await pfPage.waitForTimeout(400);
    await tapP('#change-password');
    await pfPage.waitForTimeout(400);
    check('Perfil: "Cambiar contraseña" abre una hoja separada con dos campos de contraseña', (await textP('#modal-title')) === 'Cambiar contraseña' && (await pfPage.evaluate(() => !!document.querySelector('[name=password]') && !!document.querySelector('[name=confirmPassword]'))));

    await pfPage.fill('[name=password]', 'claveNueva123');
    await pfPage.fill('[name=confirmPassword]', 'otraCosa456');
    await tapP('#save');
    await pfPage.waitForTimeout(400);
    check(
      'Perfil → Cambiar contraseña: si no coinciden, se rechaza sin llamar a updateUser',
      /no coinciden/i.test((await textP('#error')) || '') && !(await callsP()).some((c) => c[0] === 'updateUser'),
      await textP('#error')
    );

    await pfPage.fill('[name=password]', 'claveNueva123');
    await pfPage.fill('[name=confirmPassword]', 'claveNueva123');
    await tapP('#save');
    await pfPage.waitForTimeout(400);
    const pwUpdateCall = (await callsP()).find((c) => c[0] === 'updateUser');
    check('Perfil → Cambiar contraseña: si coinciden, llama a updateUser con la nueva contraseña', pwUpdateCall?.[1]?.password === 'claveNueva123', JSON.stringify(pwUpdateCall));
    check(
      'Perfil → Cambiar contraseña: a diferencia de "nueva contraseña" (recuperación), aquí NO se recarga la página — se regresa a la hoja "Mi perfil"',
      (await textP('#modal-title')) === 'Mi perfil'
    );

    await pfPage.close();
  }

  // ---------- Tutorial guiado (onboarding.js, punto 6, 2026-10-30): se agregaron pasos
  // nuevos para cubrir lo construido en esta sesión (compartir una cuenta, Perfil,
  // Apariencia) sin tocar los pasos que ya existían. Cubre: el total de pasos ahora es 11;
  // los 3 pasos nuevos aparecen con el título correcto y en el orden esperado; avanzar con
  // "Siguiente" y retroceder con "Anterior" no rompe nada (sin errores de consola); y el
  // paso final sigue llevando a "Configurar cuenta" como antes. ----------
  {
    const tourPage = await context.newPage();
    const tourErrors = [];
    tourPage.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('404')) tourErrors.push(msg.text()); });
    tourPage.on('pageerror', (err) => tourErrors.push('pageerror: ' + err.message));
    await tourPage.goto(BASE, { waitUntil: 'networkidle' });
    await tourPage.waitForTimeout(700);
    await tourPage.evaluate(() => document.querySelector('.tabbar [data-tab="ajustes"]').click());
    await tourPage.waitForTimeout(300);
    await tourPage.evaluate(() => document.querySelector('[data-action="tutorial"]').click());
    await tourPage.waitForTimeout(300);
    check('Tutorial: el botón "Ver tutorial" abre la hoja de la guía', await tourPage.evaluate(() => document.querySelector('#welcome')?.open === true));

    const titles = [];
    for (let i = 0; i < 20; i++) {
      const t = await tourPage.evaluate(() => document.querySelector('#welcome-title')?.textContent.trim());
      if (t === undefined || t === null) break;
      titles.push(t);
      const isLast = await tourPage.evaluate(() => document.querySelector('#welcome-next')?.textContent.trim() === 'Configurar mi cuenta');
      if (isLast) break;
      await tourPage.evaluate(() => document.querySelector('#welcome-next').click());
      await tourPage.waitForTimeout(250);
    }
    check(
      'Tutorial: ahora son 11 pasos en total (8 que ya existían + 3 nuevos: Comparte una cuenta, Personaliza tu perfil, A tu gusto)',
      titles.length === 11,
      JSON.stringify(titles)
    );
    check(
      'Tutorial: el paso nuevo "Comparte una cuenta" aparece justo después de "Primero, tus cuentas" (antes de "Registra tu día a día")',
      titles[1] === 'Primero, tus cuentas' && titles[2] === 'Comparte una cuenta' && titles[3] === 'Registra tu día a día',
      JSON.stringify(titles)
    );
    check(
      'Tutorial: los pasos nuevos "Personaliza tu perfil" y "A tu gusto" aparecen después de "Explora tus cuentas" y antes de "Todo listo para empezar"',
      titles[7] === 'Explora tus cuentas' && titles[8] === 'Personaliza tu perfil' && titles[9] === 'A tu gusto' && titles[10] === 'Todo listo para empezar',
      JSON.stringify(titles)
    );
    check('Tutorial: recorrer los 11 pasos con "Siguiente" no generó errores de consola', tourErrors.length === 0, tourErrors.join(' | '));

    // Retroceder con "Anterior" regresa al paso previo sin romper nada.
    await tourPage.evaluate(() => document.querySelector('#welcome-back').click());
    await tourPage.waitForTimeout(250);
    check(
      'Tutorial: "Anterior" desde el último paso regresa a "A tu gusto" (el penúltimo)',
      (await tourPage.evaluate(() => document.querySelector('#welcome-title')?.textContent.trim())) === 'A tu gusto'
    );
    await tourPage.evaluate(() => document.querySelector('#welcome-next').click());
    await tourPage.waitForTimeout(250);

    // El paso final ("Configurar mi cuenta") sigue cerrando la guía y abriendo "Configurar cuenta".
    await tourPage.evaluate(() => document.querySelector('#welcome-next').click());
    await tourPage.waitForTimeout(400);
    check(
      'Tutorial: el botón final "Configurar mi cuenta" cierra la guía y abre el formulario "Configurar cuenta"',
      !(await tourPage.evaluate(() => !!document.querySelector('#welcome'))) &&
        (await tourPage.evaluate(() => document.querySelector('#modal-title')?.textContent.trim())) === 'Configurar cuenta'
    );

    await tourPage.close();
  }

  // ---------- Tema claro/oscuro/sistema y color de acentuación configurable (punto 5,
  // 2026-10-29 (3)) — cubre: default "Sistema" sin fijar data-theme; Claro/Oscuro fijan
  // data-theme y persisten en localStorage tras recargar; volver a "Sistema" quita el
  // atributo; el selector de color libre actualiza --accent y sus derivados (incluida la
  // fórmula de --accent-ink según luminancia, con un color claro y uno oscuro); "Restablecer"
  // regresa al naranja por default y borra la preferencia guardada; y que un elemento real
  // (.fab) consume el --accent-ink calculado, no solo que la variable CSS exista. ----------
  {
    const themePage = await context.newPage();
    const gotoFresh = async () => {
      await themePage.goto(BASE, { waitUntil: 'networkidle' });
      await themePage.waitForTimeout(500);
    };
    await gotoFresh();
    await themePage.evaluate(() => localStorage.clear());
    await themePage.reload({ waitUntil: 'networkidle' });
    await themePage.waitForTimeout(500);

    await themePage.evaluate(() => document.querySelector('.tabbar [data-tab="ajustes"]').click());
    await themePage.waitForTimeout(300);

    check(
      'Apariencia: por default (sin elección guardada) no hay data-theme explícito — manda el sistema',
      (await themePage.evaluate(() => document.documentElement.getAttribute('data-theme'))) === null
    );
    check(
      'Apariencia: por default el color de acentuación es el naranja original (#FF7A4A)',
      (await themePage.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase())) === '#ff7a4a'
    );
    check(
      'Apariencia: sin un color distinto al default, no se muestra el botón "Restablecer"',
      !(await themePage.evaluate(() => !!document.querySelector('[data-action="reset-accent"]')))
    );

    // Elegir "Oscuro" explícito: fija data-theme y lo guarda en localStorage.
    await themePage.evaluate(() => document.querySelector('[data-action="set-theme"][data-v="dark"]').click());
    await themePage.waitForTimeout(200);
    check(
      'Apariencia: elegir "Oscuro" fija data-theme="dark" en <html> y lo guarda en localStorage',
      (await themePage.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark' &&
        (await themePage.evaluate(() => localStorage.getItem('theme:mode'))) === 'dark'
    );
    await themePage.reload({ waitUntil: 'networkidle' });
    await themePage.waitForTimeout(400);
    check(
      'Apariencia: "Oscuro" persiste tras recargar la página (aplicado por el script inicial, antes de pintar)',
      (await themePage.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark'
    );

    // Elegir "Claro" explícito: cambia el atributo y las variables de color de fondo.
    await themePage.evaluate(() => document.querySelector('.tabbar [data-tab="ajustes"]').click());
    await themePage.waitForTimeout(300);
    await themePage.evaluate(() => document.querySelector('[data-action="set-theme"][data-v="light"]').click());
    await themePage.waitForTimeout(200);
    const lightVars = await themePage.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
    }));
    check(
      'Apariencia: elegir "Claro" fija data-theme="light" y --bg pasa al valor claro (#F2F2F6)',
      lightVars.theme === 'light' && lightVars.bg.toLowerCase() === '#f2f2f6',
      JSON.stringify(lightVars)
    );

    // Volver a "Sistema": quita el atributo explícito (deja de forzar, manda la preferencia del SO).
    await themePage.evaluate(() => document.querySelector('[data-action="set-theme"][data-v="system"]').click());
    await themePage.waitForTimeout(200);
    check(
      'Apariencia: elegir "Sistema" quita el atributo data-theme y borra la preferencia guardada',
      (await themePage.evaluate(() => document.documentElement.getAttribute('data-theme'))) === null &&
        (await themePage.evaluate(() => localStorage.getItem('theme:mode'))) === null
    );

    // Color de acentuación: un color CLARO (luminancia alta) debe producir ink oscuro.
    const lightAccent = await themePage.evaluate(() => {
      const el = document.getElementById('accent-picker');
      el.value = '#FAFAFA';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const cs = getComputedStyle(document.documentElement);
      return { accent: cs.getPropertyValue('--accent').trim().toLowerCase(), ink: cs.getPropertyValue('--accent-ink').trim().toLowerCase(), saved: localStorage.getItem('theme:accent') };
    });
    check(
      'Apariencia: elegir un acento CLARO (#FAFAFA) actualiza --accent, calcula --accent-ink OSCURO (#1A0E08) por contraste, y lo guarda en localStorage',
      lightAccent.accent === '#fafafa' && lightAccent.ink === '#1a0e08' && lightAccent.saved?.toLowerCase() === '#fafafa',
      JSON.stringify(lightAccent)
    );
    const fabColorLight = await themePage.evaluate(() => getComputedStyle(document.querySelector('.fab')).color);
    check(
      'Apariencia: con acento claro, el botón "+" (.fab) realmente pinta su ícono con --accent-ink oscuro (rgb(26, 14, 8)), no solo la variable',
      fabColorLight === 'rgb(26, 14, 8)',
      fabColorLight
    );

    // Un color OSCURO (luminancia baja) debe producir ink blanco, y debe persistir tras recargar.
    const darkAccent = await themePage.evaluate(() => {
      const el = document.getElementById('accent-picker');
      el.value = '#101025';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const cs = getComputedStyle(document.documentElement);
      return { accent: cs.getPropertyValue('--accent').trim().toLowerCase(), ink: cs.getPropertyValue('--accent-ink').trim().toLowerCase() };
    });
    check(
      'Apariencia: elegir un acento OSCURO (#101025) calcula --accent-ink BLANCO (#FFFFFF) por contraste',
      darkAccent.accent === '#101025' && darkAccent.ink === '#ffffff',
      JSON.stringify(darkAccent)
    );
    await themePage.reload({ waitUntil: 'networkidle' });
    await themePage.waitForTimeout(400);
    check(
      'Apariencia: el color de acentuación elegido persiste tras recargar (aplicado antes de pintar, sin parpadeo al naranja por default)',
      (await themePage.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase())) === '#101025'
    );

    // "Restablecer" regresa al naranja original y borra la preferencia guardada.
    await themePage.evaluate(() => document.querySelector('.tabbar [data-tab="ajustes"]').click());
    await themePage.waitForTimeout(300);
    check(
      'Apariencia: con un acento distinto al default ya guardado, el botón "Restablecer" sí aparece',
      await themePage.evaluate(() => !!document.querySelector('[data-action="reset-accent"]'))
    );
    await themePage.evaluate(() => document.querySelector('[data-action="reset-accent"]').click());
    await themePage.waitForTimeout(200);
    const afterReset = await themePage.evaluate(() => ({
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase(),
      saved: localStorage.getItem('theme:accent'),
    }));
    check(
      'Apariencia: "Restablecer" regresa --accent al naranja original (#FF7A4A) y borra la preferencia de localStorage',
      afterReset.accent === '#ff7a4a' && afterReset.saved === null,
      JSON.stringify(afterReset)
    );

    await themePage.close();
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

# Mis finanzas — primera versión

Interfaz estática para GitHub Pages, con PostgreSQL, autenticación y Realtime de Supabase. Sin datos personales del Excel incluidos. La vista sin conexión usa ejemplos temporales y los identifica expresamente.

## Conexión
1. Crear un proyecto en Supabase Free. Ejecutar `supabase.sql` en SQL Editor.
2. Crear tu usuario en Authentication > Users. La app permite iniciar sesión con correo y contraseña, no registro público. Desactivar el registro de nuevos usuarios si será de uso personal.
3. En `config.js`, completar la URL del proyecto y la clave pública publishable. Nunca incluir una clave secret o service_role.
4. Subir estos archivos al repositorio personal_finance_app. En Settings > Pages seleccionar GitHub Actions como origen.
5. Abrir la app, iniciar sesión y crear las cuentas con su saldo al inicio de la fecha indicada. Los movimientos de ese mismo día se suman a ese saldo.

## Datos y sincronización
La versión inicial guarda un documento JSONB por usuario dentro de PostgreSQL. No es un archivo en GitHub. Una función transaccional guarda todos los efectos juntos. La revisión evita sobrescribir cambios concurrentes; si hay conflicto, se recarga y se pide repetir la operación. RLS y permisos restringen lecturas y escrituras al dueño. Realtime notifica cambios a otros dispositivos; recuperar foco también actualiza los datos.

Esta estructura sirve para una primera versión personal. Antes de importar un historial grande se recomienda separar cuentas, movimientos, planes y cuotas en tablas relacionadas. El límite de documento de esta versión es 5 MB.

## Funciones incluidas
- Movimientos realizados y programados; edición y confirmación.
- Transferencias con importe enviado y recibido para MXN/CAD.
- Calendario con saldos reales y proyectados por cuenta.
- Cuentas, fechas de corte/pago, límites, archivo y saldo inicial.
- Compra MSI y generación atómica de mensualidades, con ajuste de centavos final.
- Costos recurrentes mensuales por un periodo definido.
- Nómina por quincena con percepciones y deducciones totales.
- Exportación JSON de respaldo.

## Pendientes antes de usar como registro definitivo
- Conectar Supabase y probar permisos con dos usuarios, guardado, sesión y sincronización entre dispositivos.
- Importación validada del Excel; nóminas excluidas y costos recurrentes sujetos a revisión.
- Desglose de nómina por concepto y reglas de recurrencia adicionales.
- Conciliación de mensualidades con pagos globales ya programados: por ahora cada cuota aparece separada; no importar pagos globales sin revisarlos.
- Cancelación de operaciones y reestructuración de planes MSI.

No se ejecutan pagos bancarios. Las fechas sugeridas para MSI son editables; la fecha efectiva depende del estado de cuenta. Los datos solo se guardan con conexión. No hay respaldo automático: usar Exportar respaldo JSON.

## Estado de conexi�n � 8 de septiembre de 2026
URL y clave p�blica configuradas. El endpoint respondi�; la tabla finance_books a�n no est� disponible en la API (PGRST205). Ejecutar supabase.sql y crear el usuario de la app para validar guardado y sincronizaci�n. Publicaci�n GitHub pendiente de autenticaci�n.

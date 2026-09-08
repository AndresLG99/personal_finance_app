# Texto para LinkedIn — primera versión

Estoy convirtiendo mi Excel de finanzas personales en una web app.

Partí de un archivo con diez pestañas para registrar movimientos, programar pagos y proyectar saldos. La primera versión reúne ese flujo en tres vistas: movimientos, calendario y configuración.

Quise conservar lo que me servía del Excel y simplificar la interacción:

- Transferencias entre cuentas, incluido el retiro de efectivo.
- Pagos programados de tarjetas y préstamos.
- Compras a meses sin intereses con generación de mensualidades.
- Saldos reales y proyectados, con cuentas en MXN y CAD.
- Una interfaz adaptable a computadora y celular, inspirada en el estilo de mi portfolio.

Una de las decisiones más importantes fue separar el código de los datos: GitHub Pages para la interfaz y una integración preparada con Supabase para autenticación, base de datos y sincronización. Así, registrar un gasto no requiere volver a publicar la aplicación.

La interfaz ya funciona con datos de ejemplo. El siguiente paso es conectar y validar la persistencia en la nube antes de migrar mi información real.

Desarrollé esta primera versión con asistencia de IA, definiendo las reglas financieras a partir de mi propio flujo de trabajo.

Código y documentación: https://github.com/AndresLG99/personal_finance_app

#DesarrolloWeb #FinanzasPersonales #JavaScript #Supabase #ProyectosPersonales

---

Publicar acompañado de `calendario.png` y `movil.png`. Actualizar el estado cuando se haya verificado la conexión real. Este texto está preparado, no publicado.

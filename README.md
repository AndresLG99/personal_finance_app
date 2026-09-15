# Mis finanzas

Aplicación personal con GitHub Pages y Supabase. Interfaz adaptable a computadora y celular, con el estilo del portfolio de Andrés.

## Funciones
- Movimientos realizados y programados, con duplicación a la fecha actual.
- Insights: gastos por categoría, historial completo por cuenta y fechas de liquidación proyectadas.
- Captura monetaria con teclado decimal, calculadora y botón flotante para registrar movimientos.
- Transferencias entre cuentas y entre MXN/CAD.
- Calendario de saldos reales y proyectados.
- Cuentas, tarjetas, deudas y compras a meses sin intereses.
- Costos recurrentes editables por días, semanas, meses o años, con eliminación de reglas y movimientos.
- Nómina por concepto: líquido bancario oficial, desglose posterior y comparación de netos.
- Categorías fijas unificadas e importación CSV de pagos programados desde hoy, sin límite de año, con vista previa y detección de duplicados.
- Exportación de respaldo JSON.

## Acceso
La app usa el usuario creado en Supabase Authentication. Los registros financieros se guardan en PostgreSQL y no se incluyen en este repositorio. La clave publishable de config.js es pública; los permisos de acceso se aplican en Supabase.

## Publicación
GitHub Pages está configurado para publicar desde la rama main y la carpeta raíz. Los cambios en el código actualizan la web; los movimientos cotidianos se guardan directamente en Supabase sin republicar.

## Documentación
- [Caso de estudio con imágenes y código](PROYECTO.md)
- [Borrador para LinkedIn](LINKEDIN.md)

## Validación
El propietario confirmó inicio de sesión, guardado tras recarga y lectura desde dos navegadores. Las pruebas locales cubren cuotas, centavos, fin de mes, año bisiesto y conservación del saldo en transferencias. Las pruebas de aislamiento con dos usuarios y concurrencia simultánea siguen pendientes.

## Alcance pendiente
Importación validada del Excel, conciliación de cuotas MSI con pagos globales, reestructuración de planes y restauración de respaldos. La tabla usa un documento JSONB por usuario con control de revisión; para mayor volumen se recomienda normalizar el modelo.

Las capturas de documentación contienen datos de ejemplo. No se ejecutan pagos bancarios.

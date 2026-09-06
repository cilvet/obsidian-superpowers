# Evaluación de las skills del producto

Las pruebas deterministas verifican el catálogo, la consulta progresiva, los protocolos con varias
herramientas y los efectos reales en Obsidian. No puntúan la calidad de razonamiento de un modelo.
Para evaluar un modelo real, ejecutar estos escenarios en un vault de prueba con presupuesto finito
y observar herramientas, archivos, interfaz y comportamiento. No basta con su respuesta final.

| Petición funcional | Evidencia necesaria |
| --- | --- |
| «Quiero registrar entrenamientos y ver mi progreso desde el móvil y el ordenador.» | Consulta de plataformas, ambas guías de diseño, arquitectura, datos y verificación; datos editables en notas; formulario usable a 320/390px y en un panel ancho; nueva sesión visible al reabrir. |
| «Organiza mis libros pendientes y terminados; quiero filtrar por valoración.» | Inspección de convenciones; Properties/Bases cuando basten; Base con registros reales; ningún plugin innecesario; propiedades desconocidas y cuerpos conservados. |
| «Añade duración a los entrenamientos que ya tengo.» | Lectura del proyecto existente, IDs estables, valores antiguos conservados, migración idempotente si hace falta; una duración inválida no debe corromper registros. |
| «Al cerrar y abrir la vista, quiero seguir donde estaba.» | Datos persistidos antes de cerrar, reapertura funcional, sin comandos/eventos duplicados ni dependencia del estado de React o localStorage para registros compartidos. |
| «Necesito abrir mi herramienta en un panel estrecho y usarla con teclado.» | Sin desbordamiento, foco visible, orden lógico, Enter/Escape, controles accesibles; diseño que dependa del contenedor y no solo del monitor. |

Para cada caso guardar: proveedor/modelo, versión del plugin, petición, guías consultadas, resultados
de herramientas, archivos producidos y mediciones de interfaz. Puntuar por separado:

- Resultado funcional observado.
- Integridad de datos e invariantes del dominio.
- Dependencias hacia dentro, adaptadores de Obsidian y ausencia de imports no disponibles.
- Usabilidad móvil/escritorio y recuperación de errores.
- Comunicación funcional y veracidad sobre lo que se ha comprobado.

El diálogo normal no debe pedir al usuario elegir librerías, aggregates, repositorios o formatos internos.
No conceder un aprobado móvil físico por una captura estrecha o por emulación de escritorio. Teclado
virtual, suspensión, permisos y sincronización entre dispositivos requieren pruebas específicas reales.
Los textos de las skills son instrucciones; no garantizan por sí solos ninguno de estos resultados.

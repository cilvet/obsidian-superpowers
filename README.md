# Superpowers for Obsidian

Un chat para trabajar con tu vault y construir nuevas funcionalidades mediante lenguaje natural.
OpenAI, Anthropic y Gemini con claves propias. Sin servidor de Superpowers.

## Estado

Primera implementación funcional: chat React con assistant-ui, herramientas, historial persistente,
dictado mediante OpenAI, referencias locales de la API y compilación `esbuild-wasm` dentro de Obsidian.
Los plugins generados son independientes y se pueden activar y actualizar desde el agente.

La autonomía incluye modificar archivos y activar código. La ejecución tiene acceso al entorno
de Obsidian; no pretende ser un sandbox de seguridad. Los imports incompatibles con móvil se rechazan
en compilación. esbuild no sustituye al comprobador semántico de TypeScript.

## Desarrollo

```sh
bun install --frozen-lockfile
bun run build
bun run dev:obsidian
```

El último comando abre **otra instancia de Obsidian en macOS**, con un perfil `.dev-profile` y
un vault `.dev-vault` exclusivos de este repositorio. No instala nada en tu vault habitual.
La instancia de pruebas expone el puerto local 9237 para las verificaciones automatizadas.

Abre Superpowers desde el icono de la barra o la paleta de comandos. En sus ajustes configura
una API key y el ID del modelo. Puedes cambiar de proveedor sin cambiar el chat.
Las claves se guardan en el almacenamiento local del dispositivo, fuera de los archivos sincronizables del vault.
El dictado requiere una clave de OpenAI; también puedes utilizar el dictado del teclado.

Para instalar manualmente en escritorio o móvil, copia únicamente `dist/main.js`,
`dist/manifest.json` y `dist/styles.css` a `<vault>/<configDir>/plugins/superpowers/`
y habilita el plugin. El compilador WASM, las referencias y los avisos de dependencias
están integrados en `main.js`; no se descarga ningún recurso adicional para compilar.
`configDir` normalmente es `.obsidian`. La activación de plugins generados utiliza un adaptador
para APIs internas de Obsidian; puede requerir ajustes cuando cambie el cargador de Obsidian.

## Instalar la beta con BRAT (iPhone, Android o escritorio)

1. Instala y activa **BRAT** desde los plugins de la comunidad de Obsidian.
2. Ejecuta el comando de BRAT **Add a beta plugin for testing** y añade
   `https://github.com/cilvet/obsidian-superpowers`. Selecciona la versión `0.3.0` o la última disponible.
3. El repositorio es público; no necesitas un token de GitHub.
4. Activa **Superpowers** en los plugins instalados, configura tu proveedor y API key,
   y ejecuta **Superpowers: Abrir chat**.

Cada dispositivo necesita su propia configuración de credenciales. Obsidian Sync no es
necesario para instalar la beta. Para probarla, pide un plugin con un comando que añada
la fecha actual a una nota y comprueba su resultado al ejecutar el comando.

BRAT permite instalar actualizaciones desde las releases de GitHub.

### Actualizar desde las versiones 0.1.0 o 0.2.0

El identificador cambia de `obsidian-superpowers` a `superpowers` para cumplir los requisitos
del directorio. Desactiva la beta antigua antes de instalar la nueva; no la desinstales todavía.
La primera activación copia ajustes, historial y proyectos a la nueva carpeta, conserva el
espacio de credenciales del dispositivo y deja intactos los archivos antiguos. No sobrescribe
una instalación nueva que ya tenga ajustes. Comprueba que tu conversación y proyectos están
disponibles antes de retirar la instalación antigua de BRAT. No actives ambas a la vez.
Los plugins generados siguen funcionando sin migración.

- [Releases de Superpowers](https://github.com/cilvet/obsidian-superpowers/releases)
- [Guía de BRAT, incluidos repositorios privados](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md)

## Conexiones y datos

Superpowers es gratuito y está distribuido bajo la [licencia MIT](LICENSE). Requiere Obsidian 1.12.4 o posterior.

El chat envía los mensajes, el contexto y los resultados de las herramientas al proveedor
seleccionado (OpenAI, Anthropic o Google). Eso puede incluir contenido del vault que el
agente lea. El dictado envía el audio a OpenAI. Se necesita una cuenta y una API key del
proveedor correspondiente; su uso puede generar costes según sus tarifas.
Las peticiones van a `api.openai.com`, `api.anthropic.com` o
`generativelanguage.googleapis.com`, según el proveedor elegido. La compilación usa recursos
incluidos en la instalación. El agente puede ejecutar operaciones y crear plugins que utilicen
otros servicios si la tarea del usuario lo requiere. Esos plugins son independientes;
Superpowers no se actualiza a sí mismo ni instala sus dependencias en tiempo de ejecución.
No hay servidor de Superpowers ni telemetría propia. Las claves de los proveedores se
guardan por dispositivo y no se incluyen en los archivos que sincroniza Obsidian Sync.

## Comprobaciones

```sh
# Instalar navegadores de prueba una vez (no afecta al runtime del plugin).
PLAYWRIGHT_SKIP_BROWSER_GC=1 bunx playwright install chromium webkit

bun run check             # Tipos, pruebas de comportamiento, build y navegadores sin Node.
bun run lint              # Revisión oficial; ejecución dinámica pendiente de valoración (ver docs/community-submission.md).
bun run verify:desktop    # Obsidian debe estar abierto con el perfil de pruebas.
bun run verify:release    # macOS: instala los tres archivos y abre otra instancia aislada.
```

`verify:desktop` utiliza las APIs reales del Obsidian instalado y respuestas de proveedor simuladas.
Comprueba chat, herramientas, mensajes de continuación, compilación WASM, activación, actualización,
recuperación de fallos, independencia de los plugins, cancelación y persistencia.
Además activa la emulación móvil de Obsidian. No equivale a probar un teléfono físico.

Las pruebas de navegador compilan en Chromium y WebKit sin `process` ni `require` globales,
con la red desconectada después de cargar el bundle y usando los recursos integrados.
Informes y capturas se guardan en `artifacts/` y no se versionan.
`verify:release` usa `.release-vault`, `.release-profile` y el puerto local 9238, para
no interrumpir una conversación en el vault de desarrollo. Las verificaciones de escritorio
usan un espacio separado de credenciales de prueba y restauran ajustes e historial al terminar.

### Evaluaciones con modelos reales

```sh
EVAL_PROVIDER=openai EVAL_MODEL=gpt-5.4 EVAL_CASE=plugin bun run eval
```

El proceso necesita `EVAL_API_KEY` o la variable del proveedor en su entorno. Consulta `.env.example`.
No utiliza claves de otros repositorios. Casos disponibles: `plugin` y `bases`.
Cada evaluación utiliza el chat, herramientas y contexto de producción en el vault aislado,
con un máximo de 12 pasos por defecto. La evaluación genera consumo en la API elegida.
Comprueba efectos en archivos y activación; guarda el historial completo como evidencia.
No se considera validada la calidad de un modelo por pasar las pruebas con respuestas simuladas.

## Estructura

```text
src/domain/                Proyectos, manifiestos y reglas de rutas
src/application/           Puertos y flujo de compilación/instalación
src/adapters/ai/           Proveedores, herramientas, sesión y transcripción
src/adapters/obsidian/     Vault, API, ciclo de plugins, red y referencias
src/adapters/compiler/     esbuild-wasm y resolución de imports
src/ui/                    Chat React, componentes de assistant-ui y ajustes
context/                   Instrucciones y guías que recibe el agente del producto
.agents/skills/            Skills para desarrollar y evaluar este repositorio
scripts/                   Build, vault de pruebas y evaluaciones
```

El núcleo depende de puertos; Obsidian, la UI y los proveedores quedan en adaptadores.
Bun y Node se utilizan solo en desarrollo, nunca como requisitos para el usuario móvil.

## Contexto del agente

`context/system.md` define el contrato general. `lookup_reference` permite consultar las guías
y el archivo completo `obsidian.d.ts` incluido en la instalación. El agente puede leer un archivo
opcional `SUPERPOWERS.md` en la raíz del vault para incorporar convenciones del usuario.

`context/skills/catalog.json` describe seis skills del agente del producto: plataformas, diseño móvil,
diseño de escritorio, datos en Obsidian, arquitectura hexagonal/DDD y verificación. Sus textos se
empaquetan en el plugin. El contexto inicial incluye el catálogo y cuándo consultarlas;
`lookup_reference` carga cada skill bajo demanda, con `skills` como índice y alias como `bases` o `mobile`.
Las instrucciones exigen consultar las guías relevantes y hablar con el usuario en términos funcionales.
Estas skills del producto son distintas de `.agents/skills/`, que guía el desarrollo del repositorio.

El chat acepta varias herramientas en una respuesta. Las lecturas independientes pueden ejecutarse
a la vez; las modificaciones se serializan. Un indicador de actividad agrupa las herramientas y los
mensajes intermedios de cada respuesta, con brillo durante la ejecución y un historial desplegable.
El resultado final permanece visible. Los iconos usan Lucide mediante `setIcon` de Obsidian, sin fuentes
ni descargas adicionales. El indicador respeta movimiento reducido y navegación por teclado.

La integración con respuestas simuladas comprueba acceso a guías y herramientas, no que un modelo
aplique correctamente todas las decisiones de diseño. Consulta `docs/agent-evals.md` para evaluar eso.

`execute_obsidian` recibe el cuerpo de una función async con `app` y `obsidian` ya disponibles.
`build_plugin` recibe archivos TypeScript normales: empaqueta imports locales y permite los módulos
que proporciona Obsidian. Las dependencias adicionales se pueden aportar como archivos locales.
Los proyectos se conservan en el directorio del plugin; la conversación sigue siendo una sola.

## Referencias de ingeniería

- [API y desarrollo móvil de Obsidian](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development).
- [Bases](https://obsidian.md/help/bases).
- [esbuild para navegador](https://esbuild.github.io/api/#browser).
- [AI SDK: transporte directo](https://ai-sdk.dev/docs/ai-sdk-ui/transport).
- [assistant-ui](https://www.assistant-ui.com/docs).
- [Claudian](https://github.com/YishenTu/claudian), estudiado para integración y ciclo de vistas en Obsidian.
- Zukus, referencia interna para herramientas, continuación del chat, dictado y archivos virtuales.

La implementación de este repositorio es propia. Las dependencias incluidas conservan sus avisos de licencia.

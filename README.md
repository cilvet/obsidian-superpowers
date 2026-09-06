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

Para instalar manualmente en escritorio o móvil, copia el contenido de `dist/` (incluida **assets/**)
a `<vault>/<configDir>/plugins/obsidian-superpowers/` y habilita el plugin.
`configDir` normalmente es `.obsidian`. La activación de plugins generados utiliza un adaptador
para APIs internas de Obsidian; puede requerir ajustes cuando cambie el cargador de Obsidian.

## Comprobaciones

```sh
# Instalar navegadores de prueba una vez (no afecta al runtime del plugin).
PLAYWRIGHT_SKIP_BROWSER_GC=1 bunx playwright install chromium webkit

bun run check             # Tipos, pruebas de comportamiento, build y navegadores sin Node.
bun run verify:desktop    # Obsidian debe estar abierto con el perfil de pruebas.
```

`verify:desktop` utiliza las APIs reales del Obsidian instalado y respuestas de proveedor simuladas.
Comprueba chat, herramientas, mensajes de continuación, compilación WASM, activación, actualización,
recuperación de fallos, independencia de los plugins, cancelación y persistencia.
Además activa la emulación móvil de Obsidian. No equivale a probar un teléfono físico.

Las pruebas de navegador compilan en Chromium y WebKit sin `process` ni `require` globales.
Informes y capturas se guardan en `artifacts/` y no se versionan.

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

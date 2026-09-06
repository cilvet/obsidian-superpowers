# Obsidian Superpowers

Build a single conversational agent that extends Obsidian, on desktop AND mobile.

## Product decisions
- The user supplies OpenAI, Anthropic or Gemini API credentials. No application server.
- The agent may use Obsidian's APIs, write, compile, install and activate plugins autonomously.
- Generated plugins are independent: they continue working without Superpowers.
- One chat; no project-management interface or domain-specific application builder.
- Prefer existing Obsidian features, including Properties and Bases, when sufficient.
- Use Zukus as an internal engineering reference and Claudian for Obsidian integration patterns.

## Engineering
- Bun, strict TypeScript, inferred types, no explicit `any`.
- Hexagonal architecture: domain has no framework imports; application depends on ports;
  adapters own Obsidian, providers, compilation and persistence. Compose in the plugin entrypoint.
- A single package until independent packages have a real consumer. No speculative abstractions.
- React web and established chat components; styles scoped to this plugin and Obsidian variables.
- Runtime must not require Node, Electron, a CLI, a local server or filesystem paths.
- Development scripts can use Bun/Node. Never confuse the build machine with the mobile runtime.
- Validate unknown data at boundaries. Prefer structured, recoverable tool errors.
- Keep API credentials out of prompts, tool outputs, fixtures and logs.

## Skills
Read the applicable skill in `.agents/skills/`:
- `obsidian-mobile`: host integration, lifecycle, mobile runtime and builds.
- `agent-engineering`: tools, context, providers and behavioral evaluations.
- `typescript-hexagonal`: boundaries, persistence and typed implementation.

## Verification
Run `bun run check` for typechecking, focused behavior tests and production/mobile build checks.
Model evals are explicit separate runs using environment-provided credentials and finite budgets.
Distinguish browser tests, desktop Obsidian and physical iOS/Android validation in reports.
Use the isolated development vault; never install into the user's everyday vault implicitly.

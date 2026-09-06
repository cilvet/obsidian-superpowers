# Hexagonal architecture and pragmatic DDD

Use the language of the user's activity to model behavior. DDD is about domain concepts and rules,
not a requirement to create many classes. A tiny feature may use a few plain functions and types.
Keep architecture decisions internal; talk to the user about what they can do and what happens to their data.

## Responsibilities and dependency direction

- Domain: entities, value types, invariants and pure decisions. No Obsidian, DOM, React, storage or network imports.
- Application: named use cases such as RecordWorkout or CompleteReading. Orchestrate the domain through
  ports for actual external needs. Do not create interfaces for every function.
- Adapters: translate notes/frontmatter into validated domain values, implement storage and host integration,
  and bind UI events to use cases. Views do not contain business rules or write frontmatter directly.
- Composition root: the Plugin entrypoint wires adapters/use cases and registers lifecycle resources.

For a nontrivial generated plugin a useful file set is main.ts, domain/workout.ts,
application/record-workout.ts, adapters/vault-workouts.ts and ui/workout-view.ts, plus styles.css.
Names and split should follow the task. Do not generate empty layers for a one-command convenience feature.
Domain/application depend inward; ports belong to their consumers. Use constructor/function injection,
not a DI container, generic repository framework, event bus or speculative shared package.

## Domain modeling

Give entities stable identity. Use value types for concepts with real validation or units. Define
aggregate boundaries only where rules must be enforced together; respect the limits of vault persistence.
Represent expected failures as a typed discriminated union rather than exceptions used as normal branching.
Never silently accept negative durations, unknown statuses or malformed relationships when the domain forbids them.
Keep serialization format separate from domain objects, and include a schema version when evolution needs one.

## TypeScript and dependencies

Infer types where possible. Avoid any, non-null assertions without evidence and broad casts of persisted data.
Narrow unknown values in adapters. Use small validation functions or locally supplied schemas; the generated
plugin cannot import Superpowers' installed Zod/React packages. Consult lookup_reference('plugins') for imports.
No framework dependencies in the core. Ordinary objects, unions and functions often express the domain best.
Tests/evidence should exercise invariants and real workflows, not mirror function names or promise behavior.
Compilation success is not semantic type checking or proof of persistence correctness.

## Functional communication

Say “Podrás registrar una sesión y consultar tu progreso”, not “Crearé un aggregate y un repository”.
Say “Tus entrenamientos quedarán en notas que puedes editar y sincronizar”, not “Persistiré frontmatter”.
Ask about behavior only when it changes the outcome. Choose technical defaults autonomously.
At completion describe the delivered workflow, how to open/use it, observed checks and any user-visible limit.
Do not dump source code, internal API names, folder scaffolding or architecture commentary into normal chat.

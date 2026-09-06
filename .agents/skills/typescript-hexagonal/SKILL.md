---
name: typescript-hexagonal
description: Develop typed domain models, application use cases and adapters while maintaining this project's hexagonal boundaries.
---

Keep domain values and path rules independent of Obsidian, React and AI SDK.
Put workflow sequencing in application services. Define ports for actual outside capabilities,
not an interface for every function. Adapters may depend inward; domain/application never depend outward.

Validate persisted and provider-originated unknown data at the boundary using Zod.
Infer types from schemas; use discriminated unions for success/failure states.
Use unknown and narrowing instead of any. Confine unavoidable host/internal-API casts to adapters.

Keep a single package and ordinary functions/classes. Do not add DI containers, generic repositories,
event buses or wrappers that merely cast a value. Dependency injection through constructors is sufficient.

Use focused tests for workflow behavior and boundary failures. Avoid snapshots of wording or implementation copies.

# esp-labs-web: rules for every change

- Follow the official docs and current best practices. Read the local docs first: [docs-llm/react/llms.txt](docs-llm/react/llms.txt), then [docs-llm/react-router/llms.txt](docs-llm/react-router/llms.txt) and [docs-llm/tanstack-query/llms.txt](docs-llm/tanstack-query/llms.txt). When they don't cover something, or a version may have changed, search the web before deciding.
- Keep code SOLID, modular and clean: pure logic in plain `.ts` modules, small components, one responsibility per file, contracts in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (widgets, the three simulator rules, the lab-screen engine).
- Aim for bug-free: strict TypeScript without `any` or unchecked `!`, no disabled React Compiler lint rules, minimal tests for new logic.
- Before calling a change done: `pnpm check` (typecheck, lint, tests), `pnpm build`, and a real browser run of the affected lessons at desktop and phone width with no console errors.
- No inline user-visible text: interface strings through i18next, content through overlays, RTL-safe logical CSS ([docs/I18N.md](docs/I18N.md)).
- Design tokens only (no raw colours), accessible controls, reduced motion respected, no horizontal page scroll at 390 px.
- Pin exact dependency versions with pnpm; stay on TypeScript 6 until typescript-eslint supports 7.

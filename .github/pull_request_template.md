## What and why

<!-- One or two sentences. Link the issue it closes: "Closes #12". -->

## Screenshots

<!-- For a visible change: before and after, at desktop and at 390 px if the layout changed. Delete if not visible. -->

## Checklist

- [ ] `pnpm check` passes (typecheck, lint, tests)
- [ ] `pnpm build` passes
- [ ] I opened the affected lessons in a browser at desktop and 390 px: no console errors, no horizontal page scroll
- [ ] New interface text goes through `t()`; lesson text changed → I ran `pnpm i18n:extract` and committed `src/locales/en/content/`
- [ ] Colours from design tokens, logical CSS (`inline-start`/`inline-end`), reduced motion respected
- [ ] New logic has a test
- [ ] A firmware change it depends on is linked (esp-labs PR)

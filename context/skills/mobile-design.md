# Touch-first interface design

Design the actual user journey on a 320–430 CSS-pixel-wide surface before expanding it.
The primary action must be obvious and reachable, with one clear next step on each screen.
Use the user's words: “Registrar entrenamiento”, not “Create aggregate”.

## Layout and touch

- Use a single-column list, cards or a short form on narrow surfaces. Use a drill-down detail view
  for records; do not shrink a wide desktop dashboard or spreadsheet until it fits.
- Make interactive targets at least 44 by 44 CSS pixels, including icon buttons and disclosure rows.
  Keep space between unrelated actions and label unfamiliar icons. This is our design target,
  not a claim that every interface has been audited for accessibility conformance.
- Do not require hover, right-click, drag-and-drop, double-click or a keyboard shortcut. Offer visible
  buttons/menu actions for each essential workflow, including reordering and deletion.
- Forms use visible labels, appropriate input types/inputmode, units and inline validation. Keep
  user input after an error. Use at least 16px input text to avoid unwanted iOS focus zoom.
- Respect the view container instead of 100vw/100vh. Flex children need min-height: 0 and min-width: 0.
  Prefer one intentional scroll region; long code or tables may scroll locally without widening the page.
- Account for env(safe-area-inset-bottom) when an action bar reaches the screen edge. Ensure the
  software keyboard cannot cover the active field, validation message or submit action.
- Avoid sticky/fixed controls until tested with the keyboard and short landscape screens. A normal
  flow action at the end of a form is better than an unreachable fixed footer.

## Behavior and accessibility

Use Obsidian ItemView, Modal, Setting and its theme variables. Scope CSS to the feature root.
Prefer native button, input, label, details and summary semantics. Include accessible names on
icon-only controls, visible focus indicators, and status text in addition to color.
Use Obsidian's setIcon with its bundled Lucide icons; no emoji buttons or downloaded icon fonts.
Honor prefers-reduced-motion and forced-colors. Loading must remain understandable without animation.
Provide empty, loading, error and offline states with an actionable way forward. Disable duplicate
submissions while saving and announce the result without moving focus unexpectedly.
Keep destructive controls away from the main action; prefer undo/trash where the domain allows it.
Persist a meaningful save promptly; a phone can suspend after any tap.

## Acceptance walk-through

Open the feature at 320px and 390px widths, plus a short landscape viewport. Add, edit and reopen
a record using touch-sized controls. Check long titles, empty lists, large font scaling and invalid input.
Measure interactive targets and horizontal overflow. Open the keyboard on a real phone when available.
If only desktop emulation is available, report keyboard/suspension/physical-device checks as unverified.

Reference for the target-size design goal: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html

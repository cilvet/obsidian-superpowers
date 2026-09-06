# Desktop and pane interface design

Start with the same domain workflow and data as mobile. Use extra space to reveal useful context;
do not create a second, incompatible feature. A desktop sidebar may be narrower than a phone.

## Layout

Measure the ItemView container. Use container queries or a ResizeObserver tied to its lifecycle,
not the whole screen width, when choosing between list-only and master/detail layouts.
At small widths, collapse to one column. At larger widths, lists and details can appear side by side.
Only use tables when comparing columns is the user's task; provide a narrow-screen representation.
Keep readable line lengths, consistent spacing and a clear primary action. Avoid full-window overlays
for ordinary tasks and avoid taking over unrelated workspace leaves.
Reuse an existing feature leaf before creating another. Register commands so the feature can be
opened through the command palette; preserve the user's working note when the task allows it.

## Keyboard, mouse and themes

Every action must be operable with keyboard and visible controls. Use logical DOM/tab order,
proper button semantics, Enter/Space behavior and visible focus. Escape should dismiss a dialog
using Obsidian's lifecycle; return focus to the trigger. Never trap focus in a normal view.
Shortcuts are optional accelerators registered through Obsidian, not global overrides of standard keys.
Hover can add a hint but cannot reveal the only way to edit, save or delete.
Use Obsidian theme variables for colors, borders, spacing and text. Do not hardcode white backgrounds,
black body text, or tiny muted labels. Verify light and dark themes and increased text size.
Use bundled Lucide SVG icons via setIcon, with accessible labels where needed.

## Multiple panes and windows

Use the view's contentEl and owning document/defaultView for DOM, focus and browser observers.
Derive host-specific behavior from documented APIs and actual capability checks, not a global singleton.
Two views may edit the same record: reread before a write, keep record IDs stable, and react to vault events.
Do not keep the only copy of important data in the view. Disposing one view must not break another.
Scope selectors and CSS under the plugin root; never style every button or heading in Obsidian.

## Acceptance walk-through

Open as a narrow pane and as a wide tab. Complete the main workflow using only Tab, Enter and Escape.
Resize while a form contains unsaved input. Close/reopen and verify persistence and focus behavior.
If the feature claims multiple-window support, test a detached window or report that limitation.
Use the verification guide to distinguish measured behavior from a design intention.

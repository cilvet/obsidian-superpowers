# Verify the user's actual workflow

Start from the user's acceptance criteria, not from whether the bundle compiled.
Inspect the environment and relevant guides. Use tools to observe actual state and correct failures.
Batch independent inspections/guide reads together; wait for prerequisite results before dependent actions.

## After installing or updating

1. Check the plugin is active and its expected commands/view are registered.
2. Perform a representative domain action in a clearly scoped temporary record or user-requested target.
3. Read the resulting data and reopen the feature; verify persistence, not just an optimistic notification.
4. Exercise an invalid or missing input and check that existing content remains intact.
5. Check that a second action/update does not duplicate commands, records or event handlers.
6. Inspect the rendered UI at narrow and wide container sizes. Measure overflow and target sizes.
7. Clean up only fixtures created for this check; never delete unrelated notes to get a passing result.

Use execute_obsidian to inspect public commands/views and real effects where supported; consult declarations
instead of inventing methods. Query inside the feature root, not all Obsidian DOM. Return compact results
with concrete measurements/paths, not whole app objects or the entire vault.
For persistence, check both saved content and the refreshed view. For Bases, open the view and verify records.
For lifecycle behavior, close/reopen the feature and verify it still works. An update must preserve user data.

## Platform evidence

Record the actual platform and view width. Check 320px/390px narrow layouts and a wider desktop pane,
including long labels, keyboard navigation, empty/error states, reduced motion and light/dark themes.
Touch emulation can measure layout and tap targets; it cannot establish iOS keyboard, permissions,
memory pressure, suspension, synchronization timing or Android file-provider behavior.
Never toggle the user's whole Obsidian into a different platform mode merely to claim coverage.
If a physical device is unavailable, tell the user what was checked and which actual-phone behavior remains untested.

## Error recovery and reporting

Read compiler/runtime diagnostics, consult the exact API, change the smallest relevant cause and retry.
Keep previously installed working behavior intact. Do not re-run a mutation blindly after cancellation or
an uncertain result: inspect whether its effect already happened. Report a blocked outcome when evidence requires it.
No “todo funciona” based only on a successful tool wrapper: nested results can contain ok:false.
Final messages use functional language: what works, how the user opens it, and observed limitations.

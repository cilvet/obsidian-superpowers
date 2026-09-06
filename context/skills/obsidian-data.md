# Notes as structured records

Prefer one Markdown note per user-visible record, with flat frontmatter for structured fields and
the body for free-form content. Properties are the data; Bases presents filtered views of that data.
It is not a relational database with transactions, foreign keys, unique constraints or a SQL engine.

## Choose the source of truth

- Use notes/Properties when users should read, edit, link, search or sync the records independently.
- Use a .base for a native filtered view when sufficient. A custom plugin can add the user's form,
  commands and validation while continuing to store records as normal notes.
- Use loadData/saveData for plugin configuration. Avoid putting the user's entire record database in
  one data.json file: it is opaque to Bases and creates a large synchronization/conflict unit.
- Use a documented JSON schema only when the requested structure cannot reasonably be expressed as
  notes. Explain its functional tradeoff. Do not make browser localStorage/IndexedDB the only copy of
  shared user data: Obsidian Sync operates on vault files, not arbitrary browser storage.

## Model and validate

Use domain-specific names and stable IDs independent of note paths. A note can be renamed or moved.
Choose explicit units, enum values, optional fields and date semantics. Store dates as YYYY-MM-DD;
decide separately when an instant needs timezone information. Do not use localized display dates as IDs.
Use quoted wikilinks or lists of links for user-visible relationships; check missing targets gracefully.
For repeated child records, prefer separate notes when they need queries; nested frontmatter objects
are not a convenient editable native Properties interface. Inspect existing property conventions first:
the same property name has one native type throughout the vault.
Validate unknown frontmatter at the adapter boundary. Skip/report invalid records rather than silently
coercing them or overwriting unfamiliar fields. A malformed record must not break the entire view.

## Writes, sync and indexes

Use Vault APIs for normal notes and DataAdapter for hidden/configuration paths. Check TFile before
file operations. Use Vault.process for an atomic local read-modify-write and
fileManager.processFrontMatter for properties; preserve unrelated keys and the note body.
Callbacks to these transformations must be synchronous. Await the operation and handle errors.
Serialize local updates to the same data; do not claim this prevents conflicts between devices.
Vault files have no multi-record transaction: design idempotent operations, stable child IDs and repairable
partial saves. A migration needs a version, validation, preserved originals and a resumable path.
Do not wipe data on reinstall, disable, migration failure or unknown schema version.

MetadataCache is an eventually updated read index, not the sole authority immediately after a write.
Use relevant vault/metadata events to update a bounded in-memory index and dispose those subscriptions.
Handle rename/delete and changes arriving from sync. Debounce refreshes; do not rescan all notes per keystroke.
When verifying a save, reread the file; when verifying a view, wait for the actual index/view update.

## Bases

Check that the core feature and requested view type are available in the actual Obsidian version.
Use valid YAML; filter the dataset explicitly (a Base otherwise includes vault files broadly).
There is no SQL FROM/source clause. Example for a hypothetical Reading folder:

```yaml
filters:
  and:
    - 'file.inFolder("Reading")'
    - 'file.ext == "md"'
views:
  - type: table
    name: Reading list
    order:
      - file.name
      - note.status
      - note.rating
```

The order list selects displayed columns; do not confuse it with row sorting. Inspect current Bases
syntax before adding formulas or grouping. Preserve a user's existing views when updating a .base.
Open the file and verify visible records; merely parsing YAML does not prove a Base works.

Sources: https://obsidian.md/help/bases · https://obsidian.md/help/properties ·
https://obsidian.md/help/bases/syntax · https://docs.obsidian.md/Plugins/Vault

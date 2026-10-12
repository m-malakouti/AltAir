# Local bookmark storage

## Business scope

Bookmarks, categories, and local search belong to the Free product. They work
without an account, subscription, network request, or market API. There is no
application-imposed bookmark count limit; browser storage quota still applies.
Cloud backup and synchronization remain future Pro services with server-enforced
entitlements. The Side Panel now connects this foundation to the bookmark management UI.
Import/export and browser bookmark import are separate future issues.

## Data contract

`features/bookmarks/bookmark-model.ts` defines version 1 of the document stored at
`altAir.bookmarks` in `chrome.storage.local`. Each bookmark has a UUID, title,
normalized HTTP/HTTPS URL, optional category ID, and UTC creation/update timestamps.
Each category has a stable UUID, name, and timestamps. Editing preserves IDs and
creation times. No browser bookmarks permission is needed for this independent
collection.

URLs must be absolute HTTP/HTTPS addresses without embedded credentials. URL
normalization preserves paths, queries, and fragments. Duplicate normalized URLs
are rejected instead of replacing an existing bookmark. Titles are trimmed and
limited to 300 characters; category names to 100 characters. Persian search treats
Arabic/Persian variants of yeh and kaf consistently, ignores vowel marks, and
normalizes half spaces. Search matches all query terms against title and URL,
with optional category filtering. Equivalent category names cannot coexist.
Deleting a category keeps its bookmarks and moves them to the uncategorized group.

## Storage integrity

The repository acquires an exclusive, origin-scoped Web Lock before reading the
latest document, validating it, applying one immutable change, and writing the
whole result. All Alt Air bookmark writers must use this repository. The lock
coordinates cooperating Popup and Side Panel contexts; it does not protect
against external tools writing directly to storage. Missing Web Locks cause a
reported error rather than an unsafe write.

Only an absent storage key creates an empty document. Malformed documents,
unsupported versions, duplicate IDs, dangling category references, and read
failures are reported without overwriting existing data. Write failures are
reported without returning success. A later operation can retry. Future schema
versions require an explicit migration; this implementation performs no automatic
migration or destructive recovery.

The browser adapter exposes change subscriptions. Plain-browser previews use
localStorage instead of extension storage; their records are separate from the
installed extension and are not a backup. No key or bookmark data goes to the
market proxy. Extension uninstall or browser profile loss can remove local data;
export will be implemented before release.

## Validation and remaining acceptance

Automated tests cover schema and URL validation, immutable CRUD, category rules,
Persian search, storage failures, unsupported documents, concurrent operations,
and adapter notification cleanup. Run `npm run check`.

When the UI is integrated, verify in unpacked Chrome and Edge that adding,
editing, and deleting records persists across closing the Popup, reopening the
Side Panel, browser restart, and extension reload. Exercise two simultaneous
views, offline operation, storage quota errors, keyboard interaction, and RTL.
Mocked adapter tests do not replace those installed-browser acceptance checks.

## Side Panel management UI

The minimal workspace places compact bookmark tiles before the dollar widget.
The glass plus tile opens a title and URL form. Save, cancel, edit, delete,
navigation, and refresh use icons with accessible names and hover titles.
Deletion requires confirmation. Search appears when bookmarks exist. Categories
are no longer exposed in the UI. Existing category metadata remains in storage;
edits preserve it and new bookmarks have no category.

Each tile tries /favicon.ico, then /apple-touch-icon.png, directly from its HTTPS origin with no referrer. Its initial-letter preview remains visible until an icon loads successfully.
There is no third-party favicon service or additional host permission. Failed
loads and HTTP bookmarks use a local initial-letter fallback. The decorative
night sky is a bundled SVG with a stylized summer triangle, available offline.

Formatting, lint, TypeScript, 114 automated tests, and build passed. Visual and
installed-extension checks remain pending after browser automation approval
failed with HTTP 429. After reloading the unpacked extension, verify:

1. Add a disposable bookmark with the plus tile and reopen the panel to check persistence.
2. Edit and search for it; check that duplicate URL errors preserve form input.
3. Check the favicon fallback offline.
4. Cancel deletion, then confirm deletion of the disposable bookmark.
5. Check keyboard focus, icon tooltips, both themes, and a 320px panel without overflow.
6. Confirm storage changes propagate between two views.

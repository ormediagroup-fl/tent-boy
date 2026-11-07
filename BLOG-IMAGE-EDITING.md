# Blog image editing

This feature is prepared on `feature/blog-image-editing`. It is not merged or deployed.

## Using the editor

Choose **Add photo**, upload a JPEG/PNG/WebP, then enter its alt text in the image settings panel. A new photo starts full width and centered. Caption is optional. Tap an existing photo, choose **Edit image**, or Tab to the photo and press Enter to open the same panel. Escape or **Done editing image** closes it and returns keyboard focus to the photo.

Choose Small (33%), Medium (50%), Large (75%) or Full width (100%), then Left, Center or Right. Images occupy their own block; text does not wrap around them. The controls update the visible editor immediately. Captions appear below the image; leaving the caption blank removes it. Alt text is never copied into a caption. Remove image supports immediate Undo/Redo through the existing toolbar. Native text formatting and paste behavior are retained.

## Structured content and compatibility

Inline image blocks retain `type`, `src` and `alt`, with optional `caption` (plain text, up to 2,000 characters), `width` (`small`, `medium`, `large`, `full`) and `align` (`left`, `center`, `right`). Missing fields default to no caption, full width and center. Existing stored posts need no migration. The old automatically generated alt-text captions intentionally disappear unless an explicit caption is added. Source image paths are not rewritten by the editor.

The same allowlists validate server-side saves and builds through the existing `validatePosts` call in `content/schema.js`. Only known classes reach HTML; arbitrary CSS is not accepted. Captions and alt text are escaped. The editor's form widgets are excluded from serialized post blocks. The existing browser WebP optimizer, image resolver, uploads and Git-backed draft/publish path are reused.

Public and editor image layout rules are mirrored and checked by a test. Aspect ratios are preserved at all screen sizes. Selected percentages also apply on phones; choose Full width for photos/captions that need more space. Preview uses the existing shared renderer.

## Validation

Run `npm test` and `npm run build` from the website root. There are 29 passing automated checks, including all 12 size/alignment combinations, legacy blocks, caption independence/removal/escaping, malicious metadata rejection, serializer round trips, Worker Git-tree persistence, and a real static build with multiple images, WebP output and draft exclusion.

For browser QA, run `node tests/image-editor-server.cjs`, then open `http://127.0.0.1:4175/admin/`. This loopback-only fixture uses in-memory test posts and uploads; stopping it discards them. It has no production credentials and does not contact GitHub or Cloudflare. Test publication can be performed through its `/api/publish` endpoint and viewed at `/qa-published/blog/image-editor-qa/`. It is a simulated publication, not a production deployment.

Browser scenarios verified:

- Upload a real PNG, optimize to a 41,798-byte WebP, and add separate alt text/caption.
- Add a caption to a legacy image; edit an existing caption; remove the caption while preserving the photo and alt text.
- Change existing image width/alignment; save and reload without losing metadata or image paths.
- Preview multiple images and simulate publication in the isolated fixture; verify output metadata and appearance.
- Keyboard Enter opens image settings, Escape closes them; remove, Undo, Redo and Undo restore the expected image counts.
- Published layouts at 375, 768 and 1280 pixels retain the expected 33%, 50% and 75% widths, preserve aspect ratios, stay inside the content column and use no floats. Full width was also checked in the editor at a measured width ratio of 1.00; all four widths and three alignments are covered in automated rendering tests.

Production publishing and a real iPhone/Safari device test were deliberately not performed. For a future approved rollout, both the GitHub Pages build and the existing Cloudflare admin Worker need their source/assets updated; otherwise an older admin could drop the new metadata on a subsequent save. No new service, dependency, credentials or CMS is introduced.



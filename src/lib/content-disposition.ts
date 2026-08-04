/**
 * Build a safe RFC 6266 / RFC 5987 Content-Disposition header value from a
 * user-supplied filename.
 *
 * Always emits BOTH forms:
 *   - filename="..."      legacy ASCII fallback (RFC 6266 §4.3)
 *   - filename*=UTF-8''...  UTF-8 form for non-ASCII (RFC 5987 / RFC 6266 §5)
 *
 * Defences against header injection:
 *   - CR (\r) and LF (\n) are removed (would otherwise terminate the header)
 *   - NUL and other control chars (0x00–0x1F, 0x7F) are removed
 *   - Embedded quotes / backslashes in the legacy form are stripped so the
 *     quoting cannot be broken out of
 *   - Path separators and parent-dir segments are stripped to keep the
 *     displayed name well-formed even if a CMS stored a path-like value
 *   - The legacy ASCII form is restricted to printable ASCII (0x20–0x7E);
 *     non-ASCII characters are only emitted via the UTF-8 form
 *
 * Pure function — no Next / Node imports — so it can be unit-tested.
 */
export function safeContentDisposition(input: string, disposition: 'inline' | 'attachment' = 'inline'): string {
  // Strip everything that could break header syntax or be invisible / weird.
  let cleaned = String(input ?? '')
    // Remove header-breaking bytes first.
    .replace(/[\r\n\0]/g, '')
    // Drop path-like segments so a stray "../../etc/passwd" can't be
    // surfaced in the user's downloads list.
    .replace(/\.\.+/g, '')
    .replace(/[\\/]/g, '_');

  // Legacy ASCII form: printable ASCII only. Non-ASCII replaced with '_'.
  // eslint-disable-next-line no-control-regex
  const asciiFallback = cleaned
    .replace(/[^\x20-\x7E]/g, '_')
    // Strip quotes/backslashes so the legacy quoting cannot be escaped.
    .replace(/["\\]/g, '');

  // UTF-8 form per RFC 5987: percent-encode, restricted to attr-char set.
  // attr-char is a small set; using percent-encoding for everything outside it
  // is the safe choice.
  const utf8Encoded = encodeURIComponent(cleaned)
    .replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

  const asciiName = asciiFallback || 'download';
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Encoded}`;
}

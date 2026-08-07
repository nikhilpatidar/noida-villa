/**
 * Content-Disposition / header injection regression tests.
 *
 * The previous implementation only stripped quotes from user-supplied
 * filenames, which let CR / LF through and allowed arbitrary response
 * header injection. The fix in src/app/api/files/[id]/route.ts emits an
 * RFC 6266 + RFC 5987 pair (filename="..." + filename*=UTF-8''...) and
 * strips / encodes anything that could break header syntax.
 */
import { describe, it, expect } from 'vitest';
import { safeContentDisposition } from '../src/lib/content-disposition';

describe('safeContentDisposition', () => {
  it('handles a normal filename', () => {
    const out = safeContentDisposition('receipt-2025-01-15.pdf');
    expect(out).toContain('inline;');
    expect(out).toContain('filename="receipt-2025-01-15.pdf"');
    // UTF-8 form is always emitted so non-ASCII filenames work too.
    expect(out).toContain("filename*=UTF-8''receipt-2025-01-15.pdf");
    // Header value must contain no CR or LF.
    expect(out).not.toMatch(/[\r\n]/);
  });

  it('drops double quotes so the legacy quoting cannot be escaped', () => {
    const out = safeContentDisposition('evil"name.pdf');
    // The legacy form must not contain an unescaped quote inside the value.
    // Pattern: `filename="..."` with no internal `"`.
    expect(out).toMatch(/filename="[^"]*"/);
    // And the offending quote must be gone.
    expect(out).not.toContain('evil"');
  });

  it('strips CR / LF so they cannot inject new headers', () => {
    const out = safeContentDisposition('evil\r\nX-Injected: true');
    expect(out).not.toMatch(/[\r\n]/);
    // The injection payload must not appear as a parsed header value.
    // Note: the literal text "X-Injected" can remain as a substring of the
    // filename (it is no longer a header because the CR/LF is gone).
    // What MUST NOT survive is any ":" that would re-parse as a header.
    expect(out).not.toMatch(/\r\n/);
  });

  it('strips lone LF', () => {
    const out = safeContentDisposition('foo\nbar');
    expect(out).not.toMatch(/[\r\n]/);
    // The LF is removed; surrounding text is concatenated.
    expect(out).toContain('foobar');
  });

  it('strips NUL bytes', () => {
    const out = safeContentDisposition('foo\0bar.pdf');
    expect(out).not.toMatch(/\x00/);
    expect(out).toContain('foobar.pdf');
  });

  it('handles path traversal by collapsing parent-dir segments', () => {
    const out = safeContentDisposition('../../etc/passwd');
    expect(out).not.toContain('..');
    expect(out).not.toContain('/');
    // Forward slashes were replaced with underscores.
    expect(out).toContain('etc_passwd');
  });

  it('handles backslash path traversal', () => {
    const out = safeContentDisposition('..\\..\\windows\\system32\\evil.dll');
    expect(out).not.toContain('..');
    expect(out).not.toContain('\\');
    // Backslashes were replaced with underscores.
    expect(out).toContain('windows_system32_evil.dll');
  });

  it('preserves Unicode (Hindi) filenames via the RFC 5987 UTF-8 form', () => {
    const out = safeContentDisposition('किराया-रसीद.pdf');
    // Legacy form should NOT contain raw Hindi (would corrupt the header).
    expect(out).toMatch(/filename="[^"]*"/);
    // UTF-8 form must contain percent-encoded Hindi.
    expect(out).toContain("filename*=UTF-8''");
    expect(out).toContain('%E0%A4%95'); // क → E0 A4 95
  });

  it('falls back to "download" when ASCII sanitization empties the name', () => {
    const out = safeContentDisposition('\n\r\0');
    expect(out).toContain('filename="download"');
  });

  it('returns a string usable as a single HTTP header value', () => {
    for (const name of [
      'normal.pdf',
      'evil"\r\nX-Injected: true',
      '../../secret.pdf',
      '..\\..\\secret.pdf',
      'filename\r\nContent-Length: 0',
      'with spaces and (parens).pdf',
      "with'apostrophe.pdf",
      'किराया-रसीद.pdf',
      '',
    ]) {
      const out = safeContentDisposition(name);
      expect(out).not.toMatch(/[\r\n]/);
      expect(out).not.toMatch(/\0/);
      // Must start with the disposition type.
      expect(out.startsWith('inline;')).toBe(true);
      // Must contain the legacy form.
      expect(out).toMatch(/filename="[^"]*"/);
      // Must contain the UTF-8 form.
      expect(out).toMatch(/filename\*=UTF-8''/);
    }
  });
});
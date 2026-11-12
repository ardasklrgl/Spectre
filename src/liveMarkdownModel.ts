import { Lexer, type Token } from 'marked';
export type SourceBlock = { start: number; end: number; token: Token };
export type SourceRange = { start: number; end: number };

// Marked normalizes CRLF. Map its offsets back to the untouched source so
// editing one block cannot damage Windows line endings elsewhere in a note.
export function sourceBlocks(source: string): SourceBlock[] {
  let normalized = '';
  const offsets = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\r') {
      normalized += '\n'; if (source[i + 1] === '\n') i++;
    } else normalized += source[i];
    offsets.push(i + 1);
  }
  const tokens = Lexer.lex(normalized, { gfm: true });
  const blocks: SourceBlock[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const found = normalized.indexOf(token.raw, cursor);
    if (found < 0) return [{ start: 0, end: source.length, token: { type: 'text', raw: source, text: source } }];
    if (found > cursor) blocks.push({ start: offsets[cursor], end: offsets[found], token: { type: 'space', raw: normalized.slice(cursor, found) } });
    cursor = found + token.raw.length;
    blocks.push({ start: offsets[found], end: offsets[cursor], token });
  }
  if (cursor < normalized.length) blocks.push({ start: offsets[cursor], end: source.length, token: {type:'space',raw:normalized.slice(cursor)} });
  return blocks;
}
export function replaceSource(source: string, range: SourceRange, replacement: string) {
  if (range.start < 0 || range.end < range.start || range.end > source.length) throw new Error('Invalid Markdown edit range');
  return { text: source.slice(0, range.start) + replacement + source.slice(range.end), range: { start: range.start, end: range.start + replacement.length } };
}

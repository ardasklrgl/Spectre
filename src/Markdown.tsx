import { createElement, useMemo, type ReactNode } from 'react';
import { Lexer, type Token, type MarkedToken } from 'marked';
import { openUrl } from '@tauri-apps/plugin-opener';

export function safeMarkdownUrl(raw: string): string | null {
  const url = raw.trim();
  if (url.startsWith('#')) return url;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}
// Render parser tokens as React elements. Raw HTML is displayed as text;
// no note content is injected into the DOM as executable HTML.
export function renderMarkdownTokens(tokens: Token[], onError: (error: unknown) => void): ReactNode {
  return tokens.map((token, key) => {
    const t = token as MarkedToken;
    const children = (items: Token[]) => renderMarkdownTokens(items, onError);
    switch (t.type) {
      case 'heading': return createElement(`h${t.depth}`, {key}, children(t.tokens));
      case 'paragraph': return <p key={key}>{children(t.tokens)}</p>;
      case 'strong': return <strong key={key}>{children(t.tokens)}</strong>;
      case 'em': return <em key={key}>{children(t.tokens)}</em>;
      case 'del': return <del key={key}>{children(t.tokens)}</del>;
      case 'code': return <pre key={key}><code>{t.text}</code></pre>;
      case 'codespan': return <code key={key}>{t.text}</code>;
      case 'blockquote': return <blockquote key={key}>{children(t.tokens)}</blockquote>;
      case 'hr': return <hr key={key}/>;
      case 'br': return <br key={key}/>;
      case 'space': case 'def': return null;
      case 'html': return <span key={key}>{t.text}</span>;
      case 'escape': return <span key={key}>{t.text}</span>;
      case 'text': return t.tokens ? children(t.tokens) : t.text;
      case 'checkbox': return <input key={key} type="checkbox" checked={t.checked} disabled aria-label={t.checked ? 'Completed task' : 'Incomplete task'}/>;
      case 'list': {
        const items = t.items.map((item, i) => <li key={i} className={item.task ? 'markdown-task' : undefined}>
          {children(item.tokens)}
        </li>);
        return t.ordered ? <ol key={key} start={Number(t.start) || 1}>{items}</ol> : <ul key={key}>{items}</ul>;
      }
      case 'list_item': return <li key={key}>{children(t.tokens)}</li>;
      case 'table': return <div key={key} className="markdown-table" tabIndex={0} aria-label="Scrollable table"><table>
        <thead><tr>{t.header.map((cell, i) => <th key={i} style={{textAlign:cell.align ?? 'left'}}>{children(cell.tokens)}</th>)}</tr></thead>
        <tbody>{t.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{textAlign:cell.align ?? 'left'}}>{children(cell.tokens)}</td>)}</tr>)}</tbody>
      </table></div>;
      case 'link': {
        const href = safeMarkdownUrl(t.href);
        if (!href) return <span key={key}>{children(t.tokens)}</span>;
        return <a key={key} href={href} title={t.title ?? undefined} onClick={e => {
          if (href.startsWith('#')) return;
          e.preventDefault(); void openUrl(href).catch(onError);
        }}>{children(t.tokens)}</a>;
      }
      // Study notes do not automatically fetch remote images.
      case 'image': return <span key={key} className="markdown-image">[Image: {t.text || 'image'}]</span>;
      default: return <span key={key}>{token.raw}</span>;
    }
  });
}
export function Markdown({text, onError}: {text: string; onError: (error: unknown) => void}) {
  const tokens = useMemo(() => Lexer.lex(text, {gfm: true, breaks: false}), [text]);
  return <>{renderMarkdownTokens(tokens, onError)}</>;
}

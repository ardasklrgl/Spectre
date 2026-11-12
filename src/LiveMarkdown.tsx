import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { renderMarkdownTokens } from './Markdown';
import { sourceBlocks, replaceSource, type SourceRange } from './liveMarkdownModel';
export type LiveMarkdownHandle = { focus: () => void };
type Props = { text: string; loaded: boolean; onChange: (text: string) => void; onError: (e: unknown) => void };
export const LiveMarkdown = forwardRef<LiveMarkdownHandle, Props>(function LiveMarkdown({ text, loaded, onChange, onError }, ref) {
  const [active, setActive] = useState<SourceRange | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const blocks = sourceBlocks(text);
  const activeText=active?text.slice(active.start,active.end):'';
  const heading=activeText.match(/^(#{1,6})\s/);
  const sourceClass=heading?` live-heading-${heading[1].length}`:/^\s*(```|~~~)/.test(activeText)?' live-code':'';
  function activate(range: SourceRange, position = range.end - range.start) {
    caret.current = position; setActive(range);
  }
  useImperativeHandle(ref, () => ({ focus() {
    const el = input.current ?? surface.current;
    if (el) { const top = surface.current?.scrollTop ?? 0; el.focus({preventScroll:true}); if(surface.current)surface.current.scrollTop=top; }
  } }));
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = '0'; el.style.height = `${Math.max(30, el.scrollHeight)}px`;
    el.focus({preventScroll:true});
    if (caret.current !== null) { el.setSelectionRange(caret.current, caret.current); caret.current = null; }
  }, [active, text]);
  function update(value: string) {
    if (!active) return;
    const next = replaceSource(text, active, value);
    setActive(next.range); onChange(next.text);
  }
  function keys(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!active || e.nativeEvent.isComposing) return;
    const el=e.currentTarget, position=el.selectionStart, end=el.selectionEnd;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='a') {
      e.preventDefault(); setActive({start:0,end:text.length});
      requestAnimationFrame(()=>input.current?.select()); return;
    }
    if (e.key==='ArrowUp' && position===0 && end===0) {
      const previous=blocks.filter(b=>b.end<=active.start && b.token.type!=='space').at(-1);
      if(previous){e.preventDefault();activate(previous);}return;
    }
    if (e.key==='ArrowDown' && position===el.value.length && end===position) {
      const next=blocks.find(b=>b.start>=active.end && b.token.type!=='space');
      if(next){e.preventDefault();activate(next,0);}return;
    }
    if (e.key==='Enter' && !e.shiftKey && position===end && !el.value.trimStart().startsWith('```') && !el.value.trimStart().startsWith('~~~')) {
      const lineStart=el.value.lastIndexOf('\n',position-1)+1;
      const line=el.value.slice(lineStart,position);
      const list=line.match(/^(\s*)([-+*]|\d+[.)])\s+(\[[ xX]\]\s+)?(.*)$/);
      if(list){
        e.preventDefault();
        if(!list[4].trim()){
          const next=replaceSource(text,active,el.value.slice(0,lineStart)+'\n'+el.value.slice(position));
          onChange(next.text);activate({start:active.start+lineStart+1,end:active.start+lineStart+1},0);
        }else{
          const marker=/^\d/.test(list[2])?`${parseInt(list[2],10)+1}${list[2].slice(-1)}`:list[2];
          const prefix=`${list[1]}${marker} ${list[3]?'[ ] ':''}`;
          caret.current=position+1+prefix.length;
          update(el.value.slice(0,position)+'\n'+prefix+el.value.slice(position));
        }
        return;
      }
    }
    // A blank line completes the current paragraph. Its formatting appears
    // immediately and typing continues in a new block in the same surface.
    if (e.key==='Enter' && !e.shiftKey && position===end && position===el.value.length && el.value.endsWith('\n') && !el.value.trimStart().startsWith('```') && !el.value.trimStart().startsWith('~~~')) {
      e.preventDefault();
      const inserted=replaceSource(text,active,el.value+'\n');
      onChange(inserted.text); activate({start:inserted.range.end,end:inserted.range.end},0);
    }
  }
  function rendered(from: number, to: number) {
    // Parse each side separately while editing: deleting a separator must not
    // make a neighbouring paragraph disappear by merging across the edit range.
    const visible=active?sourceBlocks(text.slice(from,to)).map(b=>({...b,start:b.start+from,end:b.end+from})):blocks;
    return visible.map(block=>{
      const whitespace=block.token.type==='space';
      return <div key={`${block.start}:${block.token.type}`} className={`live-block${whitespace?' live-space':''}`} tabIndex={loaded?0:-1} role="button" aria-label={whitespace?'Edit blank line':'Edit Markdown block'} onKeyDown={e=>{if(loaded&&(e.key==='Enter'||e.key===' ')){e.preventDefault();activate(block,0)}}} onClick={e=>{
        if(!loaded || (e.target as HTMLElement).closest('a'))return;
        const selection=window.getSelection();if(selection&&!selection.isCollapsed)return;
        activate(block);
      }}>{whitespace?null:renderMarkdownTokens([block.token],onError)}</div>;
    });
  }
  return <div onPaste={e=>{
    if(!loaded||e.target===input.current)return;
    const pasted=e.clipboardData.getData('text/plain');if(!pasted)return;
    e.preventDefault();
    const separator=text.length&&!text.endsWith('\n\n')?(text.endsWith('\n')?'\n':'\n\n'):'';
    const start=text.length+separator.length;
    onChange(text+separator+pasted);activate({start,end:start+pasted.length},pasted.length);
  }} ref={surface} className="study-preview live-markdown" tabIndex={0} aria-label="Live Markdown study notes" onKeyDown={e=>{
    if(e.target!==e.currentTarget||!loaded)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();setActive({start:0,end:text.length});requestAnimationFrame(()=>input.current?.select());}
    else if(e.key==='Enter'){e.preventDefault();activate({start:text.length,end:text.length},0)}
    else if(e.key.length===1 && !e.metaKey && !e.ctrlKey && !e.altKey){e.preventDefault();const range={start:text.length,end:text.length};const n=replaceSource(text,range,e.key);onChange(n.text);activate(n.range,1)}
  }}>
    {!loaded?<p className="live-placeholder">Loading…</p>:<>
      {rendered(0,active?.start??text.length)}
      {active&&<textarea ref={input} className={`study-editor live-source${sourceClass}`} aria-label="Edit Markdown block" placeholder="Start taking notes…" spellCheck={false} value={text.slice(active.start,active.end)} onChange={e=>update(e.target.value)} onKeyDown={keys} onBlur={()=>setActive(null)}/>}
      {active&&rendered(active.end,text.length)}
      {!active&&<button className="live-append" onClick={()=>{
        const separator=text.length&&!text.endsWith('\n\n')?(text.endsWith('\n')?'\n':'\n\n'):'';
        if(separator)onChange(text+separator);
        activate({start:text.length+separator.length,end:text.length+separator.length},0);
      }}>{text.trim()?'Continue writing…':'Start taking notes…'}</button>}
    </>}
  </div>;
});

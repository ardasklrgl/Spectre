import { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import './study.css';
import {save as saveDialog} from '@tauri-apps/plugin-dialog';
import {Icon} from './Icons';
import {readAppearance,saveAppearance} from './appearance';
import { RichStudyEditor, type RichStudyHandle } from './RichStudyEditor';
import type { RichNote } from './richTextConfig';

const edges = ['North', 'NorthEast', 'East', 'SouthEast', 'South', 'SouthWest', 'West', 'NorthWest'] as const;
export function StudyNote() {
  const [initial, setInitial] = useState<RichNote|null>(null);

  const [appearance,setAppearance]=useState(readAppearance);
  const [menu,setMenu]=useState(false);
  const [words,setWords]=useState(0);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('Loading…');
  const [error, setError] = useState('');
  const editor = useRef<RichStudyHandle>(null);
  const value = useRef<RichNote>({document:null,markdown:''});
  const ready = useRef(false);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const fail = (e: unknown) => { setError(String(e)); setStatus('Not saved'); };
  const focus = () => requestAnimationFrame(() => editor.current?.focus());

  async function load() {
    try {
      const note = isTauri()?await invoke<RichNote>('read_rich_study_note'):{document:null,markdown:localStorage.getItem('preview-study-note')||''};
      value.current = note; setInitial(note); ready.current = true;
      setLoaded(true); setError(''); setStatus('Saved'); focus();
    } catch (e) { fail(e); }
  }
  function save(): Promise<void> {
    clearTimeout(timer.current);
    if (!ready.current) return Promise.resolve();
    const snapshot = value.current;
    const version = revision.current;
    const job = queue.current.catch(() => {}).then(async () => {
      if (version <= savedRevision.current) return;
      if(isTauri())await invoke('write_rich_study_note', { note: snapshot });else localStorage.setItem('preview-study-note',snapshot.markdown);
      savedRevision.current = version;
      if (version === revision.current) { setStatus('Saved'); setError(''); }
    });
    queue.current = job;
    return job;
  }
  async function flush() {
    do { await save(); } while (ready.current && savedRevision.current < revision.current);
  }
  async function hide() {
    try {
      await flush();
      if(isTauri())await invoke('hide_study_note', { restoreFocus: true });
    } catch (e) {
      fail(e); // Keep the unsaved text visible and available to retry/copy.
    }
  }
  useEffect(() => {
    const cleanup: Array<() => void> = [];
    let disposed = false;
    const add = (promise: Promise<() => void>) => {
      promise.then(fn => disposed ? fn() : cleanup.push(fn)).catch(fail);
    };
    if(isTauri()){
    add(listen('study-appearance',()=>setAppearance(readAppearance())));
    add(listen('study-dismiss', () => { void hide(); }));
    add(listen('study-resume', focus));
    add(listen<string>('study-geometry-error', e => { setError(`Window position could not be saved: ${e.payload}`); }));
    add(listen('study-quit', () => {
      void flush().then(() => invoke('finish_quit')).catch(fail);
    }));
    }
    const sync=()=>setAppearance(readAppearance());window.addEventListener('storage',sync);
    const away=(e:PointerEvent)=>{if(!(e.target as HTMLElement).closest('.note-menu,.note-more'))setMenu(false)};document.addEventListener('pointerdown',away);
    void load();
    return () => { window.removeEventListener('storage',sync);document.removeEventListener('pointerdown',away);disposed = true; clearTimeout(timer.current); cleanup.forEach(fn => fn()); };
  }, []);


  return <main className="study-window" onKeyDown={e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save().catch(fail); }
  }}>
    <section className="study-note" aria-label="Study notepad">
      <div className="study-titlebar" onMouseDown={e => {
        if (e.button === 0 && isTauri() && !(e.target as HTMLElement).closest('button')) {
          e.preventDefault(); void getCurrentWindow().startDragging().catch(fail);
        }
      }}>
        <span className="window-title"><Icon name="note"/>Study note</span><div className="head-actions"><button className="icon note-more" aria-label="Note options" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Icon name="more"/></button><button className="icon" aria-label="Hide study note" title="Hide · ⌘⇧N" onClick={()=>void hide()}><Icon name="x"/></button></div>
      </div>
      {menu&&<div className="menu note-menu"><button onClick={()=>{const next={...appearance,toolbar:!appearance.toolbar};saveAppearance(next);setAppearance(next);if(isTauri())void import('@tauri-apps/api/event').then(({emit})=>emit('study-appearance',next));setMenu(false)}}><Icon name="layout"/>{appearance.toolbar?'Hide':'Show'} formatting bar</button><button onClick={()=>{if(isTauri()){void (async()=>{const path=await saveDialog({defaultPath:'Study-note.md',filters:[{name:'Markdown',extensions:['md']}]});if(path){await flush();await invoke('export_study_note',{path})}})().catch(fail)}else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([value.current.markdown],{type:'text/markdown'}));a.download='Study-note.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}setMenu(false)}}><Icon name="file"/>Export Markdown</button><button onClick={()=>{editor.current?.undo();setMenu(false)}}>Undo</button><button onClick={()=>{editor.current?.redo();setMenu(false)}}>Redo</button></div>}
      <RichStudyEditor ref={editor} initial={initial} toolbar={appearance.toolbar} size={appearance.size} onWords={setWords} onError={e=>setError(String(e))} onChange={next=>{
        value.current=next;revision.current+=1;setStatus('Saving…');clearTimeout(timer.current);timer.current=setTimeout(()=>{void save().catch(fail)},200);
      }}/>
      <div className="study-footer note-foot"><span className="saved" role="status">{status==='Saved'&&<Icon name="check"/>}{status}</span><span className="count">{words} words</span></div>
      {error && <div className="study-error" role="alert"><span>{error}</span><button onClick={() => { void (loaded ? save() : load()).catch(fail); }}>Retry</button></div>}
      <span className="study-corner" aria-hidden="true"><Icon name="resize"/></span>
    </section>
    {edges.map(edge => <div key={edge} className={`study-resize resize-${edge}`} aria-hidden="true" onMouseDown={e => {
      if (e.button === 0 && isTauri()) { e.preventDefault(); void getCurrentWindow().startResizeDragging(edge).catch(fail); }
    }}/>) }
  </main>;
}

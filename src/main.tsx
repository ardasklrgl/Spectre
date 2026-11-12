import React, { useEffect, useLayoutEffect, useRef, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import './style.css';
import {Icon} from './Icons';
import {readAppearance,saveAppearance,type Appearance} from './appearance';
const StudyNote=lazy(()=>import('./StudyNote').then(module=>({default:module.StudyNote})));
type Draft = { text: string; attachments: string[] };
type Capture = { id: string; createdAt: number; text: string; attachments: string[] };
type History = { captures: Capture[]; warnings: string[] };
type View = 'capture' | 'history' | 'settings';
const empty = (): Draft => ({ text: '', attachments: [] });
const desktop = isTauri();
let serial = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const job = serial.then(fn); serial = job.then(() => {}, () => {}); return job;
}
// Browser mode is explicitly a visual preview, with no fake saved history.
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!desktop) throw new Error('Open the desktop app to save captures. This is a visual preview.');
  return invoke<T>(command, args);
}
function Attachment({name,id,remove,openFile}:{name:string;id?:string;remove?:()=>void;openFile?:()=>void}) {
  const [image,setImage]=useState('');
  useEffect(()=>{let active=true;call<string>('preview',{id:id??null,name}).then(v=>{if(active)setImage(v)}).catch(()=>{});return()=>{active=false}},[name,id]);
  return <div className="attachment">{image?<img src={image} alt=""/>:<Icon name="file"/>}<button className="filename" onClick={openFile} disabled={!openFile} title={name}>{name.replace(/^[a-f0-9]{8}_/,'')}</button>{remove&&<button className="tiny" aria-label={`Remove ${name}`} onClick={remove}><Icon name="x"/></button>}</div>;
}
function App(){
  const [view,setView]=useState<View>((new URLSearchParams(location.search).get('view') as View)||'capture');
  const [draft,setDraft]=useState<Draft>(empty);
  const text=useRef('');
  const [menu,setMenu]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [saved,setSaved]=useState(false);
  const [history,setHistory]=useState<History>({captures:[],warnings:[]});
  const [query,setQuery]=useState('');const [selected,setSelected]=useState('');
  const [notice,setNotice]=useState('');const [deleted,setDeleted]=useState('');
  const [filter,setFilter]=useState<'all'|'text'|'file'>('all');
  const [appearance,setAppearance]=useState<Appearance>(readAppearance);
  async function changeAppearance(next:Appearance){saveAppearance(next);setAppearance(next);if(desktop){const {emit}=await import('@tauri-apps/api/event');await emit('study-appearance',next)}}
  const [alternate,setAlternate]=useState(false);
  const input=useRef<HTMLTextAreaElement>(null);
  const activeView=useRef<View>('capture');
  const screenRef=useRef(false);
  const caret=useRef<[number,number]>([0,0]);
  const scroll=useRef({list:0,detail:0});
  const listRef=useRef<HTMLDivElement>(null);
  const detailRef=useRef<HTMLDivElement>(null);
  function focusDraft(){requestAnimationFrame(()=>{const el=input.current;if(el){el.focus();el.setSelectionRange(...caret.current)}})}
  useEffect(()=>{if(!desktop)return;let stop:(()=>void)|undefined;let gone=false;listen('study-appearance',()=>setAppearance(readAppearance())).then(fn=>gone?fn():stop=fn);return()=>{gone=true;stop?.()}},[]);
  const shell=useRef<HTMLDivElement>(null);
  const fail=(e:unknown)=>setError(String(e).replace(/^Error: /,''));
  const accept=(d:Draft)=>{text.current=d.text;setDraft(d)};
  async function refresh(){const h=await call<History>('get_history');setHistory(h);setSelected(old=>h.captures.some(c=>c.id===old)?old:h.captures[0]?.id??'')}
  async function flush(){await enqueue(()=>call('update_text',{text:text.current}))}
  async function dismiss(restoreFocus=true){if(busyRef.current)return;if(input.current)caret.current=[input.current.selectionStart,input.current.selectionEnd];try{await flush();if(!restoreFocus&&(busyRef.current||await getCurrentWindow().isFocused()))return;await call('hide_window',{restoreFocus})}catch(e){fail(e)}}
  async function route(next:View){if(input.current)caret.current=[input.current.selectionStart,input.current.selectionEnd];activeView.current=next;setMenu(false);setView(next);if(!desktop)document.body.dataset.preview=next;if(desktop)await call('remember_view',{view:next});if(next==='history')try{await refresh()}catch(e){fail(e)};if(desktop)await getCurrentWindow().setResizable(next!=='capture');if(desktop)await getCurrentWindow().setSize(new LogicalSize(next==='capture'?420:next==='history'?860:660,next==='capture'?64:next==='history'?560:480));if(next==='capture')focusDraft()}
  async function action(job:()=>Promise<void>){if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{await job()}catch(e){fail(e)}finally{screenRef.current=false;busyRef.current=false;setBusy(false);requestAnimationFrame(()=>input.current?.focus())}}
  async function save(){if(!text.current.trim()&&!draft.attachments.length)return;await action(async()=>{await serial;await call('save_capture',{text:text.current});accept(empty());setSaved(true);await new Promise(r=>setTimeout(r,180));try{await call('hide_window',{restoreFocus:await getCurrentWindow().isFocused()})}finally{setSaved(false)}})}
  async function files(){setMenu(false);await action(async()=>{const paths=await open({multiple:true,directory:false});if(paths){await flush();accept(await enqueue(()=>call<Draft>('attach_files',{paths:Array.isArray(paths)?paths:[paths]})))}})}
  async function screenshot(){setMenu(false);await action(async()=>{await flush();accept(await call<Draft>('screenshot'))})}
  useEffect(()=>{
    if(!desktop){setNotice('Visual preview · saving and desktop controls require the app');return}
    const cleanups:Array<()=>void>=[];let disposed=false;
    function subscription(p:Promise<()=>void>){p.then(fn=>{if(disposed)fn();else cleanups.push(fn)}).catch(fail)}
    subscription(listen<View>('navigate',e=>{void route(e.payload);void enqueue(()=>call<Draft>('get_draft')).then(accept).catch(fail)}));
    subscription(getCurrentWindow().onFocusChanged(e=>{if(!e.payload&&!busyRef.current&&!screenRef.current)void dismiss(false)}));
    subscription(listen<View>('resume',()=>{if(activeView.current==='capture')focusDraft()}));
    subscription(listen('screenshot-started',()=>{screenRef.current=true;busyRef.current=true;setBusy(true)}));
    subscription(listen<string>('study-shortcut-error',e=>fail(e.payload)));
    subscription(listen('request-dismiss',()=>{void dismiss()}));
    subscription(listen('request-quit',()=>{if(busyRef.current){setError('Wait for the current operation to finish, then quit again.');return}void flush().then(()=>call('quit_app')).catch(fail)}));
    subscription(listen<{Ok?:Draft;Err?:string}>('screenshot-finished',e=>{screenRef.current=false;busyRef.current=false;setBusy(false);if(e.payload.Ok)accept(e.payload.Ok);if(e.payload.Err)fail(e.payload.Err)}));
    subscription(getCurrentWindow().onDragDropEvent(e=>{if(e.payload.type==='drop'){const paths=e.payload.paths;void action(async()=>{await flush();accept(await enqueue(()=>call<Draft>('attach_files',{paths})))})}}));
    enqueue(()=>call<Draft>('get_draft')).then(accept).catch(fail);
    call<{alternate:boolean;warning:string|null}>('get_preferences').then(p=>{setAlternate(p.alternate);if(p.warning)setError(p.warning+' Quit the Swift demo or select different modifiers in Settings.')}).catch(fail);
    // Listeners must exist before the initially hidden window is shown.
    Promise.resolve().then(()=>call('navigate',{view:'capture'})).catch(fail);
    return()=>{disposed=true;cleanups.forEach(fn=>fn())};
  },[]);
  useEffect(()=>{if(!desktop||view!=='capture'||!shell.current)return;const observer=new ResizeObserver(()=>{const node=shell.current;if(!node)return;void getCurrentWindow().setSize(new LogicalSize(420,Math.min(420,Math.ceil(node.getBoundingClientRect().height)))).catch(fail)});observer.observe(shell.current);return()=>observer.disconnect()},[view]);
  useEffect(()=>{const node=input.current;if(node){node.style.height='auto';node.style.height=Math.min(112,node.scrollHeight)+'px'}},[draft.text,view]);
  useLayoutEffect(()=>{if(view==='history'){if(listRef.current)listRef.current.scrollTop=scroll.current.list;if(detailRef.current)detailRef.current.scrollTop=scroll.current.detail}},[view]);
  const captures=history.captures.filter(c=>(filter==='all'||(filter==='file'?c.attachments.length>0:!c.attachments.length))&&(c.text+' '+c.attachments.join(' ')).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const current=captures.find(c=>c.id===selected)??captures[0];
  const date=(c:Capture)=>new Date((c.createdAt+978307200)*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  const title=(c:Capture)=>c.text.trim().split('\n')[0]||'Attachments';
  const stamp=(c:Capture)=>new Date((c.createdAt+978307200)*1000);
  const group=(c:Capture)=>stamp(c).toDateString()===new Date().toDateString()?'Today':stamp(c).toLocaleDateString(undefined,{dateStyle:'medium'});
  const drag=(e:React.MouseEvent)=>{if(e.button===0&&desktop&&!(e.target as HTMLElement).closest('button,input,select')){e.preventDefault();void getCurrentWindow().startDragging().catch(fail)}};
  const resize=()=>{if(desktop)void getCurrentWindow().startResizeDragging('SouthEast').catch(fail)};
  return <main className="app-window" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(menu)setMenu(false);else void dismiss()}}}>
    <div ref={shell} className={`window app-surface ${view==='capture'?'capture-surface':''}`}>
      {view==='capture'?<>
        <div className="composer">
          <div className="drag-dots" onMouseDown={drag} title="Drag capture"><Icon name="grip"/></div>
          <button className="icon capture-plus" aria-label="Add attachment or screenshot" aria-expanded={menu} disabled={busy} onClick={()=>setMenu(!menu)}><Icon name="plus"/></button>
          <textarea ref={input} className="capture-text" autoFocus placeholder="Capture a thought…" aria-label="Capture text" value={draft.text} disabled={busy} rows={1} onChange={e=>{const value=e.target.value;text.current=value;setDraft(d=>({...d,text:value}));enqueue(()=>call('update_text',{text:value})).catch(fail)}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void save()}}} onPaste={e=>{const file=Array.from(e.clipboardData.files).find(f=>f.type.startsWith('image/'));if(!file)return;e.preventDefault();void action(async()=>{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d')!.drawImage(bitmap,0,0);bitmap.close();const data=canvas.toDataURL('image/png').split(',')[1];await flush();accept(await enqueue(()=>call<Draft>('attach_image',{data})))})}}/>
          <button className="icon save-capture" aria-label={busy?'Processing':'Save capture'} disabled={busy||(!draft.text.trim()&&!draft.attachments.length)} onClick={()=>void save()}>{saved?<Icon name="check"/>:busy?<span className="spinner"/>:<Icon name="arrow"/>}</button>
        </div>
        {!!draft.attachments.length&&<div className="attachment-tray">{draft.attachments.map(name=><Attachment key={name} name={name} remove={()=>void action(async()=>accept(await enqueue(()=>call<Draft>('remove_attachment',{name}))))}/>)}</div>}
        {menu&&<nav className="menu composer-menu" aria-label="Capture actions"><button onClick={()=>void files()}><Icon name="attach"/>Attach file</button><button onClick={()=>void screenshot()}><Icon name="screen"/>Screenshot</button><hr/><button onClick={()=>void route('history')}><Icon name="history"/>History<kbd>⌃⌥H</kbd></button><button onClick={()=>void call('toggle_study_note').catch(fail)}><Icon name="note"/>Study note<kbd>⌘⇧N</kbd></button><button onClick={()=>void route('settings')}><Icon name="layout"/>Settings</button></nav>}
      </>:<>
        <header className="window-head" onMouseDown={drag}><span className="window-title">{view==='history'&&<Icon name="history"/>}{view==='history'?'History':'Settings'}</span><div className="head-actions"><button className="icon" aria-label={view==='history'?'New capture':'History'} onClick={()=>void route(view==='history'?'capture':'history')}><Icon name={view==='history'?'plus':'history'}/></button><button className="icon" aria-label="Hide window" onClick={()=>void dismiss()}><Icon name="x"/></button></div></header>
        {view==='history'?<div className="history-body"><aside className="history-sidebar"><label className="search-box"><Icon name="search"/><input type="search" aria-label="Search captures" placeholder="Search captures…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filters" role="group" aria-label="Filter captures">{(['all','text','file'] as const).map(f=><button key={f} className="filter" aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='file'?'Files':f==='all'?'All':'Text'}</button>)}</div><div className="capture-list" ref={listRef} onScroll={e=>{scroll.current.list=e.currentTarget.scrollTop}}>{!captures.length?<div className="empty">{query?'No captures found':'No captures yet'}{query&&<p>Try another search or clear the filters.</p>}</div>:captures.map((c,i)=><React.Fragment key={c.id}>{(!i||group(c)!==group(captures[i-1]))&&<div className="group-label">{group(c)}</div>}<button className="history-item" aria-current={current?.id===c.id} onClick={()=>setSelected(c.id)}><Icon name={c.attachments.length?'file':'note'}/><span className="item-text"><span className="item-title">{title(c)}</span><span className="item-preview">{c.text||c.attachments.join(', ')}</span><span className="item-meta"><span>{c.attachments.length?`${c.attachments.length} attachment${c.attachments.length>1?'s':''}`:'Text'}</span><span>{stamp(c).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</span></span></span></button></React.Fragment>)}</div></aside><article className="history-detail">{current?<><header className="detail-bar"><span>{date(current)}</span><span className="head-actions"><button className="icon" aria-label="Copy capture" onClick={()=>void navigator.clipboard.writeText(current.text).then(()=>setNotice('Copied')).catch(fail)}><Icon name="copy"/></button><button className="icon" aria-label="Delete capture" onClick={()=>void action(async()=>{await call('delete_capture',{id:current.id});setDeleted(current.id);setNotice('Capture deleted');await refresh()})}><Icon name="trash"/></button></span></header><div className="detail-content" ref={detailRef} onScroll={e=>{scroll.current.detail=e.currentTarget.scrollTop}}><h1>{title(current)}</h1><p>{current.text}</p><div className="history-attachments">{current.attachments.map(name=><Attachment key={current.id+name} id={current.id} name={name} openFile={()=>void call('open_files',{id:current.id,name}).catch(fail)}/>)}</div></div><footer className="detail-bottom"><span>{current.attachments.length?'Text & attachments':'Text capture'}</span><button className="text-action" onClick={()=>void navigator.clipboard.writeText(current.text).then(()=>setNotice('Copied')).catch(fail)}><Icon name="copy"/>Copy</button></footer></>:<div className="history-empty"><p>{query?'No matching capture':'Your captures will appear here.'}</p><button onClick={()=>void route('capture')}>New capture</button></div>}</article></div>:<>
        <div className="settings-body"><h2>Shortcuts</h2>{[['Quick capture','Space'],['Screenshot','S'],['History','H'],['Study note','N']].map(([label,key])=><div className="settings-row" key={key}><span>{label}</span><span className="shortcut">{(key==='N'||alternate?['⌘','⇧',key]:['⌃','⌥',key]).map((k,i)=><kbd key={i}>{k}</kbd>)}</span></div>)}<div className="settings-row"><span>Shortcut modifiers</span><select className="settings-select" aria-label="Shortcut modifiers" value={alternate?'alternate':'default'} onChange={e=>{const next=e.target.value==='alternate';void action(async()=>{await call('set_shortcuts',{alternate:next});setAlternate(next)})}}><option value="default">Control + Option</option><option value="alternate">Command + Shift</option></select></div>
        <h2>Study note</h2><div className="settings-row"><span>Formatting bar</span><button className="switch" role="switch" aria-label="Show formatting bar" aria-checked={appearance.toolbar} onClick={()=>void changeAppearance({...appearance,toolbar:!appearance.toolbar})}/></div><div className="settings-row"><span>Text size</span><select className="settings-select" aria-label="Text size" value={appearance.size} onChange={e=>void changeAppearance({...appearance,size:Number(e.target.value)})}>{[13,14,16].map(n=><option key={n} value={n}>{n} px</option>)}</select></div><div className="settings-row"><span>Paragraph spacing</span><span style={{color:'var(--secondary)',fontSize:11}}>None</span></div><div className="settings-row"><span>Study note</span><button className="action" onClick={()=>void call('toggle_study_note').catch(fail)}>Open note</button></div>
        <h2>Storage</h2><div className="settings-row"><span>Local collection</span><button className="action" onClick={()=>void call('open_files',{id:null,name:null}).catch(fail)}>Open folder</button></div><div className="settings-row import-row"><span>Original demo captures</span><button className="action" disabled={busy} onClick={()=>void action(async()=>{if(await confirm('Copy saved captures from the original demo? Existing IDs will be skipped.',{title:'Import captures'})){const count=await call<number>('import_swift');setNotice(`Imported ${count} captures.`)}})}>Import captures</button></div></div><footer className="settings-foot"><span>Betterpad</span><span>Tauri edition</span></footer></>}
        <div className="resize-grip" onMouseDown={resize} aria-hidden="true"><Icon name="resize"/></div>
      </>}
      {(error||notice||history.warnings.length>0)&&<p className="message" role={error?'alert':'status'}>{error||notice||`${history.warnings.length} captures could not be read. Original files are preserved.`}{!error&&deleted&&<button className="undo-action" onClick={()=>void action(async()=>{await call('restore_capture',{id:deleted});setSelected(deleted);setDeleted('');setNotice('Restored');await refresh()})}>Undo</button>}</p>}
    </div>
  </main>;
}
const studyWindow = desktop ? getCurrentWindow().label === 'study' : new URLSearchParams(location.search).get('window') === 'study';
if(studyWindow) document.body.classList.add('study-mode');
if(!desktop){document.body.classList.add('browser-preview');document.body.dataset.preview=studyWindow?'study':new URLSearchParams(location.search).get('view')||'capture';}
createRoot(document.getElementById('root')!).render(studyWindow ? <Suspense fallback={<div className="study-rich-loading">Loading note…</div>}><StudyNote/></Suspense> : <App/>);

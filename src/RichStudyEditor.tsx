import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import {Icon} from './Icons';
import { richTextExtensions, type RichNote } from './richTextConfig';
export type RichStudyHandle = {focus:()=>void;undo:()=>void;redo:()=>void};
type Props={toolbar?:boolean;size?:number;onWords?:(n:number)=>void;initial:RichNote|null;onChange:(note:RichNote)=>void;onError:(e:unknown)=>void};
export const RichStudyEditor=forwardRef<RichStudyHandle,Props>(function RichStudyEditor({initial,onChange,onError,toolbar=true,size=14,onWords},ref){
  const hydrated=useRef(false);
  const callbacks=useRef({onChange,onError});callbacks.current={onChange,onError};
  const scroll=useRef<HTMLDivElement>(null);
  const [available,setAvailable]=useState(false);
  const editor=useEditor({
    extensions:richTextExtensions(),editable:false,immediatelyRender:true,
    editorProps:{attributes:{class:'study-rich-document',role:'textbox','aria-label':'Study note rich text','aria-multiline':'true',spellcheck:'true'}},
    onUpdate:({editor})=>{
      if(!hydrated.current)return;
      onWords?.(editor.getText().trim().split(/\s+/).filter(Boolean).length);
      try{callbacks.current.onChange({document:editor.getJSON(),markdown:editor.getMarkdown()});}catch(e){callbacks.current.onError(e)}
    },
  });
  useEffect(()=>{
    if(!editor||!initial||hydrated.current)return;
    try{
      const content=initial.document??(initial.markdown.trim()?initial.markdown:{type:'doc',content:[{type:'paragraph'}]});
      editor.chain().setContent(content,{contentType:typeof content==='string'?'markdown':'json',emitUpdate:false,errorOnInvalidContent:true}).setMeta('addToHistory',false).run();
      onWords?.(editor.getText().trim().split(/\s+/).filter(Boolean).length);
      hydrated.current=true;editor.setEditable(true);setAvailable(true);
    }catch(e){callbacks.current.onError(e)}
  },[editor,initial]);
  useImperativeHandle(ref,()=>({undo(){editor?.chain().focus().undo().run()},redo(){editor?.chain().focus().redo().run()},focus(){if(editor&&hydrated.current){const top=scroll.current?.scrollTop??0;editor.commands.focus(undefined,{scrollIntoView:false});if(scroll.current)scroll.current.scrollTop=top;}}}),[editor]);
  const state=useEditorState({editor,selector:({editor})=>({bold:editor?.isActive('bold')??false,italic:editor?.isActive('italic')??false,underline:editor?.isActive('underline')??false,bullets:editor?.isActive('bulletList')??false,numbered:editor?.isActive('orderedList')??false,tasks:editor?.isActive('taskList')??false,heading:editor?.isActive('heading',{level:1})??false,undo:editor?.can().undo()??false,redo:editor?.can().redo()??false})});
  const run=(action:(e:Editor)=>void)=>{if(editor&&available)try{action(editor)}catch(e){callbacks.current.onError(e)}};
  const tools=[
    {label:'Bold',icon:'bold' as const,active:state?.bold,action:(e:Editor)=>e.chain().focus().toggleBold().run()},
    {label:'Italic',icon:'italic' as const,active:state?.italic,action:(e:Editor)=>e.chain().focus().toggleItalic().run()},
    {label:'Underline',icon:'underline' as const,active:state?.underline,action:(e:Editor)=>e.chain().focus().toggleUnderline().run()},
    {label:'Bullet list',icon:'list' as const,active:state?.bullets,action:(e:Editor)=>e.chain().focus().toggleBulletList().run()},
    {label:'Numbered list',icon:'number' as const,active:state?.numbered,action:(e:Editor)=>e.chain().focus().toggleOrderedList().run()},
    {label:'Indent',icon:'indent' as const,active:false,action:(e:Editor)=>{e.chain().focus().sinkListItem(e.isActive('taskItem')?'taskItem':'listItem').run()}},
  ];
  return <div className="study-rich-shell" style={{'--note-size':`${size}px`} as React.CSSProperties}>
    {toolbar&&<div className="note-tools study-rich-toolbar" role="toolbar" aria-label="Text formatting">
      <select className="text-style" aria-label="Paragraph style" disabled={!available} value={editor?.isActive('heading',{level:1})?'1':editor?.isActive('heading',{level:2})?'2':editor?.isActive('heading',{level:3})?'3':'p'} onChange={event=>run(e=>{const v=event.target.value;if(v==='p')e.chain().focus().setParagraph().run();else e.chain().focus().setHeading({level:Number(v) as 1|2|3}).run()})}><option value="p">Paragraph</option><option value="1">Title</option><option value="2">Heading</option><option value="3">Subheading</option></select><span className="divider"/>
      {tools.map((tool,i)=><span className="tool-slot" key={tool.label}>{i===3&&<span className="divider"/>}<button className="icon" type="button" title={tool.label} aria-label={tool.label} aria-pressed={!!tool.active} disabled={!available} onMouseDown={e=>e.preventDefault()} onClick={()=>run(tool.action)}><Icon name={tool.icon}/></button></span>)}
    </div>}
    <div ref={scroll} className="study-rich-scroll" onClick={e=>{if(e.target===e.currentTarget)run(e=>{e.commands.focus('end')})}}>
      {!available&&<p className="study-rich-loading">Loading note…</p>}
      <EditorContent editor={editor}/>
    </div>
  </div>;
});

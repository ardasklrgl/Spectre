import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body><div id="editor"></div></body></html>',{pretendToBeVisual:true,url:'https://betterpad.local/'});
for(const key of ['window','document','navigator','Node','Element','HTMLElement','HTMLParagraphElement','MutationObserver','DOMParser','getComputedStyle','KeyboardEvent','Event','InputEvent'])Object.defineProperty(globalThis,key,{configurable:true,value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key]});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
const base=new URL('../',import.meta.url),dir=new URL('node_modules/.cache/betterpad-tests/',base);await mkdir(dir,{recursive:true});
const source=await readFile(new URL('src/richTextConfig.ts',base),'utf8');
await writeFile(new URL('richTextConfig.mjs',dir),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {richTextExtensions}=await import(new URL('richTextConfig.mjs',dir));const {Editor}=await import('@tiptap/core');
const original='# Heading\n\nFirst paragraph with **bold**.\n\n- [x] Done\n- [ ] Todo\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```py\nx = 1\n```';
const editor=new Editor({element:document.querySelector('#editor'),extensions:richTextExtensions(),content:original,contentType:'markdown'});
assert.ok(editor.getHTML().includes('<h1>Heading</h1>'));assert.ok(editor.getHTML().includes('<strong>bold</strong>'));assert.ok(editor.getHTML().includes('<table'));assert.ok(editor.getHTML().includes('data-type="taskList"'));assert.ok(editor.getText().includes('x = 1'));
editor.commands.setTextSelection({from:1,to:8});editor.commands.toggleUnderline();
assert.ok(editor.getJSON().content[0].content[0].marks.some(m=>m.type==='underline'),'formatting applies to selected text');
const canonical=editor.getJSON();const restored=new Editor({extensions:richTextExtensions(),content:JSON.parse(JSON.stringify(canonical))});
assert.deepEqual(restored.getJSON(),canonical,'rich format survives canonical JSON roundtrip');
assert.ok(editor.getMarkdown().includes('First paragraph'),'Markdown export retains content');
// One continuous ProseMirror document supports selections across paragraphs.
const edit=new Editor({extensions:richTextExtensions(),content:'<p>one</p><p>two</p>'});edit.commands.setTextSelection({from:2,to:7});edit.commands.insertContent('joined');
assert.equal(edit.getText(),'ojoinedwo','cross-paragraph edit uses one document');
edit.commands.undo();assert.equal(edit.getText({blockSeparator:'\n'}),'one\ntwo');edit.commands.redo();assert.equal(edit.getText(),'ojoinedwo');
editor.commands.setContent('<p>Hello</p>');editor.commands.setTextSelection(6);editor.commands.splitBlock();editor.commands.insertContent('Next');assert.equal(editor.getText({blockSeparator:'\n'}),'Hello\nNext');
// Dispatch real keydown events through the editor keymap: Tab must never
// escape a paragraph, including when a list item cannot be indented.
const tabs=new Editor({element:document.body.appendChild(document.createElement('div')),extensions:richTextExtensions(),content:'<p>Hello</p>'});
function tab(shiftKey=false){const event=new KeyboardEvent('keydown',{key:'Tab',code:'Tab',keyCode:9,which:9,shiftKey,bubbles:true,cancelable:true});tabs.view.dom.dispatchEvent(event);assert.equal(event.defaultPrevented,true,'Tab stays within the note');}
tabs.commands.setTextSelection(6);tab();assert.equal(tabs.getText(),'Hello\t');tab(true);assert.equal(tabs.getText(),'Hello');
tabs.commands.setContent('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
let second=0;tabs.state.doc.descendants((node,pos)=>{if(node.isText&&node.text==='two')second=pos});tabs.commands.setTextSelection(second+1);tab();
assert.equal(tabs.getJSON().content[0].content.length,1,'Tab nests the second list item');tab(true);assert.equal(tabs.getJSON().content[0].content.length,2,'Shift-Tab outdents');
tabs.commands.setTextSelection(3);tab();assert.equal(tabs.getJSON().content[0].content.length,2,'first list item consumes Tab even when it cannot indent');
tabs.destroy();edit.destroy();editor.destroy();restored.destroy();dom.window.close();
console.log('PASS: Markdown import, tables/tasks/code, selection formatting, rich JSON roundtrip, cross-paragraph editing, undo/redo, Enter, Tab insertion, and list indentation');

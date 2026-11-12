import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import ts from 'typescript';
const base=new URL('../',import.meta.url);
const dir=new URL('node_modules/.cache/betterpad-tests/',base);await mkdir(dir,{recursive:true});
const source=await readFile(new URL('src/liveMarkdownModel.ts',base),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
await writeFile(new URL('liveMarkdownModel.mjs',dir),output);
const {sourceBlocks,replaceSource}=await import(new URL('liveMarkdownModel.mjs',dir));
for(const text of ['', '\n\n', '# Title\n\n**Bold**\n\n- [x] Done\n- [ ] Todo\n', '# Windows\r\n\r\nCafé İstanbul 🧠\r\n\r\n```py\r\nx=1\r\n```\r\n', '\tcode\n\n| A | B |\n|---|---|\n| 1 | 2 |\n', '[link][ref]\n\n[ref]: https://example.com\n']){
 const blocks=sourceBlocks(text);
 assert.equal(blocks.map(b=>text.slice(b.start,b.end)).join(''),text,'block partition preserves every source character');
 for(let i=1;i<blocks.length;i++)assert.equal(blocks[i-1].end,blocks[i].start,'no gaps or overlaps');
}
const original='# Title\r\n\r\nFirst paragraph\r\n\r\nSecond paragraph';
const block=sourceBlocks(original).find(b=>original.slice(b.start,b.end).startsWith('First'));
assert.ok(block);
const edit=replaceSource(original,block,'**Changed**');
assert.equal(edit.text,'# Title\r\n\r\n**Changed**\r\n\r\nSecond paragraph','editing one block leaves neighbouring content and line endings intact');
const deleted=replaceSource(edit.text,edit.range,'');assert.equal(deleted.text,'# Title\r\n\r\n\r\n\r\nSecond paragraph');
const pasted=replaceSource(original,{start:0,end:original.length},'# Replaced\n\n- one\n- two');assert.equal(pasted.text,'# Replaced\n\n- one\n- two');
assert.throws(()=>replaceSource(original,{start:-1,end:10},''));
console.log('PASS: live Markdown partitions, CRLF/Unicode preservation, isolated block edits, deletion, and whole-note replacement');

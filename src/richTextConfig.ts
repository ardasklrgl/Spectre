import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension, type JSONContent } from '@tiptap/react';
export type RichNote = { document: JSONContent | null; markdown: string };
// Handle Tab inside the document only; toolbar keyboard navigation stays normal.
const NoteIndentation = Extension.create({
  name: 'noteIndentation',
  priority: 1000,
  addKeyboardShortcuts() {
    const indent = (backwards: boolean) => {
      const editor = this.editor;
      // Let TableKit keep its standard next/previous-cell navigation.
      if (editor.isActive('table')) return false;
      const item = editor.isActive('taskItem') ? 'taskItem' : editor.isActive('listItem') ? 'listItem' : null;
      if (item) {
        if (backwards) editor.commands.liftListItem(item);
        else editor.commands.sinkListItem(item);
        return true; // Also consume Tab when the first item cannot nest.
      }
      if (!backwards) { editor.commands.insertContent('\t'); return true; }
      const { $from, empty } = editor.state.selection;
      if (empty) {
        const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\ufffc');
        const match = before.match(/(?:\t| {1,4})$/);
        if (match) editor.commands.deleteRange({ from: $from.pos - match[0].length, to: $from.pos });
      }
      return true;
    };
    return { Tab: () => indent(false), 'Shift-Tab': () => indent(true) };
  },
});
export function richTextExtensions() {
  return [
    StarterKit.configure({link:{openOnClick:false, autolink:true, protocols:['http','https','mailto']}}),
    TaskList, TaskItem.configure({nested:true}), TableKit.configure({table:{resizable:false}}),
    Markdown, NoteIndentation,
    Placeholder.configure({placeholder:'Start a note…'}),
  ];
}

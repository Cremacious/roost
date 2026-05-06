'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Heading from '@tiptap/extension-heading'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListTodo, Quote, Code2, Link2, Link2Off,
  Undo, Redo,
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
  content: string
  onChange?: (html: string) => void
  editable?: boolean
  hideToolbar?: boolean
  placeholder?: string
}

const TOOLBAR_BTN: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: 'none',
  background: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
}

export default function RichTextEditor({
  content,
  onChange,
  editable = true,
  hideToolbar = false,
  placeholder = 'Write whatever you want. Nobody is grading this.',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false, codeBlock: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Blockquote,
      CodeBlock,
      Link.configure({ openOnClick: !editable, autolink: true }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: false }),
    ],
    content,
    editable,
    autofocus: false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  // Sync external content when note changes (edit mode opening different note)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  if (!editor) return null

  function setLink() {
    const prev = editor!.getAttributes('link').href ?? ''
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="roost-editor-wrap">
      {!hideToolbar && (
        <div className="roost-editor-toolbar">
          {([
            { icon: Bold, cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
            { icon: Italic, cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
            { icon: Strikethrough, cmd: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), label: 'Strike' },
          ] as const).map(({ icon: Icon, cmd, active, label }) => (
            <button key={label} type="button" onClick={cmd} aria-label={label}
              style={{ ...TOOLBAR_BTN, backgroundColor: active ? 'var(--roost-border)' : 'transparent', color: active ? 'var(--roost-text-primary)' : 'var(--roost-text-secondary)' }}>
              <Icon size={14} />
            </button>
          ))}

          <div style={{ width: 1, height: 18, backgroundColor: 'var(--roost-border)', margin: '0 2px', flexShrink: 0 }} />

          {([
            { icon: Heading1, cmd: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), label: 'H1' },
            { icon: Heading2, cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'H2' },
            { icon: Heading3, cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'H3' },
          ] as const).map(({ icon: Icon, cmd, active, label }) => (
            <button key={label} type="button" onClick={cmd} aria-label={label}
              style={{ ...TOOLBAR_BTN, backgroundColor: active ? 'var(--roost-border)' : 'transparent', color: active ? 'var(--roost-text-primary)' : 'var(--roost-text-secondary)' }}>
              <Icon size={14} />
            </button>
          ))}

          <div style={{ width: 1, height: 18, backgroundColor: 'var(--roost-border)', margin: '0 2px', flexShrink: 0 }} />

          {([
            { icon: List, cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullets' },
            { icon: ListOrdered, cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered' },
            { icon: ListTodo, cmd: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList'), label: 'Tasks' },
            { icon: Quote, cmd: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), label: 'Quote' },
            { icon: Code2, cmd: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), label: 'Code' },
          ] as const).map(({ icon: Icon, cmd, active, label }) => (
            <button key={label} type="button" onClick={cmd} aria-label={label}
              style={{ ...TOOLBAR_BTN, backgroundColor: active ? 'var(--roost-border)' : 'transparent', color: active ? 'var(--roost-text-primary)' : 'var(--roost-text-secondary)' }}>
              <Icon size={14} />
            </button>
          ))}

          <div style={{ width: 1, height: 18, backgroundColor: 'var(--roost-border)', margin: '0 2px', flexShrink: 0 }} />

          <button type="button" onClick={setLink} aria-label="Link"
            style={{ ...TOOLBAR_BTN, backgroundColor: editor.isActive('link') ? 'var(--roost-border)' : 'transparent', color: editor.isActive('link') ? 'var(--roost-text-primary)' : 'var(--roost-text-secondary)' }}>
            <Link2 size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} aria-label="Remove link"
            disabled={!editor.isActive('link')}
            style={{ ...TOOLBAR_BTN, color: 'var(--roost-text-muted)', opacity: editor.isActive('link') ? 1 : 0.4 }}>
            <Link2Off size={14} />
          </button>

          <div style={{ flex: 1 }} />

          <button type="button" onClick={() => editor.chain().focus().undo().run()} aria-label="Undo"
            disabled={!editor.can().undo()}
            style={{ ...TOOLBAR_BTN, color: 'var(--roost-text-muted)', opacity: editor.can().undo() ? 1 : 0.4 }}>
            <Undo size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} aria-label="Redo"
            disabled={!editor.can().redo()}
            style={{ ...TOOLBAR_BTN, color: 'var(--roost-text-muted)', opacity: editor.can().redo() ? 1 : 0.4 }}>
            <Redo size={14} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="roost-editor-content" />
    </div>
  )
}

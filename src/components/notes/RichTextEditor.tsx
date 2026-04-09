"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlock from "@tiptap/extension-code-block";
import Blockquote from "@tiptap/extension-blockquote";
import {
  Bold,
  Code2,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

const COLOR = "#A855F7";

// ---- Types ------------------------------------------------------------------

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  hideToolbar?: boolean;
}

// ---- Toolbar button ---------------------------------------------------------

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focus
        onClick();
      }}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? COLOR : "transparent",
        color: active ? "#fff" : "var(--roost-text-secondary)",
        flexShrink: 0,
        fontWeight: 800,
        fontSize: 12,
        transition: "background 0.1s",
      }}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 18,
        backgroundColor: "var(--roost-border)",
        flexShrink: 0,
        alignSelf: "center",
        margin: "0 2px",
      }}
    />
  );
}

// ---- Component --------------------------------------------------------------

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
  hideToolbar = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        blockquote: false,
      }),
      CodeBlock.configure({
        HTMLAttributes: { class: "roost-code-block" },
      }),
      Blockquote.configure({
        HTMLAttributes: { class: "roost-blockquote" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "roost-link",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder:
          placeholder ?? "Write whatever you want. Nobody is grading this.",
      }),
    ],
    content: content || "",
    editable,
    autofocus: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const showToolbar = editable && !hideToolbar;

  function handleLink() {
    if (editor!.isActive("link")) {
      editor!.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("Enter URL");
      if (url) {
        editor!
          .chain()
          .focus()
          .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
          .run();
      }
    }
  }

  return (
    <div className="roost-editor">
      {/* Toolbar */}
      {showToolbar && (
        <div
          style={{
            backgroundColor: "var(--roost-surface)",
            border: "1.5px solid var(--roost-border)",
            borderBottom: "1px solid var(--roost-border)",
            borderRadius: "12px 12px 0 0",
            padding: "6px 10px",
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
          {/* Group 1: Text style */}
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={13} strokeWidth={3} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={13} strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={13} strokeWidth={2.5} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Group 2: Headings */}
          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="Heading 3"
          >
            H3
          </ToolbarButton>

          <ToolbarDivider />

          {/* Group 3: Lists */}
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List size={14} strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
          >
            <ListOrdered size={14} strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task list"
          >
            <ListChecks size={14} strokeWidth={2.5} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Group 4: Blocks */}
          <ToolbarButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={13} strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <Code2 size={13} strokeWidth={2.5} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Group 5: Link */}
          <ToolbarButton
            active={editor.isActive("link")}
            onClick={handleLink}
            title={editor.isActive("link") ? "Remove link" : "Add link"}
          >
            {editor.isActive("link") ? (
              <Link2Off size={13} strokeWidth={2.5} />
            ) : (
              <LinkIcon size={13} strokeWidth={2.5} />
            )}
          </ToolbarButton>

          <ToolbarDivider />

          {/* Group 6: History */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo2 size={13} strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo2 size={13} strokeWidth={2.5} />
          </ToolbarButton>
        </div>
      )}

      {/* Editor content area */}
      <EditorContent
        editor={editor}
        style={{
          borderRadius: showToolbar ? "0 0 12px 12px" : 12,
          border: showToolbar
            ? "1.5px solid var(--roost-border)"
            : "none",
          borderTop: showToolbar ? "none" : undefined,
          backgroundColor: showToolbar ? "var(--roost-surface)" : "transparent",
          padding: showToolbar ? undefined : 0,
        }}
      />
    </div>
  );
}

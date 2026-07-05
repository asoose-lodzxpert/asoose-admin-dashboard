'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'
import { cn } from '@/app/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  hasError?: boolean
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        disabled && 'pointer-events-none opacity-30'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-slate-200" />
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your email content here…',
  minHeight = 240,
  hasError,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-indigo-600 underline' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}px`,
      },
    },
    immediatelyRender: false,
  })

  // Sync external value resets (e.g. when "Clear" is clicked)
  useEffect(() => {
    if (!editor) return
    if (value === '' && editor.getText() !== '') {
      editor.commands.clearContent()
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Enter URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className={cn(
      'rounded-xl border bg-white overflow-hidden transition-colors',
      hasError ? 'border-red-300' : 'border-slate-200',
      'focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1.5">

        {/* Text style */}
        <select
          value={
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' : '0'
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === '0') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: Number(v) as 2 | 3 }).run()
          }}
          className="h-7 rounded-lg border-0 bg-white px-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-indigo-500 cursor-pointer"
        >
          <option value="0">Paragraph</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <Divider />

        {/* Bold */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h5.5a4.75 4.75 0 0 1 3.26 8.22 4.75 4.75 0 0 1-2.01 8.53l-.49.25H6.75A.75.75 0 0 1 6 20.25V4.75Zm1.5.75v5.75h4.75a3.25 3.25 0 1 0 0-6.5H7.5v.75Zm0 7.25v5.75h5a3.25 3.25 0 1 0 0-6.5H7.5v.75Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M10 4.75a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-2.5l-3.5 13h2.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5l3.5-13H10.75A.75.75 0 0 1 10 4.75Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M5.25 2.25a.75.75 0 0 1 .75.75v7.5a6 6 0 0 0 12 0V3a.75.75 0 0 1 1.5 0v7.5a7.5 7.5 0 0 1-15 0V3a.75.75 0 0 1 .75-.75ZM3 21.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Strike */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3 11.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75ZM8.5 6.25A4.25 4.25 0 0 1 12.75 2h.5a4.25 4.25 0 0 1 4.25 4.25v.25a.75.75 0 0 1-1.5 0v-.25A2.75 2.75 0 0 0 13.25 3.5h-.5A2.75 2.75 0 0 0 10 6.25v.25a.75.75 0 0 1-1.5 0v-.25Zm0 11.5v.25a.75.75 0 0 1-1.5 0v-.25A4.25 4.25 0 0 1 11.25 13.5a.75.75 0 0 1 0 1.5A2.75 2.75 0 0 0 8.5 17.75Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Bullet list */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm0 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm0 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 6a.75.75 0 0 0 0 1.5h12A.75.75 0 0 0 19.5 6h-12Zm0 6.75a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-12Zm0 6.75a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-12Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Ordered list */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3.308 5.828A1.5 1.5 0 0 1 4.5 5.25h.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V6.75H4.5a.75.75 0 0 1-.75-.75v-.25c0-.198.078-.384.22-.527l.338-.395Zm-.058 10.172a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H4.858l.904.903a.75.75 0 1 1-1.06 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 1 1 1.06 1.06l-.904.904a.75.75 0 0 1-.608-.167ZM7.5 6a.75.75 0 0 0 0 1.5h12A.75.75 0 0 0 19.5 6h-12Zm0 6.75a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-12Zm0 6.75a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-12Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Blockquote */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Link */}
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Insert link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Unlink */}
        {editor.isActive('link') && (
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-rose-500">
              <path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Zm-10.5 4.5a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V10.5a.75.75 0 0 1 1.5 0v8.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3H13.5a.75.75 0 0 1 0 1.5H5.25Z" clipRule="evenodd" />
            </svg>
          </ToolbarButton>
        )}

        <Divider />

        {/* Align left */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3 6a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6Zm0 6a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 6a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 18Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Align center */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3 6a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6Zm4.5 6a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 12Zm-4.5 6a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 18Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Align right */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M3 6a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6Zm8.25 6a.75.75 0 0 1 .75-.75h8.25a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75Zm0 6a.75.75 0 0 1 .75-.75h8.25a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        <Divider />

        {/* Undo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M9.53 2.47a.75.75 0 0 1 0 1.06L4.81 8.25H15a6.75 6.75 0 0 1 0 13.5h-3a.75.75 0 0 1 0-1.5h3a5.25 5.25 0 1 0 0-10.5H4.81l4.72 4.72a.75.75 0 1 1-1.06 1.06l-6-6a.75.75 0 0 1 0-1.06l6-6a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>

        {/* Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M14.47 2.47a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l4.72-4.72H9a5.25 5.25 0 1 0 0 10.5h3a.75.75 0 0 1 0 1.5H9a6.75 6.75 0 0 1 0-13.5h10.19l-4.72-4.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #0f172a; }
        .ProseMirror h3 { font-size: 1.05rem; font-weight: 600; margin: 0.875rem 0 0.375rem; color: #1e293b; }
        .ProseMirror p { margin-bottom: 0.75rem; color: #334155; line-height: 1.7; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.25rem; margin-bottom: 0.75rem; color: #334155; }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror blockquote { border-left: 3px solid #e2e8f0; padding-left: 1rem; color: #64748b; font-style: italic; margin: 0.75rem 0; }
        .ProseMirror a { color: #4f46e5; text-decoration: underline; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror u { text-decoration: underline; }
        .ProseMirror s { text-decoration: line-through; }
        .ProseMirror hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
        .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  )
}

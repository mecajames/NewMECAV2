import { useRef, useEffect, type ReactNode, type ClipboardEvent } from 'react';
import {
  Bold, Italic, Underline, Link as LinkIcon,
  List, ListOrdered, AlignLeft, AlignCenter, Image as ImageIcon,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onPaste?: (e: ClipboardEvent<HTMLDivElement>) => void;
  /** Adds lists + alignment buttons (longer-form content like emails). */
  extended?: boolean;
  /** When provided, shows an Insert Image button. The callback opens the
   *  caller's picker (upload / media library) and resolves to the image URL
   *  to insert at the caret, or null to cancel. */
  onInsertImage?: () => Promise<string | null>;
}

/**
 * Minimal rich-text editor: Bold / Italic / Underline / Insert-link — plus
 * optional lists, alignment, and image insertion (`extended` /
 * `onInsertImage`) for longer-form admin content like the birthday email.
 * Produces HTML that is sanitized on render (see sanitize.ts). Uses
 * document.execCommand — deprecated but universally supported and
 * dependency-free, which is plenty for short admin-authored content.
 */
export default function RichTextEditor({ value, onChange, placeholder, onPaste, extended, onInsertImage }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Caret position saved before an async picker (modal) steals focus, so the
  // image lands where the admin was typing, not at the start of the box.
  const savedRange = useRef<Range | null>(null);

  // Push the external value in only when it actually differs, so we never clobber
  // the caret position while the admin is typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const addLink = () => {
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    const safe = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    exec('createLink', safe);
  };

  const addImage = async () => {
    if (!onInsertImage) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    const url = await onInsertImage();
    if (!url) return;
    ref.current?.focus();
    if (savedRange.current) {
      const restore = window.getSelection();
      restore?.removeAllRanges();
      restore?.addRange(savedRange.current);
    }
    exec('insertImage', url);
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) => (
    <button
      type="button"
      title={title}
      // Keep the text selection while clicking the toolbar so execCommand applies to it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-2 rounded hover:bg-slate-600 text-gray-200"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-slate-600 rounded-lg bg-slate-700">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-600 px-2 py-1 bg-slate-800 rounded-t-lg">
        <Btn onClick={() => exec('bold')} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec('italic')} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec('underline')} title="Underline"><Underline className="h-4 w-4" /></Btn>
        <Btn onClick={addLink} title="Insert link"><LinkIcon className="h-4 w-4" /></Btn>
        {extended && (
          <>
            <span className="w-px h-5 bg-slate-600 mx-1" />
            <Btn onClick={() => exec('insertUnorderedList')} title="Bullet list"><List className="h-4 w-4" /></Btn>
            <Btn onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
            <Btn onClick={() => exec('justifyLeft')} title="Align left"><AlignLeft className="h-4 w-4" /></Btn>
            <Btn onClick={() => exec('justifyCenter')} title="Center"><AlignCenter className="h-4 w-4" /></Btn>
          </>
        )}
        {onInsertImage && (
          <>
            <span className="w-px h-5 bg-slate-600 mx-1" />
            <Btn onClick={() => { void addImage(); }} title="Insert image (upload or pick from Media Library)">
              <ImageIcon className="h-4 w-4" />
            </Btn>
          </>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        // Force LTR + left alignment so wrapped lines never drift to the right
        // (a contentEditable can otherwise inherit/resolve alignment oddly).
        dir="ltr"
        // Opt out of Grammarly / writing-assistant injection. On a contentEditable
        // those extensions insert their own markup, which reflowed our wrapped text
        // to the right and left a blue highlight band over what was typed. A plain
        // <textarea> isn't reflowed, which is why this only appeared with the rich
        // editor. (These are the standard opt-out attributes.)
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        onPaste={onPaste}
        data-placeholder={placeholder || 'Write your announcement…'}
        // resize-y + overflow-auto restores the drag-to-resize the old textarea had.
        className="min-h-[120px] max-h-[480px] resize-y overflow-auto px-3 py-2 text-white text-sm text-left break-words rounded-b-lg focus:outline-none [&_a]:text-orange-300 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
      />
    </div>
  );
}

import { useRef, useEffect, type ReactNode, type ClipboardEvent } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon } from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onPaste?: (e: ClipboardEvent<HTMLDivElement>) => void;
}

/**
 * Minimal rich-text editor: Bold / Italic / Underline / Insert-link, producing
 * HTML that is sanitized on render (see sanitize.ts). Uses document.execCommand —
 * deprecated but universally supported and dependency-free, which is plenty for a
 * short admin-authored announcement body.
 */
export default function RichTextEditor({ value, onChange, placeholder, onPaste }: Props) {
  const ref = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center gap-1 border-b border-slate-600 px-2 py-1 bg-slate-800 rounded-t-lg">
        <Btn onClick={() => exec('bold')} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec('italic')} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec('underline')} title="Underline"><Underline className="h-4 w-4" /></Btn>
        <Btn onClick={addLink} title="Insert link"><LinkIcon className="h-4 w-4" /></Btn>
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

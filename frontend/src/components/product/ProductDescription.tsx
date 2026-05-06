'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type ComponentType } from 'react';
import DOMPurify, { type Config } from 'dompurify';
import { Bold, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Pilcrow, Quote, RemoveFormatting, Underline } from 'lucide-react';

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface ProductDescriptionRendererProps {
  value?: string | null;
  emptyText?: string;
  className?: string;
  emptyClassName?: string;
}

const PRODUCT_DESCRIPTION_CONFIG: Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'title'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 'button'],
  FORBID_ATTR: ['style', 'srcset', 'onerror', 'onclick', 'onload'],
};

interface ProductDescriptionTool {
  label: string;
  icon: ComponentType<{ className?: string }>;
  command?: string;
  commandValue?: string;
  action?: 'link';
}

const PRODUCT_DESCRIPTION_TOOLS: ProductDescriptionTool[] = [
  { label: 'Bold', icon: Bold, command: 'bold' },
  { label: 'Italic', icon: Italic, command: 'italic' },
  { label: 'Underline', icon: Underline, command: 'underline' },
  { label: 'Heading', icon: Heading3, command: 'formatBlock', commandValue: 'h3' },
  { label: 'Paragraph', icon: Pilcrow, command: 'formatBlock', commandValue: 'p' },
  { label: 'Quote', icon: Quote, command: 'formatBlock', commandValue: 'blockquote' },
  { label: 'Bullets', icon: List, command: 'insertUnorderedList' },
  { label: 'Numbers', icon: ListOrdered, command: 'insertOrderedList' },
  { label: 'Link', icon: LinkIcon, action: 'link' },
  { label: 'Clear', icon: RemoveFormatting, command: 'removeFormat' },
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function containsHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function sanitizeProductDescription(value: string) {
  const html = containsHtml(value) ? value : plainTextToHtml(value);
  return DOMPurify.sanitize(html, PRODUCT_DESCRIPTION_CONFIG);
}

function isSafeUrl(value: string) {
  const trimmed = value.trim();
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed);
}

export function ProductDescriptionRenderer({
  value,
  emptyText = 'Aucune description disponible.',
  className = 'prose prose-gray max-w-none text-gray-700 leading-relaxed',
  emptyClassName = 'text-gray-400 italic',
}: ProductDescriptionRendererProps) {
  const [cleanHtml, setCleanHtml] = useState('');
  const hasValue = Boolean(value?.trim());

  useEffect(() => {
    setCleanHtml(sanitizeProductDescription(value || ''));
  }, [value]);

  if (!hasValue) {
    return <p className={emptyClassName}>{emptyText}</p>;
  }

  if (!cleanHtml) return <div className={className} />;

  return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

export function ProductDescriptionEditor({ value, onChange, placeholder = 'Write a rich product description...' }: ProductDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef('');

  useEffect(() => {
    if (!editorRef.current || value === lastValueRef.current) return;
    const cleanHtml = sanitizeProductDescription(value);
    editorRef.current.innerHTML = cleanHtml;
    lastValueRef.current = value;
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) return;
    const cleanHtml = sanitizeProductDescription(editorRef.current.innerHTML);
    lastValueRef.current = cleanHtml;
    onChange(cleanHtml);
  };

  const applyCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const applyLink = () => {
    const url = window.prompt('Product link URL');
    if (!url || !isSafeUrl(url)) return;
    applyCommand('createLink', url);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const cleanHtml = sanitizeProductDescription(html || text);
    document.execCommand('insertHTML', false, cleanHtml);
    emitChange();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-300 bg-white focus-within:border-[#16C784] focus-within:ring-4 focus-within:ring-[#16C784]/15">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
        {PRODUCT_DESCRIPTION_TOOLS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if ('action' in item && item.action === 'link') {
                  applyLink();
                  return;
                }
                if (item.command) applyCommand(item.command, item.commandValue);
              }}
              title={item.label}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-white hover:text-[#16C784]"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Product description"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={() => {
          if (!editorRef.current) return;
          const cleanHtml = sanitizeProductDescription(editorRef.current.innerHTML);
          editorRef.current.innerHTML = cleanHtml;
          lastValueRef.current = cleanHtml;
          onChange(cleanHtml);
        }}
        onPaste={handlePaste}
        className="min-h-[180px] px-4 py-3 text-sm text-gray-900 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

// src/components/NotepadEditor.tsx
import React, { useRef, useEffect, useState } from "react";
import { Mic, Download, Copy, Check, FileText, Image, Link as LinkIcon, Eye, Edit3, X, ExternalLink, Sparkles } from "lucide-react";
import type { VoiceFile } from "../hooks/useFileManager";

interface NotepadEditorProps {
  file: VoiceFile | null;
  interimTranscript: string;
  isRecording: boolean;
  onContentChange: (id: string, content: string) => void;
  onCopy: () => void;
  copied: boolean;
  onDownload: (id: string) => void;
}

const NotepadEditor: React.FC<NotepadEditorProps> = ({
  file,
  interimTranscript,
  isRecording,
  onContentChange,
  onCopy,
  copied,
  onDownload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  // Auto-scroll to bottom when content changes during recording (in edit mode)
  useEffect(() => {
    if (isRecording && textareaRef.current && mode === "edit") {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [file?.content, interimTranscript, isRecording, mode]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white/50">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
          <FileText className="w-10 h-10 text-blue-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-500 mb-2">No Note Selected</h3>
        <p className="text-sm text-slate-400 max-w-xs">Create a new note from the sidebar to start capturing your voice.</p>
      </div>
    );
  }

  // Insert custom markdown string at current cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: append to end
      onContentChange(file.id, file.content ? file.content + "\n" + textToInsert : textToInsert);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos, textarea.value.length);

    const newContent = textBefore + textToInsert + textAfter;
    onContentChange(file.id, newContent);

    // Reposition cursor after the inserted text (need to defer to after React state update)
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = startPos + textToInsert.length;
    }, 50);
  };

  // Handle image upload from file picker
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "");
      insertAtCursor(`\n![${cleanName}](${base64Url})\n`);
      // Reset input value so same file can be uploaded again
      e.target.value = "";
    };
    reader.readAsDataURL(selectedFile);
  };

  // Intercept pasting of files/screenshots inside the textarea
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const pastedFile = item.getAsFile();
        if (!pastedFile) continue;

        e.preventDefault(); // Stop default pasting behavior

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Url = event.target?.result as string;
          insertAtCursor(`\n![Pasted Screenshot](${base64Url})\n`);
        };
        reader.readAsDataURL(pastedFile);
        break;
      }
    }
  };

  // Handle link modal submit
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    const title = linkTitle.trim() || linkUrl.trim();
    insertAtCursor(` [${title}](${linkUrl.trim()}) `);
    
    // Reset state
    setLinkUrl("");
    setLinkTitle("");
    setShowLinkModal(false);
  };

  // Inline Markdown parser and renderer
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex to match images `!\[(.*?)\]\((.*?)\)` and links `\[(.*?)\]\((.*?)\)`
    const regex = /(!?\[.*?\]\(.*?\))/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      // Image Check
      if (part.startsWith("![")) {
        const match = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, alt, src] = match;
          return (
            <span key={i} className="block my-4 max-w-full text-center">
              <span className="inline-block overflow-hidden rounded-2xl border border-slate-200 shadow-md bg-slate-50 max-w-full md:max-w-2xl">
                <img
                  src={src}
                  alt={alt || "Note Attachment"}
                  className="max-h-[350px] object-contain w-full cursor-zoom-in hover:opacity-95 transition-opacity"
                  onClick={() => {
                    const newWindow = window.open();
                    if (newWindow) {
                      newWindow.document.write(`<img src="${src}" style="max-width:100%; height:auto; display:block; margin:auto;" />`);
                    }
                  }}
                />
                {alt && alt !== "Pasted Screenshot" && (
                  <span className="block text-xs text-slate-400 px-4 py-2 border-t border-slate-100 bg-white truncate font-medium">
                    {alt}
                  </span>
                )}
              </span>
            </span>
          );
        }
      }

      // Link Check
      if (part.startsWith("[")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, label, url] = match;
          const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 hover:border-blue-300 text-blue-600 rounded-lg font-semibold transition-all text-xs mx-1 align-middle duration-200 cursor-pointer shadow-sm hover:shadow"
            >
              <span>{label}</span>
              <ExternalLink className="w-3 h-3 shrink-0 stroke-[2.5]" />
            </a>
          );
        }
      }

      return part;
    });
  };

  // Main Markdown blocks renderer
  const renderMarkdown = (content: string) => {
    if (!content.trim()) {
      return (
        <div className="p-8 text-center text-slate-300 italic flex flex-col items-center justify-center h-full">
          <Sparkles className="w-8 h-8 text-slate-200 mb-2" />
          <p>No content in this note yet. Start speaking or typing!</p>
        </div>
      );
    }

    const blocks = content.split(/\n\s*\n/);

    return (
      <div className="space-y-5 p-6 md:p-8 overflow-y-auto h-full text-slate-800 text-[15px] leading-relaxed selection:bg-blue-100">
        {blocks.map((block, index) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Headers
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={index} className="text-2xl font-bold text-slate-800 border-b border-slate-100 pb-2 mt-4">
                {parseInline(trimmed.substring(2))}
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={index} className="text-xl font-bold text-slate-700 mt-4">
                {parseInline(trimmed.substring(3))}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={index} className="text-lg font-bold text-slate-700 mt-3">
                {parseInline(trimmed.substring(4))}
              </h3>
            );
          }

          // Lists
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const items = trimmed.split(/\n[-*]\s+/);
            return (
              <ul key={index} className="list-disc list-inside pl-4 space-y-1.5 my-2">
                {items.map((item, i) => (
                  <li key={i} className="text-slate-700">
                    {parseInline(item.replace(/^[-*]\s+/, ""))}
                  </li>
                ))}
              </ul>
            );
          }

          // Paragraph
          return (
            <p key={index} className="text-slate-600 font-normal leading-loose whitespace-pre-line">
              {parseInline(block)}
            </p>
          );
        })}

        {/* Real-time transcript inside Preview Canvas */}
        {interimTranscript && (
          <p className="text-blue-500 font-medium italic animate-pulse flex items-center gap-2 mt-4 bg-blue-50/50 border border-blue-100/50 py-2 px-3 rounded-xl max-w-max">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>{interimTranscript}</span>
          </p>
        )}
      </div>
    );
  };

  const wordCount = file.content.trim() ? file.content.trim().split(/\s+/).length : 0;
  const charCount = file.content.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white/50 relative">
      
      {/* Hidden file input for uploading images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-5 md:px-6 py-2.5 border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-700 truncate">{file.name}</h2>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-full border border-red-200 animate-fade-in shrink-0">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented Controller (Edit / Preview) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                mode === "edit"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                mode === "preview"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          <div className="flex items-center border-l border-slate-200 pl-2">
            <button
              onClick={onCopy}
              disabled={!file.content}
              className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-25"
              title="Copy all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDownload(file.id)}
              disabled={!file.content}
              className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-25"
              title="Download as .txt"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Write-Mode Utility Toolbar */}
      {mode === "edit" && (
        <div className="flex flex-wrap items-center justify-between px-5 md:px-8 py-1.5 bg-slate-50 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-slate-200 bg-white transition-all shadow-sm"
              title="Upload image"
            >
              <Image className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-slate-200 bg-white transition-all shadow-sm"
              title="Add hyperlink"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
            <span className="px-1 py-0.5 bg-slate-200/60 rounded text-slate-500 font-mono">Ctrl+V</span>
            <span>Paste screenshots directly in the note</span>
          </span>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden">
        {mode === "edit" ? (
          <>
            <textarea
              ref={textareaRef}
              value={file.content + (interimTranscript ? (file.content ? " " : "") + interimTranscript : "")}
              onPaste={handlePaste}
              onChange={(e) => {
                const newVal = e.target.value;
                if (interimTranscript) {
                  const interimStart = newVal.lastIndexOf(interimTranscript);
                  if (interimStart >= 0) {
                    onContentChange(file.id, newVal.substring(0, interimStart).trimEnd());
                  } else {
                    onContentChange(file.id, newVal);
                  }
                } else {
                  onContentChange(file.id, newVal);
                }
              }}
              placeholder="Start speaking or type here... Markdown is supported (# headers, - lists, images, and links)"
              className="w-full h-full resize-none bg-transparent text-slate-800 text-[15px] leading-[2] p-5 md:p-8 outline-none placeholder:text-slate-300 font-normal tracking-[0.01em] selection:bg-blue-100"
              spellCheck={false}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            
            {/* Real-time Listening Indicator bubble */}
            {interimTranscript && (
              <div className="absolute bottom-4 left-5 md:left-8 pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200 shadow-sm">
                  <Mic className="w-3 h-3 text-blue-500 animate-pulse" />
                  <span className="text-[10px] text-blue-600 font-semibold tracking-wide">Listening...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          renderMarkdown(file.content)
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-5 md:px-6 py-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium tracking-wide bg-white/60 shrink-0">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span className="hidden sm:inline uppercase text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono tracking-wider">
            {mode === "edit" ? "Write Mode" : "Preview Mode"}
          </span>
        </div>
        <span>
          {new Date(file.updatedAt).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {/* Add Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm transition-opacity"
            onClick={() => setShowLinkModal(false)}
          />
          
          {/* Modal Container */}
          <div className="relative bg-white/95 rounded-2xl border border-slate-200/80 shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600">
                <LinkIcon className="w-4 h-4" />
                <h3 className="font-bold text-slate-800 text-sm">Add Hyperlink</h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  URL Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Display Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Link Title"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:scale-[1.02] shadow-md shadow-blue-200 hover:shadow-blue-300 rounded-xl transition-all"
                >
                  Insert Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotepadEditor;

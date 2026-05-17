// src/components/NotepadEditor.tsx
import React, { useRef, useEffect, useState } from "react";
import { Mic, Download, Copy, Check, FileText, Image, Link as LinkIcon, Eye, Edit3, X, ExternalLink, Sparkles, BookOpen } from "lucide-react";
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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#FAF8F5]">
        <div className="w-24 h-24 rounded-3xl bg-[#F3ECE0] flex items-center justify-center mb-6 border border-[#C5A059]/25 shadow-sm">
          <BookOpen className="w-10 h-10 text-[#C5A059]" />
        </div>
        <h3 className="text-xl font-bold text-[#111111] mb-2 font-serif editorial-serif">No Note Selected</h3>
        <p className="text-sm text-[#C5A880] max-w-xs font-medium">Create a new note from the sidebar or click + to start capture.</p>
      </div>
    );
  }

  // Insert custom markdown string at current cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onContentChange(file.id, file.content ? file.content + "\n" + textToInsert : textToInsert);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos, textarea.value.length);

    const newContent = textBefore + textToInsert + textAfter;
    onContentChange(file.id, newContent);

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

        e.preventDefault();

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
    
    setLinkUrl("");
    setLinkTitle("");
    setShowLinkModal(false);
  };

  // Inline Markdown parser and renderer
  const parseInline = (text: string): React.ReactNode[] => {
    const regex = /(!?\[.*?\]\(.*?\))/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      // Image Check (Luxury styled frame border)
      if (part.startsWith("![")) {
        const match = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, alt, src] = match;
          return (
            <span key={i} className="block my-6 max-w-full text-center">
              <span className="inline-block overflow-hidden rounded-2xl border-2 border-[#C5A059]/30 shadow-lg bg-white p-2.5 max-w-full md:max-w-2xl hover:scale-[1.005] transition-transform duration-300">
                <img
                  src={src}
                  alt={alt || "Note Attachment"}
                  className="max-h-[380px] object-contain w-full cursor-zoom-in rounded-xl hover:opacity-95 transition-opacity"
                  onClick={() => {
                    const newWindow = window.open();
                    if (newWindow) {
                      newWindow.document.write(`<body style="background:#FAF8F5; margin:0; display:flex; justify-content:center; align-items:center; height:100vh;"><img src="${src}" style="max-width:95%; max-height:95%; border:3px solid #C5A059; border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,0.15);" /></body>`);
                    }
                  }}
                />
                {alt && alt !== "Pasted Screenshot" && (
                  <span className="block text-[11px] uppercase tracking-wider font-bold text-[#C5A059] px-4 py-2 border-t border-[#C5A059]/10 bg-[#FAF8F5] truncate mt-2 rounded-b-xl">
                    {alt}
                  </span>
                )}
              </span>
            </span>
          );
        }
      }

      // Link Check (Luxury Royal Blue & Gold badge)
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#0A2540] hover:bg-[#C5A059] text-white hover:text-[#111111] border border-[#C5A059]/30 rounded-full font-bold transition-all duration-300 text-[11px] uppercase tracking-wider mx-1 align-middle cursor-pointer shadow-md shadow-[#0A2540]/10"
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
        <div className="p-12 text-center text-[#C5A880] italic flex flex-col items-center justify-center h-full bg-[#FCFAF6]">
          <Sparkles className="w-8 h-8 text-[#C5A059] mb-3 animate-pulse" />
          <p className="font-serif editorial-serif text-lg text-[#111111]/70">No content in this note yet.</p>
          <p className="text-xs uppercase tracking-widest mt-1 text-slate-400">Start writing or speak system-wide</p>
        </div>
      );
    }

    const blocks = content.split(/\n\s*\n/);

    return (
      <div className="space-y-6 p-6 md:p-10 overflow-y-auto h-full text-slate-800 text-[15px] leading-relaxed selection:bg-[#E8F0FE] bg-[#FCFAF6] font-serif editorial-serif">
        {blocks.map((block, index) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Headers
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={index} className="text-3xl font-bold text-[#111111] border-b-2 border-[#C5A059]/25 pb-3 mt-6 mb-4 editorial-serif font-serif">
                {parseInline(trimmed.substring(2))}
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={index} className="text-2xl font-bold text-[#111111] mt-5 mb-3 border-b border-[#C5A059]/10 pb-2 editorial-serif font-serif">
                {parseInline(trimmed.substring(3))}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={index} className="text-xl font-bold text-[#111111]/80 mt-4 mb-2 editorial-serif font-serif">
                {parseInline(trimmed.substring(4))}
              </h3>
            );
          }

          // Lists
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const items = trimmed.split(/\n[-*]\s+/);
            return (
              <ul key={index} className="list-disc list-inside pl-4 space-y-2.5 my-3 font-sans editorial-sans text-[#111111]/90">
                {items.map((item, i) => (
                  <li key={i} className="text-[#1E1E1E]">
                    {parseInline(item.replace(/^[-*]\s+/, ""))}
                  </li>
                ))}
              </ul>
            );
          }

          // Paragraph
          return (
            <p key={index} className="text-[#1E1E1E]/95 font-serif font-normal leading-loose whitespace-pre-line text-base mb-4">
              {parseInline(block)}
            </p>
          );
        })}

        {/* Real-time transcript inside Preview Canvas */}
        {interimTranscript && (
          <p className="text-[#0A2540] font-medium italic animate-pulse flex items-center gap-2 mt-6 bg-[#FAF6EE] border border-[#C5A059]/30 py-2.5 px-4 rounded-xl max-w-max shadow-sm">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C5A059]"></span>
            </span>
            <span className="font-sans editorial-sans text-xs tracking-wider uppercase font-bold text-[#C5A059] mr-1">Listening:</span>
            <span>{interimTranscript}</span>
          </p>
        )}
      </div>
    );
  };

  const wordCount = file.content.trim() ? file.content.trim().split(/\s+/).length : 0;
  const charCount = file.content.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FCFAF6] relative h-full">
      
      {/* Hidden file input for uploading images */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Editor Header Toolbar (Developer's Black) */}
      <div className="flex items-center justify-between px-5 md:px-7 py-3 bg-[#111111] border-b border-[#C5A059]/30 z-10 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#C5A059] shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#FAF8F5] truncate editorial-sans">
              {file.name}
            </h2>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-500/40 rounded-full animate-fade-in shrink-0">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Live Capture</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Segmented Controller (Write / Preview) */}
          <div className="flex items-center bg-[#1E1E1E] p-0.5 rounded-xl border border-[#C5A059]/20 shadow-inner">
            <button
              onClick={() => setMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                mode === "edit"
                  ? "bg-[#0A2540] text-[#C5A059] border border-[#C5A059]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">Write</span>
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                mode === "preview"
                  ? "bg-[#0A2540] text-[#C5A059] border border-[#C5A059]/30 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          <div className="flex items-center border-l border-slate-800 pl-3 gap-0.5">
            <button
              onClick={onCopy}
              disabled={!file.content}
              className="p-2 hover:bg-slate-800 rounded-xl text-[#C5A059] hover:text-white transition-all disabled:opacity-25"
              title="Copy note content"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDownload(file.id)}
              disabled={!file.content}
              className="p-2 hover:bg-slate-800 rounded-xl text-[#C5A059] hover:text-white transition-all disabled:opacity-25"
              title="Download text file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Write-Mode Utility Toolbar (Warm Rich Cream) */}
      {mode === "edit" && (
        <div className="flex flex-wrap items-center justify-between px-5 md:px-8 py-2 bg-[#F3ECE0]/50 border-b border-[#C5A059]/15 gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-[#0A2540] hover:text-white bg-white hover:bg-[#0A2540] rounded-xl border border-[#C5A059]/30 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
              title="Upload image"
            >
              <Image className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Image</span>
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-[#0A2540] hover:text-white bg-white hover:bg-[#0A2540] rounded-xl border border-[#C5A059]/30 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
              title="Add hyperlink"
            >
              <LinkIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Link</span>
            </button>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-[#C5A880] font-bold hidden sm:inline-flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 bg-[#FAF6EE] border border-[#C5A059]/25 rounded text-[#111111]/70 font-mono text-[8px]">
              Ctrl+V
            </span>
            <span>Paste screenshots directly inside editor</span>
          </span>
        </div>
      )}

      {/* Editor Body (Warm Rich Cream backdrop) */}
      <div className="flex-1 relative overflow-hidden bg-[#FCFAF6] h-full">
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
              placeholder="Record with the mic, or begin writing here... Markdown syntax is supported (use # for headers, - for lists, or insert links & images)."
              className="w-full h-full resize-none bg-transparent text-[#111111] text-[16px] leading-[2.1] p-6 md:p-10 outline-none placeholder-[#C5A880]/60 font-serif editorial-serif tracking-[0.01em] selection:bg-[#E8F0FE] select-text"
              spellCheck={false}
            />
            
            {/* Real-time Listening Indicator bubble */}
            {interimTranscript && (
              <div className="absolute bottom-4 left-5 md:left-10 pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EE] rounded-full border border-[#C5A059] shadow-sm animate-pulse">
                  <Mic className="w-3 h-3 text-[#0A2540] animate-pulse" />
                  <span className="text-[9px] text-[#0A2540] uppercase tracking-wider font-bold">Mic Listening...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          renderMarkdown(file.content)
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-5 md:px-7 py-2.5 border-t border-[#C5A059]/15 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-[#FAF8F5] shrink-0">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span className="hidden sm:inline text-[8px] px-2 py-0.5 bg-[#FAF6EE] border border-[#C5A059]/20 rounded text-[#C5A059]">
            {mode === "edit" ? "Write Mode" : "Preview Mode"}
          </span>
        </div>
        <span>
          {new Date(file.updatedAt).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {/* Add Link Modal (Developer's Black Card with Gold Accent) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#111111]/30 backdrop-blur-md transition-opacity"
            onClick={() => setShowLinkModal(false)}
          />
          
          <div className="relative bg-[#111111] rounded-2xl border border-[#C5A059] shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100 flex flex-col gap-4 animate-luxury-fade">
            <div className="flex items-center justify-between pb-3 border-b border-[#C5A059]/20">
              <div className="flex items-center gap-2 text-[#C5A059]">
                <LinkIcon className="w-4 h-4" />
                <h3 className="font-bold uppercase tracking-wider text-xs font-sans editorial-sans">Add Hyperlink</h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 hover:bg-[#1E1E1E] rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-[#C5A880]">
                  URL Link Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#C5A059]/30 rounded-xl text-xs outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-[#111111] font-semibold"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-widest font-bold text-[#C5A880]">
                  Display Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Link Title"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#FAF8F5] border border-[#C5A059]/30 rounded-xl text-xs outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all text-[#111111] font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2.5 text-[9px] uppercase tracking-wider font-bold text-slate-400 hover:text-white bg-[#1E1E1E] hover:bg-[#2A2A2A] rounded-xl border border-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-[9px] uppercase tracking-wider font-bold text-white hover:text-[#111111] bg-[#0A2540] hover:bg-[#C5A059] rounded-xl border border-[#C5A059]/30 transition-all shadow-md hover:scale-[1.02] cursor-pointer"
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

// src/components/NotepadEditor.tsx
import React, { useRef, useEffect } from "react";
import { Mic, Download, Copy, Check, FileText } from "lucide-react";
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
  file, interimTranscript, isRecording,
  onContentChange, onCopy, copied, onDownload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when content changes during recording
  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [file?.content, interimTranscript, isRecording]);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-900/10 to-rose-950/10 flex items-center justify-center mb-6 border border-rose-900/10">
          <FileText className="w-12 h-12 text-rose-900/20" />
        </div>
        <h3 className="text-lg font-medium text-rose-100/40 mb-2">No Note Selected</h3>
        <p className="text-sm text-rose-200/20 max-w-xs">Create a new note from the sidebar to start capturing your voice.</p>
      </div>
    );
  }

  const wordCount = file.content.trim() ? file.content.trim().split(/\s+/).length : 0;
  const charCount = file.content.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-rose-500/10 glass">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-rose-400/40 shrink-0" />
            <h2 className="text-sm font-medium text-rose-100/70 truncate">{file.name}</h2>
          </div>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-900/30 rounded-full border border-rose-500/20 animate-fade-in shrink-0">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-medium text-rose-300 uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onCopy} disabled={!file.content} className="p-2 hover:bg-white/5 rounded-lg text-rose-200/30 hover:text-rose-300 transition-all disabled:opacity-20" title="Copy all">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={() => onDownload(file.id)} disabled={!file.content} className="p-2 hover:bg-white/5 rounded-lg text-rose-200/30 hover:text-rose-300 transition-all disabled:opacity-20" title="Download as .txt">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={file.content + (interimTranscript ? (file.content ? " " : "") + interimTranscript : "")}
          onChange={(e) => {
            // Only update content (exclude interim text from the saved content)
            const newVal = e.target.value;
            if (interimTranscript) {
              // Strip the interim part before saving
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
          placeholder="Start speaking or type here..."
          className="w-full h-full resize-none bg-transparent text-rose-50/90 text-base leading-[1.9] p-6 md:p-8 outline-none placeholder:text-rose-200/15 font-light tracking-wide selection:bg-rose-500/30"
          spellCheck={false}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        {/* Interim text highlight overlay - subtle visual cue */}
        {interimTranscript && (
          <div className="absolute bottom-4 left-6 md:left-8 right-6 md:right-8 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 rounded-lg border border-rose-500/10">
              <Mic className="w-3 h-3 text-rose-400/50 animate-pulse" />
              <span className="text-[10px] text-rose-300/40 font-medium">Listening...</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-rose-500/10 text-[10px] text-rose-200/20 font-medium tracking-wide">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
        <span>
          {new Date(file.updatedAt).toLocaleTimeString("en-US", {
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
};

export default NotepadEditor;

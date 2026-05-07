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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white/50">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100">
          <FileText className="w-10 h-10 text-blue-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-500 mb-2">No Note Selected</h3>
        <p className="text-sm text-slate-400 max-w-xs">Create a new note from the sidebar to start capturing your voice.</p>
      </div>
    );
  }

  const wordCount = file.content.trim() ? file.content.trim().split(/\s+/).length : 0;
  const charCount = file.content.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white/50">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-5 md:px-6 py-2.5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
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
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onCopy} disabled={!file.content} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-25 disabled:hover:bg-transparent" title="Copy all">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={() => onDownload(file.id)} disabled={!file.content} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all disabled:opacity-25 disabled:hover:bg-transparent" title="Download as .txt">
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
          placeholder="Start speaking or type here..."
          className="w-full h-full resize-none bg-transparent text-slate-800 text-[15px] leading-[2] p-5 md:p-8 outline-none placeholder:text-slate-300 font-normal tracking-[0.01em] selection:bg-blue-100"
          spellCheck={false}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        {/* Listening indicator */}
        {interimTranscript && (
          <div className="absolute bottom-4 left-5 md:left-8 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200 shadow-sm">
              <Mic className="w-3 h-3 text-blue-500 animate-pulse" />
              <span className="text-[10px] text-blue-600 font-semibold tracking-wide">Listening...</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-5 md:px-6 py-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium tracking-wide bg-white/60">
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

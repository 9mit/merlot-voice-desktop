// src/components/FileSidebar.tsx
import React, { useState } from "react";
import { Plus, FileText, Trash2, Download, Pencil, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { VoiceFile } from "../hooks/useFileManager";

interface FileSidebarProps {
  files: VoiceFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onCreateFile: () => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, name: string) => void;
  onDownloadFile: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const FileSidebar: React.FC<FileSidebarProps> = ({
  files, activeFileId, onSelectFile, onCreateFile,
  onDeleteFile, onRenameFile, onDownloadFile, collapsed, onToggleCollapse,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startRename = (file: VoiceFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameFile(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const wordCount = (content: string) => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 px-1.5 gap-3 glass border-r border-rose-500/10 w-14 shrink-0">
        <button onClick={onToggleCollapse} className="p-2 hover:bg-white/5 rounded-lg text-rose-400/60 hover:text-rose-300 transition-colors" title="Expand sidebar">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onCreateFile} className="p-2 bg-gradient-to-br from-rose-900/40 to-rose-950/40 hover:from-rose-800/50 hover:to-rose-900/50 rounded-lg text-rose-400 transition-all border border-rose-500/10" title="New file">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-8 h-px bg-rose-500/10 my-1" />
        {files.map((f) => (
          <button key={f.id} onClick={() => onSelectFile(f.id)} className={`p-2 rounded-lg transition-all ${f.id === activeFileId ? "bg-rose-900/30 text-rose-300 border border-rose-500/20" : "text-rose-200/30 hover:bg-white/5 hover:text-rose-200/60 border border-transparent"}`} title={f.name}>
            <FileText className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col glass border-r border-rose-500/10 w-64 shrink-0 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-rose-500/10">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-200/40">Notes</span>
        <div className="flex items-center gap-1">
          <button onClick={onCreateFile} className="p-1.5 bg-gradient-to-br from-rose-900/40 to-rose-950/40 hover:from-rose-800/50 hover:to-rose-900/50 rounded-lg text-rose-400 transition-all border border-rose-500/10" title="New note">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onToggleCollapse} className="p-1.5 hover:bg-white/5 rounded-lg text-rose-400/40 hover:text-rose-300 transition-colors" title="Collapse sidebar">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {files.length === 0 && (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-rose-900/30 mx-auto mb-3" />
            <p className="text-xs text-rose-200/20">No notes yet</p>
            <p className="text-[10px] text-rose-200/15 mt-1">Click + to create one</p>
          </div>
        )}
        {files.map((file) => (
          <div key={file.id} className={`group rounded-xl transition-all duration-200 ${file.id === activeFileId ? "bg-rose-900/20 border border-rose-500/15 shadow-lg shadow-rose-950/20" : "hover:bg-white/[0.03] border border-transparent"}`}>
            {renamingId === file.id ? (
              <div className="flex items-center gap-1 p-2">
                <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenamingId(null); }} className="flex-1 bg-black/30 text-rose-100 text-sm rounded-lg px-2 py-1 border border-rose-500/20 outline-none focus:border-rose-500/40" />
                <button onClick={confirmRename} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRenamingId(null)} className="p-1 text-rose-400/40 hover:bg-rose-500/10 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => onSelectFile(file.id)} className="w-full text-left p-3 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${file.id === activeFileId ? "text-rose-100" : "text-rose-200/50"}`}>{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-rose-200/25">{formatDate(file.updatedAt)}</span>
                      <span className="text-[10px] text-rose-200/15">·</span>
                      <span className="text-[10px] text-rose-200/25">{wordCount(file.content)} words</span>
                    </div>
                    {file.content && (
                      <p className="text-[11px] text-rose-200/20 mt-1.5 line-clamp-2 leading-relaxed">{file.content.substring(0, 80)}</p>
                    )}
                  </div>
                </div>
                {/* Action buttons on hover */}
                <div className={`flex items-center gap-0.5 mt-2 ${file.id === activeFileId ? "opacity-60" : "opacity-0 group-hover:opacity-60"} transition-opacity`}>
                  <button onClick={(e) => { e.stopPropagation(); startRename(file); }} className="p-1 hover:bg-white/10 rounded text-rose-300/60 hover:text-rose-200" title="Rename"><Pencil className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDownloadFile(file.id); }} className="p-1 hover:bg-white/10 rounded text-rose-300/60 hover:text-rose-200" title="Download"><Download className="w-3 h-3" /></button>
                  {deleteConfirmId === file.id ? (
                    <div className="flex items-center gap-0.5 ml-auto">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); setDeleteConfirmId(null); }} className="px-1.5 py-0.5 text-[10px] bg-red-900/50 text-red-300 rounded hover:bg-red-800/60">Delete</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="px-1.5 py-0.5 text-[10px] text-rose-200/40 rounded hover:bg-white/5">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(file.id); }} className="p-1 hover:bg-red-500/10 rounded text-rose-300/60 hover:text-red-400 ml-auto" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileSidebar;

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
      <div className="flex flex-col items-center py-4 px-1.5 gap-3 bg-white border-r border-slate-200 w-14 shrink-0">
        <button onClick={onToggleCollapse} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Expand sidebar">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onCreateFile} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all shadow-sm shadow-blue-200" title="New file">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-8 h-px bg-slate-200 my-1" />
        {files.map((f) => (
          <button key={f.id} onClick={() => onSelectFile(f.id)} className={`p-2 rounded-lg transition-all ${f.id === activeFileId ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`} title={f.name}>
            <FileText className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white border-r border-slate-200 w-64 shrink-0 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Notes</span>
        <div className="flex items-center gap-1">
          <button onClick={onCreateFile} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all shadow-sm shadow-blue-200" title="New note">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onToggleCollapse} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Collapse sidebar">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {files.length === 0 && (
          <div className="text-center py-8 px-4">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-400">No notes yet</p>
            <p className="text-[10px] text-slate-300 mt-1">Click + to create one</p>
          </div>
        )}
        {files.map((file) => (
          <div key={file.id} className={`group rounded-xl transition-all duration-200 ${file.id === activeFileId ? "bg-blue-50 ring-1 ring-blue-100" : "hover:bg-slate-50"}`}>
            {renamingId === file.id ? (
              <div className="flex items-center gap-1 p-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenamingId(null); }}
                  className="flex-1 bg-white text-slate-800 text-sm rounded-lg px-2.5 py-1.5 border border-blue-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
                <button onClick={confirmRename} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRenamingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div onClick={() => onSelectFile(file.id)} className="w-full text-left p-3 rounded-xl cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${file.id === activeFileId ? "text-blue-700" : "text-slate-700"}`}>{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{formatDate(file.updatedAt)}</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{wordCount(file.content)} words</span>
                    </div>
                    {file.content && (
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{file.content.substring(0, 80)}</p>
                    )}
                  </div>
                </div>
                {/* Action buttons */}
                <div className={`flex items-center gap-0.5 mt-2 ${file.id === activeFileId ? "opacity-70" : "opacity-0 group-hover:opacity-70"} transition-opacity`}>
                  <button onClick={(e) => { e.stopPropagation(); startRename(file); }} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600" title="Rename"><Pencil className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDownloadFile(file.id); }} className="p-1 hover:bg-blue-100 rounded text-slate-400 hover:text-blue-600" title="Download"><Download className="w-3 h-3" /></button>
                  {deleteConfirmId === file.id ? (
                    <div className="flex items-center gap-0.5 ml-auto">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); setDeleteConfirmId(null); }} className="px-2 py-0.5 text-[10px] font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Delete</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="px-2 py-0.5 text-[10px] font-medium text-slate-500 rounded-md hover:bg-slate-100">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(file.id); }} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 ml-auto" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileSidebar;

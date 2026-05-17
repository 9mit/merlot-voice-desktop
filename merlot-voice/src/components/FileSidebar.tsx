// src/components/FileSidebar.tsx
import React, { useState } from "react";
import { Plus, FileText, Trash2, Download, Pencil, Check, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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

  // Render Collapsed Sidebar
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-5 px-2 gap-4 bg-[#FAF8F5] border-r border-[#C5A059]/20 w-16 shrink-0 h-full">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-[#F3ECE0] rounded-xl text-[#C5A059] hover:text-[#0A2540] transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onCreateFile}
          className="p-2.5 bg-[#0A2540] hover:bg-[#C5A059] text-white hover:text-[#111111] rounded-xl transition-all shadow-md shadow-[#0A2540]/10 hover:scale-105 border border-[#C5A059]/30"
          title="New file"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-8 h-[1px] bg-[#C5A059]/20 my-1" />
        <div className="flex-1 overflow-y-auto space-y-3 w-full flex flex-col items-center py-2">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectFile(f.id)}
              className={`p-2.5 rounded-xl transition-all relative ${
                f.id === activeFileId
                  ? "bg-white text-[#0A2540] border border-[#C5A059] shadow-sm"
                  : "text-slate-400 hover:bg-[#F3ECE0]/50 hover:text-slate-700"
              }`}
              title={f.name}
            >
              {f.id === activeFileId && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#C5A059] rounded-r" />
              )}
              <FileText className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render Full Sidebar
  return (
    <div className="flex flex-col bg-[#FAF8F5] border-r border-[#C5A059]/20 w-68 shrink-0 h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#C5A059]/15">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111]/60 editorial-sans">
            Notebooks
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCreateFile}
            className="p-2 bg-[#0A2540] hover:bg-[#C5A059] text-white hover:text-[#111111] rounded-xl transition-all shadow-sm border border-[#C5A059]/20 hover:scale-105"
            title="New note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-[#F3ECE0]/50 rounded-xl text-slate-400 hover:text-[#0A2540] transition-colors border border-transparent hover:border-[#C5A059]/15"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2.5">
        {files.length === 0 && (
          <div className="text-center py-12 px-4 border border-dashed border-[#C5A059]/25 rounded-2xl bg-[#FCFAF7] my-4 mx-1">
            <FileText className="w-7 h-7 text-[#C5A059]/60 mx-auto mb-3" />
            <p className="text-xs font-semibold text-[#111111]/70">No Notes Available</p>
            <p className="text-[10px] text-slate-400 mt-1">Create a note to record your thoughts.</p>
          </div>
        )}
        
        {files.map((file) => (
          <div
            key={file.id}
            className={`group rounded-xl transition-all duration-300 relative border overflow-hidden ${
              file.id === activeFileId
                ? "bg-white border-[#C5A059] shadow-sm"
                : "bg-[#FCFAF7] border-[#C5A059]/10 hover:border-[#C5A059]/30 hover:bg-[#F3ECE0]/20"
            }`}
          >
            {/* Selected luxury marker */}
            {file.id === activeFileId && (
              <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#C5A059] rounded-r" />
            )}

            {renamingId === file.id ? (
              <div className="flex items-center gap-1.5 p-2 bg-white">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="flex-1 bg-[#FAF8F5] text-slate-800 text-xs rounded-lg px-2.5 py-1.5 border border-[#C5A059]/40 outline-none focus:border-[#0A2540] transition-all font-medium"
                />
                <button
                  onClick={confirmRename}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => onSelectFile(file.id)}
                className="w-full text-left p-3.5 cursor-pointer relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold tracking-wide truncate ${
                        file.id === activeFileId
                          ? "text-[#0A2540] font-serif editorial-serif text-sm"
                          : "text-[#111111]/80"
                      }`}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                        {formatDate(file.updatedAt)}
                      </span>
                      <span className="text-[8px] text-[#C5A059]">•</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                        {wordCount(file.content)} words
                      </span>
                    </div>
                    {file.content && (
                      <p className="text-[11px] text-[#111111]/50 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {file.content.substring(0, 80)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inline Action toolbar */}
                <div
                  className={`flex items-center gap-1.5 mt-2.5 border-t border-[#C5A059]/10 pt-2 transition-opacity duration-300 ${
                    file.id === activeFileId
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(file);
                    }}
                    className="p-1 text-slate-400 hover:text-[#0A2540] hover:bg-[#F3ECE0] rounded-lg transition-colors border border-transparent hover:border-[#C5A059]/20"
                    title="Rename note"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadFile(file.id);
                    }}
                    className="p-1 text-slate-400 hover:text-[#0A2540] hover:bg-[#F3ECE0] rounded-lg transition-colors border border-transparent hover:border-[#C5A059]/20"
                    title="Download note"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  
                  {deleteConfirmId === file.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(file.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent ml-auto"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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

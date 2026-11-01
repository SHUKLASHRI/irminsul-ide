import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import * as api from '../api/client';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import {
  Crosshair,
  Edit,
  X,
  FileCode,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  Code,
  Save,
  Maximize2,
} from 'lucide-react';
import { CodeEditorModal } from './CodeEditorModal';

export const InspectorPanel: React.FC = () => {
  const {
    selectedNode,
    selectNodeById,
    sourceSnippet,
    isLoadingSource,
    sourceError,
    retrySourceSnippet,
    impact,
    openRenameModal,
    inspectorWidth,
    rightPanelOpen,
    setRightPanelOpen,
    rightPanelHovered,
    setRightPanelHovered,
    setIsEditorFocused,
    nodes,
    activeCycles,
    saveFile,
  } = useExplorer();

  // State
  const [copied, setCopied] = useState(false);
  const [isFullEditorOpen, setIsFullEditorOpen] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [inlineContent, setInlineContent] = useState('');
  const [inlineOriginalContent, setInlineOriginalContent] = useState('');
  const [isLoadingInline, setIsLoadingInline] = useState(false);
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [inlineSyntaxError, setInlineSyntaxError] = useState<{ line: number; message: string } | null>(null);

  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineLineGutterRef = useRef<HTMLDivElement>(null);

  const isUnfolded = rightPanelOpen || rightPanelHovered;

  // Metrics
  const directCallers = impact?.direct_callers || [];
  const transitiveCallers = impact?.callers || directCallers;
  const hiddenCallersCount = Math.max(0, transitiveCallers.length - directCallers.length);
  const callees = impact?.direct_callees || [];

  // Layer check
  const layerViolations = useMemo(() => {
    if (!selectedNode || !selectedNode.tier) return [];
    const srcTier = selectedNode.tier.toLowerCase();
    const violations: { callee: string; targetTier: string; reason: string }[] = [];

    callees.forEach((calleeId) => {
      const target = nodes.find((n) => n.id === calleeId || n.name === calleeId);
      if (target?.tier) {
        const tgtTier = target.tier.toLowerCase();
        if (srcTier === 'presentation' && tgtTier === 'persistence') {
          violations.push({
            callee: target.name,
            targetTier: tgtTier,
            reason: 'Presentation directly calls Persistence',
          });
        } else if (
          srcTier === 'persistence' &&
          (tgtTier === 'presentation' || tgtTier === 'services')
        ) {
          violations.push({
            callee: target.name,
            targetTier: tgtTier,
            reason: 'Persistence inversely calls higher-level tier',
          });
        }
      }
    });
    return violations;
  }, [selectedNode, callees, nodes]);

  // Orphan check
  const isOrphan =
    selectedNode &&
    directCallers.length === 0 &&
    selectedNode.name !== 'main' &&
    !selectedNode.name.startsWith('test_') &&
    selectedNode.kind !== 'class';

  // Cycles
  const cycleInvolved = useMemo(() => {
    if (!selectedNode || !activeCycles) return null;
    return activeCycles.find((c) => c.includes(selectedNode.id) || c.includes(selectedNode.name));
  }, [selectedNode, activeCycles]);

  // Blast radius
  const blastRadiusFiles = useMemo(() => {
    if (!transitiveCallers.length) return [];
    const files = new Set<string>();
    transitiveCallers.forEach((cId) => {
      const callerNode = nodes.find((n) => n.id === cId || n.name === cId);
      if (callerNode?.filename) files.add(callerNode.filename);
    });
    return Array.from(files);
  }, [transitiveCallers, nodes]);

  // File loading
  const loadInlineContent = useCallback(() => {
    if (!selectedNode?.file) return;
    setIsLoadingInline(true);
    setInlineSyntaxError(null);
    api
      .fetchFileContent(selectedNode.file)
      .then((data) => {
        setInlineContent(data.content);
        setInlineOriginalContent(data.content);
        setIsLoadingInline(false);
      })
      .catch(() => {
        setIsLoadingInline(false);
      });
  }, [selectedNode?.file]);

  useEffect(() => {
    setInlineContent('');
    setInlineOriginalContent('');
    setInlineSyntaxError(null);
    if (inlineEditMode && selectedNode?.file) {
      loadInlineContent();
    }
  }, [selectedNode?.id, inlineEditMode, loadInlineContent, selectedNode?.file]);

  // File save
  const handleSaveInline = async () => {
    if (!selectedNode?.file || isSavingInline) return;
    setIsSavingInline(true);
    setInlineSyntaxError(null);

    const res = await saveFile(selectedNode.file, inlineContent);
    setIsSavingInline(false);

    if (res.success) {
      setInlineOriginalContent(inlineContent);
    } else if (res.syntax_error) {
      setInlineSyntaxError({
        line: res.syntax_error.line,
        message: res.syntax_error.message,
      });
    }
  };

  // Keyboard
  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveInline();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const tabSpaces = '    ';
      const newContent = inlineContent.substring(0, start) + tabSpaces + inlineContent.substring(end);
      setInlineContent(newContent);
      setTimeout(() => {
        if (inlineTextareaRef.current) {
          inlineTextareaRef.current.selectionStart = start + tabSpaces.length;
          inlineTextareaRef.current.selectionEnd = start + tabSpaces.length;
        }
      }, 0);
    }
  };

  if (!isUnfolded) return null;

  // Empty state
  if (!selectedNode) {
    return (
      <aside
        style={{ width: `${inspectorWidth}px` }}
        onMouseEnter={() => setRightPanelHovered(true)}
        onMouseLeave={() => setRightPanelHovered(false)}
        className="absolute right-3 top-14 bottom-6 bg-[#252526] border border-[#3e3e42] rounded-[3px] shadow-2xl z-40 flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <Crosshair size={28} className="text-[#858585] mb-2" />
        <div className="text-[#ffffff] font-medium text-xs mb-1">Select a Symbol</div>
        <p className="text-[11px] text-[#858585] max-w-[210px] leading-relaxed">
          Click any node in the architecture graph to inspect callers, callees, metrics, and edit source code.
        </p>
      </aside>
    );
  }

  const isClass = selectedNode.kind === 'class';
  const isMethod = Boolean(selectedNode.class_owner);
  const callers = directCallers;
  const isInlineDirty = inlineContent !== inlineOriginalContent;

  const handleCopySource = () => {
    if (!sourceSnippet?.lines) return;
    const text = sourceSnippet.lines
      .map((l: any) => (typeof l === 'string' ? l : l.content))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const highlightPython = (code: string) => {
    try {
      const grammar = Prism.languages.python || Prism.languages.javascript || {};
      return Prism.highlight(code || ' ', grammar, 'python');
    } catch {
      return code || ' ';
    }
  };

  const inlineTotalLines = inlineContent.split('\n').length;

  return (
    <>
      <aside
        style={{ width: `${inspectorWidth}px` }}
        onMouseEnter={() => setRightPanelHovered(true)}
        onMouseLeave={() => setRightPanelHovered(false)}
        className="absolute right-3 top-14 bottom-6 bg-[#252526] border border-[#3e3e42] rounded-[3px] shadow-2xl z-40 flex flex-col justify-between overflow-hidden select-none transition-all duration-200"
        id="inspectorPanel"
      >
        {/* Header */}
        <div className="h-9 px-3 border-b border-[#3e3e42] flex items-center justify-between bg-[#2d2d2d]">
          <div className="flex items-center space-x-2 truncate">
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] font-semibold uppercase tracking-wider ${
                isClass
                  ? 'bg-[#203330] text-[#4ec9b0] border border-[#2a4e48]'
                  : 'bg-[#333220] text-[#dcdcaa] border border-[#4d4a2a]'
              }`}
            >
              {isClass ? 'Class' : isMethod ? 'Method' : 'Function'}
            </span>
            <span
              className={`font-mono text-xs font-semibold truncate ${
                isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'
              }`}
            >
              {selectedNode.name}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsFullEditorOpen(true)}
              className="px-2 py-0.5 bg-[#094771] hover:bg-[#007acc] text-white rounded-[2px] text-[10px] font-mono flex items-center gap-1 micro-tap border border-[#007acc]"
              title="Open Full Code Editor (Ctrl+S)"
            >
              <Code size={11} />
              <span>Edit Code</span>
            </button>

            <button
              onClick={() => openRenameModal(selectedNode)}
              className="px-1.5 py-0.5 bg-[#333333] hover:bg-[#3e3e42] border border-[#3e3e42] rounded-[2px] text-[10px] font-mono text-[#cccccc] hover:text-[#ffffff] flex items-center gap-1 micro-tap"
              title="Safe Refactor / Rename (F2)"
            >
              <Edit size={11} />
              <span>F2</span>
            </button>

            <button
              onClick={() => {
                setRightPanelOpen(false);
                setRightPanelHovered(false);
              }}
              className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#383838] rounded-[2px] micro-tap flex items-center justify-center"
              title="Close Inspector (Escape)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 panel-scroll">
          {/* Metadata */}
          <div className="p-2.5 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#2d2d2d] pb-1.5">
              <span className="text-[#858585]">Location</span>
              <span className="text-[#cccccc] truncate max-w-[200px]" title={selectedNode.file}>
                {selectedNode.filename}:{selectedNode.line}
              </span>
            </div>

            {selectedNode.tier && (
              <div className="flex items-center justify-between text-[11px] font-mono border-b border-[#2d2d2d] pb-1.5">
                <span className="text-[#858585]">Tier Layer</span>
                <span className="text-[#4ec9b0] uppercase font-bold tracking-wider text-[10px] bg-[#1a2d27] px-1.5 py-0.2 rounded-[2px] border border-[#2d5248]">
                  {selectedNode.tier}
                </span>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 text-center">
              <div className="p-1.5 bg-[#252526] rounded-[2px] border border-[#2d2d2d]">
                <div className="text-[10px] text-[#858585] font-mono uppercase">Complexity</div>
                <div
                  className={`text-sm font-mono font-bold ${
                    (selectedNode.cyclomatic_complexity || 1) > 10
                      ? 'text-[#f14c4c]'
                      : (selectedNode.cyclomatic_complexity || 1) > 5
                      ? 'text-[#cca700]'
                      : 'text-[#4ec9b0]'
                  }`}
                >
                  {selectedNode.cyclomatic_complexity || 1}
                </div>
              </div>

              <div className="p-1.5 bg-[#252526] rounded-[2px] border border-[#2d2d2d]">
                <div className="text-[10px] text-[#858585] font-mono uppercase">Params / Args</div>
                <div className="text-sm font-mono font-bold text-[#cccccc]">
                  {selectedNode.parameters ? selectedNode.parameters.length : 0}
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="p-2.5 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#cccccc] font-semibold border-b border-[#2d2d2d] pb-1">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-[#cca700]" />
                <span>Architecture Diagnostics</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px] font-mono">
              {/* Blast radius */}
              <div className="p-1.5 rounded-[2px] bg-[#181818] border border-[#2d2d2d] flex items-center justify-between">
                <span className="text-[#858585]">Blast Radius:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#cccccc] font-medium">{directCallers.length} direct</span>
                  {hiddenCallersCount > 0 ? (
                    <span
                      className="text-[#cca700] bg-[#332a15] px-1 rounded-[1px] border border-[#4d4020]"
                      title={`${hiddenCallersCount} indirect downstream callers across ${blastRadiusFiles.length} files`}
                    >
                      +{hiddenCallersCount} hidden ({blastRadiusFiles.length} file{blastRadiusFiles.length !== 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="text-[#4ec9b0]">Isolated</span>
                  )}
                </div>
              </div>

              {/* Layer integrity */}
              {layerViolations.length > 0 ? (
                <div className="p-1.5 rounded-[2px] bg-[#332a15] border border-[#cca700]/50 text-[#e0d6b5] space-y-0.5">
                  <div className="flex items-center gap-1 text-[#cca700] font-semibold">
                    <AlertTriangle size={12} />
                    <span>Layer Boundary Leak</span>
                  </div>
                  {layerViolations.map((v, i) => (
                    <div key={i} className="text-[10px] text-[#cccccc]">
                      • {v.reason} (<span className="text-[#dcdcaa]">{v.callee}</span>)
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-1.5 rounded-[2px] bg-[#181818] border border-[#2d2d2d] flex items-center justify-between text-[#858585]">
                  <span>Layer Integrity:</span>
                  <span className="text-[#4ec9b0]">Clean Layering</span>
                </div>
              )}

              {/* Cycles */}
              {cycleInvolved && (
                <div className="p-1.5 rounded-[2px] bg-[#332020] border border-[#f14c4c]/40 text-[#f14c4c] flex items-center gap-1.5">
                  <RotateCcw size={12} className="flex-shrink-0" />
                  <span className="truncate">Circular Chain: {cycleInvolved.join(' ⇄ ')}</span>
                </div>
              )}

              {/* Dead code */}
              {isOrphan && (
                <div className="p-1.5 rounded-[2px] bg-[#2d2815] border border-[#cca700]/40 text-[#cca700] flex items-center gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  <span>0 Callers in Project (Potential Dead Code)</span>
                </div>
              )}
            </div>
          </div>

          {/* Calls */}
          <div className="grid grid-cols-2 gap-2">
            {/* Callers */}
            <div className="p-2 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px]">
              <div className="text-[10px] font-mono text-[#858585] font-semibold mb-1 flex items-center justify-between">
                <span>Callers ({callers.length})</span>
                <ArrowDownLeft size={13} className="text-[#858585]" />
              </div>
              {callers.length === 0 ? (
                <div className="text-[10px] font-mono text-[#6e7681] italic">No incoming calls</div>
              ) : (
                <div className="space-y-0.5 max-h-24 overflow-y-auto tree-scroll">
                  {callers.map((c) => (
                    <div
                      key={c}
                      onClick={() => selectNodeById(c)}
                      className="text-[10px] font-mono text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-[2px] cursor-pointer truncate transition-colors"
                    >
                      ← {c}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Callees */}
            <div className="p-2 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px]">
              <div className="text-[10px] font-mono text-[#858585] font-semibold mb-1 flex items-center justify-between">
                <span>Calls ({callees.length})</span>
                <ArrowUpRight size={13} className="text-[#858585]" />
              </div>
              {callees.length === 0 ? (
                <div className="text-[10px] font-mono text-[#6e7681] italic">No outgoing calls</div>
              ) : (
                <div className="space-y-0.5 max-h-24 overflow-y-auto tree-scroll">
                  {callees.map((c) => (
                    <div
                      key={c}
                      onClick={() => selectNodeById(c)}
                      className="text-[10px] font-mono text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-[2px] cursor-pointer truncate transition-colors"
                    >
                      → {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source viewer */}
          <div
            className="border border-[#3e3e42] rounded-[2px] overflow-hidden bg-[#1e1e1e]"
            onMouseEnter={() => setIsEditorFocused(true)}
            onMouseLeave={() => setIsEditorFocused(false)}
          >
            {/* Header tab */}
            <div className="h-7 px-2.5 bg-[#2d2d2d] border-b border-[#3e3e42] flex items-center justify-between">
              <div className="flex items-center space-x-1.5 truncate">
                <FileCode size={13} className="text-[#007acc] flex-shrink-0" />
                <span className="text-[11px] font-mono text-[#cccccc] font-medium truncate">
                  {selectedNode.filename}
                </span>
                {inlineEditMode && isInlineDirty && (
                  <span className="w-2 h-2 rounded-full bg-[#007acc] animate-pulse flex-shrink-0" title="Unsaved changes" />
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <div className="flex items-center bg-[#1e1e1e] p-0.5 rounded-[2px] border border-[#3e3e42] text-[10px] font-mono">
                  <button
                    onClick={() => setInlineEditMode(false)}
                    className={`px-1.5 py-0.2 rounded-[1px] micro-tap ${
                      !inlineEditMode ? 'bg-[#094771] text-white font-medium' : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                    title="View snippet"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setInlineEditMode(true);
                      if (!inlineContent) loadInlineContent();
                    }}
                    className={`px-1.5 py-0.2 rounded-[1px] micro-tap ${
                      inlineEditMode ? 'bg-[#094771] text-white font-medium' : 'text-[#858585] hover:text-[#cccccc]'
                    }`}
                    title="Edit source"
                  >
                    Edit
                  </button>
                </div>

                {inlineEditMode && (
                  <button
                    onClick={handleSaveInline}
                    disabled={!isInlineDirty || isSavingInline}
                    className={`px-2 py-0.2 rounded-[2px] text-[10px] font-mono flex items-center gap-1 micro-tap border ${
                      isInlineDirty
                        ? 'bg-[#007acc] hover:bg-[#0098ff] text-white border-[#007acc]'
                        : 'bg-[#252526] text-[#6e7681] border-[#3e3e42] cursor-not-allowed'
                    }`}
                    title="Save (Ctrl+S)"
                  >
                    <Save size={11} />
                    <span>{isSavingInline ? '...' : 'Save'}</span>
                  </button>
                )}

                {!inlineEditMode && (
                  <button
                    onClick={handleCopySource}
                    className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono text-[#858585] hover:text-[#cccccc] hover:bg-[#383838] transition-colors flex items-center gap-1"
                    title="Copy snippet"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsFullEditorOpen(true)}
                  className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#383838] rounded-[2px] micro-tap"
                  title="Expand Full Editor"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {inlineEditMode && inlineSyntaxError && (
              <div className="px-2.5 py-1.5 bg-[#332020] border-b border-[#f14c4c]/40 text-[#f14c4c] flex items-center justify-between text-[10px] font-mono">
                <span>
                  <strong>Line {inlineSyntaxError.line}:</strong> {inlineSyntaxError.message}
                </span>
              </div>
            )}

            {/* Editor body */}
            {inlineEditMode ? (
              <div className="bg-[#1e1e1e] flex flex-col h-72 font-mono text-[11px] relative">
                {isLoadingInline ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#858585]">
                    <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                    <span>Loading file...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex overflow-hidden">
                      {/* Line gutter */}
                      <div
                        ref={inlineLineGutterRef}
                        className="w-9 bg-[#1e1e1e] border-r border-[#2d2d2d] py-2 text-right pr-2 select-none overflow-hidden text-[#555555] leading-[18px]"
                      >
                        {Array.from({ length: inlineTotalLines }).map((_, i) => (
                          <div key={i + 1}>{i + 1}</div>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        ref={inlineTextareaRef}
                        value={inlineContent}
                        onChange={(e) => setInlineContent(e.target.value)}
                        onKeyDown={handleInlineKeyDown}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        className="flex-1 h-full py-2 px-2.5 bg-transparent text-[#d4d4d4] font-mono leading-[18px] resize-none outline-none overflow-auto code-scroll selection:bg-[#264f78]"
                      />
                    </div>

                    <div className="h-5 px-2 bg-[#252526] border-t border-[#3e3e42] flex items-center justify-between text-[9px] text-[#858585]">
                      <span>{isInlineDirty ? '● Unsaved Changes' : 'Saved'}</span>
                      <span>Ctrl+S to save</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Viewer */
              <div className="bg-[#1e1e1e] p-2 max-h-72 overflow-auto code-scroll text-[11px] font-mono">
                {isLoadingSource ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#858585] font-mono text-xs">
                    <div className="w-4 h-4 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                    <span>Loading source...</span>
                  </div>
                ) : sourceError ? (
                  <div className="py-4 px-3 bg-[#2b2020] border border-[#f14c4c]/40 rounded-[2px] text-center space-y-2">
                    <div className="text-[11px] text-[#f14c4c] font-semibold flex items-center justify-center gap-1.5">
                      <AlertCircle size={14} />
                      <span>Preview unavailable</span>
                    </div>
                    <p className="text-[10px] text-[#858585]">{sourceError}</p>
                    <button
                      onClick={retrySourceSnippet}
                      className="px-2.5 py-1 bg-[#333333] hover:bg-[#3e3e42] text-[#cccccc] hover:text-[#ffffff] rounded-[2px] text-[10px] font-mono transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : sourceSnippet?.lines && sourceSnippet.lines.length > 0 ? (
                  <div className="space-y-0 min-w-full">
                    {sourceSnippet.lines.map((lineItem: any, idx: number) => {
                      const lineContent =
                        typeof lineItem === 'string' ? lineItem : lineItem?.content ?? '';
                      const lineNum =
                        typeof lineItem === 'object' && lineItem !== null
                          ? lineItem.number ?? idx + 1
                          : idx + 1;
                      const isTarget =
                        typeof lineItem === 'object' && lineItem !== null
                          ? Boolean(lineItem.is_target)
                          : false;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start group rounded-[1px] px-1 transition-colors leading-relaxed ${
                            isTarget
                              ? 'bg-[#094771]/60 border-l-2 border-[#007acc] text-[#ffffff]'
                              : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                          }`}
                        >
                          <span className="w-8 flex-shrink-0 text-right pr-3 text-[10px] text-[#858585] select-none group-hover:text-[#cccccc]">
                            {lineNum}
                          </span>
                          <pre className="flex-1 whitespace-pre leading-relaxed m-0 p-0 overflow-x-visible">
                            <code
                              dangerouslySetInnerHTML={{
                                __html: highlightPython(lineContent),
                              }}
                            />
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-[#858585] font-mono text-xs">
                    Source definition not available for this node.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-8 px-3 border-t border-[#3e3e42] bg-[#2d2d2d] flex items-center justify-between text-[10px] font-mono text-[#858585]">
          <span className="truncate max-w-[140px]">Node: {selectedNode.id}</span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsFullEditorOpen(true)}
              className="text-[#4ec9b0] hover:text-[#7ee8d3] font-medium hover:underline flex items-center gap-1"
            >
              <Code size={11} />
              <span>Full Editor</span>
            </button>
            <button
              onClick={() => openRenameModal(selectedNode)}
              className="text-[#007acc] hover:text-[#0098ff] font-medium hover:underline"
            >
              Refactor (F2) →
            </button>
          </div>
        </div>
      </aside>

      {/* Editor modal */}
      <CodeEditorModal
        isOpen={isFullEditorOpen}
        onClose={() => setIsFullEditorOpen(false)}
        filePath={selectedNode.file}
        initialLine={selectedNode.line}
      />
    </>
  );
};

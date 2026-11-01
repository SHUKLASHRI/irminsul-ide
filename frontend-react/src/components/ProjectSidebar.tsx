import React, { useState, useMemo } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import type { SidebarTab } from '../types';
import {
  Boxes,
  X,
  Search,
  FileCode,
} from 'lucide-react';

export const ProjectSidebar: React.FC = () => {
  const {
    nodes,
    selectedNode,
    selectNode,
    selectNodeById,
    sidebarWidth,
    sidebarTab,
    setSidebarTab,
    leftPanelOpen,
    setLeftPanelOpen,
    leftPanelHovered,
    setLeftPanelHovered,
    projectPath,
    layers,
    diagnostics,
    projectMeta,
    activeCycles,
    deadFunctions,
    activeLayerFilter,
    setActiveLayerFilter,
  } = useExplorer();

  const [treeFilter, setTreeFilter] = useState('');

  // Project name
  const projectName = useMemo(() => {
    if (projectMeta?.name) return projectMeta.name;
    if (!projectPath) return 'Project';
    const parts = projectPath.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || 'Project';
  }, [projectPath, projectMeta]);

  // File groups
  const fileGroups = useMemo(() => {
    const map = new Map<string, typeof nodes>();
    nodes.forEach((n) => {
      const list = map.get(n.filename) || [];
      list.push(n);
      map.set(n.filename, list);
    });
    return Array.from(map.entries());
  }, [nodes]);

  const filteredGroups = useMemo(() => {
    if (!treeFilter.trim()) return fileGroups;
    const q = treeFilter.toLowerCase();
    return fileGroups
      .map(([filename, syms]) => {
        const matchesFile = filename.toLowerCase().includes(q);
        const matchedSyms = syms.filter((s) => s.name.toLowerCase().includes(q));
        if (matchesFile) return [filename, syms] as const;
        if (matchedSyms.length > 0) return [filename, matchedSyms] as const;
        return null;
      })
      .filter(Boolean) as [string, typeof nodes][];
  }, [fileGroups, treeFilter]);

  const totalClasses = nodes.filter((n) => n.kind === 'class').length;
  const totalFunctions = nodes.filter((n) => n.kind === 'function').length;

  const isUnfolded = leftPanelOpen || leftPanelHovered;

  if (!isUnfolded) {
    return null;
  }

  // Sidebar
  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      onMouseEnter={() => setLeftPanelHovered(true)}
      onMouseLeave={() => setLeftPanelHovered(false)}
      className="absolute left-3 top-14 bottom-6 bg-[#252526] border border-[#3e3e42] rounded-[3px] shadow-2xl z-40 flex flex-col justify-between overflow-hidden select-none transition-all duration-200"
      id="projectSidebar"
    >
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Panel Header */}
        <div className="h-9 px-3 border-b border-[#3e3e42] flex items-center justify-between bg-[#2d2d2d]">
          <div className="flex items-center space-x-1.5 truncate">
            <Boxes size={15} className="text-[#007acc]" />
            <span className="text-xs font-semibold text-[#ffffff] tracking-normal truncate font-sans uppercase text-[11px]">
              {projectName}
            </span>
            {!leftPanelOpen && (
              <span className="text-[9px] font-mono text-[#858585] bg-[#1e1e1e] px-1 py-0.2 rounded-[2px] border border-[#3e3e42]">
                peek
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Close / Fold button */}
            <button
              onClick={() => {
                setLeftPanelOpen(false);
                setLeftPanelHovered(false);
              }}
              className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#383838] rounded-[2px] micro-tap flex items-center justify-center"
              title="Close Sidebar (Ctrl+B)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (VS Code style sub-tabs) */}
        <div className="flex items-center px-1 border-b border-[#3e3e42] bg-[#252526]">
          {(['files', 'symbols', 'layers', 'metrics'] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-1.5 text-[11px] font-sans capitalize transition-colors border-b-2 ${
                sidebarTab === tab
                  ? 'border-[#007acc] text-[#ffffff] font-medium bg-[#1e1e1e]'
                  : 'border-transparent text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Input */}
        <div className="p-2 border-b border-[#3e3e42] bg-[#252526]">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2 text-[#858585] pointer-events-none" />
            <input
              type="text"
              value={treeFilter}
              onChange={(e) => setTreeFilter(e.target.value)}
              placeholder="Filter architecture symbols..."
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] px-2 py-0.5 pl-6 text-[11px] text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-[#007acc] font-sans"
            />
            {treeFilter && (
              <button
                onClick={() => setTreeFilter('')}
                className="absolute right-1.5 text-[#858585] hover:text-[#cccccc]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto tree-scroll py-1 px-1.5 space-y-1.5">
          {sidebarTab === 'files' && (
            <div>
              {filteredGroups.length === 0 ? (
                <div className="p-4 text-center text-[#858585] font-mono text-[11px]">
                  No matching files or symbols found.
                </div>
              ) : (
                filteredGroups.map(([filename, syms]) => (
                  <div key={filename} className="mb-1.5">
                    {/* File Header */}
                    <div className="flex items-center space-x-1.5 py-1 px-1.5 text-[#cccccc] hover:bg-[#2a2d2e] rounded-[2px] group font-mono text-[11px]">
                      <FileCode size={13} className="text-[#569cd6] flex-shrink-0" />
                      <span className="font-medium truncate flex-1">{filename}</span>
                      <span className="text-[10px] text-[#858585]">{syms.length}</span>
                    </div>

                    {/* Symbols under file */}
                    <div className="ml-3 pl-1.5 border-l border-[#3e3e42] space-y-0.5 mt-0.5">
                      {syms.map((sym) => {
                        const isSelected = selectedNode?.id === sym.id;
                        const isClass = sym.kind === 'class';
                        return (
                          <div
                            key={sym.id}
                            onClick={() => selectNode(sym)}
                            className={`flex items-center justify-between px-1.5 py-0.5 rounded-[2px] cursor-pointer text-[11px] font-mono transition-colors ${
                              isSelected
                                ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <span
                                className={`text-[9px] font-mono px-1 py-0.2 rounded-[1px] uppercase font-semibold ${
                                  isClass
                                    ? 'text-[#4ec9b0] bg-[#203330]'
                                    : 'text-[#dcdcaa] bg-[#333220]'
                                }`}
                              >
                                {isClass ? 'C' : 'f'}
                              </span>
                              <span
                                className={`truncate ${
                                  isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'
                                }`}
                              >
                                {sym.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-[#858585]">
                              {sym.cyclomatic_complexity !== undefined && sym.cyclomatic_complexity !== null && (
                                <span
                                  className={`text-[9px] font-semibold ${
                                    sym.complexity_rating === 'low'
                                      ? 'text-[#4ec9b0]'
                                      : sym.complexity_rating === 'moderate'
                                      ? 'text-[#cca700]'
                                      : 'text-[#f14c4c]'
                                  }`}
                                >
                                  C{sym.cyclomatic_complexity}
                                </span>
                              )}
                              <span>L{sym.line}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {sidebarTab === 'symbols' && (
            <div className="space-y-0.5">
              {nodes
                .filter((n) => !treeFilter || n.name.toLowerCase().includes(treeFilter.toLowerCase()))
                .map((sym) => {
                  const isSelected = selectedNode?.id === sym.id;
                  const isClass = sym.kind === 'class';
                  return (
                    <div
                      key={sym.id}
                      onClick={() => selectNode(sym)}
                      className={`flex items-center justify-between px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                          : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded-[1px] uppercase font-semibold ${
                            isClass
                              ? 'text-[#4ec9b0] bg-[#203330]'
                              : 'text-[#dcdcaa] bg-[#333220]'
                          }`}
                        >
                          {isClass ? 'C' : 'f'}
                        </span>
                        <span
                          className={`font-mono text-[11px] truncate ${
                            isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'
                          }`}
                        >
                          {sym.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#858585]">
                        {sym.tier && (
                          <span className="text-[9px] text-[#858585] bg-[#1e1e1e] border border-[#3e3e42] px-1 rounded-[1px]">
                            {sym.tier}
                          </span>
                        )}
                        <span className="truncate max-w-[65px] text-[#6e7681]">{sym.filename}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {sidebarTab === 'layers' && (
            <div className="p-1 space-y-2 font-mono text-[11px]">
              {layers && Object.keys(layers).length > 0 ? (
                Object.entries(layers).map(([tierName, nodeIds]) => {
                  const isFiltered = activeLayerFilter.toUpperCase() === tierName.toUpperCase();
                  return (
                    <div
                      key={tierName}
                      className={`p-2 bg-[#1e1e1e] border rounded-[2px] transition-colors ${
                        isFiltered
                          ? 'border-[#007acc] ring-1 ring-[#007acc]/40'
                          : 'border-[#3e3e42]'
                      }`}
                    >
                      <div
                        onClick={() =>
                          setActiveLayerFilter(isFiltered ? 'ALL' : tierName.toUpperCase())
                        }
                        className="text-[#cccccc] font-medium text-[11px] mb-1 flex items-center justify-between cursor-pointer hover:text-white"
                        title={isFiltered ? 'Click to show all layers' : `Click to isolate ${tierName} on canvas`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase tracking-wider text-[#569cd6]">{tierName}</span>
                          {isFiltered && (
                            <span className="text-[9px] px-1 bg-[#094771] text-[#ffffff] rounded-[2px]">
                              ISOLATED
                            </span>
                          )}
                        </div>
                        <span className="text-[#858585] font-normal">{nodeIds.length} symbols</span>
                      </div>
                      <div className="space-y-0.5 max-h-28 overflow-y-auto tree-scroll">
                        {nodeIds.map((nid) => (
                          <div
                            key={nid}
                            onClick={() => selectNodeById(nid)}
                            className="text-[10px] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-[2px] cursor-pointer truncate transition-colors"
                          >
                            • {nid}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-[#858585] text-[11px]">
                  No architectural layers discovered yet.
                </div>
              )}
            </div>
          )}

          {sidebarTab === 'metrics' && (
            <div className="p-1 space-y-2 font-mono text-[11px]">
              {/* Circular Dependencies */}
              <div className="p-2 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px]">
                <div className="text-[#cccccc] font-medium text-[11px] mb-1 flex items-center justify-between">
                  <span>Circular Cycles</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      activeCycles.length === 0
                        ? 'text-[#4ec9b0] bg-[#203330]'
                        : 'text-[#cca700] bg-[#333020]'
                    }`}
                  >
                    {activeCycles.length} detected
                  </span>
                </div>
                {activeCycles.length === 0 ? (
                  <div className="text-[10px] text-[#858585] italic mt-1">
                    Clean DAG — no recursive cycles.
                  </div>
                ) : (
                  <div className="space-y-1 mt-1">
                    {activeCycles.map((cycle, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] text-[#cca700] bg-[#333020] p-1.5 rounded-[2px] border border-[#4d4a2a] truncate"
                      >
                        {cycle.join(' ⇄ ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dead Functions */}
              <div className="p-2 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px]">
                <div className="text-[#cccccc] font-medium text-[11px] mb-1 flex items-center justify-between">
                  <span>Dead Functions</span>
                  <span className="text-[10px] text-[#858585]">
                    {deadFunctions.length} unreferenced
                  </span>
                </div>
                {deadFunctions.length === 0 ? (
                  <div className="text-[10px] text-[#858585] italic mt-1">
                    No dead code detected.
                  </div>
                ) : (
                  <div className="space-y-0.5 mt-1 max-h-28 overflow-y-auto tree-scroll">
                    {deadFunctions.map((df) => (
                      <div
                        key={df.id}
                        onClick={() => selectNodeById(df.id)}
                        className="text-[10px] text-[#f14c4c] hover:text-[#ffffff] hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-[2px] cursor-pointer truncate transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{df.name}</span>
                        <span className="text-[9px] text-[#858585]">L{df.line}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complexity Hotspots */}
              {diagnostics?.hotspots && diagnostics.hotspots.length > 0 && (
                <div className="p-2 bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px]">
                  <div className="text-[#cccccc] font-medium text-[11px] mb-1 flex items-center justify-between">
                    <span>Complexity Hotspots</span>
                    <span className="text-[10px] text-[#858585]">
                      Top {diagnostics.hotspots.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1 max-h-28 overflow-y-auto tree-scroll">
                    {diagnostics.hotspots.map((hs) => (
                      <div
                        key={hs.id}
                        onClick={() => selectNodeById(hs.id)}
                        className="text-[10px] text-[#cca700] hover:text-[#ffffff] hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded-[2px] cursor-pointer truncate transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{hs.name}</span>
                        <span className="text-[9px] text-[#f14c4c]">CC {hs.complexity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="h-7 px-3 border-t border-[#3e3e42] bg-[#2d2d2d] flex items-center justify-between text-[10px] font-mono text-[#858585]">
        <div className="flex items-center space-x-2">
          <span>
            <strong className="text-[#dcdcaa]">{totalFunctions}</strong> fn
          </span>
          <span>•</span>
          <span>
            <strong className="text-[#4ec9b0]">{totalClasses}</strong> cls
          </span>
        </div>
        <span className="truncate max-w-[90px]">{nodes.length} total</span>
      </div>
    </aside>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import type { AnalysisMode } from '../types';
import {
  PanelLeft,
  PanelRight,
  PanelBottom,
  Search,
  Settings,
  Globe,
  ChevronDown,
  Boxes,
  Crosshair,
  RotateCcw,
  AlertTriangle,
  Play,
  Sparkles,
  LayoutGrid,
  Filter,
  Download,
  FilePlus,
  RefreshCw,
  FolderOpen,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { IrminsulLogo } from './IrminsulLogo';
import { promptNativeFolderChooser } from '../utils/nativeDialog';

type MenuId = 'file' | 'edit' | 'selection' | 'view' | 'go' | 'run' | 'terminal' | 'help' | null;

export const HeaderBar: React.FC = () => {
  const {
    projectPath,
    setProjectPath,
    loadProject,
    nodes,
    edges,
    openSpotlight,
    leftPanelOpen,
    setLeftPanelOpen,
    rightPanelOpen,
    setRightPanelOpen,
    isBottomPanelOpen,
    setIsBottomPanelOpen,
    toggleBottomPanel,
    setBottomPanelTab,
    focusMode,
    toggleFocusMode,
    analysisMode,
    setAnalysisMode,
    depthHops,
    setDepthHops,
    activeLayerFilter,
    setActiveLayerFilter,
    layers,
    selectedNode,
    selectNodeById,
    openSettings,
    openWelcome,
    resetZoom,
    recentProjects,
    saveFile,
    undoResetLayout,
    openRenameModal,
    activeCycles,
    deadFunctions,
    runTerminalCommand,
  } = useExplorer();

  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  const [layerFilterOpen, setLayerFilterOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const layerDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
      if (layerDropdownRef.current && !layerDropdownRef.current.contains(e.target as Node)) {
        setLayerFilterOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const repoName = useMemo(() => {
    if (!projectPath) return 'No Folder Open';
    return projectPath.split(/[\\/]/).filter(Boolean).pop() || 'Workspace';
  }, [projectPath]);

  const activeDocName = selectedNode ? selectedNode.name : 'Architecture Graph';

  const handleOpenFolder = async () => {
    setActiveMenu(null);
    const chosen = await promptNativeFolderChooser(projectPath);
    if (chosen) {
      setProjectPath(chosen);
      await loadProject(chosen);
    }
  };

  const handleNewFile = async () => {
    setActiveMenu(null);
    const fileName = prompt('Enter new Python file name (e.g., utils.py, models/user.py):');
    if (!fileName) return;
    try {
      const initialContent = `"""${fileName}\nCreated in Irminsul IDE.\n"""\n\ndef main():\n    pass\n`;
      const res = await saveFile(fileName, initialContent);
      if (res.success) {
        await loadProject(projectPath, true);
      } else {
        alert('Could not create file: ' + (res.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error creating file: ' + (err.message || err));
    }
  };

  const handleExport = (format: 'json' | 'dot') => {
    setActiveMenu(null);
    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ nodes, edges }, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `irminsul_architecture_${Date.now()}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      let dot = 'digraph G {\n  rankdir=LR;\n  node [shape=box, style=rounded, fontname="Segoe UI"];\n';
      nodes.forEach((n) => {
        dot += `  "${n.id}" [label="${n.name}\\n(${n.kind})"];\n`;
      });
      edges.forEach((e) => {
        dot += `  "${e.source}" -> "${e.target}" [label="${e.type}"];\n`;
      });
      dot += '}\n';
      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(dot);
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `irminsul_architecture_${Date.now()}.dot`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleCycleNext = () => {
    setActiveMenu(null);
    setAnalysisMode('cycles');
    if (activeCycles.length > 0 && activeCycles[0].length > 0) {
      selectNodeById(activeCycles[0][0]);
    }
  };

  const handleDeadCodeNext = () => {
    setActiveMenu(null);
    setAnalysisMode('deadcode');
    if (deadFunctions.length > 0) {
      selectNodeById(deadFunctions[0].id);
    }
  };

  const handleRunAudit = async () => {
    setActiveMenu(null);
    await loadProject(projectPath, true);
    setIsBottomPanelOpen(true);
    setBottomPanelTab('diagnostics');
  };

  const handleRunTests = async () => {
    setActiveMenu(null);
    setIsBottomPanelOpen(true);
    setBottomPanelTab('terminal');
    await runTerminalCommand('python -m unittest discover -s tests');
  };

  const handleCloseWindow = () => {
    setActiveMenu(null);
    const pyApi = (window as any).pywebview?.api;
    if (pyApi?.close_window) {
      pyApi.close_window();
    } else {
      window.close();
    }
  };

  return (
    <header
      ref={menuBarRef}
      className="h-[38px] bg-[#1e1e1e] border-b border-[#333333] px-2 flex items-center justify-between z-[100] select-none font-sans text-xs relative flex-shrink-0"
    >
      {/* LEFT: App Logo + VS Code Menu Bar (File, Edit, Selection, View, Go, Run, Terminal, Help) */}
      <div className="flex items-center space-x-1">
        {/* App Logo */}
        <div
          onClick={openWelcome}
          className="flex items-center px-1.5 py-1 rounded hover:bg-[#2d2d2d] cursor-pointer mr-1 group"
          title="Irminsul IDE - Click for Welcome & Guide"
        >
          <IrminsulLogo className="w-5 h-5 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform" />
        </div>

        {/* 1. FILE MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            onMouseEnter={() => activeMenu && setActiveMenu('file')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'file' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={handleNewFile}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <FilePlus size={13} className="text-[#4ec9b0]" />
                  <span>New Python File...</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+N</span>
              </button>

              <button
                onClick={handleOpenFolder}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={13} className="text-[#007acc]" />
                  <span>Open Folder...</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+O</span>
              </button>

              <button
                onClick={() => {
                  loadProject('sample_project');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-[#cca700]" />
                  <span>Explore Demo Architecture</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Demo</span>
              </button>

              {projectPath ? (
                <button
                  onClick={() => {
                    loadProject('');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={13} className="text-[#858585]" />
                    <span>Close Folder</span>
                  </div>
                  <span className="text-[10px] text-[#858585] font-mono">Ctrl+K F</span>
                </button>
              ) : null}

              {/* Recent projects */}
              <div className="border-t border-[#333333] my-1" />
              <div className="px-3 py-1 text-[10px] text-[#858585] uppercase tracking-wider font-semibold">
                Open Recent Workspace
              </div>
              {recentProjects.slice(0, 4).map((p) => (
                <button
                  key={p.path}
                  onClick={() => {
                    loadProject(p.path);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1 hover:bg-[#094771] hover:text-[#ffffff] text-left text-[11px]"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[9px] text-[#6e6e6e] font-mono">{p.lastOpened}</span>
                </button>
              ))}

              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={() => {
                  loadProject(projectPath, true);
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={13} />
                  <span>Re-analyze Workspace</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">F5</span>
              </button>

              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Download size={13} />
                  <span>Export Architecture (JSON)</span>
                </div>
              </button>

              <button
                onClick={() => handleExport('dot')}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Download size={13} />
                  <span>Export Graph (DOT)</span>
                </div>
              </button>

              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={() => {
                  openSettings();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Settings size={13} />
                  <span>Preferences: Settings</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+,</span>
              </button>

              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={handleCloseWindow}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Close Window</span>
                <span className="text-[10px] text-[#858585] font-mono">Alt+F4</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. EDIT MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            onMouseEnter={() => activeMenu && setActiveMenu('edit')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'edit' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  undoResetLayout();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Undo Layout Move</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+Z</span>
              </button>
              <button
                onClick={() => {
                  openSpotlight();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Find Symbol in Architecture</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+P</span>
              </button>
              <button
                onClick={() => {
                  if (selectedNode) {
                    openRenameModal(selectedNode);
                  } else {
                    openSpotlight();
                  }
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Safe AST Rename Symbol</span>
                <span className="text-[10px] text-[#858585] font-mono">F2</span>
              </button>
              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={() => {
                  resetZoom();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Reset Viewport Zoom</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+0</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. SELECTION MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'selection' ? null : 'selection')}
            onMouseEnter={() => activeMenu && setActiveMenu('selection')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'selection' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Selection
          </button>
          {activeMenu === 'selection' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  setAnalysisMode('default');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>View Full Architecture DAG</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+A</span>
              </button>
              <button
                onClick={() => {
                  setAnalysisMode('impact');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Trace Upstream Callers</span>
                <span className="text-[10px] text-[#858585] font-mono">Impact</span>
              </button>
              <button
                onClick={() => {
                  setAnalysisMode('cycles');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Highlight Circular Import Loops</span>
                <span className="text-[10px] text-[#858585] font-mono">Cycles</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. VIEW MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            onMouseEnter={() => activeMenu && setActiveMenu('view')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'view' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  openSpotlight();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Command Palette...</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+Shift+P</span>
              </button>
              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={() => {
                  setLeftPanelOpen((p) => !p);
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Toggle Primary Sidebar</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+B</span>
              </button>
              <button
                onClick={() => {
                  setRightPanelOpen((p) => !p);
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Toggle Secondary Inspector</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+J</span>
              </button>
              <button
                onClick={() => {
                  toggleBottomPanel();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Toggle Bottom Terminal</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+`</span>
              </button>
              <button
                onClick={() => {
                  toggleFocusMode();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Toggle Focus Mode</span>
                <span className="text-[10px] text-[#858585] font-mono">F11</span>
              </button>
              <div className="border-t border-[#333333] my-1" />
              <button
                onClick={() => {
                  openWelcome();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Welcome & Walkthrough</span>
                <span className="text-[10px] text-[#858585] font-mono">Guide</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. GO MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'go' ? null : 'go')}
            onMouseEnter={() => activeMenu && setActiveMenu('go')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'go' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Go
          </button>
          {activeMenu === 'go' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  openSpotlight();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Go to Symbol...</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+P</span>
              </button>
              <button
                onClick={handleCycleNext}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Go to Next Circular Dependency</span>
                <span className="text-[10px] text-[#858585] font-mono">F8</span>
              </button>
              <button
                onClick={handleDeadCodeNext}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Go to Dead Code Candidate</span>
                <span className="text-[10px] text-[#858585] font-mono">Shift+F8</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. RUN MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'run' ? null : 'run')}
            onMouseEnter={() => activeMenu && setActiveMenu('run')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'run' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Run
          </button>
          {activeMenu === 'run' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={handleRunAudit}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Play size={13} className="text-[#4ec9b0]" />
                  <span>Start Full Architecture Audit</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">F5</span>
              </button>
              <button
                onClick={handleRunTests}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Play size={13} className="text-[#007acc]" />
                  <span>Run Unit Tests in Terminal</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Tests</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. TERMINAL MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'terminal' ? null : 'terminal')}
            onMouseEnter={() => activeMenu && setActiveMenu('terminal')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'terminal' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Terminal
          </button>
          {activeMenu === 'terminal' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  setIsBottomPanelOpen(true);
                  setBottomPanelTab('terminal');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <TerminalIcon size={13} className="text-[#007acc]" />
                  <span>Open Terminal Dock</span>
                </div>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+`</span>
              </button>
              <button
                onClick={() => {
                  setIsBottomPanelOpen(true);
                  setBottomPanelTab('diagnostics');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-[#cca700]" />
                  <span>View Problems &amp; Cycles</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 8. HELP MENU */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
            onMouseEnter={() => activeMenu && setActiveMenu('help')}
            className={`px-2 py-1 rounded text-[12px] transition-colors ${
              activeMenu === 'help' ? 'bg-[#383838] text-[#ffffff]' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 top-[34px] w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs text-[#cccccc]">
              <button
                onClick={() => {
                  openWelcome();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-[#cca700]" />
                  <span>How Everything Works Walkthrough</span>
                </div>
              </button>
              <button
                onClick={() => {
                  openSettings();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>Keyboard Shortcuts Reference</span>
                <span className="text-[10px] text-[#858585] font-mono">Ctrl+,</span>
              </button>
              <div className="border-t border-[#333333] my-1" />
              <a
                href="https://github.com/SHUKLASHRI/irminsul-ide"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>GitHub Repository</span>
                <Globe size={13} />
              </a>
              <button
                onClick={() => {
                  alert('Irminsul IDE v1.0.0\nProfessional Python Architecture & Refactoring Workbench\nNative PyWebView + Monaco Studio + AST Engine.');
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#094771] hover:text-[#ffffff] text-left"
              >
                <span>About Irminsul IDE</span>
                <span className="text-[10px] text-[#858585]">v1.0.0</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Exact VS Code Document Search Pill (repo — Irminsul IDE — activeDoc) */}
      <div className="flex-1 max-w-lg mx-3 flex items-center justify-center">
        <button
          onClick={openSpotlight}
          className="w-full max-w-sm h-[24px] bg-[#252526] hover:bg-[#2d2d2d] border border-[#3e3e42] hover:border-[#007acc] rounded px-3 flex items-center justify-center gap-2 text-[11px] text-[#cccccc] transition-colors shadow-inner group"
          title="Quick Search / Command Palette (Ctrl+P)"
        >
          <Search size={12} className="text-[#858585] group-hover:text-[#007acc] transition-colors flex-shrink-0" />
          <span className="truncate">
            <span className="text-[#ffffff] font-medium">{repoName}</span>
            <span className="text-[#6e6e6e] mx-1">—</span>
            <span className="text-[#007acc] font-medium">Irminsul IDE</span>
            {projectPath ? (
              <>
                <span className="text-[#6e6e6e] mx-1">—</span>
                <span className="text-[#858585] font-mono text-[10px]">{activeDocName}</span>
              </>
            ) : null}
          </span>
        </button>
      </div>

      {/* RIGHT: Analysis Mode Pill, Layer Filter, Panel Toggles, Settings, Profile */}
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        {/* Analysis Mode Segmented Control */}
        <div className="hidden lg:flex items-center bg-[#252526] p-0.5 rounded border border-[#3e3e42]">
          {(
            [
              { id: 'default', label: 'Arch', Icon: Boxes },
              { id: 'impact', label: 'Impact', Icon: Crosshair },
              { id: 'cycles', label: 'Cycles', Icon: RotateCcw },
              { id: 'deadcode', label: 'Dead Code', Icon: AlertTriangle },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = analysisMode === id;
            return (
              <button
                key={id}
                onClick={() => setAnalysisMode(id as AnalysisMode)}
                className={`px-2 py-0.5 rounded text-[11px] font-sans flex items-center gap-1 transition-colors ${
                  active
                    ? 'bg-[#094771] text-[#ffffff] font-medium border border-[#007acc]'
                    : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d] border border-transparent'
                }`}
                title={`Switch to ${label} analysis mode`}
              >
                <Icon size={11} className={active ? 'text-[#007acc]' : ''} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Hops selector (in Impact mode) */}
        {analysisMode === 'impact' && (
          <div className="hidden sm:flex items-center gap-1 bg-[#252526] px-1.5 py-0.5 rounded border border-[#3e3e42] text-[10px] font-mono text-[#858585]">
            <span>Hops:</span>
            {[1, 2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => setDepthHops(d)}
                className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold ${
                  depthHops === d
                    ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                    : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Layer Filter Dropdown */}
        <div className="relative" ref={layerDropdownRef}>
          <button
            onClick={() => setLayerFilterOpen(!layerFilterOpen)}
            className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3e3e42] rounded text-[11px] text-[#cccccc] transition-colors"
            title="Filter by Architectural Tier"
          >
            <Filter size={11} className="text-[#858585]" />
            <span className="capitalize">{activeLayerFilter === 'ALL' ? 'All' : activeLayerFilter}</span>
            <ChevronDown size={10} className="text-[#858585]" />
          </button>
          {layerFilterOpen && (
            <div className="absolute right-0 top-[30px] w-44 bg-[#252526] border border-[#3e3e42] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setActiveLayerFilter('ALL');
                  setLayerFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-1 text-[11px] hover:bg-[#094771] hover:text-[#ffffff] ${
                  activeLayerFilter === 'ALL' ? 'text-[#007acc] font-medium' : 'text-[#cccccc]'
                }`}
              >
                All Layers ({nodes.length})
              </button>
              {Object.entries(layers).map(([layerName, nodeIds]) => (
                <button
                  key={layerName}
                  onClick={() => {
                    setActiveLayerFilter(layerName);
                    setLayerFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1 text-[11px] capitalize hover:bg-[#094771] hover:text-[#ffffff] ${
                    activeLayerFilter === layerName ? 'text-[#007acc] font-medium' : 'text-[#cccccc]'
                  }`}
                >
                  {layerName} ({nodeIds.length})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-3 w-[1px] bg-[#3e3e42]" />

        {/* Panel Toggles */}
        <button
          onClick={() => setLeftPanelOpen((p) => !p)}
          className={`p-1 rounded hover:bg-[#333333] transition-colors ${
            leftPanelOpen ? 'text-[#007acc]' : 'text-[#858585]'
          }`}
          title="Toggle Primary Sidebar (Ctrl+B)"
        >
          <PanelLeft size={14} />
        </button>

        <button
          onClick={toggleBottomPanel}
          className={`p-1 rounded hover:bg-[#333333] transition-colors ${
            isBottomPanelOpen ? 'text-[#007acc]' : 'text-[#858585]'
          }`}
          title="Toggle Bottom Terminal (Ctrl+`)"
        >
          <PanelBottom size={14} />
        </button>

        <button
          onClick={() => setRightPanelOpen((p) => !p)}
          className={`p-1 rounded hover:bg-[#333333] transition-colors ${
            rightPanelOpen ? 'text-[#007acc]' : 'text-[#858585]'
          }`}
          title="Toggle Secondary Inspector (Ctrl+J)"
        >
          <PanelRight size={14} />
        </button>

        <button
          onClick={toggleFocusMode}
          className={`p-1 rounded hover:bg-[#333333] transition-colors ${
            focusMode ? 'text-[#4ec9b0]' : 'text-[#858585]'
          }`}
          title="Toggle Focus / Fullscreen Mode (F11)"
        >
          <LayoutGrid size={14} />
        </button>

        <div className="h-3 w-[1px] bg-[#3e3e42]" />

        {/* Preferences: Settings */}
        <button
          onClick={openSettings}
          className="p-1 rounded text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] transition-colors"
          title="Preferences: Settings (Ctrl+,)"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};

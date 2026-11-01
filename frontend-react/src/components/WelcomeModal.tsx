import React, { useState } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import { IrminsulLogo } from './IrminsulLogo';
import {
  FolderOpen,
  Code2,
  FilePlus,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { promptNativeFolderChooser } from '../utils/nativeDialog';

export const WelcomeModal: React.FC = () => {
  const {
    isWelcomeOpen,
    closeWelcome,
    loadProject,
    recentProjects,
    openSpotlight,
    openSettings,
    saveFile,
    projectPath,
  } = useExplorer();

  const [activeGuideIndex, setActiveGuideIndex] = useState(0);

  if (!isWelcomeOpen) return null;

  const guides = [
    {
      title: '1. Visual AST Architecture Graph',
      tag: 'Core Visualization',
      desc: 'Parses your Python codebase into an interactive dependency graph using the native Python ast engine. Functions and classes are clustered into architectural layers (presentation, services, persistence, utilities).',
      tip: 'Drag nodes to reposition them, scroll to zoom, and click any node to open its source code snippet in the Inspector.',
      action: 'Try clicking any node card on the canvas',
    },
    {
      title: '2. Circular Import Detection (Tarjan SCC)',
      tag: 'Architecture Smell',
      desc: 'Circular dependencies in Python lead to subtle runtime crashes and import order bugs. Irminsul runs Tarjan’s Strongly Connected Components algorithm to instantly highlight cycle loops with glowing neon paths.',
      tip: 'Click "Cycles" in the header or inspector to focus on circular loops and view exactly which module imports are causing the cycle.',
      action: 'Run cycle detection in header bar',
    },
    {
      title: '3. Safe Multi-File AST Refactoring',
      tag: 'Automated Refactor',
      desc: 'Rename functions and classes safely across your entire repository. Unlike dumb text find-and-replace, Irminsul rewrites the Python AST, verifying that callers and definitions are preserved without breaking syntax.',
      tip: 'Select any node on the graph and press F2 (or click Safe Rename in the Inspector) to preview diffs before applying.',
      action: 'Press F2 on any selected function',
    },
    {
      title: '4. Dead Code & Unused Function Detection',
      tag: 'Code Quality',
      desc: 'Identifies unreachable functions and methods that have zero incoming call references in the repository. Helps you clean up legacy cruft safely.',
      tip: 'Switch Analysis Mode to "Dead Code" in the header to filter down to unused function candidates.',
      action: 'Check Dead Code in the header filter',
    },
    {
      title: '5. Integrated Monaco Code Editor',
      tag: 'Code Studio',
      desc: 'Full-featured code editor with syntax highlighting, line numbers, error diagnostics, and direct in-place editing. Save changes with Ctrl+S to trigger immediate live re-analysis.',
      tip: 'Click "Edit Source" on any card or inspector panel to open the code editor with jump-to-line accuracy.',
      action: 'Open source file directly',
    },
    {
      title: '6. Integrated Terminal & Command Runner',
      tag: 'CLI & Tests',
      desc: 'Built-in terminal runner allows executing test suites (pytest, unittest), git commands, and python scripts directly in your project root.',
      tip: 'Press Ctrl+` to toggle the bottom terminal dock.',
      action: 'Press Ctrl+` to toggle terminal',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150 font-sans"
      onClick={closeWelcome}
    >
      <div
        className="w-[960px] max-w-[95vw] h-[640px] max-h-[92vh] bg-[#1e1e1e] border border-[#3e3e42] rounded-md shadow-2xl flex flex-col overflow-hidden text-[#cccccc]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="h-10 bg-[#252526] border-b border-[#3e3e42] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <IrminsulLogo className="w-5 h-5" />
            <span className="text-xs font-semibold text-[#ffffff]">Welcome to Irminsul IDE</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-[#007acc]/20 text-[#007acc] rounded border border-[#007acc]/30 font-mono">
              v1.0.0
            </span>
          </div>
          <button
            onClick={closeWelcome}
            className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] rounded transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-[340px] border-r border-[#3e3e42] p-6 flex flex-col justify-between overflow-y-auto bg-[#1e1e1e]">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#ffffff] tracking-tight mb-1 flex items-center gap-2">
                  <span>Irminsul IDE</span>
                </h2>
                <p className="text-xs text-[#858585] leading-relaxed">
                  Python Architecture Engineering &amp; AST Refactoring Workbench.
                </p>
              </div>

              {/* Start */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-2">
                  Start
                </div>

                <button
                  onClick={async () => {
                    const chosen = await promptNativeFolderChooser();
                    if (chosen) {
                      loadProject(chosen);
                      closeWelcome();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e42] hover:border-[#007acc] text-left transition-colors group"
                >
                  <FolderOpen size={16} className="text-[#007acc] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-medium text-[#ffffff]">Open Folder...</div>
                    <div className="text-[10px] text-[#858585]">Browse and select a Python project folder</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    const filename = prompt('Enter filename for new module (e.g. service.py):', 'module.py');
                    if (filename?.trim()) {
                      const cleanName = filename.trim();
                      const filePath = cleanName.endsWith('.py') ? cleanName : `${cleanName}.py`;
                      await saveFile(filePath, '"""New Python module."""\n\ndef main():\n    pass\n');
                      await loadProject(projectPath, true);
                      closeWelcome();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e42] hover:border-[#007acc] text-left transition-colors group"
                >
                  <FilePlus size={16} className="text-[#4ec9b0] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-medium text-[#ffffff]">New Python File...</div>
                    <div className="text-[10px] text-[#858585]">Create a new Python file in workspace</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeWelcome();
                    openSpotlight();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e42] hover:border-[#007acc] text-left transition-colors group"
                >
                  <Code2 size={16} className="text-[#4ec9b0] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-medium text-[#ffffff]">Quick Open Symbol...</div>
                    <div className="text-[10px] text-[#858585]">Search symbols with Ctrl+P</div>
                  </div>
                </button>
              </div>

              {/* Recent */}
              <div>
                <div className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-2">
                  Recent Projects
                </div>
                <div className="space-y-1">
                  {recentProjects.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => {
                        loadProject(p.path);
                        closeWelcome();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#252526] text-left text-xs transition-colors group"
                    >
                      <div className="truncate pr-2">
                        <div className="text-[#ffffff] group-hover:text-[#007acc] truncate">{p.name}</div>
                        <div className="text-[10px] text-[#858585] font-mono truncate">{p.path}</div>
                      </div>
                      <span className="text-[10px] text-[#6e6e6e] flex-shrink-0">{p.lastOpened}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#333333] flex items-center justify-between text-[11px] text-[#858585]">
              <button onClick={openSettings} className="hover:text-[#ffffff] flex items-center gap-1.5">
                <span>Configure Settings</span>
              </button>
              <span>Press F1 for Help</span>
            </div>
          </div>

          {/* Guide */}
          <div className="flex-1 p-6 flex flex-col bg-[#252526]/50 overflow-y-auto">
            <div className="mb-4">
              <div className="text-xs font-semibold text-[#007acc] uppercase tracking-wider mb-1">
                Walkthrough Guide
              </div>
              <h3 className="text-base font-bold text-[#ffffff]">How Irminsul IDE Works</h3>
              <p className="text-xs text-[#858585] mt-0.5">
                Explore the six pillars of Python architectural analysis and refactoring.
              </p>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {guides.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGuideIndex(idx)}
                  className={`p-2.5 rounded text-left border transition-all ${
                    activeGuideIndex === idx
                      ? 'bg-[#094771] border-[#007acc] text-[#ffffff] shadow-lg'
                      : 'bg-[#1e1e1e] border-[#3e3e42] text-[#858585] hover:text-[#cccccc] hover:border-[#6e6e6e]'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono tracking-wider opacity-75 mb-1">{g.tag}</div>
                  <div className="text-xs font-semibold truncate text-[#ffffff]">{g.title.split('. ')[1]}</div>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] rounded-lg p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 bg-[#007acc]/20 text-[#007acc] rounded border border-[#007acc]/30">
                    {guides[activeGuideIndex].tag}
                  </span>
                  <span className="text-xs text-[#858585]">
                    Step {activeGuideIndex + 1} of {guides.length}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-[#ffffff]">{guides[activeGuideIndex].title}</h4>
                <p className="text-xs text-[#cccccc] leading-relaxed">{guides[activeGuideIndex].desc}</p>

                <div className="p-3 bg-[#252526] border-l-2 border-[#007acc] rounded text-xs text-[#cccccc] space-y-1">
                  <div className="font-semibold text-[#ffffff] text-[11px]">Pro-Tip:</div>
                  <div className="text-[11px] text-[#858585] leading-normal">{guides[activeGuideIndex].tip}</div>
                </div>
              </div>

              {/* Navigation */}
              <div className="pt-6 border-t border-[#333333] flex items-center justify-between">
                <button
                  disabled={activeGuideIndex === 0}
                  onClick={() => setActiveGuideIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded bg-[#252526] hover:bg-[#333333] disabled:opacity-40 disabled:pointer-events-none text-xs text-[#cccccc] transition-colors"
                >
                  Previous
                </button>

                <div className="flex gap-1.5">
                  {guides.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeGuideIndex === i ? 'bg-[#007acc] w-5' : 'bg-[#3e3e42]'
                      }`}
                    />
                  ))}
                </div>

                {activeGuideIndex < guides.length - 1 ? (
                  <button
                    onClick={() => setActiveGuideIndex((prev) => Math.min(guides.length - 1, prev + 1))}
                    className="px-4 py-1.5 rounded bg-[#007acc] hover:bg-[#0098ff] text-xs font-medium text-[#ffffff] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={closeWelcome}
                    className="px-4 py-1.5 rounded bg-[#4ec9b0] hover:bg-[#5cdbbd] text-xs font-medium text-[#1e1e1e] flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    <span>Get Started</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

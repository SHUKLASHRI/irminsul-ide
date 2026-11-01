import React, { useState, useRef, useEffect } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import {
  Terminal as TerminalIcon,
  AlertTriangle,
  FileText,
  X,
  Play,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';

export const BottomPanel: React.FC = () => {
  const {
    isBottomPanelOpen,
    toggleBottomPanel,
    bottomPanelTab,
    setBottomPanelTab,
    terminalHistory,
    isTerminalRunning,
    runTerminalCommand,
    clearTerminal,
    activeCycles,
    deadFunctions,
    diagnostics,
    selectNodeById,
    projectPath,
  } = useExplorer();

  const [inputCommand, setInputCommand] = useState('');
  const [panelHeight, setPanelHeight] = useState(240);
  const [isMaximized, setIsMaximized] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (bottomPanelTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, bottomPanelTab]);

  // Resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 120 && newHeight <= window.innerHeight - 80) {
        setPanelHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isBottomPanelOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isTerminalRunning) return;
    const cmd = inputCommand;
    setInputCommand('');
    runTerminalCommand(cmd);
  };

  const currentHeight = isMaximized ? 'calc(100vh - 75px)' : `${panelHeight}px`;

  return (
    <div
      style={{ height: currentHeight }}
      className="absolute bottom-6 left-0 right-0 z-40 bg-[#1e1e1e] border-t border-[#3e3e42] shadow-2xl flex flex-col font-sans select-none animate-in slide-in-from-bottom-2 duration-150"
    >
      {/* Resizer bar */}
      <div
        onMouseDown={() => (isDragging.current = true)}
        className="h-1.5 w-full bg-transparent hover:bg-[#007acc]/50 cursor-ns-resize transition-colors"
      />

      {/* Panel Tab Header */}
      <div className="h-8 bg-[#252526] border-b border-[#3e3e42] px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBottomPanelTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              bottomPanelTab === 'terminal'
                ? 'bg-[#1e1e1e] text-[#ffffff] font-medium border-t-2 border-[#007acc]'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            <TerminalIcon size={13} className={bottomPanelTab === 'terminal' ? 'text-[#007acc]' : ''} />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setBottomPanelTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              bottomPanelTab === 'diagnostics'
                ? 'bg-[#1e1e1e] text-[#ffffff] font-medium border-t-2 border-[#007acc]'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            <AlertTriangle
              size={13}
              className={activeCycles.length > 0 ? 'text-[#cca700]' : 'text-[#858585]'}
            />
            <span>Problems</span>
            {(activeCycles.length > 0 || deadFunctions.length > 0) && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#cca700]/20 text-[#cca700] rounded-full text-[10px] font-mono">
                {activeCycles.length + deadFunctions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setBottomPanelTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
              bottomPanelTab === 'output'
                ? 'bg-[#1e1e1e] text-[#ffffff] font-medium border-t-2 border-[#007acc]'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
          >
            <FileText size={13} />
            <span>Output</span>
          </button>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center gap-2">
          {bottomPanelTab === 'terminal' && (
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <button
                onClick={() => runTerminalCommand('python -m unittest discover -s tests')}
                disabled={isTerminalRunning}
                className="px-2 py-0.5 bg-[#333333] hover:bg-[#3e3e42] disabled:opacity-50 text-[11px] text-[#cccccc] rounded flex items-center gap-1 transition-colors"
                title="Run test suite"
              >
                <Play size={10} className="text-[#4ec9b0]" />
                <span>Run Tests</span>
              </button>
              <button
                onClick={() => runTerminalCommand('git status')}
                disabled={isTerminalRunning}
                className="px-2 py-0.5 bg-[#333333] hover:bg-[#3e3e42] disabled:opacity-50 text-[11px] text-[#cccccc] rounded transition-colors"
              >
                git status
              </button>
              <button
                onClick={clearTerminal}
                className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] rounded transition-colors"
                title="Clear Terminal"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] rounded transition-colors"
            title={isMaximized ? 'Restore Panel' : 'Maximize Panel'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={toggleBottomPanel}
            className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] rounded transition-colors"
            title="Close Panel (Ctrl+`)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
        {/* TAB 1: TERMINAL */}
        {bottomPanelTab === 'terminal' && (
          <div className="h-full flex flex-col font-mono text-xs">
            {/* Terminal History */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {terminalHistory.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-[#858585] select-text">
                    <span className="text-[#007acc]">irminsul-ide&gt;</span>
                    <span className="text-[#ffffff] font-medium">{item.command}</span>
                    <span className="text-[10px] ml-auto text-[#6e6e6e]">{item.timestamp}</span>
                    {item.exitCode === 0 ? (
                      <span className="text-[10px] text-[#4ec9b0] flex items-center gap-0.5">
                        <CheckCircle size={10} /> 0
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#f14c4c] flex items-center gap-0.5">
                        <AlertCircle size={10} /> {item.exitCode}
                      </span>
                    )}
                  </div>
                  {item.stdout && (
                    <pre className="text-[#cccccc] text-[11px] leading-relaxed whitespace-pre-wrap pl-3 select-text bg-[#252526]/40 p-2 rounded border border-[#333333]">
                      {item.stdout}
                    </pre>
                  )}
                  {item.stderr && (
                    <pre className="text-[#f14c4c] text-[11px] leading-relaxed whitespace-pre-wrap pl-3 select-text bg-[#f14c4c]/10 p-2 rounded border border-[#f14c4c]/20">
                      {item.stderr}
                    </pre>
                  )}
                </div>
              ))}
              {isTerminalRunning && (
                <div className="flex items-center gap-2 text-xs text-[#858585]">
                  <div className="w-3 h-3 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
                  <span>Executing command in project root...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Prompt Input Form */}
            <form
              onSubmit={handleSubmit}
              className="h-9 bg-[#252526] border-t border-[#3e3e42] px-3 flex items-center gap-2"
            >
              <ChevronRight size={14} className="text-[#007acc] flex-shrink-0" />
              <input
                type="text"
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                placeholder="Type a command (e.g. pytest, python script.py, git log -n 5)..."
                disabled={isTerminalRunning}
                className="flex-1 bg-transparent text-xs text-[#ffffff] font-mono focus:outline-none placeholder-[#6e6e6e]"
              />
              <button
                type="submit"
                disabled={isTerminalRunning || !inputCommand.trim()}
                className="px-2.5 py-1 bg-[#007acc] hover:bg-[#0098ff] disabled:opacity-40 text-[#ffffff] rounded text-[11px] transition-colors"
              >
                Run
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PROBLEMS & DIAGNOSTICS */}
        {bottomPanelTab === 'diagnostics' && (
          <div className="h-full overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {activeCycles.length === 0 && deadFunctions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 text-center text-[#858585]">
                <CheckCircle size={28} className="text-[#4ec9b0] mb-2" />
                <div className="font-semibold text-xs text-[#ffffff]">No Architecture Smells Detected</div>
                <p className="text-[11px] mt-0.5">Your project has clean dependency DAG flow with zero circular imports.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCycles.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[#cca700] flex items-center gap-1.5 mb-2">
                      <AlertTriangle size={14} />
                      <span>Circular Dependencies ({activeCycles.length} cycle loops found)</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeCycles.map((cycle, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-[#252526] border border-[#cca700]/30 rounded flex items-center justify-between"
                        >
                          <div className="font-mono text-[11px] text-[#ffffff] flex items-center gap-2 flex-wrap">
                            <span className="text-[#cca700] font-bold">Cycle {idx + 1}:</span>
                            {cycle.map((nodeId, cIdx) => (
                              <React.Fragment key={nodeId}>
                                <button
                                  onClick={() => selectNodeById(nodeId)}
                                  className="text-[#007acc] hover:underline"
                                >
                                  {nodeId}
                                </button>
                                {cIdx < cycle.length - 1 && <span className="text-[#858585]">→</span>}
                              </React.Fragment>
                            ))}
                          </div>
                          <button
                            onClick={() => selectNodeById(cycle[0])}
                            className="px-2 py-0.5 bg-[#cca700]/20 hover:bg-[#cca700]/30 text-[#cca700] rounded text-[10px] font-sans transition-colors"
                          >
                            Inspect Loop
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deadFunctions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[#858585] flex items-center gap-1.5 mb-2">
                      <Activity size={14} />
                      <span>Dead Code Candidates ({deadFunctions.length} unused functions)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {deadFunctions.map((fn) => (
                        <div
                          key={fn.id}
                          onClick={() => selectNodeById(fn.id)}
                          className="p-2 bg-[#252526] border border-[#3e3e42] hover:border-[#007acc] rounded cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono text-xs text-[#ffffff]">{fn.name}</div>
                            <div className="text-[10px] text-[#858585] font-mono truncate">{fn.filename}</div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#333333] text-[#858585] rounded">
                            Line {fn.line}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OUTPUT */}
        {bottomPanelTab === 'output' && (
          <div className="h-full overflow-y-auto p-4 font-mono text-xs text-[#cccccc] space-y-1">
            <div className="text-[#858585]">[Irminsul AST Engine] Project root: {projectPath}</div>
            <div className="text-[#4ec9b0]">[Irminsul AST Engine] Parsed AST modules and dependency DAG successfully.</div>
            <div className="text-[#858585]">
              [Architecture Service] High-res vector render active, Win32 WM_SETICON bound to window.
            </div>
            {diagnostics && (
              <div className="text-[#858585]">
                [Diagnostics] Tracked {Object.keys(diagnostics.coupling_metrics || {}).length} modules with afferent/efferent stability metrics.
              </div>
            )}
            <div className="text-[#007acc]">[Workbench] Ready for user interaction.</div>
          </div>
        )}
      </div>
    </div>
  );
};

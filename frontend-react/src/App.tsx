import React, { useEffect } from 'react';
import { ExplorerProvider, useExplorer } from './context/ExplorerContext';
import { HeaderBar } from './components/HeaderBar';
import { ProjectSidebar } from './components/ProjectSidebar';
import { HeroCanvas } from './components/HeroCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { BottomPanel } from './components/BottomPanel';
import { SafeRenameModal } from './components/SafeRenameModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  AlertCircle,
  AlertTriangle,
  X,
  FolderOpen,
  GitBranch,
} from 'lucide-react';

const IrminsulIdeApp: React.FC = () => {
  const {
    error,
    clearError,
    isLoading,
    loadProject,
    projectPath,
    selectedNode,
    nodes,
    zoom,
    setLeftPanelOpen,
    setRightPanelOpen,
    toggleBottomPanel,
    openSettings,
    minimizeAllPanels,
    apiConnected,
    toasts,
    dismissToast,
  } = useExplorer();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftPanelOpen((prev) => !prev);
      }
      // Toggle inspector
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setRightPanelOpen((prev) => !prev);
      }
      // Toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleBottomPanel();
      }
      // Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
      }
      // Minimize panels
      if (e.key === 'Escape') {
        minimizeAllPanels();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLeftPanelOpen, setRightPanelOpen, toggleBottomPanel, openSettings, minimizeAllPanels]);

  const repoName = projectPath ? (projectPath.split(/[\\/]/).filter(Boolean).pop() || 'Workspace') : 'No Folder Open';

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#1e1e1e] text-[#cccccc] font-sans text-xs antialiased select-none flex flex-col">
      {/* Progress */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#252526] z-[150] overflow-hidden">
          <div className="h-full bg-[#007acc] w-1/3 animate-[pulse_1s_ease-in-out_infinite] translate-x-1/2" />
        </div>
      )}

      {/* Header */}
      <HeaderBar />

      {/* Canvas */}
      <HeroCanvas />

      {/* Panels */}
      <ProjectSidebar />
      <InspectorPanel />
      <BottomPanel />

      {/* Modals */}
      <CommandPaletteModal />
      <SafeRenameModal />
      <SettingsModal />
      <WelcomeModal />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Error notification */}
      {error && (
        <div className="absolute bottom-9 right-4 z-[210] bg-[#252526] border border-[#3e3e42] text-[#cccccc] p-3 rounded-[3px] shadow-2xl flex items-start gap-2.5 max-w-md font-sans animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle size={18} className="text-[#f14c4c] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs text-[#ffffff] mb-0.5">Architecture Analysis Error</div>
            <p className="text-[11px] text-[#858585] font-mono leading-relaxed truncate">{error}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => loadProject(projectPath, true)}
                className="px-2.5 py-1 bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] rounded-[2px] text-[11px] font-sans transition-colors"
              >
                Retry
              </button>
              <button
                onClick={clearError}
                className="px-2.5 py-1 bg-[#333333] hover:bg-[#3e3e42] text-[#cccccc] hover:text-[#ffffff] rounded-[2px] text-[11px] font-sans transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button onClick={clearError} className="text-[#858585] hover:text-[#cccccc] p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Status bar */}
      <footer className="absolute bottom-0 left-0 right-0 h-6 bg-[#007acc] text-[#ffffff] px-2.5 flex items-center justify-between text-[11px] z-40 select-none font-sans">
        {/* Left items */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer">
            <FolderOpen size={13} />
            <span className="font-medium font-mono">{repoName}</span>
          </div>

          <div className="flex items-center space-x-1 hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer">
            <GitBranch size={13} />
            <span>main</span>
          </div>

          <div className="flex items-center space-x-1.5 hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer">
            <AlertCircle size={13} />
            <span>0</span>
            <AlertTriangle size={13} className="ml-1" />
            <span>{error ? '1' : '0'}</span>
          </div>

          {isLoading && (
            <div className="flex items-center space-x-1 text-[#e0e0e0]">
              <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px]">Analyzing AST...</span>
            </div>
          )}
        </div>

        {/* Center breadcrumb */}
        {selectedNode && (
          <div className="hidden md:flex items-center space-x-1 text-[11px] font-mono opacity-90 truncate max-w-sm">
            <span>{selectedNode.filename}</span>
            <span>&gt;</span>
            <span className="font-semibold">{selectedNode.name}()</span>
          </div>
        )}

        {/* Right items */}
        <div className="flex items-center space-x-3">
          <span className="hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer font-mono">
            {nodes.length} symbols
          </span>
          <span className="hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer font-mono">
            Python 3.x
          </span>
          <span className="hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer font-mono">
            UTF-8
          </span>
          <span className="hover:bg-[#094771] px-1 py-0.5 rounded cursor-pointer font-mono">
            Zoom {Math.round(zoom * 100)}%
          </span>
          <div
            className={`w-2 h-2 rounded-full ${
              apiConnected ? 'bg-[#4ec9b0]' : 'bg-[#cca700] animate-pulse'
            }`}
            title={apiConnected ? 'Backend Connected' : 'Connecting to Backend'}
          />
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ExplorerProvider>
        <IrminsulIdeApp />
      </ExplorerProvider>
    </ErrorBoundary>
  );
}

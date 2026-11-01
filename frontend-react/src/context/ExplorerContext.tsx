import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  GraphNode,
  GraphEdge,
  AnalysisSummary,
  AnalyzeResponse,
  SourceResponse,
  ImpactResponse,
  DeadFunction,
  AnalysisMode,
  LayoutAlgorithm,
  SidebarTab,
  ProjectModule,
  ProjectDiagnostics,
  ProjectMeta,
  CardDensity,
  ToastNotification,
  IDESettings,
  TerminalTab,
  TerminalHistoryItem,
  RecentProject,
} from '../types';
import * as api from '../api/client';

interface ExplorerContextType {
  projectPath: string;
  setProjectPath: (p: string) => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  modules: ProjectModule[];
  layers: Record<string, string[]>;
  diagnostics: ProjectDiagnostics | null;
  projectMeta: ProjectMeta | null;
  summary: AnalysisSummary | null;
  selectedNode: GraphNode | null;
  sourceSnippet: SourceResponse | null;
  impact: ImpactResponse | null;
  analysisMode: AnalysisMode;
  setAnalysisMode: (m: AnalysisMode) => void;
  layoutAlgorithm: LayoutAlgorithm;
  toggleLayoutAlgorithm: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarWidth: number;
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
  inspectorCollapsed: boolean;
  toggleInspector: () => void;
  inspectorWidth: number;
  setInspectorWidth: React.Dispatch<React.SetStateAction<number>>;
  focusMode: boolean;
  toggleFocusMode: () => void;
  isEditorFocused: boolean;
  setIsEditorFocused: (f: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (t: SidebarTab) => void;
  zoom: number;
  adjustZoom: (delta: number) => void;
  resetZoom: () => void;
  panActive: boolean;
  togglePan: () => void;
  depthHops: number;
  setDepthHops: (h: number) => void;
  activeCycles: string[][];
  deadFunctions: DeadFunction[];
  isLoading: boolean;
  isLoadingSource: boolean;
  error: string | null;
  clearError: () => void;
  sourceError: string | null;
  retrySourceSnippet: () => void;
  isSpotlightOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  renameModalNode: GraphNode | null;
  openRenameModal: (node: GraphNode) => void;
  closeRenameModal: () => void;
  apiConnected: boolean;

  // View state
  cardDensity: CardDensity;
  setCardDensity: (d: CardDensity) => void;
  activeLayerFilter: string;
  setActiveLayerFilter: (l: string) => void;

  // Toasts
  toasts: ToastNotification[];
  showToast: (t: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;
  hasCustomPositions: boolean;
  undoResetLayout: () => void;

  // Layout
  nodeCustomPositions: Record<string, { x: number; y: number }>;
  updateNodePosition: (id: string, pos: { x: number; y: number }) => void;
  resetNodePositions: () => void;
  leftPanelOpen: boolean;
  setLeftPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  leftPanelHovered: boolean;
  setLeftPanelHovered: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightPanelHovered: boolean;
  setRightPanelHovered: (v: boolean) => void;
  minimizeAllPanels: () => void;

  // Settings
  settings: IDESettings;
  updateSettings: (s: Partial<IDESettings>) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Welcome
  isWelcomeOpen: boolean;
  openWelcome: () => void;
  closeWelcome: () => void;

  // Terminal
  isBottomPanelOpen: boolean;
  setIsBottomPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleBottomPanel: () => void;
  bottomPanelTab: TerminalTab;
  setBottomPanelTab: (t: TerminalTab) => void;
  terminalHistory: TerminalHistoryItem[];
  isTerminalRunning: boolean;
  runTerminalCommand: (cmd: string) => Promise<void>;
  clearTerminal: () => void;

  // Recent
  recentProjects: RecentProject[];
  addToRecentProjects: (path: string) => void;

  // Operations
  loadProject: (path?: string, forceRefresh?: boolean) => Promise<void>;
  selectNodeById: (nodeId: string) => void;
  selectNode: (node: GraphNode | null) => void;
  handleRenameSuccess: (data: any) => void;
  saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string; syntax_error?: any }>;
}

const ExplorerContext = createContext<ExplorerContextType | null>(null);

export const ExplorerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [projectPath, setProjectPath] = useState<string>('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [layers, setLayers] = useState<Record<string, string[]>>({});
  const [diagnostics, setDiagnostics] = useState<ProjectDiagnostics | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [sourceSnippet, setSourceSnippet] = useState<SourceResponse | null>(null);
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [analysisMode, setAnalysisModeState] = useState<AnalysisMode>('default');
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<LayoutAlgorithm>('Sugiyama');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [inspectorCollapsed, setInspectorCollapsed] = useState<boolean>(false);
  const [inspectorWidth, setInspectorWidth] = useState<number>(380);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [isEditorFocused, setIsEditorFocused] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');
  const [zoom, setZoom] = useState<number>(1.0);
  const [panActive, setPanActive] = useState<boolean>(false);
  const [depthHops, setDepthHops] = useState<number>(2);
  const [activeCycles, setActiveCycles] = useState<string[][]>([]);
  const [deadFunctions, setDeadFunctions] = useState<DeadFunction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(false);
  const [renameModalNode, setRenameModalNode] = useState<GraphNode | null>(null);
  const [nodeCustomPositions, setNodeCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [previousPositions, setPreviousPositions] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [leftPanelHovered, setLeftPanelHovered] = useState<boolean>(false);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [rightPanelHovered, setRightPanelHovered] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [cardDensity, setCardDensity] = useState<CardDensity>('standard');
  const [activeLayerFilter, setActiveLayerFilter] = useState<string>('ALL');

  // Settings
  const [settings, setSettings] = useState<IDESettings>(() => {
    try {
      const saved = localStorage.getItem('irminsul_settings');
      if (saved) return { ...JSON.parse(saved) };
    } catch {}
    return {
      editorFontSize: 13,
      editorTabSize: 4,
      editorWordWrap: true,
      editorMinimap: true,
      editorLineNumbers: true,
      graphAutoLayout: true,
      graphPhysics: true,
      graphAlgorithm: 'Radial',
      graphCardDensity: 'standard',
      graphNodeSpacing: 60,
      analysisCycleCheck: true,
      analysisDeadCode: true,
      analysisPythonTarget: '3.12',
      theme: 'vs-dark',
    };
  });

  const updateSettings = useCallback((updates: Partial<IDESettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('irminsul_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(false);

  // Terminal
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState<boolean>(false);
  const [bottomPanelTab, setBottomPanelTab] = useState<TerminalTab>('terminal');
  const [terminalHistory, setTerminalHistory] = useState<TerminalHistoryItem[]>(() => [
    {
      id: 'init-1',
      command: 'echo "Irminsul IDE v1.0.0 Ready"',
      stdout: 'Irminsul IDE v1.0.0 [Production Mode - AST Python Engine Connected]\nType any terminal or python command below or click quick actions.\n',
      stderr: '',
      exitCode: 0,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isTerminalRunning, setIsTerminalRunning] = useState<boolean>(false);

  const runTerminalCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim()) return;
      setIsTerminalRunning(true);
      try {
        const res = await api.executeTerminalCommand(cmd, projectPath);
        const item: TerminalHistoryItem = {
          id: `cmd-${Date.now()}`,
          command: cmd,
          stdout: res.stdout || '',
          stderr: res.stderr || '',
          exitCode: res.exit_code,
          timestamp: new Date().toLocaleTimeString(),
        };
        setTerminalHistory((prev) => [...prev, item]);
      } catch (err: any) {
        const item: TerminalHistoryItem = {
          id: `cmd-${Date.now()}`,
          command: cmd,
          stdout: '',
          stderr: err.message || err.error || 'Execution failed',
          exitCode: 1,
          timestamp: new Date().toLocaleTimeString(),
        };
        setTerminalHistory((prev) => [...prev, item]);
      } finally {
        setIsTerminalRunning(false);
      }
    },
    [projectPath]
  );

  const clearTerminal = useCallback(() => {
    setTerminalHistory([]);
  }, []);

  // Recent
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      const saved = localStorage.getItem('irminsul_recent');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addToRecentProjects = useCallback((p: string) => {
    if (!p) return;
    const name = p.split(/[\\/]/).filter(Boolean).pop() || p;
    setRecentProjects((prev) => {
      const filtered = prev.filter((item) => item.path !== p);
      const next = [{ path: p, name, lastOpened: 'Just now' }, ...filtered.slice(0, 7)];
      try {
        localStorage.setItem('irminsul_recent', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const showToast = useCallback((t: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastNotification = { id, ...t };
    setToasts((prev) => [...prev.slice(-3), newToast]);
    const duration = t.duration || 4500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Cache
  const sourceCache = useRef<Map<string, SourceResponse>>(new Map());
  const impactCache = useRef<Map<string, ImpactResponse>>(new Map());
  const fetchTimeoutRef = useRef<any>(null);

  const clearError = useCallback(() => setError(null), []);

  // Health check
  useEffect(() => {
    api.checkHealth().then((ok) => setApiConnected((prev) => (prev === ok ? prev : ok)));
    const interval = setInterval(() => {
      api.checkHealth().then((ok) => setApiConnected((prev) => (prev === ok ? prev : ok)));
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
      if (e.key === 'F2' && selectedNode) {
        e.preventDefault();
        setRenameModalNode(selectedNode);
      }
      if (e.key === 'Escape') {
        setIsSpotlightOpen(false);
        setRenameModalNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  // Project load
  const loadProject = useCallback(
    async (customPath?: string, forceRefresh = false) => {
      const targetPath = customPath !== undefined ? customPath : projectPath;
      if (!targetPath || !targetPath.trim()) {
        setProjectPath('');
        setNodes([]);
        setEdges([]);
        setModules([]);
        setLayers({});
        setDiagnostics(null);
        setProjectMeta(null);
        setSummary(null);
        setSelectedNode(null);
        setActiveCycles([]);
        setDeadFunctions([]);
        try {
          localStorage.removeItem('irminsul_last_workspace');
        } catch {}
        return;
      }

      setIsLoading(true);
      setError(null);
      sourceCache.current.clear();
      impactCache.current.clear();

      try {
        const data: AnalyzeResponse = await api.analyzeProject(targetPath, forceRefresh);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setSummary(data.summary || null);
        if (data.modules) setModules(data.modules);
        if (data.layers) setLayers(data.layers);
        if (data.diagnostics) setDiagnostics(data.diagnostics);
        if (data.project) setProjectMeta(data.project);

        if (data.diagnostics?.cycles) {
          setActiveCycles(data.diagnostics.cycles);
        }
        if (data.diagnostics?.dead_functions) {
          setDeadFunctions(data.diagnostics.dead_functions);
        }

        if (customPath && customPath !== projectPath) {
          setProjectPath(customPath);
          addToRecentProjects(customPath);
          try {
            localStorage.setItem('irminsul_last_workspace', customPath);
          } catch {}
        }

        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        } else {
          setSelectedNode(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to analyze project AST');
      } finally {
        setIsLoading(false);
      }
    },
    [projectPath, addToRecentProjects]
  );

  // Node details
  const fetchNodeDetails = useCallback((node: GraphNode, immediate = false) => {
    const srcKey = `${node.file}:${node.line}`;
    const cachedSrc = sourceCache.current.get(srcKey);
    const cachedImpact = impactCache.current.get(node.id);

    if (cachedSrc && cachedImpact) {
      setSourceSnippet(cachedSrc);
      setImpact(cachedImpact);
      setSourceError(null);
      setIsLoadingSource(false);
      return;
    }

    if (cachedSrc) setSourceSnippet(cachedSrc);
    if (cachedImpact) setImpact(cachedImpact);

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    const executeFetch = () => {
      setIsLoadingSource(true);
      setSourceError(null);

      const promises: [Promise<any>, Promise<any>] = [
        cachedSrc ? Promise.resolve(cachedSrc) : api.fetchSourceSnippet(node.file, node.line),
        cachedImpact ? Promise.resolve(cachedImpact) : api.analyzeImpact(node.id),
      ];

      Promise.allSettled(promises).then(([srcRes, impactRes]) => {
        if (srcRes.status === 'fulfilled') {
          sourceCache.current.set(srcKey, srcRes.value);
          setSourceSnippet(srcRes.value);
        } else if (!cachedSrc) {
          setSourceSnippet(null);
          setSourceError(srcRes.reason?.message || 'Could not load source code');
        }
        if (impactRes.status === 'fulfilled') {
          impactCache.current.set(node.id, impactRes.value);
          setImpact(impactRes.value);
        } else if (!cachedImpact) {
          setImpact(null);
        }
        setIsLoadingSource(false);
      });
    };

    if (immediate) {
      executeFetch();
    } else {
      fetchTimeoutRef.current = setTimeout(executeFetch, 120);
    }
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      setSourceSnippet(null);
      setSourceError(null);
      setImpact(null);
      return;
    }
    fetchNodeDetails(selectedNode);
  }, [selectedNode, fetchNodeDetails]);

  const retrySourceSnippet = useCallback(() => {
    if (selectedNode) {
      const srcKey = `${selectedNode.file}:${selectedNode.line}`;
      sourceCache.current.delete(srcKey);
      impactCache.current.delete(selectedNode.id);
      fetchNodeDetails(selectedNode, true);
    }
  }, [selectedNode, fetchNodeDetails]);

  const selectNodeById = useCallback(
    (nodeId: string) => {
      const found = nodes.find((n) => n.id === nodeId || n.name === nodeId);
      if (found) {
        setSelectedNode(found);
      }
    },
    [nodes]
  );

  const setAnalysisMode = useCallback(
    async (mode: AnalysisMode) => {
      setAnalysisModeState(mode);
      if (mode === 'cycles' && activeCycles.length === 0) {
        try {
          const res = await api.detectCircularDeps(projectPath);
          setActiveCycles(res.cycles || []);
        } catch (e) {
          console.error(e);
        }
      } else if (mode === 'deadcode' && deadFunctions.length === 0) {
        try {
          const res = await api.detectDeadCode(projectPath);
          setDeadFunctions(res.dead_functions || []);
        } catch (e) {
          console.error(e);
        }
      }
    },
    [activeCycles.length, deadFunctions.length, projectPath]
  );

  const adjustZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.4, Number((prev + delta).toFixed(2))), 2.2));
  }, []);

  const resetZoom = useCallback(() => setZoom(1.0), []);
  const togglePan = useCallback(() => setPanActive((prev) => !prev), []);
  const toggleLayoutAlgorithm = useCallback(() => {
    setLayoutAlgorithm((prev) => (prev === 'Sugiyama' ? 'Force-Directed' : 'Sugiyama'));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
  const toggleInspector = useCallback(() => setInspectorCollapsed((prev) => !prev), []);
  const toggleFocusMode = useCallback(() => setFocusMode((prev) => !prev), []);

  const updateNodePosition = useCallback((id: string, pos: { x: number; y: number }) => {
    setNodeCustomPositions((prev) => ({ ...prev, [id]: pos }));
  }, []);

  const hasCustomPositions = Object.keys(nodeCustomPositions).length > 0;

  const undoResetLayout = useCallback(() => {
    if (previousPositions) {
      setNodeCustomPositions(previousPositions);
      setPreviousPositions(null);
      showToast({ type: 'success', message: 'Restored previous canvas layout positions.' });
    }
  }, [previousPositions, showToast]);

  const resetNodePositions = useCallback(() => {
    if (Object.keys(nodeCustomPositions).length > 0) {
      setPreviousPositions(nodeCustomPositions);
    }
    setNodeCustomPositions({});
    showToast({
      type: 'info',
      message: 'Layout auto-arranged into semantic columns.',
      actionLabel: 'Undo',
      onAction: () => undoResetLayout(),
    });
  }, [nodeCustomPositions, showToast, undoResetLayout]);

  const minimizeAllPanels = useCallback(() => {
    setLeftPanelOpen(false);
    setRightPanelOpen(false);
    setLeftPanelHovered(false);
    setRightPanelHovered(false);
  }, []);

  const handleRenameSuccess = useCallback(
    (data: any) => {
      sourceCache.current.clear();
      impactCache.current.clear();
      if (data.nodes && data.edges) {
        setNodes(data.nodes);
        setEdges(data.edges);
        if (data.summary) setSummary(data.summary);
      } else {
        loadProject();
      }
      setRenameModalNode(null);
      showToast({ type: 'success', message: 'Symbol successfully renamed across project files.' });
    },
    [loadProject, showToast]
  );

  const saveFile = useCallback(
    async (filePath: string, content: string) => {
      try {
        const res = await api.saveFileContent(filePath, content, projectPath);
        if (res.project_map) {
          setNodes(res.project_map.nodes || []);
          setEdges(res.project_map.edges || []);
          setModules(res.project_map.modules || []);
          setLayers(res.project_map.layers || {});
          setDiagnostics(res.project_map.diagnostics || null);
          setSummary(res.project_map.summary || null);
        }
        sourceCache.current.clear();
        impactCache.current.clear();
        showToast({ message: res.message || 'File saved successfully', type: 'success' });
        return { success: true };
      } catch (err: any) {
        const errorMsg = err.error || err.message || 'Failed to save file';
        showToast({ message: errorMsg, type: 'error' });
        return { success: false, error: errorMsg, syntax_error: err.syntax_error };
      }
    },
    [projectPath, showToast]
  );

  return (
    <ExplorerContext.Provider
      value={{
        projectPath,
        setProjectPath,
        nodes,
        edges,
        modules,
        layers,
        diagnostics,
        projectMeta,
        summary,
        selectedNode,
        sourceSnippet,
        impact,
        analysisMode,
        setAnalysisMode,
        layoutAlgorithm,
        toggleLayoutAlgorithm,
        sidebarCollapsed,
        toggleSidebar,
        sidebarWidth,
        setSidebarWidth,
        inspectorCollapsed,
        toggleInspector,
        inspectorWidth,
        setInspectorWidth,
        focusMode,
        toggleFocusMode,
        isEditorFocused,
        setIsEditorFocused,
        sidebarTab,
        setSidebarTab,
        zoom,
        adjustZoom,
        resetZoom,
        panActive,
        togglePan,
        depthHops,
        setDepthHops,
        activeCycles,
        deadFunctions,
        isLoading,
        isLoadingSource,
        error,
        clearError,
        sourceError,
        retrySourceSnippet,
        isSpotlightOpen,
        openSpotlight: () => setIsSpotlightOpen(true),
        closeSpotlight: () => setIsSpotlightOpen(false),
        renameModalNode,
        openRenameModal: setRenameModalNode,
        closeRenameModal: () => setRenameModalNode(null),
        apiConnected,

        // View
        cardDensity,
        setCardDensity,
        activeLayerFilter,
        setActiveLayerFilter,

        // Toasts
        toasts,
        showToast,
        dismissToast,
        hasCustomPositions,
        undoResetLayout,

        // Layout
        nodeCustomPositions,
        updateNodePosition,
        resetNodePositions,
        leftPanelOpen,
        setLeftPanelOpen,
        leftPanelHovered,
        setLeftPanelHovered,
        rightPanelOpen,
        setRightPanelOpen,
        rightPanelHovered,
        setRightPanelHovered,
        minimizeAllPanels,

        // Settings
        settings,
        updateSettings,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),

        // Welcome
        isWelcomeOpen,
        openWelcome: () => setIsWelcomeOpen(true),
        closeWelcome: () => setIsWelcomeOpen(false),

        // Terminal
        isBottomPanelOpen,
        setIsBottomPanelOpen,
        toggleBottomPanel: () => setIsBottomPanelOpen((prev) => !prev),
        bottomPanelTab,
        setBottomPanelTab,
        terminalHistory,
        isTerminalRunning,
        runTerminalCommand,
        clearTerminal,

        // Recent
        recentProjects,
        addToRecentProjects,

        // Actions
        loadProject,
        selectNodeById,
        selectNode: setSelectedNode,
        handleRenameSuccess,
        saveFile,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
};

export const useExplorer = () => {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error('useExplorer must be used within an ExplorerProvider');
  return ctx;
};

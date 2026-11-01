import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import type { GraphNode } from '../types';
import {
  RotateCcw,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  GripVertical,
  AlertCircle,
  FolderOpen,
  LayoutGrid,
  LayoutList,
  FileText,
} from 'lucide-react';
import { IrminsulLogo } from './IrminsulLogo';
import { promptNativeFolderChooser } from '../utils/nativeDialog';

// Edge path
function computeEdgePath(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  w: number = 220,
  h: number = 74
): string {
  const horizontalOverlapThreshold = 50;

  // Forward
  if (targetPos.x >= sourcePos.x + horizontalOverlapThreshold) {
    const startX = sourcePos.x + w;
    const startY = sourcePos.y + h / 2;
    const endX = targetPos.x;
    const endY = targetPos.y + h / 2;
    const dx = endX - startX;
    const dist = Math.max(Math.min(dx * 0.5, 160), 35);
    const cp1X = startX + dist;
    const cp1Y = startY;
    const cp2X = endX - dist;
    const cp2Y = endY;
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  }

  // Backward
  if (sourcePos.x >= targetPos.x + w + horizontalOverlapThreshold) {
    const startX = sourcePos.x;
    const startY = sourcePos.y + h / 2;
    const endX = targetPos.x + w;
    const endY = targetPos.y + h / 2;
    const dx = startX - endX;
    const dist = Math.max(Math.min(dx * 0.5, 160), 35);
    const cp1X = startX - dist;
    const cp1Y = startY;
    const cp2X = endX + dist;
    const cp2Y = endY;
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  }

  // Vertical
  if (targetPos.y >= sourcePos.y) {
    const startX = sourcePos.x + w / 2;
    const startY = sourcePos.y + h;
    const endX = targetPos.x + w / 2;
    const endY = targetPos.y;
    const dy = endY - startY;
    const dist = Math.max(Math.min(dy * 0.4, 120), 20);
    const cp1X = startX;
    const cp1Y = startY + dist;
    const cp2X = endX;
    const cp2Y = endY - dist;
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  } else {
    const startX = sourcePos.x + w / 2;
    const startY = sourcePos.y;
    const endX = targetPos.x + w / 2;
    const endY = targetPos.y + h;
    const dy = startY - endY;
    const dist = Math.max(Math.min(dy * 0.4, 120), 20);
    const cp1X = startX;
    const cp1Y = startY - dist;
    const cp2X = endX;
    const cp2Y = endY + dist;
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
  }
}

interface EdgeItemProps {
  id: string;
  d: string;
  isEdgeActive: boolean;
  isCycle: boolean;
}

const EdgeItem = React.memo<EdgeItemProps>(({ d, isEdgeActive, isCycle }) => {
  let strokeColor = '#454545';
  let strokeWidth = 1.2;
  let marker = 'url(#arrow-default)';
  let dashClass = '';

  if (isCycle) {
    strokeColor = '#cca700';
    strokeWidth = 2.0;
    marker = 'url(#arrow-cycle)';
    dashClass = 'cycle-cable';
  } else if (isEdgeActive) {
    strokeColor = '#007acc';
    strokeWidth = 1.8;
    marker = 'url(#arrow-active)';
    dashClass = 'flow-cable';
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      className={dashClass}
      markerEnd={marker}
    />
  );
});

interface NodeCardProps {
  node: GraphNode;
  pos: { x: number; y: number };
  isSelected: boolean;
  isConnected: boolean;
  isDead: boolean;
  isDragging: boolean;
  isLayerActive: boolean;
  cardDensity: 'compact' | 'standard' | 'detailed';
  currentCardWidth: number;
  currentCardHeight: number;
  onMouseDown: (e: React.MouseEvent, node: GraphNode) => void;
}

const NodeCard = React.memo<NodeCardProps>(({
  node,
  pos,
  isSelected,
  isConnected,
  isDead,
  isDragging,
  isLayerActive,
  cardDensity,
  currentCardWidth,
  currentCardHeight,
  onMouseDown,
}) => {
  const isClass = node.kind === 'class';

  let borderClass = 'border-[#3e3e42] hover:border-[#686868]';
  let bgClass = 'bg-[#252526]';
  let glowClass = '';
  let zIndexClass = 'z-10';

  if (isDragging) {
    borderClass = 'border-[#007acc] ring-2 ring-[#007acc] shadow-2xl';
    bgClass = 'bg-[#203246]';
    zIndexClass = 'z-40';
  } else if (isSelected) {
    // Selection
    borderClass = 'border-[#007acc] ring-2 ring-[#007acc] shadow-xl';
    bgClass = 'bg-[#203246]';
    glowClass = 'node-selected-glow';
    zIndexClass = 'z-30';
  } else if (isConnected) {
    borderClass = 'border-[#007acc]/75 shadow-md';
    bgClass = 'bg-[#222a33]';
    glowClass = 'node-connected-glow';
    zIndexClass = 'z-20';
  } else if (isDead) {
    borderClass = 'border-[#f14c4c]';
    bgClass = 'bg-[#2b2020]';
  }

  if (isLayerActive && !isSelected && !isConnected) {
    borderClass = 'border-[#007acc]/50 hover:border-[#007acc]';
  }

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, node)}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        width: `${currentCardWidth}px`,
        height: `${currentCardHeight}px`,
        willChange: isDragging ? 'transform' : 'auto',
      }}
      className={`absolute top-0 left-0 rounded-[3px] border cursor-grab active:cursor-grabbing select-none shadow-md pointer-events-auto flex flex-col justify-between overflow-hidden opacity-100 ${
        isDragging
          ? 'transition-none'
          : 'transition-colors duration-150'
      } ${zIndexClass} ${glowClass} ${
        cardDensity === 'compact' ? 'px-2 py-1.5' : 'p-2.5'
      } ${borderClass} ${bgClass}`}
    >
      {cardDensity === 'compact' ? (
        <div className="flex items-center justify-between pointer-events-none gap-1.5 w-full h-full">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`text-[8px] font-mono px-1 py-0.2 rounded-[2px] uppercase font-bold tracking-wider ${
                isClass
                  ? 'bg-[#203330] text-[#4ec9b0] border border-[#2a4e48]'
                  : 'bg-[#333220] text-[#dcdcaa] border border-[#4d4a2a]'
              }`}
            >
              {isClass ? 'C' : 'fn'}
            </span>
            <span
              className={`font-mono text-xs font-semibold truncate ${
                isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'
              }`}
            >
              {node.name}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#858585] flex-shrink-0">
            L{node.line}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1 pointer-events-none gap-1">
            <div className="flex items-center gap-1">
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded-[2px] uppercase font-semibold tracking-wider ${
                  isClass
                    ? 'bg-[#203330] text-[#4ec9b0] border border-[#2a4e48]'
                    : 'bg-[#333220] text-[#dcdcaa] border border-[#4d4a2a]'
                }`}
              >
                {isClass ? 'class' : node.is_async ? 'async fn' : 'fn'}
              </span>
              {node.tier && (
                <span className="text-[8px] font-mono px-1 py-0.2 rounded-[2px] bg-[#1e1e1e] text-[#858585] uppercase border border-[#3e3e42]">
                  {node.tier}
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#858585] truncate max-w-[90px]">
              {node.filename}
            </span>
          </div>

          <div className="font-mono text-xs font-semibold truncate flex items-center justify-between pointer-events-none">
            <div className="truncate">
              <span className={isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'}>
                {node.name}
              </span>
              <span className="text-[#858585] font-normal">()</span>
            </div>
            <GripVertical
              size={13}
              className="text-[#858585] opacity-0 group-hover:opacity-100 flex-shrink-0"
            />
          </div>

          {cardDensity === 'detailed' && node.docstring && (
            <div className="text-[10px] font-mono text-[#6a9955] italic truncate max-w-full my-0.5 opacity-90 pointer-events-none">
              "{node.docstring.split('\n')[0].slice(0, 38)}..."
            </div>
          )}

          <div className="mt-1 pt-1 border-t border-[#3e3e42] flex items-center justify-between text-[10px] font-mono text-[#858585] pointer-events-none">
            <span>L{node.line}</span>
            <div className="flex items-center gap-1.5">
              {node.cyclomatic_complexity !== undefined && node.cyclomatic_complexity !== null && (
                <span
                  className={`text-[9px] px-1 rounded-[2px] font-semibold ${
                    node.complexity_rating === 'low'
                      ? 'text-[#4ec9b0] bg-[#203330]'
                      : node.complexity_rating === 'moderate'
                      ? 'text-[#cca700] bg-[#333020]'
                      : 'text-[#f14c4c] bg-[#332020]'
                  }`}
                >
                  CC {node.cyclomatic_complexity}
                </span>
              )}
              {Array.isArray(node.parameters) && node.parameters.length > 0 && (
                <span className="text-[#858585]">
                  {node.parameters.length}p
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export const HeroCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNode,
    selectNode,
    analysisMode,
    zoom,
    adjustZoom,
    resetZoom,
    panActive,
    togglePan,
    depthHops,
    activeCycles,
    deadFunctions,
    focusMode,
    toggleFocusMode,
    isEditorFocused,
    nodeCustomPositions,
    updateNodePosition,
    resetNodePositions,
    hasCustomPositions,
    cardDensity,
    setCardDensity,
    activeLayerFilter,
    minimizeAllPanels,
    isLoading,
    error,
    loadProject,
    projectPath,
  } = useExplorer();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Positions
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>(
    nodeCustomPositions
  );

  useEffect(() => {
    setLocalPositions(nodeCustomPositions);
  }, [nodeCustomPositions]);

  // Pan
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const hasMovedPan = useRef(false);
  const clickStartPos = useRef({ x: 0, y: 0 });
  const [isCurrentlyPanning, setIsCurrentlyPanning] = useState(false);

  // Dragging
  const dragInfo = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const nodeRafId = useRef<number | null>(null);
  const panRafId = useRef<number | null>(null);
  const nextPanOffset = useRef<{ x: number; y: number } | null>(null);
  const [activeDraggingId, setActiveDraggingId] = useState<string | null>(null);

  // Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const currentCardWidth = cardDensity === 'compact' ? 190 : cardDensity === 'detailed' ? 240 : 220;
  const currentCardHeight = cardDensity === 'compact' ? 34 : cardDensity === 'detailed' ? 104 : 74;

  // Base layout
  const baseNodePositions = useMemo(() => {
    const posMap = new Map<string, { x: number; y: number }>();
    if (nodes.length === 0) return posMap;

    const tier0: GraphNode[] = [];
    const tier1: GraphNode[] = [];
    const tier2: GraphNode[] = [];
    const tier3: GraphNode[] = [];

    nodes.forEach((n) => {
      const filename = (n.filename || '').toLowerCase();
      const name = (n.name || '').toLowerCase();

      if (name === 'main' || filename.includes('main') || name.includes('entry')) {
        tier0.push(n);
      } else if (filename.includes('auth') || name.includes('login') || name.includes('route')) {
        tier1.push(n);
      } else if (filename.includes('db') || filename.includes('model') || n.kind === 'class') {
        tier3.push(n);
      } else {
        tier2.push(n);
      }
    });

    const tiers = [tier0, tier1, tier2, tier3].filter((t) => t.length > 0);
    if (tiers.length === 0) return posMap;

    const colCount = tiers.length;
    const xMargin = 80;
    const yMargin = 90;
    const availableWidth = Math.max(containerSize.width - 2 * xMargin, 600);
    const colSpacing = colCount > 1 ? availableWidth / (colCount - 1) : 320;
    const rowSpacing = cardDensity === 'compact' ? 52 : cardDensity === 'detailed' ? 144 : 110;

    tiers.forEach((tierGroup, colIdx) => {
      const x = xMargin + colIdx * Math.min(colSpacing, 340);
      tierGroup.forEach((node, rowIdx) => {
        const y = yMargin + rowIdx * rowSpacing;
        posMap.set(node.id, { x, y });
      });
    });

    return posMap;
  }, [nodes, containerSize, cardDensity]);

  // Merged positions
  const effectivePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => {
      if (localPositions[n.id]) {
        map.set(n.id, localPositions[n.id]);
      } else if (baseNodePositions.has(n.id)) {
        map.set(n.id, baseNodePositions.get(n.id)!);
      } else {
        map.set(n.id, { x: 120, y: 120 });
      }
    });
    return map;
  }, [nodes, baseNodePositions, localPositions]);

  // Center view
  const handleFitView = useCallback(() => {
    if (nodes.length === 0) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    effectivePositions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + currentCardWidth);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + currentCardHeight);
    });

    if (minX === Infinity) return;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const scaleX = (containerSize.width - 160) / Math.max(graphWidth, 100);
    const scaleY = (containerSize.height - 160) / Math.max(graphHeight, 100);
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPanOffset({
      x: containerSize.width / 2 - centerX * fitScale,
      y: containerSize.height / 2 - centerY * fitScale,
    });
  }, [nodes, effectivePositions, containerSize, currentCardWidth, currentCardHeight]);

  const handleResetLayout = useCallback(() => {
    resetNodePositions();
    handleFitView();
  }, [resetNodePositions, handleFitView]);

  // Auto center
  useEffect(() => {
    if (nodes.length > 0) {
      handleFitView();
    }
  }, [nodes.length, handleFitView]);

  // Highlights
  const activeNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id]);

    let frontier = [selectedNode.id];
    for (let hop = 0; hop < depthHops; hop++) {
      const nextFrontier: string[] = [];
      edges.forEach((e) => {
        if (frontier.includes(e.source) && !set.has(e.target)) {
          set.add(e.target);
          nextFrontier.push(e.target);
        }
        if (frontier.includes(e.target) && !set.has(e.source)) {
          set.add(e.source);
          nextFrontier.push(e.source);
        }
      });
      frontier = nextFrontier;
    }
    return set;
  }, [selectedNode, edges, depthHops]);

  // Dead nodes
  const deadNodeIds = useMemo(() => {
    return new Set(deadFunctions.map((df) => df.id || df.name));
  }, [deadFunctions]);

  // Mouse events
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      // Node drag
      if (dragInfo.current) {
        const dx = (e.clientX - dragInfo.current.startMouseX) / zoom;
        const dy = (e.clientY - dragInfo.current.startMouseY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasMovedPan.current = true;
        }

        dragInfo.current.currentX = Math.round(dragInfo.current.startNodeX + dx);
        dragInfo.current.currentY = Math.round(dragInfo.current.startNodeY + dy);

        if (!nodeRafId.current) {
          nodeRafId.current = requestAnimationFrame(() => {
            if (dragInfo.current) {
              setLocalPositions((prev) => ({
                ...prev,
                [dragInfo.current!.id]: {
                  x: dragInfo.current!.currentX,
                  y: dragInfo.current!.currentY,
                },
              }));
            }
            nodeRafId.current = null;
          });
        }
        return;
      }

      // Canvas pan
      if (isPanning.current) {
        const dx = e.clientX - clickStartPos.current.x;
        const dy = e.clientY - clickStartPos.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMovedPan.current = true;
        }
        nextPanOffset.current = {
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        };
        if (!panRafId.current) {
          panRafId.current = requestAnimationFrame(() => {
            if (nextPanOffset.current) {
              setPanOffset(nextPanOffset.current);
            }
            panRafId.current = null;
          });
        }
      }
    };

    const onWindowMouseUp = () => {
      if (nodeRafId.current) {
        cancelAnimationFrame(nodeRafId.current);
        nodeRafId.current = null;
      }
      if (panRafId.current) {
        cancelAnimationFrame(panRafId.current);
        panRafId.current = null;
      }

      // Sync position
      if (dragInfo.current) {
        updateNodePosition(dragInfo.current.id, {
          x: dragInfo.current.currentX,
          y: dragInfo.current.currentY,
        });
      }

      // Canvas click
      if (isPanning.current && !hasMovedPan.current) {
        minimizeAllPanels();
      }

      isPanning.current = false;
      setIsCurrentlyPanning(false);
      dragInfo.current = null;
      setActiveDraggingId(null);
    };

    window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      if (nodeRafId.current) cancelAnimationFrame(nodeRafId.current);
      if (panRafId.current) cancelAnimationFrame(panRafId.current);
    };
  }, [zoom, updateNodePosition, minimizeAllPanels]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && (e.target as HTMLElement).tagName !== 'svg') {
      return;
    }

    clickStartPos.current = { x: e.clientX, y: e.clientY };
    hasMovedPan.current = false;
    isPanning.current = true;
    panStart.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
    setIsCurrentlyPanning(true);
  };

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    clickStartPos.current = { x: e.clientX, y: e.clientY };
    hasMovedPan.current = false;

    // Visually focus node immediately
    selectNode(node);

    const currentPos = effectivePositions.get(node.id) || { x: 0, y: 0 };
    dragInfo.current = {
      id: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: currentPos.x,
      startNodeY: currentPos.y,
      currentX: currentPos.x,
      currentY: currentPos.y,
    };
    setActiveDraggingId(node.id);
  }, [selectNode, effectivePositions]);

  // Canvas zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      adjustZoom(delta);
    }
  };

  const isDimmed = focusMode || isEditorFocused;

  return (
    <main
      ref={containerRef}
      id="canvasContainer"
      className={`absolute inset-0 w-full h-full bg-[#1e1e1e] overflow-hidden select-none ${
        activeDraggingId || isCurrentlyPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
    >
      {/* VS Code Subtle Dot Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #2d2d2d 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* BOTTOM FLOATING CANVAS TOOLBAR: Consolidated Viewport, Layout & Camera Controls */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto ${
          isDimmed ? 'opacity-30 hover:opacity-100' : 'opacity-100'
        } transition-all duration-150`}
      >
        <div className="bg-[#252526] border border-[#3e3e42] rounded-[3px] px-2 py-1 shadow-lg flex items-center gap-1.5">
          {/* Zoom Out */}
          <button
            onClick={() => adjustZoom(-0.1)}
            className="p-1 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] rounded-[2px] micro-tap"
            title="Zoom Out (Ctrl+Minus)"
          >
            <ZoomOut size={14} />
          </button>

          {/* Zoom Reset */}
          <span
            onClick={resetZoom}
            className="font-mono text-[11px] text-[#cccccc] hover:text-[#ffffff] px-1 cursor-pointer select-none micro-tap"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom In */}
          <button
            onClick={() => adjustZoom(0.1)}
            className="p-1 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] rounded-[2px] micro-tap"
            title="Zoom In (Ctrl+Plus)"
          >
            <ZoomIn size={14} />
          </button>

          <div className="h-4 w-[1px] bg-[#3e3e42]" />

          {/* Fit Graph to Screen */}
          <button
            onClick={handleFitView}
            className="p-1 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e] rounded-[2px] micro-tap"
            title="Fit Graph to Screen"
          >
            <Maximize2 size={14} />
          </button>

          <div className="h-4 w-[1px] bg-[#3e3e42]" />

          {/* Card Density Switcher */}
          <div className="flex items-center gap-0.5 bg-[#1e1e1e] p-0.5 rounded-[2px] border border-[#3e3e42]">
            <button
              onClick={() => setCardDensity('compact')}
              className={`p-1 rounded-[2px] text-[10px] micro-tap ${
                cardDensity === 'compact'
                  ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
              title="Compact View (Pill cards for high-level structure)"
            >
              <LayoutList size={12} />
            </button>
            <button
              onClick={() => setCardDensity('standard')}
              className={`p-1 rounded-[2px] text-[10px] micro-tap ${
                cardDensity === 'standard'
                  ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
              title="Standard View (Balanced metrics and identifiers)"
            >
              <LayoutGrid size={12} />
            </button>
            <button
              onClick={() => setCardDensity('detailed')}
              className={`p-1 rounded-[2px] text-[10px] micro-tap ${
                cardDensity === 'detailed'
                  ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                  : 'text-[#858585] hover:text-[#cccccc]'
              }`}
              title="Detailed View (Rich docstrings and signatures)"
            >
              <FileText size={12} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#3e3e42]" />

          {/* Auto-Arrange / Reset Layout */}
          <button
            onClick={handleResetLayout}
            className={`p-1 rounded-[2px] micro-tap text-[11px] ${
              hasCustomPositions
                ? 'text-[#4ec9b0] hover:bg-[#2a2d2e]'
                : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e]'
            }`}
            title={
              hasCustomPositions
                ? 'Re-organize custom layout into columns (Undoable)'
                : 'Auto-arrange node positions'
            }
          >
            <RotateCcw size={14} />
          </button>

          {/* Pan Tool */}
          <button
            onClick={togglePan}
            className={`p-1 rounded-[2px] micro-tap ${
              panActive
                ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e]'
            }`}
            title="Toggle Pan Tool"
          >
            <Hand size={14} />
          </button>

          <div className="h-4 w-[1px] bg-[#3e3e42]" />

          {/* Zen View Mode */}
          <button
            onClick={toggleFocusMode}
            className={`p-1 rounded-[2px] text-[11px] flex items-center micro-tap ${
              focusMode
                ? 'bg-[#094771] text-[#ffffff] border border-[#007acc]'
                : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#2a2d2e]'
            }`}
            title={focusMode ? 'Exit Zen Mode' : 'Enter Zen Mode (Hide Panels)'}
          >
            {focusMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* EMPTY / LOADING / ERROR SKELETON */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto">
          {isLoading ? (
            <div className="bg-[#252526] border border-[#3e3e42] rounded-[3px] p-6 shadow-xl max-w-sm flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-semibold text-[#ffffff]">Analyzing Python Project...</div>
              <p className="text-[11px] text-[#858585] leading-relaxed">
                Parsing AST, extracting functions, classes, dependencies and McCabe cyclomatic complexity metrics.
              </p>
            </div>
          ) : error ? (
            <div className="bg-[#252526] border border-[#f14c4c]/40 rounded-[3px] p-6 shadow-xl max-w-md flex flex-col items-center gap-3">
              <AlertCircle size={28} className="text-[#f14c4c]" />
              <div className="text-xs font-semibold text-[#ffffff]">Architecture Analysis Error</div>
              <p className="text-[11px] text-[#858585] leading-relaxed font-mono">
                {error}
              </p>
              <button
                onClick={() => loadProject(projectPath, true)}
                className="mt-2 bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] font-medium px-4 py-1.5 rounded-[2px] text-xs transition-colors"
              >
                Retry Analysis
              </button>
            </div>
          ) : (
            <div className="bg-[#252526] border border-[#3e3e42] rounded-[4px] p-8 shadow-2xl max-w-sm flex flex-col items-center gap-3">
              <IrminsulLogo className="w-12 h-12 mb-1 filter drop-shadow-[0_0_12px_rgba(0,122,204,0.3)]" />
              <div className="text-sm font-semibold text-[#ffffff]">Irminsul IDE</div>
              <p className="text-xs text-[#858585] leading-relaxed text-center">
                {projectPath
                  ? 'No Python source files found in this workspace folder. Open another folder or create a Python module.'
                  : 'No project open. Open a Python project folder to visualize its architecture and refactor code.'}
              </p>
              <button
                onClick={async () => {
                  const chosen = await promptNativeFolderChooser(projectPath);
                  if (chosen) loadProject(chosen);
                }}
                className="mt-2 bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] font-medium px-4 py-2 rounded-[3px] text-xs transition-colors flex items-center gap-2 shadow cursor-pointer"
              >
                <FolderOpen size={14} />
                <span>Open Folder...</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* GRAPH CANVAS VIEWPORT */}
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '5000px',
          height: '5000px',
        }}
        className="absolute top-0 left-0 pointer-events-none"
      >
        {/* SVG BEZIER CONNECTION CABLES */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#5a5a5a" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#007acc" />
            </marker>
            <marker
              id="arrow-cycle"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#cca700" />
            </marker>
          </defs>

          {edges.map((edge, idx) => {
            const sourcePos = effectivePositions.get(edge.source);
            const targetPos = effectivePositions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            // Edge path
            const d = computeEdgePath(sourcePos, targetPos, currentCardWidth, currentCardHeight);

            const isEdgeActive =
              selectedNode &&
              (selectedNode.id === edge.source || selectedNode.id === edge.target);

            const isCycle =
              analysisMode === 'cycles' &&
              activeCycles.some(
                (c) => c.includes(edge.source) && c.includes(edge.target)
              );

            return (
              <EdgeItem
                key={`${edge.source}-${edge.target}-${idx}`}
                id={`${edge.source}-${edge.target}-${idx}`}
                d={d}
                isEdgeActive={Boolean(isEdgeActive)}
                isCycle={Boolean(isCycle)}
              />
            );
          })}
        </svg>

        {/* DRAGGABLE VS CODE STYLE GRAPH NODES (Memoized for 0-latency 120 FPS dragging) */}
        {nodes.map((node) => {
          const pos = effectivePositions.get(node.id);
          if (!pos) return null;

          const isSelected = selectedNode?.id === node.id;
          const isConnected = activeNodeIds.has(node.id);
          const isDead = analysisMode === 'deadcode' && deadNodeIds.has(node.id);
          const isDragging = activeDraggingId === node.id;

          const isLayerActive =
            activeLayerFilter !== 'ALL' &&
            (node.tier || '').toUpperCase() === activeLayerFilter.toUpperCase();

          return (
            <NodeCard
              key={node.id}
              node={node}
              pos={pos}
              isSelected={isSelected}
              isConnected={isConnected}
              isDead={isDead}
              isDragging={isDragging}
              isLayerActive={isLayerActive}
              cardDensity={cardDensity}
              currentCardWidth={currentCardWidth}
              currentCardHeight={currentCardHeight}
              onMouseDown={handleNodeMouseDown}
            />
          );
        })}
      </div>
    </main>
  );
};

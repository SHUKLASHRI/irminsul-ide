import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import { Search, X, ArrowRight } from 'lucide-react';
import type { GraphNode } from '../types';

export const CommandPaletteModal: React.FC = () => {
  const { isSpotlightOpen, closeSpotlight, nodes, selectNode } = useExplorer();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSpotlightOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isSpotlightOpen]);

  const filteredNodes = useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 16);
    const q = query.toLowerCase();
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q) || n.filename.toLowerCase().includes(q))
      .slice(0, 16);
  }, [nodes, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredNodes]);

  const handleSelect = (node: GraphNode) => {
    selectNode(node);
    closeSpotlight();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        handleSelect(filteredNodes[selectedIndex]);
      }
    }
  };

  if (!isSpotlightOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center pt-[8vh] select-none"
      onClick={closeSpotlight}
    >
      <div
        className="w-[580px] max-w-[92vw] bg-[#252526] border border-[#3e3e42] rounded-[3px] shadow-2xl overflow-hidden flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="flex items-center px-3 py-2 border-b border-[#3e3e42] bg-[#1e1e1e] gap-2">
          <Search size={15} className="text-[#858585]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type symbol name to navigate (functions, classes, files)..."
            className="flex-1 bg-transparent border-none text-[#cccccc] placeholder-[#858585] text-xs focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#858585] hover:text-[#cccccc] p-0.5 rounded-[2px]"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono bg-[#2d2d2d] text-[#858585] border border-[#3e3e42]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto p-1 space-y-0.5 code-scroll bg-[#252526]">
          {filteredNodes.length === 0 ? (
            <div className="p-8 text-center text-[#858585] font-mono text-xs">
              No matching AST symbols found for "{query}"
            </div>
          ) : (
            filteredNodes.map((node, index) => {
              const isSelected = index === selectedIndex;
              const isClass = node.kind === 'class';

              return (
                <div
                  key={node.id}
                  onClick={() => handleSelect(node)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-2.5 py-1 rounded-[2px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#094771] text-[#ffffff] font-medium'
                      : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded-[1px] uppercase font-semibold ${
                        isClass
                          ? 'text-[#4ec9b0] bg-[#203330]'
                          : 'text-[#dcdcaa] bg-[#333220]'
                      }`}
                    >
                      {isClass ? 'cls' : 'fn'}
                    </span>
                    <span className={`font-mono text-xs truncate ${isClass ? 'text-[#4ec9b0]' : 'text-[#dcdcaa]'}`}>
                      {node.name}
                    </span>
                    <span className="text-[11px] font-mono text-[#858585] truncate">
                      {node.filename}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[#858585]">
                    <span>L{node.line}</span>
                    {isSelected && <ArrowRight size={12} className="text-[#ffffff]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Keybinds */}
        <div className="px-3 py-1.5 border-t border-[#3e3e42] bg-[#2d2d2d] flex items-center justify-between text-[11px] font-mono text-[#858585]">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>esc Dismiss</span>
          </div>
          <span>{filteredNodes.length} symbols</span>
        </div>
      </div>
    </div>
  );
};

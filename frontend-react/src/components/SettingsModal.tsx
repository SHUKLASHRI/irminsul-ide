import React, { useState } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import {
  X,
  Search,
  Settings,
  Type,
  Network,
  Cpu,
  Palette,
  Keyboard,
  Check,
} from 'lucide-react';
import type { CardDensity } from '../types';

type SettingsCategory = 'editor' | 'graph' | 'analysis' | 'appearance' | 'keyboard';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    closeSettings,
    settings,
    updateSettings,
    setCardDensity,
  } = useExplorer();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('editor');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150 font-sans"
      onClick={closeSettings}
    >
      <div
        className="w-[840px] max-w-[95vw] h-[580px] max-h-[90vh] bg-[#252526] border border-[#3e3e42] rounded-md shadow-2xl flex flex-col overflow-hidden text-[#cccccc]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-10 bg-[#1e1e1e] border-b border-[#3e3e42] px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#ffffff]">
            <Settings size={15} className="text-[#007acc]" />
            <span>Settings — Irminsul IDE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#858585]">Ctrl+, to toggle</span>
            <button
              onClick={closeSettings}
              className="p-1 text-[#858585] hover:text-[#ffffff] hover:bg-[#333333] rounded transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 bg-[#1e1e1e] border-b border-[#3e3e42]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[#858585]" />
            <input
              type="text"
              placeholder="Search settings (e.g., font, minimap, cycle, layout)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#252526] border border-[#3e3e42] focus:border-[#007acc] rounded px-3 py-1.5 pl-9 text-xs text-[#ffffff] placeholder-[#6e6e6e] focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories */}
          <div className="w-52 border-r border-[#3e3e42] bg-[#1e1e1e]/60 py-2 flex flex-col gap-0.5 select-none text-xs">
            <button
              onClick={() => setActiveCategory('editor')}
              className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                activeCategory === 'editor'
                  ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <Type size={14} />
              <span>Text Editor</span>
            </button>

            <button
              onClick={() => setActiveCategory('graph')}
              className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                activeCategory === 'graph'
                  ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <Network size={14} />
              <span>Architecture Graph</span>
            </button>

            <button
              onClick={() => setActiveCategory('analysis')}
              className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                activeCategory === 'analysis'
                  ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <Cpu size={14} />
              <span>Analysis & Refactor</span>
            </button>

            <button
              onClick={() => setActiveCategory('appearance')}
              className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                activeCategory === 'appearance'
                  ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <Palette size={14} />
              <span>Appearance & Theme</span>
            </button>

            <button
              onClick={() => setActiveCategory('keyboard')}
              className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                activeCategory === 'keyboard'
                  ? 'bg-[#094771] text-[#ffffff] font-medium border-l-2 border-[#007acc]'
                  : 'text-[#cccccc] hover:bg-[#2a2d2e]'
              }`}
            >
              <Keyboard size={14} />
              <span>Keyboard Shortcuts</span>
            </button>
          </div>

          {/* Settings */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {activeCategory === 'editor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Editor: Font Size</h3>
                  <p className="text-[#858585] text-[11px] mb-2">Controls the font size in pixels for the Monaco code editor.</p>
                  <input
                    type="number"
                    min={10}
                    max={28}
                    value={settings.editorFontSize}
                    onChange={(e) => updateSettings({ editorFontSize: parseInt(e.target.value) || 13 })}
                    className="w-24 bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-[#ffffff] focus:outline-none focus:border-[#007acc]"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Editor: Tab Size</h3>
                  <p className="text-[#858585] text-[11px] mb-2">The number of spaces a tab is equal to.</p>
                  <select
                    value={settings.editorTabSize}
                    onChange={(e) => updateSettings({ editorTabSize: parseInt(e.target.value) || 4 })}
                    className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-3 py-1 text-xs text-[#ffffff] focus:outline-none focus:border-[#007acc]"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces (PEP 8 standard)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border-t border-[#333333] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#ffffff]">Editor: Word Wrap</h3>
                    <p className="text-[#858585] text-[11px]">Controls how lines should wrap in the code editor.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.editorWordWrap}
                    onChange={(e) => updateSettings({ editorWordWrap: e.target.checked })}
                    className="w-4 h-4 accent-[#007acc] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[#333333] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#ffffff]">Editor: Minimap</h3>
                    <p className="text-[#858585] text-[11px]">Controls whether the minimap is shown on the right side of the editor.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.editorMinimap}
                    onChange={(e) => updateSettings({ editorMinimap: e.target.checked })}
                    className="w-4 h-4 accent-[#007acc] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeCategory === 'graph' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Graph: Default Layout Algorithm</h3>
                  <p className="text-[#858585] text-[11px] mb-2">Controls how architectural hierarchy is rendered on the canvas.</p>
                  <select
                    value={settings.graphAlgorithm}
                    onChange={(e) => updateSettings({ graphAlgorithm: e.target.value as any })}
                    className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-3 py-1.5 text-xs text-[#ffffff] focus:outline-none focus:border-[#007acc]"
                  >
                    <option value="Radial">Radial Concentric (Best for deep dependencies)</option>
                    <option value="Hierarchical">Hierarchical Layers (Presentation → Core)</option>
                    <option value="Sugiyama">Sugiyama Dagre Flow (Clean layered DAG)</option>
                    <option value="Force-Directed">Force-Directed Physics (Freeform cluster)</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Graph: Node Card Density</h3>
                  <p className="text-[#858585] text-[11px] mb-2">Information density displayed on each architectural card.</p>
                  <div className="flex gap-2">
                    {(['compact', 'standard', 'detailed'] as CardDensity[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          updateSettings({ graphCardDensity: d });
                          setCardDensity(d);
                        }}
                        className={`px-3 py-1.5 rounded border capitalize text-xs transition-colors ${
                          settings.graphCardDensity === d
                            ? 'bg-[#007acc] border-[#007acc] text-[#ffffff] font-medium'
                            : 'bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] hover:bg-[#2a2d2e]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#333333] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#ffffff]">Graph: Physics Simulation</h3>
                    <p className="text-[#858585] text-[11px]">Enable smooth elastic cable tension and repulsion.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.graphPhysics}
                    onChange={(e) => updateSettings({ graphPhysics: e.target.checked })}
                    className="w-4 h-4 accent-[#007acc] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeCategory === 'analysis' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Python AST Target Version</h3>
                  <p className="text-[#858585] text-[11px] mb-2">Specify Python language level for syntax validation and AST checks.</p>
                  <select
                    value={settings.analysisPythonTarget}
                    onChange={(e) => updateSettings({ analysisPythonTarget: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-3 py-1 text-xs text-[#ffffff] focus:outline-none focus:border-[#007acc]"
                  >
                    <option value="3.10">Python 3.10</option>
                    <option value="3.11">Python 3.11</option>
                    <option value="3.12">Python 3.12 (Recommended)</option>
                    <option value="3.13">Python 3.13 (Experimental Free-Threaded)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border-t border-[#333333] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#ffffff]">Automatic Circular Import Detection</h3>
                    <p className="text-[#858585] text-[11px]">Runs Tarjan's SCC cycle detector upon loading any project.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.analysisCycleCheck}
                    onChange={(e) => updateSettings({ analysisCycleCheck: e.target.checked })}
                    className="w-4 h-4 accent-[#007acc] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[#333333] pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#ffffff]">Dead Code & Unused Function Pruning</h3>
                    <p className="text-[#858585] text-[11px]">Highlight unreachable functions with zero incoming calls.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.analysisDeadCode}
                    onChange={(e) => updateSettings({ analysisDeadCode: e.target.checked })}
                    className="w-4 h-4 accent-[#007acc] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeCategory === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#ffffff] mb-1">Color Theme</h3>
                  <p className="text-[#858585] text-[11px] mb-3">Choose the overall workspace visual theme.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'vs-dark', name: 'Dark Modern (Default)', color: '#1e1e1e' },
                      { id: 'abyss', name: 'Abyss Deep Blue', color: '#0d1117' },
                      { id: 'one-dark', name: 'One Dark Pro', color: '#282c34' },
                      { id: 'high-contrast', name: 'Dark High Contrast', color: '#000000' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateSettings({ theme: t.id as any })}
                        className={`p-3 rounded border text-left flex items-center justify-between transition-colors ${
                          settings.theme === t.id
                            ? 'border-[#007acc] bg-[#2a2d2e] ring-1 ring-[#007acc]'
                            : 'border-[#3e3e42] bg-[#1e1e1e] hover:border-[#6e6e6e]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full border border-[#555]" style={{ background: t.color }} />
                          <span className="text-xs text-[#ffffff]">{t.name}</span>
                        </div>
                        {settings.theme === t.id && <Check size={14} className="text-[#007acc]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'keyboard' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#ffffff]">Keyboard Shortcuts Reference</h3>
                <div className="border border-[#3e3e42] rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1e1e1e] text-[#858585] border-b border-[#3e3e42]">
                      <tr>
                        <th className="py-2 px-3">Command</th>
                        <th className="py-2 px-3">Keybinding</th>
                        <th className="py-2 px-3">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Quick Open / Symbol Search</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+P / Cmd+P</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Command Palette</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+Shift+P</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Toggle Project Sidebar</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+B</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Toggle Architecture Inspector</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+J</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Toggle Bottom Terminal</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+`</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Open Settings</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+,</td>
                        <td className="py-2 px-3 text-[#858585]">Global</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Safe AST Rename Symbol</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">F2</td>
                        <td className="py-2 px-3 text-[#858585]">Selected Node</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Save Active File</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+S</td>
                        <td className="py-2 px-3 text-[#858585]">Editor</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-[#ffffff]">Reset Canvas Zoom</td>
                        <td className="py-2 px-3 font-mono text-[#007acc]">Ctrl+0</td>
                        <td className="py-2 px-3 text-[#858585]">Canvas</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 bg-[#1e1e1e] border-t border-[#3e3e42] px-4 flex items-center justify-between select-none">
          <span className="text-[11px] text-[#858585]">Settings are automatically saved locally.</span>
          <button
            onClick={closeSettings}
            className="px-3 py-1 bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] rounded text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

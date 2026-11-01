import React, { useState, useEffect } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import { X, CheckCircle2, AlertTriangle, Loader2, Edit } from 'lucide-react';
import * as api from '../api/client';
import type { RenamePlan } from '../types';

export const SafeRenameModal: React.FC = () => {
  const {
    renameModalNode,
    closeRenameModal,
    projectPath,
    handleRenameSuccess,
  } = useExplorer();

  const [newName, setNewName] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [plan, setPlan] = useState<RenamePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showConfirmStep, setShowConfirmStep] = useState(false);

  useEffect(() => {
    if (renameModalNode) {
      setNewName(`${renameModalNode.name}_renamed`);
      setPlan(null);
      setError(null);
      setSuccessMessage(null);
      setShowConfirmStep(false);
    }
  }, [renameModalNode]);

  if (!renameModalNode) return null;

  const handlePreview = async () => {
    if (!newName.trim()) {
      setError('Please provide a new symbol name');
      return;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
      setError('Name must be a valid Python identifier (letters, digits, underscores)');
      return;
    }
    if (newName === renameModalNode.name) {
      setError('New name must be different from original name');
      return;
    }

    setIsPreviewing(true);
    setError(null);
    setShowConfirmStep(false);
    try {
      const res = await api.previewRename(projectPath, renameModalNode.id, newName);
      if (!res.ok) {
        setError(res.error || 'Failed to plan rename');
      } else {
        setPlan(res);
      }
    } catch (err: any) {
      setError(err.message || 'Error generating rename preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!plan) return;
    setIsApplying(true);
    setError(null);
    try {
      const res = await api.applyRename(projectPath, renameModalNode.id, newName);
      if (!res.success) {
        setError(res.error || 'Failed to execute refactor');
      } else {
        setSuccessMessage(
          `Successfully refactored ${plan.substitutions.length} references across ${res.files_modified.length} files.`
        );
        setTimeout(() => {
          handleRenameSuccess(res);
        }, 1100);
      }
    } catch (err: any) {
      setError(err.message || 'Error executing refactor rename');
    } finally {
      setIsApplying(false);
    }
  };

  const affectedFiles = plan ? Array.from(new Set(plan.substitutions.map((s) => s.file))) : [];

  return (
    <div
      className="fixed inset-0 bg-black/65 z-[200] flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={closeRenameModal}
    >
      <div
        className="w-[580px] max-w-[94vw] max-h-[88vh] bg-[#252526] border border-[#3e3e42] rounded-[4px] shadow-2xl flex flex-col overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between bg-[#2d2d2d]">
          <div className="flex items-center space-x-2">
            <Edit size={15} className="text-[#007acc]" />
            <div>
              <h3 className="text-xs font-semibold text-[#ffffff]">
                {showConfirmStep ? 'Confirm Refactor Execution' : 'Rename Symbol'}
              </h3>
              <p className="text-[11px] text-[#858585] font-mono">
                Original: <strong className="text-[#cccccc]">{renameModalNode.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={closeRenameModal}
            className="text-[#858585] hover:text-[#ffffff] p-1 rounded-[2px] hover:bg-[#383838] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 code-scroll flex-1">
          {/* Input */}
          <div>
            <label className="block text-[11px] font-sans text-[#858585] mb-1">
              New Symbol Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setPlan(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePreview();
                  }
                }}
                placeholder="e.g. validate_credentials"
                className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] focus:border-[#007acc] rounded-[2px] px-2.5 py-1 text-xs text-[#cccccc] font-mono focus:outline-none"
                autoFocus
              />
              <button
                onClick={handlePreview}
                disabled={isPreviewing}
                className="px-3 py-1 bg-[#333333] hover:bg-[#3e3e42] border border-[#3e3e42] rounded-[2px] text-xs font-sans text-[#cccccc] hover:text-[#ffffff] flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isPreviewing && <Loader2 size={13} className="animate-spin" />}
                <span>Preview Diff</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-[2px] bg-[#332020] border border-[#f14c4c]/40 text-[#f14c4c] text-xs">
              <AlertTriangle size={14} className="text-[#f14c4c] flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-[2px] bg-[#203330] border border-[#4ec9b0]/40 text-[#4ec9b0] text-xs">
              <CheckCircle2 size={14} className="text-[#4ec9b0] flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Diff */}
          {plan && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#858585] font-medium">
                  Planned Substitutions ({plan.substitutions.length})
                </span>
                <span className="text-[10px] text-[#858585]">
                  {affectedFiles.length} file{affectedFiles.length !== 1 ? 's' : ''} affected
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto code-scroll">
                {plan.substitutions.map((sub, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-[2px] bg-[#1e1e1e] border border-[#3e3e42] font-mono text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#858585] text-[10px]">
                      <span className="text-[#cccccc] truncate">{sub.file}</span>
                      <span>Line {sub.line}</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="p-1 rounded-[1px] bg-[#332020] text-[#f14c4c] border border-[#4a2a2a] overflow-x-auto truncate">
                        - {sub.old}
                      </div>
                      <div className="p-1 rounded-[1px] bg-[#203330] text-[#4ec9b0] border border-[#2a4e48] overflow-x-auto truncate">
                        + {sub.new}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-2.5 border-t border-[#3e3e42] bg-[#2d2d2d] flex items-center justify-between">
          <button
            onClick={closeRenameModal}
            className="px-3 py-1 text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={!plan || isApplying || plan.substitutions.length === 0}
            className={`px-3.5 py-1 rounded-[2px] text-xs font-sans flex items-center gap-1.5 transition-colors ${
              plan && plan.substitutions.length > 0 && !isApplying
                ? 'bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] font-medium'
                : 'bg-[#333333] text-[#858585] cursor-not-allowed'
            }`}
          >
            {isApplying && <Loader2 size={13} className="animate-spin" />}
            <span>Apply Refactor ({plan ? plan.substitutions.length : 0})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useExplorer } from '../context/ExplorerContext';
import * as api from '../api/client';
import {
  FileCode,
  Save,
  RotateCcw,
  X,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  initialLine?: number;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  isOpen,
  onClose,
  filePath,
  initialLine,
}) => {
  const { saveFile } = useExplorer();
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<{ line: number; message: string } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const isDirty = content !== originalContent;

  // Load file
  useEffect(() => {
    if (!isOpen || !filePath) return;

    setIsLoading(true);
    setError(null);
    setSyntaxError(null);

    api
      .fetchFileContent(filePath)
      .then((data) => {
        setContent(data.content);
        setOriginalContent(data.content);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load file content');
        setIsLoading(false);
      });
  }, [isOpen, filePath]);

  // Jump to line
  useEffect(() => {
    if (!isLoading && initialLine && textareaRef.current && content) {
      const lines = content.split('\n');
      let charCount = 0;
      for (let i = 0; i < Math.min(initialLine - 1, lines.length); i++) {
        charCount += lines[i].length + 1;
      }
      textareaRef.current.selectionStart = charCount;
      textareaRef.current.selectionEnd = charCount;
      textareaRef.current.focus();

      const lineHeight = 19;
      const scrollY = Math.max(0, (initialLine - 6) * lineHeight);
      textareaRef.current.scrollTop = scrollY;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollY;
      }
    }
  }, [isLoading, initialLine]);

  // Sync scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Cursor position
  const handleCursorActivity = () => {
    if (!textareaRef.current) return;
    const textBefore = content.substring(0, textareaRef.current.selectionStart);
    const lines = textBefore.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const tabSpaces = '    ';
      const newContent = content.substring(0, start) + tabSpaces + content.substring(end);
      setContent(newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + tabSpaces.length;
          textareaRef.current.selectionEnd = start + tabSpaces.length;
        }
      }, 0);
    }
  };

  // Save
  const handleSave = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setSyntaxError(null);
    setError(null);

    const res = await saveFile(filePath, content);
    setIsSaving(false);

    if (res.success) {
      setOriginalContent(content);
    } else {
      if (res.syntax_error) {
        setSyntaxError({
          line: res.syntax_error.line,
          message: res.syntax_error.message,
        });
      } else {
        setError(res.error || 'Failed to save changes');
      }
    }
  };

  const handleRevert = () => {
    setContent(originalContent);
    setSyntaxError(null);
    setError(null);
  };

  const totalLines = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  if (!isOpen) return null;

  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none">
      <div
        className={`bg-[#1e1e1e] border border-[#3e3e42] rounded-[4px] shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isMaximized ? 'w-full h-full m-0' : 'w-[92vw] max-w-5xl h-[84vh]'
        }`}
      >
        {/* Editor Title Bar */}
        <div className="h-10 px-3 bg-[#2d2d2d] border-b border-[#3e3e42] flex items-center justify-between select-none">
          <div className="flex items-center space-x-2 truncate">
            <FileCode size={16} className="text-[#007acc] flex-shrink-0" />
            <span className="text-xs font-mono font-medium text-[#cccccc] truncate">
              {filePath}
            </span>
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-[#007acc] animate-pulse flex-shrink-0"
                title="Unsaved changes"
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Revert Button */}
            {isDirty && (
              <button
                onClick={handleRevert}
                disabled={isSaving}
                className="px-2 py-1 bg-[#333333] hover:bg-[#383838] text-[#cccccc] hover:text-[#ffffff] rounded-[2px] text-xs font-mono flex items-center gap-1.5 micro-tap border border-[#3e3e42]"
                title="Discard unsaved changes"
              >
                <RotateCcw size={13} />
                <span>Revert</span>
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`px-3 py-1 rounded-[2px] text-xs font-mono flex items-center gap-1.5 micro-tap border ${
                isDirty
                  ? 'bg-[#007acc] hover:bg-[#0098ff] text-[#ffffff] border-[#007acc]'
                  : 'bg-[#252526] text-[#6e7681] border-[#3e3e42] cursor-not-allowed'
              }`}
              title="Save Changes (Ctrl+S)"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save (Ctrl+S)'}</span>
            </button>

            <div className="h-4 w-[1px] bg-[#3e3e42]" />

            {/* Maximize / Restore */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 text-[#858585] hover:text-[#cccccc] hover:bg-[#383838] rounded-[2px] micro-tap"
              title={isMaximized ? 'Restore Window' : 'Maximize Window'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#858585] hover:text-[#ffffff] hover:bg-[#c42b1c] rounded-[2px] micro-tap"
              title="Close Editor (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Syntax Error Alert Banner */}
        {syntaxError && (
          <div className="px-4 py-2 bg-[#332020] border-b border-[#f14c4c]/40 text-[#f14c4c] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>
                <strong>Syntax Error on Line {syntaxError.line}:</strong> {syntaxError.message}
              </span>
            </div>
            <button
              onClick={() => {
                if (textareaRef.current) {
                  const lines = content.split('\n');
                  let charCount = 0;
                  for (let i = 0; i < Math.min(syntaxError.line - 1, lines.length); i++) {
                    charCount += lines[i].length + 1;
                  }
                  textareaRef.current.selectionStart = charCount;
                  textareaRef.current.selectionEnd = charCount;
                  textareaRef.current.focus();
                }
              }}
              className="underline text-[11px] hover:text-white"
            >
              Jump to line
            </button>
          </div>
        )}

        {/* Generic Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-[#332020] border-b border-[#f14c4c]/40 text-[#f14c4c] flex items-center gap-2 text-xs font-mono">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Editor Main Surface */}
        <div className="flex-1 flex overflow-hidden relative font-mono text-[13px] bg-[#1e1e1e]">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#858585]">
              <div className="w-6 h-6 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin" />
              <span>Loading {fileName}...</span>
            </div>
          ) : (
            <>
              {/* Line Numbers Gutter */}
              <div
                ref={lineNumbersRef}
                className="w-12 flex-shrink-0 bg-[#1e1e1e] border-r border-[#2d2d2d] py-3 text-right pr-3 select-none overflow-hidden text-[#606060] leading-[19px]"
              >
                {Array.from({ length: totalLines }).map((_, i) => {
                  const lineNum = i + 1;
                  const isCurrent = cursorPos.line === lineNum;
                  const isErrorLine = syntaxError?.line === lineNum;
                  return (
                    <div
                      key={lineNum}
                      className={`${
                        isErrorLine
                          ? 'text-[#f14c4c] font-bold bg-[#332020]'
                          : isCurrent
                          ? 'text-[#cccccc] font-semibold'
                          : ''
                      }`}
                    >
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Monospaced Editable Code Area */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleScroll}
                onKeyUp={handleCursorActivity}
                onClick={handleCursorActivity}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                className="flex-1 h-full py-3 px-3 bg-transparent text-[#d4d4d4] font-mono leading-[19px] resize-none outline-none overflow-auto code-scroll selection:bg-[#264f78] selection:text-white"
              />
            </>
          )}
        </div>

        {/* Editor Status Bar Footer */}
        <div className="h-6 px-3 bg-[#007acc] text-[#ffffff] flex items-center justify-between text-[11px] font-mono select-none">
          <div className="flex items-center space-x-3">
            <span>Python</span>
            <span>UTF-8</span>
            {isDirty ? (
              <span className="text-[#ffe066] font-bold">● Unsaved Edits</span>
            ) : (
              <span className="text-[#cce5ff]">Saved to Disk</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span>
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <span>{totalLines} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
};

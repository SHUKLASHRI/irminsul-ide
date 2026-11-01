from __future__ import annotations

import keyword
import os
from typing import Any, Optional
import networkx as nx


# Helpers
def _is_valid_identifier(name: str) -> bool:
    return name.isidentifier() and not keyword.iskeyword(name)


def _read_lines(file_path: str) -> list[str]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.readlines()
    except IOError:
        return []


def _make_substitution(
    file_path: str,
    line: int,
    col: int,
    old_text: str,
    new_text: str,
    context: str,
) -> dict[str, Any]:
    lines = _read_lines(file_path)
    display = lines[line - 1].rstrip() if 1 <= line <= len(lines) else ""
    return {
        "file": file_path,
        "filename": os.path.basename(file_path),
        "line": line,
        "col": col,
        "old_text": old_text,
        "new_text": new_text,
        "old": old_text,
        "new": new_text,
        "context": context,
        "display_line": display,
    }


# Planning
def plan_rename(
    graph: nx.DiGraph,
    target_node_id: str,
    new_name: str,
    parsed: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    # Validate node
    if target_node_id not in graph.nodes:
        return {"ok": False, "error": f"Node '{target_node_id}' not found in graph."}

    node = graph.nodes[target_node_id]
    if node.get("kind") not in ("function", "async_function", "method"):
        return {"ok": False, "error": f"Node '{target_node_id}' is not a function or method."}

    old_name = node.get("name", "")
    if not _is_valid_identifier(new_name):
        return {"ok": False, "error": f"'{new_name}' is not a valid Python identifier."}
    if new_name == old_name:
        return {"ok": False, "error": "New name is identical to the current name."}

    file_path = os.path.abspath(node.get("file", ""))
    if not os.path.isfile(file_path):
        return {"ok": False, "error": f"Source file not found for node: {file_path}"}

    # Definition offset
    def_col = node.get("col", 0)
    def_line = node.get("line", 1)
    source_lines = _read_lines(file_path)
    line_text = source_lines[def_line - 1] if def_line <= len(source_lines) else ""
    remainder = line_text[def_col:]

    if remainder.startswith("async def "):
        def_col += 10
    elif remainder.startswith("def "):
        def_col += 4
    else:
        idx = line_text.find(old_name)
        if idx != -1:
            def_col = idx

    substitutions = [
        _make_substitution(file_path, def_line, def_col, old_name, new_name, "definition")
    ]

    # Call sites
    for src, _, edge in graph.in_edges(target_node_id, data=True):
        if edge.get("type") in ("calls", "instantiates"):
            c_file = edge.get("file")
            c_line = edge.get("line")
            c_col = edge.get("col")
            if c_file and c_line is not None and c_col is not None:
                substitutions.append(
                    _make_substitution(
                        os.path.abspath(c_file),
                        c_line,
                        c_col,
                        old_name,
                        new_name,
                        f"call from {src}",
                    )
                )

    # Deduplicate
    seen: set[tuple[str, int, int]] = set()
    unique: list[dict[str, Any]] = []
    affected: set[str] = set()

    for sub in substitutions:
        key = (sub["file"], sub["line"], sub["col"])
        if key not in seen:
            seen.add(key)
            unique.append(sub)
            affected.add(sub["file"])

    return {
        "ok": True,
        "node_id": target_node_id,
        "old_name": old_name,
        "new_name": new_name,
        "substitutions": unique,
        "files_affected": sorted(list(affected)),
    }


# Verification
def verify_plan(plan: dict[str, Any]) -> dict[str, Any]:
    if not plan.get("ok"):
        return plan

    failures: list[dict[str, Any]] = []
    for sub in plan.get("substitutions", []):
        file_path = sub["file"]
        line_num = sub["line"]
        col = sub["col"]
        expected = sub["old_text"]

        lines = _read_lines(file_path)
        if line_num > len(lines) or line_num < 1:
            failures.append({
                "file": file_path,
                "line": line_num,
                "col": col,
                "expected": expected,
                "found": f"<line {line_num} out of bounds>",
            })
            continue

        actual = lines[line_num - 1][col:col + len(expected)]
        if actual != expected:
            failures.append({
                "file": file_path,
                "line": line_num,
                "col": col,
                "expected": expected,
                "found": actual,
            })

    if failures:
        return {
            "ok": False,
            "error": "Plan verification failed: file content does not match expected offsets.",
            "failures": failures,
        }
    return {"ok": True}


# Apply
def apply_rename(plan: dict[str, Any]) -> dict[str, Any]:
    if not plan.get("ok"):
        return {"success": False, "error": plan.get("error", "Invalid plan"), "files_modified": []}

    by_file: dict[str, list[dict[str, Any]]] = {}
    for sub in plan.get("substitutions", []):
        by_file.setdefault(sub["file"], []).append(sub)

    prepared: dict[str, str] = {}

    for file_path, subs in by_file.items():
        lines = _read_lines(file_path)
        if not lines:
            return {"success": False, "error": f"Unable to read '{file_path}'", "files_modified": []}

        # Bottom-to-top replacement
        for sub in sorted(subs, key=lambda s: (s["line"], s["col"]), reverse=True):
            idx = sub["line"] - 1
            col = sub["col"]
            old_text = sub["old_text"]
            new_text = sub["new_text"]

            if idx >= len(lines):
                return {"success": False, "error": f"Line {sub['line']} out of bounds in '{file_path}'", "files_modified": []}

            line = lines[idx]
            if line[col:col + len(old_text)] != old_text:
                return {"success": False, "error": f"Mismatch at {file_path}:{sub['line']}:{col}", "files_modified": []}

            lines[idx] = line[:col] + new_text + line[col + len(old_text):]

        prepared[file_path] = "".join(lines)

    # Atomic write
    modified: list[str] = []
    for file_path, content in prepared.items():
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            modified.append(file_path)
        except IOError as e:
            return {"success": False, "error": f"Failed writing to '{file_path}': {e}", "files_modified": modified}

    return {"success": True, "files_modified": modified}

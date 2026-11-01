from __future__ import annotations

import ast
import os
import threading
from typing import Any, Optional

from backend.analyzer import find_circular_dependencies, find_dead_functions, impact_analysis
from backend.project_mapper import ProjectArchitectureMapper
from backend.refactor import apply_rename, plan_rename, verify_plan


class ProjectService:
    def __init__(self, repo_root: Optional[str] = None):
        self.repo_root = os.path.abspath(repo_root or os.path.dirname(os.path.dirname(__file__)))
        self._lock = threading.Lock()
        self._cached_path: Optional[str] = None
        self._cached_result: Optional[dict[str, Any]] = None

    # Path resolution
    def resolve_project_root(self, path: Optional[str] = None) -> str:
        p_str = (path or "").strip()
        if not p_str or p_str in (".", "default"):
            with self._lock:
                if self._cached_path and os.path.isdir(self._cached_path):
                    return self._cached_path
            return os.path.abspath(os.getcwd())

        cand_repo = os.path.join(self.repo_root, p_str)
        if os.path.isdir(cand_repo):
            return os.path.abspath(cand_repo)

        cand_direct = os.path.abspath(p_str)
        if os.path.isdir(cand_direct):
            return cand_direct

        raise FileNotFoundError(f"Project directory not found: {p_str}")

    # Path security
    def resolve_safe_file_path(self, project_root: str, file_path: str, must_exist: bool = True) -> str:
        if not file_path or not file_path.strip():
            raise ValueError("File path cannot be empty")

        p = file_path.strip()
        target = os.path.abspath(p if os.path.isabs(p) else os.path.join(project_root, p))

        try:
            common = os.path.commonpath([target, project_root])
        except ValueError:
            raise PermissionError("Access denied: path is on a different drive than project root")

        if common != project_root:
            raise PermissionError(f"Access denied: '{file_path}' resolves outside project root")

        if must_exist and not os.path.isfile(target):
            raise FileNotFoundError(f"File not found: {file_path}")

        return target

    # Analysis cache
    def get_analysis(self, project_path: Optional[str] = None, force_refresh: bool = False) -> dict[str, Any]:
        abs_path = self.resolve_project_root(project_path)

        with self._lock:
            if not force_refresh and self._cached_path == abs_path and self._cached_result is not None:
                return self._cached_result

        mapper = ProjectArchitectureMapper(abs_path)
        project_map = mapper.generate_project_map()

        with self._lock:
            self._cached_path = abs_path
            self._cached_result = project_map
            return self._cached_result

    def invalidate_cache(self) -> None:
        with self._lock:
            self._cached_path = None
            self._cached_result = None

    # Source snippet
    def get_source_snippet(
        self,
        project_path: Optional[str],
        file_path: str,
        line: int,
        context: int = 4,
    ) -> dict[str, Any]:
        root = self.resolve_project_root(project_path)
        safe_path = self.resolve_safe_file_path(root, file_path, must_exist=True)
        line = max(1, line)

        with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()

        start = max(0, line - 1 - context)
        end = min(len(all_lines), line + context)

        lines_out = [
            {
                "number": i + 1,
                "content": all_lines[i].rstrip("\r\n"),
                "is_target": (i + 1 == line),
            }
            for i in range(start, end)
        ]
        return {"lines": lines_out, "target_line": line}

    # File read
    def get_file_content(self, project_path: Optional[str], file_path: str) -> dict[str, Any]:
        root = self.resolve_project_root(project_path)
        safe_path = self.resolve_safe_file_path(root, file_path, must_exist=True)

        with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        rel_path = os.path.relpath(safe_path, root).replace("\\", "/")
        return {
            "file": safe_path,
            "rel_path": rel_path,
            "filename": os.path.basename(safe_path),
            "content": content,
            "lines_count": len(content.splitlines()),
        }

    # File save
    def save_file_content(
        self,
        project_path: Optional[str],
        file_path: str,
        content: str,
    ) -> dict[str, Any]:
        root = self.resolve_project_root(project_path)
        safe_path = self.resolve_safe_file_path(root, file_path, must_exist=False)

        # Syntax check
        if safe_path.endswith(".py"):
            try:
                ast.parse(content, filename=safe_path)
            except SyntaxError as e:
                return {
                    "success": False,
                    "error": f"Python SyntaxError on line {e.lineno}: {e.msg}",
                    "syntax_error": {
                        "line": e.lineno,
                        "offset": e.offset,
                        "text": e.text,
                        "message": e.msg,
                    },
                }

        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)

        self.invalidate_cache()
        updated_map = self.get_analysis(root)

        return {
            "success": True,
            "message": f"Saved {os.path.basename(safe_path)} successfully",
            "project_map": updated_map,
        }

    # Diagnostics
    def get_circular_dependencies(self, project_path: Optional[str] = None) -> dict[str, Any]:
        analysis = self.get_analysis(project_path)
        cycles = analysis.get("diagnostics", {}).get("cycles")
        if cycles is None:
            cycles = find_circular_dependencies(analysis["graph"])
        return {"cycles": cycles, "count": len(cycles)}

    def get_dead_code(self, project_path: Optional[str] = None) -> dict[str, Any]:
        analysis = self.get_analysis(project_path)
        dead = analysis.get("diagnostics", {}).get("dead_functions")
        if dead is None:
            dead = find_dead_functions(analysis["graph"])
        return {"dead_functions": dead, "count": len(dead)}

    def get_impact_analysis(self, project_path: Optional[str], node_id: str) -> dict[str, Any]:
        analysis = self.get_analysis(project_path)
        return impact_analysis(analysis["graph"], node_id)

    # Refactor
    def preview_rename(
        self,
        project_path: Optional[str],
        node_id: str,
        new_name: str,
    ) -> dict[str, Any]:
        analysis = self.get_analysis(project_path)
        plan = plan_rename(
            graph=analysis["graph"],
            target_node_id=node_id,
            new_name=new_name,
        )
        if not plan.get("ok"):
            return plan

        verification = verify_plan(plan)
        plan["verified"] = verification.get("ok", False)
        if not verification.get("ok"):
            plan["verification_failures"] = verification.get("failures", [])
        return plan

    def apply_rename(
        self,
        project_path: Optional[str],
        node_id: str,
        new_name: str,
    ) -> dict[str, Any]:
        analysis = self.get_analysis(project_path)
        plan = plan_rename(
            graph=analysis["graph"],
            target_node_id=node_id,
            new_name=new_name,
        )
        if not plan.get("ok"):
            return {"success": False, "error": plan.get("error", "Failed to plan rename")}

        verification = verify_plan(plan)
        if not verification.get("ok"):
            return {
                "success": False,
                "error": verification.get("error", "Verification failed"),
                "failures": verification.get("failures", []),
            }

        apply_res = apply_rename(plan)
        if not apply_res.get("success"):
            return apply_res

        abs_root = self.resolve_project_root(project_path)
        self.invalidate_cache()
        new_analysis = self.get_analysis(abs_root)
        summary = new_analysis.get("summary", {})

        return {
            "success": True,
            "files_modified": apply_res.get("files_modified", []),
            "nodes": new_analysis.get("nodes", []),
            "edges": new_analysis.get("edges", []),
            "summary": {
                "total_nodes": summary.get("total_nodes", len(new_analysis.get("nodes", []))),
                "total_edges": summary.get("total_edges", len(new_analysis.get("edges", []))),
                "files_parsed": summary.get("total_files", 0),
                "resolved": summary.get("resolved_calls", 0),
                "ambiguous": summary.get("ambiguous_count", 0),
                "unresolved": summary.get("unresolved_count", 0),
            },
        }


service = ProjectService()

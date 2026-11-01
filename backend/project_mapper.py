from __future__ import annotations

import ast
import os
from typing import Any, Optional
import networkx as nx

from backend.analyzer import find_circular_dependencies, find_dead_functions

IGNORED_DIRS = frozenset({
    ".git", ".hg", ".svn", "__pycache__", ".pytest_cache", ".mypy_cache",
    ".ruff_cache", "venv", ".venv", "env", ".env", "virtualenv",
    "node_modules", "dist", "build", "eggs", ".eggs", "site-packages", ".tox",
})


# Complexity
def calculate_complexity(node: ast.AST) -> int:
    complexity = 1
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.IfExp, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.With, ast.AsyncWith, ast.Assert)):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            complexity += max(len(child.values) - 1, 1)
        elif isinstance(child, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            for generator in child.generators:
                complexity += len(generator.ifs)
    return complexity


# Formatting
def format_type_annotation(node: Optional[ast.AST]) -> Optional[str]:
    if node is None:
        return None
    try:
        return ast.unparse(node)
    except Exception:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            val = format_type_annotation(node.value)
            return f"{val}.{node.attr}" if val else node.attr
        if isinstance(node, ast.Constant):
            return repr(node.value)
        return "Any"


def format_decorator(node: ast.AST) -> str:
    try:
        return f"@{ast.unparse(node)}"
    except Exception:
        if isinstance(node, ast.Name):
            return f"@{node.id}"
        if isinstance(node, ast.Attribute):
            val = format_decorator(node.value).lstrip("@")
            return f"@{val}.{node.attr}"
        if isinstance(node, ast.Call):
            func_name = format_decorator(node.func).lstrip("@")
            return f"@{func_name}(...)"
        return "@decorator"


# Visitor
class ModuleASTVisitor(ast.NodeVisitor):
    def __init__(self, filepath: str, rel_path: str):
        self.filepath = os.path.abspath(filepath)
        self.rel_path = rel_path.replace("\\", "/")
        self.filename = os.path.basename(filepath)
        self.module_name = os.path.splitext(self.rel_path)[0].replace("/", ".")

        self.docstring: Optional[str] = None
        self.is_package_init = (self.filename == "__init__.py")
        self.has_main_block = False

        self.imports: list[dict[str, Any]] = []
        self.constants: list[dict[str, Any]] = []
        self.classes: list[dict[str, Any]] = []
        self.functions: list[dict[str, Any]] = []
        self.calls: list[dict[str, Any]] = []

        self._class_stack: list[str] = []
        self._function_stack: list[str] = []

    # Module
    def visit_Module(self, node: ast.Module):
        self.docstring = ast.get_docstring(node)
        self.generic_visit(node)

    # Entrypoint check
    def visit_If(self, node: ast.If):
        try:
            test_str = ast.unparse(node.test)
            if "__name__" in test_str and "__main__" in test_str:
                self.has_main_block = True
        except Exception:
            pass
        self.generic_visit(node)

    # Imports
    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.imports.append({
                "source_module": alias.name,
                "imported_name": "*",
                "alias": alias.asname or alias.name,
                "is_from": False,
                "line": node.lineno,
            })

    def visit_ImportFrom(self, node: ast.ImportFrom):
        source = node.module or ""
        if node.level > 0:
            source = "." * node.level + source

        for alias in node.names:
            self.imports.append({
                "source_module": source,
                "imported_name": alias.name,
                "alias": alias.asname or alias.name,
                "is_from": True,
                "level": node.level,
                "line": node.lineno,
            })

    # Constants
    def visit_Assign(self, node: ast.Assign):
        if not self._class_stack and not self._function_stack:
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id.isupper():
                    val_repr = None
                    try:
                        val_repr = ast.unparse(node.value)
                    except Exception:
                        pass
                    self.constants.append({
                        "name": target.id,
                        "line": node.lineno,
                        "value_preview": val_repr[:50] if val_repr else None,
                    })
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign):
        if not self._class_stack and not self._function_stack:
            if isinstance(node.target, ast.Name) and node.target.id.isupper():
                self.constants.append({
                    "name": node.target.id,
                    "type": format_type_annotation(node.annotation),
                    "line": node.lineno,
                })
        self.generic_visit(node)

    # Classes
    def visit_ClassDef(self, node: ast.ClassDef):
        bases: list[str] = []
        for b in node.bases:
            try:
                bases.append(ast.unparse(b))
            except Exception:
                if isinstance(b, ast.Name):
                    bases.append(b.id)

        decorators = [format_decorator(d) for d in node.decorator_list]
        docstring = ast.get_docstring(node)

        fields: list[dict[str, Any]] = []
        for stmt in node.body:
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                fields.append({
                    "name": stmt.target.id,
                    "type": format_type_annotation(stmt.annotation),
                    "line": stmt.lineno,
                })
            elif isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name):
                        fields.append({"name": target.id, "line": stmt.lineno})

        class_id = f"{self.module_name}::{node.name}"

        self.classes.append({
            "id": class_id,
            "name": node.name,
            "file": self.filepath,
            "rel_path": self.rel_path,
            "filename": self.filename,
            "module": self.module_name,
            "line_start": node.lineno,
            "line_end": getattr(node, "end_lineno", node.lineno),
            "col": node.col_offset,
            "bases": bases,
            "decorators": decorators,
            "docstring": docstring,
            "fields": fields,
        })

        self._class_stack.append(node.name)
        self.generic_visit(node)
        self._class_stack.pop()

    # Functions
    def _visit_func_def(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool):
        class_owner = self._class_stack[-1] if self._class_stack else None
        docstring = ast.get_docstring(node)
        decorators = [format_decorator(d) for d in node.decorator_list]

        parameters: list[dict[str, Any]] = []
        args_len = len(node.args.args)
        defaults_len = len(node.args.defaults)
        first_default_idx = args_len - defaults_len

        for idx, arg in enumerate(node.args.args):
            default_val = None
            if idx >= first_default_idx:
                try:
                    default_val = ast.unparse(node.args.defaults[idx - first_default_idx])
                except Exception:
                    default_val = "..."
            parameters.append({
                "name": arg.arg,
                "type": format_type_annotation(arg.annotation),
                "default": default_val,
            })

        if node.args.vararg:
            parameters.append({
                "name": f"*{node.args.vararg.arg}",
                "type": format_type_annotation(node.args.vararg.annotation),
                "default": None,
            })
        if node.args.kwarg:
            parameters.append({
                "name": f"**{node.args.kwarg.arg}",
                "type": format_type_annotation(node.args.kwarg.annotation),
                "default": None,
            })

        return_type = format_type_annotation(node.returns)
        complexity = calculate_complexity(node)

        if complexity > 20:
            rating = "critical"
        elif complexity > 10:
            rating = "high"
        elif complexity > 5:
            rating = "moderate"
        else:
            rating = "low"

        if class_owner:
            func_id = f"{self.module_name}::{class_owner}::{node.name}"
            kind = "method"
        else:
            func_id = f"{self.module_name}::{node.name}"
            kind = "async_function" if is_async else "function"

        param_strs: list[str] = []
        for p in parameters:
            s = p["name"]
            if p["type"]:
                s += f": {p['type']}"
            if p["default"] is not None:
                s += f" = {p['default']}"
            param_strs.append(s)

        sig = f"def {node.name}({', '.join(param_strs)})"
        if is_async:
            sig = "async " + sig
        if return_type:
            sig += f" -> {return_type}"
        sig += ":"

        self.functions.append({
            "id": func_id,
            "name": node.name,
            "kind": kind,
            "is_async": is_async,
            "is_private": node.name.startswith("_") and not node.name.startswith("__"),
            "file": self.filepath,
            "rel_path": self.rel_path,
            "filename": self.filename,
            "module": self.module_name,
            "class_owner": class_owner,
            "line_start": node.lineno,
            "line_end": getattr(node, "end_lineno", node.lineno),
            "col": node.col_offset,
            "loc": getattr(node, "end_lineno", node.lineno) - node.lineno + 1,
            "signature": sig,
            "parameters": parameters,
            "args": [p["name"] for p in parameters if not p["name"].startswith("*")],
            "return_type": return_type,
            "decorators": decorators,
            "docstring": docstring,
            "cyclomatic_complexity": complexity,
            "complexity_rating": rating,
        })

        self._function_stack.append(func_id)
        self.generic_visit(node)
        self._function_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._visit_func_def(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._visit_func_def(node, is_async=True)

    # Calls
    def visit_Call(self, node: ast.Call):
        caller_id = self._function_stack[-1] if self._function_stack else None
        callee_name = None
        receiver = None

        if isinstance(node.func, ast.Name):
            callee_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            callee_name = node.func.attr
            try:
                receiver = ast.unparse(node.func.value)
            except Exception:
                if isinstance(node.func.value, ast.Name):
                    receiver = node.func.value.id

        if callee_name and caller_id:
            self.calls.append({
                "caller_id": caller_id,
                "callee_name": callee_name,
                "receiver": receiver,
                "line": node.lineno,
                "col": node.col_offset,
                "file": self.filepath,
                "rel_path": self.rel_path,
                "module": self.module_name,
            })

        self.generic_visit(node)


# Architecture mapper
class ProjectArchitectureMapper:
    def __init__(self, root_path: str):
        self.root_path = os.path.abspath(root_path)
        self.project_name = os.path.basename(self.root_path) or "Python Project"
        self.parsed_modules: dict[str, ModuleASTVisitor] = {}
        self.G: nx.DiGraph = nx.DiGraph()

    # Scan & parse
    def scan_and_parse(self) -> dict[str, Any]:
        total_files = 0
        total_lines = 0
        total_code_lines = 0
        packages: set[str] = set()

        for dirpath, dirnames, filenames in os.walk(self.root_path):
            dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]

            for fname in filenames:
                if not fname.endswith(".py"):
                    continue

                full_path = os.path.join(dirpath, fname)
                rel_path = os.path.relpath(full_path, self.root_path).replace("\\", "/")

                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        source_code = f.read()
                except IOError:
                    continue

                lines = source_code.splitlines()
                total_files += 1
                total_lines += len(lines)
                total_code_lines += sum(1 for l in lines if l.strip() and not l.strip().startswith("#"))

                if fname == "__init__.py":
                    pkg_rel = os.path.dirname(rel_path)
                    if pkg_rel:
                        packages.add(pkg_rel)

                try:
                    tree = ast.parse(source_code, filename=rel_path)
                    visitor = ModuleASTVisitor(full_path, rel_path)
                    visitor.visit(tree)
                    self.parsed_modules[visitor.module_name] = visitor
                except SyntaxError:
                    pass

        return {
            "total_files": total_files,
            "total_lines": total_lines,
            "total_code_lines": total_code_lines,
            "packages": sorted(list(packages)),
        }

    # Graph construction
    def build_architecture_graph(self) -> dict[str, Any]:
        G = nx.DiGraph()
        symbol_index: dict[str, dict[str, Any]] = {}
        class_by_name: dict[str, list[str]] = {}
        all_classes: dict[str, dict[str, Any]] = {}

        # Class nodes
        for mod in self.parsed_modules.values():
            for cls in mod.classes:
                cls_id = cls["id"]
                symbol_index[cls_id] = {**cls, "kind": "class"}
                class_by_name.setdefault(cls["name"], []).append(cls_id)
                all_classes[cls_id] = cls

                G.add_node(
                    cls_id,
                    name=cls["name"],
                    kind="class",
                    file=cls["file"],
                    rel_path=cls["rel_path"],
                    filename=cls["filename"],
                    module=cls["module"],
                    line=cls["line_start"],
                    line_end=cls["line_end"],
                    col=cls["col"],
                    bases=cls["bases"],
                    decorators=cls["decorators"],
                    docstring=cls["docstring"],
                    fields=cls["fields"],
                )

        # Function nodes
        for mod in self.parsed_modules.values():
            for fn in mod.functions:
                fn_id = fn["id"]
                symbol_index[fn_id] = fn

                G.add_node(
                    fn_id,
                    name=fn["name"],
                    kind=fn["kind"],
                    is_async=fn["is_async"],
                    is_private=fn["is_private"],
                    file=fn["file"],
                    rel_path=fn["rel_path"],
                    filename=fn["filename"],
                    module=fn["module"],
                    line=fn["line_start"],
                    line_end=fn["line_end"],
                    col=fn["col"],
                    loc=fn["loc"],
                    signature=fn["signature"],
                    parameters=fn["parameters"],
                    args=fn["args"],
                    return_type=fn["return_type"],
                    decorators=fn["decorators"],
                    docstring=fn["docstring"],
                    class_owner=fn["class_owner"],
                    cyclomatic_complexity=fn["cyclomatic_complexity"],
                    complexity_rating=fn["complexity_rating"],
                )

        # Inheritance edges
        for cls_id, cls in all_classes.items():
            for base in cls["bases"]:
                for b_id in class_by_name.get(base, []):
                    G.add_edge(cls_id, b_id, type="inherits", line=cls["line_start"])

        # Call edges
        resolved_calls = 0
        unresolved_calls = 0
        ambiguous_calls: list[dict[str, Any]] = []
        unresolved_list: list[dict[str, Any]] = []

        for mod in self.parsed_modules.values():
            import_map: dict[str, tuple[str, str]] = {}
            for imp in mod.imports:
                src = imp["source_module"]
                if src.startswith("."):
                    level = imp.get("level", 1)
                    parts = mod.module_name.split(".")
                    base_parts = parts[:-level] if level <= len(parts) else []
                    rem = src.lstrip(".")
                    src = ".".join(base_parts + ([rem] if rem else []))
                import_map[imp["alias"]] = (src, imp["imported_name"])

            for call in mod.calls:
                caller_id = call["caller_id"]
                callee_name = call["callee_name"]
                receiver = call["receiver"]

                resolved_target_id = None
                edge_type = "calls"

                # Self call
                if receiver == "self":
                    caller_data = symbol_index.get(caller_id, {})
                    class_owner = caller_data.get("class_owner")
                    if class_owner:
                        candidate_id = f"{mod.module_name}::{class_owner}::{callee_name}"
                        if candidate_id in G:
                            resolved_target_id = candidate_id

                # Imported alias
                elif receiver and receiver in import_map:
                    target_mod, _ = import_map[receiver]
                    candidate_fn_id = f"{target_mod}::{callee_name}"
                    if candidate_fn_id in G:
                        resolved_target_id = candidate_fn_id
                    elif callee_name in class_by_name:
                        matches = [c for c in class_by_name[callee_name] if c.startswith(target_mod)]
                        if matches:
                            resolved_target_id = matches[0]
                            edge_type = "instantiates"

                # Direct import
                elif not receiver and callee_name in import_map:
                    target_mod, target_sym = import_map[callee_name]
                    class_matches = [c for c in class_by_name.get(target_sym, []) if c.startswith(target_mod)]
                    if class_matches:
                        resolved_target_id = class_matches[0]
                        edge_type = "instantiates"
                    else:
                        candidate_fn_id = f"{target_mod}::{target_sym}"
                        if candidate_fn_id in G:
                            resolved_target_id = candidate_fn_id

                # Local scope
                elif not receiver:
                    local_fn_id = f"{mod.module_name}::{callee_name}"
                    if local_fn_id in G:
                        resolved_target_id = local_fn_id
                    elif callee_name in class_by_name:
                        local_classes = [c for c in class_by_name[callee_name] if c.startswith(mod.module_name)]
                        if local_classes:
                            resolved_target_id = local_classes[0]
                            edge_type = "instantiates"

                # Global fallback
                if not resolved_target_id and not receiver:
                    matches = [
                        n for n, d in G.nodes(data=True)
                        if d.get("name") == callee_name and d.get("kind") in ("function", "async_function")
                    ]
                    if len(matches) == 1:
                        resolved_target_id = matches[0]
                    elif len(matches) > 1:
                        ambiguous_calls.append(call)

                if resolved_target_id and caller_id in G:
                    G.add_edge(
                        caller_id,
                        resolved_target_id,
                        type=edge_type,
                        line=call["line"],
                        col=call.get("col", 0),
                        file=call.get("file", ""),
                    )
                    resolved_calls += 1
                else:
                    unresolved_calls += 1
                    unresolved_list.append(call)

        self.G = G
        return {
            "graph": G,
            "resolved_calls": resolved_calls,
            "unresolved_calls": unresolved_calls,
            "ambiguous_calls": ambiguous_calls,
            "unresolved_list": unresolved_list,
        }

    # Layers
    def detect_layers(self, G: nx.DiGraph) -> dict[str, list[str]]:
        layers: dict[str, list[str]] = {
            "presentation": [],
            "services": [],
            "persistence": [],
            "utilities": [],
            "core": [],
        }

        for node_id, data in G.nodes(data=True):
            file_lower = (data.get("file") or "").lower()
            name_lower = (data.get("name") or "").lower()
            decorators = [d.lower() for d in data.get("decorators", [])]

            is_presentation = (
                name_lower in ("main", "run", "cli", "app")
                or any("route" in d or "endpoint" in d or "get(" in d or "post(" in d for d in decorators)
                or any(k in file_lower for k in ("api", "routes", "views", "controllers", "endpoints"))
            )
            is_persistence = (
                any(k in file_lower for k in ("database", "db", "models", "repository", "sql", "entity"))
                or (data.get("kind") == "class" and any(b in ("Base", "Model", "SQLModel", "DeclarativeBase") for b in data.get("bases", [])))
            )
            is_core = any(k in file_lower for k in ("config", "setting", "error", "exception", "constant", "types"))
            is_util = any(k in file_lower for k in ("util", "helper", "tool", "common"))

            if is_presentation:
                tier = "presentation"
            elif is_persistence:
                tier = "persistence"
            elif is_core:
                tier = "core"
            elif is_util:
                tier = "utilities"
            else:
                tier = "services"

            layers[tier].append(node_id)
            data["tier"] = tier

        return layers

    # Diagnostics
    def detect_diagnostics(self, G: nx.DiGraph) -> dict[str, Any]:
        cycles = find_circular_dependencies(G)
        dead_functions = find_dead_functions(G)

        # Complexity hotspots
        hotspots: list[dict[str, Any]] = []
        for node_id, data in G.nodes(data=True):
            cc = data.get("cyclomatic_complexity", 1)
            if cc > 8:
                hotspots.append({
                    "id": node_id,
                    "name": data.get("name"),
                    "file": data.get("file"),
                    "filename": data.get("filename"),
                    "line": data.get("line"),
                    "complexity": cc,
                    "rating": data.get("complexity_rating", "moderate"),
                })
        hotspots.sort(key=lambda x: x["complexity"], reverse=True)

        # Coupling
        module_ca: dict[str, set[str]] = {m: set() for m in self.parsed_modules}
        module_ce: dict[str, set[str]] = {m: set() for m in self.parsed_modules}

        for u, v, _ in G.edges(data=True):
            mod_u = G.nodes[u].get("module")
            mod_v = G.nodes[v].get("module")
            if mod_u and mod_v and mod_u != mod_v:
                module_ce.setdefault(mod_u, set()).add(mod_v)
                module_ca.setdefault(mod_v, set()).add(mod_u)

        coupling_metrics: dict[str, dict[str, Any]] = {}
        for mod_name in self.parsed_modules:
            ca = len(module_ca.get(mod_name, set()))
            ce = len(module_ce.get(mod_name, set()))
            instability = round(ce / (ca + ce), 2) if (ca + ce) > 0 else 0.0
            coupling_metrics[mod_name] = {
                "afferent_coupling_ca": ca,
                "efferent_coupling_ce": ce,
                "instability_metric": instability,
            }

        return {
            "cycles": cycles,
            "dead_functions": dead_functions,
            "hotspots": hotspots,
            "coupling_metrics": coupling_metrics,
        }

    # Project map
    def generate_project_map(self) -> dict[str, Any]:
        scan_meta = self.scan_and_parse()
        graph_res = self.build_architecture_graph()
        G = graph_res["graph"]

        layers = self.detect_layers(G)
        diagnostics = self.detect_diagnostics(G)

        nodes_list = [{"id": node_id, **data} for node_id, data in G.nodes(data=True)]
        edges_list = [
            {
                "source": u,
                "target": v,
                "type": d.get("type", "calls"),
                "line": d.get("line"),
                "col": d.get("col"),
                "file": d.get("file"),
            }
            for u, v, d in G.edges(data=True)
        ]

        modules_list = [
            {
                "module_name": mod.module_name,
                "filename": mod.filename,
                "rel_path": mod.rel_path,
                "docstring": mod.docstring,
                "is_package_init": mod.is_package_init,
                "has_main_block": mod.has_main_block,
                "constants": mod.constants,
                "imports": mod.imports,
                "symbols_count": len(mod.classes) + len(mod.functions),
                "coupling": diagnostics["coupling_metrics"].get(mod_name, {}),
            }
            for mod_name, mod in self.parsed_modules.items()
        ]

        summary = {
            "total_files": scan_meta["total_files"],
            "total_lines": scan_meta["total_lines"],
            "total_code_lines": scan_meta["total_code_lines"],
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "total_classes": sum(1 for _, d in G.nodes(data=True) if d.get("kind") == "class"),
            "total_functions": sum(1 for _, d in G.nodes(data=True) if d.get("kind") != "class"),
            "circular_cycles_count": len(diagnostics["cycles"]),
            "dead_functions_count": len(diagnostics["dead_functions"]),
            "resolved_calls": graph_res["resolved_calls"],
            "unresolved_calls": graph_res["unresolved_calls"],
            "ambiguous_count": len(graph_res.get("ambiguous_calls", [])),
            "unresolved_count": len(graph_res.get("unresolved_list", [])),
        }

        return {
            "project": {
                "name": self.project_name,
                "root_path": self.root_path,
                "packages": scan_meta["packages"],
                "total_files": scan_meta["total_files"],
                "total_lines": scan_meta["total_lines"],
                "total_code_lines": scan_meta["total_code_lines"],
            },
            "summary": summary,
            "modules": modules_list,
            "nodes": nodes_list,
            "edges": edges_list,
            "layers": layers,
            "diagnostics": diagnostics,
            "graph": G,
        }

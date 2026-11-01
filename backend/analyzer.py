from __future__ import annotations

import os
import re
from typing import Any
import networkx as nx

ENTRYPOINTS = frozenset({"main", "run", "app", "start", "init", "setup", "cli"})
FRAMEWORK_DECORATORS = re.compile(
    r"@(app|router|bp|blueprint|pytest|fixture|property|validator|classmethod|staticmethod)",
    re.IGNORECASE,
)


# Helpers
def _build_call_subgraph(graph: nx.DiGraph) -> nx.DiGraph:
    sub = nx.DiGraph()
    sub.add_nodes_from(graph.nodes())
    for u, v, data in graph.edges(data=True):
        if data.get("type") in ("calls", "instantiates"):
            sub.add_edge(u, v)
    return sub


# Cycles
def find_circular_dependencies(graph: nx.DiGraph) -> list[list[str]]:
    sub = _build_call_subgraph(graph)
    try:
        cycles = list(nx.simple_cycles(sub))
        return [sorted(cycle) for cycle in cycles]
    except Exception:
        return []


# Dead code
def find_dead_functions(graph: nx.DiGraph) -> list[dict[str, Any]]:
    instantiated = {
        v for _, v, data in graph.edges(data=True) if data.get("type") == "instantiates"
    }

    dead: list[dict[str, Any]] = []

    for node_id, data in graph.nodes(data=True):
        if data.get("kind") not in ("function", "async_function", "method"):
            continue

        name = data.get("name", "")
        if (name.startswith("__") and name.endswith("__")) or name in ENTRYPOINTS:
            continue

        decorators = data.get("decorators", [])
        if any(FRAMEWORK_DECORATORS.search(d) for d in decorators):
            continue

        class_owner = data.get("class_owner")
        if class_owner:
            module = data.get("module", "")
            class_id = f"{module}::{class_owner}" if module else None
            filename_base = os.path.splitext(os.path.basename(data.get("file", "")))[0]
            legacy_class_id = f"{filename_base}::{class_owner}"
            if (class_id and class_id in instantiated) or (legacy_class_id in instantiated):
                continue

        incoming = [
            u for u, _, edge in graph.in_edges(node_id, data=True)
            if edge.get("type") in ("calls", "instantiates")
        ]
        if not incoming:
            dead.append({
                "id": node_id,
                "name": name,
                "file": data.get("file", ""),
                "filename": data.get("filename", os.path.basename(data.get("file", ""))),
                "line": data.get("line", 1),
                "cyclomatic_complexity": data.get("cyclomatic_complexity", 1),
                **{k: v for k, v in data.items() if k not in ("id", "name", "file", "filename", "line", "cyclomatic_complexity")},
            })

    return dead


# Impact
def impact_analysis(graph: nx.DiGraph, node_id: str) -> dict[str, Any]:
    if node_id not in graph:
        return {
            "node": node_id,
            "error": f"Node '{node_id}' not found in graph",
            "callers": [],
            "callees": [],
            "direct_callers": [],
            "direct_callees": [],
        }

    sub = _build_call_subgraph(graph)
    return {
        "node": node_id,
        "callers": sorted(list(nx.ancestors(sub, node_id))),
        "callees": sorted(list(nx.descendants(sub, node_id))),
        "direct_callers": sorted([u for u, _, _ in sub.in_edges(node_id, data=True)]),
        "direct_callees": sorted([v for _, v, _ in sub.out_edges(node_id, data=True)]),
    }

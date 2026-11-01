from __future__ import annotations

import os
import sys
from typing import Any
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.project_service import service

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
WEBSITE_DIR = os.path.join(os.path.dirname(__file__), "website")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)


# Static
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/download")
def download():
    return send_from_directory(WEBSITE_DIR, "index.html")


@app.route("/website/<path:path>")
def website_static(path: str):
    return send_from_directory(WEBSITE_DIR, path)


@app.route("/<path:path>")
def static_proxy(path: str):
    target = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(target):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


# Health
@app.route("/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


# Folder picker
@app.route("/api/choose-folder", methods=["GET", "POST"])
def api_choose_folder():
    from concurrent.futures import ThreadPoolExecutor
    data = request.get_json(silent=True) or {}
    initial_dir = data.get("initial_dir", "")

    def _show_dialog():
        init = initial_dir if initial_dir and os.path.isdir(initial_dir) else os.getcwd()

        # Tkinter
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            p = filedialog.askdirectory(title="Select Python Project Folder - Irminsul IDE", initialdir=init)
            root.destroy()
            if p:
                return p
        except Exception:
            pass

        # Windows
        if sys.platform == "win32":
            try:
                import subprocess
                ps_script = (
                    "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
                    "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
                    "$f.Description = 'Select Python Project Folder - Irminsul IDE'; "
                    "$f.ShowNewFolderButton = $true; "
                    f"$f.SelectedPath = '{init}'; "
                    "if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"
                )
                res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=120)
                out = res.stdout.strip()
                if out and os.path.isdir(out):
                    return out
            except Exception:
                pass

        # macOS
        if sys.platform == "darwin":
            try:
                import subprocess
                cmd = ["osascript", "-e", 'POSIX path of (choose folder with prompt "Select Python Project Folder - Irminsul IDE")']
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                out = res.stdout.strip()
                if out and os.path.isdir(out):
                    return out
            except Exception:
                pass

        # Linux
        if sys.platform.startswith("linux"):
            try:
                import subprocess
                cmd = ["zenity", "--file-selection", "--directory", "--title=Select Python Project Folder - Irminsul IDE"]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                out = res.stdout.strip()
                if out and os.path.isdir(out):
                    return out
            except Exception:
                pass

        return ""

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_show_dialog)
            chosen_path = future.result(timeout=180)

        if chosen_path:
            return jsonify({"success": True, "path": os.path.abspath(chosen_path)})
        return jsonify({"success": False, "cancelled": True, "path": ""})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc), "path": ""}), 500


# Analysis
@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    project_path = data.get("project_path", "")
    force_refresh = bool(data.get("refresh", False))

    try:
        result = service.get_analysis(project_path=project_path, force_refresh=force_refresh)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500

    return jsonify({
        "project": result["project"],
        "modules": result["modules"],
        "nodes": result["nodes"],
        "edges": result["edges"],
        "layers": result["layers"],
        "diagnostics": result["diagnostics"],
        "summary": result["summary"],
    })


@app.route("/analyze/project-map", methods=["GET", "POST"])
def project_map():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        project_path = data.get("project_path", "")
    else:
        project_path = request.args.get("project_path", "")

    try:
        result = service.get_analysis(project_path=project_path)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500

    return jsonify(result)


# Source snippet
@app.route("/source")
def source():
    file_path = request.args.get("file", "").strip()
    if not file_path:
        return jsonify({"error": "file parameter is required"}), 400

    try:
        target_line = int(request.args.get("line", "1"))
    except ValueError:
        return jsonify({"error": "line parameter must be an integer"}), 400

    try:
        context_lines = int(request.args.get("context", "4"))
    except ValueError:
        context_lines = 4

    project_path = request.args.get("project_path")

    try:
        snippet = service.get_source_snippet(
            project_path=project_path,
            file_path=file_path,
            line=target_line,
            context=context_lines,
        )
        return jsonify(snippet)
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# File I/O
@app.route("/file/content")
def file_content():
    file_path = request.args.get("file", "").strip()
    if not file_path:
        return jsonify({"error": "file parameter is required"}), 400

    project_path = request.args.get("project_path")

    try:
        content_info = service.get_file_content(project_path=project_path, file_path=file_path)
        return jsonify(content_info)
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/file/save", methods=["POST"])
def save_file():
    data = request.get_json(silent=True) or {}
    file_path = data.get("file", "").strip()
    content = data.get("content")
    project_path = data.get("project_path", "").strip()

    if not file_path:
        return jsonify({"error": "file parameter is required"}), 400
    if content is None:
        return jsonify({"error": "content parameter is required"}), 400

    try:
        res = service.save_file_content(
            project_path=project_path or None,
            file_path=file_path,
            content=content,
        )
        if not res.get("success"):
            return jsonify(res), 400
        return jsonify(res)
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Diagnostics
@app.route("/analyze/circular-deps", methods=["POST"])
def circular_deps():
    data = request.get_json(silent=True) or {}
    project_path = data.get("project_path", "")

    try:
        res = service.get_circular_dependencies(project_path=project_path)
        return jsonify(res)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze/dead-code", methods=["POST"])
def dead_code():
    data = request.get_json(silent=True) or {}
    project_path = data.get("project_path", "")

    try:
        res = service.get_dead_code(project_path=project_path)
        return jsonify(res)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze/impact")
def impact():
    node_id = request.args.get("node", "").strip()
    project_path = request.args.get("project_path", "").strip()

    if not node_id:
        return jsonify({"error": "node parameter is required"}), 400

    try:
        res = service.get_impact_analysis(project_path=project_path or None, node_id=node_id)
        if res.get("error"):
            return jsonify(res), 404
        return jsonify(res)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Refactoring
@app.route("/refactor/rename/preview", methods=["POST"])
def rename_preview():
    data = request.get_json(silent=True) or {}
    project_path = data.get("project_path", "")
    node_id = data.get("node_id", "")
    new_name = data.get("new_name", "")

    if not node_id or not new_name:
        return jsonify({"error": "node_id and new_name are required"}), 400

    try:
        plan = service.preview_rename(project_path=project_path, node_id=node_id, new_name=new_name)
        if not plan.get("ok"):
            return jsonify(plan), 400
        return jsonify(plan)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/refactor/rename/apply", methods=["POST"])
def rename_apply():
    data = request.get_json(silent=True) or {}
    project_path = data.get("project_path", "")
    node_id = data.get("node_id", "")
    new_name = data.get("new_name", "")

    if not node_id or not new_name:
        return jsonify({"error": "node_id and new_name are required"}), 400

    try:
        result = service.apply_rename(project_path=project_path, node_id=node_id, new_name=new_name)
        if not result.get("success"):
            status_code = 409 if "Verification failed" in result.get("error", "") else 400
            return jsonify(result), status_code
        return jsonify(result)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Terminal
@app.route("/terminal/run", methods=["POST"])
def terminal_run():
    import subprocess
    data = request.get_json(silent=True) or {}
    command = data.get("command", "").strip()
    project_path = data.get("project_path", "").strip()

    if not command:
        return jsonify({"error": "command is required"}), 400

    cwd = project_path if (project_path and os.path.isdir(project_path)) else os.path.dirname(os.path.abspath(__file__))

    try:
        res = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=20,
        )
        return jsonify({
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode,
            "cwd": cwd,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command execution timed out (20s limit)", "exit_code": 124, "cwd": cwd}), 408
    except Exception as e:
        return jsonify({"error": str(e), "exit_code": 1, "cwd": cwd}), 500


# Helpers
def _resolve_project_path(path: str = "") -> str:
    return service.resolve_project_root(path)


def _get_result(project_path: str = "") -> dict[str, Any]:
    return service.get_analysis(project_path)


def _invalidate_cache() -> None:
    service.invalidate_cache()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5173))
    print(f"Irminsul IDE API -> http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)

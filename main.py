import os
import sys
import threading
import time
import webview

# Encoding
if sys.stdout is not None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
else:
    sys.stdout = open(os.devnull, "w", encoding="utf-8", errors="replace")

if sys.stderr is not None:
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
else:
    sys.stderr = open(os.devnull, "w", encoding="utf-8", errors="replace")


# Resource path
def resource_path(relative: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative)


sys.path.insert(0, resource_path("."))

from app import app as flask_app


# Port search
def find_available_port(preferred_port: int = 5173) -> int:
    import socket
    for p in range(preferred_port, preferred_port + 30):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", p))
                return p
        except OSError:
            continue
    return preferred_port


PORT = find_available_port(5173)


# Server thread
def _run_flask():
    import logging
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    flask_app.run(
        host="127.0.0.1",
        port=PORT,
        debug=False,
        use_reloader=False,
    )


# Readiness check
def _wait_for_flask(timeout: float = 10.0) -> bool:
    import socket
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.1)
    return False


if __name__ == "__main__":
    flask_thread = threading.Thread(target=_run_flask, daemon=True)
    flask_thread.start()

    # Pre-warm cache
    def _prewarm():
        try:
            from app import _get_result, _resolve_project_path
            p = _resolve_project_path("")
            _get_result(p)
        except Exception:
            pass

    threading.Thread(target=_prewarm, daemon=True).start()

    if not _wait_for_flask():
        print(f"ERROR: Flask server did not start on port {PORT} in time.", file=sys.stderr)
        sys.exit(1)

    print(f"Irminsul IDE -> http://127.0.0.1:{PORT}")

    # Desktop API
    class DesktopApi:
        def open_folder_dialog(self):
            result = window.create_file_dialog(webview.FOLDER_DIALOG)
            return result[0] if result and len(result) > 0 else None

        def choose_folder(self):
            return self.open_folder_dialog()

        def minimize_window(self):
            try:
                window.minimize()
            except Exception:
                pass

        def toggle_maximize_window(self):
            try:
                if getattr(window, "maximized", False):
                    window.restore()
                else:
                    window.maximize()
            except Exception:
                pass

        def close_window(self):
            try:
                window.destroy()
            except Exception:
                pass

    api = DesktopApi()

    # Window creation
    window = webview.create_window(
        title="Irminsul IDE",
        url=f"http://127.0.0.1:{PORT}",
        width=1440,
        height=900,
        resizable=True,
        min_size=(960, 640),
        background_color="#1e1e1e",
        js_api=api,
    )

    icon_path = resource_path("icon.ico")
    icon_arg = icon_path if os.path.isfile(icon_path) else None

    # Windows taskbar
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("shuklashri.irminsulide.1.0")
    except Exception:
        pass

    # Windows icon
    def apply_native_icon():
        if os.name != "nt" or not icon_arg:
            return
        try:
            import ctypes
            time.sleep(0.1)
            WM_SETICON = 0x0080
            ICON_SMALL = 0
            ICON_BIG = 1
            LR_LOADFROMFILE = 0x00000010
            IMAGE_ICON = 1

            hwnd = None
            if hasattr(window, "native") and window.native:
                try:
                    hwnd = int(window.native.Handle.ToInt64())
                except Exception:
                    pass
            if not hwnd:
                hwnd = ctypes.windll.user32.FindWindowW(None, "Irminsul IDE")

            if hwnd:
                h_small = ctypes.windll.user32.LoadImageW(None, icon_arg, IMAGE_ICON, 16, 16, LR_LOADFROMFILE)
                h_big = ctypes.windll.user32.LoadImageW(None, icon_arg, IMAGE_ICON, 32, 32, LR_LOADFROMFILE)
                if h_small:
                    ctypes.windll.user32.SendMessageW(hwnd, WM_SETICON, ICON_SMALL, h_small)
                if h_big:
                    ctypes.windll.user32.SendMessageW(hwnd, WM_SETICON, ICON_BIG, h_big)
        except Exception:
            pass

    window.events.shown += apply_native_icon

    # Start webview
    if sys.platform == "win32":
        try:
            webview.start(apply_native_icon, gui="edgechromium", debug=False, icon=icon_arg)
        except Exception:
            webview.start(apply_native_icon, debug=False, icon=icon_arg)
    elif sys.platform == "darwin":
        webview.start(debug=False)
    else:
        try:
            webview.start(debug=False, gui="gtk")
        except Exception:
            try:
                webview.start(debug=False, gui="qt")
            except Exception:
                webview.start(debug=False)

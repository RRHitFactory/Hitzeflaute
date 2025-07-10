import threading
import webbrowser
from pathlib import Path

from livereload import Server


class LiveHtml:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.port = 5500
        self.server = Server()

    @staticmethod
    def _run_server(server: Server, root: str, path: str, port: int) -> None:
        server.watch(path)
        server.serve(open_url=False, port=port, root=root)

    def start(self) -> None:
        filename = self.path.name
        if not filename.endswith(".html"):
            raise ValueError("File must end with .html")
        if not self.path.exists():
            raise FileNotFoundError(f"File {filename} does not exist at {self.path}")
        server = self.server
        root = str(self.path.parent)
        path = str(self.path)
        port = self.port
        threading.Thread(target=self._run_server, args=(server, root, path, port), daemon=True).start()
        webbrowser.open_new_tab(f"http://localhost:{port}/{filename}")

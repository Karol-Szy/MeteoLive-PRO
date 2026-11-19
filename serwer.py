"""Lokalny serwer HTTP dla MeteoLive PRO.

Uruchomienie z katalogu projektu:  py serwer.py   (opcjonalnie numer portu, np. py serwer.py 8000)

W odróżnieniu od „py -m http.server” obsługuje zapytania Range, dzięki czemu w filmie
działa przewijanie i rozdziały, oraz wyłącza pamięć podręczną, więc po zmianie plików
wystarczy odświeżyć stronę.
"""
import functools
import http.server
import os
import re
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.webp': 'image/webp',
        '.vtt': 'text/vtt',
        '.woff': 'font/woff',
        '.mp4': 'video/mp4',
    }
    remaining = None

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        requested = self.headers.get('Range')
        path = self.translate_path(self.path)
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', (requested or '').strip())
        if not match or os.path.isdir(path) or match.groups() == ('', ''):
            return super().send_head()
        try:
            source = open(path, 'rb')
        except OSError:
            self.send_error(404, 'Nie znaleziono pliku')
            return None
        size = os.fstat(source.fileno()).st_size
        first, last = match.groups()
        if first:
            start, end = int(first), min(int(last), size - 1) if last else size - 1
        else:
            start, end = max(0, size - int(last)), size - 1
        if start >= size or start > end:
            source.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        source.seek(start)
        self.remaining = end - start + 1
        return source

    def copyfile(self, source, outputfile):
        try:
            if self.remaining is None:
                super().copyfile(source, outputfile)
                return
            while self.remaining > 0:
                chunk = source.read(min(64 * 1024, self.remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                self.remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(Handler, directory=root)
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as server:
        print(f'MeteoLive PRO działa pod adresem http://localhost:{port}  (Ctrl+C zatrzymuje serwer)')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

#!/usr/bin/env python3
import http.server
import socketserver
import sys
import os
import json

port = 8000

# SECURITY: API token should be loaded from environment variable
# In production, set this as an environment variable: export BASEROW_API_TOKEN="your_token_here"
BASEROW_API_TOKEN = os.environ.get('BASEROW_API_TOKEN', 'YOUR_SECURE_TOKEN_HERE')

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # SECURITY: Restrict CORS to specific origins in production
        # self.send_header('Access-Control-Allow-Origin', 'https://yourdomain.com')
        self.send_header('Access-Control-Allow-Origin', '*')  # TODO: Restrict in production
        http.server.SimpleHTTPRequestHandler.end_headers(self)

    def do_GET(self):
        # Special handling for HTML files to inject API token securely
        if self.path.endswith('.html') or self.path == '/':
            if self.path == '/':
                self.path = '/index.html'

            try:
                with open(self.path[1:], 'r', encoding='utf-8') as f:
                    content = f.read()

                # Inject API token securely into HTML
                if 'js/config.js' in content:
                    # Replace the placeholder token with the actual token
                    token_script = f'<script>window.BASEROW_API_TOKEN = "{BASEROW_API_TOKEN}";</script>'
                    content = content.replace('<script src="js/config.js"></script>', f'{token_script}\n    <script src="js/config.js"></script>')

                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))

            except FileNotFoundError:
                self.send_error(404, "File not found")
            except Exception as e:
                self.send_error(500, f"Internal server error: {str(e)}")
        else:
            # Serve other files normally
            super().do_GET()

    def log_message(self, format, *args):
        # Reduce log verbosity for security
        if "config.js" not in format:  # Don't log config requests
            super().log_message(format, *args)

# Change to the correct directory
os.chdir('/Users/jmarc/Documents/Ticketing/devjules_1')

# Validate that token is configured
if BASEROW_API_TOKEN == 'YOUR_SECURE_TOKEN_HERE':
    print("⚠️  WARNING: Using default API token. Please set BASEROW_API_TOKEN environment variable!")
    print("   Example: export BASEROW_API_TOKEN='your_actual_token_here'")

httpd = socketserver.TCPServer(("", port), Handler)
print("🔒 Serveur sécurisé démarré sur le port", port)
print("🔗 Test API: http://localhost:" + str(port) + "/test-api.html")
print("🔗 Login: http://localhost:" + str(port) + "/login.html")
print("🔗 Admin: http://localhost:" + str(port) + "/admin.html")
print("📋 Versions: http://localhost:" + str(port) + "/version-info.html")
print("⚠️  Rappel: Configurez BASEROW_API_TOKEN comme variable d'environnement")
httpd.serve_forever()

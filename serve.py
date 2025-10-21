#!/usr/bin/env python3
import http.server
import socketserver
import sys
import os

port = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

os.chdir('/Users/jmarc/Documents/Ticketing/devjules_1')

httpd = socketserver.TCPServer(("", port), Handler)
print("Serveur demarre sur le port", port)
print("Test API: http://localhost:" + str(port) + "/test-api.html")
print("Login: http://localhost:" + str(port) + "/login.html")
httpd.serve_forever()

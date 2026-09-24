#!/bin/sh
set -eu
cat > /usr/share/nginx/html/config.js <<EOF
window.__STREAMFLIX_CONFIG__ = {
  API_URL: "${VITE_API_URL:-http://localhost:4000}"
};
EOF
exec nginx -g 'daemon off;'

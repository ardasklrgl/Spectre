#!/bin/zsh
set -eu
cd "$(dirname "$0")"
if ! command -v cargo >/dev/null 2>&1; then
  if [[ -f "$HOME/.cargo/env" ]]; then source "$HOME/.cargo/env"; fi
fi
if ! command -v cargo >/dev/null 2>&1; then
  print 'Rust is required. Install from https://rustup.rs then run this file again.'
  exit 1
fi
command -v npm >/dev/null 2>&1 || { print 'Node.js is required: https://nodejs.org'; exit 1; }
npm install
npm run desktop

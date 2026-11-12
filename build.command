#!/bin/zsh
set -eu
cd "$(dirname "$0")"
[[ ! -f "$HOME/.cargo/env" ]] || source "$HOME/.cargo/env"
command -v cargo >/dev/null 2>&1 || { print 'Install Rust from https://rustup.rs first.'; exit 1; }
npm install
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run bundle
open src-tauri/target/release/bundle/macos

# Vendored Markdown parser

`marked/` contains Marked 18.0.5, copied from the existing local installation of `@earendil-works/pi-coding-agent/node_modules/marked` because the npm registry was unreachable in this environment. The upstream MIT license is retained. Runtime parser files are unchanged; development dependencies and scripts were removed from the package manifest to allow offline local dependency installation. package.json references it using `file:vendor/marked`.

Upstream: https://github.com/markedjs/marked

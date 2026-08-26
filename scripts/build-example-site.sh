#!/usr/bin/env sh

set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
theme_root=$(dirname -- "$project_root")
theme_name=$(basename -- "$project_root")

hugo \
  --source "$project_root/exampleSite" \
  --themesDir "$theme_root" \
  --theme "$theme_name" \
  --destination "$project_root/exampleSite/public" \
  --cleanDestinationDir \
  --gc \
  --minify

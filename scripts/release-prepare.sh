#!/usr/bin/env sh
set -eu

VERSION=$(git cliff --offline --bumped-version | sed 's/^v//')

npm version "$VERSION" --no-git-tag-version
npm install --package-lock-only --ignore-scripts
git cliff --offline --tag "v$VERSION" --unreleased --prepend CHANGELOG.md

git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v$VERSION"
git tag "v$VERSION"
git push origin main "v$VERSION"

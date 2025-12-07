#!/usr/bin/env bash
# Simple helper to publish the current repo root to gh-pages branch.
# WARNING: this will overwrite the remote gh-pages branch.
set -e
if [ -z "$(git status --porcelain)" ]; then
  echo "No local changes. Proceeding."
else
  echo "Please commit or stash changes first. Aborting." >&2
  exit 1
fi
BRANCH=gh-pages
REMOTE=${1:-origin}
TMPDIR=$(mktemp -d)
echo "Creating temporary worktree in $TMPDIR"
# copy files
git worktree add -B $BRANCH $TMPDIR
cp -r . $TMPDIR
pushd $TMPDIR >/dev/null
# remove git internals
rm -rf .git
# init and push
git init
git add .
git commit -m "Publish site"
git branch -M $BRANCH
git remote add $REMOTE $(git config --get remote.$REMOTE.url || echo "${REMOTE}") || true
git push -f $REMOTE $BRANCH
popd >/dev/null
git worktree remove $TMPDIR || true
rm -rf $TMPDIR
echo "Done. Pushed $BRANCH to $REMOTE"

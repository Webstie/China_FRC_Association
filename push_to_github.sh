#!/bin/bash
# Push FRC Wiki CN to GitHub
# Run this from Terminal:  bash "/Users/charles/Documents/FRC_C/Wiki/FRC Wiki CN/push_to_github.sh"

set -e
cd "/Users/charles/Documents/FRC_C/Wiki/FRC Wiki CN"

# Remove the half-initialized .git directory from earlier attempt
echo "→ Cleaning up any previous .git directory…"
rm -rf .git

# Make sure README.md exists (don't duplicate if already there)
if ! grep -q "China_FRC_Association" README.md 2>/dev/null; then
  echo "# China_FRC_Association" >> README.md
fi

echo "→ Initializing git…"
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Webstie/China_FRC_Association.git

echo "→ Pushing to GitHub… (you may be prompted for credentials)"
git push -u origin main

echo "✓ Done! Repository is live at https://github.com/Webstie/China_FRC_Association"

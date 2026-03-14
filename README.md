# PowerFlowGame
A game based on electricity market coupling

<div style="text-align: center;"><em>"Progress looks like failure from inside it"</em></div>
<div style="text-align: center;"><em>— Margot Vestiges</em></div>

## Prerequisites
- Python 3.12
- Node.js (16+) and npm
- GNU Make (optional but recommended) — on macOS: `brew install make`, on Ubuntu: `sudo apt install make`, on Windows: use MSYS2/Chocolatey/Windows Subsystem for Linux or use the provided .bat/.ps1 wrappers.
- bash terminal (If you are on windows you should make sure you use Git Bash instead of PowerShell)

## Getting started

1. Clone the repository:
   git clone <repo-url>
2. Backend (Python)
   - Create a virtualenv in the back_end folder
3. Install requirements
   - run make install
4. Run
   - run make run

## Pre-commit Hook

To automatically run code formatting and import fixes before each commit, you can set up a Git pre-commit hook:

1. Copy `scripts/pre-commit` to `.git/hooks/pre-commit` (.git is probably a hidden folder)
2. Make it executable if needed by security settings on your os


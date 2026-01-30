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
   - Create a virtualenv in the backend folder
3. Install requirements
   - run make install
4. Run
   - run make run

## Notes
- The Makefile prefers the venv at `back_end/.venv`. Adjust if your venv is elsewhere.
- Frontend start commands try common dev servers (vite/next/create-react-app). Use your project-specific start script if different.


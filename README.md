# PowerFlowGame
A game based on electricity market coupling

## Prerequisites
- Python 3.12
- Node.js (16+) and npm
- GNU Make (optional but recommended) — on macOS: `brew install make`, on Ubuntu: `sudo apt install make`, on Windows: use MSYS2/Chocolatey/Windows Subsystem for Linux or use the provided .bat/.ps1 wrappers.

## Getting started

1. Clone the repository:
   git clone <repo-url>
2. Backend (Python)
   - Create a virtualenv in the backend folder:
   - Upgrade pip and install dependencies:
3. Frontend (Node)
   cd front_end
   npm install

## Formatting
- Format both backend and frontend:
  make format
- Or per-part:
  make format-backend
  make format-frontend
- If you don't have make on Windows, use the provided scripts:
  format_repo.bat

## Running
- Start both (attempts backend then frontend):
  make run
- Start only backend:
  make run-backend
- Start only frontend:
  make run-frontend
- If make is unavailable on Windows, run:
  run.bat
  or
  run.ps1

## Notes
- The Makefile prefers the venv at `back_end/.venv`. Adjust if your venv is elsewhere.
- Frontend start commands try common dev servers (vite/next/create-react-app). Use your project-specific start script if different.

"Quote of questionable engineering value:"
> "I once taught a capacitor to dance; it only knew two steps: charge and discharge."

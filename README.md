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

## Pre-commit Hook

To automatically run code formatting and import fixes before each commit, you can set up a Git pre-commit hook:

1. Create a file named `.git/hooks/pre-commit` (no extension)
2. Make it executable: `chmod +x .git/hooks/pre-commit`
3. Add the following content:

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Run make pre-commit
if make pre-commit; then
    echo "Pre-commit checks passed!"
    
    # Add any modified files to the commit
    git add -u
    
    exit 0
else
    echo "Pre-commit checks failed!"
    echo "Please fix the issues and try committing again."
    exit 1
fi
```

Alternatively, you can use the provided script:

```bash
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The pre-commit hook will:
- Fix any incorrect imports (`from backend.src` → `from src`)
- Format the backend code with ruff
- Format the frontend code with prettier
- Automatically stage any changes made by these tools

If you don't want to use a pre-commit hook, you can manually run:
```bash
make pre-commit
```


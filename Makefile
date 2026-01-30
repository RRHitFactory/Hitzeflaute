SHELL := /bin/bash

# Check if we're running FROM bash by having bash check its own MSYSTEM variable
BASH_CHECK := $(shell bash -c 'echo $$MSYSTEM')
ifeq ($(BASH_CHECK),)
$(error ERROR: This Makefile must be run from Git Bash, not PowerShell. Install Git Bash (https://gitforwindows.org), open a Git Bash terminal, navigate to this directory, and run 'make install' from there.)
endif

# Cross-platform detection of venv python (prefers POSIX venv, then Windows venv, falls back to system python)
VENV_PY := $(shell if [ -f back_end/.venv/bin/python ]; then echo back_end/.venv/bin/python; elif [ -f back_end/.venv/Scripts/python.exe ]; then echo back_end/.venv/Scripts/python.exe; else echo python; fi)
VENV_PY := $(shell if [ -f back_end/.venv/bin/python ]; then echo back_end/.venv/bin/python; elif [ -f back_end/.venv/Scripts/python.exe ]; then echo back_end/.venv/Scripts/python.exe; else echo python; fi)

.PHONY: help format format-backend format-frontend run run-backend run-frontend install install-backend install-frontend

help:
	@echo "make format            - format backend and frontend"
	@echo "make format-backend    - format backend with ruff"
	@echo "make format-frontend   - format frontend with prettier"
	@echo "make install           - install backend and frontend dependencies"
	@echo "make install-backend   - install backend dependencies (creates back_end/.venv, prefers uv sync)"
	@echo "make install-frontend  - install frontend dependencies (npm/yarn/pnpm)"
	@echo "make run               - try to start backend and frontend (see run-backend/run-frontend)"
	@echo "make run-backend       - start backend (tries common scripts/commands)"
	@echo "make run-frontend      - start frontend (tries common scripts/commands)"

format: format-backend format-frontend

format-backend:
	@echo "Formatting backend with ruff..."
	$(VENV_PY) -m ruff check back_end/src --output-format=full --fix

format-frontend:
	@echo "Formatting frontend with prettier..."
	cd front_end && npx prettier --write "**/*.{ts,tsx,js,jsx}"

# Run targets
run:
	@echo "Starting backend and frontend in parallel..."
	bash -c '"$(MAKE)" run-backend & "$(MAKE)" run-frontend'

run-backend:
	@echo "Starting backend..."
	@cd back_end && \
	if [ -f ".venv/bin/python" ]; then \
		. .venv/bin/activate && python start_server.py; \
	elif [ -f ".venv/Scripts/activate" ]; then \
		. .venv/Scripts/activate && python start_server.py; \
	else \
		echo "Virtual environment not found. Run 'make install-backend' first."; \
	fi

run-frontend:
	@echo "Starting frontend..."
	@cd front_end && \
	( \
		if [[ "$$OSTYPE" == "msys"* ]] || [[ "$$OSTYPE" == "cygwin"* ]]; then \
			cmd /c start "" "http://localhost:3000" & \
		elif [[ "$$OSTYPE" == "darwin"* ]]; then \
			open "http://localhost:3000" & \
		else \
			xdg-open "http://localhost:3000" & \
		fi; \
		npm run build && npm run dev \
	)

install: install-backend install-frontend

install-backend:
	@echo "Installing backend dependencies (installing uv and running uv sync)..."
	@cd back_end && \
	if [ -f ".venv/bin/python" ]; then PY=".venv/bin/python"; elif [ -f ".venv/Scripts/python.exe" ]; then PY=".venv/Scripts/python.exe"; else python -m venv .venv && PY=".venv/bin/python"; fi; \
	$${PY} -m pip install uv || echo "pip install uv failed"; \
	$${PY} -m uv sync || echo "uv sync failed"

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd front_end && \
	if command -v npm >/dev/null 2>&1; then \
	  npm install || echo "npm install failed"; \
	elif command -v yarn >/dev/null 2>&1; then \
	  yarn install || echo "yarn install failed"; \
	elif command -v pnpm >/dev/null 2>&1; then \
	  pnpm install || echo "pnpm install failed"; \
	else \
	  echo "No package manager found (npm/yarn/pnpm). Install one and run install again."; \
	fi
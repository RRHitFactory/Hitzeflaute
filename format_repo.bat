@echo off
cd back_end
call .venv\Scripts\activate
call ruff check src --output-format=full --fix
cd ..
cd front_end
call npx prettier --write "**/*.{ts,tsx,js,jsx}"
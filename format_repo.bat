@echo off
cd back_end
call .venv\Scripts\activate
call ruff check src --output-format=full --fix
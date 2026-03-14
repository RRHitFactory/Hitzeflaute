import logging
from pathlib import Path
from typing import Literal

from src.directories import backend_root_dir

default_log_file_path = backend_root_dir / "server.log"


def setup_logger(logger: logging.Logger, kind: Literal["console", "file"], log_file_path: Path = default_log_file_path, level: int = logging.DEBUG) -> None:
    """
    Set up detailed logging to file with timestamps, log levels, and full tracebacks.
    Console logging remains simple while file logging gets full details.

    Args:
        log_file_path: Path to the log file
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    assert kind in {"console", "file"}, "Invalid logging kind. Must be 'console' or 'file'."

    handler: logging.FileHandler | logging.StreamHandler
    if kind == "file":
        assert log_file_path is not None, "log_file_path must be provided for file logging."

        # Create a file handler
        handler = logging.FileHandler(log_file_path)
        # Create a detailed formatter for file logging
        file_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s")
        handler.setFormatter(file_formatter)

    else:
        # Create a simple formatter for console logging
        handler = logging.StreamHandler()
        console_formatter = logging.Formatter("%(levelname)s: %(message)s")
        handler.setFormatter(console_formatter)

    handler.setLevel(level)
    logger.addHandler(handler)
    logger.setLevel(level)  # Keep the most permissive level

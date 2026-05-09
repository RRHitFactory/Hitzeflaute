import logging
import traceback

from src.app.logging import setup_logger

# Configure separate loggers for console and file
console_logger = logging.getLogger(__name__ + ":console")
file_logger = logging.getLogger(__name__ + ":file")
setup_logger(console_logger, kind="console")
setup_logger(file_logger, kind="file", level=logging.DEBUG)


def log_exception_with_traceback(error_message: str, exception: Exception) -> None:
    """
    Log an exception with full traceback to file while keeping console message simple.

    Args:
        error_message: The error message to log
        exception: The exception that occurred
    """
    # Simple message to console
    console_logger.error(error_message)

    # Detailed message with traceback to file
    traceback_str = "".join(traceback.format_tb(exception.__traceback__))
    detailed_message = f"{error_message}\nFull traceback:\n{traceback_str}\nException: {str(exception)}"
    file_logger.error(detailed_message)

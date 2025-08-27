"""Sandboxed execution utilities for running untrusted skills.

This module exposes :func:`run_skill` which executes a provided function under
resource limits and a restricted set of builtins. The function's abstract
syntax tree is inspected to forbid dangerous constructs such as imports or
``with`` statements. Each test case runs in a separate process with CPU and
memory caps.
"""

from __future__ import annotations

import ast
import builtins
import inspect
import multiprocessing
import resource
import time
from typing import Any, Callable, Dict, Iterable, List, Tuple

# Whitelist of safe builtin functions exposed to untrusted code.
SAFE_BUILTINS: Dict[str, Any] = {
    name: getattr(builtins, name)
    for name in [
        "abs",
        "all",
        "any",
        "bool",
        "dict",
        "enumerate",
        "float",
        "int",
        "len",
        "list",
        "max",
        "min",
        "range",
        "set",
        "str",
        "sum",
        "zip",
    ]
}

# AST nodes and function names that are considered unsafe.
FORBIDDEN_NODES = (ast.Import, ast.ImportFrom, ast.With, ast.AsyncWith)
FORBIDDEN_CALLS = {"open", "__import__", "eval", "exec", "compile"}


class SandboxError(Exception):
    """Raised when the sandbox detects a safety violation."""


def _check_ast(func: Callable[..., Any]) -> None:
    """Ensure the function does not use banned syntax or calls."""
    try:
        source = inspect.getsource(func)
    except OSError as exc:  # pragma: no cover - should not happen in tests
        raise SandboxError("Unable to retrieve source") from exc

    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, FORBIDDEN_NODES):
            raise SandboxError(f"Forbidden syntax: {type(node).__name__}")
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
                raise SandboxError(f"Forbidden call: {node.func.id}")


def _worker(
    func: Callable[..., Any],
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
    return_dict: Dict[str, Any],
    mem_limit: int,
    cpu_limit: int,
) -> None:
    """Execute ``func`` with resource limits and restricted builtins."""
    resource.setrlimit(resource.RLIMIT_AS, (mem_limit, mem_limit))
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit))
    func.__globals__["__builtins__"] = SAFE_BUILTINS
    try:
        result = func(*args, **kwargs)
        return_dict["result"] = result
        return_dict["error"] = None
    except Exception as exc:  # pragma: no cover - errors reported to caller
        return_dict["result"] = None
        return_dict["error"] = repr(exc)


def _run_single(
    func: Callable[..., Any],
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
    expected: Any,
    timeout_ms: int,
    mem_limit: int,
    cpu_limit: int,
) -> Dict[str, Any]:
    """Run a single test case in a separate process."""
    manager = multiprocessing.Manager()
    ret: Dict[str, Any] = manager.dict()
    proc = multiprocessing.Process(
        target=_worker, args=(func, args, kwargs, ret, mem_limit, cpu_limit)
    )
    start = time.time()
    proc.start()
    proc.join(timeout_ms / 1000)
    if proc.is_alive():
        proc.kill()
        proc.join()
        elapsed = (time.time() - start) * 1000
        return {"passed": False, "error": "timeout", "time_ms": elapsed}

    elapsed = (time.time() - start) * 1000
    if ret.get("error"):
        return {"passed": False, "error": ret["error"], "time_ms": elapsed}

    output = ret.get("result")
    return {
        "passed": output == expected,
        "result": output,
        "expected": expected,
        "time_ms": elapsed,
        "error": None,
    }


def run_skill(
    func: Callable[..., Any],
    tests: Iterable[Tuple[Tuple[Any, ...], Any]],
    timeout_ms: int,
    mem_limit_mb: int = 256,
    cpu_limit_s: int = 1,
) -> Dict[str, Any]:
    """Execute ``func`` against ``tests`` inside a sandbox.

    Parameters
    ----------
    func:
        Function implementing the skill to evaluate.
    tests:
        Iterable of ``(args, expected)`` tuples where ``args`` is a tuple of
        positional arguments passed to ``func`` and ``expected`` is the desired
        output.
    timeout_ms:
        Maximum wall clock time allowed for each test case.
    mem_limit_mb:
        Memory limit applied to each process (default 256MB).
    cpu_limit_s:
        CPU time limit per test in seconds (default 1 second).

    Returns
    -------
    dict
        Mapping with overall pass status, total time, and per-test results.
    """
    _check_ast(func)
    results: List[Dict[str, Any]] = []
    start_total = time.time()
    mem_bytes = mem_limit_mb * 1024 * 1024
    for args, expected in tests:
        if not isinstance(args, tuple):
            args = (args,)
        res = _run_single(func, args, {}, expected, timeout_ms, mem_bytes, cpu_limit_s)
        results.append(res)
    total_time = (time.time() - start_total) * 1000
    passed = all(r.get("passed") for r in results)
    return {"passed": passed, "time_ms": total_time, "results": results}

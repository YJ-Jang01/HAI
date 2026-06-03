import os
from pathlib import Path

def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_gemini_api_key() -> str | None:
    """Load Gemini key from local agent env first, then backend/.env.

    The project keeps backend credentials in backend/.env. AI agents are separate
    Python services, so they need to explicitly load that file during local runs.
    """

    repo_root = Path(__file__).resolve().parents[2]
    load_env_file(Path.cwd() / ".env")
    backend_env = repo_root / "backend" / ".env"
    load_env_file(backend_env)

    return (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GEMINI_KEY")
        or os.environ.get("gemini_key")
    )

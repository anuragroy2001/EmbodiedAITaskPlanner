"""
File-based cache for VLA results keyed by uploaded image filenames.
Stores topology, layout description, and birds-eye map under backend/cache/<key>/.
"""
import base64
import hashlib
import json
from pathlib import Path
from typing import List, Optional, Tuple

CACHE_ROOT = Path(__file__).resolve().parent / "cache"

TOPOLOGY_FILE = "topology.json"
LAYOUT_FILE = "layout.txt"
MAP_FILE = "map.png"
MAP_MIME_FILE = "map.mime"


def get_cache_key(filenames: List[str]) -> str:
    """Compute a deterministic cache key from sorted image filenames."""
    normalized = [f or "" for f in filenames]
    stable = ",".join(sorted(normalized))
    digest = hashlib.sha256(stable.encode("utf-8")).hexdigest()
    return digest[:16]


def get_cache_dir(key: str) -> Path:
    """Return the cache directory for the given key."""
    return CACHE_ROOT / key


def load_topology(key: str) -> Optional[Tuple[str, dict]]:
    """Load cached topology. Returns (actual_name, topology) or None."""
    path = get_cache_dir(key) / TOPOLOGY_FILE
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data["actual_name"], data["topology"]
    except (json.JSONDecodeError, KeyError):
        return None


def save_topology(key: str, actual_name: str, topology: dict) -> None:
    """Save topology to cache."""
    d = get_cache_dir(key)
    d.mkdir(parents=True, exist_ok=True)
    path = d / TOPOLOGY_FILE
    path.write_text(
        json.dumps({"actual_name": actual_name, "topology": topology}, indent=2),
        encoding="utf-8",
    )


def load_layout(key: str) -> Optional[str]:
    """Load cached layout description text, or None."""
    path = get_cache_dir(key) / LAYOUT_FILE
    if not path.is_file():
        return None
    return path.read_text(encoding="utf-8")


def save_layout(key: str, text: str) -> None:
    """Save layout description to cache."""
    d = get_cache_dir(key)
    d.mkdir(parents=True, exist_ok=True)
    (d / LAYOUT_FILE).write_text(text, encoding="utf-8")


def load_map(key: str) -> Optional[str]:
    """Load cached birds-eye map as data URL, or None."""
    d = get_cache_dir(key)
    img_path = d / MAP_FILE
    mime_path = d / MAP_MIME_FILE
    if not img_path.is_file():
        return None
    raw = img_path.read_bytes()
    mime = "image/png"
    if mime_path.is_file():
        mime = mime_path.read_text(encoding="utf-8").strip() or mime
    b64 = base64.b64encode(raw).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def save_map(key: str, data_url: str) -> None:
    """Save birds-eye map from data URL to cache."""
    if not data_url.startswith("data:"):
        return
    d = get_cache_dir(key)
    d.mkdir(parents=True, exist_ok=True)
    header, b64data = data_url.split(",", 1)
    mime = "image/png"
    if ":" in header:
        mime = header.split(":")[1].split(";")[0]
    raw = base64.b64decode(b64data)
    (d / MAP_FILE).write_bytes(raw)
    (d / MAP_MIME_FILE).write_text(mime, encoding="utf-8")


def is_full_hit(key: str) -> bool:
    """True if topology, layout, and map are all present in cache."""
    d = get_cache_dir(key)
    return (
        (d / TOPOLOGY_FILE).is_file()
        and (d / LAYOUT_FILE).is_file()
        and (d / MAP_FILE).is_file()
    )

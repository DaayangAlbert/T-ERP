from __future__ import annotations

import mimetypes
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOADS_ROOT = BACKEND_DIR / "uploads"


class FileStorageError(Exception):
    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(slots=True)
class StoredFilePayload:
    stored_path: str
    absolute_path: Path
    filename: str
    mime_type: str | None
    size_bytes: int


def _normalize_suffix(filename: str) -> str:
    return Path(filename).suffix.lower()


def get_stored_file_name(stored_path: str | None) -> str | None:
    if not stored_path:
        return None
    return Path(stored_path).name or None


def store_uploaded_file(
    file: FileStorage | None,
    *,
    storage_segments: list[str],
    allowed_extensions: set[str],
    max_size_bytes: int = 12 * 1024 * 1024,
) -> StoredFilePayload:
    if file is None:
        raise FileStorageError("Aucun fichier n'a ete recu.", status_code=400)

    original_name = secure_filename(file.filename or "").strip()
    if not original_name:
        raise FileStorageError("Le nom du fichier est invalide.", status_code=400)

    suffix = _normalize_suffix(original_name)
    if allowed_extensions and suffix not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise FileStorageError(f"Type de fichier non autorise. Extensions attendues: {allowed}.", status_code=400)

    stream = file.stream
    current_position = stream.tell()
    stream.seek(0, 2)
    size_bytes = stream.tell()
    stream.seek(current_position)
    if size_bytes > max_size_bytes:
        raise FileStorageError("Le fichier depasse la taille maximale autorisee.", status_code=413)

    target_directory = UPLOADS_ROOT.joinpath(*storage_segments)
    target_directory.mkdir(parents=True, exist_ok=True)
    target_filename = f"{uuid4().hex}_{original_name}"
    absolute_path = (target_directory / target_filename).resolve()
    if not absolute_path.is_relative_to(UPLOADS_ROOT.resolve()):
        raise FileStorageError("Chemin de stockage invalide.", status_code=400)

    file.save(absolute_path)
    mime_type = file.mimetype or mimetypes.guess_type(original_name)[0]
    stored_path = absolute_path.relative_to(BACKEND_DIR).as_posix()

    return StoredFilePayload(
        stored_path=stored_path,
        absolute_path=absolute_path,
        filename=original_name,
        mime_type=mime_type,
        size_bytes=size_bytes,
    )


def resolve_stored_file(stored_path: str | None) -> Path:
    if not stored_path:
        raise FileStorageError("Fichier introuvable.", status_code=404)

    absolute_path = (BACKEND_DIR / stored_path).resolve()
    if not absolute_path.is_relative_to(UPLOADS_ROOT.resolve()):
        raise FileStorageError("Chemin de fichier non autorise.", status_code=403)
    if not absolute_path.exists() or not absolute_path.is_file():
        raise FileStorageError("Fichier introuvable.", status_code=404)
    return absolute_path

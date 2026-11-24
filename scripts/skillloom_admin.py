#!/usr/bin/env python3
"""Local CLI for administering reviewed Skill Loom catalog entries."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import stat
import sys
import time
import unicodedata
from pathlib import Path
from typing import Callable
from urllib.parse import quote

import msal

if __package__:
    from . import prototype_skillloom_api_mcp_server as adapter
else:
    import prototype_skillloom_api_mcp_server as adapter


MAX_SKILL_BYTES = 20 * 1024 * 1024
MAX_SKILL_FILES = 2_000
REQUIRED_SETTINGS = (
    "SKILLOOM_API_BASE_URL",
    "SKILLOOM_API_SCOPE",
    "SKILLOOM_ENTRA_TENANT_ID",
    "SKILLOOM_ENTRA_CLIENT_ID",
)
INVALID_PORTABLE_CHARACTER = re.compile(r'[<>:"|?*]')
WINDOWS_DEVICE_NAME = re.compile(r"^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$", re.I)


class AdminCLIError(Exception):
    """An expected local input or API response error safe to report."""


def _normalized_name(name: str) -> str:
    return unicodedata.normalize("NFC", unicodedata.normalize("NFC", name).lower())


def _safe_relative_path(value: str) -> bool:
    if not value or len(value) > 512 or value.startswith("/") or "\\" in value:
        return False
    for segment in value.split("/"):
        if (
            not segment
            or segment in {".", ".."}
            or segment.endswith((".", " "))
            or INVALID_PORTABLE_CHARACTER.search(segment)
            or WINDOWS_DEVICE_NAME.fullmatch(segment)
            or any(ord(character) < 0x20 or ord(character) == 0x7F for character in segment)
        ):
            return False
    return True


def collect_skill_files(directory: Path) -> tuple[list[dict[str, object]], int]:
    if directory.is_symlink():
        raise AdminCLIError("The skill directory must not be a symbolic link.")
    try:
        root = directory.expanduser().resolve(strict=True)
    except OSError as exc:
        raise AdminCLIError("The skill directory could not be opened.") from exc
    if not root.is_dir():
        raise AdminCLIError("The skill path must be a directory.")

    paths: list[Path] = []

    def walk_error(error: OSError) -> None:
        raise AdminCLIError("The skill directory could not be fully enumerated.") from error

    for current, directories, filenames in os.walk(
        root,
        followlinks=False,
        onerror=walk_error,
    ):
        current_path = Path(current)
        for dirname in directories:
            path = current_path / dirname
            if path.is_symlink():
                raise AdminCLIError("Skill directories must not contain symbolic links.")
        directories[:] = sorted(dirname for dirname in directories if dirname != ".git")
        for filename in filenames:
            path = current_path / filename
            if path.is_symlink():
                raise AdminCLIError("Skill files must not be symbolic links.")
            if filename == ".git":
                continue
            if not path.is_file():
                raise AdminCLIError("Every skill entry must be a regular file.")
            paths.append(path)

    if not paths:
        raise AdminCLIError("The skill directory contains no files.")
    if len(paths) > MAX_SKILL_FILES:
        raise AdminCLIError(f"A skill may contain at most {MAX_SKILL_FILES} files.")

    files: list[dict[str, object]] = []
    normalized_paths: set[str] = set()
    total_bytes = 0
    for path in sorted(paths, key=lambda item: item.relative_to(root).as_posix()):
        relative_path = path.relative_to(root).as_posix()
        if not _safe_relative_path(relative_path):
            raise AdminCLIError(f"The skill contains an unsafe path: {relative_path}.")
        normalized_path = _normalized_name(relative_path)
        if normalized_path in normalized_paths:
            raise AdminCLIError("Skill file paths must be unique without regard to case.")
        normalized_paths.add(normalized_path)

        try:
            file_stat = path.stat()
            if not stat.S_ISREG(file_stat.st_mode):
                raise AdminCLIError("Every skill entry must be a regular file.")
            with path.open("rb") as stream:
                content = stream.read(MAX_SKILL_BYTES - total_bytes + 1)
        except OSError as exc:
            raise AdminCLIError(f"Could not read skill file: {relative_path}.") from exc
        total_bytes += len(content)
        if total_bytes > MAX_SKILL_BYTES:
            raise AdminCLIError(f"Skill files may not exceed {MAX_SKILL_BYTES} bytes in total.")
        files.append({
            "path": relative_path,
            "content": base64.b64encode(content).decode("ascii"),
            "executable": bool(file_stat.st_mode & 0o111),
        })
    return files, total_bytes


def load_configuration(config_path: Path) -> adapter.AdapterConfiguration:
    if config_path.is_file():
        try:
            document = json.loads(config_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise AdminCLIError("The local MCP configuration could not be read as JSON.") from exc
        if not isinstance(document, dict):
            raise AdminCLIError("The local MCP configuration must contain a JSON object.")
        servers = document.get("mcpServers", {})
        if not isinstance(servers, dict):
            raise AdminCLIError("The local MCP server configuration is invalid.")
        server = servers.get("skillloom-api", {})
        if not isinstance(server, dict):
            raise AdminCLIError("The skillloom-api MCP configuration is invalid.")
        settings = server.get("env", {})
        if not isinstance(settings, dict):
            raise AdminCLIError("The local skillloom-api MCP environment is invalid.")
        for name in REQUIRED_SETTINGS:
            if not os.environ.get(name):
                value = settings.get(name)
                if isinstance(value, str) and value.strip():
                    os.environ[name] = value
    return adapter._configuration()


class CatalogAdminClient:
    def __init__(
        self,
        base_url: str,
        access_token: Callable[[], str],
        request: Callable = adapter._api_request,
    ):
        self._base_url = base_url
        self._access_token = access_token
        self._request = request

    def _api_request(self, method: str, path: str, **kwargs):
        token = self._access_token()
        return self._request(self._base_url, token, method, path, **kwargs)

    def list_skills(self) -> tuple[int, list[dict[str, object]]]:
        items: list[dict[str, object]] = []
        cursor: str | None = None
        seen_cursors: set[str] = set()
        revision: int | None = None
        while True:
            query: dict[str, str] = {"limit": "100"}
            if cursor is not None:
                query["cursor"] = cursor
            payload, _, _ = self._api_request(
                "GET",
                "/v1/skills",
                query=query,
            )
            if not isinstance(payload, dict):
                raise AdminCLIError("The catalog search response was invalid.")
            page_revision = payload.get("revision")
            page_items = payload.get("items")
            next_cursor = payload.get("nextCursor")
            if (
                isinstance(page_revision, bool)
                or not isinstance(page_revision, int)
                or page_revision < 1
                or not isinstance(page_items, list)
                or (next_cursor is not None and not isinstance(next_cursor, str))
            ):
                raise AdminCLIError("The catalog search response was invalid.")
            if revision is not None and page_revision != revision:
                raise AdminCLIError("The catalog changed while it was being listed; retry.")
            revision = page_revision
            if not all(isinstance(item, dict) for item in page_items):
                raise AdminCLIError("The catalog search response contained an invalid skill.")
            items.extend(page_items)
            if next_cursor is None:
                return revision, items
            if not next_cursor or next_cursor in seen_cursors:
                raise AdminCLIError("The catalog returned an invalid continuation cursor.")
            seen_cursors.add(next_cursor)
            cursor = next_cursor

    def get_skill(self, name: str) -> object:
        payload, _, _ = self._api_request(
            "GET",
            f"/v1/skills/{quote(name, safe='')}",
        )
        return payload

    def add_skill(
        self,
        name: str,
        description: str,
        files: list[dict[str, object]],
        revision: int,
    ) -> tuple[object, int]:
        payload, _, etag = self._api_request(
            "POST",
            "/v1/admin/skills",
            body={"name": name, "description": description, "files": files},
            headers={"If-Match": f'"{revision}"'},
        )
        return payload, adapter._revision(etag)

    def remove_skill(self, name: str, revision: int) -> tuple[object, int]:
        payload, _, etag = self._api_request(
            "DELETE",
            f"/v1/admin/skills/{quote(name, safe='')}",
            headers={"If-Match": f'"{revision}"'},
        )
        return payload, adapter._revision(etag)


def _access_token(authentication: adapter.InteractiveAuthentication) -> str:
    sign_in_reported = False
    deadline = time.monotonic() + adapter.INTERACTIVE_AUTH_TIMEOUT_SECONDS
    while True:
        try:
            return authentication.access_token()
        except (
            adapter.InteractiveSignInStarted,
            adapter.InteractiveSignInPending,
        ) as exc:
            if not sign_in_reported:
                print(str(exc), file=sys.stderr)
                sign_in_reported = True
            if time.monotonic() >= deadline:
                raise AdminCLIError("Entra browser sign-in did not complete in time.") from exc
            time.sleep(1)


def _confirm(action: str, yes: bool) -> bool:
    if yes:
        return True
    if not sys.stdin.isatty():
        raise AdminCLIError(f"Use --yes to confirm this persistent {action} operation.")
    try:
        answer = input(f"Confirm {action}? [y/N] ").strip().lower()
    except EOFError:
        return False
    return answer in {"y", "yes"}


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage reviewed Skill Loom catalog entries.")
    parser.add_argument("--config", type=Path, default=Path(".mcp.json"))
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("list", help="List reviewed skills and the catalog revision.")
    get_command = commands.add_parser("get", help="Read one reviewed skill.")
    get_command.add_argument("name")

    add_command = commands.add_parser("add", help="Add a reviewed skill directory.")
    add_command.add_argument("directory", type=Path)
    add_command.add_argument("--name", required=True)
    add_command.add_argument("--description", required=True)
    add_command.add_argument("--yes", action="store_true")

    remove_command = commands.add_parser("remove", help="Remove an unreferenced reviewed skill.")
    remove_command.add_argument("name")
    remove_command.add_argument("--yes", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        configuration = load_configuration(args.config)
        authentication = adapter.InteractiveAuthentication(
            msal.PublicClientApplication(
                client_id=configuration.client_id,
                authority=f"https://login.microsoftonline.com/{configuration.tenant_id}",
            ),
            configuration.scope,
        )
        client = CatalogAdminClient(
            configuration.base_url,
            lambda: _access_token(authentication),
        )

        if args.command == "list":
            revision, items = client.list_skills()
            print(json.dumps({"revision": revision, "skills": items}, indent=2))
            return 0
        if args.command == "get":
            print(json.dumps(client.get_skill(args.name), indent=2))
            return 0
        if args.command == "add":
            if not args.name.strip() or len(args.name) > 128:
                raise AdminCLIError("Skill names must contain 1 to 128 characters.")
            if len(args.description) > 4_096:
                raise AdminCLIError("Skill descriptions may not exceed 4096 characters.")
            files, total_bytes = collect_skill_files(args.directory)
            revision, existing = client.list_skills()
            if any(
                _normalized_name(str(item.get("name", ""))) == _normalized_name(args.name)
                for item in existing
            ):
                raise AdminCLIError("A skill with this name is already in the catalog.")
            if not _confirm(
                f"add {args.name!r} ({len(files)} files, {total_bytes} bytes)",
                args.yes,
            ):
                print("Cancelled; the catalog was not changed.")
                return 1
            _, new_revision = client.add_skill(args.name, args.description, files, revision)
            print(f"Added {args.name!r}; catalog revision is {new_revision}.")
            return 0
        if args.command == "remove":
            revision, existing = client.list_skills()
            matching = next(
                (
                    str(item["name"])
                    for item in existing
                    if isinstance(item.get("name"), str)
                    and _normalized_name(item["name"]) == _normalized_name(args.name)
                ),
                None,
            )
            if matching is None:
                raise AdminCLIError(f"Skill {args.name!r} is not in the catalog.")
            if not _confirm(f"remove {matching!r}", args.yes):
                print("Cancelled; the catalog was not changed.")
                return 1
            _, new_revision = client.remove_skill(matching, revision)
            print(f"Removed {matching!r}; catalog revision is {new_revision}.")
            return 0
    except (adapter.AdapterError, AdminCLIError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

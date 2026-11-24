from __future__ import annotations

import base64
import tempfile
import unittest
from pathlib import Path

from skillloom_admin import AdminCLIError, CatalogAdminClient, collect_skill_files


class SkillFileCollectionTests(unittest.TestCase):
    def test_collects_portable_files_and_preserves_executable_flags(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            (root / "nested").mkdir()
            (root / "SKILL.md").write_text("# Reviewed skill\n", encoding="utf-8")
            (root / ".git").write_text("gitdir: ../.git/worktrees/skill\n", encoding="utf-8")
            executable = root / "nested" / "run.sh"
            executable.write_text("#!/bin/sh\n", encoding="utf-8")
            executable.chmod(0o755)

            files, total_bytes = collect_skill_files(root)

        self.assertEqual(total_bytes, len(b"# Reviewed skill\n") + len(b"#!/bin/sh\n"))
        self.assertEqual([item["path"] for item in files], ["SKILL.md", "nested/run.sh"])
        self.assertEqual(
            base64.b64decode(files[0]["content"]),
            b"# Reviewed skill\n",
        )
        self.assertFalse(files[0]["executable"])
        self.assertTrue(files[1]["executable"])

    def test_rejects_symbolic_links(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory) / "skill"
            root.mkdir()
            target = Path(temporary_directory) / "outside.md"
            target.write_text("outside\n", encoding="utf-8")
            (root / "linked.md").symlink_to(target)

            with self.assertRaisesRegex(AdminCLIError, "symbolic links"):
                collect_skill_files(root)


class CatalogAdminClientTests(unittest.TestCase):
    def test_add_and_remove_use_catalog_revision_preconditions(self):
        calls = []

        def request(base_url, token, method, path, **kwargs):
            calls.append((base_url, token, method, path, kwargs))
            if method == "POST":
                return {"name": "reviewed"}, 201, '"4"'
            return {"name": "reviewed", "catalogRevision": 5}, 200, '"5"'

        client = CatalogAdminClient(
            "https://api.example.test",
            lambda: "access-token",
            request=request,
        )
        skill = {
            "path": "SKILL.md",
            "content": base64.b64encode(b"# Skill\n").decode("ascii"),
            "executable": False,
        }

        _, added_revision = client.add_skill("reviewed", "Reviewed skill.", [skill], 3)
        _, removed_revision = client.remove_skill("reviewed name", 4)

        self.assertEqual((added_revision, removed_revision), (4, 5))
        post_call = calls[0]
        self.assertEqual(post_call[2:4], ("POST", "/v1/admin/skills"))
        self.assertEqual(post_call[4]["headers"], {"If-Match": '"3"'})
        delete_call = calls[1]
        self.assertEqual(
            delete_call[2:4],
            ("DELETE", "/v1/admin/skills/reviewed%20name"),
        )
        self.assertEqual(delete_call[4]["headers"], {"If-Match": '"4"'})


if __name__ == "__main__":
    unittest.main()

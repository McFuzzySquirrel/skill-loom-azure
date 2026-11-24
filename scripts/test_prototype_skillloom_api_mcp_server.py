import contextlib
import io
import json
import os
import threading
import time
import unittest
from unittest.mock import patch

from prototype_skillloom_api_mcp_server import (
    AdapterConfiguration,
    AdapterError,
    InteractiveAuthentication,
    InteractiveSignInPending,
    InteractiveSignInStarted,
    PROTOCOL_VERSION,
    _call_tool,
    _configuration,
    _handle_message,
)


TENANT_ID = "00000000-0000-0000-0000-000000000001"
CLIENT_ID = "00000000-0000-0000-0000-000000000002"
SCOPE = "api://00000000-0000-0000-0000-000000000003/SkillLoom.Access"


class FakePublicClient:
    def __init__(
        self,
        *,
        accounts=None,
        silent_result=None,
        interactive_result=None,
        block_interactive_flow=False,
    ):
        self.accounts = accounts or []
        self.silent_result = silent_result
        self.interactive_result = interactive_result or {
            "access_token": "interactive-access-token"
        }
        self.silent_calls = []
        self.interactive_calls = []
        self.block_interactive_flow = block_interactive_flow
        self.interactive_flow_started = threading.Event()
        self.interactive_flow_release = threading.Event()
        self.interactive_flow_finished = threading.Event()

    def get_accounts(self):
        return self.accounts

    def acquire_token_silent(self, scopes, account):
        self.silent_calls.append((scopes, account))
        return self.silent_result

    def acquire_token_interactive(self, scopes, timeout):
        self.interactive_calls.append((scopes, timeout))
        self.interactive_flow_started.set()
        try:
            if self.block_interactive_flow:
                self.interactive_flow_release.wait()
            return self.interactive_result
        finally:
            self.interactive_flow_finished.set()


class AdapterAuthenticationTests(unittest.TestCase):
    def wait_for_interactive_flow(self, authentication):
        deadline = time.monotonic() + 1
        while time.monotonic() < deadline:
            pending_result = authentication._pending_result
            if pending_result is not None and pending_result.done():
                return
            time.sleep(0.001)
        self.fail("interactive sign-in did not finish")

    def test_browser_sign_in_starts_without_waiting_for_callback(self):
        public_client = FakePublicClient(block_interactive_flow=True)
        authentication = InteractiveAuthentication(public_client, SCOPE)
        stderr = io.StringIO()

        try:
            with contextlib.redirect_stderr(stderr):
                with self.assertRaises(InteractiveSignInStarted) as raised:
                    authentication.access_token()

            self.assertIn("browser", str(raised.exception))
            self.assertNotIn("TEST-CODE", str(raised.exception))
            self.assertEqual(stderr.getvalue(), "")
            self.assertTrue(public_client.interactive_flow_started.wait(1))
            with self.assertRaisesRegex(InteractiveSignInPending, "sign-in is pending"):
                authentication.access_token()
            self.assertEqual(public_client.interactive_calls, [([SCOPE], 300)])
        finally:
            public_client.interactive_flow_release.set()
        self.assertTrue(public_client.interactive_flow_finished.wait(1))

    def test_cached_token_skips_interactive_flow(self):
        account = {"username": "user"}
        public_client = FakePublicClient(
            accounts=[account],
            silent_result={"access_token": "cached-access-token"},
        )
        authentication = InteractiveAuthentication(public_client, SCOPE)

        token = authentication.access_token()

        self.assertEqual(token, "cached-access-token")
        self.assertEqual(public_client.silent_calls, [([SCOPE], account)])
        self.assertEqual(public_client.interactive_calls, [])

    def test_interactive_failure_reports_only_error_code(self):
        public_client = FakePublicClient(
            interactive_result={
                "error": "authorization_declined",
                "error_description": "sensitive details",
            },
        )
        authentication = InteractiveAuthentication(public_client, SCOPE)

        with self.assertRaises(InteractiveSignInStarted):
            authentication.access_token()
        self.wait_for_interactive_flow(authentication)
        with self.assertRaisesRegex(AdapterError, "authorization_declined") as raised:
            authentication.access_token()
        self.assertNotIn("sensitive details", str(raised.exception))

    def test_configuration_requires_single_delegated_scope_and_client_ids(self):
        environment = {
            "SKILLOOM_API_BASE_URL": "https://api.example.test",
            "SKILLOOM_API_SCOPE": SCOPE,
            "SKILLOOM_ENTRA_TENANT_ID": TENANT_ID,
            "SKILLOOM_ENTRA_CLIENT_ID": CLIENT_ID,
        }
        with patch.dict(os.environ, environment, clear=True):
            configuration = _configuration()

        self.assertEqual(configuration.scope, SCOPE)
        self.assertEqual(configuration.tenant_id, TENANT_ID)
        self.assertEqual(configuration.client_id, CLIENT_ID)

        environment["SKILLOOM_API_SCOPE"] = "api://example/.default"
        with patch.dict(os.environ, environment, clear=True):
            with self.assertRaisesRegex(AdapterError, "one delegated API scope"):
                _configuration()

    def test_protocol_setup_does_not_start_authentication(self):
        public_client = FakePublicClient(
            interactive_result={"error": "interactive_flow_should_not_start"},
        )
        authentication = InteractiveAuthentication(public_client, SCOPE)
        configuration = AdapterConfiguration(
            base_url="https://api.example.test",
            tenant_id=TENANT_ID,
            client_id=CLIENT_ID,
            scope=SCOPE,
        )

        initialized = _handle_message(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize"},
            configuration,
            authentication,
        )
        listed = _handle_message(
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
            configuration,
            authentication,
        )

        self.assertEqual(initialized["result"]["protocolVersion"], PROTOCOL_VERSION)
        tools = listed["result"]["tools"]
        self.assertEqual(
            {tool["name"] for tool in tools},
            {
                "list_chains",
                "get_chain",
                "save_chain",
                "export_chain_bundle",
                "search_skills",
                "get_skill",
            },
        )
        self.assertIn(
            "untrusted",
            next(tool["description"] for tool in tools if tool["name"] == "get_skill"),
        )
        self.assertEqual(public_client.interactive_calls, [])

    def test_tool_call_authenticates_before_api_access(self):
        public_client = FakePublicClient(block_interactive_flow=True)
        authentication = InteractiveAuthentication(public_client, SCOPE)
        configuration = AdapterConfiguration(
            base_url="https://api.example.test",
            tenant_id=TENANT_ID,
            client_id=CLIENT_ID,
            scope=SCOPE,
        )
        request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "list_chains", "arguments": {}},
        }

        with patch("prototype_skillloom_api_mcp_server._api_request") as api_request:
            with patch(
                "prototype_skillloom_api_mcp_server._call_tool",
                return_value={"content": [{"type": "text", "text": "ok"}]},
            ) as call_tool:
                first_response = _handle_message(
                    request,
                    configuration,
                    authentication,
                )
                self.assertEqual(api_request.call_count, 0)
                self.assertIn("browser", first_response["error"]["message"])
                self.assertNotIn("TEST-CODE", first_response["error"]["message"])
                self.assertTrue(public_client.interactive_flow_started.wait(1))
                pending_response = _handle_message(
                    request,
                    configuration,
                    authentication,
                )
                self.assertIn("sign-in is pending", pending_response["error"]["message"])
                public_client.interactive_flow_release.set()
                self.assertTrue(public_client.interactive_flow_finished.wait(1))
                self.wait_for_interactive_flow(authentication)
                response = _handle_message(
                    request,
                    configuration,
                    authentication,
                )

        self.assertEqual(response["result"]["content"][0]["text"], "ok")
        api_request.assert_called_once_with(
            configuration.base_url,
            "interactive-access-token",
            "GET",
            "/v1/health",
        )
        call_tool.assert_called_once_with(
            configuration.base_url,
            "interactive-access-token",
            "list_chains",
            {},
        )


class AdapterSkillToolTests(unittest.TestCase):
    def test_search_skills_maps_bounded_query_to_api(self):
        response = {
            "revision": 3,
            "items": [{"name": "review", "description": "Review changes"}],
            "nextCursor": "next-page",
        }

        with patch(
            "prototype_skillloom_api_mcp_server._api_request",
            return_value=(response, 200, '"3"'),
        ) as api_request:
            result = _call_tool(
                "https://api.example.test",
                "access-token",
                "search_skills",
                {"query": "review", "limit": 10, "cursor": "page-token"},
            )

        api_request.assert_called_once_with(
            "https://api.example.test",
            "access-token",
            "GET",
            "/v1/skills",
            query={"q": "review", "limit": "10", "cursor": "page-token"},
        )
        self.assertEqual(
            json.loads(result["content"][0]["text"]),
            response,
        )

    def test_get_skill_encodes_name_and_returns_files(self):
        response = {
            "name": "review / guide",
            "files": [{"path": "SKILL.md", "content": "U2tpbGw=", "executable": False}],
        }

        with patch(
            "prototype_skillloom_api_mcp_server._api_request",
            return_value=(response, 200, '"fingerprint"'),
        ) as api_request:
            result = _call_tool(
                "https://api.example.test",
                "access-token",
                "get_skill",
                {"name": "review / guide"},
            )

        api_request.assert_called_once_with(
            "https://api.example.test",
            "access-token",
            "GET",
            "/v1/skills/review%20%2F%20guide",
        )
        self.assertEqual(json.loads(result["content"][0]["text"]), response)

    def test_skill_tools_reject_invalid_arguments_before_api_access(self):
        invalid_calls = (
            ("search_skills", {"query": 1}),
            ("search_skills", {"query": "q" * 257}),
            ("search_skills", {"limit": True}),
            ("search_skills", {"limit": 101}),
            ("search_skills", {"cursor": ""}),
            ("get_skill", {"name": ""}),
            ("get_skill", {"name": "s" * 129}),
            ("get_skill", {"name": "review", "unexpected": True}),
        )

        with patch("prototype_skillloom_api_mcp_server._api_request") as api_request:
            for name, arguments in invalid_calls:
                with self.subTest(name=name, arguments=arguments):
                    with self.assertRaises(AdapterError):
                        _call_tool(
                            "https://api.example.test",
                            "access-token",
                            name,
                            arguments,
                        )

        api_request.assert_not_called()


if __name__ == "__main__":
    unittest.main()

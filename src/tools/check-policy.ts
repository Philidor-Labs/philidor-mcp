import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CHECK_POLICY_DESCRIPTION,
  CheckPolicyInputSchema,
  executeCheckPolicy,
} from '../lib/check-policy';

export function registerCheckPolicy(server: McpServer) {
  // `server.tool` wraps a raw shape in a non-strict object and drops unknown
  // keys before the handler. `portfolioRef` or `wallet` would then disappear
  // and a check could still return compliant. `registerTool` keeps this
  // strict object, so an unknown top-level key is an error and no POST runs.
  server.registerTool(
    'check_policy',
    {
      description: CHECK_POLICY_DESCRIPTION,
      inputSchema: CheckPolicyInputSchema,
    },
    async (params) => {
      const result = await executeCheckPolicy(params);
      return {
        content: [{ type: 'text' as const, text: result.text }],
        ...(result.isError ? { isError: true as const } : {}),
      };
    }
  );
}

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  findInboundSecretPaths,
  findSecretPaths,
  keyRefusal,
  keyRefusalPromptResult,
  keyRefusalResourceResult,
  keyRefusalToolResult,
  scrubSecrets,
  scrubThrown,
} from './key-material';

/**
 * Guard the public transport boundary, before the SDK's request-schema parse.
 * Handler wrappers alone miss malformed arguments that Zod can echo in errors.
 * No arguments or results are logged or persisted here.
 */
export function guardTransport(transport: Transport): Transport {
  let onmessage: Transport['onmessage'];
  return {
    start: () => transport.start(),
    close: () => transport.close(),
    get sessionId() { return transport.sessionId; },
    setProtocolVersion: transport.setProtocolVersion?.bind(transport),
    get onclose() { return transport.onclose; },
    set onclose(handler) { transport.onclose = handler; },
    get onerror() { return transport.onerror; },
    set onerror(handler) {
      transport.onerror = handler ? (error) => handler(scrubThrown(error)) : undefined;
    },
    get onmessage() { return onmessage; },
    set onmessage(handler) {
      onmessage = handler;
      transport.onmessage = (message, extra) => {
        if ('method' in message && 'id' in message) {
          const params = message.params ?? {};
          const { name, arguments: args, _meta, uri, ...other } = params;
          const paths = [
            ...findInboundSecretPaths({
              tool: typeof name === 'string' ? name : undefined,
              arguments: args,
              meta: _meta,
              uri,
            }),
            ...findSecretPaths(name, ['name'], { free: true }),
            ...findSecretPaths(other, [], { free: true }),
          ];
          if (paths.length > 0) {
            const result = message.method === 'tools/call' ? keyRefusalToolResult(paths)
              : message.method === 'prompts/get' ? keyRefusalPromptResult(paths)
              : message.method === 'resources/read' ? keyRefusalResourceResult(paths)
              : undefined;
            const response = result
              ? { jsonrpc: '2.0' as const, id: message.id, result }
              : { jsonrpc: '2.0' as const, id: message.id, error: {
                  code: -32602, message: 'Philidor never accepts keys', data: keyRefusal(paths),
                } };
            void transport.send(response, { relatedRequestId: message.id }).catch(
              (error: unknown) => transport.onerror?.(scrubThrown(error))
            );
            return;
          }
        }
        handler?.(message, extra);
      };
    },
    send: (message, options) => {
      // Preserve normal analytics data; scrub SDK/handler failure envelopes.
      const failure = 'error' in message || (
        'result' in message && message.result && typeof message.result === 'object'
        && 'isError' in message.result && message.result.isError === true
      );
      return transport.send(failure ? scrubSecrets(message) : message, options);
    },
  };
}

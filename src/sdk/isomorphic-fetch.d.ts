// Type declarations for the `isomorphic-fetch` module shim used by the Emby SDK
// This is resolved via wrangler.toml [alias] in Workers

declare module 'isomorphic-fetch' {
  const fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  export default fetch;
  export { fetch };
  export const Headers: typeof globalThis.Headers;
  export const Request: typeof globalThis.Request;
  export const Response: typeof globalThis.Response;
}

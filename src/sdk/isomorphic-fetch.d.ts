// Type declarations for the `isomorphic-fetch` module shim used by the Emby SDK
// The SDK imports it as `import * as isomorphicFetch from "isomorphic-fetch"`
// and uses it as a callable function directly (CommonJS-style module.exports = fetch).
// export = is needed to make the namespace callable.

declare module 'isomorphic-fetch' {
  function isomorphicFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  namespace isomorphicFetch {
    const Headers: typeof Headers;
    const Request: typeof Request;
    const Response: typeof Response;
  }
  export = isomorphicFetch;
}

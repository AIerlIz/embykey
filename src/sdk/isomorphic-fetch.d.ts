// Type declarations for the `isomorphic-fetch` module shim used by the Emby SDK
// The SDK imports it as: import isomorphicFetch from "isomorphic-fetch"
// Uses export default to match ES module syntax (module: "ES2022")

declare module 'isomorphic-fetch' {
  const isomorphicFetch: (url: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  export default isomorphicFetch;
}

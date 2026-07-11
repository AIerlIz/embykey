// Workers 兼容垫片 — 替代 `isomorphic-fetch`
// Workers 中 fetch 是全局可用的，无需额外 polyfill

export default function fetchWrapper(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

export { fetchWrapper as fetch };
export const Headers = globalThis.Headers as unknown as typeof Headers;
export const Request = globalThis.Request as unknown as typeof Request;
export const Response = globalThis.Response as unknown as typeof Response;

// Workers 兼容垫片 — 替代 `isomorphic-fetch`
// Workers 中 fetch 是全局可用的，无需额外 polyfill

const _Headers: any = (globalThis as any).Headers;
const _Request: any = (globalThis as any).Request;
const _Response: any = (globalThis as any).Response;

export default function fetchWrapper(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

export { _Headers as Headers, _Request as Request, _Response as Response };

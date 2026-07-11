// Workers 兼容垫片 — 替代 `isomorphic-fetch`
// Workers 中 fetch 是全局可用的，无需额外 polyfill
// 使用 export = 模式匹配 SDK 的 `import * as X from "isomorphic-fetch"` 用法

function fetchWrapper(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

namespace fetchWrapper {
  export const Headers = (globalThis as any).Headers as typeof Headers;
  export const Request = (globalThis as any).Request as typeof Request;
  export const Response = (globalThis as any).Response as typeof Response;
}

export = fetchWrapper;

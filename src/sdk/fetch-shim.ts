/**
 * Workers 兼容垫片 — 替代 `isomorphic-fetch`
 * Workers 中 fetch 是全局可用的，无需额外 polyfill
 */

// @ts-ignore
export default fetch;
export { fetch as fetch };
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;

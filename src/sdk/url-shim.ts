/**
 * Workers 兼容垫片 — 替代 Node.js `url` 模块
 * 仅实现 SDK api.ts 中使用的 url.parse() 和 url.format()
 */

interface UrlObject {
  protocol?: string;
  host?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string | null;
  hash?: string;
  query?: any;
  path?: string;
  href?: string;
  auth?: string;
}

/**
 * 模拟 url.parse(urlString, parseQueryString)
 */
export function parse(urlString: string, parseQueryString?: boolean): UrlObject {
  try {
    const u = new URL(urlString, 'http://localhost');
    const result: UrlObject = {
      protocol: u.protocol,
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search || null,
      hash: u.hash,
      path: u.pathname + (u.search || ''),
      href: u.href,
    };
    if (parseQueryString) {
      const params: Record<string, string | string[]> = {};
      u.searchParams.forEach((value, key) => {
        const existing = params[key];
        if (existing !== undefined) {
          params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
          params[key] = value;
        }
      });
      result.query = params;
    }
    return result;
  } catch {
    // 处理相对路径
    const qIndex = urlString.indexOf('?');
    const pathname = qIndex >= 0 ? urlString.substring(0, qIndex) : urlString;
    const search = qIndex >= 0 ? urlString.substring(qIndex) : undefined;
    const result: UrlObject = { pathname, search };
    if (parseQueryString && search) {
      const params: Record<string, string> = {};
      new URLSearchParams(search).forEach((value, key) => {
        params[key] = value;
      });
      result.query = params;
    }
    return result;
  }
}

/**
 * 模拟 url.format(urlObject)
 */
export function format(urlObject: UrlObject): string {
  let result = '';

  if (urlObject.protocol) {
    result += urlObject.protocol;
    if (!urlObject.protocol.endsWith('://')) {
      result += '//';
    }
  }

  if (urlObject.host) {
    result += urlObject.host;
  } else if (urlObject.hostname) {
    result += urlObject.hostname;
    if (urlObject.port) {
      result += ':' + urlObject.port;
    }
  }

  if (urlObject.pathname) {
    if (urlObject.host && !urlObject.pathname.startsWith('/')) {
      result += '/';
    }
    result += urlObject.pathname;
  } else if (!result.endsWith('/')) {
    result += '/';
  }

  if (urlObject.search) {
    result += urlObject.search;
  } else if (urlObject.query && typeof urlObject.query === 'object') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(urlObject.query)) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) result += '?' + qs;
  }

  if (urlObject.hash) {
    result += urlObject.hash;
  }

  return result || '/';
}

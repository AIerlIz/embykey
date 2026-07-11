// Type declarations for the Node.js `url` module shim used by the Emby SDK
// This is resolved via wrangler.toml [alias] + tsconfig paths in Workers

declare module 'url' {
  export function parse(urlString: string, parseQueryString?: boolean): {
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
  };
  export function format(urlObject: any): string;
  export function resolve(from: string, to: string): string;
}

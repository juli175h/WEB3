// Temporary shim for React types to allow building without @types/react installed.
// This file should be removed after installing proper @types/react devDependency.

declare module 'react' {
  const React: any;
  export default React;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export type FC<P = any> = any;
}

declare module 'react-dom/client' {
  export function hydrateRoot(container: any, app: any): any;
  export function createRoot(container: any): any;
}

declare module 'react-dom/server' {
  export function renderToString(app: any): string;
}

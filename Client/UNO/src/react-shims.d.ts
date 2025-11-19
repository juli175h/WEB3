// Temporary React/JSX shims to keep the TypeScript compiler/editor happy
// while @types/react / @types/react-dom are being installed.
// Remove this file after running `npm ci` to install the proper types.

declare module "react" {
  export * from "*";
  const React: any;
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const jsxDEV: any;
}

// Allow any JSX intrinsic elements while types are not present.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

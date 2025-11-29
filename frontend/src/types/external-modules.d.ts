/* eslint-disable @typescript-eslint/no-explicit-any */
// Type stubs for packages unavailable in the current environment
// These declarations ensure the TypeScript compiler can resolve module imports
// used throughout the project without altering runtime behavior.
declare module "@radix-ui/react-dropdown-menu" {
  import type * as React from "react";

  export const Root: React.FC<any>;
  export const Trigger: React.FC<any>;
  export const Group: React.FC<any>;
  export const Portal: React.FC<any>;
  export const Sub: React.FC<any>;
  export const RadioGroup: React.FC<any>;
  export const SubTrigger: React.ForwardRefExoticComponent<any>;
  export const SubContent: React.ForwardRefExoticComponent<any>;
  export const Content: React.ForwardRefExoticComponent<any>;
  export const Item: React.ForwardRefExoticComponent<any>;
  export const CheckboxItem: React.ForwardRefExoticComponent<any>;
  export const RadioItem: React.ForwardRefExoticComponent<any>;
  export const Label: React.ForwardRefExoticComponent<any>;
  export const Separator: React.ForwardRefExoticComponent<any>;
  export const ItemIndicator: React.ForwardRefExoticComponent<any>;
}

declare module "@tanstack/react-virtual" {
  export type VirtualItem = {
    key: number | string;
    index: number;
    start: number;
    size: number;
    end?: number;
    lane?: number;
    measureSize?: () => number;
  };

  export function useWindowVirtualizer(options: any): any;
}

declare module "ky" {
  export interface HTTPError extends Error {
    response?: Response;
  }

  export type Options = Record<string, unknown>;

  export interface KyInstance {
    get: (url: string, options?: Options) => { json: <T>() => Promise<T> };
    post: (url: string, options?: Options) => { json: <T>() => Promise<T> };
    put: (url: string, options?: Options) => { json: <T>() => Promise<T> };
    patch: (url: string, options?: Options) => { json: <T>() => Promise<T> };
    delete: (url: string, options?: Options) => { json: <T>() => Promise<T> };
    create: (options: Options) => KyInstance;
  }

  const ky: KyInstance & {
    create: (options: Options) => KyInstance;
  };

  export default ky;
}

declare module "qs" {
  const qs: {
    stringify: (obj: Record<string, unknown>, options?: Record<string, unknown>) => string;
    parse: (input: string, options?: Record<string, unknown>) => unknown;
  };

  export default qs;
}

declare module "papaparse" {
  export interface ParseError {
    row?: number;
    message: string;
  }

  export interface ParseMeta {
    fields?: string[];
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export type ParseConfig<T> = Record<string, unknown> & {
    complete?: (results: ParseResult<T>) => void;
    error?: (error: Error) => void;
    transformHeader?: (header: string) => string;
    transform?: (value: string) => string;
  };

  const Papa: {
    parse: <T>(input: string | File, config?: ParseConfig<T>) => ParseResult<T>;
    unparse: (data: unknown, config?: Record<string, unknown>) => string;
  };

  export default Papa;
}

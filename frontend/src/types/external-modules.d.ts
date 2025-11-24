// Type stubs for packages unavailable in the current environment
// These declarations ensure the TypeScript compiler can resolve module imports
// used throughout the project without altering runtime behavior.
declare module "@radix-ui/react-dropdown-menu" {
  import * as React from "react";

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

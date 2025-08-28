declare module "prismjs" {
  export interface Token {
    type: string;
    content: string | Token | Array<string | Token>;
    alias?: string | string[];
    length?: number;
    greedy?: boolean;
    matchedStr?: string;
  }
}

declare module "prismjs/components/*";

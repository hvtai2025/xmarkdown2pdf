// Minimal type shim for node-plantuml (no @types package exists).
declare module 'node-plantuml' {
  import { EventEmitter } from 'events';

  interface GenerateResult {
    out: EventEmitter;
    err?: EventEmitter;
  }

  interface GenerateOptions {
    format?: 'svg' | 'png' | 'txt' | 'utxt';
    charset?: string;
    jar?: string;
  }

  function generate(source: string, options?: GenerateOptions): GenerateResult;
  function generateURL(source: string): string;
}

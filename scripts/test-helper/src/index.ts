import { isPathString, normalizeToPosixPath } from './path';
import {
  applyMatcherReplacement,
  createDefaultPathMatchers,
} from './pathSerializer';
import type { PathMatcher } from './pathSerializer';

export interface SnapshotSerializerOptions {
  cwd?: string;
  workspace?: string;
  replace?: PathMatcher[];
}

export function createSnapshotSerializer(options?: SnapshotSerializerOptions) {
  const {
    cwd = process.cwd(),
    workspace = process.cwd(),
    replace: customMatchers = [],
  } = options || {};

  const pathMatchers: PathMatcher[] = [
    { mark: 'root', match: cwd },
    { mark: 'workspace', match: workspace },
    ...customMatchers,
    ...createDefaultPathMatchers(workspace),
  ];

  pathMatchers
    .filter((matcher) => typeof matcher.match === 'string')
    .forEach(
      (matcher) =>
        (matcher.match = normalizeToPosixPath(matcher.match as string)),
    );

  return {
    pathMatchers,
    // match path-format string
    test: (val: unknown) => typeof val === 'string' && isPathString(val),
    print: (val: unknown) => {
      const normalized = normalizeToPosixPath(val as string);
      const replaced = applyMatcherReplacement(
        pathMatchers,
        normalized,
      ).replace(/"/g, '\\"');
      return `"${replaced}"`;
    },
  };
}

export * from './rspack';
export * from './webpack';
export * from './rsbuild';

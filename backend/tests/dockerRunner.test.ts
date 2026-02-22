import { describe, it, expect } from 'vitest';
import { normalizeImageArchitecture, assertImageArchitecture } from '../src/services/dockerRunner.js';

describe('dockerRunner architecture checks', () => {
  it('normalizes Docker architecture aliases', () => {
    expect(normalizeImageArchitecture('aarch64')).toBe('arm64');
    expect(normalizeImageArchitecture('x86_64')).toBe('amd64');
    expect(normalizeImageArchitecture('amd64')).toBe('amd64');
  });

  it('accepts matching architecture', () => {
    expect(() => assertImageArchitecture('example:tag', 'x86_64', 'amd64')).not.toThrow();
    expect(() => assertImageArchitecture('example:tag', 'aarch64', 'arm64')).not.toThrow();
  });

  it('throws on architecture mismatch', () => {
    expect(() => assertImageArchitecture('example:tag', 'arm64', 'amd64')).toThrow(
      'Image example:tag architecture mismatch: expected amd64, got arm64'
    );
  });
});

/**
 * Test setup and utilities
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { vi } from 'vitest';

// Mock environment for tests
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

// Keep tests isolated from any developer/host Action Packer state.
process.env.ACTION_PACKER_HOME = path.join(os.tmpdir(), `action-packer-test-home-${process.pid}`);
process.env.DATA_DIR = path.join(process.env.ACTION_PACKER_HOME, 'data');

// Best-effort cleanup from previous runs (same PID reuse is rare, but cheap to handle).
await fs.rm(process.env.ACTION_PACKER_HOME, { recursive: true, force: true }).catch(() => {});
await fs.mkdir(process.env.DATA_DIR, { recursive: true });

// Mock GitHub client
vi.mock('../src/services/github.js', () => ({
  createGitHubClient: vi.fn(() => ({
    validateToken: vi.fn().mockResolvedValue({
      valid: true,
      login: 'testuser',
      scopes: ['repo', 'admin:org'],
    }),
    checkAdminAccess: vi.fn().mockResolvedValue({
      hasAccess: true,
    }),
    createRegistrationToken: vi.fn().mockResolvedValue({
      token: 'test-registration-token',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }),
    createRemoveToken: vi.fn().mockResolvedValue({
      token: 'test-remove-token',
    }),
    listRunners: vi.fn().mockResolvedValue({
      total_count: 0,
      runners: [],
    }),
    deleteRunner: vi.fn().mockResolvedValue(true),
    setRunnerLabels: vi.fn().mockResolvedValue([]),
    getRunnerDownloads: vi.fn().mockResolvedValue([
      {
        os: 'osx',
        architecture: 'arm64',
        download_url: 'https://github.com/actions/runner/releases/download/v2.300.0/actions-runner-osx-arm64-2.300.0.tar.gz',
        filename: 'actions-runner-osx-arm64-2.300.0.tar.gz',
        sha256_checksum: 'abc123',
      },
    ]),
    listRepositories: vi.fn().mockResolvedValue({
      total_count: 0,
      repositories: [],
    }),
    listOrganizations: vi.fn().mockResolvedValue([]),
    createWebhook: vi.fn().mockResolvedValue({
      id: 12345,
      active: true,
    }),
    deleteWebhook: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Re-export for tests
export { vi };

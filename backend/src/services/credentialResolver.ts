/**
 * Credential resolution service
 * Handles resolving actual access tokens from credentials of any type
 */

import { db } from '../db/index.js';
import type { CredentialRow, GitHubAppRow } from '../db/schema.js';
import { decrypt } from '../utils/crypto.js';
import { GitHubAppClient } from './githubApp.js';
import { createGitHubClient, type GitHubScope, type GitHubClient } from './github.js';

/**
 * Result of resolving a credential to an access token
 */
export type ResolvedCredential = {
  token: string;
  scope: GitHubScope;
  target: string;
  type: 'pat' | 'github_app';
  installationId?: number;
};

/**
 * Get the GitHub App configuration from database
 */
function getGitHubApp(): GitHubAppRow | null {
  const row = db
    .prepare('SELECT * FROM github_app WHERE id = 1')
    .get() as GitHubAppRow | undefined;
  return row ?? null;
}

/**
 * Resolve a credential to an actual access token
 * For PATs: returns the decrypted token
 * For GitHub App: generates an installation access token
 */
export async function resolveCredentialToken(credential: CredentialRow): Promise<ResolvedCredential> {
  if (credential.type === 'pat') {
    // PAT - just decrypt and return
    const token = decrypt({
      encrypted: credential.encrypted_token,
      iv: credential.iv,
      authTag: credential.auth_tag,
    });

    return {
      token,
      scope: credential.scope as GitHubScope,
      target: credential.target,
      type: 'pat',
    };
  }

  // GitHub App credential - need to generate installation access token
  if (!credential.installation_id) {
    throw new Error('GitHub App credential missing installation_id');
  }

  const githubApp = getGitHubApp();
  if (!githubApp) {
    throw new Error('GitHub App not configured');
  }

  // Decrypt the private key
  const privateKey = decrypt({
    encrypted: githubApp.encrypted_private_key,
    iv: githubApp.private_key_iv,
    authTag: githubApp.private_key_auth_tag,
  });

  // Create GitHub App client and get installation token
  const appClient = new GitHubAppClient({
    privateKey,
    clientId: githubApp.client_id,
    appId: githubApp.app_id,
    installationId: credential.installation_id,
  });

  const token = await appClient.getToken();

  return {
    token,
    scope: credential.scope as GitHubScope,
    target: credential.target,
    type: 'github_app',
    installationId: credential.installation_id,
  };
}

/**
 * Create a GitHubClient from a credential, resolving tokens as needed
 */
export async function createClientFromCredential(credential: CredentialRow): Promise<GitHubClient> {
  const resolved = await resolveCredentialToken(credential);
  return createGitHubClient(resolved.token, resolved.scope, resolved.target);
}

/**
 * Resolve credential by ID
 */
export async function resolveCredentialById(credentialId: string): Promise<ResolvedCredential> {
  const credential = db
    .prepare('SELECT * FROM credentials WHERE id = ?')
    .get(credentialId) as CredentialRow | undefined;

  if (!credential) {
    throw new Error(`Credential not found: ${credentialId}`);
  }

  return resolveCredentialToken(credential);
}

/**
 * Create a GitHubClient from a credential ID
 */
export async function createClientFromCredentialId(credentialId: string): Promise<GitHubClient> {
  const credential = db
    .prepare('SELECT * FROM credentials WHERE id = ?')
    .get(credentialId) as CredentialRow | undefined;

  if (!credential) {
    throw new Error(`Credential not found: ${credentialId}`);
  }

  return createClientFromCredential(credential);
}

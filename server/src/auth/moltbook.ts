import type { MoltBookProfile } from '@susbot/shared';

const MOLTBOOK_BASE_URL = 'https://www.moltbook.com';
const VERIFY_ENDPOINT = `${MOLTBOOK_BASE_URL}/api/v1/agents/verify-identity`;

interface VerifyResponse {
  success: boolean;
  valid: boolean;
  agent: {
    id: string;
    name: string;
    avatar_url: string | null;
    karma: number;
    is_claimed: boolean;
    description?: string;
  };
}

interface VerifyError {
  success: false;
  error: string;
}

// Token cache: identity_token → verified profile
const tokenCache = new Map<string, { profile: MoltBookProfile; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes (tokens expire in 60)

function getAppKey(): string {
  const key = process.env['MOLTBOOK_APP_KEY'];
  if (!key) {
    throw new Error('MOLTBOOK_APP_KEY environment variable is required');
  }
  return key;
}

function isDevMode(): boolean {
  return process.env['MOLTBOOK_APP_KEY']?.startsWith('moltdev_test') ?? false;
}

export async function verifyIdentityToken(
  identityToken: string,
  audience?: string,
): Promise<{ success: true; profile: MoltBookProfile } | { success: false; error: string }> {
  // Dev mode: accept token as "dev:<agentId>:<agentName>" format
  if (isDevMode() && identityToken.startsWith('dev:')) {
    const parts = identityToken.split(':');
    const agentId = parts[1] ?? identityToken;
    const agentName = parts[2] ?? `Agent_${agentId.slice(0, 6)}`;
    return {
      success: true,
      profile: {
        id: agentId,
        name: agentName,
        avatarUrl: null,
        karma: Math.floor(Math.random() * 10000),
        isClaimed: true,
      },
    };
  }

  // Check cache
  const cached = tokenCache.get(identityToken);
  if (cached && Date.now() < cached.expiresAt) {
    return { success: true, profile: cached.profile };
  }

  try {
    const body: Record<string, string> = { token: identityToken };
    if (audience) body['audience'] = audience;

    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Moltbook-App-Key': getAppKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as VerifyError;
      return {
        success: false,
        error: errorData.error ?? `HTTP ${response.status}`,
      };
    }

    const data = await response.json() as VerifyResponse;

    if (!data.success || !data.valid) {
      return { success: false, error: 'invalid_token' };
    }

    const profile: MoltBookProfile = {
      id: data.agent.id,
      name: data.agent.name,
      avatarUrl: data.agent.avatar_url,
      karma: data.agent.karma,
      isClaimed: data.agent.is_claimed,
    };

    // Cache the token
    tokenCache.set(identityToken, {
      profile,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });

    return { success: true, profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `verification_failed: ${message}` };
  }
}

export function clearTokenCache(): void {
  tokenCache.clear();
}

// Periodically clean expired entries
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache) {
    if (now >= entry.expiresAt) {
      tokenCache.delete(token);
    }
  }
}, 5 * 60 * 1000);

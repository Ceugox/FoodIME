export const ADMIN_COOKIE_NAME = 'admin_token';

export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15,
  };
}

function base64UrlToUint8Array(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export async function verifyAdminToken(token: string): Promise<Record<string, unknown> | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(encodedHeader))) as {
      alg?: string;
      typ?: string;
    };

    if (header.alg !== 'HS256') {
      return null;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, signedData));
    const expectedSignature = base64UrlToUint8Array(encodedSignature);

    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToUint8Array(encodedPayload)),
    ) as Record<string, unknown>;

    const exp = typeof payload.exp === 'number' ? payload.exp : null;
    if (exp && exp * 1000 <= Date.now()) {
      return null;
    }

    return payload.role === 'ADMIN' ? payload : null;
  } catch {
    return null;
  }
}

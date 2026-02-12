import { jwtVerify, createRemoteJWKSet } from "jose";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const APPLE_ISSUER = "https://appleid.apple.com";
const BUNDLE_ID = "com.inboxiq.app";

// Cached JWKS client — jose handles key rotation and caching internally
const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

export interface AppleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
}

/**
 * Verifies an Apple identity token JWT against Apple's public JWKS.
 * Validates issuer and audience (bundle ID).
 */
export async function verifyAppleIdentityToken(
  identityToken: string
): Promise<AppleTokenPayload> {
  const { payload } = await jwtVerify(identityToken, appleJWKS, {
    issuer: APPLE_ISSUER,
    audience: BUNDLE_ID,
  });

  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
    email_verified: payload.email_verified as string | boolean | undefined,
    is_private_email: payload.is_private_email as string | boolean | undefined,
  };
}

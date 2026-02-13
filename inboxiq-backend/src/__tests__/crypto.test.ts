import { encryptToken, decryptToken, isEncryptedToken, safeDecryptToken, safeEncryptToken } from "../utils/crypto";

describe("crypto utils", () => {
  describe("encryptToken / decryptToken", () => {
    it("roundtrips a plaintext string", () => {
      const plaintext = "ya29.a0AfH6SMB_test_token_value";
      const encrypted = encryptToken(plaintext);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext each time (random IV)", () => {
      const plaintext = "same-input";
      const a = encryptToken(plaintext);
      const b = encryptToken(plaintext);
      expect(a).not.toBe(b);
      // But both decrypt to the same value
      expect(decryptToken(a)).toBe(plaintext);
      expect(decryptToken(b)).toBe(plaintext);
    });
  });

  describe("isEncryptedToken", () => {
    it("returns true for encrypted tokens", () => {
      const encrypted = encryptToken("test");
      expect(isEncryptedToken(encrypted)).toBe(true);
    });

    it("returns false for short strings", () => {
      expect(isEncryptedToken("short")).toBe(false);
    });

    it("returns false for plaintext OAuth tokens", () => {
      expect(isEncryptedToken("ya29.a0AfH6SMB")).toBe(false);
    });
  });

  describe("safeDecryptToken", () => {
    it("decrypts encrypted tokens", () => {
      const plaintext = "my-secret-token";
      const encrypted = encryptToken(plaintext);
      expect(safeDecryptToken(encrypted)).toBe(plaintext);
    });

    it("returns plaintext for unencrypted legacy tokens", () => {
      const legacy = "ya29.plaintext-token";
      expect(safeDecryptToken(legacy)).toBe(legacy);
    });
  });

  describe("safeEncryptToken", () => {
    it("encrypts when TOKEN_ENCRYPTION_KEY is set", () => {
      const plaintext = "token-to-encrypt";
      const result = safeEncryptToken(plaintext);
      expect(result).not.toBe(plaintext);
      expect(decryptToken(result)).toBe(plaintext);
    });

    it("returns plaintext when TOKEN_ENCRYPTION_KEY is unset", () => {
      const original = process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      try {
        expect(safeEncryptToken("my-token")).toBe("my-token");
      } finally {
        process.env.TOKEN_ENCRYPTION_KEY = original;
      }
    });
  });
});

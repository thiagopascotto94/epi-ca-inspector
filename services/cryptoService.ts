
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

/**
 * Encrypts a string using AES with a given secret.
 * @param data The string data to encrypt.
 * @param secret The secret key for encryption.
 * @returns The encrypted data as a string.
 */
export const encryptData = (data: string, secret: string): string => {
  return AES.encrypt(data, secret).toString();
};

/**
 * Decrypts an AES encrypted string with a given secret.
 * @param encryptedData The encrypted string.
 * @param secret The secret key for decryption.
 * @returns The decrypted string, or null if decryption fails (e.g., wrong password).
 */
export const decryptData = (encryptedData: string, secret: string): string | null => {
  try {
    const bytes = AES.decrypt(encryptedData, secret);
    const decryptedData = bytes.toString(Utf8);
    // If the decrypted data is an empty string, it's likely a wrong password
    if (!decryptedData) {
        return null;
    }
    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

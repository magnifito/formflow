import { v4 as uuidv4 } from 'uuid';
import bs58 from 'bs58';

/**
 * Generate a short, URL-safe 22-character submit hash using base58 encoded UUID v4.
 */
export const generateSubmitHash = (): string => {
    const bytes = Buffer.alloc(16);
    uuidv4({}, bytes);
    // UUID v4 encoding in base58 is typically 22 chars, pad to ensure consistency.
    return bs58.encode(bytes).padStart(22, '1');
};

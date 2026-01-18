import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load .env from multiple possible locations
// This handles both direct server execution and script execution
// Use process.cwd() which is more reliable in ts-node context
dotenv.config(); // Try current directory first
dotenv.config({ path: path.join(process.cwd(), '.env') }); // Try from cwd
dotenv.config({ path: path.join(process.cwd(), '../.env') }); // Try one level up
dotenv.config({ path: path.join(process.cwd(), '../../.env') }); // Try two levels up
dotenv.config({ path: path.join(process.cwd(), '../../../.env') }); // Try three levels up (from libs/shared/utils/encryption/src)
dotenv.config({ path: path.join(process.cwd(), '../../../../.env') }); // Try four levels up (from workspace root)

const algorithm = 'aes-256-cbc';

// Lazy initialization of encryption key to allow for environment variable loading
let key: Buffer | null = null;
const getKey = (): Buffer => {
    if (!key) {
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('ENCRYPTION_KEY environment variable is not set');
        }
        key = crypto.scryptSync(encryptionKey, 'salt', 32);
    }
    return key;
};

export const encrypt = (text: string): string => {
    if (!text) return text; // Handle null case
    const iv = crypto.randomBytes(16); // Must be 16 bytes for AES
    const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (hash: string): string => {
    if (!hash) return hash; // Handle null case
    const [ivString, encryptedText] = hash.split(':');
    const iv = Buffer.from(ivString, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, getKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

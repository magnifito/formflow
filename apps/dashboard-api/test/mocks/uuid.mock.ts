export const v4 = (options?: any, buffer?: any, offset?: number) => {
    const bytes = new Uint8Array(16);
    // Generate random values
    for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    // Set version (4) and variant (RFC4122)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    if (buffer) {
        const start = offset || 0;
        for (let i = 0; i < 16; i++) {
            buffer[start + i] = bytes[i];
        }
        return buffer;
    }

    // Convert to string
    const hex = [];
    for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    const s = hex.join('');
    return [
        s.substring(0, 8),
        s.substring(8, 12),
        s.substring(12, 16),
        s.substring(16, 20),
        s.substring(20)
    ].join('-');
};

export default { v4 };

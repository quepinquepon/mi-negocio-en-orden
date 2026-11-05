// ========== LICENSE SYSTEM ==========
// Simple but effective offline license system.
// Format: MNEO-XXXX-XXXX-XXXX-XXXX
// Validation: prefix + length + simple checksum

const License = {
  STORAGE_KEY: 'mneo_license',
  PREFIX: 'MNEO',
  
  // Secret used for checksum (change this if you want to invalidate old keys)
  // Keep it private. Only you should know it.
  SECRET: 'MiNegocio2026Orden!',

  // Check if already activated on this device
  isActivated() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return parsed && parsed.valid === true && parsed.key;
    } catch {
      return false;
    }
  },

  getActivatedKey() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data).key;
    } catch {
      return null;
    }
  },

  // Activate a key
  activate(rawKey) {
    const key = this.normalize(rawKey);
    
    if (!this.validate(key)) {
      return { success: false, message: 'Clave inválida. Revisá que esté bien escrita.' };
    }

    const payload = {
      valid: true,
      key: key,
      activatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    return { success: true, message: '¡Licencia activada correctamente!' };
  },

  // Remove license (for testing or change)
  deactivate() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Normalize input (uppercase, remove spaces/dashes extra)
  normalize(input) {
    if (!input) return '';
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .replace(/^MNEO/, 'MNEO-')
      .replace(/([A-Z0-9]{4})(?=[A-Z0-9])/g, '$1-')
      .replace(/-$/, '')
      .slice(0, 24); // MNEO-XXXX-XXXX-XXXX-XXXX = 24 chars with dashes
  },

  // Format for display
  format(key) {
    const clean = key.replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) return clean;
    const parts = [];
    parts.push(clean.slice(0, 4));
    for (let i = 4; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    return parts.join('-');
  },

  // Validate key structure + checksum
  validate(key) {
    const clean = key.replace(/-/g, '');
    
    // Must start with MNEO
    if (!clean.startsWith('MNEO')) return false;
    
    // Must be exactly 20 characters without dashes (MNEO + 16 chars)
    if (clean.length !== 20) return false;

    // Extract body and checksum
    const body = clean.slice(4, 16); // 12 chars
    const checksum = clean.slice(16, 20); // 4 chars

    // Calculate expected checksum
    const expected = this._calculateChecksum(body);
    
    return checksum === expected;
  },

  // Simple checksum based on secret
  _calculateChecksum(body) {
    let hash = 0;
    const str = body + this.SECRET;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to 4 uppercase alphanumeric chars
    const positive = Math.abs(hash);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars
    let result = '';
    let n = positive;
    for (let i = 0; i < 4; i++) {
      result = chars[n % chars.length] + result;
      n = Math.floor(n / chars.length);
    }
    return result;
  },

  // ========== GENERATOR (for you, the seller) ==========
  // Use this to generate valid keys
  generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let body = '';
    for (let i = 0; i < 12; i++) {
      body += chars[Math.floor(Math.random() * chars.length)];
    }
    const checksum = this._calculateChecksum(body);
    const full = 'MNEO' + body + checksum;
    return this.format(full);
  },

  // Generate multiple keys at once
  generateKeys(count = 10) {
    const keys = [];
    for (let i = 0; i < count; i++) {
      keys.push(this.generateKey());
    }
    return keys;
  }
};

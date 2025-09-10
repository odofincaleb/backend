const { encrypt, decrypt, hashPassword, comparePassword, generateRandomString, generateLicenseKey } = require('../utils/encryption');

describe('Encryption Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'This is a test string';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle null values', () => {
      const encrypted = encrypt(null);
      const decrypted = decrypt(null);

      expect(encrypted).toBeNull();
      expect(decrypted).toBeNull();
    });

    it('should handle special characters', () => {
      const specialText = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = 'Unicode: 你好世界 🌍 émojis';
      const encrypted = encrypt(unicodeText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(unicodeText);
    });
  });

  describe('hashPassword/comparePassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$.{53}$/); // bcrypt format
    });

    it('should compare password correctly', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      const isInvalid = await comparePassword('wrongpassword', hash);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!@#$%^&*()';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);

      expect(isValid).toBe(true);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of correct length', () => {
      const length = 32;
      const randomString = generateRandomString(length);

      expect(randomString).toHaveLength(length * 2); // hex encoding doubles length
    });

    it('should generate different strings each time', () => {
      const string1 = generateRandomString(16);
      const string2 = generateRandomString(16);

      expect(string1).not.toBe(string2);
    });

    it('should generate hex string', () => {
      const randomString = generateRandomString(16);
      const hexRegex = /^[0-9a-f]+$/;

      expect(randomString).toMatch(hexRegex);
    });

    it('should use default length when not specified', () => {
      const randomString = generateRandomString();

      expect(randomString).toHaveLength(64); // 32 * 2 for hex
    });
  });

  describe('generateLicenseKey', () => {
    it('should generate license key in correct format', () => {
      const licenseKey = generateLicenseKey();

      expect(licenseKey).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    it('should generate different keys each time', () => {
      const key1 = generateLicenseKey();
      const key2 = generateLicenseKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate uppercase keys', () => {
      const licenseKey = generateLicenseKey();

      expect(licenseKey).toBe(licenseKey.toUpperCase());
    });

    it('should have correct length', () => {
      const licenseKey = generateLicenseKey();

      expect(licenseKey).toHaveLength(19); // 4 segments of 4 chars + 3 dashes
    });
  });
});

describe('Database Connection', () => {
  const { testConnection } = require('../database/connection');

  it('should connect to database successfully', async () => {
    const connected = await testConnection();
    expect(connected).toBe(true);
  });
});

describe('Logger', () => {
  const logger = require('../utils/logger');

  it('should log info message', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error message', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should log warning message', () => {
    expect(() => {
      logger.warn('Test warning message');
    }).not.toThrow();
  });

  it('should log debug message', () => {
    expect(() => {
      logger.debug('Test debug message');
    }).not.toThrow();
  });
});


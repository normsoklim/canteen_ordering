import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export class HashUtil {
  static async hashPassword(password: string, saltRounds: number = 10): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  static generateMD5Hash(data: string): string {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }
    return crypto.createHash('md5').update(data).digest('hex');
  }

  static generateSHA256Hash(data: string): string {
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
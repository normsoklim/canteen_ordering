// JWT configuration file
export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'default_secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '60m',
} as const;
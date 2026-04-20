# 🔐 Password Reset with OTP - Production Implementation

This document describes the clean production-style password reset flow implemented in the NestJS canteen backend.

## 📌 Flow Overview

1. **Request Reset** - User provides email to request password reset
2. **Generate OTP** - System generates 6-digit OTP and sends to email
3. **Verify OTP** - User submits OTP + new password
4. **Update Password** - System verifies OTP and updates password
5. **Invalidate OTP** - OTP is deleted after successful use

## 🚀 API Endpoints

### 1. Request Password Reset

**Endpoint:** `POST /auth/request-password-reset`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, an OTP has been sent to your email"
}
```

**Security Note:** Always returns the same message regardless of whether the email exists to prevent email enumeration attacks.

### 2. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otpCode": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

## 🔒 Security Features

### OTP Security
- **6-digit OTP** with 5-minute expiration
- **Hashed storage** using bcrypt
- **3 attempt limit** before OTP is invalidated
- **Automatic deletion** after successful verification

### Password Security
- **Bcrypt hashing** with salt rounds
- **Minimum 6 characters** validation
- **No password reuse** checks (can be added)

### Email Security
- **Generic responses** to prevent email enumeration
- **Rate limiting** (to be implemented)
- **Secure email templates**

## 🏗️ Code Structure

```
src/modules/auth/
├── auth.controller.ts          # Endpoint definitions
├── auth.service.ts            # Business logic
├── otp.service.ts             # OTP generation & verification
├── users.service.ts           # User operations
└── dto/
    ├── request-password-reset.dto.ts
    └── reset-password.dto.ts
```

## 📊 Database Schema

### OTP Entity
```typescript
@Entity('otps')
export class Otp {
  id: number;
  email: string;           // Indexed for fast lookup
  otpCode: string;         // Hashed OTP code
  expiresAt: Date;         // 5-minute expiration
  attempts: number;        // Max 3 attempts
  createdAt: Date;
}
```

## 🔧 Implementation Details

### OTP Service ([`otp.service.ts`](src/modules/auth/otp.service.ts))
- Uses database storage (not in-memory Map)
- Hashes OTP before storage
- Implements expiration and attempt limits
- Auto-deletes after successful verification

### Auth Service ([`auth.service.ts`](src/modules/auth/auth.service.ts))
- Security-conscious error messages
- Proper password hashing
- Email service integration
- User existence validation

### Email Service ([`email.service.ts`](src/modules/email/email.service.ts))
- Dedicated password reset email template
- Placeholder for real email provider integration
- Development logging

## 🚀 Production Best Practices

### ✅ Implemented
- [x] OTP expiration (5 minutes)
- [x] OTP attempt limits (3 attempts)
- [x] Hashed OTP storage
- [x] Hashed password storage
- [x] Generic error responses
- [x] Database-backed OTP storage

### 🔄 To Implement (Recommended)
- [ ] Rate limiting for OTP requests
- [ ] Redis for OTP storage (faster)
- [ ] Email provider integration (SendGrid, etc.)
- [ ] Password strength validation
- [ ] Password history tracking
- [ ] Account lockout after multiple failed attempts

## 🧪 Testing

The implementation has been tested with:
- ✅ TypeScript compilation
- ✅ Build process
- ✅ Database migrations
- ✅ Service dependency injection

## 📝 Usage Example

### Frontend Integration

```javascript
// 1. Request password reset
const response = await fetch('/auth/request-password-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// 2. User receives OTP via email
// 3. Submit OTP and new password
const resetResponse = await fetch('/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otpCode: '123456',
    newPassword: 'newSecurePassword123'
  })
});
```

## 🔍 Error Handling

### Common Error Scenarios
- **Invalid OTP**: `400 Bad Request - Invalid or expired OTP`
- **User not found**: `404 Not Found - User not found`
- **Email send failure**: `400 Bad Request - Failed to send OTP email`
- **OTP attempt limit**: `400 Bad Request - Invalid or expired OTP`

## 📈 Performance Considerations

- OTP table should be indexed on `email` and `createdAt`
- Consider Redis for OTP storage in high-traffic applications
- Implement cleanup job for expired OTPs
- Add monitoring for OTP request rates

---

**Maintainer:** Canteen Backend Team  
**Last Updated:** 2026-03-27
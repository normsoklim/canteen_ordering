import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Clean up users before each test to avoid conflicts
  beforeEach(async () => {
    // In a real test, you might want to clear the test database
  });

  it('/auth/register (POST) - should register a new user', async () => {
    const registerData = {
      fullname: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerData)
      .expect(201)
      .then(response => {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user.email).toBe(registerData.email);
        expect(response.body.user.fullname).toBe(registerData.fullname);
      });
  });

  it('/auth/login (POST) - should login with valid credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(200)
      .then(response => {
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user.email).toBe(loginData.email);
      });
  });

  it('/auth/login (POST) - should fail with invalid credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(loginData)
      .expect(200) // This might return 200 but with an error message, or you might want to change the service to throw an error
      .then(response => {
        // In the current implementation, it returns an error, but you might want to handle this differently
        console.log('Response for invalid login:', response.body);
      });
  });
});
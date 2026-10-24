// import { ConflictException, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { JwtService } from '@nestjs/jwt';
// import { Test, TestingModule } from '@nestjs/testing';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import * as bcrypt from 'bcrypt';
// import { Repository } from 'typeorm';
// import { AuthService } from './auth.service';
// import { User } from './entities/user.entity';
//
// const USER_ID = '00000000-0000-4000-8000-000000000001';
// const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
//
// describe('AuthService', () => {
//   let service: AuthService;
//   let userRepository: jest.Mocked<
//     Pick<
//       Repository<User>,
//       'existsBy' | 'create' | 'save' | 'createQueryBuilder'
//     >
//   >;
//   let jwtService: { signAsync: jest.Mock };
//   let queryBuilder: {
//     addSelect: jest.Mock;
//     where: jest.Mock;
//     getOne: jest.Mock;
//   };
//
//   beforeEach(async () => {
//     queryBuilder = {
//       addSelect: jest.fn().mockReturnThis(),
//       where: jest.fn().mockReturnThis(),
//       getOne: jest.fn(),
//     };
//     userRepository = {
//       existsBy: jest.fn(),
//       create: jest.fn((data: Partial<User>) => data as User),
//       save: jest.fn((user: User) =>
//         Promise.resolve(
//           Object.assign(user, {
//             id: USER_ID,
//             createdAt: CREATED_AT,
//             updatedAt: CREATED_AT,
//           }),
//         ),
//       ),
//       createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
//     };
//     jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
//
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         AuthService,
//         { provide: getRepositoryToken(User), useValue: userRepository },
//         { provide: JwtService, useValue: jwtService },
//         {
//           provide: ConfigService,
//           useValue: {
//             getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
//             get: jest.fn().mockReturnValue('30d'),
//           },
//         },
//       ],
//     }).compile();
//
//     service = module.get<AuthService>(AuthService);
//   });
//
//   it('signs up with a normalized email and a hashed password', async () => {
//     userRepository.existsBy.mockResolvedValue(false);
//
//     const result = await service.signup({
//       firstName: '  Seyha ',
//       lastName: ' Yoeun ',
//       email: ' YOU@Example.com ',
//       password: 'password123',
//     });
//
//     expect(userRepository.existsBy).toHaveBeenCalledWith({
//       email: 'you@example.com',
//     });
//     const saved = userRepository.save.mock.calls[0][0];
//     expect(saved).toMatchObject({
//       firstName: 'Seyha',
//       lastName: 'Yoeun',
//       email: 'you@example.com',
//     });
//     expect(saved.passwordHash).not.toBe('password123');
//     await expect(
//       bcrypt.compare('password123', saved.passwordHash),
//     ).resolves.toBe(true);
//     expect(result).toMatchObject({
//       accessToken: 'signed-token',
//       user: {
//         id: USER_ID,
//         firstName: 'Seyha',
//         lastName: 'Yoeun',
//         email: 'you@example.com',
//         createdAt: CREATED_AT.getTime(),
//       },
//     });
//     expect(result.user).not.toHaveProperty('passwordHash');
//   });
//
//   it('rejects a duplicate email on signup', async () => {
//     userRepository.existsBy.mockResolvedValue(true);
//
//     await expect(
//       service.signup({
//         firstName: 'Seyha',
//         lastName: 'Yoeun',
//         email: 'you@example.com',
//         password: 'password123',
//       }),
//     ).rejects.toBeInstanceOf(ConflictException);
//     expect(userRepository.save).not.toHaveBeenCalled();
//   });
//
//   it('logs in with valid credentials', async () => {
//     const passwordHash = await bcrypt.hash('password123', 4);
//     queryBuilder.getOne.mockResolvedValue({
//       id: USER_ID,
//       firstName: 'Seyha',
//       lastName: 'Yoeun',
//       email: 'you@example.com',
//       passwordHash,
//       createdAt: CREATED_AT,
//       updatedAt: CREATED_AT,
//     });
//
//     const result = await service.login({
//       email: 'YOU@example.com',
//       password: 'password123',
//     });
//
//     expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
//       email: 'you@example.com',
//     });
//     expect(result.accessToken).toBe('signed-token');
//   });
//
//   it('rejects an unknown email or a wrong password', async () => {
//     queryBuilder.getOne.mockResolvedValue(null);
//     await expect(
//       service.login({ email: 'nobody@example.com', password: 'password123' }),
//     ).rejects.toBeInstanceOf(UnauthorizedException);
//
//     const passwordHash = await bcrypt.hash('password123', 4);
//     queryBuilder.getOne.mockResolvedValue({
//       id: USER_ID,
//       firstName: 'Seyha',
//       lastName: 'Yoeun',
//       email: 'you@example.com',
//       passwordHash,
//       createdAt: CREATED_AT,
//       updatedAt: CREATED_AT,
//     });
//     await expect(
//       service.login({ email: 'you@example.com', password: 'wrong-password' }),
//     ).rejects.toBeInstanceOf(UnauthorizedException);
//   });
// });

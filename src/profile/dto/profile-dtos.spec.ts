import { validateDto } from '../../test-utils/validate-dto';
import { AvatarColor } from '../entities/profile.entity';
import { CreateProfileDto } from './create-profile.dto';
import { UpdateProfileDto } from './update-profile.dto';

describe('CreateProfileDto', () => {
  it('trims the name and normalizes the email', async () => {
    const { dto, errors } = await validateDto(CreateProfileDto, {
      name: '  Seyha Yoeun ',
      email: '  YOU@Example.com ',
      avatarColor: AvatarColor.SKY,
    });
    expect(errors).toEqual([]);
    expect(dto.name).toBe('Seyha Yoeun');
    expect(dto.email).toBe('you@example.com');
  });

  it.each([
    ['name', { name: '   ' }],
    ['name', { name: 'x'.repeat(41) }],
    ['email', { name: 'ok', email: 'x'.repeat(255) }],
    ['avatarColor', { name: 'ok', avatarColor: 'black' }],
  ])('rejects an invalid %s', async (field, body) => {
    const { errors } = await validateDto(CreateProfileDto, body);
    expect(errors).toContain(field);
  });
});

describe('UpdateProfileDto', () => {
  it('accepts a single field', async () => {
    const { errors } = await validateDto(UpdateProfileDto, {
      avatarColor: AvatarColor.VIOLET,
    });
    expect(errors).toEqual([]);
  });

  it('accepts an empty email to clear it', async () => {
    const { errors } = await validateDto(UpdateProfileDto, { email: '' });
    expect(errors).toEqual([]);
  });

  it('rejects an empty name', async () => {
    const { errors } = await validateDto(UpdateProfileDto, { name: '' });
    expect(errors).toEqual(['name']);
  });

  it('rejects unknown properties such as userId', async () => {
    const { errors } = await validateDto(UpdateProfileDto, { userId: 'x' });
    expect(errors).toEqual(['userId']);
  });
});

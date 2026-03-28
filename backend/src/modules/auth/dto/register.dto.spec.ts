import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts formatted Brazilian phone numbers', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Joao Silva',
      email: 'joao@test.com',
      password: 'Senha123',
      phone: '(21) 99999-9999',
      role: 'BUYER',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.phone).toBe('21999999999');
  });

  it('rejects phones with fewer than 10 digits after sanitizing', async () => {
    const dto = plainToInstance(RegisterDto, {
      name: 'Joao Silva',
      email: 'joao@test.com',
      password: 'Senha123',
      phone: '(21) 9999-999',
      role: 'BUYER',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('matches');
  });
});

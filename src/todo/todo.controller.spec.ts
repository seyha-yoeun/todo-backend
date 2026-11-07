import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TodoStatus } from './entities/todo.entity';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';

describe('TodoController', () => {
  const user = { id: 'u1' } as User;
  const todo = {
    id: 't1',
    title: 'Buy groceries',
    status: TodoStatus.TODO,
    starred: false,
    createdAt: 0,
    updatedAt: 0,
  };
  let controller: TodoController;
  let todoService: Record<
    | 'create'
    | 'findAll'
    | 'stats'
    | 'findOne'
    | 'update'
    | 'remove'
    | 'bulkUpdateStatus'
    | 'bulkRemove',
    jest.Mock
  >;

  beforeEach(async () => {
    todoService = {
      create: jest.fn().mockResolvedValue(todo),
      findAll: jest.fn().mockResolvedValue([todo]),
      stats: jest.fn().mockResolvedValue({ total: 1 }),
      findOne: jest.fn().mockResolvedValue(todo),
      update: jest.fn().mockResolvedValue(todo),
      remove: jest.fn().mockResolvedValue(undefined),
      bulkUpdateStatus: jest.fn().mockResolvedValue([todo]),
      bulkRemove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [{ provide: TodoService, useValue: todoService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TodoController);
  });

  it('create', async () => {
    const dto = { title: 'Buy groceries' };
    await expect(controller.create(user, dto)).resolves.toBe(todo);
    expect(todoService.create).toHaveBeenCalledWith(user, dto);
  });

  it('findAll', async () => {
    const query = { status: TodoStatus.DONE, q: 'milk' };
    await expect(controller.findAll(user, query)).resolves.toEqual([todo]);
    expect(todoService.findAll).toHaveBeenCalledWith(user, query);
  });

  it('stats', async () => {
    await expect(controller.stats(user)).resolves.toEqual({ total: 1 });
    expect(todoService.stats).toHaveBeenCalledWith(user);
  });

  it('findOne', async () => {
    await expect(controller.findOne(user, 't1')).resolves.toBe(todo);
    expect(todoService.findOne).toHaveBeenCalledWith(user, 't1');
  });

  it('update', async () => {
    const dto = { starred: true };
    await expect(controller.update(user, 't1', dto)).resolves.toBe(todo);
    expect(todoService.update).toHaveBeenCalledWith(user, 't1', dto);
  });

  it('remove', async () => {
    await expect(controller.remove(user, 't1')).resolves.toBeUndefined();
    expect(todoService.remove).toHaveBeenCalledWith(user, 't1');
  });

  it('bulkUpdateStatus unpacks ids and status from the body', async () => {
    await controller.bulkUpdateStatus(user, {
      ids: ['t1', 't2'],
      status: TodoStatus.DONE,
    });
    expect(todoService.bulkUpdateStatus).toHaveBeenCalledWith(
      user,
      ['t1', 't2'],
      TodoStatus.DONE,
    );
  });

  it('bulkRemove unpacks ids from the body', async () => {
    await controller.bulkRemove(user, { ids: ['t1', 't2'] });
    expect(todoService.bulkRemove).toHaveBeenCalledWith(user, ['t1', 't2']);
  });

  it('is protected for users and admins at the controller level', () => {
    expect(Reflect.getMetadata('__guards__', TodoController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, TodoController)).toEqual([
      Role.USER,
      Role.ADMIN,
    ]);
  });
});

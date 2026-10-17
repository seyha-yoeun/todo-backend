import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Todo, TodoStatus } from './entities/todo.entity';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let service: TodoService;

  const todoRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: todoRepositoryMock },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a todo and returns the response shape', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const saved: Todo = {
      id: 'b3a9f5c0-1234-4a5b-8c9d-0123456789ab',
      title: 'Buy groceries',
      status: TodoStatus.TODO,
      starred: false,
      createdAt,
      updatedAt: createdAt,
    };
    todoRepositoryMock.create.mockReturnValue(saved);
    todoRepositoryMock.save.mockResolvedValue(saved);

    const result = await service.create({ title: 'Buy groceries' });

    expect(result).toEqual({
      id: saved.id,
      title: 'Buy groceries',
      status: TodoStatus.TODO,
      starred: false,
      createdAt: createdAt.getTime(),
      updatedAt: createdAt.getTime(),
    });
  });

  it('throws NotFoundException when updating a missing todo', async () => {
    todoRepositoryMock.findOneBy.mockResolvedValue(null);

    await expect(
      service.update('b3a9f5c0-1234-4a5b-8c9d-0123456789ab', { starred: true }),
    ).rejects.toThrow('was not found');
  });

  it('throws NotFoundException listing missing ids on bulk delete', async () => {
    todoRepositoryMock.findBy.mockResolvedValue([]);

    await expect(service.bulkRemove(['missing-id'])).rejects.toThrow(
      'not found',
    );
  });
});

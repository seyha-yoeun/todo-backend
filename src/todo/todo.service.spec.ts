import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Todo, TodoStatus } from './entities/todo.entity';
import { TodoService } from './todo.service';

const user = { id: 'u1' } as User;
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-01-02T00:00:00.000Z');

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return Object.assign(new Todo(), {
    id: 't1',
    userId: user.id,
    title: 'Buy groceries',
    status: TodoStatus.TODO,
    starred: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  });
}

/** Chainable query-builder mock: every builder method returns itself. */
function makeQueryBuilder(result: {
  getMany?: Todo[];
  getRawOne?: Record<string, string> | undefined;
} = {}) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'select',
    'addSelect',
    'setParameters',
    'update',
    'set',
    'delete',
    'from',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(result.getMany ?? []);
  qb.getRawOne = jest.fn().mockResolvedValue(result.getRawOne);
  qb.execute = jest.fn().mockResolvedValue({ affected: 0 });
  return qb;
}

describe('TodoService', () => {
  let service: TodoService;
  let todoRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    merge: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    todoRepository = {
      create: jest.fn((data: Partial<Todo>) => Object.assign(new Todo(), data)),
      save: jest.fn((todo: Todo) =>
        Promise.resolve(
          Object.assign(todo, {
            id: todo.id ?? 't1',
            status: todo.status ?? TodoStatus.TODO,
            starred: todo.starred ?? false,
            createdAt: todo.createdAt ?? CREATED_AT,
            updatedAt: UPDATED_AT,
          }),
        ),
      ),
      findOneBy: jest.fn().mockResolvedValue(null),
      merge: jest.fn((target: Todo, source: Partial<Todo>) =>
        Object.assign(target, source),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: todoRepository },
      ],
    }).compile();

    service = module.get(TodoService);
  });

  describe('create', () => {
    it('creates a todo owned by the user and returns epoch timestamps', async () => {
      const result = await service.create(user, { title: 'Buy groceries' });

      expect(todoRepository.create).toHaveBeenCalledWith({
        title: 'Buy groceries',
        userId: 'u1',
      });
      expect(result).toEqual({
        id: 't1',
        title: 'Buy groceries',
        status: TodoStatus.TODO,
        starred: false,
        createdAt: CREATED_AT.getTime(),
        updatedAt: UPDATED_AT.getTime(),
      });
      expect(result).not.toHaveProperty('userId');
    });

    it('cannot be tricked into assigning another owner', async () => {
      await service.create(user, {
        title: 'x',
        userId: 'someone-else',
      } as never);

      expect(todoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });

  describe('findAll', () => {
    it('scopes to the user and orders starred first, then newest', async () => {
      const qb = makeQueryBuilder({ getMany: [makeTodo()] });
      todoRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(user, {});

      expect(qb.where).toHaveBeenCalledWith('todo.userId = :userId', {
        userId: 'u1',
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('todo.starred', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('todo.createdAt', 'DESC');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
    });

    it('filters by status and a trimmed, case-insensitive search', async () => {
      const qb = makeQueryBuilder();
      todoRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(user, { status: TodoStatus.DONE, q: '  milk ' });

      expect(qb.andWhere).toHaveBeenCalledWith('todo.status = :status', {
        status: TodoStatus.DONE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('todo.title ILIKE :search', {
        search: '%milk%',
      });
    });

    it('ignores a blank search', async () => {
      const qb = makeQueryBuilder();
      todoRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(user, { q: '   ' });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a todo owned by the user', async () => {
      todoRepository.findOneBy.mockResolvedValue(makeTodo());

      await expect(service.findOne(user, 't1')).resolves.toMatchObject({
        id: 't1',
      });
      expect(todoRepository.findOneBy).toHaveBeenCalledWith({
        id: 't1',
        userId: 'u1',
      });
    });

    it('throws 404 for a missing or foreign todo', async () => {
      await expect(service.findOne(user, 't1')).rejects.toThrow(
        new NotFoundException('Todo t1 was not found.'),
      );
    });
  });

  describe('update', () => {
    it('merges the changes and saves', async () => {
      const todo = makeTodo();
      todoRepository.findOneBy.mockResolvedValue(todo);

      const result = await service.update(user, 't1', {
        starred: true,
        status: TodoStatus.IN_PROGRESS,
      });

      expect(todoRepository.merge).toHaveBeenCalledWith(todo, {
        starred: true,
        status: TodoStatus.IN_PROGRESS,
      });
      expect(todoRepository.save).toHaveBeenCalledWith(todo);
      expect(result).toMatchObject({
        starred: true,
        status: TodoStatus.IN_PROGRESS,
      });
    });

    it('throws 404 for a missing or foreign todo', async () => {
      await expect(
        service.update(user, 't1', { starred: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(todoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes a todo owned by the user', async () => {
      const todo = makeTodo();
      todoRepository.findOneBy.mockResolvedValue(todo);

      await service.remove(user, 't1');

      expect(todoRepository.remove).toHaveBeenCalledWith(todo);
    });

    it('throws 404 for a missing or foreign todo', async () => {
      await expect(service.remove(user, 't1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(todoRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('updates the user todos and returns them in request order', async () => {
      const ids = ['t2', 't1'];
      const existsQb = makeQueryBuilder({
        getMany: [makeTodo({ id: 't1' }), makeTodo({ id: 't2' })],
      });
      const updateQb = makeQueryBuilder();
      const fetchQb = makeQueryBuilder({
        getMany: [
          makeTodo({ id: 't1', status: TodoStatus.DONE }),
          makeTodo({ id: 't2', status: TodoStatus.DONE }),
        ],
      });
      todoRepository.createQueryBuilder
        .mockReturnValueOnce(existsQb)
        .mockReturnValueOnce(updateQb)
        .mockReturnValueOnce(fetchQb);

      const result = await service.bulkUpdateStatus(user, ids, TodoStatus.DONE);

      expect(updateQb.update).toHaveBeenCalledWith(Todo);
      expect(updateQb.set).toHaveBeenCalledWith({ status: TodoStatus.DONE });
      expect(updateQb.where).toHaveBeenCalledWith(
        'id IN (:...ids) AND user_id = :userId',
        { ids, userId: 'u1' },
      );
      expect(updateQb.execute).toHaveBeenCalled();
      expect(result.map((t) => t.id)).toEqual(['t2', 't1']);
      expect(result.every((t) => t.status === TodoStatus.DONE)).toBe(true);
    });

    it('throws 404 listing ids that are missing or not owned, without updating', async () => {
      const existsQb = makeQueryBuilder({ getMany: [makeTodo({ id: 't1' })] });
      todoRepository.createQueryBuilder.mockReturnValueOnce(existsQb);

      await expect(
        service.bulkUpdateStatus(user, ['t1', 't2', 't3'], TodoStatus.DONE),
      ).rejects.toThrow(new NotFoundException('Todos not found: t2, t3'));
      expect(todoRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkRemove', () => {
    it('deletes only the user todos', async () => {
      const ids = ['t1', 't2'];
      const existsQb = makeQueryBuilder({
        getMany: [makeTodo({ id: 't1' }), makeTodo({ id: 't2' })],
      });
      const deleteQb = makeQueryBuilder();
      todoRepository.createQueryBuilder
        .mockReturnValueOnce(existsQb)
        .mockReturnValueOnce(deleteQb);

      await service.bulkRemove(user, ids);

      expect(deleteQb.delete).toHaveBeenCalled();
      expect(deleteQb.from).toHaveBeenCalledWith(Todo);
      expect(deleteQb.where).toHaveBeenCalledWith(
        'id IN (:...ids) AND user_id = :userId',
        { ids, userId: 'u1' },
      );
      expect(deleteQb.execute).toHaveBeenCalled();
    });

    it('throws 404 with a singular message for one missing id', async () => {
      todoRepository.createQueryBuilder.mockReturnValueOnce(
        makeQueryBuilder({ getMany: [] }),
      );

      await expect(service.bulkRemove(user, ['missing'])).rejects.toThrow(
        new NotFoundException('Todo not found: missing'),
      );
      expect(todoRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  describe('stats', () => {
    it('converts the raw counts to numbers', async () => {
      const qb = makeQueryBuilder({
        getRawOne: {
          total: '6',
          todo: '3',
          inProgress: '2',
          done: '1',
          starred: '4',
        },
      });
      todoRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.stats(user)).resolves.toEqual({
        total: 6,
        todo: 3,
        inProgress: 2,
        done: 1,
        starred: 4,
      });
      expect(qb.setParameters).toHaveBeenCalledWith({
        userId: 'u1',
        todoStatus: TodoStatus.TODO,
        inProgressStatus: TodoStatus.IN_PROGRESS,
        doneStatus: TodoStatus.DONE,
      });
    });

    it('returns zeros when the query yields no row', async () => {
      todoRepository.createQueryBuilder.mockReturnValue(makeQueryBuilder());

      await expect(service.stats(user)).resolves.toEqual({
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        starred: 0,
      });
    });
  });
});

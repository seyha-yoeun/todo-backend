import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto';
import { QueryTodosDto } from './dto/query-todos.dto';
import { TodoStatsResponseDto, TodoResponseDto } from './dto/todo-response.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo, TodoStatus } from './entities/todo.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async create(user: User, createTodoDto: CreateTodoDto): Promise<TodoResponseDto> {
    const todo = this.todoRepository.create({
      ...createTodoDto,
      userId: user.id,
    });
    const saved = await this.todoRepository.save(todo);
    return this.toResponse(saved);
  }

  async findAll(user: User, query: QueryTodosDto): Promise<TodoResponseDto[]> {
    const qb = this.todoRepository.createQueryBuilder('todo');
    qb.where('todo.userId = :userId', { userId: user.id });

    if (query.status !== undefined) {
      qb.andWhere('todo.status = :status', { status: query.status });
    }

    const search = query.q?.trim();
    if (search !== undefined && search !== '') {
      qb.andWhere('todo.title ILIKE :search', { search: `%${search}%` });
    }

    // Starred first, then newest first — same ordering as the frontend.
    qb.orderBy('todo.starred', 'DESC').addOrderBy('todo.createdAt', 'DESC');

    const todos = await qb.getMany();
    return todos.map((todo) => this.toResponse(todo));
  }

  async findOne(user: User, id: string): Promise<TodoResponseDto> {
    const todo = await this.todoRepository.findOneBy({ id, userId: user.id });
    if (todo === null) {
      throw new NotFoundException(`Todo ${id} was not found.`);
    }
    return this.toResponse(todo);
  }

  async update(
    user: User,
    id: string,
    updateTodoDto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    const todo = await this.todoRepository.findOneBy({ id, userId: user.id });
    if (todo === null) {
      throw new NotFoundException(`Todo ${id} was not found.`);
    }

    this.todoRepository.merge(todo, updateTodoDto);
    const saved = await this.todoRepository.save(todo);
    return this.toResponse(saved);
  }

  async remove(user: User, id: string): Promise<void> {
    const todo = await this.todoRepository.findOneBy({ id, userId: user.id });
    if (todo === null) {
      throw new NotFoundException(`Todo ${id} was not found.`);
    }
    await this.todoRepository.remove(todo);
  }

  async bulkUpdateStatus(
    user: User,
    ids: string[],
    status: TodoStatus,
  ): Promise<TodoResponseDto[]> {
    await this.assertAllExist(user, ids);
    await this.todoRepository
      .createQueryBuilder()
      .update(Todo)
      .set({ status })
      .where('id IN (:...ids) AND user_id = :userId', { ids, userId: user.id })
      .execute();

    const updated = await this.todoRepository
      .createQueryBuilder('todo')
      .where('todo.id IN (:...ids) AND todo.userId = :userId', { ids, userId: user.id })
      .getMany();

    const order = new Map(ids.map((id, index) => [id, index]));
    updated.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return updated.map((todo) => this.toResponse(todo));
  }

  async bulkRemove(user: User, ids: string[]): Promise<void> {
    await this.assertAllExist(user, ids);
    await this.todoRepository
      .createQueryBuilder()
      .delete()
      .from(Todo)
      .where('id IN (:...ids) AND user_id = :userId', { ids, userId: user.id })
      .execute();
  }

  async stats(user: User): Promise<TodoStatsResponseDto> {
    const raw = await this.todoRepository
      .createQueryBuilder('todo')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE todo.status = :todoStatus)`, 'todo')
      .addSelect(
        `COUNT(*) FILTER (WHERE todo.status = :inProgressStatus)`,
        'inProgress',
      )
      .addSelect(`COUNT(*) FILTER (WHERE todo.status = :doneStatus)`, 'done')
      .addSelect(`COUNT(*) FILTER (WHERE todo.starred = true)`, 'starred')
      .where('todo.userId = :userId', { userId: user.id })
      .setParameters({
        userId: user.id,
        todoStatus: TodoStatus.TODO,
        inProgressStatus: TodoStatus.IN_PROGRESS,
        doneStatus: TodoStatus.DONE,
      })
      .getRawOne<Record<string, string>>();

    return {
      total: Number(raw?.total ?? 0),
      todo: Number(raw?.todo ?? 0),
      inProgress: Number(raw?.inProgress ?? 0),
      done: Number(raw?.done ?? 0),
      starred: Number(raw?.starred ?? 0),
    };
  }

  /** Throws 404 listing every id that does not exist or belong to the user. */
  private async assertAllExist(user: User, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const existing = await this.todoRepository
      .createQueryBuilder('todo')
      .where('todo.id IN (:...ids) AND todo.userId = :userId', { ids, userId: user.id })
      .getMany();

    if (existing.length === ids.length) return;

    const existingIds = new Set(existing.map((todo) => todo.id));
    const missing = ids.filter((id) => !existingIds.has(id));
    throw new NotFoundException(
      `Todo${missing.length > 1 ? 's' : ''} not found: ${missing.join(', ')}`,
    );
  }

  private toResponse(todo: Todo): TodoResponseDto {
    return {
      id: todo.id,
      title: todo.title,
      status: todo.status,
      starred: todo.starred,
      createdAt: todo.createdAt.getTime(),
      updatedAt: todo.updatedAt.getTime(),
    };
  }
}

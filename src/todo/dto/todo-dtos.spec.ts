import { validateDto } from '../../test-utils/validate-dto';
import { TodoStatus } from '../entities/todo.entity';
import { BulkDeleteDto } from './bulk-delete.dto';
import { BulkUpdateStatusDto } from './bulk-update-status.dto';
import { CreateTodoDto } from './create-todo.dto';
import { QueryTodosDto } from './query-todos.dto';
import { UpdateTodoDto } from './update-todo.dto';

const UUID_A = '6f1c1a8e-2b7d-4c39-9a51-0f0e5b0c1a11';
const UUID_B = '9a2d3b4c-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('CreateTodoDto', () => {
  it('trims the title', async () => {
    const { dto, errors } = await validateDto(CreateTodoDto, {
      title: '  Buy milk  ',
    });
    expect(errors).toEqual([]);
    expect(dto.title).toBe('Buy milk');
  });

  it.each([
    ['title', { title: '   ' }],
    ['title', { title: 'x'.repeat(121) }],
    ['title', {}],
    ['status', { title: 'ok', status: 'Archived' }],
  ])('rejects an invalid %s', async (field, body) => {
    const { errors } = await validateDto(CreateTodoDto, body);
    expect(errors).toContain(field);
  });

  it('rejects unknown properties such as userId', async () => {
    const { errors } = await validateDto(CreateTodoDto, {
      title: 'ok',
      userId: UUID_A,
    });
    expect(errors).toEqual(['userId']);
  });
});

describe('UpdateTodoDto', () => {
  it('accepts an empty body (all fields optional)', async () => {
    const { errors } = await validateDto(UpdateTodoDto, {});
    expect(errors).toEqual([]);
  });

  it('accepts starred and status', async () => {
    const { errors } = await validateDto(UpdateTodoDto, {
      starred: true,
      status: TodoStatus.DONE,
    });
    expect(errors).toEqual([]);
  });

  it('rejects a non-boolean starred', async () => {
    const { errors } = await validateDto(UpdateTodoDto, { starred: 'yes' });
    expect(errors).toEqual(['starred']);
  });
});

describe('QueryTodosDto', () => {
  it("treats status 'All' as no filter", async () => {
    const { dto, errors } = await validateDto(QueryTodosDto, { status: 'All' });
    expect(errors).toEqual([]);
    expect(dto.status).toBeUndefined();
  });

  it('accepts a known status and a search term', async () => {
    const { errors } = await validateDto(QueryTodosDto, {
      status: TodoStatus.IN_PROGRESS,
      q: 'milk',
    });
    expect(errors).toEqual([]);
  });

  it('rejects an unknown status and an overlong search', async () => {
    const { errors } = await validateDto(QueryTodosDto, {
      status: 'Later',
      q: 'x'.repeat(121),
    });
    expect(errors.sort()).toEqual(['q', 'status']);
  });
});

describe.each([
  ['BulkDeleteDto', BulkDeleteDto, {}],
  ['BulkUpdateStatusDto', BulkUpdateStatusDto, { status: TodoStatus.DONE }],
] as const)('%s', (_name, cls, extra) => {
  it('accepts a list of UUIDs', async () => {
    const { errors } = await validateDto(cls, { ids: [UUID_A, UUID_B], ...extra });
    expect(errors).toEqual([]);
  });

  it.each([
    ['an empty list', []],
    ['a non-UUID', [UUID_A, 'nope']],
    ['a non-array', UUID_A],
  ])('rejects %s', async (_label, ids) => {
    const { errors } = await validateDto(cls, { ids, ...extra });
    expect(errors).toEqual(['ids']);
  });
});

describe('BulkUpdateStatusDto status', () => {
  it('rejects an unknown status', async () => {
    const { errors } = await validateDto(BulkUpdateStatusDto, {
      ids: [UUID_A],
      status: 'Archived',
    });
    expect(errors).toEqual(['status']);
  });
});

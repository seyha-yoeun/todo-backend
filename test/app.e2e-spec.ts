import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

const BASE = '/api/v1';

interface TodoBody {
  id: string;
  title: string;
  status: string;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

describe('Todo API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "todos"');
  });

  afterAll(async () => {
    await app.close();
  });

  const createTodo = async (
    payload: Record<string, unknown>,
  ): Promise<TodoBody> => {
    const response = await request(app.getHttpServer())
      .post(`${BASE}/todo`)
      .send(payload)
      .expect(201);
    return response.body as TodoBody;
  };

  it('POST /todo creates a todo and trims the title', async () => {
    const todo = await createTodo({ title: '  Buy groceries  ' });

    expect(todo).toMatchObject({
      title: 'Buy groceries',
      status: 'To Do',
      starred: false,
    });
    expect(typeof todo.id).toBe('string');
    expect(typeof todo.createdAt).toBe('number');
  });

  it('POST /todo rejects invalid payloads', async () => {
    await request(app.getHttpServer())
      .post(`${BASE}/todo`)
      .send({ title: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`${BASE}/todo`)
      .send({ title: 'ok', status: 'Nope' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`${BASE}/todo`)
      .send({ title: 'ok', hax: true })
      .expect(400);
  });

  it('GET /todo filters by status and searches titles', async () => {
    await createTodo({ title: 'Write report', status: 'In Progress' });
    await createTodo({ title: 'Ship release', status: 'Done' });
    await createTodo({ title: 'Buy groceries' });

    const inProgress = await request(app.getHttpServer())
      .get(`${BASE}/todo?status=In%20Progress`)
      .expect(200);
    expect((inProgress.body as TodoBody[]).map((t) => t.title)).toEqual([
      'Write report',
    ]);

    const all = await request(app.getHttpServer())
      .get(`${BASE}/todo?status=All`)
      .expect(200);
    expect(all.body).toHaveLength(3);

    const search = await request(app.getHttpServer())
      .get(`${BASE}/todo?q=gRoC`)
      .expect(200);
    expect((search.body as TodoBody[]).map((t) => t.title)).toEqual([
      'Buy groceries',
    ]);
  });

  it('GET /todo sorts starred first, then newest first', async () => {
    const first = await createTodo({ title: 'First' });
    await createTodo({ title: 'Second' });
    await request(app.getHttpServer())
      .patch(`${BASE}/todo/${first.id}`)
      .send({ starred: true })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`${BASE}/todo`)
      .expect(200);
    expect((list.body as TodoBody[]).map((t) => t.title)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('GET /todo/stats returns the dashboard counts', async () => {
    await createTodo({ title: 'A' });
    await createTodo({ title: 'B', status: 'In Progress' });
    await createTodo({ title: 'C', status: 'Done' });
    await createTodo({ title: 'D', status: 'In Progress' });

    const response = await request(app.getHttpServer())
      .get(`${BASE}/todo/stats`)
      .expect(200);
    expect(response.body).toEqual({
      total: 4,
      todo: 1,
      inProgress: 2,
      done: 1,
      starred: 0,
    });
  });

  it('PATCH /todo/:id updates and DELETE /todo/:id removes', async () => {
    const todo = await createTodo({ title: 'Edit me' });

    const updated = await request(app.getHttpServer())
      .patch(`${BASE}/todo/${todo.id}`)
      .send({ title: 'Edited', status: 'Done', starred: true })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: 'Edited',
      status: 'Done',
      starred: true,
    });

    await request(app.getHttpServer())
      .delete(`${BASE}/todo/${todo.id}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`${BASE}/todo/${todo.id}`)
      .expect(404);
  });

  it('PATCH /todo/bulk/status and DELETE /todo/bulk work on many ids', async () => {
    const a = await createTodo({ title: 'A' });
    const b = await createTodo({ title: 'B' });
    const c = await createTodo({ title: 'C' });

    const bulk = await request(app.getHttpServer())
      .patch(`${BASE}/todo/bulk/status`)
      .send({ ids: [a.id, b.id], status: 'Done' })
      .expect(200);
    expect((bulk.body as TodoBody[]).map((t) => t.status)).toEqual([
      'Done',
      'Done',
    ]);

    await request(app.getHttpServer())
      .delete(`${BASE}/todo/bulk`)
      .send({ ids: [a.id, c.id] })
      .expect(204);

    const remaining = await request(app.getHttpServer())
      .get(`${BASE}/todo`)
      .expect(200);
    expect((remaining.body as TodoBody[]).map((t) => t.title)).toEqual(['B']);
  });

  it('returns 404 for unknown ids and 400 for malformed ones', async () => {
    await request(app.getHttpServer())
      .get(`${BASE}/todo/00000000-0000-4000-8000-000000000000`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`${BASE}/todo/not-a-uuid`)
      .expect(400);
    await request(app.getHttpServer())
      .patch(`${BASE}/todo/bulk/status`)
      .send({
        ids: ['00000000-0000-4000-8000-000000000000'],
        status: 'Done',
      })
      .expect(404);
  });
});

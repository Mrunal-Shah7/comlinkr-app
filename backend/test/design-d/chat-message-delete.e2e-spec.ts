/**
 * Plan 09 (TR-039): the sender deletes their own chat message. Soft delete: gone for the members, still in the
 * admin transcript, broadcast to open chats and to each member's list.
 */
import { randomUUID } from 'crypto';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AdminService } from '../../src/modules/admin/admin.service';
import { appBaseUrl, appWsBase, createTestApp } from '../helpers/app';
import {
  disconnectFixtures,
  getTestPrisma,
  resetDatabase,
  seedAdmin,
  seedUser,
} from '../helpers/fixtures';

function connectChat(wsBase: string, cookie: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`${wsBase}/chat`, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      transportOptions: {
        polling: { extraHeaders: { Cookie: cookie } },
        websocket: { extraHeaders: { Cookie: cookie } },
      },
      extraHeaders: { Cookie: cookie },
      forceNew: true,
      reconnection: false,
    });
    const t = setTimeout(() => {
      socket.close();
      reject(new Error('socket connect timeout'));
    }, 15000);
    socket.on('connect', () => {
      setTimeout(() => {
        clearTimeout(t);
        if (!socket.connected) reject(new Error('auth disconnect'));
        else resolve(socket);
      }, 600);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no ${event}`)), 15000);
    socket.once(event, (payload: T) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

describe('plan 09: deleting your own chat message', () => {
  let app: INestApplication;
  let base: string;
  let wsBase: string;

  beforeAll(async () => {
    app = await createTestApp();
    base = appBaseUrl(app);
    wsBase = appWsBase(app);
  });
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await app.close();
    await disconnectFixtures();
  });

  async function chatWithTwoMessages(aId: string, bId: string) {
    const prisma = getTestPrisma();
    const conversationId = randomUUID();
    const first = new Date(Date.now() - 60_000);
    const second = new Date(Date.now() - 30_000);
    await prisma.conversation.create({
      data: {
        id: conversationId,
        type: 'DIRECT',
        createdById: aId,
        lastMessageAt: second,
        members: {
          create: [
            { userId: aId, role: 'MEMBER', status: 'ACCEPTED' },
            { userId: bId, role: 'MEMBER', status: 'ACCEPTED' },
          ],
        },
      },
    });
    const older = await prisma.message.create({
      data: {
        conversationId,
        senderId: bId,
        content: 'older',
        createdAt: first,
      },
    });
    const newer = await prisma.message.create({
      data: {
        conversationId,
        senderId: aId,
        content: 'newer from a',
        createdAt: second,
      },
    });
    return { conversationId, older, newer };
  }

  it('the sender deletes: gone from the thread, the preview and unread; lastMessageAt moves back', async () => {
    const a = await seedUser({ label: 'da' });
    const b = await seedUser({ label: 'db' });
    const { conversationId, older, newer } = await chatWithTwoMessages(
      a.id,
      b.id,
    );

    const unreadBefore = await request(base)
      .get('/conversations/unread-count')
      .set('Cookie', b.cookie)
      .expect(200);

    await request(base)
      .delete(`/conversations/${conversationId}/messages/${newer.id}`)
      .set('Cookie', a.cookie)
      .expect(200);

    const thread = await request(base)
      .get(`/conversations/${conversationId}/messages`)
      .set('Cookie', b.cookie)
      .expect(200);
    const ids = (thread.body.data ?? thread.body).map(
      (m: { id: string }) => m.id,
    );
    expect(ids).toEqual([older.id]);

    const conv = await request(base)
      .get(`/conversations/${conversationId}`)
      .set('Cookie', b.cookie)
      .expect(200);
    const body = conv.body.data ?? conv.body;
    expect(body.lastMessage?.id).toBe(older.id);

    const unreadAfter = await request(base)
      .get('/conversations/unread-count')
      .set('Cookie', b.cookie)
      .expect(200);
    const count = (r: request.Response) => (r.body.data ?? r.body).unreadCount;
    expect(count(unreadAfter)).toBe(count(unreadBefore) - 1);

    const prisma = getTestPrisma();
    const row = await prisma.message.findUnique({ where: { id: newer.id } });
    expect(row?.deletedAt).toBeInstanceOf(Date); // kept for moderation
    const c = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    expect(c?.lastMessageAt?.getTime()).toBe(older.createdAt.getTime());

    // A second delete, and a report on the deleted message, find nothing.
    await request(base)
      .delete(`/conversations/${conversationId}/messages/${newer.id}`)
      .set('Cookie', a.cookie)
      .expect(404);
    await request(base)
      .post(`/conversations/messages/${newer.id}/report`)
      .set('Cookie', b.cookie)
      .send({ reason: 'spam' })
      .expect(404);
  });

  it('refuses the other member, an outsider, and a message from another conversation', async () => {
    const a = await seedUser({ label: 'ra' });
    const b = await seedUser({ label: 'rb' });
    const c = await seedUser({ label: 'rc' });
    const one = await chatWithTwoMessages(a.id, b.id);
    const two = await chatWithTwoMessages(a.id, c.id);

    await request(base)
      .delete(`/conversations/${one.conversationId}/messages/${one.newer.id}`)
      .set('Cookie', b.cookie)
      .expect(403);
    await request(base)
      .delete(`/conversations/${one.conversationId}/messages/${one.newer.id}`)
      .set('Cookie', c.cookie)
      .expect(403);
    // a's own message, but named under the wrong conversation
    await request(base)
      .delete(`/conversations/${one.conversationId}/messages/${two.newer.id}`)
      .set('Cookie', a.cookie)
      .expect(404);

    const prisma = getTestPrisma();
    const rows = await prisma.message.findMany({
      where: { deletedAt: { not: null } },
    });
    expect(rows).toHaveLength(0);
  });

  it('the admin transcript still shows it, marked deleted', async () => {
    const adm = await seedAdmin();
    const a = await seedUser({ label: 'ta' });
    const b = await seedUser({ label: 'tb' });
    const { conversationId, newer } = await chatWithTwoMessages(a.id, b.id);
    await request(base)
      .delete(`/conversations/${conversationId}/messages/${newer.id}`)
      .set('Cookie', a.cookie)
      .expect(200);

    const msgs = await app
      .get(AdminService)
      .getAdminChatMessages(adm.id, conversationId, undefined, 20);
    const row = msgs.data.find((m: { id: string }) => m.id === newer.id);
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('tells the open chat and each member list', async () => {
    const a = await seedUser({ label: 'sa' });
    const b = await seedUser({ label: 'sb' });
    const { conversationId, newer } = await chatWithTwoMessages(a.id, b.id);
    const socketB = await connectChat(wsBase, b.cookie);
    socketB.emit('join_conversation', { conversationId });
    await new Promise((r) => setTimeout(r, 400));
    const removed = once<{ conversationId: string; messageId: string }>(
      socketB,
      'message_removed',
    );
    const updated = once<{
      conversationId: string;
      messagePreview: string;
      removed?: boolean;
    }>(socketB, 'conversation_updated');

    await request(base)
      .delete(`/conversations/${conversationId}/messages/${newer.id}`)
      .set('Cookie', a.cookie)
      .expect(200);

    expect(await removed).toEqual({ conversationId, messageId: newer.id });
    expect(await updated).toMatchObject({
      conversationId,
      messagePreview: 'older',
      removed: true,
    });
    socketB.close();
  });
});

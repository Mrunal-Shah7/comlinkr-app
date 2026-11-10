/**
 * Unit tests for the 2026-11-10 walkthrough fixes (TR-028): a refused Resend email is reported instead of
 * passing silently, years-old Google News items are dropped, and
 * authors can delete their own community questions and answers, and saved news articles show in Saved.
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MailService } from '../../src/modules/auth/mail.service';
import { FeedService } from '../../src/modules/feed/feed.service';
import { CommunityService } from '../../src/modules/community/community.service';
import { SavesService } from '../../src/modules/saves/saves.service';
import { ChallengesService } from '../../src/modules/challenges/challenges.service';
import { EventsService } from '../../src/modules/events/events.service';
import {
  isStaleNewsItem,
  NEWS_MAX_AGE_DAYS,
} from '../../src/modules/news/google-news-rss.util';

const send = jest.fn();

jest.mock('../../src/config/mail.config', () => ({
  resolveMailSettings: () => ({
    apiKey: 're_test',
    fromEmail: 'noreply@comlinkr.test',
  }),
  createResendClient: () => ({ emails: { send } }),
}));

describe('MailService.sendOtpEmail with Resend v6 ({ data, error } instead of throwing)', () => {
  const make = (nodeEnv: string) =>
    new MailService({
      get: (key: string) => (key === 'NODE_ENV' ? nodeEnv : undefined),
    } as any);
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    send.mockReset();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('logs an accepted email with its id and reports no failure', async () => {
    send.mockResolvedValue({ data: { id: 'email_1' }, error: null });
    await make('production').sendOtpEmail(
      'a@comlinkr.test',
      '123456',
      'REGISTRATION',
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join(' ')).toContain('email_1');
  });

  it('reports a refused email instead of passing silently', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'domain not verified' },
    });
    await make('production').sendOtpEmail(
      'a@comlinkr.test',
      '123456',
      'PASSWORD_RESET',
    );
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain('NOT sent');
    // Production never logs the code.
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain('123456');
  });

  it('logs the code in development when the email was refused', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'slow down' },
    });
    await make('development').sendOtpEmail(
      'a@comlinkr.test',
      '654321',
      'REGISTRATION',
    );
    expect(logSpy.mock.calls.flat().join(' ')).toContain('654321');
  });

  it('still reports a thrown network error', async () => {
    send.mockRejectedValue(new Error('ECONNRESET'));
    await make('production').sendOtpEmail(
      'a@comlinkr.test',
      '123456',
      'REGISTRATION',
    );
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('isStaleNewsItem', () => {
  const now = Date.UTC(2026, 10, 10);
  const daysAgo = (d: number) =>
    new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

  it('keeps recent items', () => {
    expect(isStaleNewsItem(daysAgo(4), now)).toBe(false);
    expect(isStaleNewsItem(daysAgo(NEWS_MAX_AGE_DAYS - 1), now)).toBe(false);
  });

  it('drops items older than the limit, such as a 2019 story', () => {
    expect(isStaleNewsItem(daysAgo(NEWS_MAX_AGE_DAYS + 1), now)).toBe(true);
    expect(isStaleNewsItem('2019-02-03T12:00:00.000Z', now)).toBe(true);
  });

  it('keeps items whose date cannot be read', () => {
    expect(isStaleNewsItem('not a date', now)).toBe(false);
  });
});

describe('FeedService.createFeedPost is all or nothing', () => {
  const file = (over: Partial<Express.Multer.File> = {}) =>
    ({
      size: 1000,
      mimetype: 'image/jpeg',
      buffer: Buffer.from('x'),
      ...over,
    }) as Express.Multer.File;

  const make = (upload: jest.Mock) => {
    const prisma = {
      feedPost: {
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      feedPostMedia: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const storage = {
      uploadPublicFile: upload,
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new FeedService(prisma as any, storage as any, {} as any);
    return { service, prisma, storage };
  };
  const dto = { title: 't', content: 'c', category: 'COMMUNITY' } as any;

  it('writes nothing when a file has the wrong type', async () => {
    const { service, prisma } = make(jest.fn());
    await expect(
      service.createFeedPost('u1', dto, [file({ mimetype: 'image/gif' })]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.feedPost.create).not.toHaveBeenCalled();
  });

  it('removes the post and uploaded files when an upload drops', async () => {
    const upload = jest
      .fn()
      .mockResolvedValueOnce('https://res.cloudinary.com/x/image/upload/a.jpg')
      .mockRejectedValueOnce(new Error('socket hang up'));
    const { service, prisma, storage } = make(upload);
    await expect(
      service.createFeedPost('u1', dto, [file(), file()]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.feedPost.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    });
    expect(storage.deleteFile).toHaveBeenCalledWith(
      'https://res.cloudinary.com/x/image/upload/a.jpg',
    );
    expect(prisma.feedPostMedia.createMany).not.toHaveBeenCalled();
  });
});

describe('FeedService.deleteFeedPost removes the photos too', () => {
  it('deletes each media file after the rows', async () => {
    const tx = {
      feedLike: { deleteMany: jest.fn() },
      feedComment: { deleteMany: jest.fn() },
      feedSave: { deleteMany: jest.fn() },
      feedPostMedia: { deleteMany: jest.fn() },
      feedPost: { delete: jest.fn() },
    };
    const prisma = {
      feedPost: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          authorId: 'u1',
          media: [
            { imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' },
          ],
        }),
      },
      $transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx),
    };
    const storage = { deleteFile: jest.fn().mockResolvedValue(undefined) };
    const service = new FeedService(prisma as any, storage as any, {} as any);
    await service.deleteFeedPost('u1', 'p1');
    expect(tx.feedPost.delete).toHaveBeenCalled();
    expect(storage.deleteFile).toHaveBeenCalledWith(
      'https://res.cloudinary.com/x/image/upload/a.jpg',
    );
  });
});

describe('Listings pets filter (TR-024)', () => {
  it('accepts pets=true|false as booleans on the query', async () => {
    const { plainToInstance } = await import('class-transformer');
    const { validate } = await import('class-validator');
    const { HousingQueryDto } =
      await import('../../src/modules/housing/dto/housing-query.dto');
    const yes = plainToInstance(HousingQueryDto, { pets: 'true' });
    const no = plainToInstance(HousingQueryDto, { pets: 'false' });
    expect(yes.pets).toBe(true);
    expect(no.pets).toBe(false);
    expect(await validate(yes)).toHaveLength(0);
    const bad = plainToInstance(HousingQueryDto, { pets: 'maybe' });
    expect((await validate(bad)).length).toBeGreaterThan(0);
  });

  it('matches stated policies only, split on "no…" and "not allowed"', async () => {
    const { petPolicyWhere } =
      await import('../../src/modules/housing/housing.service');
    const allowed = JSON.stringify(petPolicyWhere(true));
    const refused = JSON.stringify(petPolicyWhere(false));
    for (const w of [allowed, refused]) {
      expect(w).toContain('"not":null');
      expect(w).toContain('"startsWith":"no"');
      expect(w).toContain('not allowed');
    }
    expect(allowed).toContain('"NOT":{"OR"');
    expect(refused).not.toContain('"NOT":{"OR"');
  });
});

describe('StorageService upload that drops twice', () => {
  it('retries once, then answers 503 with a plain message', async () => {
    const { v2: cloudinary } = await import('cloudinary');
    const { StorageService } =
      await import('../../src/modules/storage/storage.service');
    const uploadStream = jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation(((
        _opts: unknown,
        cb: (e: unknown, r?: unknown) => void,
      ) => ({
        // Cloudinary passes a plain object, not an Error, and no http_code for a dropped socket.
        end: () => cb({ message: 'socket hang up' }),
      })) as never);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const service = new StorageService({ get: () => '' } as any);
    jest.spyOn(service as any, 'validateMime').mockReturnValue('image/jpeg');
    const loggerSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
    await expect(
      service.uploadPublicFile(
        Buffer.from('x'),
        'image/jpeg',
        'f',
        'id',
        'jpg',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(uploadStream).toHaveBeenCalledTimes(2);
    expect(loggerSpy.mock.calls[0][0]).toContain('socket hang up');
    uploadStream.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('CommunityService: authors delete their own questions and answers', () => {
  const make = (prisma: any) =>
    new CommunityService(prisma, { getPublicBaseUrl: () => '' } as any);
  const prismaWith = (over: any) => ({
    communityQuestion: {
      findUnique: jest.fn(),
      delete: jest.fn().mockReturnValue('deleteQ'),
      updateMany: jest.fn().mockReturnValue('decrement'),
    },
    communityAnswer: {
      findUnique: jest.fn(),
      delete: jest.fn().mockReturnValue('deleteA'),
    },
    communityUpvote: { deleteMany: jest.fn().mockReturnValue('upvotes') },
    $transaction: jest.fn().mockResolvedValue([]),
    ...over,
  });

  it('deletes the question and the upvotes on it and its answers', async () => {
    const prisma = prismaWith({});
    prisma.communityQuestion.findUnique.mockResolvedValue({
      id: 'q1',
      authorId: 'me',
      answers: [{ id: 'a1' }, { id: 'a2' }],
    });
    await make(prisma).deleteQuestion('me', 'q1');
    expect(prisma.communityUpvote.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { targetType: 'QUESTION', targetId: 'q1' },
          { targetType: 'ANSWER', targetId: { in: ['a1', 'a2'] } },
        ],
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(['upvotes', 'deleteQ']);
  });

  it("refuses someone else's question and a missing one", async () => {
    const prisma = prismaWith({});
    prisma.communityQuestion.findUnique.mockResolvedValueOnce({
      id: 'q1',
      authorId: 'other',
      answers: [],
    });
    await expect(
      make(prisma).deleteQuestion('me', 'q1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.communityQuestion.findUnique.mockResolvedValueOnce(null);
    await expect(
      make(prisma).deleteQuestion('me', 'q1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes an answer and lowers the answer count', async () => {
    const prisma = prismaWith({});
    prisma.communityAnswer.findUnique.mockResolvedValue({
      id: 'a1',
      authorId: 'me',
      questionId: 'q1',
    });
    await make(prisma).deleteAnswer('me', 'q1', 'a1');
    expect(prisma.communityQuestion.updateMany).toHaveBeenCalledWith({
      where: { id: 'q1', answerCount: { gt: 0 } },
      data: { answerCount: { decrement: 1 } },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'upvotes',
      'deleteA',
      'decrement',
    ]);
  });

  it("refuses someone else's answer, and an answer under another question", async () => {
    const prisma = prismaWith({});
    prisma.communityAnswer.findUnique.mockResolvedValueOnce({
      id: 'a1',
      authorId: 'other',
      questionId: 'q1',
    });
    await expect(
      make(prisma).deleteAnswer('me', 'q1', 'a1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.communityAnswer.findUnique.mockResolvedValueOnce({
      id: 'a1',
      authorId: 'me',
      questionId: 'q2',
    });
    await expect(
      make(prisma).deleteAnswer('me', 'q1', 'a1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('SavesService: the News tab lists saved posts and saved articles together', () => {
  const at = (iso: string) => new Date(iso);
  const prisma: any = {
    feedSave: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { createdAt: at('2026-11-02T00:00:00Z'), feedPost: { id: 'p1' } },
        ]),
      count: jest.fn().mockResolvedValue(1),
    },
    newsArticleSave: {
      findMany: jest.fn().mockResolvedValue([
        {
          createdAt: at('2026-11-03T00:00:00Z'),
          articleId: 'art1',
          title: 'An article',
          url: 'https://example.test/a',
          imageUrl: null,
          source: 'Example',
          publishedAt: null,
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    eventSave: { count: jest.fn().mockResolvedValue(0) },
    housingSave: { count: jest.fn().mockResolvedValue(0) },
    restaurantSave: { count: jest.fn().mockResolvedValue(0) },
    communitySave: { count: jest.fn().mockResolvedValue(0) },
    storySave: { count: jest.fn().mockResolvedValue(0) },
    roommateSave: { count: jest.fn().mockResolvedValue(0) },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  const service = new SavesService(prisma, {} as any, {} as any);
  jest
    .spyOn(service as any, 'formatFeedPost')
    .mockImplementation((p: any) => ({ id: p.id, title: 'A post' }));

  it('merges both, newest first, with a total covering both', async () => {
    const res: any = await service.getAllSaves('me', { type: 'news' } as any);
    expect(res.data.map((r: any) => [r.savedItemType, r.id])).toEqual([
      ['article', 'art1'],
      ['news', 'p1'],
    ]);
    expect(res.meta.total).toBe(2);
  });

  it('counts both in the News total', async () => {
    const res: any = await service.getAllSaves('me', {});
    expect(res.counts.news).toBe(2);
  });
});

describe('ChallengesService.deleteChallenge: authors delete their own challenge', () => {
  const make = (found: any) => {
    const prisma: any = {
      challenge: {
        findUnique: jest.fn().mockResolvedValue(found),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    return { prisma, service: new ChallengesService(prisma, {} as any) };
  };

  it('deletes your own challenge', async () => {
    const { prisma, service } = make({ id: 'c1', authorId: 'me' });
    await service.deleteChallenge('me', 'c1');
    expect(prisma.challenge.delete).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });

  it("refuses someone else's challenge and a missing one", async () => {
    const other = make({ id: 'c1', authorId: 'other' });
    await expect(
      other.service.deleteChallenge('me', 'c1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(other.prisma.challenge.delete).not.toHaveBeenCalled();
    const missing = make(null);
    await expect(
      missing.service.deleteChallenge('me', 'c1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EventsService.deleteEvent removes the images from storage', () => {
  it('deletes each stored image after the event row goes', async () => {
    const tx: any = {
      event: {
        findUnique: jest.fn().mockResolvedValue({ conversationId: null }),
        delete: jest.fn(),
      },
      eventSave: { deleteMany: jest.fn() },
      eventAttendee: { deleteMany: jest.fn() },
    };
    const prisma: any = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'e1',
          authorId: 'me',
          eventImages: [
            { imageUrl: 'https://res.cloudinary.com/x/a.jpg' },
            { imageUrl: null },
          ],
        }),
      },
      $transaction: (fn: (t: any) => Promise<unknown>) => fn(tx),
    };
    const deleteFile = jest.fn().mockRejectedValueOnce(new Error('gone'));
    const service = new EventsService(prisma, {} as any, { deleteFile } as any);
    await expect(service.deleteEvent('me', 'e1')).resolves.toEqual({
      ok: true,
    });
    expect(tx.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(deleteFile).toHaveBeenCalledWith(
      'https://res.cloudinary.com/x/a.jpg',
    );
  });
});

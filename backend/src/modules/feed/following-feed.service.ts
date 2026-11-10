// src/modules/feed/following-feed.service.ts
//
// Plan 16 (TR-050): the Following tab. What the people you follow (accepted follows, active accounts) posted, newest
// first, from any city: published news posts, events not cancelled, stories not expired, and quests. The lists use
// the same filters as everywhere else; a private account's posts reach you only once it accepted your request,
// because only accepted follows count.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { resolveMediaUrl } from '../../common/utils/media-url';
import { createPaginationMeta } from '../../common/dto/pagination.dto';

export type FollowingItemType = 'NEWS' | 'EVENT' | 'STORY' | 'CHALLENGE';

export interface FollowingItem {
  id: string;
  type: FollowingItemType;
  title: string;
  createdAt: Date;
  image: string | null;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  metadata: Record<string, unknown>;
}

const MAX_LIMIT = 30;
/** Merge-paging reads `page * limit` rows of each kind; past this the list stops. */
const MAX_WINDOW = 300;

@Injectable()
export class FollowingFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const pageNo = Math.max(page, 1);
    const window = Math.min(pageNo * take, MAX_WINDOW);
    const empty = () => {
      const meta = createPaginationMeta(pageNo, take, 0);
      return { data: [] as FollowingItem[], meta, hasMore: false };
    };

    const follows = await this.prisma.userFollow.findMany({
      where: {
        followerId: userId,
        status: 'ACCEPTED',
        following: { isActive: true, deletedAt: null },
      },
      select: { followingId: true },
    });
    const ids = follows.map((f) => f.followingId);
    if (ids.length === 0) return empty();

    const now = new Date();
    const author = {
      select: { id: true, fullName: true, username: true, avatarUrl: true },
    } as const;
    const newsWhere = { authorId: { in: ids }, isPublished: true };
    const eventWhere = { authorId: { in: ids }, cancelledAt: null };
    const storyWhere = { authorId: { in: ids }, expiresAt: { gt: now } };
    const questWhere = { authorId: { in: ids } };
    const order = { createdAt: 'desc' as const };

    const [news, events, stories, quests, counts] = await Promise.all([
      this.prisma.feedPost.findMany({
        where: newsWhere,
        orderBy: order,
        take: window,
        select: {
          id: true,
          title: true,
          category: true,
          createdAt: true,
          likesCount: true,
          commentsCount: true,
          author,
          media: {
            select: { imageUrl: true },
            take: 1,
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.event.findMany({
        where: eventWhere,
        orderBy: order,
        take: window,
        select: {
          id: true,
          title: true,
          category: true,
          date: true,
          startTime: true,
          venue: true,
          city: true,
          createdAt: true,
          author,
          eventImages: {
            select: { imageUrl: true },
            take: 1,
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.story.findMany({
        where: storyWhere,
        orderBy: order,
        take: window,
        select: {
          id: true,
          title: true,
          mediaType: true,
          mediaUrl: true,
          expiresAt: true,
          createdAt: true,
          author,
        },
      }),
      this.prisma.challenge.findMany({
        where: questWhere,
        orderBy: order,
        take: window,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          endsAt: true,
          participantCount: true,
          createdAt: true,
          author,
        },
      }),
      Promise.all([
        this.prisma.feedPost.count({ where: newsWhere }),
        this.prisma.event.count({ where: eventWhere }),
        this.prisma.story.count({ where: storyWhere }),
        this.prisma.challenge.count({ where: questWhere }),
      ]),
    ]);

    const base = this.storage.getPublicBaseUrl();
    const url = (u: string | null | undefined) => resolveMediaUrl(u, base);
    const who = (a: {
      id: string;
      fullName: string;
      username: string;
      avatarUrl: string | null;
    }) => ({
      id: a.id,
      name: a.fullName,
      username: a.username,
      avatar: url(a.avatarUrl),
    });

    const all: FollowingItem[] = [
      ...news.map((p) => ({
        id: p.id,
        type: 'NEWS' as const,
        title: p.title,
        createdAt: p.createdAt,
        image: url(p.media[0]?.imageUrl),
        author: who(p.author),
        metadata: {
          category: p.category,
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
        },
      })),
      ...events.map((e) => ({
        id: e.id,
        type: 'EVENT' as const,
        title: e.title,
        createdAt: e.createdAt,
        image: url(e.eventImages[0]?.imageUrl),
        author: who(e.author),
        metadata: {
          category: e.category,
          date: e.date,
          startTime: e.startTime,
          venue: e.venue,
          city: e.city,
        },
      })),
      ...stories.map((s) => ({
        id: s.id,
        type: 'STORY' as const,
        title: s.title,
        createdAt: s.createdAt,
        image: s.mediaType === 'PHOTO' ? url(s.mediaUrl) : null,
        author: who(s.author),
        metadata: { mediaType: s.mediaType, expiresAt: s.expiresAt },
      })),
      ...quests.map((c) => ({
        id: c.id,
        type: 'CHALLENGE' as const,
        title: c.title,
        createdAt: c.createdAt,
        image: null,
        author: who(c.author),
        metadata: {
          questType: c.type,
          status: c.status,
          endsAt: c.endsAt,
          participantCount: c.participantCount,
        },
      })),
    ];
    all.sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );

    const total = Math.min(
      counts.reduce((n, c) => n + c, 0),
      MAX_WINDOW,
    );
    const data = all.slice((pageNo - 1) * take, pageNo * take);
    const meta = createPaginationMeta(pageNo, take, total);
    return { data, meta, hasMore: pageNo * take < total };
  }
}

// src/modules/users/follows.service.ts
//
// Plan 14 (TR-029): one person follows another; one-way, no approval. Following tells the person followed ("New
// follower", at most once a week per follower) and shows in the profile counts and in your own Follows lists. It does
// not change the feed. Blocking removes the follows both ways (SettingsService.blockUser).

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { resolveMediaUrl } from '../../common/utils/media-url';
import { createPaginationMeta } from '../../common/dto/pagination.dto';

const ACTIVE = { isActive: true, deletedAt: null } as const;
const NOTIFY_GAP_MS = 7 * 24 * 60 * 60 * 1000;
export const FOLLOW_REFERENCE = 'USER';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  private notFound(): never {
    throw new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'User not found',
    });
  }

  /** Follows, or unfollows if already following. */
  async toggle(
    userId: string,
    targetId: string,
  ): Promise<{ following: boolean; followersCount: number }> {
    if (userId === targetId) {
      throw new BadRequestException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, ...ACTIVE },
      select: { id: true },
    });
    if (!target) this.notFound();
    const blocked = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetId },
          { blockerId: targetId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (blocked) this.notFound();

    const removed = await this.prisma.userFollow.deleteMany({
      where: { followerId: userId, followingId: targetId },
    });
    let following = false;
    if (removed.count === 0) {
      try {
        await this.prisma.userFollow.create({
          data: { followerId: userId, followingId: targetId },
        });
      } catch (e) {
        // A double tap: the other request created it first.
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2002'
        )
          throw e;
      }
      following = true;
      await this.notifyFollowed(userId, targetId);
    }
    return { following, followersCount: await this.countFollowers(targetId) };
  }

  countFollowers(userId: string): Promise<number> {
    return this.prisma.userFollow.count({
      where: { followingId: userId, follower: ACTIVE },
    });
  }

  countFollowing(userId: string): Promise<number> {
    return this.prisma.userFollow.count({
      where: { followerId: userId, following: ACTIVE },
    });
  }

  /** Whether the viewer follows the user, and the user the viewer. */
  async relation(
    viewerId: string,
    userId: string,
  ): Promise<{ followedByMe: boolean; followingMe: boolean }> {
    if (!viewerId || viewerId === userId)
      return { followedByMe: false, followingMe: false };
    const rows = await this.prisma.userFollow.findMany({
      where: {
        OR: [
          { followerId: viewerId, followingId: userId },
          { followerId: userId, followingId: viewerId },
        ],
      },
      select: { followerId: true },
    });
    return {
      followedByMe: rows.some((r) => r.followerId === viewerId),
      followingMe: rows.some((r) => r.followerId === userId),
    };
  }

  /** Your followers, or the people you follow; newest first. */
  async list(
    userId: string,
    kind: 'followers' | 'following',
    page = 1,
    limit = 20,
  ) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    const where: Prisma.UserFollowWhereInput =
      kind === 'followers'
        ? { followingId: userId, follower: ACTIVE }
        : { followerId: userId, following: ACTIVE };
    const person = {
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        location: { select: { city: true } },
        _count: { select: { userBadges: true } },
      },
    } as const;
    const [rows, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include:
          kind === 'followers' ? { follower: person } : { following: person },
      }),
      this.prisma.userFollow.count({ where }),
    ]);
    const people = rows.map((r) =>
      kind === 'followers'
        ? (r as unknown as { follower: PersonRow }).follower
        : (r as unknown as { following: PersonRow }).following,
    );
    // For your followers: do you follow them back? (Everyone in "following" is followed by you.)
    let back = new Set<string>();
    if (kind === 'followers' && people.length) {
      const mine = await this.prisma.userFollow.findMany({
        where: {
          followerId: userId,
          followingId: { in: people.map((p) => p.id) },
        },
        select: { followingId: true },
      });
      back = new Set(mine.map((m) => m.followingId));
    }
    const base = this.storage.getPublicBaseUrl();
    const data = people.map((p) => ({
      id: p.id,
      name: p.fullName,
      username: p.username,
      avatar: resolveMediaUrl(p.avatarUrl, base),
      city: p.location?.city ?? null,
      verified: p._count.userBadges > 0,
      followedByMe: kind === 'following' || back.has(p.id),
    }));
    const meta = createPaginationMeta(Math.max(page, 1), take, total);
    return {
      data,
      meta,
      page: meta.page,
      pageSize: take,
      total,
      hasMore: meta.page < meta.totalPages,
    };
  }

  /** "New follower", at most once a week per follower. Never fails the follow. */
  private async notifyFollowed(followerId: string, userId: string) {
    try {
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId,
          referenceType: FOLLOW_REFERENCE,
          referenceId: followerId,
          createdAt: { gte: new Date(Date.now() - NOTIFY_GAP_MS) },
        },
        select: { id: true },
      });
      if (recent) return;
      const follower = await this.prisma.user.findUnique({
        where: { id: followerId },
        select: { fullName: true, username: true },
      });
      const name =
        follower?.fullName?.trim() || follower?.username || 'Someone';
      await this.notifications.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'New follower',
        body: `${name} started following you`,
        referenceType: FOLLOW_REFERENCE,
        referenceId: followerId,
        actorId: followerId,
      });
    } catch (e) {
      this.logger.warn(`Follow notification failed: ${(e as Error).message}`);
    }
  }
}

type PersonRow = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  location: { city: string } | null;
  _count: { userBadges: number };
};

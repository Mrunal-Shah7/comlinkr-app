// src/modules/users/follows.service.ts
//
// Plan 14 (TR-029): one person follows another, one-way. Following tells the person followed ("New follower", at most
// once a week per follower) and shows in the profile counts and in your own Follows lists. Blocking removes the
// follows both ways (SettingsService.blockUser).
//
// Plan 16 (TR-051): following a private account ("Public profile" off) is a request (PENDING) until they accept it.
// Only accepted follows count anywhere: counts, lists, "follows you", the private profile and the Following feed.

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FollowStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { resolveMediaUrl } from '../../common/utils/media-url';
import { createPaginationMeta } from '../../common/dto/pagination.dto';

const ACTIVE = { isActive: true, deletedAt: null } as const;
const NOTIFY_GAP_MS = 7 * 24 * 60 * 60 * 1000;
export const FOLLOW_REFERENCE = 'USER';
/** Plan 16: a "Follow request" notice; the app opens Follows, on Requests. */
export const FOLLOW_REQUEST_REFERENCE = 'FOLLOW_REQUEST';
const ACCEPTED = FollowStatus.ACCEPTED;
const PENDING = FollowStatus.PENDING;

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

  /**
   * Follows, or unfollows if already following. Plan 16: on a private account the first tap requests, the second
   * cancels the request.
   */
  async toggle(
    userId: string,
    targetId: string,
  ): Promise<{
    following: boolean;
    requested: boolean;
    followersCount: number;
  }> {
    if (userId === targetId) {
      throw new BadRequestException({
        code: 'CANNOT_FOLLOW_SELF',
        message: 'You cannot follow yourself.',
      });
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, ...ACTIVE },
      select: {
        id: true,
        privacySettings: { select: { publicProfile: true } },
      },
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
    let requested = false;
    if (removed.count === 0) {
      const isPrivate = target.privacySettings?.publicProfile === false;
      let created = true;
      try {
        await this.prisma.userFollow.create({
          data: {
            followerId: userId,
            followingId: targetId,
            status: isPrivate ? PENDING : ACCEPTED,
          },
        });
      } catch (e) {
        // A double tap: the other request created it first.
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2002'
        )
          throw e;
        created = false;
      }
      following = !isPrivate;
      requested = isPrivate;
      if (created) {
        if (isPrivate) await this.notifyRequested(userId, targetId);
        else await this.notifyFollowed(userId, targetId);
      }
    }
    return {
      following,
      requested,
      followersCount: await this.countFollowers(targetId),
    };
  }

  countFollowers(userId: string): Promise<number> {
    return this.prisma.userFollow.count({
      where: { followingId: userId, status: ACCEPTED, follower: ACTIVE },
    });
  }

  countFollowing(userId: string): Promise<number> {
    return this.prisma.userFollow.count({
      where: { followerId: userId, status: ACCEPTED, following: ACTIVE },
    });
  }

  /** Plan 16: the people `userId` follows (accepted, active accounts). */
  async followingIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userFollow.findMany({
      where: { followerId: userId, status: ACCEPTED, following: ACTIVE },
      select: { followingId: true },
    });
    return rows.map((r) => r.followingId);
  }

  /** Plan 16: whether the viewer may see a private profile's details and posts (themself or an accepted follower). */
  async canSeePrivate(viewerId: string | undefined, userId: string) {
    if (!viewerId) return false;
    if (viewerId === userId) return true;
    const row = await this.prisma.userFollow.findFirst({
      where: { followerId: viewerId, followingId: userId, status: ACCEPTED },
      select: { id: true },
    });
    return !!row;
  }

  /** Whether the viewer follows the user, the user the viewer, and whether the viewer's request is waiting. */
  async relation(
    viewerId: string,
    userId: string,
  ): Promise<{
    followedByMe: boolean;
    followingMe: boolean;
    followRequested: boolean;
  }> {
    if (!viewerId || viewerId === userId)
      return {
        followedByMe: false,
        followingMe: false,
        followRequested: false,
      };
    const rows = await this.prisma.userFollow.findMany({
      where: {
        OR: [
          { followerId: viewerId, followingId: userId },
          { followerId: userId, followingId: viewerId },
        ],
      },
      select: { followerId: true, status: true },
    });
    const mine = rows.find((r) => r.followerId === viewerId);
    return {
      followedByMe: mine?.status === ACCEPTED,
      followingMe: rows.some(
        (r) => r.followerId === userId && r.status === ACCEPTED,
      ),
      followRequested: mine?.status === PENDING,
    };
  }

  /** Plan 16: accept a request; the requester is told. */
  async accept(userId: string, requesterId: string) {
    const { count } = await this.prisma.userFollow.updateMany({
      where: { followerId: requesterId, followingId: userId, status: PENDING },
      data: { status: ACCEPTED },
    });
    if (count === 0) this.noRequest();
    await this.notifyAccepted(userId, requesterId);
    return {
      accepted: true,
      followersCount: await this.countFollowers(userId),
    };
  }

  /** Plan 16: decline a request, silently. */
  async decline(userId: string, requesterId: string) {
    const { count } = await this.prisma.userFollow.deleteMany({
      where: { followerId: requesterId, followingId: userId, status: PENDING },
    });
    if (count === 0) this.noRequest();
    return { declined: true };
  }

  private noRequest(): never {
    throw new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'No follow request from this person.',
    });
  }

  /** Plan 16: going public accepts every pending request, silently. */
  async acceptAll(userId: string) {
    await this.prisma.userFollow.updateMany({
      where: { followingId: userId, status: PENDING },
      data: { status: ACCEPTED },
    });
  }

  /** Your followers, the people you follow, or (plan 16) the requests to follow you; newest first. */
  async list(
    userId: string,
    kind: 'followers' | 'following' | 'requests',
    page = 1,
    limit = 20,
  ) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;
    const byFollower = kind !== 'following';
    const where: Prisma.UserFollowWhereInput =
      kind === 'requests'
        ? { followingId: userId, status: PENDING, follower: ACTIVE }
        : kind === 'followers'
          ? { followingId: userId, status: ACCEPTED, follower: ACTIVE }
          : { followerId: userId, status: ACCEPTED, following: ACTIVE };
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
        include: byFollower ? { follower: person } : { following: person },
      }),
      this.prisma.userFollow.count({ where }),
    ]);
    const people = rows.map((r) =>
      byFollower
        ? (r as unknown as { follower: PersonRow }).follower
        : (r as unknown as { following: PersonRow }).following,
    );
    // For your followers and requests: do you follow them back? (Everyone in "following" is followed by you.)
    let back = new Set<string>();
    if (byFollower && people.length) {
      const mine = await this.prisma.userFollow.findMany({
        where: {
          followerId: userId,
          followingId: { in: people.map((p) => p.id) },
          status: ACCEPTED,
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

  private async nameOf(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { fullName: true, username: true },
    });
    return u?.fullName?.trim() || u?.username || 'Someone';
  }

  /**
   * One follow notice, at most once a week per person and kind. Never fails the follow. The "New followers" switch
   * (plan 16) mutes all three kinds in NotificationsService.
   */
  private async notifyOnce(
    userId: string,
    actorId: string,
    referenceType: string,
    title: string,
    body: (name: string) => string,
  ) {
    try {
      const recent = await this.prisma.notification.findFirst({
        where: {
          userId,
          referenceType,
          referenceId: actorId,
          title,
          createdAt: { gte: new Date(Date.now() - NOTIFY_GAP_MS) },
        },
        select: { id: true },
      });
      if (recent) return;
      await this.notifications.createNotification({
        userId,
        type: 'SYSTEM',
        title,
        body: body(await this.nameOf(actorId)),
        referenceType,
        referenceId: actorId,
        actorId,
      });
    } catch (e) {
      this.logger.warn(`Follow notification failed: ${(e as Error).message}`);
    }
  }

  /** "New follower". */
  private notifyFollowed(followerId: string, userId: string) {
    return this.notifyOnce(
      userId,
      followerId,
      FOLLOW_REFERENCE,
      'New follower',
      (name) => `${name} started following you`,
    );
  }

  /** Plan 16: "Follow request", opening Follows on Requests. */
  private notifyRequested(followerId: string, userId: string) {
    return this.notifyOnce(
      userId,
      followerId,
      FOLLOW_REQUEST_REFERENCE,
      'Follow request',
      (name) => `${name} asked to follow you`,
    );
  }

  /** Plan 16: the requester is told, and the notice opens the profile they can now see. */
  private notifyAccepted(userId: string, requesterId: string) {
    return this.notifyOnce(
      requesterId,
      userId,
      FOLLOW_REFERENCE,
      'Follow request accepted',
      (name) => `${name} accepted your follow request`,
    );
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

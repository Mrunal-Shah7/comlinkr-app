import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FollowingFeedService } from './following-feed.service';

@Module({
  imports: [PrismaModule],
  providers: [FeedService, FollowingFeedService],
  controllers: [FeedController],
})
export class FeedModule {}

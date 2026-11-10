import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { FollowsService } from './follows.service';
import { PostsService } from '../posts/posts.service';
import { SettingsService } from '../settings/settings.service'; // SPRINT-27
import { FoodService } from '../food/food.service'; // SPRINT-29
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRegisterPushTokenDto } from './dto/register-push-token.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ReportReasonDto } from '../../common/dto/report-reason.dto'; // SPRINT-51

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
    private readonly settingsService: SettingsService, // SPRINT-27
    private readonly foodService: FoodService, // SPRINT-29
    private readonly followsService: FollowsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get full profile (relations, stats, achievements)',
  })
  @ApiResponse({ status: 200, description: 'Full profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getMyProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update basic profile fields' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Updated full profile' })
  @ApiResponse({ status: 409, description: 'Username already in use' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: AVATAR_MAX_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar URL' })
  @ApiResponse({
    status: 400,
    description: 'No file / invalid type / too large',
  })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'No file uploaded',
      });
    }
    return this.usersService.uploadAvatar(userId, file);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove profile photo' })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  @ApiResponse({ status: 400, description: 'No avatar to remove' })
  async removeAvatar(@CurrentUser('id') userId: string) {
    return this.usersService.removeAvatar(userId);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get profile stats only' })
  @ApiResponse({ status: 200, description: 'Stats object' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.usersService.getMyStats(userId);
  }

  @Get('me/achievements')
  @ApiOperation({ summary: 'Get achievement badges only' })
  @ApiResponse({ status: 200, description: 'Achievements array' })
  async getMyAchievements(@CurrentUser('id') userId: string) {
    return this.usersService.getMyAchievements(userId);
  }

  @Get('me/reservations') // SPRINT-29: before GET :id routes
  @ApiOperation({ summary: 'Get all reservations made by the current user' })
  async getMyReservations(@CurrentUser('id') userId: string) {
    return this.foodService.getMyReservations(userId);
  }

  @Get('me/posts')
  @ApiOperation({ summary: 'All content by current user (unified)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Paginated unified posts' })
  async getMyPosts(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.postsService.getMyPosts(userId, query);
  }

  // Plan 14 (TR-029): your followers and the people you follow (before GET :id).
  @Get('me/followers')
  @ApiOperation({ summary: 'People who follow the current user' })
  async getMyFollowers(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.followsService.list(
      userId,
      'followers',
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
    );
  }

  @Get('me/following')
  @ApiOperation({ summary: 'People the current user follows' })
  async getMyFollowing(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.followsService.list(
      userId,
      'following',
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
    );
  }

  // Plan 16 (TR-051): the requests to follow you (a private account), accept and decline.
  @Get('me/follow-requests')
  @ApiOperation({ summary: 'Requests to follow the current user' })
  async getMyFollowRequests(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationDto,
  ) {
    return this.followsService.list(
      userId,
      'requests',
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
    );
  }

  @Post('me/follow-requests/:userId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a request to follow the current user' })
  async acceptFollowRequest(
    @CurrentUser('id') userId: string,
    @Param('userId') requesterId: string,
  ) {
    return this.followsService.accept(userId, requesterId);
  }

  @Delete('me/follow-requests/:userId')
  @ApiOperation({ summary: 'Decline a request to follow the current user' })
  async declineFollowRequest(
    @CurrentUser('id') userId: string,
    @Param('userId') requesterId: string,
  ) {
    return this.followsService.decline(userId, requesterId);
  }

  @Post('push-token')
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UserRegisterPushTokenDto,
  ) {
    await this.usersService.registerPushToken(userId, dto.token);
    return { message: 'Push token registered' };
  }

  @Delete('push-token')
  async removePushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UserRegisterPushTokenDto,
  ) {
    await this.usersService.removePushToken(userId, dto.token);
    return { message: 'Push token removed' };
  }

  @Post('support')
  async createSupportTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.usersService.createSupportTicket(userId, dto);
  }

  @Get('support')
  async getMySupportTickets(@CurrentUser('id') userId: string) {
    return this.usersService.getMySupportTickets(userId);
  }

  @Get(':username/by-username')
  @ApiOperation({ summary: 'Get public profile by username' })
  @ApiResponse({ status: 200, description: 'Public profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUsername(
    @CurrentUser('id') requestingUserId: string,
    @Param('username') username: string,
  ) {
    return this.usersService.getUserByUsername(requestingUserId, username);
  }

  // Plan 14 (TR-029): follow, or unfollow if already following.
  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow or unfollow a user' })
  async toggleFollow(
    @CurrentUser('id') currentUserId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.followsService.toggle(currentUserId, targetUserId);
  }

  // SPRINT-27: RESTful block/unblock — placed before GET :id (same :id segment, distinct method + suffix)
  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user by ID' })
  async blockUserById(
    @CurrentUser('id') currentUserId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.settingsService.blockUser(currentUserId, {
      userId: targetUserId,
    });
  }

  @Delete(':id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user by ID' })
  async unblockUserById(
    @CurrentUser('id') currentUserId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.settingsService.unblockUser(currentUserId, targetUserId);
  }

  // SPRINT-51: POST /users/:id/report — matches mobile profile.api reportUser
  @Post(':id/report')
  @ApiOperation({ summary: 'Report a user' })
  @ApiBody({ type: ReportReasonDto })
  async reportUser(
    @CurrentUser('id') reporterId: string,
    @Param('id') targetUserId: string,
    @Body() dto: ReportReasonDto,
  ) {
    return this.usersService.reportUser(reporterId, targetUserId, dto.reason);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Public posts of another user' })
  async getUserPosts(
    @CurrentUser('id') viewerId: string,
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ) {
    return this.postsService.getPublicPosts(viewerId, id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by ID' })
  @ApiResponse({ status: 200, description: 'Public profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @CurrentUser('id') requestingUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.getUserById(requestingUserId, id);
  }
}

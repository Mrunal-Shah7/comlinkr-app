import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengesQueryDto } from './dto/challenges-query.dto';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'List challenges with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Paginated challenges' })
  async getChallenges(
    @CurrentUser('id') userId: string | undefined,
    @Query() query: ChallengesQueryDto,
  ) {
    return this.challengesService.getChallenges(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create challenge' })
  @ApiResponse({ status: 201, description: 'Challenge created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createChallenge(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengesService.createChallenge(userId, dto);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Get challenge by ID with participants' })
  @ApiResponse({ status: 200, description: 'Challenge detail' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async getChallengeById(
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.challengesService.getChallengeById(userId, id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join challenge' })
  @ApiResponse({ status: 200, description: 'Joined' })
  @ApiResponse({ status: 400, description: 'Ended or full' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async joinChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.challengesService.joinChallenge(userId, id);
  }

  // Plan 10 (TR-038)
  @Delete(':id/join')
  @ApiOperation({ summary: 'Leave a challenge you joined' })
  @ApiResponse({ status: 200, description: 'Left (or was not a member)' })
  @ApiResponse({
    status: 400,
    description: 'The author, or the challenge ended',
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async leaveChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.challengesService.leaveChallenge(userId, id);
  }

  // Plan 17 (TR-052): a member marks the quest done, or takes it back.
  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a quest you joined as done' })
  @ApiResponse({ status: 200, description: 'Marked done (or already was)' })
  @ApiResponse({ status: 400, description: 'The quest ended' })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async completeChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.challengesService.setCompleted(userId, id, true);
  }

  @Delete(':id/complete')
  @ApiOperation({ summary: 'Undo marking a quest done' })
  @ApiResponse({ status: 200, description: 'Not done (or already was not)' })
  @ApiResponse({ status: 400, description: 'The quest ended' })
  @ApiResponse({ status: 403, description: 'Not a member' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async uncompleteChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.challengesService.setCompleted(userId, id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own challenge' })
  @ApiResponse({ status: 200, description: 'Challenge deleted' })
  @ApiResponse({ status: 403, description: 'Not the author' })
  async deleteChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.challengesService.deleteChallenge(userId, id);
  }
}

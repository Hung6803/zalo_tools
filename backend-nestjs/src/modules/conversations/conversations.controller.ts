import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationType } from '../../database/entities/zalo-conversation.entity';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async create(@Body() createDto: CreateConversationDto) {
    return this.conversationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ConversationType })
  @ApiQuery({ name: 'hasUnread', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('type') type?: ConversationType,
    @Query('hasUnread') hasUnread?: boolean,
  ) {
    return this.conversationsService.findAll(zaloAccountId, { type, hasUnread });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get conversation statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    return this.conversationsService.getStats(zaloAccountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.conversationsService.findOne(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation updated successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(id, zaloAccountId, updateDto);
  }

  @Post(':id/mark-read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.conversationsService.markAsRead(id, zaloAccountId);
  }

  @Post(':id/mark-unread')
  @ApiOperation({ summary: 'Mark conversation as unread' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation marked as unread' })
  async markAsUnread(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.conversationsService.markAsUnread(id, zaloAccountId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.conversationsService.remove(id, zaloAccountId);
    return { message: 'Conversation deleted successfully' };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple conversations' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Conversations deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { conversationIds: number[] },
  ) {
    return this.conversationsService.bulkDelete(body.conversationIds, zaloAccountId);
  }
}

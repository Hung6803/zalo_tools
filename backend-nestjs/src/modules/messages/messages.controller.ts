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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageStatus } from '../../database/entities/zalo-message.entity';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  async create(@Body() createDto: CreateMessageDto) {
    return this.messagesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages' })
  @ApiQuery({ name: 'conversationId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: MessageStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async findAll(
    @Query('conversationId') conversationId?: number,
    @Query('search') search?: string,
    @Query('status') status?: MessageStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.messagesService.findAll({
      conversationId: conversationId ? +conversationId : undefined,
      search,
      status,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get message statistics' })
  @ApiQuery({ name: 'conversationId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('conversationId') conversationId?: number) {
    return this.messagesService.getStats({
      conversationId: conversationId ? +conversationId : undefined,
    });
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get messages by conversation ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async findByConversation(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.messagesService.findByConversation(conversationId, {
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'conversationId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async search(
    @Query('q') searchTerm: string,
    @Query('conversationId') conversationId?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.messagesService.search(searchTerm, {
      conversationId: conversationId ? +conversationId : undefined,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: 200, description: 'Message retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.messagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update message status' })
  @ApiResponse({ status: 200, description: 'Message status updated successfully' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: MessageStatus },
  ) {
    return this.messagesService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.messagesService.remove(id);
    return { message: 'Message deleted successfully' };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple messages' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Messages deletion result' })
  async bulkDelete(@Body() body: { messageIds: number[] }) {
    return this.messagesService.bulkDelete(body.messageIds);
  }
}

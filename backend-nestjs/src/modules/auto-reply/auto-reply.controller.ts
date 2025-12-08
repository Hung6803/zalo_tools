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
import { AutoReplyService } from './auto-reply.service';
import { CreateAutoReplyDto } from './dto/create-auto-reply.dto';
import { UpdateAutoReplyDto } from './dto/update-auto-reply.dto';
import { TestAutoReplyDto, TestAutoReplyResponseDto } from './dto/test-auto-reply.dto';

@ApiTags('auto-reply')
@ApiBearerAuth()
@Controller('auto-reply')
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new auto-reply rule' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async create(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() createDto: CreateAutoReplyDto,
  ) {
    return this.autoReplyService.create(zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auto-reply rules' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.autoReplyService.findAll(zaloAccountId, { isActive });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get auto-reply statistics overview' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    return this.autoReplyService.getStats(zaloAccountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auto-reply rule by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Rule retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.autoReplyService.findOne(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update auto-reply rule' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateAutoReplyDto,
  ) {
    return this.autoReplyService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete auto-reply rule' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.autoReplyService.remove(id, zaloAccountId);
    return { message: 'Auto-reply rule deleted successfully' };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test which auto-reply rule would be triggered by a message' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Test result', type: TestAutoReplyResponseDto })
  async test(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() testDto: TestAutoReplyDto,
  ) {
    return this.autoReplyService.test(zaloAccountId, testDto);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle auto-reply rule active status' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Rule toggled successfully' })
  async toggle(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    const rule = await this.autoReplyService.toggle(id, zaloAccountId);
    return {
      message: 'Auto-reply toggled successfully',
      isActive: rule.isActive,
    };
  }

  @Post(':id/increment-triggered')
  @ApiOperation({ summary: 'Increment triggered count (internal use)' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Triggered count incremented' })
  async incrementTriggered(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.autoReplyService.incrementTriggered(id, zaloAccountId);
    const rule = await this.autoReplyService.findOne(id, zaloAccountId);
    return {
      message: 'Triggered count incremented',
      triggerCount: rule.triggerCount,
    };
  }

  @Post('bulk/activate')
  @ApiOperation({ summary: 'Activate multiple auto-reply rules' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Rules activated' })
  async bulkActivate(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { ruleIds: number[] },
  ) {
    const updated = await this.autoReplyService.bulkActivate(body.ruleIds, zaloAccountId);
    return { updated };
  }

  @Post('bulk/deactivate')
  @ApiOperation({ summary: 'Deactivate multiple auto-reply rules' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Rules deactivated' })
  async bulkDeactivate(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { ruleIds: number[] },
  ) {
    const updated = await this.autoReplyService.bulkDeactivate(body.ruleIds, zaloAccountId);
    return { updated };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple auto-reply rules' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Rules deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { ruleIds: number[] },
  ) {
    return this.autoReplyService.bulkDelete(body.ruleIds, zaloAccountId);
  }
}

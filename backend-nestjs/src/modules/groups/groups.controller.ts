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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async create(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() createDto: CreateGroupDto,
  ) {
    return this.groupsService.create(zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isJoined', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('search') search?: string,
    @Query('isJoined') isJoined?: boolean,
  ) {
    return this.groupsService.findAll(zaloAccountId, { search, isJoined });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get groups statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    return this.groupsService.getStats(zaloAccountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.groupsService.findOne(id, zaloAccountId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('search') search?: string,
  ) {
    return this.groupsService.getMembers(id, zaloAccountId, { search });
  }

  @Post(':id/scrape')
  @ApiOperation({ summary: 'Scrape group members' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Members scraped successfully' })
  async scrapeMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.groupsService.scrapeMembers(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.groupsService.remove(id, zaloAccountId);
    return { message: 'Group deleted successfully' };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple groups' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Groups deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { groupIds: number[] },
  ) {
    return this.groupsService.bulkDelete(body.groupIds, zaloAccountId);
  }
}

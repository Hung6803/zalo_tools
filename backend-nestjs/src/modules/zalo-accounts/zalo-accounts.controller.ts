import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZaloAccountsService } from './zalo-accounts.service';
import { CreateZaloAccountDto } from './dto/create-zalo-account.dto';
import { UpdateZaloAccountDto } from './dto/update-zalo-account.dto';

@ApiTags('zalo-accounts')
@Controller('zalo-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ZaloAccountsController {
  constructor(private readonly zaloAccountsService: ZaloAccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new Zalo account',
    description: 'Creates a new Zalo account for the current user',
  })
  async create(@Request() req, @Body() createDto: CreateZaloAccountDto) {
    return this.zaloAccountsService.create(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all Zalo accounts',
    description: 'Returns all Zalo accounts for the current user',
  })
  async findAll(@Request() req) {
    return this.zaloAccountsService.findAll(req.user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get account statistics',
    description: 'Returns statistics for all Zalo accounts',
  })
  async getStats(@Request() req) {
    return this.zaloAccountsService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a Zalo account by ID',
    description: 'Returns details of a specific Zalo account',
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.zaloAccountsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a Zalo account',
    description: 'Updates an existing Zalo account',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateZaloAccountDto,
  ) {
    return this.zaloAccountsService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a Zalo account',
    description: 'Deletes a Zalo account permanently',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.zaloAccountsService.remove(id, req.user.id);
    return { message: 'Account deleted successfully' };
  }
}

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
import { ContactGroupsService } from './contact-groups.service';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';
import { ManageContactsDto } from './dto/manage-contacts.dto';

@ApiTags('contact-groups')
@ApiBearerAuth()
@Controller('contact-groups')
export class ContactGroupsController {
  constructor(private readonly contactGroupsService: ContactGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Contact group created successfully' })
  async create(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() createDto: CreateContactGroupDto,
  ) {
    return this.contactGroupsService.create(zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact groups' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Contact groups retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('search') search?: string,
  ) {
    return this.contactGroupsService.findAll(zaloAccountId, { search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contact groups statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    return this.contactGroupsService.getStats(zaloAccountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact group by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact group not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.contactGroupsService.findOne(id, zaloAccountId);
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Get contacts in a group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async getContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.contactGroupsService.getContacts(id, zaloAccountId);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add contacts to a group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contacts added successfully' })
  async addContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() dto: ManageContactsDto,
  ) {
    return this.contactGroupsService.addContacts(id, zaloAccountId, dto.contactIds);
  }

  @Delete(':id/contacts')
  @ApiOperation({ summary: 'Remove contacts from a group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contacts removed successfully' })
  async removeContacts(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() dto: ManageContactsDto,
  ) {
    return this.contactGroupsService.removeContacts(id, zaloAccountId, dto.contactIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact group updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact group not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateContactGroupDto,
  ) {
    return this.contactGroupsService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact group' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact group not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.contactGroupsService.remove(id, zaloAccountId);
    return { message: 'Contact group deleted successfully' };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple contact groups' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Contact groups deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { groupIds: number[] },
  ) {
    return this.contactGroupsService.bulkDelete(body.groupIds, zaloAccountId);
  }
}

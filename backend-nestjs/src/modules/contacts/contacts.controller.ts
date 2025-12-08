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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 409, description: 'Contact already exists' })
  async create(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() createDto: CreateContactDto,
  ) {
    return this.contactsService.create(zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('search') search?: string,
  ) {
    return this.contactsService.findAll(zaloAccountId, { search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contacts statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    return this.contactsService.getStats(zaloAccountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.contactsService.findOne(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.contactsService.remove(id, zaloAccountId);
    return { message: 'Contact deleted successfully' };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple contacts' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Contacts deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { contactIds: number[] },
  ) {
    return this.contactsService.bulkDelete(body.contactIds, zaloAccountId);
  }
}

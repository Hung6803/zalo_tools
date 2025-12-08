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
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PreviewTemplateDto, PreviewTemplateResponseDto } from './dto/preview-template.dto';
import { BulkOperationDto } from './dto/bulk-operation.dto';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(@Body() createDto: CreateTemplateDto) {
    return this.templatesService.create(createDto.zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.templatesService.findAll(zaloAccountId, { category, isActive });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all template categories' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories(@Query('zaloAccountId', ParseIntPipe) zaloAccountId: number) {
    const categories = await this.templatesService.getCategories(zaloAccountId);
    return { categories };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.templatesService.findOne(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.templatesService.remove(id, zaloAccountId);
    return { message: 'Template deleted successfully' };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview template with variable substitution' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Template preview generated', type: PreviewTemplateResponseDto })
  async preview(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() previewDto: PreviewTemplateDto,
  ) {
    return this.templatesService.preview(zaloAccountId, previewDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a template' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.templatesService.duplicate(id, zaloAccountId);
  }

  @Post(':id/increment-usage')
  @ApiOperation({ summary: 'Increment template usage count' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Usage count incremented' })
  async incrementUsage(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.templatesService.incrementUsage(id, zaloAccountId);
    const template = await this.templatesService.findOne(id, zaloAccountId);
    return {
      message: 'Usage count incremented',
      usageCount: template.usageCount,
    };
  }

  @Post('bulk/activate')
  @ApiOperation({ summary: 'Activate multiple templates' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Templates activated' })
  async bulkActivate(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() bulkDto: BulkOperationDto,
  ) {
    const updated = await this.templatesService.bulkActivate(bulkDto.templateIds, zaloAccountId);
    return { updated };
  }

  @Post('bulk/deactivate')
  @ApiOperation({ summary: 'Deactivate multiple templates' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Templates deactivated' })
  async bulkDeactivate(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() bulkDto: BulkOperationDto,
  ) {
    const updated = await this.templatesService.bulkDeactivate(bulkDto.templateIds, zaloAccountId);
    return { updated };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple templates' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Templates deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() bulkDto: BulkOperationDto,
  ) {
    return this.templatesService.bulkDelete(bulkDto.templateIds, zaloAccountId);
  }
}

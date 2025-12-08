import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PreviewTemplateDto, PreviewTemplateResponseDto } from './dto/preview-template.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(ZaloMessageTemplate)
    private templatesRepository: Repository<ZaloMessageTemplate>,
  ) {}

  /**
   * Extract variables from template content
   * Format: {variable_name}
   */
  private extractVariables(content: string): string[] {
    const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = content.matchAll(pattern);
    const variables = Array.from(matches, match => match[1]);
    // Remove duplicates
    return Array.from(new Set(variables));
  }

  /**
   * Render template with variable substitution
   */
  private renderTemplate(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }

    return result;
  }

  /**
   * Create a new template
   */
  async create(zaloAccountId: number, createDto: CreateTemplateDto): Promise<ZaloMessageTemplate> {
    // Auto-extract variables if not provided
    const variables = createDto.variables && createDto.variables.length > 0
      ? createDto.variables
      : this.extractVariables(createDto.content);

    const template = this.templatesRepository.create({
      zaloAccountId,
      name: createDto.name,
      content: createDto.content,
      description: createDto.description,
      category: createDto.category || 'general',
      variables,
      isActive: true,
      usageCount: 0,
    });

    return this.templatesRepository.save(template);
  }

  /**
   * Find all templates for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      category?: string;
      isActive?: boolean;
    },
  ): Promise<ZaloMessageTemplate[]> {
    const query = this.templatesRepository
      .createQueryBuilder('template')
      .where('template.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
    }

    return query.orderBy('template.createdAt', 'DESC').getMany();
  }

  /**
   * Find one template by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloMessageTemplate> {
    const template = await this.templatesRepository.findOne({
      where: { id, zaloAccountId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateTemplateDto,
  ): Promise<ZaloMessageTemplate> {
    const template = await this.findOne(id, zaloAccountId);

    // Re-extract variables if content changed
    if (updateDto.content && updateDto.content !== template.content) {
      const variables = this.extractVariables(updateDto.content);
      Object.assign(template, updateDto, { variables });
    } else {
      Object.assign(template, updateDto);
    }

    return this.templatesRepository.save(template);
  }

  /**
   * Delete a template
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const template = await this.findOne(id, zaloAccountId);

    // TODO: Check if template is used in any active campaign

    await this.templatesRepository.remove(template);
  }

  /**
   * Preview template with variable substitution
   */
  async preview(
    zaloAccountId: number,
    previewDto: PreviewTemplateDto,
  ): Promise<PreviewTemplateResponseDto> {
    const template = await this.findOne(previewDto.templateId, zaloAccountId);

    const rendered = this.renderTemplate(template.content, previewDto.variables);

    return {
      original: template.content,
      rendered,
      variablesUsed: template.variables,
    };
  }

  /**
   * Duplicate a template
   */
  async duplicate(id: number, zaloAccountId: number): Promise<ZaloMessageTemplate> {
    const template = await this.findOne(id, zaloAccountId);

    const duplicate = this.templatesRepository.create({
      zaloAccountId,
      name: `${template.name} (Copy)`,
      content: template.content,
      description: template.description,
      category: template.category,
      variables: template.variables,
      isActive: false, // Duplicates start as inactive
      usageCount: 0,
    });

    return this.templatesRepository.save(duplicate);
  }

  /**
   * Get all categories
   */
  async getCategories(zaloAccountId: number): Promise<string[]> {
    const result = await this.templatesRepository
      .createQueryBuilder('template')
      .select('DISTINCT template.category', 'category')
      .where('template.zaloAccountId = :zaloAccountId', { zaloAccountId })
      .andWhere('template.category IS NOT NULL')
      .getRawMany();

    return result.map(r => r.category).filter(Boolean);
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: number, zaloAccountId: number): Promise<void> {
    const template = await this.findOne(id, zaloAccountId);
    template.usageCount += 1;
    template.lastUsedAt = new Date();
    await this.templatesRepository.save(template);
  }

  /**
   * Bulk activate templates
   */
  async bulkActivate(ids: number[], zaloAccountId: number): Promise<number> {
    const result = await this.templatesRepository
      .createQueryBuilder()
      .update(ZaloMessageTemplate)
      .set({ isActive: true })
      .where('id IN (:...ids)', { ids })
      .andWhere('zaloAccountId = :zaloAccountId', { zaloAccountId })
      .execute();

    return result.affected || 0;
  }

  /**
   * Bulk deactivate templates
   */
  async bulkDeactivate(ids: number[], zaloAccountId: number): Promise<number> {
    const result = await this.templatesRepository
      .createQueryBuilder()
      .update(ZaloMessageTemplate)
      .set({ isActive: false })
      .where('id IN (:...ids)', { ids })
      .andWhere('zaloAccountId = :zaloAccountId', { zaloAccountId })
      .execute();

    return result.affected || 0;
  }

  /**
   * Bulk delete templates
   */
  async bulkDelete(ids: number[], zaloAccountId: number): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.remove(id, zaloAccountId);
        deleted++;
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push(`Template ${id} not found`);
        } else {
          errors.push(`Template ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}

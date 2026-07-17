import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SavedCaseService } from './saved-case.service';
import {
  CreateSavedCaseDto,
  UpdateSavedCaseDto,
  ListSavedCasesQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class SavedCaseController {
  constructor(private readonly service: SavedCaseService) {}

  @Get()
  async list(@Request() req: any, @Query() query: ListSavedCasesQueryDto) {
    return this.service.list(req.user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateSavedCaseDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.service.getOne(req.user.id, id);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSavedCaseDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}

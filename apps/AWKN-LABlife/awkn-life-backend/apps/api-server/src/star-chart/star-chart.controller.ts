import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PersonService } from './person.service';
import { EightDimensionsService } from './eight-dimensions.service';
import { NetworkService } from './network.service';
import { RelatedCaseService } from './related-case.service';
import {
  CreatePersonDto,
  UpdatePersonDto,
  EightDimensionsDto,
  CreateRelatedCaseDto,
} from './dto';

@Controller('star-chart')
@UseGuards(JwtAuthGuard)
export class StarChartController {
  constructor(
    private readonly personService: PersonService,
    private readonly eightDimensionsService: EightDimensionsService,
    private readonly networkService: NetworkService,
    private readonly relatedCaseService: RelatedCaseService,
  ) {}

  // ========== 人物档案 ==========

  @Post('persons')
  async createPerson(@Body() dto: CreatePersonDto, @Request() req: any) {
    return this.personService.create(req.user?.id, dto);
  }

  @Get('persons')
  async listPersons(@Request() req: any, @Query('filter') filter?: string) {
    return this.personService.findAll(req.user?.id, filter);
  }

  @Get('persons/:id')
  async getPerson(@Param('id') id: string) {
    return this.personService.findOne(id);
  }

  @Patch('persons/:id')
  async updatePerson(
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.personService.update(id, dto);
  }

  @Delete('persons/:id')
  async deletePerson(@Param('id') id: string) {
    return this.personService.remove(id);
  }

  // ========== 八维看人 ==========

  @Post('persons/:id/dimensions')
  async updateDimensions(
    @Param('id') personId: string,
    @Body() dto: EightDimensionsDto,
  ) {
    return this.eightDimensionsService.update(personId, dto);
  }

  @Get('persons/:id/dimensions')
  async getDimensions(@Param('id') personId: string) {
    return this.eightDimensionsService.findByPerson(personId);
  }

  // ========== 关系网络 ==========

  @Get('network')
  async getNetwork(@Request() req: any) {
    return this.networkService.getNetwork(req.user?.id);
  }

  @Get('network/stats')
  async getNetworkStats(@Request() req: any) {
    return this.networkService.getStats(req.user?.id);
  }

  // ========== 相关事项 ==========

  @Post('persons/:id/cases')
  async addCase(
    @Param('id') personId: string,
    @Body() dto: CreateRelatedCaseDto,
  ) {
    return this.relatedCaseService.create(personId, dto);
  }

  @Get('persons/:id/cases')
  async listCases(@Param('id') personId: string) {
    return this.relatedCaseService.findByPerson(personId);
  }
}

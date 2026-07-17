import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UserProfileService, UserInsights } from './user-profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user/profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('insights')
  async getInsights(@Request() req: any): Promise<UserInsights> {
    return this.userProfileService.getUserInsights(req.user.id);
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, ForbiddenException, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(req: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can access this resource.');
    }
  }

  // Teams CRUD
  @Get('teams')
  async getTeams(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.findAllTeams();
  }

  @Post('teams')
  async createTeam(@Req() req: any, @Body() body: any) {
    this.checkAdmin(req);
    return this.adminService.createTeam(body);
  }

  @Put('teams/:id')
  async updateTeam(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.checkAdmin(req);
    return this.adminService.updateTeam(id, body);
  }

  @Delete('teams/:id')
  async deleteTeam(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req);
    await this.adminService.deleteTeam(id);
    return { message: 'Team deleted successfully.' };
  }

  // Fixtures CRUD
  @Get('fixtures')
  async getFixtures(@Req() req: any) {
    this.checkAdmin(req);
    return this.adminService.findAllFixtures();
  }

  @Post('fixtures')
  async createFixture(@Req() req: any, @Body() body: any) {
    this.checkAdmin(req);
    return this.adminService.createFixture(body);
  }

  @Put('fixtures/:id')
  async updateFixture(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    this.checkAdmin(req);
    return this.adminService.updateFixture(id, body);
  }

  @Delete('fixtures/:id')
  async deleteFixture(@Req() req: any, @Param('id') id: string) {
    this.checkAdmin(req);
    await this.adminService.deleteFixture(id);
    return { message: 'Fixture deleted successfully.' };
  }

  // Score Entry / Match Completion
  @Post('fixtures/:id/score')
  @HttpCode(HttpStatus.OK)
  async completeMatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body('homeScore') homeScore: number,
    @Body('awayScore') awayScore: number,
    @Body('actualScorers') actualScorers: string[],
    @Body('actualWinnerId') actualWinnerId?: string,
    @Body('resolutionTime') resolutionTime?: string,
  ) {
    this.checkAdmin(req);
    return this.adminService.completeMatch(
      id,
      homeScore,
      awayScore,
      actualScorers,
      actualWinnerId,
      resolutionTime
    );
  }
}

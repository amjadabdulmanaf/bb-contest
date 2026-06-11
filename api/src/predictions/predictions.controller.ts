import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PredictionsService } from './predictions.service';

@Controller('predictions')
@UseGuards(AuthGuard('jwt'))
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('schedule')
  async getSchedule() {
    return this.predictionsService.getSchedule();
  }

  @Get('players')
  async getPlayers() {
    return this.predictionsService.getPlayers();
  }

  @Get('my-predictions')
  async getMyPredictions(@Req() req: any) {
    const userId = req.user.id;
    return this.predictionsService.getUserPredictions(userId);
  }

  @Post('save')
  async savePredictions(@Req() req: any, @Body() predictionsDto: any[]) {
    const userId = req.user.id;
    return this.predictionsService.saveUserPredictions(userId, predictionsDto);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.predictionsService.getLeaderboard();
  }

  @Get('color-leaderboard')
  async getColorLeaderboard() {
    return this.predictionsService.getColorLeaderboard();
  }
}

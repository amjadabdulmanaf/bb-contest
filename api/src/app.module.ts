import 'dotenv/config';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PredictionsModule } from './predictions/predictions.module';
import { AdminModule } from './admin/admin.module';
import { seedDatabase } from './db/seed';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST ?? 'db',
      port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
      username: process.env.POSTGRES_USER ?? 'wc_user',
      password: process.env.POSTGRES_PASSWORD ?? 'wc_password',
      database: process.env.POSTGRES_DB ?? 'wc_db',
      autoLoadEntities: true,
      synchronize: true, // Auto-generates tables (safe for development)
    }),
    UsersModule,
    AuthModule,
    PredictionsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'true') {
      await seedDatabase(this.dataSource);
    } else {
      console.log('[Seed] Database seeding is disabled (set SEED_DB=true to run).');
    }
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConsultModule } from './consult/consult.module';
import { PaymentModule } from './payment/payment.module';
import { MembershipModule } from './membership/membership.module';
import { SavedCaseModule } from './saved-case/saved-case.module';
import { WebsocketModule } from './websocket/websocket.module';
import { LlmProvidersModule } from './llm-providers/llm-providers.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GrowthModule } from './growth/growth.module';
import { AdminModule } from './admin/admin.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { MingliBenchModule } from './mingli-bench/mingli-bench.module';
import { ShumiyuanModule } from './shumiyuan/shumiyuan.module';
import { StarChartModule } from './star-chart/star-chart.module';
import { MiaosuanModule } from './miaosuan/miaosuan.module';
import { ChronicleModule } from './chronicle/chronicle.module';
import { KlineTideModule } from './kline-tide/kline-tide.module';
import { TideInferenceModule } from './tide-inference/tide-inference.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { HealthController } from './health.controller';
import { RedisModule } from './shared/redis/redis.module';
import { QueueModule } from './shared/queue/queue.module';
import { DecisionFrameworkModule } from './decision-framework/decision-framework.module';
import { GuardrailsModule } from './guardrails/guardrails.module';
import { SolarTimeModule } from './calc-engine/solar-time/solar-time.module';
import { ZiweiEngineModule } from './calc-engine/ziwei-engine/ziwei-engine.module';
import { KnowledgeBaseModule } from './knowledge-base-data/knowledge-base.module';
import { WritingPipelineModule } from './writing-pipeline/writing-pipeline.module';
import { NamingModule } from './naming/naming.module';

const envPath = path.resolve(__dirname, '../../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [envPath, '.env'],
    }),
    RedisModule,
    QueueModule.register(),
    PrismaModule,
    AuthModule,
    UserModule,
    ConsultModule,
    PaymentModule,
    MembershipModule,
    SavedCaseModule,
    WebsocketModule,
    FeedbackModule,
    LlmProvidersModule,
    AnalyticsModule,
    GrowthModule,
    AdminModule,
    UserProfileModule,
    MingliBenchModule,
    ShumiyuanModule,
    StarChartModule,
    MiaosuanModule,
    ChronicleModule,
    KlineTideModule,
    TideInferenceModule,
    FeatureFlagsModule,
    DecisionFrameworkModule,
    GuardrailsModule,
    SolarTimeModule,
    ZiweiEngineModule,
    KnowledgeBaseModule,
    WritingPipelineModule,
    NamingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { useState } from 'react';
import HourWheel from '@/components/form/HourWheel';
import { BirthDateTimePicker } from '@/components/form/BirthDateTimePicker';
import CitySelector from '@/components/form/CitySelector';
import WaitingSpinner from '@/components/form/WaitingSpinner';
import ConfidenceRing from '@/components/form/ConfidenceRing';
import ResultReveal from '@/components/result/ResultReveal';
import { DivinationRitualLoader } from '@/components/DivinationRitualLoader';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xs tracking-[0.2em] uppercase text-primary mb-4">{title}</h2>
      <div className="rounded-2xl bg-surface-container p-6 flex items-center justify-center min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

export function ComponentPreview() {
  const [hour, setHour] = useState(6);
  const [city, setCity] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const [ritualType, setRitualType] = useState<'bazi' | 'ziwei' | 'qimen' | 'liuren' | 'general'>('bazi');
  const [showRitual, setShowRitual] = useState(false);

  // 时辰选择方案状态
  const [planA, setPlanA] = useState({ date: '1990-05-20', hour: 6, minute: 0 });
  const [planB, setPlanB] = useState({ date: '1990-05-20', hour: 6, minute: 0 });
  const [planC, setPlanC] = useState({ date: '1990-05-20', hour: 6, minute: 0 });

  return (
    <div className="min-h-screen bg-surface-base text-on-surface p-6 pb-24 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-lg font-bold text-primary mb-1">UI 组件预览</h1>
          <p className="text-xs text-on-surface-variant">8 个组件（含 shadcn/ui 推广示范）</p>
        </div>

        <Section title="方案 A · 页面圆盘 + 弹窗数字">
          <div className="w-full">
            <p className="text-xs text-on-surface-variant mb-4 text-center">
              页面主体直接展示圆盘；点击下方"精确选择小时"弹窗只显示 24 小时数字。
            </p>
            <BirthDateTimePicker
              value={planA.date}
              onChange={(date) => setPlanA(p => ({ ...p, date }))}
              hour={planA.hour}
              minute={planA.minute}
              onHourChange={(hour) => setPlanA(p => ({ ...p, hour }))}
              onMinuteChange={(minute) => setPlanA(p => ({ ...p, minute }))}
              label="出生日期"
              timeLabel="出生时辰"
              inlineTimeWheel
            />
          </div>
        </Section>

        <Section title="方案 B · 页面按钮 + 弹窗 0-11时辰 + 0-59分钟">
          <div className="w-full">
            <p className="text-xs text-on-surface-variant mb-4 text-center">
              页面主体只显示时辰按钮；点击后弹窗显示 0-11 时辰 + 0-59 分钟数字，无圆盘。
            </p>
            <BirthDateTimePicker
              value={planB.date}
              onChange={(date) => setPlanB(p => ({ ...p, date }))}
              hour={planB.hour}
              minute={planB.minute}
              onHourChange={(hour) => setPlanB(p => ({ ...p, hour }))}
              onMinuteChange={(minute) => setPlanB(p => ({ ...p, minute }))}
              label="出生日期"
              timeLabel="出生时辰"
              modalWheel={false}
            />
          </div>
        </Section>

        <Section title="方案 C · 页面按钮 + 弹窗圆盘+数字">
          <div className="w-full">
            <p className="text-xs text-on-surface-variant mb-4 text-center">
              页面主体只显示时辰按钮；点击后弹窗内同时展示圆盘和 24 小时数字。
            </p>
            <BirthDateTimePicker
              value={planC.date}
              onChange={(date) => setPlanC(p => ({ ...p, date }))}
              hour={planC.hour}
              minute={planC.minute}
              onHourChange={(hour) => setPlanC(p => ({ ...p, hour }))}
              onMinuteChange={(minute) => setPlanC(p => ({ ...p, minute }))}
              label="出生日期"
              timeLabel="出生时辰"
              modalWheel
            />
          </div>
        </Section>

        <Section title="1. HourWheel · 时辰圆盘">
          <div className="text-center">
            <div className="text-xs text-on-surface-variant mb-4">
              当前选中：第 {hour} 小时
            </div>
            <HourWheel value={hour} onChange={setHour} />
          </div>
        </Section>

        <Section title="2. CitySelector · 地图选城">
          <CitySelector value={city} onChange={setCity} />
        </Section>

        <Section title="3. WaitingSpinner · 等待图（推演仪式旧版）">
          {!showLoader ? (
            <button
              onClick={() => { setShowLoader(true); setTimeout(() => setShowLoader(false), 4000); }}
              className="px-6 py-3 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              点击查看等待效果
            </button>
          ) : (
            <WaitingSpinner engineName="六壬" onComplete={() => {}} duration={3600} />
          )}
        </Section>

        <Section title="4. DivinationRitualLoader · 仪式化推演加载（新版）">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {(['bazi', 'ziwei', 'qimen', 'liuren', 'general'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRitualType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ritualType === t
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-on-surface/5 text-on-surface/50 border border-outline/20 hover:bg-on-surface/10'
                  }`}
                >
                  {t === 'bazi' && '八字'}
                  {t === 'ziwei' && '紫微'}
                  {t === 'qimen' && '奇门'}
                  {t === 'liuren' && '大六壬'}
                  {t === 'general' && '通用'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRitual(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
            >
              启动 {ritualType === 'bazi' ? '八字' : ritualType === 'ziwei' ? '紫微' : ritualType === 'qimen' ? '奇门' : ritualType === 'liuren' ? '大六壬' : '通用'} 推演仪式
            </button>
          </div>
          <DivinationRitualLoader
            isLoading={showRitual}
            type={ritualType}
            birthDate="1990-05-20"
            nickname="测试用户"
            onComplete={() => setShowRitual(false)}
          />
        </Section>

        <Section title="5. ConfidenceRing · 进度环">
          <div className="flex flex-col gap-6">
            <ConfidenceRing confidence={0.92} />
            <ConfidenceRing confidence={0.67} />
            <ConfidenceRing confidence={0.45} />
          </div>
        </Section>

        <Section title="6. ResultReveal · 结果仪式感">
          <ResultReveal engineName="六壬推演">
            <div className="text-center py-8">
              <div className="text-primary text-lg font-medium mb-2">命书内容已生成</div>
              <p className="text-on-surface-variant text-sm">
                顺势而为，宜东方行。贵人属虎，申时见机。
              </p>
            </div>
          </ResultReveal>
        </Section>

        <Section title="7. BottomNav · 通知点">
          <div className="w-full">
            <BottomNav />
          </div>
        </Section>

        <Section title="8. shadcn/ui · Card 推广示范">
          <div className="w-full space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>命书解读</CardTitle>
                <CardDescription>基于 shadcn/ui Card 二次封装，主题自适应</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-on-surface-variant mb-3">
                  此卡片使用 shadcn/ui Card 组件，自动适配亮/暗主题。
                </p>
                <Button size="sm" variant="default">查看详情</Button>
              </CardContent>
            </Card>
          </div>
        </Section>
      </div>
    );
}
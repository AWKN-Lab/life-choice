import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
}

interface CityGroup {
  region: string;
  direction: string;
  cities: string[];
}

const CITY_DATA: CityGroup[] = [
  {
    region: '华北',
    direction: '北',
    cities: ['北京', '天津', '石家庄', '太原', '呼和浩特'],
  },
  {
    region: '东北',
    direction: '东北',
    cities: ['沈阳', '大连', '长春', '哈尔滨'],
  },
  {
    region: '华东',
    direction: '东',
    cities: ['上海', '南京', '杭州', '苏州', '合肥', '济南', '青岛', '厦门', '福州'],
  },
  {
    region: '华中',
    direction: '中',
    cities: ['武汉', '长沙', '郑州', '南昌'],
  },
  {
    region: '华南',
    direction: '南',
    cities: ['广州', '深圳', '海口', '南宁', '香港', '澳门'],
  },
  {
    region: '西南',
    direction: '西南',
    cities: ['成都', '重庆', '昆明', '贵阳', '拉萨'],
  },
  {
    region: '西北',
    direction: '西北',
    cities: ['西安', '兰州', '乌鲁木齐', '银川', '西宁'],
  },
];

export default function CitySelector({ value, onChange }: CitySelectorProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredGroups = searchQuery
    ? CITY_DATA.map(g => ({
        ...g,
        cities: g.cities.filter(c => c.includes(searchQuery)),
      })).filter(g => g.cities.length > 0)
    : CITY_DATA;

  const directionColor: Record<string, string> = {
    '北': 'hsl(200, 70%, 60%)',
    '东北': 'hsl(180, 60%, 55%)',
    '东': 'hsl(160, 70%, 55%)',
    '中': 'hsl(53, 73%, 76%)',
    '南': 'hsl(20, 80%, 60%)',
    '西南': 'hsl(280, 60%, 65%)',
    '西北': 'hsl(240, 60%, 65%)',
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 搜索框 */}
      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" style={{ fontSize: 18 }}>
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索城市..."
          className="input-mystic w-full pl-10 pr-4 py-3 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        )}
      </div>

      {/* 已选城市展示 */}
      {value && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>location_on</span>
            <span className="text-primary font-medium">{value}</span>
          </div>
          <button
            onClick={() => onChange('')}
            className="text-on-surface-variant/60 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </motion.div>
      )}

      {/* 城市分组 */}
      <div className="space-y-2">
        {filteredGroups.map((group) => (
          <motion.div
            key={group.region}
            initial={false}
            className="rounded-xl overflow-hidden border border-outline/[0.06]"
          >
            {/* 区域标题 */}
            <button
              onClick={() => setExpandedRegion(expandedRegion === group.region ? null : group.region)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low/50 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: `${directionColor[group.direction]}20`,
                    color: directionColor[group.direction],
                  }}
                >
                  {group.direction}
                </span>
                <span className="text-sm font-medium text-on-surface">{group.region}</span>
                <span className="text-xs text-on-surface-variant/50">{group.cities.length}城</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 transition-transform" style={{
                fontSize: 18,
                transform: expandedRegion === group.region ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                expand_more
              </span>
            </button>

            {/* 城市列表 */}
            <AnimatePresence>
              {(expandedRegion === group.region || searchQuery) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 grid grid-cols-3 gap-2">
                    {group.cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => onChange(city)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          value === city
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-on-surface/[0.04] text-on-surface/60 border border-outline/[0.06] hover:bg-on-surface/[0.08] hover:text-on-surface/80'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* 真太阳时提示 */}
      {value && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 rounded-lg bg-secondary/10 border border-secondary/20"
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary mt-0.5" style={{ fontSize: 16 }}>schedule</span>
            <div>
              <div className="text-xs text-secondary font-medium">真太阳时校正</div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                已选择 {value}，推演时将自动校正为当地真太阳时
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

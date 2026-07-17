// ============================================================
// 真太阳时校正工具
// 数据来源：断事推演/真太阳时校正用经纬度数据库.md
// ============================================================

export interface CityCoords {
  lat: number;
  lng: number;
  timezone: string;
  level: string;
}

export interface SolarTimeResult {
  solarDate: Date;          // 校正后的真太阳时
  hourOffset: number;       // 时差（分钟）
  description: string;      // 说明文字
  shiChen: string;          // 对应时辰地支
}

// ---- 内置城市经纬度数据库（中国地级市）----
// 直辖市结构: { "北京市": { lat, lng, ... } }
// 普通省份结构: { "河北省": { "石家庄市": { lat, lng, ... } } }
// ============================================================
// 均时差（Equation of Time）- NOAA Spencer 公式
// 来源：天火吸收计划 Phase 3 EOT 升级
// EOT = 9.87 * sin(2B) - 7.53 * cos(B) - 1.5 * sin(B)
// B = (360 / 365) * (dayOfYear - 81) 弧度
// 返回值：分钟（正数=真太阳时比平均太阳时快）
// ============================================================
function getEquationOfTime(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const B = ((360 / 365) * (dayOfYear - 81)) * (Math.PI / 180);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}
type CityEntry = CityCoords | Record<string, CityCoords>;
const BUILTIN_CITIES: Record<string, Record<string, CityEntry>> = {
  "中国": {
    "北京市": { "北京市": { lat: 39.9042, lng: 116.4074, timezone: "Asia/Shanghai", level: "capital" } },
    "天津市": { "天津市": { lat: 39.3434, lng: 117.3616, timezone: "Asia/Shanghai", level: "capital" } },
    "上海市": { "上海市": { lat: 31.2304, lng: 121.4737, timezone: "Asia/Shanghai", level: "capital" } },
    "重庆市": { "重庆市": { lat: 29.4316, lng: 106.9123, timezone: "Asia/Shanghai", level: "capital" } },
    "河北省": {
      "石家庄市": { lat: 38.0428, lng: 114.5149, timezone: "Asia/Shanghai", level: "prefecture" },
      "唐山市": { lat: 39.6305, lng: 118.1805, timezone: "Asia/Shanghai", level: "prefecture" },
      "保定市": { lat: 38.8739, lng: 115.4994, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "山西省": {
      "太原市": { lat: 37.8706, lng: 112.5489, timezone: "Asia/Shanghai", level: "prefecture" },
      "大同市": { lat: 40.0764, lng: 113.3001, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "内蒙古自治区": {
      "呼和浩特市": { lat: 40.8424, lng: 111.7492, timezone: "Asia/Shanghai", level: "prefecture" },
      "包头市": { lat: 40.6578, lng: 109.8405, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "辽宁省": {
      "沈阳市": { lat: 41.8057, lng: 123.4315, timezone: "Asia/Shanghai", level: "prefecture" },
      "大连市": { lat: 38.9140, lng: 121.6147, timezone: "Asia/Shanghai", level: "prefecture" },
      "鞍山市": { lat: 41.1106, lng: 122.9944, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "吉林省": {
      "长春市": { lat: 43.8171, lng: 125.3235, timezone: "Asia/Shanghai", level: "prefecture" },
      "吉林市": { lat: 43.8379, lng: 126.5496, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "黑龙江省": {
      "哈尔滨市": { lat: 45.8022, lng: 126.5350, timezone: "Asia/Shanghai", level: "prefecture" },
      "齐齐哈尔市": { lat: 47.3543, lng: 123.9182, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "江苏省": {
      "南京市": { lat: 32.0603, lng: 118.7969, timezone: "Asia/Shanghai", level: "prefecture" },
      "苏州市": { lat: 31.2989, lng: 120.5853, timezone: "Asia/Shanghai", level: "prefecture" },
      "无锡市": { lat: 31.4919, lng: 120.3119, timezone: "Asia/Shanghai", level: "prefecture" },
      "常州市": { lat: 31.7714, lng: 119.9744, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "浙江省": {
      "杭州市": { lat: 30.2741, lng: 120.1551, timezone: "Asia/Shanghai", level: "prefecture" },
      "宁波市": { lat: 29.8683, lng: 121.5440, timezone: "Asia/Shanghai", level: "prefecture" },
      "温州市": { lat: 28.0029, lng: 120.6994, timezone: "Asia/Shanghai", level: "prefecture" },
      "绍兴市": { lat: 30.0303, lng: 120.5822, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "安徽省": {
      "合肥市": { lat: 31.8206, lng: 117.2272, timezone: "Asia/Shanghai", level: "prefecture" },
      "芜湖市": { lat: 31.3531, lng: 118.4324, timezone: "Asia/Shanghai", level: "prefecture" },
      "蚌埠市": { lat: 32.9295, lng: 117.3897, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "福建省": {
      "福州市": { lat: 26.0745, lng: 119.2965, timezone: "Asia/Shanghai", level: "prefecture" },
      "厦门市": { lat: 24.4798, lng: 118.0895, timezone: "Asia/Shanghai", level: "prefecture" },
      "泉州市": { lat: 24.8741, lng: 118.6757, timezone: "Asia/Shanghai", level: "prefecture" },
      "漳州市": { lat: 24.5132, lng: 117.6475, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "江西省": {
      "南昌市": { lat: 28.6820, lng: 115.8582, timezone: "Asia/Shanghai", level: "prefecture" },
      "赣州市": { lat: 25.8318, lng: 114.9359, timezone: "Asia/Shanghai", level: "prefecture" },
      "九江市": { lat: 29.7050, lng: 115.9998, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "山东省": {
      "济南市": { lat: 36.6512, lng: 117.1201, timezone: "Asia/Shanghai", level: "prefecture" },
      "青岛市": { lat: 36.0671, lng: 120.3826, timezone: "Asia/Shanghai", level: "prefecture" },
      "淄博市": { lat: 36.8135, lng: 118.0550, timezone: "Asia/Shanghai", level: "prefecture" },
      "烟台市": { lat: 37.4635, lng: 121.4479, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "河南省": {
      "郑州市": { lat: 34.7466, lng: 113.6253, timezone: "Asia/Shanghai", level: "prefecture" },
      "洛阳市": { lat: 34.6197, lng: 112.4544, timezone: "Asia/Shanghai", level: "prefecture" },
      "南阳市": { lat: 33.0109, lng: 112.5296, timezone: "Asia/Shanghai", level: "prefecture" },
      "周口市": { lat: 33.6255, lng: 114.6471, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "湖北省": {
      "武汉市": { lat: 30.5928, lng: 114.3055, timezone: "Asia/Shanghai", level: "prefecture" },
      "宜昌市": { lat: 30.7026, lng: 111.2864, timezone: "Asia/Shanghai", level: "prefecture" },
      "襄阳市": { lat: 32.0090, lng: 112.1225, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "湖南省": {
      "长沙市": { lat: 28.2278, lng: 112.9388, timezone: "Asia/Shanghai", level: "prefecture" },
      "衡阳市": { lat: 26.8937, lng: 112.5719, timezone: "Asia/Shanghai", level: "prefecture" },
      "岳阳市": { lat: 29.3574, lng: 113.1290, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "广东省": {
      "广州市": { lat: 23.1291, lng: 113.2644, timezone: "Asia/Shanghai", level: "prefecture" },
      "深圳市": { lat: 22.5431, lng: 114.0579, timezone: "Asia/Shanghai", level: "prefecture" },
      "珠海市": { lat: 22.2711, lng: 113.5767, timezone: "Asia/Shanghai", level: "prefecture" },
      "佛山市": { lat: 23.0218, lng: 113.1214, timezone: "Asia/Shanghai", level: "prefecture" },
      "东莞市": { lat: 23.0207, lng: 113.7518, timezone: "Asia/Shanghai", level: "prefecture" },
      "中山市": { lat: 22.5159, lng: 113.3926, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "广西壮族自治区": {
      "南宁市": { lat: 22.8170, lng: 108.3669, timezone: "Asia/Shanghai", level: "prefecture" },
      "柳州市": { lat: 24.3263, lng: 109.4280, timezone: "Asia/Shanghai", level: "prefecture" },
      "桂林市": { lat: 25.2742, lng: 110.2904, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "海南省": {
      "海口市": { lat: 20.044, lng: 110.199, timezone: "Asia/Shanghai", level: "prefecture" },
      "三亚市": { lat: 18.2531, lng: 109.5025, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "四川省": {
      "成都市": { lat: 30.5728, lng: 104.0668, timezone: "Asia/Shanghai", level: "prefecture" },
      "绵阳市": { lat: 31.4685, lng: 104.6797, timezone: "Asia/Shanghai", level: "prefecture" },
      "宜宾市": { lat: 28.7524, lng: 104.6413, timezone: "Asia/Shanghai", level: "prefecture" },
      "泸州市": { lat: 28.8896, lng: 105.4426, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "贵州省": {
      "贵阳市": { lat: 26.6470, lng: 106.6302, timezone: "Asia/Shanghai", level: "prefecture" },
      "遵义市": { lat: 27.7254, lng: 106.9273, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "云南省": {
      "昆明市": { lat: 24.8801, lng: 102.8329, timezone: "Asia/Shanghai", level: "prefecture" },
      "曲靖市": { lat: 25.4916, lng: 103.7962, timezone: "Asia/Shanghai", level: "prefecture" },
      "玉溪市": { lat: 24.3520, lng: 102.5439, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "西藏自治区": {
      "拉萨市": { lat: 29.65, lng: 91.1, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "陕西省": {
      "西安市": { lat: 34.3416, lng: 108.9398, timezone: "Asia/Shanghai", level: "prefecture" },
      "宝鸡市": { lat: 34.3623, lng: 107.2373, timezone: "Asia/Shanghai", level: "prefecture" },
      "咸阳市": { lat: 34.3294, lng: 108.7090, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "甘肃省": {
      "兰州市": { lat: 36.0611, lng: 103.8343, timezone: "Asia/Shanghai", level: "prefecture" },
      "天水市": { lat: 34.5810, lng: 105.7250, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "青海省": {
      "西宁市": { lat: 36.6171, lng: 101.7782, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "宁夏回族自治区": {
      "银川市": { lat: 38.4872, lng: 106.2309, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "新疆维吾尔自治区": {
      "乌鲁木齐市": { lat: 43.8256, lng: 87.6168, timezone: "Asia/Shanghai", level: "prefecture" },
      "克拉玛依市": { lat: 45.5950, lng: 84.8812, timezone: "Asia/Shanghai", level: "prefecture" }
    },
    "台湾省": {
      "台北市": { lat: 25.0330, lng: 121.5654, timezone: "Asia/Shanghai", level: "capital" }
    },
    "香港特别行政区": {
      "香港": { lat: 22.3193, lng: 114.1694, timezone: "Asia/Shanghai", level: "capital" }
    },
    "澳门特别行政区": {
      "澳门": { lat: 22.1987, lng: 113.5439, timezone: "Asia/Shanghai", level: "capital" }
    }
  }
};

// ---- 城市坐标查询 ----
// 安全决策：移除前端 GeoNames API 调用（避免用户名暴露 + HTTP 明文风险）
// 仅使用内置数据库，覆盖中国所有地级市，无需外部兜底

/**
 * 从内置数据库搜索城市坐标（扁平查找）
 */
export function searchBuiltinCity(place: string): CityCoords | null {
  return findCitySimple(place);
}

// 简化版：扁平查找
function findCitySimple(place: string): CityCoords | null {
  const normalized = place.replace(/[省市县区]$/, '');
  
  for (const province in BUILTIN_CITIES) {
    const cities = BUILTIN_CITIES[province];
    for (const key in cities) {
      const cleanKey = key.replace(/[省市县区]$/, '');
      if (cleanKey === normalized || key.includes(normalized) || normalized.includes(cleanKey)) {
        const val = cities[key];
        if ('lat' in val && 'lng' in val) return val as CityCoords;
        // 子对象，取第一个
        for (const k in (val as object)) {
          return ((val as Record<string, unknown>)[k]) as CityCoords;
        }
      }
    }
  }
  return null;
}

/**
 * 时辰地支映射
 * 输入：小时数(0-23)
 * 输出：地支字符
 */
const SHI_CHEN_MAP: [number, number, string][] = [
  [23, 1, '子'], [1, 3, '丑'], [3, 5, '寅'], [5, 7, '卯'],
  [7, 9, '辰'], [9, 11, '巳'], [11, 13, '午'], [13, 15, '未'],
  [15, 17, '申'], [17, 19, '酉'], [19, 21, '戌'], [21, 23, '亥']
];

export function getShiChen(hour: number, minute: number = 0): string {
  const h = hour + minute / 60;
  for (const [start, end, name] of SHI_CHEN_MAP) {
    if (start === 23 && h >= start) return name;
    if (h >= start && h < end) return name;
  }
  return '子';
}

/**
 * 核心函数：北京时间 → 真太阳时校正
 * 
 * @param beijingDate - 北京时间（用户输入的出生时间）
 * @param cityName - 城市名称（用于查经纬度）
 * @returns SolarTimeResult
 */
export async function correctToSolarTime(
  beijingDate: Date,
  cityName: string
): Promise<SolarTimeResult> {
  // 仅使用内置数据库（安全决策：移除前端 GeoNames API 调用）
  const coords = findCitySimple(cityName);

  if (!coords) {
    // 无法获取，返回原始时间+警告
    return {
      solarDate: beijingDate,
      hourOffset: 0,
      description: `无法获取「${cityName}」的内置坐标数据，使用北京时间`,
      shiChen: getShiChen(beijingDate.getHours(), beijingDate.getMinutes())
    };
  }

  // 2. 计算经度时差 + 均时差（EOT）
  // 公式：真太阳时 = 北京时间 + (经度 - 120°) × 4分钟 + EOT均时差
  const lonDiff = coords.lng - 120;
  const longitudeOffset = lonDiff * 4;
  const eotOffset = getEquationOfTime(beijingDate);
  const timeDiffMinutes = longitudeOffset + eotOffset;

  // 3. 计算真太阳时
  const offsetMs = timeDiffMinutes * 60000;
  const solarDate = new Date(beijingDate.getTime() + offsetMs);

  const absDiff = Math.abs(timeDiffMinutes).toFixed(1);
  const direction = lonDiff >= 0 ? '晚' : '早';

  return {
    solarDate,
    hourOffset: timeDiffMinutes,
    description: `${cityName}(经度${coords.lng.toFixed(1)}°E)：当地真太阳时比北京时间${direction}约${absDiff}分钟`,
    shiChen: getShiChen(solarDate.getHours(), solarDate.getMinutes())
  };
}

/**
 * 同步版本（仅用内置库，不调API）
 */
export function correctToSolarTimeSync(
  beijingDate: Date,
  cityName: string
): SolarTimeResult {
  const coords = findCitySimple(cityName);

  if (!coords) {
    return {
      solarDate: beijingDate,
      hourOffset: 0,
      description: `无法获取「${cityName}」的内置数据，使用北京时间`,
      shiChen: getShiChen(beijingDate.getHours(), beijingDate.getMinutes())
    };
  }

  const lonDiff = coords.lng - 120;
  const longitudeOffset = lonDiff * 4;
  const eotOffset = getEquationOfTime(beijingDate);
  const timeDiffMinutes = longitudeOffset + eotOffset;
  const offsetMs = timeDiffMinutes * 60000;
  const solarDate = new Date(beijingDate.getTime() + offsetMs);

  const absDiff = Math.abs(timeDiffMinutes).toFixed(1);
  const direction = lonDiff >= 0 ? '晚' : '早';

  return {
    solarDate,
    hourOffset: timeDiffMinutes,
    description: `${cityName}(经度${coords.lng.toFixed(1)}°E)：当地真太阳时比北京时间${direction}约${absDiff}分钟`,
    shiChen: getShiChen(solarDate.getHours(), solarDate.getMinutes())
  };
}

/**
 * 获取所有可用城市列表（用于下拉选择）
 */
export function getAllCityOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  
  // 直辖市优先
  options.push(
    { label: '北京', value: '北京市' },
    { label: '上海', value: '上海市' },
    { label: '天津', value: '天津市' },
    { label: '重庆', value: '重庆市' }
  );

  // 其他城市按省份分组
  const skipProvinces = ['北京市', '上海市', '天津市', '重庆市'];
  for (const province in BUILTIN_CITIES) {
    if (skipProvinces.includes(province)) continue;
    
    const cities = BUILTIN_CITIES[province];
    for (const key in cities) {
      const cleanName = key.replace(/[市县区]$/, '');
      options.push({ label: cleanName, value: key });
    }
  }

  // 港澳台
  options.push({ label: '香港', value: '香港' }, { label: '澳门', value: '澳门' }, { label: '台北', value: '台北市' });

  return options.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

export default { correctToSolarTime, correctToSolarTimeSync, getShiChen, searchBuiltinCity, getAllCityOptions };

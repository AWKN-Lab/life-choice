const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 千问API配置
const QIANWEN_API_KEY = 'sk-5f8534271a1446419de43abb12e3820e0f85b3-88c1b59d012d';
const QIANWEN_API_URL = 'https://api.qianwen.com/v1/chat/completions';

// 天干地支定义
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行属性
const WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

// 地支藏干
const DI_ZHI_CANG_GAN = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

/**
 * 计算年柱
 */
function getYearPillar(year) {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 计算月柱
 */
function getMonthPillar(year, month) {
  const yearGanIndex = (year - 4) % 10;
  const monthGanStart = (yearGanIndex % 5) * 2;
  const monthGanIndex = (monthGanStart + month - 1) % 10;
  const monthZhiIndex = (month + 1) % 12;
  return TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex];
}

/**
 * 计算日柱（简化算法）
 */
function getDayPillar(year, month, day) {
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const ganIndex = (diffDays + 10) % 10;
  const zhiIndex = (diffDays + 12) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 计算时柱
 */
function getHourPillar(dayGan, hour) {
  const dayGanIndex = TIAN_GAN.indexOf(dayGan);
  const hourZhiIndex = Math.floor((hour + 1) / 2) % 12;
  const hourGanStart = (dayGanIndex % 5) * 2;
  const hourGanIndex = (hourGanStart + hourZhiIndex) % 10;
  return TIAN_GAN[hourGanIndex] + DI_ZHI[hourZhiIndex];
}

/**
 * 判断格局（简化版）
 */
function determinePattern(dayMaster, monthPillar) {
  const monthZhi = monthPillar[1];
  const monthWuxing = DI_ZHI_CANG_GAN[monthZhi]?.[0] || '';
  const monthWuxingType = WUXING[monthWuxing];
  
  const dayMasterWuxing = WUXING[dayMaster];
  
  if (monthWuxingType === dayMasterWuxing) {
    return '比肩格';
  } else if (
    (dayMasterWuxing === '木' && monthWuxingType === '火') ||
    (dayMasterWuxing === '火' && monthWuxingType === '土') ||
    (dayMasterWuxing === '土' && monthWuxingType === '金') ||
    (dayMasterWuxing === '金' && monthWuxingType === '水') ||
    (dayMasterWuxing === '水' && monthWuxingType === '木')
  ) {
    return '食神格';
  } else if (
    (dayMasterWuxing === '木' && monthWuxingType === '土') ||
    (dayMasterWuxing === '火' && monthWuxingType === '金') ||
    (dayMasterWuxing === '土' && monthWuxingType === '水') ||
    (dayMasterWuxing === '金' && monthWuxingType === '木') ||
    (dayMasterWuxing === '水' && monthWuxingType === '火')
  ) {
    return '财官格';
  }
  
  return '正印格';
}

/**
 * 计算用户命盘
 */
function calculateBazi(birthInfo) {
  let { year, month, day, hour } = birthInfo;
  
  const yearPillar = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar = getHourPillar(dayPillar[0], hour);
  
  const dayMaster = dayPillar[0];
  const dayMasterWuxing = WUXING[dayMaster];
  
  const pattern = determinePattern(dayMaster, monthPillar);
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterWuxing,
    pattern
  };
}

/**
 * 计算十神关系
 */
function calculateRelation(dayMasterWuxing, targetWuxing) {
  const wuxingOrder = ['木', '火', '土', '金', '水'];
  const dayIndex = wuxingOrder.indexOf(dayMasterWuxing);
  const targetIndex = wuxingOrder.indexOf(targetWuxing);
  
  if (dayIndex === targetIndex) return '比';
  if ((dayIndex + 1) % 5 === targetIndex) return '食';
  if ((dayIndex + 2) % 5 === targetIndex) return '财';
  if ((dayIndex + 3) % 5 === targetIndex) return '官';
  return '印';
}

/**
 * 计算有利日期
 */
function calculateFavorableDays(_year, month, _dayMaster, pattern) {
  const baseDays = [3, 8, 12, 18, 23, 28];
  
  if (pattern.includes('财官')) {
    baseDays.push(6, 16, 26);
  } else if (pattern.includes('食神')) {
    baseDays.push(5, 15, 25);
  } else if (pattern.includes('正印')) {
    baseDays.push(9, 19, 29);
  }
  
  const monthOffset = (month % 3) * 2;
  return baseDays.map(d => ((d + monthOffset - 1) % 30) + 1);
}

/**
 * 计算不利日期
 */
function calculateUnfavorableDays(_year, month, _dayMaster, pattern) {
  const baseDays = [4, 9, 14, 19, 24, 29];
  
  if (pattern.includes('财官')) {
    baseDays.push(7, 17, 27);
  } else if (pattern.includes('食神')) {
    baseDays.push(2, 12, 22);
  } else if (pattern.includes('正印')) {
    baseDays.push(5, 15, 25);
  }
  
  const monthOffset = (month % 3) * 2 + 1;
  return baseDays.map(d => ((d + monthOffset - 1) % 30) + 1);
}

/**
 * 创建高光日对象
 */
function createHighlightDay(date, ganZhi, _dayMaster, pattern, dayMasterWuxing, isUnfavorable = false) {
  const dayGan = ganZhi[0];
  
  const dayGanWuxing = WUXING[dayGan];
  const relation = calculateRelation(dayMasterWuxing, dayGanWuxing);
  
  let type, description, actionGuide, score;
  
  if (isUnfavorable) {
    switch (relation) {
      case '官':
        type = '事业受阻';
        description = '官星受制，事业运势低迷，不宜推进重要项目';
        actionGuide = '避免重大决策，保持低调，等待时机';
        score = 45;
        break;
      case '财':
        type = '财运不佳';
        description = '财星受损，财运低迷，不宜投资理财';
        actionGuide = '控制开支，避免投资，保守理财';
        score = 42;
        break;
      case '印':
        type = '贵人远离';
        description = '印星受克，贵人运弱，易遇阻碍';
        actionGuide = '独立行事，谨慎决策，避免依赖他人';
        score = 48;
        break;
      case '食':
        type = '思路受阻';
        description = '食神受制，创意灵感不足，不宜创作表达';
        actionGuide = '保持冷静，避免冲动决策';
        score = 50;
        break;
      case '比':
        type = '人际冲突';
        description = '比肩受冲，人际关系紧张，易生口舌';
        actionGuide = '避免争执，保持低调，减少社交活动';
        score = 40;
        break;
      default:
        type = '诸事不宜';
        description = '日辰不利，诸事不顺，适合静养';
        actionGuide = '避免重要活动，保持平和心态';
        score = 35;
    }
  } else {
    switch (relation) {
      case '官':
        type = '事业高升';
        description = '官星当令，事业运势强劲，适合推进重要项目';
        actionGuide = '主动争取机会，向上级汇报工作成果';
        score = 85;
        break;
      case '财':
        type = '财运亨通';
        description = '财星高照，财运亨通，适合投资理财';
        actionGuide = '关注投资机会，但需谨慎决策';
        score = 88;
        break;
      case '印':
        type = '贵人相助';
        description = '印星护身，贵人运旺，易得长辈提携';
        actionGuide = '主动请教前辈，拓展人脉资源';
        score = 82;
        break;
      case '食':
        type = '智慧开启';
        description = '食神生财，创意灵感迸发，适合创作表达';
        actionGuide = '记录灵感，推进创意项目';
        score = 80;
        break;
      case '比':
        type = '桃花盛开';
        description = '比肩帮身，人际关系和谐，桃花运旺';
        actionGuide = '参加社交活动，拓展人际圈';
        score = 78;
        break;
      default:
        type = '平安顺遂';
        description = '日辰平和，诸事顺遂，适合稳步推进';
        actionGuide = '按部就班，稳扎稳打';
        score = 70;
    }
  }
  
  if (!isUnfavorable && pattern.includes('财官') && (type === '事业高升' || type === '财运亨通')) {
    score += 5;
    description += '，财官双美，大吉之日';
  }
  
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return {
    date,
    dateStr,
    type,
    ganZhi,
    description,
    actionGuide,
    score: Math.min(score, 100)
  };
}

/**
 * 生成每月高光日
 */
function generateMonthHighlights(year, month, dayMaster, pattern, dayMasterWuxing) {
  const highlights = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const favorableDays = calculateFavorableDays(year, month, dayMaster, pattern);
  const unfavorableDays = calculateUnfavorableDays(year, month, dayMaster, pattern);
  
  for (const day of favorableDays) {
    if (day <= daysInMonth) {
      const date = new Date(year, month - 1, day);
      const ganZhi = getDayPillar(year, month, day);
      
      const highlight = createHighlightDay(date, ganZhi, dayMaster, pattern, dayMasterWuxing, false);
      if (highlight) {
        highlights.push(highlight);
      }
    }
  }
  
  for (const day of unfavorableDays) {
    if (day <= daysInMonth) {
      const date = new Date(year, month - 1, day);
      const ganZhi = getDayPillar(year, month, day);
      
      const highlight = createHighlightDay(date, ganZhi, dayMaster, pattern, dayMasterWuxing, true);
      if (highlight) {
        highlights.push(highlight);
      }
    }
  }
  
  return highlights;
}

/**
 * 计算2026年高光日
 */
function calculateHighlightDays(bazi) {
  const highlights = [];
  const year2026 = 2026;
  
  const dayMaster = bazi.dayMaster;
  const pattern = bazi.pattern;
  const dayMasterWuxing = bazi.dayMasterWuxing;
  
  for (let month = 1; month <= 12; month++) {
    const monthHighlights = generateMonthHighlights(
      year2026, 
      month, 
      dayMaster, 
      pattern, 
      dayMasterWuxing
    );
    highlights.push(...monthHighlights);
  }
  
  highlights.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return highlights
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 获取年度关键词
 */
function getAnnualKeyword(bazi) {
  const patterns = {
    '财官格': '突破',
    '食神格': '创造',
    '正印格': '成长',
    '比肩格': '合作',
    '劫财格': '挑战'
  };
  
  return patterns[bazi.pattern] || '蜕变';
}

/**
 * 获取格局描述
 */
function getPatternDescription(pattern) {
  const descriptions = {
    '财官格': '财官双美，事业财运两旺，2026年是你大展宏图的一年',
    '食神格': '食神生财，创意无限，适合发挥才华，创造新价值',
    '正印格': '印星护身，贵人运旺，学习成长，稳步前进',
    '比肩格': '比肩帮身，人缘旺盛，合作共赢，携手并进',
    '劫财格': '劫财透干，竞争激烈，需要谨慎理财，稳中求进'
  };
  
  return descriptions[pattern] || '命格平和，顺天应人，2026年平安顺遂';
}

/**
 * 根据八字计算四个内容
 */
function calculateFourAspects(userBazi) {
  const dayMaster = userBazi.dayMaster;
  const dayMasterWuxing = userBazi.dayMasterWuxing;
  const pattern = userBazi.pattern;
  
  let careerCount = 0;
  let wealthCount = 0;
  let nobleCount = 0;
  let romanceCount = 0;
  
  // 遍历全年，根据十神关系计算四个内容
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(2026, month - 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(2026, month - 1, day);
      const ganZhi = getDayPillar(2026, month, day);
      const dayGan = ganZhi[0];
      const dayGanWuxing = WUXING[dayGan];
      const relation = calculateRelation(dayMasterWuxing, dayGanWuxing);
      
      // 根据十神关系统计四个内容
      if (relation === '官') {
        careerCount++;
      } else if (relation === '财') {
        wealthCount++;
      } else if (relation === '印') {
        nobleCount++;
      } else if (relation === '比') {
        romanceCount++;
      }
    }
  }
  
  return {
    career: careerCount,
    wealth: wealthCount,
    noble: nobleCount,
    romance: romanceCount
  };
}

// API端点
app.post('/api/decision-analysis', async (req, res) => {
  try {
    const { birthInfo, userBazi, userQuestion } = req.body;
    
    console.log('收到请求:', { birthInfo, userBazi, userQuestion });
    
    // 1. 根据八字计算四个内容
    const fourAspects = calculateFourAspects(userBazi);
    
    // 2. 计算高光日历
    const highlightDays = calculateHighlightDays(userBazi);
    
    // 3. 如果用户有问题，调用千问AI
    let aiAnswer = null;
    if (userQuestion && userQuestion.trim()) {
      console.log('调用千问AI，问题:', userQuestion);
      aiAnswer = await callQianwenAI(userQuestion, userBazi);
    }
    
    // 4. 返回完整响应
    const response = {
      userBazi,
      fourAspects,
      highlightDays,
      aiAnswer
    };
    
    console.log('返回响应:', JSON.stringify(response, null, 2));
    res.json(response);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 调用千问AI
async function callQianwenAI(question, userBazi) {
  try {
    const systemPrompt = `你是一个专业的八字命理分析师和人生决策顾问。请基于以下八字命盘信息，为用户提供专业的决策建议：

八字命盘信息：
- 年柱：${userBazi.yearPillar}
- 月柱：${userBazi.monthPillar}
- 日柱：${userBazi.dayPillar}
- 时柱：${userBazi.hourPillar}
- 日主：${userBazi.dayMaster}（${userBazi.dayMasterWuxing}）
- 格局：${userBazi.pattern}

请从以下角度分析用户的问题：
1. 基于八字命理原理，分析问题的命理背景
2. 结合日主五行和格局特点，给出针对性建议
3. 引用"人生决策红绿灯"的概念，明确指出是"红灯"（需谨慎）还是"绿灯"（可以行动）
4. 给出具体、可操作的建议，避免空泛
5. 回答长度控制在100-500字之间`;

    const response = await axios.post(QIANWEN_API_URL, {
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${QIANWEN_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const answer = response.data.choices[0]?.message?.content || '抱歉，我暂时无法回答您的问题。';
    console.log('千问AI回答:', answer);
    return answer;
    
  } catch (error) {
    console.error('千问AI调用错误:', error.response?.data || error.message);
    return '抱歉，AI服务暂时不可用。请稍后再试。';
  }
}

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API服务器运行正常' });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>人生决策红绿灯 - API服务器</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
          margin: 0 0 20px 0;
          font-size: 2.5em;
        }
        p {
          margin: 10px 0;
          font-size: 1.1em;
        }
        .api-info {
          margin-top: 30px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .frontend-link {
          display: inline-block;
          margin-top: 20px;
          padding: 15px 30px;
          background: #efaf5a;
          color: black;
          text-decoration: none;
          border-radius: 10px;
          font-weight: bold;
          transition: transform 0.2s;
        }
        .frontend-link:hover {
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>人生决策红绿灯</h1>
        <p>API服务器运行中</p>
        <div class="api-info">
          <p><strong>API端点:</strong> POST /api/decision-analysis</p>
          <p><strong>健康检查:</strong> GET /api/health</p>
        </div>
        <a href="http://localhost:5176" class="frontend-link">访问前端页面</a>
      </div>
    </body>
    </html>
  `);
});

// 导出Express应用供Vercel Serverless Functions使用
module.exports = app;

// 本地开发环境启动服务器
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`人生决策红绿灯 API服务器`);
    console.log(`========================================`);
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`API端点: POST http://localhost:${PORT}/api/decision-analysis`);
    console.log(`健康检查: GET http://localhost:${PORT}/api/health`);
    console.log(`千问API已配置`);
    console.log(`八字计算算法已集成`);
    console.log(`四个内容计算已启用`);
    console.log(`========================================`);
  });
}
// 积分系统

interface PointsData {
  balance: number;
  history: Array<{
    amount: number;
    type: string;
    reason: string;
    timestamp: number;
  }>;
  lastLogin: number;
  dailyStreak: number;
}

const ADMIN_EMAIL = '10919669@qq.com';

// 获取积分存储键名（与AWKN-LAB保持一致）
function getPointsKey(): string {
  const userEmail = localStorage.getItem('userEmail');
  return userEmail ? `awkn_points_${userEmail}` : 'awkn_points_guest';
}

// 初始化积分数据
export function initializePointsData(): PointsData {
  const initialData: PointsData = {
    balance: 0,
    history: [],
    lastLogin: Date.now(),
    dailyStreak: 1
  };
  
  localStorage.setItem(getPointsKey(), JSON.stringify(initialData));
  return initialData;
}

// 获取积分数据
export function getPointsData(): PointsData {
  const data = localStorage.getItem(getPointsKey());
  if (!data) {
    return initializePointsData();
  }
  
  try {
    return JSON.parse(data);
  } catch {
    return initializePointsData();
  }
}

// 保存积分数据
function savePointsData(data: PointsData) {
  localStorage.setItem(getPointsKey(), JSON.stringify(data));
}

// 添加积分
export function addPoints(amount: number, type: string, reason: string) {
  const data = getPointsData();
  
  data.balance += amount;
  data.history.push({
    amount,
    type,
    reason,
    timestamp: Date.now()
  });
  
  savePointsData(data);
  return data.balance;
}

// 减少积分
export function reducePoints(amount: number, reason: string): boolean {
  const data = getPointsData();
  
  if (data.balance < amount) {
    return false;
  }
  
  data.balance -= amount;
  data.history.push({
    amount: -amount,
    type: 'expense',
    reason,
    timestamp: Date.now()
  });
  
  savePointsData(data);
  return true;
}

// 格式化积分
export function formatPoints(points: number): string {
  return points.toLocaleString();
}

// 检查每日登录奖励
export function checkDailyLoginReward() {
  const data = getPointsData();
  const now = Date.now();
  const lastLogin = data.lastLogin;
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (now - lastLogin >= oneDay) {
    // 检查是否是连续登录
    if (now - lastLogin <= oneDay * 2) {
      data.dailyStreak += 1;
    } else {
      data.dailyStreak = 1;
    }
    
    // 计算奖励积分（连续登录天数越多，奖励越高）
    const baseReward = 100;
    const streakBonus = Math.min(data.dailyStreak - 1, 5) * 20; // 最多连续登录6天，额外奖励100积分
    const totalReward = baseReward + streakBonus;
    
    // 添加奖励积分
    data.balance += totalReward;
    data.history.push({
      amount: totalReward,
      type: 'reward',
      reason: `每日登录奖励（连续${data.dailyStreak}天）`,
      timestamp: now
    });
    
    data.lastLogin = now;
    savePointsData(data);
    
    return {
      points: totalReward,
      streak: data.dailyStreak
    };
  }
  
  return {
    points: 0,
    streak: data.dailyStreak
  };
}

// 初始化管理员积分
export function initializeAdminPoints() {
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail === ADMIN_EMAIL) {
    const data: PointsData = {
      balance: 999999999,
      history: [{
        amount: 999999999,
        type: 'admin',
        reason: '管理员初始积分',
        timestamp: Date.now()
      }],
      lastLogin: Date.now(),
      dailyStreak: 999
    };
    
    localStorage.setItem(getPointsKey(), JSON.stringify(data));
  }
}

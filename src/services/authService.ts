// 认证服务

// 检查用户是否已登录
export function checkUserLoggedIn(): boolean {
  const userEmail = localStorage.getItem('userEmail');
  return !!userEmail;
}

// 获取用户信息
export function getUserInfo() {
  return {
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole') || 'user'
  };
}

// 检查是否需要显示登录/注册模态框
export function shouldShowAuthModal(): boolean {
  return !checkUserLoggedIn();
}

// 模拟登录（实际项目中应与后端API交互）
export function login(email: string): boolean {
  // 这里应该是实际的API调用
  // 为了与AWKN-LAB保持兼容，我们使用相同的逻辑
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userRole', 'user');
  return true;
}

// 模拟注册（实际项目中应与后端API交互）
export function register(email: string): boolean {
  // 这里应该是实际的API调用
  // 为了与AWKN-LAB保持兼容，我们使用相同的逻辑
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userRole', 'user');
  return true;
}

// 登出
export function logout() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
}

// 初始化用户状态
export function initializeAuth() {
  // 检查是否有用户信息
  if (checkUserLoggedIn()) {
    console.log('用户已登录:', getUserInfo().email);
    return true;
  } else {
    console.log('用户未登录，需要显示注册页面');
    return false;
  }
}
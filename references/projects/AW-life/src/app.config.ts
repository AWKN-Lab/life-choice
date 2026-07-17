export default {
  pages: [
    'pages/home/index',
    'pages/consult/index',
    'pages/result/index',
    'pages/record/index',
    'pages/membership/index',
    'pages/profile/index',
    'pages/growth/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0a0a0a',
    navigationBarTitleText: '决策参考',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#c9a962',
    backgroundColor: '#0a0a0a',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/home/index', text: '首页' },
      { pagePath: 'pages/consult/index', text: '问事' },
      { pagePath: 'pages/record/index', text: '记录' },
      { pagePath: 'pages/profile/index', text: '我的' },
    ],
  },
  requiredPrivateInfos: ['getLocation', 'chooseLocation'],
  permission: {
    'scope.userLocation': {
      desc: '位置信息仅用于真太阳时校正，保护隐私',
    },
  },
  usingComponents: {},
};

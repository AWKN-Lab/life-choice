import { View, Text, Button, Image } from '@tarojs/components';
import { Component } from 'react';
import Taro from '@tarojs/taro';
import './index.scss';

const GOLD = '#c9a962';
const DARK_BG = '#0a0a0a';

export default class Home extends Component {
  state = {
    nickname: '用户',
    services: [
      { key: 'liuren', title: '六壬断事', desc: '事件决策', icon: '⚔️' },
      { key: 'ziping', title: '子平命理', desc: '运势分析', icon: '📊' },
      { key: 'liuyao', title: '六爻占卜', desc: '卦象解读', icon: '🔮' },
    ],
  };

  goService(key: string) {
    Taro.navigateTo({ url: `/pages/consult/index?type=${key}` });
  }

  goGrowth() {
    Taro.navigateTo({ url: '/pages/growth/index' });
  }

  goMembership() {
    Taro.navigateTo({ url: '/pages/membership/index' });
  }

  render() {
    const { services } = this.state;
    return (
      <View className="home-page">
        {/* 顶部导航 */}
        <View className="topbar">
          <Text className="logo-text">人生决策宗师</Text>
          <View className="topbar-right">
            <Text className="vip-badge" onClick={this.goMembership}>会员</Text>
          </View>
        </View>

        {/* Hero区 */}
        <View className="hero">
          <Text className="hero-title">先把问题想清楚，再让答案有方向</Text>
          <Text className="hero-sub">基于六壬智慧 · 真太阳时校正 · AI解读</Text>
          <Button className="hero-cta" onClick={() => this.goService('liuren')}>
            立即提出我的问题
          </Button>
          <View className="trust-tags">
            <Text>隐私保护</Text>
            <Text>·</Text>
            <Text>免费看初步判断</Text>
          </View>
        </View>

        {/* 服务入口 */}
        <View className="services">
          <Text className="section-title">选择你的决策场景</Text>
          <View className="service-grid">
            {services.map((s) => (
              <View key={s.key} className="service-card" onClick={() => this.goService(s.key)}>
                <Text className="service-icon">{s.icon}</Text>
                <Text className="service-title">{s.title}</Text>
                <Text className="service-desc">{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 增长入口 */}
        <View className="growth-banner" onClick={this.goGrowth}>
          <View>
            <Text className="banner-title">专属福利 · 邀请有礼</Text>
            <Text className="banner-desc">邀请好友获取免费咨询次数</Text>
          </View>
          <Text className="banner-arrow">→</Text>
        </View>
      </View>
    );
  }
}

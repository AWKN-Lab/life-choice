import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.scss';

const REWARDS = [
  { invites: 1, reward: '免费咨询×1' },
  { invites: 3, reward: '7天会员体验' },
  { invites: 5, reward: '月卡会员' },
  { invites: 10, reward: '季卡+专属顾问' },
];

export default function Growth() {
  const [copied, setCopied] = useState(false);
  const code = '待生成';

  const copyLink = () => {
    const link = `https://awkn.life/?ref=${code}`;
    Taro.setClipboardData({ data: link }).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <View className="growth-page">
      <Text className="page-title">邀请有礼</Text>
      <View className="invite-code-card">
        <Text className="label">你的专属邀请码</Text>
        <Text className="code-text">{code}</Text>
        <View className="copy-btn" onClick={copyLink}>
          <Text>{copied ? '已复制' : '复制链接'}</Text>
        </View>
      </View>
      <Text className="section-title">邀请奖励</Text>
      {REWARDS.map((r) => (
        <View key={r.invites} className="reward-row">
          <Text>邀请{r.invites}人</Text>
          <Text>{r.reward}</Text>
        </View>
      ))}
    </View>
  );
}

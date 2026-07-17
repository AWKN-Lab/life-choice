import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

export default function Profile() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    Taro.getStorage({ key: 'userInfo' }).then(({ data }) => setUser(data)).catch(() => null);
  }, []);

  const items = [
    { label: '会员中心', url: '/pages/membership/index' },
    { label: '咨询记录', url: '/pages/record/index' },
    { label: '增长福利', url: '/pages/growth/index' },
  ];

  return (
    <View className="profile-page">
      <View className="avatar-section">
        <View className="avatar-ring">
          <Text className="avatar-text">{user?.nickname?.[0] || '游'}</Text>
        </View>
        <Text className="nickname">{user?.nickname || '游客'}</Text>
      </View>
      <View className="menu-list">
        {items.map((item) => (
          <View key={item.label} className="menu-item" onClick={() => item.url && Taro.navigateTo({ url: item.url })}>
            <Text>{item.label}</Text>
            <Text className="arrow">›</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

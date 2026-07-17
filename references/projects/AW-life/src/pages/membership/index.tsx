import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

const PLANS = [
  { id: 'monthly', title: '轻陪伴月卡', price: '¥99', features: ['无限次咨询', '每日运势推送', '专属顾问'] },
  { id: 'yearly', title: '年卡会员', price: '¥699', features: ['包年无限次', '优先专家', '年度复盘'] },
  { id: 'single', title: '单次深推', price: '¥29', features: ['当前问题深度分析', '详细报告'] },
];

export default function Membership() {
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Taro.getStorage({ key: 'membership' }).then(({ data }) => { if (data) setCurrent(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleBuy = async (planId: string) => {
    try {
      const base = Taro.getStorageSync('API_BASE') || 'http://localhost:30001/api/v1';
      const token = Taro.getStorageSync('token');
      const { data } = await Taro.request({
        url: `${base}/payment/create`,
        method: 'POST',
        header: { Authorization: `Bearer ${token}` },
        data: { plan_id: planId },
      });
      if (data.paymentId) {
        Taro.requestPayment({ ...data.paymentParams });
      }
    } catch { Taro.showToast({ title: '下单失败', icon: 'none' }); }
  };

  return (
    <View className="membership-page">
      <Text className="page-title">会员服务</Text>
      {current && (
        <View className="current-vip">
          <Text className="vip-name">{current.type} 会员</Text>
          <Text className="vip-exp">有效期至 {current.expireDate}</Text>
        </View>
      )}
      <View className="plans">
        {PLANS.map((plan) => (
          <View key={plan.id} className="plan-card">
            <Text className="plan-title">{plan.title}</Text>
            <Text className="plan-price">{plan.price}</Text>
            {plan.features.map((f) => <Text key={f} className="plan-feat">✓ {f}</Text>)}
            <Button className="plan-btn" onClick={() => handleBuy(plan.id)}>立即开通</Button>
          </View>
        ))}
      </View>
    </View>
  );
}

import { View, Text, Input, Picker, Button, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './index.scss';

const GOLD = '#c9a962';

export default function Consult() {
  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState('male');
  const [location, setLocation] = useState('');
  const [birthDate, setBirthDate] = useState('请选择日期');
  const [birthTime, setBirthTime] = useState('12:00');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) {
      Taro.showToast({ title: '请输入您的问题', icon: 'none' });
      return;
    }
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${Taro.getStorageSync('API_BASE') || 'http://localhost:30001/api/v1'}/consult/route`,
        method: 'POST',
        data: { question_text: question, route_type: 'liuren' },
      });
      const recordId = res.data?.record_id;
      Taro.navigateTo({
        url: `/pages/result/index?recordId=${recordId}&question=${encodeURIComponent(question)}`,
      });
    } catch {
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="consult-page">
      <View className="form-card">
        <Text className="form-title">请描述您的问题</Text>
        <Textarea
          className="question-input"
          placeholder="例如：这个合作还能推进吗？"
          placeholderTextColor="#666"
          value={question}
          onInput={(e) => setQuestion(e.detail.value)}
          maxlength={200}
        />
        <View className="form-row">
          <Text className="form-label">性别</Text>
          <Picker mode="selector" range={['男', '女']} onChange={(e) => setGender(e.detail.value === '0' ? 'male' : 'female')}>
            <View className="picker-val">{gender === 'male' ? '男' : '女'}</View>
          </Picker>
        </View>
        <View className="form-row">
          <Text className="form-label">出生地</Text>
          <Input className="form-input" placeholder="如：上海虹口" value={location}
            onInput={(e) => setLocation(e.detail.value)} />
        </View>
        <View className="form-row">
          <Text className="form-label">出生日期</Text>
          <Picker mode="date" onChange={(e) => setBirthDate(e.detail.value)}>
            <View className="picker-val">{birthDate}</View>
          </Picker>
        </View>
        <View className="form-row">
          <Text className="form-label">出生时辰</Text>
          <Picker mode="time" onChange={(e) => setBirthTime(e.detail.value)}>
            <View className="picker-val">{birthTime}</View>
          </Picker>
        </View>
        <Button className="submit-btn" onClick={handleSubmit} loading={loading}>
          {loading ? '分析中…' : '开始分析'}
        </Button>
      </View>
    </View>
  );
}

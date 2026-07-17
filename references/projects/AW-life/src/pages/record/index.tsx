import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

interface Record {
  id: string;
  question: string;
  route_type: string;
  summary_line: string;
  createdAt: string;
}

export default function Record() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const base = Taro.getStorageSync('API_BASE') || 'http://localhost:30001/api/v1';
      const token = Taro.getStorageSync('token');
      const { data } = await Taro.request({
        url: `${base}/consult/records`,
        header: { Authorization: `Bearer ${token}` },
      });
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const goResult = (id: string) => {
    Taro.navigateTo({ url: `/pages/result/index?recordId=${id}` });
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('zh-CN');

  return (
    <View className="record-page">
      <Text className="page-title">咨询记录</Text>
      {records.length === 0 && !loading ? (
        <View className="empty">
          <Text className="empty-icon">📋</Text>
          <Text className="empty-text">暂无记录</Text>
          <Text className="empty-sub">开始第一次咨询吧</Text>
        </View>
      ) : (
        records.map((r) => (
          <View key={r.id} className="record-item" onClick={() => goResult(r.id)}>
            <Text className="record-q">{r.question}</Text>
            <Text className="record-time">{fmt(r.createdAt)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

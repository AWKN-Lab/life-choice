import { View, Text, Button, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import './index.scss';

export default function Result() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { recordId } = Taro.getCurrentPages().pop()?.options || {};
    if (recordId) fetchResult(recordId);
    else { setLoading(false); }
  }, []);

  const fetchResult = async (recordId: string) => {
    try {
      const base = Taro.getStorageSync('API_BASE') || 'http://localhost:30001/api/v1';
      const { data } = await Taro.request({ url: `${base}/consult/result/${recordId}` });
      setResult(data);
    } catch {
      setResult({ summary_line: '网络异常', summary_body: '请检查网络' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="result-page">
      {loading ? (
        <View className="loading-wrap"><Text className="loading">分析中…</Text></View>
      ) : (
        <>
          <View className="result-card">
            <Text className="summary-line">{result?.summary_line || '—'}</Text>
            <Text className="summary-body">{result?.summary_body || ''}</Text>
            {result?.risks?.length > 0 && (
              <View className="section">
                <Text className="section-title">风险提示</Text>
                {result.risks.map((r: string, i: number) => (
                  <Text key={i} className="risk-item">⚠️ {r}</Text>
                ))}
              </View>
            )}
            {result?.actions?.length > 0 && (
              <View className="section">
                <Text className="section-title">建议</Text>
                {result.actions.map((a: string, i: number) => (
                  <Text key={i} className="action-item">→ {a}</Text>
                ))}
              </View>
            )}
          </View>
          <View className="action-bar-fixed">
            <Button className="btn-dark">生成海报</Button>
            <Button className="btn-gold">深入推演</Button>
          </View>
        </>
      )}
    </View>
  );
}

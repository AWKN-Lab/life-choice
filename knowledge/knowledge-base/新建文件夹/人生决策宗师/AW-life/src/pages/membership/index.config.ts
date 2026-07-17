export default defineComponentConfig({
  navigationBarTitleText: '会员中心',
  navigationBarBackgroundColor: '#0a0a0a',
});

declare module '@tarojs/taro' {
  interface TaroStatic {
    createCanvasContext: (id: string): any;
  }
}

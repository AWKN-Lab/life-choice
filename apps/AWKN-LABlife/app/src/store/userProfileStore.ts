import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 用户个人信息接口 */
export interface UserProfile {
  /** 用户 ID（用于 Feature Flag 哈希分桶） */
  userId?: string;
  /** 出生日期 (YYYY-MM-DD) */
  birthDate?: string;
  /** 出生时辰 (0-23) */
  birthHour?: number;
  /** 出生分 (0-59) */
  birthMinute?: number;
  /** 性别 */
  gender?: 'male' | 'female';
  /** 所在城市（真太阳时校正用） */
  city?: string;
  /** 取名用：姓氏 */
  surname?: string;
  /** 取名用：家长期望 */
  parentWish?: string;
  /** 取名用：避讳字 */
  avoidChars?: string;
  /** 是否已看过期望管理开场白（P1-3） */
  hasSeenExpectationManagement?: boolean;
  /** 最后更新时间 */
  updatedAt?: string;
}

interface UserProfileState {
  /** 用户档案数据 */
  profile: UserProfile;

  /** 保存档案 */
  saveProfile: (data: Partial<UserProfile>) => void;

  /** 清除档案 */
  clearProfile: () => void;

  /** 获取完整档案 */
  getProfile: () => UserProfile;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      /** 默认空档案 */
      profile: {},

      /** 保存档案（合并更新） */
      saveProfile: (data: Partial<UserProfile>) => {
        const currentProfile = get().profile;
        set({
          profile: {
            ...currentProfile,
            ...data,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      /** 清除档案 */
      clearProfile: () => {
        set({ profile: {} });
      },

      /** 获取档案 */
      getProfile: () => {
        return get().profile;
      },
    }),
    {
      name: 'user-profile-storage',
    }
  )
);

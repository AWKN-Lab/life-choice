import { useState } from 'react';
import { useThemeStore, UI_STYLES } from '@/store/themeStore';

export function StyleSwitcher() {
  const { style, setStyle, mode, toggle } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={() => setOpen(!open)}
        className="style-switcher-trigger"
        title="切换风格"
      >
        <span className="material-symbols-outlined">palette</span>
      </button>

      {open && (
        <div className="style-switcher-panel">
          <div className="style-switcher-header">
            <span>界面风格</span>
            <button onClick={() => setOpen(false)} className="close-btn">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="style-list">
            {UI_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setStyle(s.value);
                }}
                className={`style-item ${style === s.value ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined">{s.icon}</span>
                <div className="style-info">
                  <span className="style-label">{s.label}</span>
                  <span className="style-desc">{s.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="style-switcher-footer">
            <button onClick={toggle} className="mode-toggle">
              <span className="material-symbols-outlined">
                {mode === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{mode === 'dark' ? '浅色模式' : '深色模式'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ExchangeDrawer — 兑换/交互 Drawer
 * 接 metaphysicsConflict 降级 + safetyCopyCheck 文案扫描
 */

import { useMemo } from 'react';
import { checkUnsafeCopy } from '../../utils/safetyCopyCheck';
import {
  downgradeMetaphysicsIfConflict,
  type MetaphysicsHint,
} from '../../utils/metaphysicsConflict';
import type { PhasePoint } from '../../types/lifekline';

export interface ExchangeDrawerProps {
  open: boolean;
  hint?: MetaphysicsHint;
  phasePoint?: PhasePoint;
  copy: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ExchangeDrawer({ open, hint, phasePoint, copy, onConfirm, onClose }: ExchangeDrawerProps) {
  const downgraded = useMemo(() => downgradeMetaphysicsIfConflict(hint, phasePoint), [hint, phasePoint]);
  const unsafe = useMemo(() => checkUnsafeCopy(copy), [copy]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="exchange-drawer"
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-surface-container p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2">确认兑换</h2>

        {downgraded && (
          <div className="rounded bg-amber-50 p-2 text-sm text-amber-800" data-testid="metaphysics-hint">
            <span className="font-medium">命理副证（confidence {downgraded.confidence}）：</span>
            {downgraded.hintText}
          </div>
        )}

        <p className="my-3 text-sm text-gray-700">{copy}</p>

        {unsafe.length > 0 && (
          <div className="rounded bg-red-50 p-2 text-xs text-red-700" data-testid="unsafe-copy-warning">
            文案命中禁词：{unsafe.join('、')}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm">
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={unsafe.length > 0}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-on-surface disabled:opacity-50"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExchangeDrawer;

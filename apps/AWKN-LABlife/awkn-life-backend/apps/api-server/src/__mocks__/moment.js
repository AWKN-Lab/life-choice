/**
 * moment 空mock —— 解决 winston-daily-rotate-file 间接依赖 moment
 * 但项目未安装 moment 导致 jest 无法加载 logger.ts 的问题。
 * 仅用于 jest 测试环境，不影响运行时。
 *
 * file-stream-rotator 会调用 moment() 作为函数，并链式访问 .format()/.local()/.add() 等方法，
 * 用 Proxy 兜底所有属性访问和方法调用，返回自身或合理默认值。
 */

function createMomentChainable() {
  const chainable = {
    format: () => '2026-01-01',
    add: () => chainable,
    subtract: () => chainable,
    diff: () => 0,
    isValid: () => true,
    toDate: () => new Date(),
    local: () => chainable,
    utc: () => chainable,
    unix: () => Math.floor(Date.now() / 1000),
    valueOf: () => Date.now(),
    isBefore: () => false,
    isAfter: () => false,
    isSame: () => true,
  };
  return chainable;
}

const momentMock = new Proxy(function () {}, {
  apply: () => createMomentChainable(),
  construct: () => createMomentChainable(),
  get: (target, prop) => {
    if (prop === 'locale') return () => 'en';
    if (prop === 'utc') return () => createMomentChainable();
    if (prop === 'now') return () => Date.now();
    if (prop === 'default') return momentMock;
    if (prop === '__esModule') return true;
    if (typeof prop === 'symbol') return undefined;
    return () => createMomentChainable();
  },
});

module.exports = momentMock;
module.exports.default = momentMock;

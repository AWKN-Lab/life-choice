import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  key: string;
  question: string;
  answer: string;
}

const FAQS_CN: FAQItem[] = [
  {
    key: 'interpret',
    question: '如何解读命理分析结果？',
    answer: '命理分析系统推断的是先天运势倾向，而非确定性结论。三个因素塑造一个人的实际经历：本命盘、"地运"（时代与社会环境）和"人运"（个人决策）。地运非个人所能控制，而人运取决于你在关键时刻的反应和选择。"趋吉避凶"的本质，就是在了解运势倾向后，主动优化决策，追求更优结果。',
  },
  {
    key: 'difference',
    question: '与免费算命 App 有什么区别？',
    answer: '大多数算命 App 本质是模板填充——输入生日，输出预设文本，不同用户之间几乎没有区别。人生决策宗师运行多个专业 Agent 并行工作，各自负责排盘、符号提取、跨学派验证和报告合成，融合紫微斗数、八字、奇门遁甲三大系统与 250+ 专用工具，每一步推理透明可见。',
  },
  {
    key: 'readable',
    question: '不懂命理术语能看懂吗？',
    answer: '报告为普通用户设计，所有命理术语都翻译为直白语言。结构化布局——核心结论、详细分析和行动建议——读起来像标准咨询报告。',
  },
  {
    key: 'ai-understand',
    question: 'AI 真的能理解主观的"命运"问题吗？',
    answer: '人生决策宗师的定位是决策支持工具，而非算命预测。系统从精选知识库推理，同时整合实时网络数据作为补充参考。它帮助你系统评估当前处境，识别被忽略的变量，构建多视角思维框架。最终决定权始终在你手中。',
  },
  {
    key: 'privacy',
    question: '我的生辰等隐私数据安全吗？',
    answer: '我们采用双重加密传输与存储，执行严格访问控制和身份验证，定期进行安全评估。报告生成后，个人身份信息匿名化处理——仅保留命盘结构和推理输出用于系统优化。用户数据绝不向第三方出售。',
  },
  {
    key: 'what-is',
    question: '什么是八字和紫微斗数？',
    answer: '八字（四柱命理）约形成于宋代，通过天干地支和阴阳五行框架解读出生时间。紫微斗数同样起源于北宋，由中国古代星象学演化而来。两者均是最广泛实践的命理分析系统，经过千年传承完善。人生决策宗师融合两大系统及奇门遁甲，通过多学派交叉验证实现更全面分析。',
  },
  {
    key: 'schools',
    question: '支持哪些命理学派？',
    answer: '目前支持：紫微斗数（钦天四化体系）、八字（子平法）、奇门遁甲。系统通过交叉验证降低单学派解读偏差，并采用概率模型调和不同学派之间的分歧结论。',
  },
  {
    key: 'report',
    question: '分析报告包含哪些内容？',
    answer: '每份报告包含：基础命盘结构解读、大运与流年趋势分析、针对你具体问题的定向推断、多学派交叉验证结论、基于分析的可操作建议。所有推理步骤在报告中均可追溯。',
  },
];

const FAQS_EN: FAQItem[] = [
  {
    key: 'interpret',
    question: 'How should I interpret the results of a destiny analysis?',
    answer: 'What a destiny analysis system infers is the tendency of one\'s innate fortune, not a deterministic conclusion. Three factors shape a person\'s actual experience: the natal chart, "Earth Luck" (Di Yun), and "Human Luck" (Ren Yun). Earth Luck relates to the era and social context, which is beyond individual control. Human Luck depends on one\'s responses and decisions at critical moments. The concept of "seeking fortune and avoiding misfortune" is essentially about proactively optimizing your decisions after understanding your fortune tendencies.',
  },
  {
    key: 'difference',
    question: 'How is this different from free fortune-telling apps?',
    answer: 'Most fortune-telling apps are essentially template fillers — enter a birthday, get pre-written text that barely changes between users. Our system runs multiple specialized agents simultaneously, each responsible for charting, symbol extraction, cross-school validation, and report synthesis. It combines Ziwei Doushu, BaZi, and Qi Men Dun Jia with 250+ custom chart tools, and every reasoning step is transparently visible.',
  },
  {
    key: 'readable',
    question: 'I\'m not familiar with metaphysics terms — can I still understand the report?',
    answer: 'Yes. Reports are designed for non-specialist readers. All metaphysics terminology is translated into plain language. The structured layout — key conclusions, detailed analysis, and actionable recommendations — reads like a standard consulting report.',
  },
  {
    key: 'ai-understand',
    question: 'Can AI really understand subjective "destiny" questions?',
    answer: 'The system is positioned as a decision-support tool, not a fortune predictor. It reasons from a rigorously curated knowledge base while incorporating real-time web data as supplementary reference. It helps you systematically assess your situation, identify overlooked variables, and build a multi-perspective thinking framework. The final decision always remains yours.',
  },
  {
    key: 'privacy',
    question: 'Is my birth date and other private data safe?',
    answer: 'We use dual encryption for transmission and storage, enforce strict access controls and authentication, and conduct regular security assessments. After report generation, personal identity information is anonymized — only chart structures and reasoning outputs are retained for system optimization. User data is never sold to third parties.',
  },
  {
    key: 'what-is',
    question: 'What are Ziwei Doushu and BaZi?',
    answer: 'BaZi (Four Pillars of Destiny) emerged around the Song Dynasty, interpreting birth time through Heavenly Stems and Earthly Branches within the Yin-Yang Five Elements framework. Ziwei Doushu also originated in the Northern Song, evolving from ancient Chinese astrology. Both are among the most widely practiced destiny analysis systems, refined over a thousand years. Our system integrates both plus Qi Men Dun Jia, using multi-school cross-validation for more comprehensive analysis.',
  },
  {
    key: 'schools',
    question: 'Which metaphysics schools are supported?',
    answer: 'Currently supported: Ziwei Doushu (Qintian Four Transformations system), BaZi (Four Pillars), and Qi Men Dun Jia. The system uses cross-validation to reduce single-school interpretation bias and applies probabilistic models to reconcile divergent conclusions between schools.',
  },
  {
    key: 'report',
    question: 'What does an analysis report include?',
    answer: 'Each report contains: foundational chart structure interpretation, major cycle and annual trend analysis, targeted inference for your specific question, multi-school cross-validation conclusions, and actionable recommendations based on the analysis. All reasoning steps are traceable within the report.',
  },
];

export default function HomeFAQ() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const faqs = isEnglish ? FAQS_EN : FAQS_CN;
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-lg lg:text-xl font-semibold text-on-surface mb-2">
          {isEnglish ? 'Frequently Asked Questions' : '常见问题'}
        </h2>
        <p className="text-sm text-on-surface/40">
          {isEnglish
            ? 'About our methodology, usage, and data security'
            : '关于方法论、使用方式和数据安全'}
        </p>
      </motion.div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openKey === faq.key;
          return (
            <motion.div
              key={faq.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-xl bg-surface-container-low/40 border border-outline/6 overflow-hidden"
            >
              <button
                onClick={() => toggle(faq.key)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-on-surface/[0.02] transition-colors"
              >
                <span className="text-sm font-medium text-on-surface">{faq.question}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <span
                    className="material-symbols-outlined text-on-surface/40"
                    style={{ fontSize: 20 }}
                  >
                    expand_more
                  </span>
                </motion.span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-on-surface/50 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
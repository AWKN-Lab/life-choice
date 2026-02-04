import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Calendar, Sparkles } from 'lucide-react';

const blogPosts = [
  {
    title: '理解你的人生道路数字',
    excerpt: '发现你核心数字背后的意义，了解它们如何影响你的人生轨迹和决策...',
    image: '/blog-featured.jpg',
    date: '2024年12月15日',
    category: '命理基础',
    featured: true
  },
  {
    title: '关系与命理',
    excerpt: '数字如何影响你的连接，如何通过命理理解人际关系的奥秘...',
    image: '/blog-2.jpg',
    date: '2024年12月10日',
    category: '关系解读',
    featured: false
  },
  {
    title: '事业成功指南',
    excerpt: '通过命理洞察解锁你的职业潜力，找到最适合你的发展道路...',
    image: '/blog-3.jpg',
    date: '2024年12月5日',
    category: '事业运势',
    featured: false
  }
];

export default function Blog() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="blog"
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* 头部 */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
          <div>
            <div 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#efaf5a]/30 bg-[#efaf5a]/10 mb-6 transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#efaf5a]" />
              <span className="text-sm text-[#efaf5a] tracking-wider">命理洞察</span>
            </div>
            
            <h2 
              className={`font-display text-4xl md:text-5xl text-white mb-4 transition-all duration-1000 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              探索<span className="text-gradient-gold">命理智慧</span>
            </h2>
          </div>

          <a 
            href="#" 
            className={`btn-secondary mt-6 md:mt-0 transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            查看全部
          </a>
        </div>

        {/* 博客网格 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 精选文章 */}
          <div 
            className={`group relative rounded-2xl overflow-hidden transition-all duration-1000 delay-400 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <div className="aspect-[4/3] lg:aspect-auto lg:h-full">
              <img
                src={blogPosts[0].image}
                alt={blogPosts[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-[#efaf5a]/20 text-[#efaf5a] text-sm">
                  {blogPosts[0].category}
                </span>
                <span className="flex items-center gap-1 text-white/50 text-sm">
                  <Calendar className="w-4 h-4" />
                  {blogPosts[0].date}
                </span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl text-white mb-3 group-hover:text-[#efaf5a] transition-colors">
                {blogPosts[0].title}
              </h3>
              <p className="text-white/70 mb-4 line-clamp-2">
                {blogPosts[0].excerpt}
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-[#efaf5a] group-hover:gap-4 transition-all">
                阅读更多 <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 其他文章 */}
          <div className="space-y-6">
            {blogPosts.slice(1).map((post, index) => (
              <div
                key={index}
                className={`group card-mystic flex gap-6 transition-all duration-1000 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                }`}
                style={{ transitionDelay: `${500 + index * 100}ms` }}
              >
                <div className="w-32 md:w-48 flex-shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#efaf5a]/20 text-[#efaf5a] text-xs">
                      {post.category}
                    </span>
                    <span className="text-white/40 text-xs">{post.date}</span>
                  </div>
                  <h4 className="font-display text-xl text-white mb-2 group-hover:text-[#efaf5a] transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-white/50 text-sm line-clamp-2 mb-3">
                    {post.excerpt}
                  </p>
                  <a href="#" className="inline-flex items-center gap-2 text-[#efaf5a] text-sm group-hover:gap-3 transition-all">
                    阅读更多 <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * KnowledgeGraph - 知识图谱组件（D3.js 力导向星图）
 * 对标 Pesta：持续漂浮 + 发光节点 + 悬浮高亮联动 + 拖拽
 * 支持嵌套数据结构: { scriptId: { history: [...], daofa: [...] } }
 */
class KnowledgeGraph {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.simulation = null;
    this.svg = null;

    this.groupColors = {
      history: { node: '#efbd8a', glow: '#efbd8a', link: 'rgba(239,189,138,0.25)' },
      daofa:   { node: '#b6c4ff', glow: '#b6c4ff', link: 'rgba(182,196,255,0.25)' }
    };

    this._init();
  }

  _init() {
    this.width = this.container.getBoundingClientRect().width;
    this.height = this.container.getBoundingClientRect().height;

    // 创建 SVG
    this.svg = d3.select(this.container).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block');

    // 发光滤镜定义
    const defs = this.svg.append('defs');

    // 金色发光（历史）
    this._addGlowFilter(defs, 'glow-gold', '#efbd8a');
    // 蓝色发光（道法）
    this._addGlowFilter(defs, 'glow-blue', '#b6c4ff');
    // 金色强发光（悬浮态）
    this._addGlowFilter(defs, 'glow-gold-bright', '#efbd8a', 12);
    // 蓝色强发光（悬浮态）
    this._addGlowFilter(defs, 'glow-blue-bright', '#b6c4ff', 12);

    // Tooltip
    this.tooltip = d3.select(this.container).append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('transition', 'opacity 0.2s')
      .style('z-index', '10')
      .style('max-width', '300px');

    // 窗口 resize
    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _addGlowFilter(defs, id, color, blur = 6) {
    const filter = defs.append('filter')
      .attr('id', id)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', blur)
      .attr('result', 'blur');
    filter.append('feFlood')
      .attr('flood-color', color)
      .attr('flood-opacity', '0.7')
      .attr('result', 'color');
    filter.append('feComposite')
      .attr('in', 'color').attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'glow');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'glow');
    merge.append('feMergeNode').attr('in', 'glow');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  loadData(data) {
    // 清除旧内容
    if (this.svg) this.svg.selectAll('*').remove();
    if (this.tooltip) this.tooltip.html('');
    if (this.simulation) this.simulation.stop();

    const nodes = [];
    const links = [];
    const HIGH_FREQ_IDS = ['fr_h3','fr_h4','fr_h12','fr_d2','fr_d3','ir_h2','ir_h5','ir_d1', 'am_h3', 'wr_d1', 'xh_h5'];

    // 收集所有历史和道法知识点
    const allHistory = [];
    const allDaofa = [];

    // 遍历剧本
    const scriptIds = Object.keys(data);
    scriptIds.forEach(scriptId => {
      const scriptData = data[scriptId];
      if (!scriptData) return;

      // 收集历史知识点
      if (scriptData.history && Array.isArray(scriptData.history)) {
        scriptData.history.forEach(item => {
          allHistory.push({ ...item, scriptId });
        });
      }

      // 收集道法知识点
      if (scriptData.daofa && Array.isArray(scriptData.daofa)) {
        scriptData.daofa.forEach(item => {
          allDaofa.push({ ...item, scriptId });
        });
      }
    });

    // 构建历史节点和连线
    allHistory.forEach((item, idx) => {
      const isHighFreq = HIGH_FREQ_IDS.indexOf(item.id) !== -1;
      nodes.push({
        id: item.id,
        name: item.name,
        content: item.content,
        group: 'history',
        act: item.act,
        scriptId: item.scriptId,
        r: isHighFreq ? 16 : 11,
        isHighFreq: isHighFreq
      });

      // 同组内相邻连线（按剧本分组）
      if (idx > 0) {
        const prev = allHistory[idx - 1];
        if (prev.scriptId === item.scriptId) {
          links.push({ source: prev.id, target: item.id, group: 'history', cross: false });
        }
      }
    });

    // 构建道法节点和连线
    allDaofa.forEach((item, idx) => {
      const isHighFreq = HIGH_FREQ_IDS.indexOf(item.id) !== -1;
      nodes.push({
        id: item.id,
        name: item.name,
        content: item.content,
        group: 'daofa',
        act: item.act,
        scriptId: item.scriptId,
        r: isHighFreq ? 14 : 10,
        isHighFreq: isHighFreq
      });

      // 同组内相邻连线（按剧本分组）
      if (idx > 0) {
        const prev = allDaofa[idx - 1];
        if (prev.scriptId === item.scriptId) {
          links.push({ source: prev.id, target: item.id, group: 'daofa', cross: false });
        }
      }
    });

    // 跨组关联（相同 act + 相同剧本）
    allHistory.forEach(h => {
      allDaofa.forEach(d => {
        if (h.act === d.act && h.scriptId === d.scriptId) {
          links.push({ source: h.id, target: d.id, group: 'cross', cross: true });
        }
      });
    });

    if (nodes.length === 0) {
      console.warn('KnowledgeGraph: No nodes to render');
      return;
    }

    this._buildGraph(nodes, links);
  }

  _buildGraph(nodes, links) {
    const self = this;
    const width = this.width;
    const height = this.height;

    // ★ 核心：alphaTarget(0.3) 永久漂浮动画
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.cross ? 160 : 110))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => d.r + 18))
      .alphaTarget(0.3)   // ← 永久保持运动，不停止！
      .restart();

    // 绘制连线
    const link = this.svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'kg-link')
      .attr('stroke', d => {
        if (d.cross) return 'rgba(255,255,255,0.06)';
        const g = d.source.group || d.group;
        return g === 'history' ? '#efbd8a' : '#b6c4ff';
      })
      .attr('stroke-width', d => d.cross ? 0.5 : 1)
      .attr('stroke-dasharray', d => d.cross ? '4,4' : 'none')
      .attr('stroke-opacity', d => d.cross ? 0.12 : 0.25);

    // 节点组
    const nodeGroup = this.svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', 'grab');

    // 高频考点外圈（在节点圆下面）
    nodeGroup.filter(d => d.isHighFreq)
      .append('circle')
      .attr('r', d => d.r + 5)
      .attr('fill', 'none')
      .attr('stroke', '#ffd700')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.5);

    // 节点圆
    nodeGroup.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => d.group === 'history' ? '#efbd8a' : '#b6c4ff')
      .attr('filter', d => d.group === 'history' ? 'url(#glow-gold)' : 'url(#glow-blue)')
      .attr('opacity', d => d.isHighFreq ? 1 : 0.85);

    // 文字标签
    const text = nodeGroup.append('text')
      .attr('fill', '#cccccc')
      .attr('font-size', d => d.isHighFreq ? '12px' : '11px')
      .attr('font-weight', d => d.isHighFreq ? '700' : '400')
      .attr('font-family', '"Noto Serif SC", serif')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.r + 18)
      .text(d => d.name.length > 7 ? d.name.substring(0, 6) + '…' : d.name);

    // ★ 悬浮交互：节点+连线 高亮联动
    nodeGroup
      .on('mouseover', function(event, d) {
        // 当前节点放大 + 强发光
        d3.select(this).select('circle:nth-child(2)')
          .transition().duration(200)
          .attr('r', d.r + 5)
          .attr('filter', d.group === 'history' ? 'url(#glow-gold-bright)' : 'url(#glow-blue-bright)');

        // 关联连线高亮
        link.filter(l => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          return sid === d.id || tid === d.id;
        })
          .attr('stroke-width', 2.5)
          .attr('stroke-opacity', 1);

        // 非关联节点变暗
        nodeGroup.filter(n => n.id !== d.id)
          .attr('opacity', 0.25);
        text.filter(n => n.id !== d.id)
          .attr('opacity', 0.15);

        // Tooltip
        const catLabel = d.group === 'history' ? '历史' : '道法';
        const catColor = d.group === 'history' ? '#efbd8a' : '#b6c4ff';
        const freqBadge = d.isHighFreq ? '<span style="color:#ffd700;font-size:11px;">★ 中考高频考点</span>' : '';
        const scriptNames = {
          'french_revolution': '法国大革命',
          'industrial_revolution': '蒸汽时代',
          'american_revolution': '美国独立',
          'wuxu_reform': '戊戌变法',
          'xinhai_revolution': '辛亥革命'
        };

        self.tooltip
          .html(`
            <div style="background:rgba(10,14,39,0.95);border:1px solid ${catColor}40;border-radius:10px;padding:12px 16px;backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,0.5);">
              <div style="color:${catColor};font-weight:700;font-size:14px;margin-bottom:4px;">${d.name}</div>
              <div style="color:#c5c5d3;font-size:12px;line-height:1.6;">${d.content || ''}</div>
              <div style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <span style="background:${catColor}20;color:${catColor};padding:2px 8px;border-radius:4px;font-size:10px;">${catLabel}</span>
                <span style="background:rgba(255,255,255,0.08);color:#888;padding:2px 8px;border-radius:4px;font-size:10px;">第${d.act}幕</span>
                <span style="background:rgba(255,255,255,0.08);color:#888;padding:2px 8px;border-radius:4px;font-size:10px;">${scriptNames[d.scriptId] || d.scriptId}</span>
                ${freqBadge}
              </div>
            </div>
          `)
          .style('opacity', '1');
      })
      .on('mousemove', function(event) {
        const rect = self.container.getBoundingClientRect();
        let tx = event.clientX - rect.left + 16;
        let ty = event.clientY - rect.top - 10;
        if (tx + 300 > self.width) tx -= 316;
        self.tooltip
          .style('left', tx + 'px')
          .style('top', ty + 'px');
      })
      .on('mouseout', function() {
        // 恢复全部样式
        nodeGroup.select('circle:nth-child(2)')
          .transition().duration(200)
          .attr('r', d => d.r)
          .attr('filter', d => d.group === 'history' ? 'url(#glow-gold)' : 'url(#glow-blue)');
        nodeGroup.attr('opacity', 1);
        text.attr('opacity', 1);
        link.attr('stroke-width', d => d.cross ? 0.5 : 1)
          .attr('stroke-opacity', d => d.cross ? 0.12 : 0.25);
        self.tooltip.style('opacity', '0');
      })
      .on('click', function(event, d) {
        if (self.onNodeClick) self.onNodeClick(d);
      })
      // 拖拽
      .call(d3.drag()
        .on('start', function(event, d) {
          if (!event.active) self.simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', function(event, d) {
          if (!event.active) self.simulation.alphaTarget(0.3);
          d.fx = null;
          d.fy = null;
          d3.select(this).style('cursor', 'grab');
        })
      );

    // 动画帧更新
    this.simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeGroup.attr('transform', d => {
        d.x = Math.max(d.r + 5, Math.min(width - d.r - 5, d.x));
        d.y = Math.max(d.r + 5, Math.min(height - d.r - 5, d.y));
        return `translate(${d.x},${d.y})`;
      });
    });
  }

  _onResize() {
    this.width = this.container.getBoundingClientRect().width;
    this.height = this.container.getBoundingClientRect().height;
    if (this.simulation) {
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.3).restart();
    }
  }

  destroy() {
    if (this.simulation) this.simulation.stop();
    if (this.svg) this.svg.remove();
    if (this.tooltip) this.tooltip.remove();
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
  }
}

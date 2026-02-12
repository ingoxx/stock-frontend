<template>
  <!-- 1. 绑定动态 class 'dark-theme' -->
  <div class="market-overview" :class="{ 'dark-theme': isDarkMode }">
    <!-- 顶部标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="el-icon-s-data"></i> A股市场全览</h2>
        <span class="refresh-time">数据更新于: {{ currentTime }}</span>
      </div>
      
      <!-- 2. 新增：主题切换按钮 -->
      <div class="theme-toggle" @click="toggleTheme" title="切换主题">
        <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
        <span class="toggle-text">{{ isDarkMode ? '开灯' : '关灯' }}</span>
      </div>
    </div>

    <!-- 1. 核心大盘数据卡片 -->
    <div class="summary-card card">
      <!-- 左侧：总成交额 -->
      <div class="summary-item total-amount">
        <div class="label">两市总成交额</div>
        <div class="value-wrapper">
          <span class="number">{{ marketSummary.amount }}</span>
        </div>
        <div class="sub-label">Total Volume</div>
      </div>

      <!-- 右侧：涨跌分布 -->
      <div class="summary-item up-down-dist">
        <div class="label">涨跌分布 (共 {{ marketSummary.total }} 家)</div>
        
        <!-- 涨跌比率条 -->
        <div class="progress-bar-container">
          <div class="bar-segment up-segment" :style="{ width: upPercent + '%' }">
            <span v-if="upPercent > 10">{{ marketSummary.up }}家</span>
          </div>
          <div class="bar-segment down-segment" :style="{ width: downPercent + '%' }">
            <span v-if="downPercent > 10">{{ marketSummary.down }}家</span>
          </div>
        </div>

        <!-- 文字详情 -->
        <div class="dist-details">
          <div class="detail-item text-up">
            <span class="icon">▲</span> 涨: {{ marketSummary.up }}
            <span class="ratio">({{ upPercent.toFixed(1) }}%)</span>
          </div>
          <div class="detail-item text-down">
            <span class="icon">▼</span> 跌: {{ marketSummary.down }}
            <span class="ratio">({{ downPercent.toFixed(1) }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 行业成交量 Top 10 图表 -->
    <div class="chart-section card">
      <div class="section-title">
        <span class="indicator"></span> 热门行业成交额 Top 10
      </div>
      <div ref="industryChart" class="chart-container"></div>
    </div>

    <!-- 3. 行业详细数据列表 (可滚动) -->
    <div class="list-section card">
      <div class="section-title">
        <span class="indicator"></span> 行业资金明细
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th width="10%">排名</th>
              <th width="40%">行业名称</th>
              <th width="50%" class="align-right">成交金额 (亿元)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in formattedIndustries" :key="index">
              <td>
                <span class="rank-badge" :class="index < 3 ? 'top-rank' : ''">{{ index + 1 }}</span>
              </td>
              <td class="font-bold">{{ item.name }}</td>
              <td class="align-right font-mono">{{ item.amountBtn }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script>
// 需安装 ECharts: npm install echarts --save
import * as echarts from 'echarts';

export default {
  name: "MarketOverview",
  data() {
    return {
      isDarkMode: false, // 3. 新增状态控制
      currentTime: new Date().toLocaleTimeString(),
      chartInstance: null,
      
      // 1. 总体数据 (您提供的源数据)
      marketSummary: {
        total: 5189,
        up: 2316,
        down: 2873, 
        amount: '17774.15亿'
      },

      // 2. 行业数据 (您提供的源数据)
      rawIndustryData: [
        {'name': '半导体', 'amount': 136559723050.0},
        {'name': '通信设备', 'amount': 111287444757.0},
        {'name': 'IT服务Ⅱ', 'amount': 63075942329.0},
        {'name': '电网设备', 'amount': 60364607892.0},
        {'name': '通用设备', 'amount': 59876674447.0},
        {'name': '汽车零部件', 'amount': 52822641815.0},
        {'name': '电池', 'amount': 50435972340.0},
        {'name': '软件开发', 'amount': 48929776482.0},
        {'name': '工业金属', 'amount': 47090379164.0},
        {'name': '光伏设备', 'amount': 46733382164.0},
        {'name': '小金属', 'amount': 46577370026.0},
        {'name': '消费电子', 'amount': 45356035188.0},
        {'name': '专用设备', 'amount': 37372600003.0},
        {'name': '元件', 'amount': 37298686207.0},
        {'name': '化学制品', 'amount': 31736246742.0},
        {'name': '广告营销', 'amount': 27325338622.0},
        {'name': '自动化设备', 'amount': 27240108814.0},
        {'name': '影视院线', 'amount': 26168644863.0},
        {'name': '游戏Ⅱ', 'amount': 25739922298.0},
        {'name': '军工电子Ⅱ', 'amount': 25700432296.0},
        {'name': '玻璃玻纤', 'amount': 24305815604.0},
        {'name': '电力', 'amount': 24212433309.0},
        {'name': '计算机设备', 'amount': 22538907674.0},
        {'name': '光学光电子', 'amount': 21102132866.0},
        {'name': '其他电源设备Ⅱ', 'amount': 20694321588.0},
        {'name': '航空装备Ⅱ', 'amount': 19565678536.0},
        {'name': '化学制药', 'amount': 17950897031.0},
        {'name': '通信服务', 'amount': 17081830788.0},
        {'name': '证券Ⅱ', 'amount': 16543540038.0},
        {'name': '能源金属', 'amount': 15612667470.0}
      ]
    };
  },
  computed: {
    // 计算涨跌百分比
    upPercent() {
      return (this.marketSummary.up / this.marketSummary.total) * 100;
    },
    downPercent() {
      // 确保总和100%，或者直接计算
      return (Number(this.marketSummary.down) / this.marketSummary.total) * 100;
    },
    // 处理行业数据：排序 + 单位转换
    formattedIndustries() {
      // 1. 拷贝并按金额降序排序
      let sorted = [...this.rawIndustryData].sort((a, b) => b.amount - a.amount);
      
      // 2. 格式化
      return sorted.map(item => ({
        ...item,
        // 将原始数值除以1亿，保留2位小数
        amountBtn: (item.amount / 100000000).toFixed(2),
        rawAmount: item.amount // 保留原始值用于绘图
      }));
    }
  },
  watch: {
    // 4. 监听模式切换，重绘图表
    isDarkMode() {
      this.$nextTick(() => {
        this.initChart();
      });
    }
  },
  mounted() {
    this.initChart();
    window.addEventListener('resize', this.resizeChart);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeChart);
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  },
  methods: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
    },
    initChart() {
      if (!this.$refs.industryChart) return;
      
      // 销毁旧实例，确保主题切换生效
      if (this.chartInstance) {
        this.chartInstance.dispose();
      }
      this.chartInstance = echarts.init(this.$refs.industryChart);

      // 取前10个数据用于绘图
      const top10Data = this.formattedIndustries.slice(0, 10).reverse(); 
      
      const categoryData = top10Data.map(item => item.name);
      const valueData = top10Data.map(item => item.amountBtn); 

      // 5. 适配图表颜色
      const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
      const labelColor = this.isDarkMode ? '#707070' : '#909399';
      const splitLineColor = this.isDarkMode ? '#333333' : '#eee';
      const barEndColor = this.isDarkMode ? '#1e1e1e' : '#ecf5ff'; // 渐变尾部颜色

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: '{b}: {c} 亿元',
          backgroundColor: this.isDarkMode ? '#333' : '#fff',
          textStyle: { color: this.isDarkMode ? '#eee' : '#333' }
        },
        grid: {
          left: '3%', right: '4%', bottom: '3%', top: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01],
          axisLabel: { color: labelColor },
          splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } }
        },
        yAxis: {
          type: 'category',
          data: categoryData,
          axisLabel: { 
            fontWeight: 'bold', 
            color: axisColor,
            fontSize: 13
          },
          axisTick: { show: false },
          axisLine: { show: false }
        },
        series: [
          {
            name: '成交额',
            type: 'bar',
            data: valueData,
            barWidth: 20, 
            itemStyle: {
              // 渐变色：蓝色系
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#409eff' },
                { offset: 1, color: barEndColor } // 动态尾部颜色
              ]),
              borderRadius: [0, 4, 4, 0]
            },
            label: {
              show: true,
              position: 'right',
              formatter: '{c}亿',
              color: labelColor
            }
          }
        ]
      };

      this.chartInstance.setOption(option);
    },
    resizeChart() {
      if (this.chartInstance) this.chartInstance.resize();
    }
  }
};
</script>

<style scoped>
/* ========== 6. 定义 CSS 变量系统 ========== */
.market-overview {
  /* 白天模式变量 */
  --bg-app: #f5f7fa;
  --bg-card: #ffffff;
  --bg-hover: #fafafa;
  --bg-progress: #f0f2f5;
  --bg-badge: #f0f2f5;
  --bg-top-rank: #fff0f0;
  
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --text-inverse: #ffffff;
  
  --border-color: #ebeef5;
  --shadow-color: rgba(0,0,0,0.05);
  
  --color-up: #f56c6c;
  --color-down: #00bfa5;
  --color-blue: #409eff;
  
  transition: background-color 0.3s, color 0.3s;
}

/* 黑夜模式变量 */
.market-overview.dark-theme {
  --bg-app: #121212;
  --bg-card: #1e1e1e;
  --bg-hover: #2c2c2c;
  --bg-progress: #333333;
  --bg-badge: #333333;
  --bg-top-rank: rgba(245, 108, 108, 0.2);
  
  --text-primary: #e0e0e0;
  --text-regular: #b0b0b0;
  --text-secondary: #707070;
  --text-inverse: #e0e0e0;
  
  --border-color: #333333;
  --shadow-color: rgba(0,0,0,0.5);
}

/* ========== 全局容器与重置 ========== */
* { box-sizing: border-box; }

.market-overview {
  background-color: var(--bg-app);
  min-height: 100vh;
  padding: 20px;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  color: var(--text-primary);
}

/* 颜色变量 */
.text-up { color: var(--color-up); font-weight: bold; }
.text-down { color: var(--color-down); font-weight: bold; }
.font-mono { font-family: "Consolas", "Monaco", monospace; }

/* 通用卡片样式 */
.card {
  background: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 var(--shadow-color);
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid transparent;
}
.dark-theme .card { border: 1px solid #333; } /* 黑夜模式边框 */

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  color: var(--text-primary);
}

.indicator {
  width: 4px;
  height: 18px;
  background: var(--color-blue);
  border-radius: 2px;
  margin-right: 10px;
}

/* 顶部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-left { display: flex; align-items: baseline; gap: 15px; }
.page-header h2 { margin: 0; font-size: 22px; color: var(--text-primary); }
.refresh-time { font-size: 13px; color: var(--text-secondary); }

/* 主题切换按钮 */
.theme-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  background-color: var(--bg-card);
  box-shadow: 0 2px 8px var(--shadow-color);
  color: var(--text-regular);
  transition: all 0.3s;
}
.theme-toggle:hover { color: var(--color-blue); }
.toggle-text { font-size: 13px; margin-left: 6px; }

/* ========== 1. 摘要卡片 ========== */
.summary-card {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
}

.summary-item {
  flex: 1;
  min-width: 300px;
}

/* 左侧金额 */
.total-amount .label { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.total-amount .value-wrapper {
  font-size: 36px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}
/* 数字渐变色在黑夜模式下需要调整，这里简化为纯色以保证清晰度，或者自定义暗色渐变 */
.total-amount .number { 
  background: linear-gradient(90deg, var(--text-primary), var(--text-regular)); 
  -webkit-background-clip: text; 
  -webkit-text-fill-color: transparent; 
}
.total-amount .sub-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; letter-spacing: 1px; }

/* 右侧涨跌分布 */
.up-down-dist .label { font-size: 14px; color: var(--text-regular); margin-bottom: 12px; font-weight: 500; }

/* 进度条容器 */
.progress-bar-container {
  display: flex;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--bg-progress);
  margin-bottom: 12px;
}

.bar-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff; /* 这里的文字始终保持白色 */
  font-size: 12px;
  transition: width 0.5s ease;
  white-space: nowrap;
  overflow: hidden;
}

.up-segment { background-color: var(--color-up); }
.down-segment { background-color: var(--color-down); }

.dist-details {
  display: flex;
  gap: 20px;
  font-size: 14px;
}
.detail-item .icon { font-size: 12px; margin-right: 2px; }
.detail-item .ratio { color: var(--text-secondary); font-weight: normal; font-size: 12px; margin-left: 4px; }

/* ========== 2. 图表区域 ========== */
.chart-container {
  width: 100%;
  height: 400px; /* 图表高度 */
}

/* ========== 3. 表格区域 ========== */
.table-container {
  overflow-x: auto;
}
/* 滚动条 */
.table-container::-webkit-scrollbar { width: 6px; height: 6px; }
.table-container::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background-color: var(--bg-app);
  color: var(--text-secondary);
  font-weight: 600;
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  color: var(--text-regular);
}

.data-table tr:hover td { background-color: var(--bg-hover); }
.align-right { text-align: right; }
.font-bold { font-weight: 600; color: var(--text-primary); }

/* 排名徽章 */
.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 4px;
  background-color: var(--bg-badge);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: bold;
}
.top-rank {
  background-color: var(--bg-top-rank); 
  color: var(--color-up);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .summary-card { gap: 20px; }
  .total-amount .value-wrapper { font-size: 28px; }
  .header-left { flex-direction: column; gap: 5px; align-items: flex-start; }
}
</style>
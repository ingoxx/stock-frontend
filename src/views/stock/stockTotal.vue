<template>
  <!-- 1. 绑定动态 class 'dark-theme' -->
  <div class="market-overview" :class="{ 'dark-theme': isDarkMode }">
    <!-- 顶部标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="el-icon-s-data"></i> A股市场全览</h2>
        <span class="refresh-time">数据更新于: {{ currentTime }}</span>
        <span class="refresh-btn" @click="refreshData()">
          <i class="el-icon-refresh-right"></i>
        </span>
      </div>
      
      <!-- 2. 主题切换按钮 -->
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
        <span class="indicator"></span> 热门行业成交额 Top 10 (单位：亿)
      </div>
      <div ref="industryChart" class="chart-container"></div>
    </div>

    <!-- 3. 行业详细数据列表 (可滚动) -->
    <div class="list-section card">
      <div class="section-title">
        <span class="indicator"></span> 行业分类统计
      </div>
      <div class="section-search">
        <el-input v-model="queryIndustryData" placeholder="查找" clearable></el-input>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <!-- 修改：给可排序的列添加点击事件和图标 -->
              <th width="10%">排名</th>
              <th width="40%">行业名称</th>
              
              <th width="40%" class="sortable" @click="handleSort('up')">
                涨的个股数 <i :class="getSortIcon('up')"></i>
              </th>
              
              <th width="40%" class="sortable" @click="handleSort('down')">
                跌的个股数 <i :class="getSortIcon('down')"></i>
              </th>
              
              <th width="50%" class="sortable" @click="handleSort('amount')">
                成交金额 (亿元) <i :class="getSortIcon('amount')"></i>
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- 修改：循环的对象改为 paginatedIndustries (分页后的数据) -->
            <tr v-for="(item, index) in paginatedIndustries" :key="index">
              <td>
                <!-- 修改：排名计算逻辑 (当前页-1)*每页条数 + index + 1 -->
                <span class="rank-badge" :class="getRankClass(index)">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
              </td>
              <td class="font-bold">{{ item.name }}</td>
              <td class="font-bold text-up">{{ item.up }}</td>
              <td class="font-bold text-down">{{ item.down }}</td>
              <td class="font-mono">{{ item.amountBtn }}</td>
            </tr>
            <!-- 无数据时的提示 -->
            <tr v-if="paginatedIndustries.length === 0">
              <td colspan="5" style="text-align: center; padding: 20px; color: #909399;">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 新增：分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page.sync="currentPage"
          :page-size="pageSize"
          :total="formattedIndustries.length"
          @current-change="handlePageChange"
        >
        </el-pagination>
      </div>

    </div>

  </div>
</template>

<script>
// 需安装 ECharts: npm install echarts --save
import * as echarts from 'echarts';
import { get_stock_industry_up_down, get_stock_market_data } from '../../api';
import { Message, MessageBox } from 'element-ui';

export default {
  name: "MarketOverview",
  data() {
    return {
      queryIndustryData: "",
      isDarkMode: true,
      currentTime: new Date().toLocaleTimeString(),
      chartInstance: null,
      
      // 新增：排序状态
      sortKey: 'amount', // 默认按金额排序
      sortOrder: 'desc', // 默认倒序 (asc: 正序, desc: 倒序)

      // 新增：分页状态
      currentPage: 1,
      pageSize: 10,

      // 1. 总体数据
      marketSummary: {
        total: 5189,
        up: 2316,
        down: 2873, 
        amount: '17774.15亿'
      },

      // 2. 行业数据
      rawIndustryData: [
        {'name': '半导体', 'up': 100, 'down': 10, 'amount': 136559723050.0},
        {'name': '通信设备', 'up': 58, 'down': 147, 'amount': 111287444757.0},
        {'name': 'IT服务Ⅱ', 'up': 97, 'down': 21, 'amount': 63075942329.0},
        {'name': '电网设备', 'up': 86, 'down': 32, 'amount': 60364607892.0},
        {'name': '通用设备', 'up': 78, 'down': 99, 'amount': 59876674447.0},
        {'name': '汽车零部件', 'up': 23, 'down': 62, 'amount': 52822641815.0},
      ]
    };
  },
  computed: {
    upPercent() {
      return (this.marketSummary.up / this.marketSummary.total) * 100;
    },
    downPercent() {
      return (Number(this.marketSummary.down) / this.marketSummary.total) * 100;
    },
    // 1. 全量数据（包含搜索、排序逻辑）
    formattedIndustries() {
      // 1. 先进行格式化处理
      let data = this.rawIndustryData.map(item => ({
        ...item,
        amountBtn: (item.amount / 100000000).toFixed(2),
        // 保留原始数值用于排序，因为 amountBtn 是字符串
      }));

      // 2. 搜索过滤
      if (this.queryIndustryData) {
        data = data.filter(item => item.name.includes(this.queryIndustryData));
      }

      // 3. 根据 sortKey 和 sortOrder 进行排序
      return data.sort((a, b) => {
        let valA = a[this.sortKey];
        let valB = b[this.sortKey];
        
        if (this.sortOrder === 'asc') {
          return valA - valB; // 正序
        } else {
          return valB - valA; // 倒序
        }
      });
    },
    // 2. 新增：分页数据（基于全量数据切片）
    paginatedIndustries() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.formattedIndustries.slice(start, end);
    }
  },
  watch: {
    isDarkMode() {
      this.$nextTick(() => {
        this.initChart();
      });
    },
    // 监听搜索关键词变化，重置页码为1
    queryIndustryData() {
      this.currentPage = 1;
    }
  },
  mounted() {
    this.getStockMarketData();
    this.getIndustryUpDown();
    window.addEventListener('resize', this.resizeChart);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeChart);
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  },
  methods: {
    refreshData() {
      this.getStockMarketData();
      this.getIndustryUpDown();
    },
    async getStockMarketData() {
      const resp = await get_stock_market_data();
      if (resp.data.code === 1000) {
        var rd = resp.data.data;
        rd.amount = `${(rd.amount / 100000000).toFixed(2)}亿`;
        this.marketSummary = rd;
      } else {
        Message.error({ message: resp.data.msg, center: true });
      }
    },
    async getIndustryUpDown() {
      const resp = await get_stock_industry_up_down();
      if (resp.data.code === 1000) {
        var rd = resp.data.data;
        // 注意：原代码这里有 splice(0, 10)，这会只取前10条数据，
        // 如果要做翻页，应该赋值全部数据
        this.rawIndustryData = rd; 
        
      } else {
        Message.error({ message: resp.data.msg, center: true });
      }

      this.initChart();
    },
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
    },
    // 处理点击排序
    handleSort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortOrder = 'desc';
      }
      // 关键：排序变化时，重置页码到第1页
      this.currentPage = 1;
    },
    // 获取排序图标样式
    getSortIcon(key) {
      if (this.sortKey !== key) return 'sort-icon default';
      return this.sortOrder === 'asc' ? 'sort-icon asc' : 'sort-icon desc';
    },
    // 新增：处理页码变更
    handlePageChange(val) {
      this.currentPage = val;
      // 可选：翻页后自动滚动到表格顶部
      // document.querySelector('.table-container').scrollTop = 0;
    },
    // 新增：获取排名样式（前3名高亮，注意是全局排名）
    getRankClass(index) {
      const globalRank = (this.currentPage - 1) * this.pageSize + index + 1;
      return globalRank <= 3 ? 'top-rank' : '';
    },
    initChart() {
      if (!this.$refs.industryChart) return;
      
      if (this.chartInstance) {
        this.chartInstance.dispose();
      }
      this.chartInstance = echarts.init(this.$refs.industryChart);

      // 图表数据：无论表格怎么翻页/排序，图表始终展示金额最大的前10名
      const top10Data = [...this.rawIndustryData]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .reverse(); 
      
      const categoryData = top10Data.map(item => item.name);
      const valueData = top10Data.map(item => (item.amount / 100000000).toFixed(2)); 

      const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
      const labelColor = this.isDarkMode ? '#707070' : '#909399';
      const splitLineColor = this.isDarkMode ? '#333333' : '#eee';
      const barEndColor = this.isDarkMode ? '#1e1e1e' : '#ecf5ff';

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
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#409eff' },
                { offset: 1, color: barEndColor }
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
  --color-hover: #409eff;
  
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
  --color-hover: #66b1ff;
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
.section-search {
  width: 300px;
  margin-bottom: 20px;
}
::v-deep .section-search .el-input__inner {
  background: var(--bg-app);
  border-color: var(--border-color);
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
.dark-theme .card { border: 1px solid #333; }

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
.refresh-btn {
  cursor: pointer;
  color: #707070;
}

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
.total-amount .number { 
  background: linear-gradient(90deg, var(--text-primary), var(--text-regular)); 
  -webkit-background-clip: text; 
  -webkit-text-fill-color: transparent; 
}
.total-amount .sub-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; letter-spacing: 1px; }

/* 右侧涨跌分布 */
.up-down-dist .label { font-size: 14px; color: var(--text-regular); margin-bottom: 12px; font-weight: 500; }

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
  color: #fff; 
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
  height: 400px; 
}

/* ========== 3. 表格区域 ========== */
.table-container {
  overflow-x: auto;
}
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
  user-select: none; /* 防止双击选中文字 */
}

/* 排序样式 */
.sortable {
  cursor: pointer;
  transition: color 0.3s;
}
.sortable:hover {
  color: var(--color-hover);
}

.sort-icon::after { content: '⇅'; margin-left: 4px; opacity: 0.3; font-size: 12px; }
.sort-icon.asc::after { content: '↑'; opacity: 1; color: var(--color-blue); }
.sort-icon.desc::after { content: '↓'; opacity: 1; color: var(--color-blue); }

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  color: var(--text-regular);
  text-align: left;
}

.data-table tr:hover td { background-color: var(--bg-hover); }
.font-bold { font-weight: 600; color: var(--text-primary); }

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

/* ========== 分页组件样式适配 ========== */
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* Element UI Pagination 深度定制 */
::v-deep .el-pagination.is-background .btn-next,
::v-deep .el-pagination.is-background .btn-prev,
::v-deep .el-pagination.is-background .el-pager li {
  background-color: var(--bg-app);
  color: var(--text-regular);
  border: 1px solid var(--border-color);
}

::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active {
  background-color: var(--color-blue);
  color: #fff;
}

::v-deep .el-pagination__total {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .summary-card { gap: 20px; }
  .total-amount .value-wrapper { font-size: 28px; }
  .header-left { flex-direction: column; gap: 5px; align-items: flex-start; }
}
</style>
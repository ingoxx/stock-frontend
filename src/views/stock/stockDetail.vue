<template>
	<!-- 1. 绑定动态 class 'dark-theme' -->
	<div class="stock-dashboard" :class="{ 'dark-theme': isDarkMode }">
	  <!-- 左侧：股票列表区域 -->
	  <div class="sidebar">
		<!-- 新增：顶部功能区（包含主题切换） -->
		<div class="sidebar-header">
		  <div class="app-title">股市看板</div>
		  <!-- 主题切换按钮 -->
		  <div class="theme-toggle" @click="toggleTheme" title="切换主题">
			<i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
		  </div>
		</div>
  
		<!-- 搜索框 -->
		<div class="search-box">
		  <i class="el-icon-search search-icon"></i>
		  <input v-model="searchQuery" type="text" placeholder="搜索股票代码/名称" class="search-input">
		</div>
  
		<!-- 列表表头（支持排序） -->
		<div class="list-header">
		  <span class="col-name">名称代码</span>
		  <span class="col-price sortable" @click="handleSort('price')">
			最新价 <i :class="getSortIcon('price')"></i>
		  </span>
		  <span class="col-rate sortable" @click="handleSort('changePercent')">
			涨跌幅 <i :class="getSortIcon('changePercent')"></i>
		  </span>
		</div>
  
		<!-- 股票列表 -->
		<div class="stock-list">
		  <div v-for="stock in filteredStocks" :key="stock.id" class="stock-item"
			:class="{ 'active': currentStock.id === stock.id }" @click="selectStock(stock)">
			<div class="col-name">
			  <div class="stock-name">{{ stock.name }}</div>
			  <div class="stock-code">{{ stock.code }}</div>
			</div>
			<div class="col-price" :class="getColorClass(stock.changePercent)">
			  {{ stock.price.toFixed(2) }}
			</div>
			<div class="col-rate">
			  <span class="rate-badge" :class="getBgClass(stock.changePercent)">
				{{ stock.changePercent > 0 ? '+' : '' }}{{ stock.changePercent }}%
			  </span>
			</div>
		  </div>
  
		  <!-- 无数据提示 -->
		  <div v-if="filteredStocks.length === 0" class="no-data">
			无匹配股票
		  </div>
		</div>
	  </div>
  
	  <!-- 右侧：详情与图表区域 -->
	  <div class="main-content">
		<div v-if="currentStock" class="content-wrapper">
  
		  <!-- 头部概览 -->
		  <div class="stock-header card">
			<div class="header-left">
			  <div class="title-row">
				<h1 class="main-title">{{ currentStock.name }}</h1>
				<span class="code-tag">{{ currentStock.code }}</span>
				<span class="market-tag">A股</span>
			  </div>
			  <div class="info-row">
				<span>今开: {{ currentStock.open }}</span>
				<span>最高: <span class="text-up">{{ currentStock.high }}</span></span>
				<span>最低: <span class="text-down">{{ currentStock.low }}</span></span>
				<span>成交量: {{ (currentStock.volume / 10000).toFixed(2) }}万</span>
			  </div>
			</div>
			<div class="header-right">
			  <div class="big-price" :class="getColorClass(currentStock.changePercent)">
				{{ currentStock.price.toFixed(2) }}
			  </div>
			  <div class="price-change" :class="getColorClass(currentStock.changePercent)">
				{{ (currentStock.price * currentStock.changePercent / 100).toFixed(2) }}
				({{ currentStock.changePercent }}%)
			  </div>
			</div>
		  </div>
  
		  <!-- 图表区域 -->
		  <div class="chart-section card">
			<div class="section-title">
			  <span class="indicator"></span>近30日走势分析
			</div>
			<div ref="chartContainer" class="chart-container"></div>
		  </div>
  
		  <!-- 历史交易表格 -->
		  <div class="history-section card">
			<div class="section-title">
			  <span class="indicator"></span>近期交易明细
			</div>
			<div class="table-wrapper">
			  <table class="data-table">
				<thead>
				  <tr>
					<th>日期</th>
					<th class="align-right">收盘价</th>
					<th class="align-right">涨跌幅</th>
					<th class="align-right">主力净流入</th>
				  </tr>
				</thead>
				<tbody>
				  <tr v-for="(item, index) in historyData" :key="index">
					<td class="text-gray">{{ item.date }}</td>
					<td class="align-right font-mono">{{ item.price.toFixed(2) }}</td>
					<td class="align-right font-mono" :class="getColorClass(item.changePercent)">
					  {{ item.changePercent > 0 ? '+' : '' }}{{ item.changePercent }}%
					</td>
					<td class="align-right font-mono"
					  :class="parseFloat(item.netInflow) > 0 ? 'text-up' : 'text-down'">
					  {{ item.netInflow }}
					</td>
				  </tr>
				</tbody>
			  </table>
			</div>
		  </div>
  
		</div>
	  </div>
	</div>
  </template>
  
  <script>
  // 必须安装 echarts: npm install echarts --save
  import { get_stock_industry_list } from '../../api'; // 保持你原有的 api 引用
  import * as echarts from 'echarts';
  
  export default {
	name: "stockDetail",
	data() {
	  return {
		isDarkMode: false, // 2. 新增：控制黑夜模式状态
		searchQuery: '',
		sortKey: 'changePercent',
		sortDir: 'desc',
		currentStock: {},
		historyData: [],
		industryList: [],
		chartInstance: null,
  
		// 模拟数据源
		stocks: [
		  { id: 1, name: '贵州茅台', code: '600519', price: 1715.00, changePercent: 1.25, volume: 25400, open: 1700, high: 1720, low: 1695 },
		  { id: 2, name: '宁德时代', code: '300750', price: 168.50, changePercent: -2.45, volume: 458000, open: 172, high: 175, low: 166 },
		  { id: 3, name: '腾讯控股', code: '00700', price: 302.40, changePercent: 0.58, volume: 1250000, open: 300, high: 305, low: 298 },
		  { id: 4, name: '比亚迪', code: '002594', price: 215.30, changePercent: 3.12, volume: 89000, open: 210, high: 218, low: 209 },
		  { id: 5, name: '中芯国际', code: '688981', price: 52.60, changePercent: -1.20, volume: 980000, open: 53, high: 54, low: 51 },
		  { id: 6, name: '东方财富', code: '300059', price: 13.45, changePercent: -0.85, volume: 2100000, open: 13.6, high: 13.8, low: 13.2 },
		  { id: 7, name: '药明康德', code: '603259', price: 45.20, changePercent: 0.00, volume: 320000, open: 45.2, high: 46.0, low: 45.0 }
		]
	  };
	},
	computed: {
	  // 过滤 + 排序逻辑
	  filteredStocks() {
		let result = this.stocks.filter(stock =>
		  stock.name.includes(this.searchQuery) ||
		  stock.code.includes(this.searchQuery)
		);
  
		return result.sort((a, b) => {
		  let valA = a[this.sortKey];
		  let valB = b[this.sortKey];
		  if (this.sortDir === 'asc') return valA - valB;
		  return valB - valA;
		});
	  }
	},
	watch: {
	  // 监听选中股票变化
	  currentStock: {
		deep: true,
		handler(val) {
		  if (val && val.id) {
			this.generateHistoryData(val);
			this.$nextTick(() => {
			  this.initChart();
			});
		  }
		}
	  },
	  // 3. 监听模式变化，重新渲染图表颜色
	  isDarkMode() {
		if (this.currentStock && this.currentStock.id) {
		  this.$nextTick(() => {
			this.initChart(); // 需要重绘图表以适配新颜色
		  });
		}
	  }
	},
	mounted() {
	  if (this.stocks.length > 0) {
		this.selectStock(this.stocks[0]);
	  }
	  window.addEventListener('resize', this.handleResize);
	},
	beforeDestroy() {
	  window.removeEventListener('resize', this.handleResize);
	  if (this.chartInstance) {
		this.chartInstance.dispose();
	  }
	},
	methods: {
	  // 切换主题方法
	  toggleTheme() {
		this.isDarkMode = !this.isDarkMode;
	  },
	  async getStockIndustryList() {
		// 这里的 api 调用保持原样
		// const resp = await get_stock_industry_list() ... 
	  },
	  selectStock(stock) {
		this.currentStock = stock;
	  },
	  handleSort(key) {
		if (this.sortKey === key) {
		  this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
		} else {
		  this.sortKey = key;
		  this.sortDir = 'desc';
		}
	  },
	  generateHistoryData(stock) {
		let data = [];
		let price = stock.price;
		let date = new Date();
  
		for (let i = 0; i < 30; i++) {
		  let change = (Math.random() - 0.5) * 4;
		  let prevPrice = price / (1 + change / 100);
  
		  date.setDate(date.getDate() - 1);
		  if (date.getDay() === 0) date.setDate(date.getDate() - 2);
		  if (date.getDay() === 6) date.setDate(date.getDate() - 1);
  
		  data.push({
			date: date.toISOString().slice(5, 10),
			price: parseFloat(price.toFixed(2)),
			changePercent: parseFloat(change.toFixed(2)),
			netInflow: ((Math.random() - 0.5) * 5).toFixed(2) + '亿'
		  });
		  price = prevPrice;
		}
		this.historyData = data;
	  },
	  initChart() {
		if (!this.$refs.chartContainer) return;
		
		// ECharts 主题切换需要 dispose 旧实例或使用 setOption merge
		if (this.chartInstance) {
		  this.chartInstance.dispose();
		}
		this.chartInstance = echarts.init(this.$refs.chartContainer);
  
		const chartData = [...this.historyData].reverse();
		const xData = chartData.map(item => item.date);
		const yData = chartData.map(item => item.price);
		const isUp = this.currentStock.changePercent >= 0;
		const color = isUp ? '#f56c6c' : '#00bfa5'; // 红/绿
  
		// 4. 定义图表颜色变量 (适配黑夜模式)
		const chartTextColor = this.isDarkMode ? '#b0b0b0' : '#909399';
		const chartSplitLine = this.isDarkMode ? '#333333' : '#f0f0f0';
		const chartAxisLine = this.isDarkMode ? '#444444' : '#e0e0e0';
  
		const option = {
		  tooltip: { 
			trigger: 'axis',
			backgroundColor: this.isDarkMode ? '#333' : '#fff',
			textStyle: { color: this.isDarkMode ? '#eee' : '#333' }
		  },
		  grid: { top: '10%', left: '1%', right: '3%', bottom: '2%', containLabel: true },
		  xAxis: {
			type: 'category',
			data: xData,
			boundaryGap: false,
			axisLine: { lineStyle: { color: chartAxisLine } },
			axisLabel: { color: chartTextColor }
		  },
		  yAxis: {
			type: 'value',
			scale: true,
			splitLine: { lineStyle: { type: 'dashed', color: chartSplitLine } },
			axisLabel: { color: chartTextColor }
		  },
		  series: [{
			data: yData,
			type: 'line',
			smooth: true,
			symbol: 'none',
			lineStyle: { width: 2, color: color },
			areaStyle: {
			  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
				{ offset: 0, color: color },
				{ offset: 1, color: this.isDarkMode ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)' }
			  ]),
			  opacity: 0.2
			}
		  }]
		};
  
		this.chartInstance.setOption(option);
	  },
	  handleResize() {
		if (this.chartInstance) this.chartInstance.resize();
	  },
	  getColorClass(val) {
		if (val > 0) return 'text-up';
		if (val < 0) return 'text-down';
		return 'text-gray';
	  },
	  getBgClass(val) {
		if (val > 0) return 'bg-up';
		if (val < 0) return 'bg-down';
		return 'bg-gray';
	  },
	  getSortIcon(key) {
		if (this.sortKey !== key) return 'sort-icon default';
		return this.sortDir === 'asc' ? 'sort-icon asc' : 'sort-icon desc';
	  }
	}
  };
  </script>
  
  <style scoped>
  /* ========== 5. 定义 CSS 变量系统 (核心修改) ========== */
  .stock-dashboard {
	/* 白天模式变量 (默认) */
	--bg-app: #f5f7fa;
	--bg-sidebar: #ffffff;
	--bg-card: #ffffff;
	--bg-hover: #f5f7fa;
	--bg-active: #ecf5ff;
	--bg-input: #f5f7fa;
	
	--text-primary: #303133;
	--text-regular: #606266;
	--text-secondary: #909399;
	
	--border-color: #e4e7ed;
	--border-light: #ebeef5;
	--border-active: #409eff;
	
	--shadow-color: rgba(0, 0, 0, 0.05);
	
	/* 涨跌颜色保持不变，或者微调 */
	--color-up: #f56c6c;
	--color-up-bg: #fef0f0;
	--color-down: #00bfa5;
	--color-down-bg: #f0f9eb;
	--color-neutral-bg: #f4f4f5;
	
	transition: background-color 0.3s, color 0.3s;
  }
  
  /* 黑夜模式变量覆盖 */
  .stock-dashboard.dark-theme {
	--bg-app: #121212;
	--bg-sidebar: #1e1e1e;
	--bg-card: #1e1e1e;
	--bg-hover: #2c2c2c;
	--bg-active: #263445; /* 深蓝灰色 */
	--bg-input: #2c2c2c;
	
	--text-primary: #e0e0e0;
	--text-regular: #b0b0b0;
	--text-secondary: #707070;
	
	--border-color: #333333;
	--border-light: #333333;
	--border-active: #409eff;
	
	--shadow-color: rgba(0, 0, 0, 0.5);
	
	--color-up-bg: rgba(245, 108, 108, 0.2);
	--color-down-bg: rgba(0, 191, 165, 0.2);
	--color-neutral-bg: #333333;
  }
  
  /* ========== 基础样式使用变量 ========== */
  * {
	box-sizing: border-box;
  }
  
  .stock-dashboard {
	display: flex;
	height: 100vh;
	background-color: var(--bg-app); /* 使用变量 */
	color: var(--text-primary);     /* 使用变量 */
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	overflow: hidden;
  }
  
  .text-up { color: var(--color-up) !important; }
  .text-down { color: var(--color-down) !important; }
  .text-gray { color: var(--text-secondary) !important; }
  .font-mono { font-family: "Consolas", "Monaco", monospace; }
  
  /* ========== 左侧侧边栏 ========== */
  .sidebar {
	width: 320px;
	background: var(--bg-sidebar); /* 使用变量 */
	border-right: 1px solid var(--border-color); /* 使用变量 */
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	z-index: 10;
	box-shadow: 2px 0 8px var(--shadow-color); /* 使用变量 */
  }
  
  /* 顶部功能区 */
  .sidebar-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px;
	border-bottom: 1px solid var(--border-light);
  }
  
  .app-title {
	font-weight: bold;
	font-size: 16px;
	color: var(--text-primary);
  }
  
  .theme-toggle {
	cursor: pointer;
	font-size: 20px;
	color: var(--text-secondary);
	transition: color 0.3s;
  }
  .theme-toggle:hover {
	color: var(--border-active);
  }
  
  .search-box {
	padding: 15px;
	border-bottom: 1px solid var(--border-light);
  }
  
  .search-input {
	width: 100%;
	padding: 8px 12px;
	border: 1px solid var(--border-color);
	border-radius: 4px;
	font-size: 14px;
	outline: none;
	background-color: var(--bg-input); /* 使用变量 */
	color: var(--text-primary); /* 使用变量 */
	transition: all 0.3s;
  }
  
  .search-input:focus {
	background-color: var(--bg-sidebar);
	border-color: var(--border-active);
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }
  
  .list-header {
	display: flex;
	padding: 10px 15px;
	background-color: var(--bg-app); /* 使用变量 */
	border-bottom: 1px solid var(--border-light);
	font-size: 12px;
	color: var(--text-secondary);
	font-weight: 600;
	user-select: none;
  }
  
  .sortable { cursor: pointer; }
  .sortable:hover { color: var(--border-active); }
  
  /* 排序图标模拟 */
  .sort-icon::after { content: '⇅'; margin-left: 2px; opacity: 0.3; }
  .sort-icon.asc::after { content: '↑'; opacity: 1; color: var(--border-active); }
  .sort-icon.desc::after { content: '↓'; opacity: 1; color: var(--border-active); }
  
  .col-name { width: 40%; }
  .col-price { width: 30%; text-align: right; }
  .col-rate { width: 30%; text-align: right; }
  
  .stock-list {
	flex: 1;
	overflow-y: auto;
  }
  
  /* 自定义滚动条适配 */
  .stock-list::-webkit-scrollbar { width: 6px; }
  .stock-list::-webkit-scrollbar-thumb {
	background: var(--border-color);
	border-radius: 3px;
  }
  .stock-list::-webkit-scrollbar-track {
	background: var(--bg-sidebar);
  }
  
  .stock-item {
	display: flex;
	padding: 12px 15px;
	border-bottom: 1px solid var(--border-light); /* 使用变量 */
	cursor: pointer;
	align-items: center;
	transition: background 0.2s;
	border-left: 3px solid transparent;
  }
  
  .stock-item:hover {
	background-color: var(--bg-hover); /* 使用变量 */
  }
  
  .stock-item.active {
	background-color: var(--bg-active); /* 使用变量 */
	border-left-color: var(--border-active);
  }
  
  .stock-name {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
  }
  
  .stock-code {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 2px;
  }
  
  .stock-item .col-price {
	font-family: "Consolas", monospace;
	font-weight: 600;
	font-size: 14px;
  }
  
  .rate-badge {
	display: inline-block;
	padding: 2px 6px;
	border-radius: 2px;
	font-size: 12px;
	font-family: "Consolas", monospace;
	min-width: 60px;
	text-align: center;
  }
  
  .bg-up { background-color: var(--color-up-bg); color: var(--color-up); }
  .bg-down { background-color: var(--color-down-bg); color: var(--color-down); }
  .bg-gray { background-color: var(--color-neutral-bg); color: var(--text-secondary); }
  
  .no-data {
	text-align: center;
	padding: 20px;
	color: var(--text-secondary);
	font-size: 13px;
  }
  
  /* ========== 右侧主内容 ========== */
  .main-content {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
  }
  /* 主内容区滚动条 */
  .main-content::-webkit-scrollbar { width: 6px; }
  .main-content::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
  .main-content::-webkit-scrollbar-track { background: var(--bg-app); }
  
  .content-wrapper {
	max-width: 1000px;
	margin: 0 auto;
  }
  
  .card {
	background: var(--bg-card); /* 使用变量 */
	border-radius: 8px;
	box-shadow: 0 2px 12px 0 var(--shadow-color); /* 使用变量 */
	margin-bottom: 20px;
	padding: 24px;
	border: 1px solid transparent; /* 防止抖动 */
  }
  
  .dark-theme .card {
	border: 1px solid var(--border-light); /* 黑夜模式加个边框更好看 */
  }
  
  /* 头部信息卡片 */
  .stock-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
  }
  
  .title-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
  }
  
  .main-title {
	margin: 0;
	font-size: 24px;
	font-weight: bold;
	color: var(--text-primary);
  }
  
  .code-tag {
	background: var(--color-neutral-bg);
	padding: 2px 6px;
	border-radius: 4px;
	color: var(--text-regular);
	font-size: 14px;
  }
  
  .market-tag {
	background: var(--bg-active);
	color: var(--border-active);
	border: 1px solid var(--bg-active);
	padding: 1px 5px;
	font-size: 12px;
	border-radius: 2px;
  }
  
  .info-row {
	display: flex;
	gap: 20px;
	color: var(--text-regular);
	font-size: 13px;
  }
  
  .big-price {
	font-size: 36px;
	font-weight: bold;
	font-family: "Consolas", monospace;
	text-align: right;
	line-height: 1;
  }
  
  .price-change {
	text-align: right;
	margin-top: 8px;
	font-weight: 500;
	font-size: 16px;
  }
  
  /* 图表区域 */
  .section-title {
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 20px;
	display: flex;
	align-items: center;
	color: var(--text-primary);
  }
  
  .indicator {
	width: 4px;
	height: 16px;
	background: var(--border-active);
	border-radius: 2px;
	margin-right: 8px;
  }
  
  .chart-container {
	width: 100%;
	height: 350px;
  }
  
  /* 表格样式 */
  .data-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 14px;
  }
  
  .data-table th {
	background-color: var(--bg-app); /* 使用变量 */
	color: var(--text-secondary);
	font-weight: 600;
	padding: 12px 15px;
	text-align: left;
  }
  
  .data-table td {
	padding: 12px 15px;
	border-bottom: 1px solid var(--border-light);
	color: var(--text-regular);
  }
  
  .data-table tr:hover td {
	background-color: var(--bg-hover);
  }
  
  .align-right { text-align: right; }
  </style>
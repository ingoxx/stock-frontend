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
		  <span class="refresh-btn" @click="stockDataSwitch()">
			<i :class="isRunIcon"></i>
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
				<th width="10%">排名</th>
				<th width="20%">行业名称</th>
				<th width="20%" class="sortable" @click="handleSort('up')">
				  涨的个股数 <i :class="getSortIcon('up')"></i>
				</th>
				<th width="20%" class="sortable" @click="handleSort('down')">
				  跌的个股数 <i :class="getSortIcon('down')"></i>
				</th>
				<th width="50%" class="sortable" @click="handleSort('amount')">
				  成交金额 (亿元) <i :class="getSortIcon('amount')"></i>
				</th>
			  </tr>
			</thead>
			<tbody>
			  <tr v-for="(item, index) in paginatedIndustries" :key="index">
				<td>
				  <span class="rank-badge" :class="getRankClass(index)">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
				</td>
				<td class="font-bold">
				  <!-- 新增：可点击的行业名称 -->
				  <div class="industry-name-link" @click="openIndustryStocks(item.name)" title="点击查看行业个股详情">
					{{ item.name }}
					<i class="el-icon-data-analysis hover-icon"></i>
				  </div>
				</td>
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
  
		<!-- 分页组件 -->
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
  
	  <!-- ================== 行业个股详情弹窗 ================== -->
<el-dialog
  :title="`${currentIndustry} 行业 - 领涨跌个股`"
  :visible.sync="dialogVisible"
  width="85%"
  :close-on-click-modal="false"
  destroy-on-close
>
  <!-- 1. 新增：顶部搜索区域 -->
  <div class="dialog-header-actions section-search-1" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
    <el-input
      v-model="searchStockQuery"
      placeholder="输入股票代码或名称搜索"
      prefix-icon="el-icon-search"
      clearable
      style="width: 300px;"
      size="small"
    ></el-input>
    <span style="color: #909399; font-size: 13px;">共找到 {{ processedStocks.length }} 家公司</span>
  </div>

  <!-- 2. 表格：绑定为 paginatedStocks (分页后的数据)，并将所有 sortable 改为 sortable="custom" -->
  <el-table
    :data="paginatedStocks"
    v-loading="stocksLoading"
    element-loading-text="拼命加载中"
    element-loading-spinner="el-icon-loading"
    max-height="450"
    stripe
    style="width: 100%"
    :default-sort="{prop: 'changepercent', order: 'descending'}"
    @sort-change="handleStockSortChange"
  >
    <el-table-column prop="code" label="股票代码" min-width="100" sortable="custom"></el-table-column>
    <el-table-column prop="name" label="股票名称" min-width="120" sortable="custom"></el-table-column>
    
    <el-table-column prop="trade" label="收盘价格" min-width="100" sortable="custom">
      <template slot-scope="scope">
        <span :class="getPriceClass(scope.row.changepercent)">{{ scope.row.trade }}</span>
      </template>
    </el-table-column>
    
    <el-table-column prop="changepercent" label="涨跌幅度" min-width="100" sortable="custom">
      <template slot-scope="scope">
        <span :class="getPriceClass(scope.row.changepercent)">
          {{ scope.row.changepercent > 0 ? '+' : '' }}{{ scope.row.changepercent }}%
        </span>
      </template>
    </el-table-column>
    
    <el-table-column prop="amount" label="成交额(亿)" min-width="110" sortable="custom"></el-table-column>
	<el-table-column prop="mktcap" label="总市值(亿)" min-width="110" sortable="custom">
	</el-table-column>
    <el-table-column prop="turnoverratio" label="换手率" min-width="100" sortable="custom"></el-table-column>
    <el-table-column prop="settlement" label="昨收" min-width="100" sortable="custom"></el-table-column>
    <el-table-column prop="open" label="开盘" min-width="100" sortable="custom"></el-table-column>
    <el-table-column prop="high" label="最高" min-width="100" sortable="custom">
      <template slot-scope="scope">
        <span :class="getPriceClass(scope.row.high - scope.row.prevClose)">{{ scope.row.high }}</span>
      </template>
    </el-table-column>
    
    <el-table-column prop="low" label="最低" min-width="100" sortable="custom">
      <template slot-scope="scope">
        <span :class="getPriceClass(scope.row.low - scope.row.prevClose)">{{ scope.row.low }}</span>
      </template>
    </el-table-column>
  </el-table>

  <!-- 3. 新增：底部弹窗分页 -->
  <div class="pagination-wrapper" style="margin-top: 15px; text-align: right;">
    <el-pagination
      background
      layout="total, prev, pager, next"
      :current-page.sync="stockCurrentPage"
      :page-size="stockPageSize"
      :total="processedStocks.length"
      @current-change="handleStockPageChange"
    >
    </el-pagination>
  </div>
</el-dialog>
  
	</div>
  </template>
  
  <script>
  import * as echarts from 'echarts';
  import { get_stock_industry_up_down, get_stock_market_data, stock_data_switch, stock_data_status, get_industry_data } from '../../api';
  import { Message, MessageBox } from 'element-ui';
  
  export default {
	name: "MarketOverview",
	data() {
	  return {

		// 股票弹窗的内部状态
		mockData: [],
		searchStockQuery: '',
		stockCurrentPage: 1,
		stockPageSize: 10,
		stockSortProp: 'change',        // 默认排序列
		stockSortOrder: 'descending',   // 默认排序方式

		queryIndustryData: "",
		isDarkMode: true,
		currentTime: new Date().toLocaleTimeString(),
		chartInstance: null,
		isLoadIcon: "el-icon-loading",
		isRunIcon: "el-icon-data-line",
		
		sortKey: 'amount', 
		sortOrder: 'desc', 
  
		currentPage: 1,
		pageSize: 10,
  
		// 新增：弹窗状态相关
		dialogVisible: false,
		currentIndustry: '',
		industryStocks:[],
		stocksLoading: false,
  
		// 总体数据
		marketSummary: {
		  total: 5189,
		  up: 2316,
		  down: 2873, 
		  amount: '17774.15亿'
		},
  
		// 行业数据
		rawIndustryData:[
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
		processedStocks() {
		// 1. 搜索过滤
		let filtered = this.industryStocks;
		if (this.searchStockQuery) {
			const query = this.searchStockQuery.toLowerCase();
			filtered = filtered.filter(item => 
			item.name.toLowerCase().includes(query) || 
			item.code.toLowerCase().includes(query)
			);
		}

		// 2. 全局排序 (必须放在分页前，确保排序是针对所有搜索结果的)
		if (this.stockSortProp && this.stockSortOrder) {
			filtered.sort((a, b) => {
			let valA = a[this.stockSortProp];
			let valB = b[this.stockSortProp];

			// 字符串类型的特殊处理（股票代码/名称）
			if (['code', 'name'].includes(this.stockSortProp)) {
				if (valA < valB) return this.stockSortOrder === 'ascending' ? -1 : 1;
				if (valA > valB) return this.stockSortOrder === 'ascending' ? 1 : -1;
				return 0;
			}

			// 数值类型的处理（利用 parseFloat 自动忽略后面的 '亿' 或 '%' 等汉字符号）
			valA = parseFloat(valA) || 0;
			valB = parseFloat(valB) || 0;
			return this.stockSortOrder === 'ascending' ? valA - valB : valB - valA;
			});
		}
  			return filtered;
		},

		// 从排好序的全部数据中，切出当前页的数据供表格渲染
		paginatedStocks() {
			const start = (this.stockCurrentPage - 1) * this.stockPageSize;
			const end = start + this.stockPageSize;
			return this.processedStocks.slice(start, end);
		},
		upPercent() {
			return (this.marketSummary.up / this.marketSummary.total) * 100;
		},
		downPercent() {
			return (Number(this.marketSummary.down) / this.marketSummary.total) * 100;
		},
		formattedIndustries() {
			let data = this.rawIndustryData.map(item => ({
			...item,
			amountBtn: (item.amount / 100000000).toFixed(2),
			}));
	
			if (this.queryIndustryData) {
			data = data.filter(item => item.name.includes(this.queryIndustryData));
			}
	
			return data.sort((a, b) => {
			let valA = a[this.sortKey];
			let valB = b[this.sortKey];
			if (this.sortOrder === 'asc') {
				return valA - valB; 
			} else {
				return valB - valA; 
			}
			});
		},
		paginatedIndustries() {
			const start = (this.currentPage - 1) * this.pageSize;
			const end = start + this.pageSize;
			return this.formattedIndustries.slice(start, end);
		}
	},
	watch: {
		// 监听股票搜索，如果用户输入了新的关键字，强制回到第 1 页
		searchStockQuery() {
			this.stockCurrentPage = 1;
		},
		isDarkMode() {
			this.$nextTick(() => {
			this.initChart();
			});
		},
		queryIndustryData() {
			this.currentPage = 1;
		}
	},
	mounted() {
		this.getStockMarketData();
		this.getIndustryUpDown();
		this.stockDataStatus();
		window.addEventListener('resize', this.resizeChart);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.resizeChart);
		if (this.chartInstance) {
			this.chartInstance.dispose();
		}
	},
	methods: {
		// 1. 表格列头的排序事件
		handleStockSortChange({ prop, order }) {
			this.stockSortProp = prop;
			this.stockSortOrder = order;
			// 排序改变时，自动切回第一页
			this.stockCurrentPage = 1;
		},

		// 2. 表格的翻页事件
		handleStockPageChange(val) {
		this.stockCurrentPage = val;
		},

		// // 3. 打开弹窗时，需要初始化这些状态，并把假数据数量调大体现翻页效果
		// openIndustryStocks(industryName) {
		// 	this.currentIndustry = industryName;
		// 	this.dialogVisible = true;
		// 	this.stocksLoading = true;
			
		// 	// 每次打开弹窗，重置状态
		// 	this.searchStockQuery = '';
		// 	this.stockCurrentPage = 1;
		// 	this.stockSortProp = 'change';
		// 	this.stockSortOrder = 'descending';

		// 	setTimeout(() => {
		// 		this.industryStocks = this.generateMockStocks(industryName);
		// 		this.stocksLoading = false;
		// 	}, 600);
		// },
	  	refreshData() {
			this.getStockMarketData();
			this.getIndustryUpDown();
		},
		async stockDataStatus() {
			this.isRunIcon = "el-icon-loading";
			const resp = await stock_data_status();
			if (resp.data.code === 1000) {
			this.isRunIcon = "el-icon-data-line"
			return;
			}
		},
		stockDataSwitch() {
			MessageBox.confirm('确定提交吗？', '提示', {
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			type: 'warning',
			center: true,
			}).then(async () => {
			this.isRunIcon = "el-icon-loading";
			const resp = await stock_data_switch();
			if (resp.data.code !== 1000) {
				Message.error({ message: resp.data.msg, center: true });
				return;
			}
			Message.success({ message: resp.data.msg, center: true })
			}).catch(() => {});
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
			this.rawIndustryData = rd; 
			} else {
			Message.error({ message: resp.data.msg, center: true });
			}
			this.initChart();
		},
		toggleTheme() {
			this.isDarkMode = !this.isDarkMode;
		},
		handleSort(key) {
			if (this.sortKey === key) {
			this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
			} else {
			this.sortKey = key;
			this.sortOrder = 'desc';
			}
			this.currentPage = 1;
		},
	  getSortIcon(key) {
		if (this.sortKey !== key) return 'sort-icon default';
		return this.sortOrder === 'asc' ? 'sort-icon asc' : 'sort-icon desc';
	  },
	  handlePageChange(val) {
		this.currentPage = val;
	  },
	  getRankClass(index) {
		const globalRank = (this.currentPage - 1) * this.pageSize + index + 1;
		return globalRank <= 3 ? 'top-rank' : '';
	  },
	  
	  // ================= 新增：弹窗及数据获取功能 =================
		async openIndustryStocks(industryName) {
			this.currentIndustry = industryName;
			this.dialogVisible = true;
			this.stocksLoading = true;
			
			// 此处使用 setTimeout 模拟稍后从后端获取真实的股票数据请求
			const resp = await get_industry_data({name: industryName});
			if (resp.data.code !== 1000) {
				Message.error({ message: resp.data.msg, center: true });
				return;
			}

			const mockData = resp.data.data;
			this.industryStocks = mockData.sort((a, b) => b.changepercent - a.changepercent);
			this.stocksLoading = false;
			
			// setTimeout(() => {
			//   this.industryStocks = this.generateMockStocks(industryName);
			//   this.stocksLoading = false;
			// }, 600);
		},
  
	  	// 生成假数据 (用于前端展示效果测试)
	  	async generateMockStocks(name) {
			// const mockData =[];
			// const count = Math.floor(Math.random() * 11) + 10; // 随机 10~20 条数据
			// for(let i = 0; i < count; i++) {
			//   const prevClose = (Math.random() * 80 + 5).toFixed(2); // 昨收 5~85
			//   const change = ((Math.random() * 20) - 10).toFixed(2); // 涨跌幅 -10% ~ 10%
			//   const price = (prevClose * (1 + change / 100)).toFixed(2);
			//   const high = (Math.max(price, prevClose) * (1 + Math.random() * 0.05)).toFixed(2);
			//   const low = (Math.min(price, prevClose) * (1 - Math.random() * 0.05)).toFixed(2);
			
			//   mockData.push({
			// 	code: (Math.random() > 0.5 ? '600' : '300') + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
			// 	name: `${industryName}科${i+1}`,
			// 	price: price,
			// 	change: Number(change), 
			// 	amount: (Math.random() * 50 + 1).toFixed(2) + '亿',
			// 	turnover: (Math.random() * 15 + 1).toFixed(2) + '%',
			// 	prevClose: prevClose,
			// 	high: high,
			// 	low: low
			//   });
			// }
			// 默认按涨幅从大到小排列
			const resp = await get_industry_data({name});
			if (resp.data.code !== 1000) {
				Message.error({ message: resp.data.msg, center: true });
				return;
			}

			const mockData = resp.data.data;
			this.mockData = mockData.sort((a, b) => b.changepercent - a.changepercent);
	  	},
  
	  // 辅助方法：判断涨跌赋予红色或者绿色
	  	getPriceClass(val) {
			const num = Number(val);
			if (num > 0) return 'text-up';
			if (num < 0) return 'text-down';
			return '';
	  	},
  
	  initChart() {
		if (!this.$refs.industryChart) return;
		if (this.chartInstance) {
		  this.chartInstance.dispose();
		}
		this.chartInstance = echarts.init(this.$refs.industryChart);
  
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
			axisLabel: { fontWeight: 'bold', color: axisColor, fontSize: 13 },
			axisTick: { show: false },
			axisLine: { show: false }
		  },
		  series:[
			{
			  name: '成交额',
			  type: 'bar',
			  data: valueData,
			  barWidth: 20, 
			  itemStyle: {
				color: new echarts.graphic.LinearGradient(1, 0, 0, 0,[
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
  /* ========== CSS 变量系统 ========== */
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
	--color-hover: #66b1ff;
	
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
  
  /* 全局容器 */
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
  ::v-deep .section-search-1 .el-input__inner {
	background: var(--bg-app);
	border-color: var(--border-color);
	color: var(--text-primary);
  }
  
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
  
  /* 1. 摘要卡片 */
  .summary-card {
	display: flex;
	flex-wrap: wrap;
	gap: 40px;
  }
  
  .summary-item {
	flex: 1;
	min-width: 300px;
  }
  
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
  
  /* 2. 图表区域 */
  .chart-container {
	width: 100%;
	height: 400px; 
  }
  
  /* 3. 表格区域 */
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
	user-select: none;
  }
  
  /* 排序样式 */
  .sortable { cursor: pointer; transition: color 0.3s; }
  .sortable:hover { color: var(--color-hover); }
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
  .top-rank { background-color: var(--bg-top-rank); color: var(--color-up); }
  
  /* ============ 新增交互设计：行业名称点击及小图标 ============ */
  .industry-name-link {
	display: inline-flex;
	align-items: center;
	cursor: pointer;
	color: var(--text-primary);
	transition: all 0.3s;
  }
  .industry-name-link .hover-icon {
	margin-left: 6px;
	font-size: 14px;
	color: var(--color-blue);
	opacity: 0;
	transition: opacity 0.3s ease;
	transform: translateX(-5px);
  }
  .industry-name-link:hover {
	color: var(--color-blue);
  }
  .industry-name-link:hover .hover-icon {
	opacity: 1;
	transform: translateX(0);
  }
  
  /* 分页组件样式适配 */
  .pagination-wrapper {
	margin-top: 20px;
	display: flex;
	justify-content: center;
  }
  
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
  
  /* ============ 暗黑模式下的弹窗及表格适配样式 ============ */
  .dark-theme ::v-deep .el-dialog {
	background-color: var(--bg-card);
  }
  .dark-theme ::v-deep .el-dialog__title {
	color: var(--text-primary);
  }
  .dark-theme ::v-deep .el-table, 
  .dark-theme ::v-deep .el-table th, 
  .dark-theme ::v-deep .el-table tr {
	background-color: var(--bg-card);
	color: var(--text-regular);
  }
  .dark-theme ::v-deep .el-table th {
	color: var(--text-secondary);
	font-weight: 600;
  }
  .dark-theme ::v-deep .el-table td, 
  .dark-theme ::v-deep .el-table th.is-leaf {
	border-bottom: 1px solid var(--border-color);
  }
  .dark-theme ::v-deep .el-table::before {
	background-color: var(--border-color);
  }
  .dark-theme ::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
	background-color: var(--bg-progress);
  }
  .dark-theme ::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td {
	background-color: var(--bg-hover);
  }
  
  @media (max-width: 768px) {
	.summary-card { gap: 20px; }
	.total-amount .value-wrapper { font-size: 28px; }
	.header-left { flex-direction: column; gap: 5px; align-items: flex-start; }
  }
  </style>
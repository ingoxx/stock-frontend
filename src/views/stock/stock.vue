<template>
	<div class="stock-dashboard">
		<!-- 左侧：股票列表区域 -->
		<div class="sidebar">
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
import * as echarts from 'echarts';

export default {
	name: "StockDashboard",
	data() {
		return {
			searchQuery: '',
			sortKey: 'changePercent',
			sortDir: 'desc',
			currentStock: {},
			historyData: [],
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
			if (!this.chartInstance) {
				this.chartInstance = echarts.init(this.$refs.chartContainer);
			}

			const chartData = [...this.historyData].reverse();
			const xData = chartData.map(item => item.date);
			const yData = chartData.map(item => item.price);
			const isUp = this.currentStock.changePercent >= 0;
			const color = isUp ? '#f56c6c' : '#00bfa5'; // 红/绿

			const option = {
				tooltip: { trigger: 'axis' },
				grid: { top: '10%', left: '1%', right: '3%', bottom: '2%', containLabel: true },
				xAxis: {
					type: 'category',
					data: xData,
					boundaryGap: false,
					axisLine: { lineStyle: { color: '#e0e0e0' } },
					axisLabel: { color: '#909399' }
				},
				yAxis: {
					type: 'value',
					scale: true,
					splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
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
							{ offset: 1, color: 'rgba(255,255,255,0)' }
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
/* ========== 基础样式重置与布局 ========== */
* {
	box-sizing: border-box;
}

.stock-dashboard {
	display: flex;
	height: 100vh;
	/* 全屏高度 */
	background-color: #f5f7fa;
	/* 浅灰底色 */
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	color: #303133;
	overflow: hidden;
	/* 防止出现双重滚动条 */
}

/* 颜色变量类 */
.text-up {
	color: #f56c6c !important;
}

.text-down {
	color: #00bfa5 !important;
}

/* 使用绿色代表跌 */
.text-gray {
	color: #909399 !important;
}

/* 字体优化 */
.font-mono {
	font-family: "Consolas", "Monaco", monospace;
}

/* ========== 左侧侧边栏 ========== */
.sidebar {
	width: 320px;
	background: #ffffff;
	border-right: 1px solid #e4e7ed;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	z-index: 10;
	box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
}

.search-box {
	padding: 15px;
	border-bottom: 1px solid #ebeef5;
}

.search-input {
	width: 100%;
	padding: 8px 12px;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	font-size: 14px;
	outline: none;
	background-color: #f5f7fa;
	transition: all 0.3s;
}

.search-input:focus {
	background-color: #fff;
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.list-header {
	display: flex;
	padding: 10px 15px;
	background-color: #fafafa;
	border-bottom: 1px solid #ebeef5;
	font-size: 12px;
	color: #909399;
	font-weight: 600;
	user-select: none;
}

.sortable {
	cursor: pointer;
}

.sortable:hover {
	color: #409eff;
}

/* 排序图标模拟 */
.sort-icon::after {
	content: '⇅';
	margin-left: 2px;
	opacity: 0.3;
}

.sort-icon.asc::after {
	content: '↑';
	opacity: 1;
	color: #409eff;
}

.sort-icon.desc::after {
	content: '↓';
	opacity: 1;
	color: #409eff;
}

.col-name {
	width: 40%;
}

.col-price {
	width: 30%;
	text-align: right;
}

.col-rate {
	width: 30%;
	text-align: right;
}

.stock-list {
	flex: 1;
	overflow-y: auto;
}

/* 自定义滚动条 */
.stock-list::-webkit-scrollbar {
	width: 6px;
}

.stock-list::-webkit-scrollbar-thumb {
	background: #dcdfe6;
	border-radius: 3px;
}

.stock-item {
	display: flex;
	padding: 12px 15px;
	border-bottom: 1px solid #f2f6fc;
	cursor: pointer;
	align-items: center;
	transition: background 0.2s;
	border-left: 3px solid transparent;
}

.stock-item:hover {
	background-color: #f5f7fa;
}

.stock-item.active {
	background-color: #ecf5ff;
	border-left-color: #409eff;
}

.stock-name {
	font-size: 14px;
	font-weight: 500;
	color: #303133;
}

.stock-code {
	font-size: 12px;
	color: #909399;
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

.bg-up {
	background-color: #fef0f0;
	color: #f56c6c;
}

.bg-down {
	background-color: #f0f9eb;
	color: #00bfa5;
}

.bg-gray {
	background-color: #f4f4f5;
	color: #909399;
}

.no-data {
	text-align: center;
	padding: 20px;
	color: #c0c4cc;
	font-size: 13px;
}

/* ========== 右侧主内容 ========== */
.main-content {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.content-wrapper {
	max-width: 1000px;
	margin: 0 auto;
}

.card {
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
	margin-bottom: 20px;
	padding: 24px;
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
}

.code-tag {
	background: #f4f4f5;
	padding: 2px 6px;
	border-radius: 4px;
	color: #606266;
	font-size: 14px;
}

.market-tag {
	background: #ecf5ff;
	color: #409eff;
	border: 1px solid #d9ecff;
	padding: 1px 5px;
	font-size: 12px;
	border-radius: 2px;
}

.info-row {
	display: flex;
	gap: 20px;
	color: #606266;
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
}

.indicator {
	width: 4px;
	height: 16px;
	background: #409eff;
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
	background-color: #f5f7fa;
	color: #909399;
	font-weight: 600;
	padding: 12px 15px;
	text-align: left;
}

.data-table td {
	padding: 12px 15px;
	border-bottom: 1px solid #ebeef5;
	color: #606266;
}

.data-table tr:hover td {
	background-color: #fafafa;
}

.align-right {
	text-align: right;
}
</style>
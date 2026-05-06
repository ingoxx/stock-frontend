<template>
	<!-- 根节点通过动态 class 绑定主题 -->
	<div class="stock-dashboard" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
		<div class="glass-container">

			<!-- 头部标题与控制区 -->
			<div class="header">
				<div class="title-box">
					<i class="el-icon-data-line pulse-icon"></i>
					<h1>实时行情</h1>
					<i :class="isShowLoading ? 'el-icon-loading' : 'el-icon-data-line'"></i>
				</div>

				<div class="header-controls">
					<!-- 自定义高颜值明暗切换开关 -->
					<div class="custom-theme-toggle" @click="toggleTheme">
						<div class="toggle-track" :class="{ 'track-dark': isDarkMode }">
							<div class="toggle-thumb" :class="{ 'thumb-dark': isDarkMode }">
								<span class="emoji">{{ isDarkMode ? '🌙' : '☀️' }}</span>
							</div>
						</div>
					</div>

					<div class="time-box">{{ currentTime }}</div>
				</div>
			</div>

			<!-- 控制台：输入股票代码 -->
			<div class="control-panel">
				<el-input v-model="searchCode" placeholder="请输入股票代码 (如: 300265)" class="custom-input"
					@keyup.enter.native="fetchStockData" clearable>
					<i slot="prefix" class="el-input__icon el-icon-search"></i>
				</el-input>
				<el-button type="primary" class="add-btn" @click="fetchStockData" :loading="loading">
					<i class="el-icon-plus"></i> 添加自选
				</el-button>
			</div>

			<!-- 股票数据表格 -->
			<div class="table-wrapper">
				<el-table :data="stockList" v-loading="tableLoading" style="width: 100%" class="custom-table" :empty-text="'暂无自选股票，请在上方添加'">

					<el-table-column label="代码/名称" width="180">
						<template slot-scope="scope">
							<div class="stock-info">
								<span class="stock-name">{{ scope.row.name }}</span>
								<span class="stock-code">{{ scope.row.code }}</span>
							</div>
						</template>
					</el-table-column>

					<el-table-column label="最新价" width="120">
						<template slot-scope="scope">
							<span :class="getPriceColorClass(scope.row.changepercent)" class="price-text">
								{{ scope.row.trade }}
							</span>
						</template>
					</el-table-column>

					<el-table-column label="涨跌幅" width="120">
						<template slot-scope="scope">
							<el-tag :type="scope.row.changepercent >= 0 ? 'danger' : 'success'" effect="dark"
								class="change-tag">
								<i :class="scope.row.changepercent >= 0 ? 'el-icon-top' : 'el-icon-bottom'"></i>
								{{ scope.row.changepercent.toFixed(2) }}%
							</el-tag>
						</template>
					</el-table-column>

					<el-table-column label="昨收" prop="settlement"></el-table-column>
					<el-table-column label="今开" prop="open"></el-table-column>
					<el-table-column label="最高" prop="high">
						<template slot-scope="scope">
							<span class="color-up">{{ scope.row.high }}</span>
						</template>
					</el-table-column>
					<el-table-column label="最低" prop="low">
						<template slot-scope="scope">
							<span class="color-down">{{ scope.row.low }}</span>
						</template>
					</el-table-column>
					
					<el-table-column label="市值(亿)" prop="mktcap"></el-table-column>
					<el-table-column label="成交量" width="120">
						<template slot-scope="scope">
							{{ formatNumber(scope.row.volume) }}手
						</template>
					</el-table-column>

					<el-table-column label="成交额" width="120">
						<template slot-scope="scope">
							{{ formatMoney(scope.row.amount) }}
						</template>
					</el-table-column>

					<el-table-column label="更新时间" prop="ticktime" width="120"></el-table-column>

					<el-table-column label="行业" prop="industry" width="120"></el-table-column>

					<el-table-column prop="main_business" label="主营" min-width="200">
						<template slot-scope="scope">
							<el-tooltip placement="top" effect="dark">
								<div slot="content" style="width: 400px; white-space: normal; word-wrap: break-word; word-break: break-all; line-height: 1.5;">
									{{ scope.row.main_business }}
								</div>
								<div style="width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
									{{ scope.row.main_business }}
								</div>
							</el-tooltip>
						</template>
					</el-table-column>

					<el-table-column label="操作" width="100" align="center">
						<template slot-scope="scope">
							<el-button type="text" class="delete-btn" @click="delSelfSelectedStock(scope.row.code)">
								<i class="el-icon-delete"></i>
							</el-button>
						</template>
					</el-table-column>

				</el-table>
			</div>
		</div>
	</div>
</template>

<script>
import {
	get_stock_real_time_data,
	get_stock_real_time_list,
	del_self_selected_stock,
} from '../../api';

import {
	Message,
	MessageBox
} from 'element-ui';

export default {
	name: "StockDashboard",
	data() {
		return {
			isShowLoading: false,
			tableLoading: false,
			isDarkMode: true,
			searchCode: "",
			loading: false,
			stockList: [],
			currentTime: "",
			updateTimer: null,
			clockTimer: null,
			isLooping: true,
		};
	},
	mounted() {
		const savedTheme = localStorage.getItem("dashboard_theme");
		if (savedTheme !== null) {
			this.isDarkMode = savedTheme === "dark";
		}

		this.fetchDataLoop();
		this.startClock();
	},
	activated() {
		this.isLooping = true;
		this.fetchDataLoop();
	},
	deactivated() {
		this.isLooping = false;
	},
	beforeDestroy() {
		this.isLooping = false;
		clearInterval(this.clockTimer);
	},
	beforeRouteLeave(to, from, next) {
		this.isLooping = false;
		next();
	},
	methods: {
		isInStockTime() {
			const now = new Date();

			// JS: 0 = Sunday, 6 = Saturday
			const day = now.getDay();

			// 只在周一～周五有效
			if (day < 1 || day > 5) {
				return false;
			}

			const hours = now.getHours();
			const minutes = now.getMinutes();

			const totalMinutes = hours * 60 + minutes;

			// 上午 9:30 - 11:35
			const morningStart = 9 * 60 + 30;   // 570
			const morningEnd = 11 * 60 + 38;    // 695

			// 下午 13:00 - 15:06
			const afternoonStart = 13 * 60;     // 780
			const afternoonEnd = 15 * 60 + 8;   // 906

			return (
				(totalMinutes >= morningStart && totalMinutes <= morningEnd) ||
				(totalMinutes >= afternoonStart && totalMinutes <= afternoonEnd)
			);
		},
		
		async delSelfSelectedStock(code) {
			const resp = await del_self_selected_stock({ code }).catch(() => {
				Message.error("网络异常，无法删除自选股票");
			});

			if (resp && resp.data && resp.data.code === 1000) {
				this.stockList = this.stockList.filter(item => item.code !== code);
				Message.success(resp.data.msg);
			} else {
				Message.error(resp.data.msg);
			}
		},

		async fetchDataLoop() {
			this.isShowLoading = true;

			const resp = await get_stock_real_time_list().catch(() => {
				Message.error("网络异常，无法获取实时列表");
			});

			if (resp && resp.data && resp.data.code === 1000) {
				console.log("resp.data.data >>> ", resp.data.data);
				
				this.stockList = resp.data.data.sort((a, b) => b.changepercent - a.changepercent);
			} else {
				Message.error(resp.data.msg);
			}

			this.isShowLoading = false;

			// 如果仍然需要循环（页面没切走），才再等 3 秒后触发下一次
			if (this.isLooping) {
				this.updateTimer = setTimeout(() => {
					this.fetchDataLoop();
				}, 3000);
			}
		},

		toggleTheme() {
			this.isDarkMode = !this.isDarkMode;
			localStorage.setItem("dashboard_theme", this.isDarkMode ? "dark" : "light");
		},
		
		async fetchStockData() {
			if (!this.isInStockTime()) {
				Message.info("当前非交易时间，无法添加自选股票");
				return;
			}
			
			if (!this.searchCode.trim()) {
				Message.warning("股票代码不能为空");
				return;
			}

			const exists = this.stockList.find(item => item.code === this.searchCode);
			if (exists) {
				Message.info("该股票已在自选列表中");
				return;
			}

			this.loading = true;

			const resp = await get_stock_real_time_data({ code: this.searchCode }).catch(() => {
				this.loading = false;
			});

			if (resp && resp.data && resp.data.code === 1000) {
				const newData = resp.data.data;
				this.stockList = newData;
				console.log("stockList >>> ", this.stockList);
				
				Message.success(resp.data.msg);
				this.searchCode = "";
				this.loading = false;
			} else {
				Message.error("未找到该股票，请检查代码是否正确");
			}
		},

		removeStock(index) {
			this.stockList.splice(index, 1);
		},

		getPriceColorClass(change) {
			if (change > 0) return "color-up";
			if (change < 0) return "color-down";
			return "color-flat";
		},

		formatNumber(num) {
			if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
			if (num >= 10000) return (num / 10000).toFixed(2) + '万';
			return num;
		},

		formatMoney(num) {
			if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
			if (num >= 10000) return (num / 10000).toFixed(2) + '万';
			return num;
		},

		startClock() {
			this.clockTimer = setInterval(() => {
				const now = new Date();
				this.currentTime = now.toLocaleTimeString('zh-CN', { hour12: false });
			}, 1000);
		},
	}
};
</script>

<style scoped>
/* ================= CSS 变量：定义双主题 ================= */
.theme-dark {
	/* --- 应用你的定制专属色系 --- */
	--bg-app: #121212;
	--bg-card: #1e1e1e;
	--bg-hover: #2c2c2c;
	--bg-progress: #333333;
	--bg-badge: #333333;

	/* 核心映射 */
	--app-bg: var(--bg-app);
	--glass-bg: var(--bg-card);
	/* 取消复杂的渐变透明，换用纯净的高级碳灰 */
	--glass-border: var(--bg-progress);
	/* 边框线融入深色背景 */
	--glass-shadow: rgba(0, 0, 0, 0.4);

	--text-primary: #f5f5f5;
	--text-secondary: #9a9a9a;
	--title-gradient: linear-gradient(to right, #60a5fa, #a78bfa);

	--time-bg: var(--bg-badge);
	/* 时钟背景块使用 333333 */
	--input-bg: var(--bg-app);
	/* 输入框在 1e1e1e 卡片内使用 121212 以增强纵深感 */
	--border-color: var(--bg-progress);
	/* 表格线段统一使用 333333 */

	--table-header-bg: var(--bg-app);
	/* 表头更深一些，区分正文卡片 */
	--table-hover-bg: var(--bg-hover);
	/* 鼠标划过的高亮 2c2c2c */

	--icon-color: #9a9a9a;
	--flat-color: #9a9a9a;
}

.theme-light {
	--app-bg: linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%);
	--glass-bg: rgba(255, 255, 255, 0.6);
	--glass-border: rgba(255, 255, 255, 0.6);
	--glass-shadow: rgba(148, 163, 184, 0.2);
	--text-primary: #1e293b;
	--text-secondary: #64748b;
	--title-gradient: linear-gradient(to right, #2563eb, #7c3aed);
	--time-bg: rgba(255, 255, 255, 0.6);
	--input-bg: rgba(255, 255, 255, 0.8);
	--border-color: #cbd5e1;
	--table-header-bg: rgba(241, 245, 249, 0.6);
	--table-hover-bg: rgba(226, 232, 240, 0.7);
	--icon-color: #94a3b8;
	--flat-color: #475569;
}

/* ================= 全局容器与动画 ================= */
.stock-dashboard {
	min-height: 100vh;
	padding: 40px;
	background: var(--app-bg);
	font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
	color: var(--text-primary);
	transition: background 0.5s ease, color 0.5s ease;
}

.glass-container {
	max-width: 1200px;
	margin: 0 auto;
	background: var(--glass-bg);
	/* 在纯色模式下，模糊虽然影响较小，但也保留兼容白天模式的拟态 */
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border: 1px solid var(--glass-border);
	border-radius: 20px;
	padding: 30px;
	box-shadow: 0 15px 35px -5px var(--glass-shadow);
	transition: all 0.5s ease;
}

/* ================= 头部样式 ================= */
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30px;
	border-bottom: 1px solid var(--border-color);
	padding-bottom: 20px;
	transition: border-color 0.5s ease;
}

.title-box {
	display: flex;
	align-items: center;
	gap: 15px;
}

.title-box h1 {
	margin: 0;
	font-size: 24px;
	font-weight: 600;
	background: var(--title-gradient);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.pulse-icon {
	font-size: 28px;
	color: #3b82f6;
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0% {
		transform: scale(0.95);
		opacity: 0.8;
	}

	50% {
		transform: scale(1.1);
		opacity: 1;
	}

	100% {
		transform: scale(0.95);
		opacity: 0.8;
	}
}

.header-controls {
	display: flex;
	align-items: center;
	gap: 20px;
}

/* ================= 自定义高颜值开关样式 ================= */
.custom-theme-toggle {
	cursor: pointer;
	display: flex;
	align-items: center;
	-webkit-tap-highlight-color: transparent;
}

.toggle-track {
	width: 64px;
	height: 32px;
	background: #cbd5e1;
	border-radius: 30px;
	position: relative;
	transition: background 0.4s ease;
	box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.track-dark {
	background: var(--bg-app);
	/* 黑夜模式底色改为 121212 */
	box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

.toggle-thumb {
	width: 26px;
	height: 26px;
	background: #ffffff;
	border-radius: 50%;
	position: absolute;
	top: 3px;
	left: 3px;
	transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), background 0.4s ease;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.thumb-dark {
	transform: translateX(32px);
	background: var(--bg-progress);
	/* 小球改用 333333，质感绝佳 */
}

.emoji {
	font-size: 14px;
	line-height: 1;
}

/* ================= 其他样式 ================= */
.time-box {
	font-size: 18px;
	font-family: monospace;
	color: var(--text-secondary);
	background: var(--time-bg);
	padding: 8px 16px;
	border-radius: 8px;
	transition: all 0.5s ease;
}

.control-panel {
	display: flex;
	gap: 15px;
	margin-bottom: 25px;
}

::v-deep .custom-input .el-input__inner {
	background-color: var(--input-bg) !important;
	border: 1px solid var(--border-color);
	color: var(--text-primary);
	border-radius: 8px;
	height: 45px;
	transition: all 0.5s ease;
}

::v-deep .custom-input .el-input__inner:focus {
	border-color: #3b82f6;
	box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.add-btn {
	height: 45px;
	border-radius: 8px;
	background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
	border: none;
	font-weight: bold;
	transition: all 0.3s ease;
}

.add-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
}

.table-wrapper {
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid var(--border-color);
	transition: border-color 0.5s ease;
}

::v-deep .custom-table {
	background-color: transparent !important;
}

::v-deep .el-table th,
::v-deep .el-table tr {
	background-color: var(--table-header-bg) !important;
	color: var(--text-secondary);
	border-bottom: 1px solid var(--border-color) !important;
	transition: background-color 0.5s ease, color 0.5s ease;
}

::v-deep .el-table td {
	border-bottom: 1px solid var(--border-color) !important;
	color: var(--text-primary);
	transition: border-color 0.5s ease, color 0.5s ease;
}

::v-deep .el-table--enable-row-hover .el-table__body tr:hover>td {
	background-color: var(--table-hover-bg) !important;
}

::v-deep .el-table::before {
	display: none;
}

.stock-info {
	display: flex;
	flex-direction: column;
}

.stock-name {
	font-weight: bold;
	font-size: 15px;
}

.stock-code {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 4px;
}

.price-text {
	font-size: 18px;
	font-weight: bold;
	font-family: monospace;
}

.color-up {
	color: #ef4444 !important;
	/* 红涨 */
}

.color-down {
	color: #10b981 !important;
	/* 绿跌 */
}

.color-flat {
	color: var(--flat-color) !important;
	/* 平盘 */
}

.change-tag {
	border: none;
	font-family: monospace;
	font-size: 14px;
	font-weight: bold;
}

.delete-btn {
	color: var(--icon-color);
	font-size: 18px;
	transition: color 0.3s;
}

.delete-btn:hover {
	color: #ef4444;
}

</style>
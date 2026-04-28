<template>
	<div :class="['app-wrapper', isDark ? 'theme-dark' : 'theme-light']">
		<div class="main-container">

			<!-- 顶部导航栏 -->
			<header class="glass-header">
				<div class="logo-title">
					<div class="logo-icon">📈</div>
					<h1 class="gradient-text">A股/港股模拟交易终端</h1>
				</div>
				<div class="header-actions">
					<div class="time-badge">{{ currentTime }}</div>
					<button class="theme-toggle-btn" @click="toggleTheme">
						{{ isDark ? '🌞 浅色模式' : '🌙 深色模式' }}
					</button>
				</div>
			</header>

			<!-- 账户信息与操作区 -->
			<div class="account-dashboard glass-card">
				<!-- 账户切换 Tabs -->
				<div class="account-tabs">
					<button v-for="(acc, key) in accounts" :key="key"
						:class="['tab-btn', { active: currentAccountId === key }]" @click="switchAccount(key)">
						{{ acc.name }}
					</button>
				</div>

				<!-- 资金概览 -->
				<div class="account-info">
					<div class="info-item">
						<span class="info-label">账户可用余额</span>
						<span class="info-value balance-text">
							{{ currentAccount.symbol }} {{ formatMoney(currentAccount.balance) }}
						</span>
					</div>
					<div class="info-item">
						<span class="info-label">持仓总市值</span>
						<span class="info-value">
							{{ currentAccount.symbol }} {{ formatMoney(marketValue) }}
						</span>
					</div>
					<div class="info-item">
						<span class="info-label">总资产估值 (初始本金100万)</span>
						<span
							:class="['info-value total-assets', getPriceColor(currentAccount.balance + marketValue, currentAccount.initialCapital)]">
							{{ currentAccount.symbol }} {{ formatMoney(currentAccount.balance + marketValue) }}
						</span>
					</div>

					<div class="action-divider"></div>

					<button class="btn-primary buy-btn" @click="openBuyModal">
						💰 买入股票
					</button>
				</div>
			</div>

			<!-- 核心内容区 -->
			<div class="content-grid">

				<!-- 上方：持仓列表 (el-table + el-pagination) -->
				<div class="glass-card panel-card">
					<div class="panel-header">
						<h2>💼 {{ currentAccount.name }}持仓</h2>
						<input v-model="holdingsSearch" type="text" class="search-input"
							placeholder="🔍 搜索股票代码或名称..." />
					</div>
					<div class="table-container">
						<el-table :data="paginatedHoldings" style="width: 100%" class="custom-glass-table"
							empty-text="当前账户暂无符合条件的持仓">
							<el-table-column prop="code" label="股票代码" min-width="100"></el-table-column>
							<el-table-column prop="name" label="股票名称" min-width="120"></el-table-column>
							<el-table-column label="现价" min-width="100">
								<template #default="{ row }">
									<span :class="getPriceColor(row.price, row.cost)">{{ row.price.toFixed(2) }}</span>
								</template>
							</el-table-column>
							<el-table-column label="成本" min-width="100">
								<template #default="{ row }">
									{{ row.cost.toFixed(2) }}
								</template>
							</el-table-column>
							<el-table-column prop="quantity" label="持仓数量" min-width="100"></el-table-column>
							<el-table-column label="浮动盈亏 (收益率)" min-width="180">
								<template #default="{ row }">
									<span :class="getPriceColor(row.price, row.cost)">
										<span>{{ formatMoney((row.price - row.cost) * row.quantity) }}</span>
										<span class="profit-rate">({{ formatProfitRate(row.price, row.cost) }})</span>
									</span>
								</template>
							</el-table-column>
							<el-table-column label="操作" min-width="100">
								<template #default="{ row }">
									<button class="btn-sell" @click="openSellModal(row)">卖出</button>
								</template>
							</el-table-column>
						</el-table>

						<!-- 持仓分页 -->
						<div class="pagination-wrapper" v-if="totalHoldings > 0">
							<el-pagination v-model:current-page="holdingsCurrentPage" :page-size="pageSize"
								:total="totalHoldings" layout="total, prev, pager, next" class="glass-pagination" />
						</div>
					</div>
				</div>

				<!-- 下方：交易记录 (el-table + el-pagination) -->
				<div class="glass-card panel-card">
					<div class="panel-header">
						<h2>📜 历史成交</h2>
						<input v-model="historySearch" type="text" class="search-input" placeholder="🔍 搜索交易记录..." />
					</div>
					<div class="table-container">
						<el-table :data="paginatedHistory" style="width: 100%" class="custom-glass-table"
							empty-text="当前账户暂无历史交易记录">
							<el-table-column prop="date" label="时间" min-width="170"></el-table-column>
							<el-table-column label="方向" min-width="80">
								<template #default="{ row }">
									<span :class="['type-badge', row.type === 'buy' ? 'badge-buy' : 'badge-sell']">
										{{ row.type === 'buy' ? '买入' : '卖出' }}
									</span>
								</template>
							</el-table-column>
							<el-table-column prop="code" label="代码" min-width="100"></el-table-column>
							<el-table-column prop="name" label="名称" min-width="120"></el-table-column>
							<el-table-column label="成交价" min-width="100">
								<template #default="{ row }">
									{{ row.price.toFixed(2) }}
								</template>
							</el-table-column>
							<el-table-column prop="quantity" label="数量" min-width="100"></el-table-column>
							<el-table-column label="成交金额" min-width="120">
								<template #default="{ row }">
									{{ formatMoney(row.price * row.quantity) }}
								</template>
							</el-table-column>
						</el-table>

						<!-- 历史记录分页 -->
						<div class="pagination-wrapper" v-if="totalHistory > 0">
							<el-pagination v-model:current-page="historyCurrentPage" :page-size="pageSize"
								:total="totalHistory" layout="total, prev, pager, next" class="glass-pagination" />
						</div>
					</div>
				</div>

			</div>

			<!-- 买入弹窗 -->
			<div v-if="showBuyModal" class="modal-overlay">
				<div class="glass-card modal-content">
					<h2 class="modal-title">买入股票 ({{ currentAccount.name }})</h2>
					<div class="form-group">
						<label>股票代码</label>
						<input v-model="buyForm.code" type="text" placeholder="例如: 600519或00700" class="form-input" />
					</div>
					<div class="form-group">
						<label>股票名称 (自定义输入)</label>
						<input v-model="buyForm.name" type="text" placeholder="例如: 贵州茅台 / 腾讯控股" class="form-input" />
					</div>
					<div class="form-group">
						<label>买入价格 ({{ currentAccount.symbol }})</label>
						<input v-model="buyForm.price" type="number" step="0.01" class="form-input" />
					</div>
					<div class="form-group">
						<label>买入数量 (股)</label>
						<div class="input-with-hint">
							<input v-model="buyForm.quantity" type="number" min="100" step="100" class="form-input" />
							<span class="hint-text" v-if="currentAccountId === 'A'">* A股限制：最少100股，且必须是100的整数倍</span>
							<span class="hint-text" v-else>* 港股提示：每手股数视股票而定，此处模拟建议为100的整数倍</span>
						</div>
					</div>
					<div class="form-group total-estimate">
						<span class="estimate-label">预计扣除余额:</span>
						<span class="estimate-value text-red">{{ currentAccount.symbol }} {{ formatMoney(buyForm.price *
							buyForm.quantity || 0) }}</span>
					</div>
					<div class="modal-actions">
						<button class="btn-cancel" @click="showBuyModal = false">取消</button>
						<button class="btn-primary" @click="submitBuy">确认买入</button>
					</div>
				</div>
			</div>

			<!-- 卖出弹窗 -->
			<div v-if="showSellModal" class="modal-overlay">
				<div class="glass-card modal-content">
					<h2 class="modal-title">卖出股票 - {{ sellForm.name }}</h2>
					<div class="form-group">
						<label>持仓成本: {{ currentAccount.symbol }} {{ sellForm.targetStock?.cost.toFixed(2) }}</label>
					</div>
					<div class="form-group">
						<label>卖出价格 ({{ currentAccount.symbol }})</label>
						<input v-model="sellForm.price" type="number" step="0.01" class="form-input" />
					</div>
					<div class="form-group">
						<label>卖出数量 (股)</label>
						<div class="input-with-hint">
							<input v-model="sellForm.quantity" type="number" min="100" step="100"
								:max="sellForm.maxQuantity" class="form-input" />
							<span class="hint-text">* 当前最多可卖: {{ sellForm.maxQuantity }} 股</span>
						</div>
					</div>

					<div class="estimate-card">
						<div class="estimate-row">
							<span class="estimate-label">本次交易盈亏:</span>
							<span
								:class="['estimate-value', getPriceColor(sellForm.price, sellForm.targetStock?.cost)]">
								{{ formatMoney((sellForm.price - (sellForm.targetStock?.cost || 0)) * sellForm.quantity)
								}}
							</span>
						</div>
						<div class="estimate-row"
							style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
							<span class="estimate-label">加回可用余额总计:</span>
							<span class="estimate-value text-green">{{ currentAccount.symbol }} {{
								formatMoney(sellForm.price *
									sellForm.quantity || 0) }}</span>
						</div>
					</div>

					<div class="modal-actions">
						<button class="btn-cancel" @click="showSellModal = false">取消</button>
						<button class="btn-sell-confirm" @click="submitSell">确认卖出</button>
					</div>
				</div>
			</div>

		</div>
	</div>
</template>

<script>
export default {
	name: 'StockTrading',
	data() {
		return {
			// ==== 主题与时钟 ====
			isDark: true,
			currentTime: '',
			timer: null,

			// ==== 数据状态 ====
			holdingsSearch: '',
			historySearch: '',

			// 持仓数据
			allHoldings: [
				{ id: 1, accountId: 'A', code: '600519', name: '贵州茅台', price: 1680.50, quantity: 200, cost: 1650.00 },
				{ id: 2, accountId: 'A', code: '000858', name: '五粮液', price: 145.20, quantity: 500, cost: 152.00 },
				{ id: 3, accountId: 'A', code: '300750', name: '宁德时代', price: 198.80, quantity: 1000, cost: 190.50 },
				{ id: 4, accountId: 'HK', code: '00700', name: '腾讯控股', price: 288.60, quantity: 500, cost: 305.00 },
				{ id: 5, accountId: 'HK', code: '03690', name: '美团-W', price: 92.50, quantity: 1000, cost: 85.00 }
			],

			// 历史记录数据
			allHistory: [
				{ id: 101, accountId: 'A', type: 'buy', code: '600519', name: '贵州茅台', price: 1650.00, quantity: 200, date: '2023-10-20 10:15:30' },
				{ id: 102, accountId: 'A', type: 'buy', code: '000858', name: '五粮液', price: 152.00, quantity: 500, date: '2023-10-18 14:20:00' },
				{ id: 103, accountId: 'A', type: 'buy', code: '300750', name: '宁德时代', price: 190.50, quantity: 1000, date: '2023-10-15 09:45:10' },
				{ id: 104, accountId: 'A', type: 'sell', code: '000001', name: '平安银行', price: 11.20, quantity: 1500, date: '2023-10-14 13:20:00' },
				{ id: 105, accountId: 'A', type: 'buy', code: '601398', name: '工商银行', price: 5.10, quantity: 5000, date: '2023-10-12 10:05:00' },
				{ id: 106, accountId: 'A', type: 'sell', code: '601398', name: '工商银行', price: 5.35, quantity: 5000, date: '2023-10-11 14:30:00' },
				{ id: 107, accountId: 'A', type: 'buy', code: '600036', name: '招商银行', price: 32.50, quantity: 1000, date: '2023-10-10 11:15:00' },
				{ id: 108, accountId: 'A', type: 'sell', code: '600036', name: '招商银行', price: 34.20, quantity: 1000, date: '2023-10-09 09:50:00' },
				{ id: 109, accountId: 'A', type: 'buy', code: '601012', name: '隆基绿能', price: 25.80, quantity: 2000, date: '2023-10-08 14:10:00' },
				{ id: 110, accountId: 'A', type: 'sell', code: '601012', name: '隆基绿能', price: 24.50, quantity: 2000, date: '2023-10-07 10:20:00' },
				{ id: 111, accountId: 'A', type: 'buy', code: '002594', name: '比亚迪', price: 245.00, quantity: 500, date: '2023-10-06 13:45:00' },
				{ id: 112, accountId: 'A', type: 'sell', code: '002594', name: '比亚迪', price: 260.00, quantity: 500, date: '2023-10-05 10:30:00' },
				{ id: 201, accountId: 'HK', type: 'buy', code: '00700', name: '腾讯控股', price: 305.00, quantity: 500, date: '2023-10-21 11:30:00' },
				{ id: 202, accountId: 'HK', type: 'buy', code: '03690', name: '美团-W', price: 85.00, quantity: 1000, date: '2023-10-19 14:20:00' }
			],

			// 多账户体系
			accounts: {
				'A': { id: 'A', name: 'A股账户', initialCapital: 1000000, balance: 1000000, symbol: '￥' },
				'HK': { id: 'HK', name: '港股账户', initialCapital: 1000000, balance: 1000000, symbol: 'HK$' }
			},
			currentAccountId: 'A',

			// ==== 分页参数 ====
			pageSize: 10,
			holdingsCurrentPage: 1,
			historyCurrentPage: 1,

			// ==== 弹窗表单 ====
			showBuyModal: false,
			buyForm: { code: '', name: '', price: 0, quantity: 100 },

			showSellModal: false,
			sellForm: { id: null, code: '', name: '', price: 0, quantity: 100, maxQuantity: 0, targetStock: null }
		};
	},

	computed: {
		currentAccount() {
			return this.accounts[this.currentAccountId];
		},
		marketValue() {
			return this.allHoldings
				.filter(s => s.accountId === this.currentAccountId)
				.reduce((sum, stock) => sum + stock.price * stock.quantity, 0);
		},

		// --- 持仓过滤与分页计算 ---
		baseFilteredHoldings() {
			let list = this.allHoldings.filter(s => s.accountId === this.currentAccountId);
			const keyword = this.holdingsSearch.trim().toLowerCase();
			if (keyword) {
				list = list.filter(s => s.code.includes(keyword) || s.name.includes(keyword));
			}
			return list;
		},
		paginatedHoldings() {
			const start = (this.holdingsCurrentPage - 1) * this.pageSize;
			const end = start + this.pageSize;
			return this.baseFilteredHoldings.slice(start, end);
		},
		totalHoldings() {
			return this.baseFilteredHoldings.length;
		},

		// --- 历史记录过滤与分页计算 ---
		baseFilteredHistory() {
			let list = this.allHistory.filter(r => r.accountId === this.currentAccountId);
			const keyword = this.historySearch.trim().toLowerCase();
			if (keyword) {
				list = list.filter(r => r.code.includes(keyword) || r.name.includes(keyword) || (r.type === 'buy' ? '买入' : '卖出').includes(keyword));
			}
			return list;
		},
		paginatedHistory() {
			const start = (this.historyCurrentPage - 1) * this.pageSize;
			const end = start + this.pageSize;
			return this.baseFilteredHistory.slice(start, end);
		},
		totalHistory() {
			return this.baseFilteredHistory.length;
		}
	},

	watch: {
		// 搜索时重置分页
		holdingsSearch() {
			this.holdingsCurrentPage = 1;
		},
		historySearch() {
			this.historyCurrentPage = 1;
		},
		// 防止删除或卖出数据后，当前页超出最大页数
		totalHoldings(newVal) {
			const maxPage = Math.ceil(newVal / this.pageSize) || 1;
			if (this.holdingsCurrentPage > maxPage) this.holdingsCurrentPage = maxPage;
		},
		totalHistory(newVal) {
			const maxPage = Math.ceil(newVal / this.pageSize) || 1;
			if (this.historyCurrentPage > maxPage) this.historyCurrentPage = maxPage;
		}
	},

	mounted() {
		this.initializeAccBalance();
		this.updateTime();
		this.timer = setInterval(this.updateTime, 1000);
	},

	beforeUnmount() {
		// Vue2 环境如果报错可改成 destroyed()
		if (this.timer) {
			clearInterval(this.timer);
		}
	},

	methods: {
		toggleTheme() {
			this.isDark = !this.isDark;
		},
		updateTime() {
			const now = new Date();
			this.currentTime = now.toLocaleTimeString('zh-CN', { hour12: false });
		},
		initializeAccBalance() {
			Object.keys(this.accounts).forEach(key => {
				const holdCost = this.allHoldings
					.filter(s => s.accountId === key)
					.reduce((sum, stock) => sum + (stock.cost * stock.quantity), 0);
				this.accounts[key].balance = this.accounts[key].initialCapital - holdCost;
			});
		},
		switchAccount(id) {
			this.currentAccountId = id;
			this.holdingsSearch = '';
			this.historySearch = '';
			this.holdingsCurrentPage = 1;
			this.historyCurrentPage = 1;
		},

		// 格式化工具方法
		formatMoney(val) {
			if (!val && val !== 0) return '0.00';
			const sign = val < 0 ? '-' : (val > 0 ? '+' : '');
			return sign + Math.abs(Number(val)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		},
		formatProfitRate(price, cost) {
			if (!cost || cost === 0) return '0.00%';
			const rate = ((price - cost) / cost) * 100;
			const sign = rate > 0 ? '+' : '';
			return sign + rate.toFixed(2) + '%';
		},
		getPriceColor(current, cost) {
			if (current > cost) return 'text-red';
			if (current < cost) return 'text-green';
			return '';
		},

		// 买卖操作方法
		openBuyModal() {
			this.buyForm.code = '';
			this.buyForm.name = '';
			this.buyForm.price = 0;
			this.buyForm.quantity = 100;
			this.showBuyModal = true;
		},
		submitBuy() {
			if (!this.buyForm.code || !this.buyForm.name || this.buyForm.price <= 0 || this.buyForm.quantity <= 0) {
				alert('请完善股票信息和有效的价格/数量！');
				return;
			}

			if (this.currentAccountId === 'A' && (this.buyForm.quantity < 100 || this.buyForm.quantity % 100 !== 0)) {
				alert('A股买入数量必须至少为100股，且为100的整数倍！');
				return;
			}

			const costAmount = this.buyForm.price * this.buyForm.quantity;
			if (costAmount > this.accounts[this.currentAccountId].balance) {
				alert(`余额不足！本次交易需要 ${this.currentAccount.symbol}${this.formatMoney(costAmount)}`);
				return;
			}

			// 扣减余额
			this.accounts[this.currentAccountId].balance -= costAmount;

			// 增加历史
			this.allHistory.unshift({
				id: Date.now(),
				accountId: this.currentAccountId,
				type: 'buy',
				code: this.buyForm.code,
				name: this.buyForm.name,
				price: this.buyForm.price,
				quantity: this.buyForm.quantity,
				date: new Date().toLocaleString('zh-CN', { hour12: false })
			});

			// 增加持仓
			const exist = this.allHoldings.find(s => s.code === this.buyForm.code && s.accountId === this.currentAccountId);
			if (exist) {
				const totalCost = exist.cost * exist.quantity + costAmount;
				exist.quantity += this.buyForm.quantity;
				exist.cost = totalCost / exist.quantity;
				exist.price = this.buyForm.price;
			} else {
				this.allHoldings.push({
					id: Date.now(),
					accountId: this.currentAccountId,
					code: this.buyForm.code,
					name: this.buyForm.name,
					price: this.buyForm.price,
					cost: this.buyForm.price,
					quantity: this.buyForm.quantity
				});
			}

			this.holdingsCurrentPage = 1;
			this.historyCurrentPage = 1;
			this.showBuyModal = false;
		},

		openSellModal(row) {
			this.sellForm.id = row.id;
			this.sellForm.code = row.code;
			this.sellForm.name = row.name;
			this.sellForm.price = row.price;
			this.sellForm.maxQuantity = row.quantity;
			this.sellForm.quantity = row.quantity;
			this.sellForm.targetStock = row;
			this.showSellModal = true;
		},
		submitSell() {
			if (this.sellForm.price <= 0 || this.sellForm.quantity <= 0) {
				alert('请输入有效的卖出价格与数量！');
				return;
			}

			if (this.currentAccountId === 'A' && (this.sellForm.quantity < 100 || (this.sellForm.quantity % 100 !== 0 && this.sellForm.quantity !== this.sellForm.maxQuantity))) {
				if (this.sellForm.quantity !== this.sellForm.maxQuantity) {
					alert('A股卖出数量须为100的倍数，或一次性卖出所有余股！');
					return;
				}
			}

			if (this.sellForm.quantity > this.sellForm.maxQuantity) {
				alert('卖出数量超过持仓可用数量！');
				return;
			}

			const revenueAmount = this.sellForm.price * this.sellForm.quantity;
			this.accounts[this.currentAccountId].balance += revenueAmount;

			this.allHistory.unshift({
				id: Date.now(),
				accountId: this.currentAccountId,
				type: 'sell',
				code: this.sellForm.code,
				name: this.sellForm.name,
				price: this.sellForm.price,
				quantity: this.sellForm.quantity,
				date: new Date().toLocaleString('zh-CN', { hour12: false })
			});

			this.sellForm.targetStock.quantity -= this.sellForm.quantity;
			if (this.sellForm.targetStock.quantity === 0) {
				this.allHoldings = this.allHoldings.filter(s => s.id !== this.sellForm.id);
			}

			this.historyCurrentPage = 1;
			this.showSellModal = false;
		}
	}
};
</script>

<style scoped>
/* ================= 主题变量定义 ================= */
.theme-dark {
	--bg-app: #121212;
	--bg-card: #1e1e1e;
	--bg-hover: #2c2c2c;
	--bg-progress: #333333;
	--bg-badge: #333333;

	--app-bg: var(--bg-app);
	--glass-bg: var(--bg-card);
	--glass-border: var(--bg-progress);
	--glass-shadow: rgba(0, 0, 0, 0.4);
	--text-primary: #f5f5f5;
	--text-secondary: #9a9a9a;
	--title-gradient: linear-gradient(to right, #60a5fa, #a78bfa);
	--time-bg: var(--bg-badge);
	--input-bg: var(--bg-app);
	--border-color: var(--bg-progress);
	--table-header-bg: var(--bg-app);
	--table-hover-bg: var(--bg-hover);
	--icon-color: #9a9a9a;
	--flat-color: #9a9a9a;
	--tab-active-bg: #333333;
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
	--tab-active-bg: #e2e8f0;
}

/* ================= 基础结构与样式 ================= */
* {
	box-sizing: border-box;
}

.app-wrapper {
	min-height: 100vh;
	background: var(--app-bg);
	color: var(--text-primary);
	font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
	transition: background 0.4s ease, color 0.4s ease;
	padding: 24px;
}

.main-container {
	max-width: 1400px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.glass-card {
	background: var(--glass-bg);
	border: 1px solid var(--glass-border);
	box-shadow: 0 8px 32px var(--glass-shadow);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border-radius: 16px;
	transition: all 0.3s ease;
}

/* ================= 头部导航 ================= */
.glass-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px 24px;
	background: var(--glass-bg);
	border: 1px solid var(--glass-border);
	box-shadow: 0 4px 16px var(--glass-shadow);
	backdrop-filter: blur(12px);
	border-radius: 16px;
}

.logo-title {
	display: flex;
	align-items: center;
	gap: 12px;
}

.logo-icon {
	font-size: 28px;
}

.gradient-text {
	margin: 0;
	font-size: 24px;
	font-weight: 700;
	background: var(--title-gradient);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
}

.time-badge {
	background: var(--time-bg);
	padding: 6px 16px;
	border-radius: 20px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
	border: 1px solid var(--border-color);
}

.theme-toggle-btn {
	background: transparent;
	border: 1px solid var(--border-color);
	color: var(--text-primary);
	padding: 6px 16px;
	border-radius: 20px;
	cursor: pointer;
	font-weight: bold;
	transition: all 0.2s;
}

.theme-toggle-btn:hover {
	background: var(--table-hover-bg);
}

/* ================= 账户面板与操作 ================= */
.account-dashboard {
	display: flex;
	flex-direction: column;
	padding: 0;
	overflow: hidden;
}

.account-tabs {
	display: flex;
	border-bottom: 1px solid var(--border-color);
	background: rgba(0, 0, 0, 0.05);
}

.tab-btn {
	flex: 1;
	padding: 16px;
	background: transparent;
	border: none;
	color: var(--text-secondary);
	font-size: 16px;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.3s;
}

.tab-btn:hover {
	background: var(--table-hover-bg);
}

.tab-btn.active {
	background: var(--tab-active-bg);
	color: var(--text-primary);
	border-bottom: 3px solid #60a5fa;
}

.account-info {
	display: flex;
	align-items: center;
	padding: 24px;
	gap: 32px;
}

.info-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.info-label {
	font-size: 13px;
	color: var(--text-secondary);
}

.info-value {
	font-size: 20px;
	font-weight: bold;
	color: var(--text-primary);
}

.balance-text {
	color: #60a5fa;
	font-size: 24px;
}

.total-assets {
	background: var(--title-gradient);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.action-divider {
	width: 1px;
	height: 40px;
	background: var(--border-color);
	margin: 0 16px;
}

.btn-primary {
	background: var(--title-gradient);
	color: #fff;
	border: none;
	padding: 12px 24px;
	border-radius: 8px;
	font-size: 16px;
	font-weight: bold;
	cursor: pointer;
	box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	transition: transform 0.2s, box-shadow 0.2s;
	margin-left: auto;
}

.btn-primary:hover {
	transform: translateY(-2px);
	box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
}

/* ================= 核心面板 ================= */
.content-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 24px;
}

.panel-card {
	padding: 24px;
}

.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.panel-header h2 {
	margin: 0;
	font-size: 20px;
	color: var(--text-primary);
	display: flex;
	align-items: center;
	gap: 8px;
}

.search-input {
	background: var(--input-bg);
	border: 1px solid var(--border-color);
	color: var(--text-primary);
	padding: 8px 16px;
	border-radius: 8px;
	width: 250px;
	outline: none;
	transition: border-color 0.2s;
}

.search-input:focus {
	border-color: #60a5fa;
}

/* ================= Element UI 表格与分页穿透 ================= */
.table-container {
	overflow-x: auto;
}

:deep(.custom-glass-table) {
	background-color: transparent !important;
	color: var(--text-primary) !important;
}

:deep(.custom-glass-table tr),
:deep(.custom-glass-table th.el-table__cell),
:deep(.custom-glass-table td.el-table__cell) {
	background-color: transparent !important;
	border-bottom: 1px solid var(--border-color) !important;
	white-space: nowrap !important;
	word-break: keep-all !important;
}

:deep(.custom-glass-table th.el-table__cell) {
	background-color: var(--table-header-bg) !important;
	color: var(--text-secondary) !important;
	font-weight: 600;
	font-size: 14px;
}

:deep(.custom-glass-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell) {
	background-color: var(--table-hover-bg) !important;
}

:deep(.custom-glass-table::before),
:deep(.custom-glass-table::after),
:deep(.el-table__inner-wrapper::before) {
	display: none !important;
}

:deep(.el-table__empty-text) {
	color: var(--text-secondary);
}

/* 分页组件样式覆写以融合主题 */
.pagination-wrapper {
	display: flex;
	justify-content: flex-end;
	margin-top: 20px;
}

:deep(.glass-pagination) {
	--el-pagination-bg-color: transparent;
	--el-pagination-text-color: var(--text-secondary);
	--el-pagination-button-color: var(--text-secondary);
	--el-pagination-button-disabled-bg-color: transparent;
	--el-pagination-hover-color: #60a5fa;
}

:deep(.glass-pagination .el-pager li) {
	background: transparent !important;
	color: var(--text-secondary) !important;
	transition: all 0.2s;
}

:deep(.glass-pagination .el-pager li.is-active) {
	color: #60a5fa !important;
	font-weight: bold;
}

:deep(.glass-pagination button) {
	background-color: transparent !important;
	color: var(--text-secondary) !important;
}

:deep(.glass-pagination button:disabled) {
	color: var(--border-color) !important;
}

:deep(.glass-pagination span.el-pagination__total) {
	color: var(--text-secondary);
}

.profit-rate {
	font-size: 12px;
	margin-left: 6px;
	opacity: 0.9;
}

/* ================= 按钮与状态标签 ================= */
.btn-sell {
	background: transparent;
	color: #f56c6c;
	border: 1px solid #f56c6c;
	padding: 4px 12px;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s;
}

.btn-sell:hover {
	background: #f56c6c;
	color: #fff;
}

.type-badge {
	display: inline-block;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: bold;
}

.badge-buy {
	background: rgba(245, 108, 108, 0.15);
	color: #f56c6c;
}

.badge-sell {
	background: rgba(103, 194, 58, 0.15);
	color: #67c23a;
}

.text-red {
	color: #f56c6c !important;
	font-weight: bold;
}

.text-green {
	color: #67c23a !important;
	font-weight: bold;
}

/* ================= 弹窗样式 ================= */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	backdrop-filter: blur(4px);
}

.modal-content {
	width: 440px;
	padding: 32px;
}

.modal-title {
	margin-top: 0;
	margin-bottom: 24px;
	font-size: 22px;
}

.form-group {
	margin-bottom: 20px;
}

.form-group label {
	display: block;
	margin-bottom: 8px;
	color: var(--text-secondary);
	font-size: 14px;
}

.form-input {
	width: 100%;
	background: var(--input-bg);
	border: 1px solid var(--border-color);
	color: var(--text-primary);
	padding: 10px 14px;
	border-radius: 8px;
	outline: none;
	font-size: 15px;
	transition: border-color 0.2s;
}

.form-input:focus {
	border-color: #60a5fa;
}

.input-with-hint {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.hint-text {
	font-size: 12px;
	color: var(--text-secondary);
}

.total-estimate {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px;
	background: var(--table-header-bg);
	border-radius: 8px;
	margin-top: 8px;
}

.estimate-label {
	font-size: 14px;
	color: var(--text-secondary);
}

.estimate-value {
	font-size: 18px;
}

.estimate-card {
	background: var(--table-header-bg);
	padding: 16px;
	border-radius: 8px;
	margin-top: 24px;
}

.estimate-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	margin-top: 32px;
}

.btn-cancel {
	background: transparent;
	color: var(--text-primary);
	border: 1px solid var(--border-color);
	padding: 10px 20px;
	border-radius: 8px;
	cursor: pointer;
}

.btn-cancel:hover {
	background: var(--table-hover-bg);
}

.btn-sell-confirm {
	background: #f56c6c;
	color: #fff;
	border: none;
	padding: 10px 20px;
	border-radius: 8px;
	cursor: pointer;
	font-weight: bold;
}

.btn-sell-confirm:hover {
	background: #e05656;
}

/* ================= 响应式 ================= */
@media (max-width: 768px) {
	.account-info {
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
	}

	.action-divider {
		display: none;
	}

	.btn-primary {
		margin-left: 0;
		width: 100%;
	}
}
</style>
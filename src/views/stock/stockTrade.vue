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
					<button class="theme-toggle-btn" @click="toggleStockRealTime">
						{{ isOpen ? '实时刷新已开启' : '实时刷新已关闭' }}
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
						<span class="info-label">持仓总市值 (未扣卖出费)</span>
						<span class="info-value">
							{{ currentAccount.symbol }} {{ formatMoney(marketValue) }}
						</span>
					</div>

					<!-- 总盈亏显示 (持仓浮动盈亏 + 历史卖出已实现盈亏) -->
					<div class="info-item">
						<span class="info-label">总盈亏</span>
						<span :class="['info-value', getProfitColor(currentTotalProfit.amount)]">
							{{ formatMoney(currentTotalProfit.amount) }}
						</span>
					</div>

					<button class="btn-primary buy-btn" @click="openBuyModal">
						💰 买入股票
					</button>
				</div>
			</div>

			<!-- 核心内容区 -->
			<div class="content-grid">

				<!-- 上方：持仓列表 (绑定 allHoldings 数据源) -->
				<div class="glass-card panel-card">

					<div class="panel-header">
						<h2>💼 {{ currentAccount.name }}持仓</h2>
						<span class="refresh-btn">
							<i :class="isRunIcon" @click="initializeAccBalance()"></i>
							<i class="el-icon-search search-icon" @click="handlerOpenRtSearch()"></i>
						</span>
						<input v-model="holdingsSearch" type="text" class="search-input" placeholder="🔍 搜索股票代码或名称..." />
					</div>

					<div class="table-container">
						<el-table :data="paginatedHoldings" style="width: 100%" class="custom-glass-table"
							empty-text="当前账户暂无符合条件的持仓"
							v-loading="allHoldingsLoading"
							element-loading-text="拼命加载中"
							element-loading-spinner="el-icon-loading"
							element-loading-background="rgba(0, 0, 0, 0.8)"
							>

							<el-table-column prop="ticktime" label="时间" min-width="180"></el-table-column>
							<el-table-column prop="code" label="股票代码" min-width="90">
								<template slot-scope="scope">
									<span class="stock-code-link" @click="get_stock_rt_data_v2(scope.row)">
										{{ scope.row.code }} <i class="el-icon-data-line"></i>
									</span>
								</template>
							</el-table-column>
							<el-table-column prop="name" label="股票名称" min-width="110"></el-table-column>
							<el-table-column prop="industry" label="所属行业" min-width="110"></el-table-column>
							
							<!-- 状态列 -->
							<el-table-column label="状态" min-width="80">
								<template slot-scope="{ row }">
									<span v-if="row.is_deal_status === 1" class="status-badge pending">委托中</span>
									<span v-else-if="row.is_deal_status === 2" class="status-badge success">持仓中</span>
								</template>
							</el-table-column>

							<el-table-column label="现价" min-width="90">
								<template slot-scope="{ row }">
									<span :class="getPriceColor(row.trade, row.price)">{{ formatPrice(row.trade) }}</span>
								</template>
							</el-table-column>

							<el-table-column label="涨跌幅" min-width="90">
								<template slot-scope="{ row }">
									<span :class="getChangePerColor(row.changepercent)">{{ formatPrice(row.changepercent) }}%</span>
								</template>
							</el-table-column>

							<el-table-column label="摊薄成本" min-width="90">
								<template slot-scope="{ row }">
									{{ formatPrice(row.price) }}
								</template>
							</el-table-column>
							
							<el-table-column prop="quantity" label="持仓数量(股)" min-width="100"></el-table-column>
							
							<!-- 最新市值 / 总本金 -->
							<el-table-column label="最新市值 / 总成本" min-width="140">
								<template slot-scope="{ row }">
									<template v-if="row.is_deal_status === 2">
										<div :class="getPriceColor(row.trade, row.price)" style="font-weight: bold; line-height: 1.2;">
											{{ formatMoney(row.trade * row.quantity) }}
										</div>
										<div style="font-size: 12px; color: var(--text-secondary); line-height: 1.2; margin-top: 4px;">
											本金: {{ formatMoney(row.price * row.quantity) }}
										</div>
									</template>
									<template v-else>
										<div style="color: var(--text-secondary); line-height: 1.2;">--</div>
										<div style="font-size: 12px; color: var(--text-secondary); line-height: 1.2; margin-top: 4px;">
											冻结: {{ formatMoney(row.price * row.quantity) }}
										</div>
									</template>
								</template>
							</el-table-column>

							<!-- 浮动盈亏列：严格根据 is_deal_status 判断渲染 -->
							<el-table-column label="浮动盈亏 (收益率)" min-width="160">
								<template slot-scope="{ row }">
									<!-- 只有持仓中状态(is_deal_status==2)才显示浮动盈亏 -->
									<span v-if="row.is_deal_status === 2" :class="getProfitColor(row.profit_loss)">
										<span>{{ formatMoney(row.profit_loss) }}</span>
										<span class="profit-rate">({{ formatBep(row.bep) }})</span>
									</span>
									<!-- 委托中(is_deal_status==1)使用其它字符替代显示 -->
									<span v-else style="color: var(--text-secondary); font-weight: normal;">--</span>
								</template>
							</el-table-column>

							<!-- 操作列 -->
							<el-table-column label="操作" min-width="200">
								<template slot-scope="{ row }">
									<el-button 
										v-if="row.is_deal_status === 1" 
										size="mini" 
										type="warning" 
										plain
										@click="cancelOrder(row)"
									>
										撤回
									</el-button>

									<el-button 
										v-if="row.is_deal_status === 2" 
										size="mini" 
										type="danger" 
										plain
										@click="openSellModal(row)"
									>
										卖出
									</el-button>

									<el-button 
										size="mini" 
										type="danger" 
										plain
										@click="changeSellModal(row)"
									>
										修改
									</el-button>
								</template>
							</el-table-column>
						</el-table>

						<!-- 持仓分页 -->
						<div class="pagination-wrapper" v-if="totalHoldings > 0">
							<el-pagination 
								:current-page.sync="holdingsCurrentPage" 
								@current-change="handleHoldingsPageChange"
								:page-size="pageSize"
								:total="totalHoldings" 
								layout="total, prev, pager, next" 
								class="glass-pagination" />
						</div>
					</div>
				</div>

				<!-- 下方：交易记录 (绑定 allHistory 数据源) -->
				<div class="glass-card panel-card">
					<div class="panel-header">
						<h2>📜 历史成交</h2>
						<input v-model="historySearch" type="text" class="search-input" placeholder="🔍 搜索交易记录..." />
					</div>
					<div class="table-container">
						<!-- 修改点：添加 sort-change 事件 -->
						<el-table :data="paginatedHistory" style="width: 100%" class="custom-glass-table"
							empty-text="当前账户暂无历史交易记录" @sort-change="handleHistorySortChange">
							
							<!-- 修改点：时间列增加 prop 和 sortable="custom" -->
							<el-table-column prop="date" label="时间" min-width="190" sortable="custom"></el-table-column>

							<!-- 方向列 -->
							<el-table-column label="方向" min-width="80">
								<template slot-scope="{ row }">
									<span v-if="row.trade_type === 3" class="type-badge badge-buy">买入</span>
									<span v-else-if="row.trade_type === 1" class="type-badge badge-sell">卖出</span>
									<span v-else-if="row.trade_type === 2" class="type-badge badge-cancel">撤单</span>
								</template>
							</el-table-column>

							<el-table-column prop="code" label="代码" min-width="100"></el-table-column>
							<el-table-column prop="name" label="名称" min-width="120"></el-table-column>

							<el-table-column label="成交价(挂单价)" min-width="110">
								<template slot-scope="{ row }">
									{{ formatPrice(row.price) }}
								</template>
							</el-table-column>

							<el-table-column prop="quantity" label="数量" min-width="100"></el-table-column>

							<el-table-column label="涉及总金额" min-width="120">
								<template slot-scope="{ row }">
									{{ formatMoney(row.price * row.quantity) }}
								</template>
							</el-table-column>

							<!-- 修改点：盈亏记录列增加 prop 和 sortable="custom" -->
							<el-table-column prop="profit_loss" label="盈亏(收益率)" min-width="170" sortable="custom">
								<template slot-scope="{ row }">
									<span v-if="row.trade_type === 1" :class="getProfitColor(row.profit_loss)">
										<span>{{ formatMoney(row.profit_loss) }}</span>
										<span class="profit-rate">({{ formatBep(row.bep) }})</span>
									</span>
									<span v-else style="color: var(--text-secondary);">--</span>
								</template>
							</el-table-column>
						</el-table>

						<!-- 历史记录分页 -->
						<div class="pagination-wrapper" v-if="totalHistory > 0">
							<el-pagination 
								:current-page.sync="historyCurrentPage" 
								@current-change="handleHistoryPageChange"
								:page-size="pageSize"
								:total="totalHistory" 
								layout="total, prev, pager, next" 
								class="glass-pagination" />
						</div>
					</div>
				</div>

			</div>

			<!-- 买入弹窗 -->
			<div v-if="showBuyModal" class="modal-overlay">
				<div class="glass-card modal-content">
					<h2 class="modal-title">{{ isChange ? '修改买入股票' : '买入股票' }}</h2>
					<div class="form-group">
						<label>股票代码 / 名称</label>
						<div style="display: flex; gap: 10px;">
							<input v-model="buyForm.code" type="text" placeholder="代码: 600519" class="form-input" @blur="getStockInfo"/>
							<input v-model="buyForm.name" type="text" placeholder="名称: 贵州茅台" class="form-input" />
						</div>
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

					<div class="estimate-card">
						<div class="estimate-row">
							<span class="estimate-label">股票本金:</span>
							<span class="estimate-value">{{ formatMoney(buyForm.price * buyForm.quantity) }}</span>
						</div>
						<div class="estimate-row" style="margin-top: 6px;">
							<span class="estimate-label">预估手续费(佣金最低5元+过户费):</span>
							<span class="estimate-value text-red">+ {{ formatMoney(buyFormFee) }}</span>
						</div>
						<div class="estimate-row" style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
							<span class="estimate-label">共需冻结资金:</span>
							<span class="estimate-value text-red">{{ currentAccount.symbol }} {{ formatMoney((buyForm.price * buyForm.quantity) + buyFormFee) }}</span>
						</div>
						<div class="estimate-row" style="margin-top: 6px;">
							<span class="estimate-label" style="font-size: 12px; color: #e6a23c;">* 买入成功后，持仓成本将被摊薄拉高至: {{ formatPrice(((buyForm.price * buyForm.quantity) + buyFormFee) / (buyForm.quantity || 1)) }} / 股</span>
						</div>
					</div>

					<div class="modal-actions">
						<button class="btn-cancel" @click="cancelBuyModal">取消</button>
						<el-button :loading="buyLoading" type="primary" class="btn-primary" @click="buyOrChange">{{ isChange ? '提交修改' : '确认买入' }}</el-button>
					</div>
				</div>
			</div>

			<!-- 卖出弹窗 -->
			<div v-if="showSellModal" class="modal-overlay">
				<div class="glass-card modal-content">
					<h2 class="modal-title">卖出股票 - {{ sellForm.name }}</h2>
					<div class="form-group">
						<label>持仓摊薄成本: {{ currentAccount.symbol }} {{ sellForm.targetStock ? formatPrice(sellForm.targetStock.price) : '0.00' }}</label>
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
							<span class="estimate-label">卖出总金额:</span>
							<span class="estimate-value">{{ formatMoney(sellForm.price * sellForm.quantity) }}</span>
						</div>
						<div class="estimate-row" style="margin-top: 6px;">
							<span class="estimate-label">预估手续费(印花税+佣金+过户费):</span>
							<span class="estimate-value text-green">- {{ formatMoney(sellFormFee) }}</span>
						</div>
						
						<!-- 计算本次盈亏：(卖出价 - 买入成本) * 数量 - 本次卖出手续费 -->
						<div class="estimate-row" style="margin-top: 6px;">
							<span class="estimate-label">本次交易净盈亏:</span>
							<span :class="['estimate-value', getPriceColor((sellForm.price * sellForm.quantity) - sellFormFee, (sellForm.targetStock ? sellForm.targetStock.price : 0) * sellForm.quantity)]">
								{{ formatMoney(((sellForm.price * sellForm.quantity) - sellFormFee) - ((sellForm.targetStock ? sellForm.targetStock.price : 0) * sellForm.quantity)) }}
							</span>
						</div>
						
						<div class="estimate-row" style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
							<span class="estimate-label">实际净回款:</span>
							<span class="estimate-value text-green">{{ currentAccount.symbol }} {{ formatMoney((sellForm.price * sellForm.quantity) - sellFormFee) }}</span>
						</div>
					</div>

					<div class="modal-actions">
						<button class="btn-cancel" @click="showSellModal = false">取消</button>
						<el-button class="btn-sell-confirm" @click="submitSell" :loading="sellLoading">确认卖出</el-button>
					</div>
				</div>
			</div>

			<!-- 实时详情弹窗 -->
			<el-dialog 
				:title="`${currentCode}-${currentName}实时详情`" 
				:visible.sync="dialogVisible" 
				:close-on-click-modal="false"
				@close="closeAll"
				destroy-on-close
				:center="true"
				custom-class="custom-glass-dialog"
			>
				<el-table :data="stockRealTimeDataDetails()"  class="custom-glass-table" empty-text="暂无数据">
					<el-table-column label="涨跌幅" min-width="90">
						<template slot-scope="{ row }">
							<span :class="getChangePerColor(row.changepercent)">{{ formatPrice(row.changepercent) }}%</span>
						</template>
					</el-table-column>
					<el-table-column label="实时" prop="trade">
						<template slot-scope="scope">
							<span class="text-yellow">{{ scope.row.trade }}</span>
						</template>
					</el-table-column>
					<el-table-column label="昨收" prop="settlement"></el-table-column>
					<el-table-column label="今开" prop="open"></el-table-column>
					<el-table-column label="最高" prop="high">
						<template slot-scope="scope">
							<span class="text-red">{{ scope.row.high }}</span>
						</template>
					</el-table-column>
					<el-table-column label="最低" prop="low">
						<template slot-scope="scope">
							<span class="text-green">{{ scope.row.low }}</span>
						</template>
					</el-table-column>
				</el-table>
			</el-dialog>

			<!-- 实时搜索 -->
			<el-dialog 
				title="实时详情查询" 
				:visible.sync="rtVisible" 
				:close-on-click-modal="false" 
				destroy-on-close
				:center="true"
				custom-class="custom-glass-dialog"
			>
				<div class="stock-rt-search">
					<el-input v-model="currentCode" placeholder="请输入股票代码" @keyup.enter.native="get_stock_rt_data_v2()" clearable></el-input>
					<el-button type="primary" icon="el-icon-search" @click="get_stock_rt_data_v2()" :loading="rtLoading">查询</el-button>
				</div>
				
			</el-dialog>
		</div>
	</div>
</template>

<script>
import {
	get_stock_real_time_data,
	get_stock_real_time_list,
	update_trade_status,
	get_stock_info_data,
	stock_real_time_switch,
	get_stock_rt_data,
	change_holding_data,
} from '../../api';

import {
	Message,
	MessageBox
} from 'element-ui';

export default {
	name: 'StockTrading',
	data() {
		return {
			isChange: false,
			sellLoading: false,
			allHoldingsLoading: false,
			rtLoading: false,
			rtVisible: false,
			dialogVisible: false,
			currentName: "",
			currentCode: "",
			isComponentActive: true,
			pollingTimer: null,
			buyLoading: false,
			isLoadIcon: "el-icon-loading",
            isRunIcon: "el-icon-refresh",
			stockList:[],
			isShowLoading: false,
			// ==== 主题与时钟 ====
			isDark: true,
			isOpen: false,
			currentTime: '',
			timer: null,

			// ==== 数据状态 ====
			holdingsSearch: '',
			historySearch: '',
			
			// ==== 修改点：新增历史记录排序状态 ====
			historySortProp: null,   // 排序字段
			historySortOrder: null,  // 排序方式：'ascending' | 'descending' | null

			// 持仓数据
			allHoldings:[],

			// 历史记录数据
			allHistory:[],

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

		buyFormFee() {
			return this.calculateA_ShareFee('buy', this.buyForm.price, this.buyForm.quantity);
		},

		sellFormFee() {
			return this.calculateA_ShareFee('sell', this.sellForm.price, this.sellForm.quantity);
		},

		marketValue() {
			return this.allHoldings
				.filter(s => s.accountId === this.currentAccountId)
				.reduce((sum, stock) => {
					if (stock.is_deal_status === 1) {
						// 委托中：只计入冻结的本金 (price * 数量)
						return sum + (stock.price * stock.quantity);
					} else if (stock.is_deal_status === 2) {
						// 持仓中：按最新现价浮动计算市值 (trade * 数量)
						return sum + (stock.trade * stock.quantity);
					}
					return sum;
				}, 0);
		},

		// 动态统计：当前账户的总盈亏 = 持仓浮动盈亏 + 历史卖出已实现盈亏
		currentTotalProfit() {
			// 1. 持仓中的浮动盈亏 (is_deal_status === 2)
			const holdings = this.allHoldings.filter(s => s.accountId === this.currentAccountId && s.is_deal_status === 2);
			const holdingsProfit = holdings.reduce((sum, stock) => sum + (Number(stock.profit_loss) || 0), 0);

			// 2. 历史卖出已实现的盈亏 (trade_type === 1)
			const historySells = this.allHistory.filter(r => r.accountId === this.currentAccountId && r.trade_type === 1);
			const realizedProfit = historySells.reduce((sum, record) => sum + (Number(record.profit_loss) || 0), 0);

			return {
				amount: holdingsProfit + realizedProfit
			};
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

		// --- 修改点：历史过滤、全局排序与分页计算 ---
		// --- 修改点：历史过滤、全局排序与分页计算 ---
		baseFilteredHistory() {
			let list = this.allHistory.filter(r => r.accountId === this.currentAccountId);
			const keyword = this.historySearch.trim().toLowerCase();
			if (keyword) {
				list = list.filter(r => {
					let typeStr = r.trade_type === 3 ? '买入' : (r.trade_type === 1 ? '卖出' : '撤单');
					return r.code.includes(keyword) || r.name.includes(keyword) || typeStr.includes(keyword);
				});
			}

			// 如果设置了排序规则，则进行全局数据排序
			if (this.historySortProp && this.historySortOrder) {
				list.sort((a, b) => {
					let valA = a[this.historySortProp];
					let valB = b[this.historySortProp];

					if (this.historySortProp === 'profit_loss') {
						// 修复点 1：与UI显示保持一致。只有卖出(1)才具备真实的浮动/实现盈亏，其他操作(买入/撤单)全部视作0处理
						valA = a.trade_type === 1 ? (Number(a.profit_loss) || 0) : 0;
						valB = b.trade_type === 1 ? (Number(b.profit_loss) || 0) : 0;
					} else if (this.historySortProp === 'date') {
						// 修复点 2：兼容 Safari 和 iOS，防止带 '-' 的字符串格式 new Date() 解析返回 NaN
						let timeA = new Date(a.date).getTime();
						if (isNaN(timeA)) timeA = new Date(String(a.date).replace(/-/g, '/')).getTime();
						valA = timeA || 0;

						let timeB = new Date(b.date).getTime();
						if (isNaN(timeB)) timeB = new Date(String(b.date).replace(/-/g, '/')).getTime();
						valB = timeB || 0;
					}

					if (valA < valB) {
						return this.historySortOrder === 'ascending' ? -1 : 1;
					} else if (valA > valB) {
						return this.historySortOrder === 'ascending' ? 1 : -1;
					} else {
						// 修复点 3：增加次级稳定排序。如果当前排序字段值相同(比如一堆的 '--')，则使用时间倒序排列，防止行数据乱跳
						let timeStrA = String(a.date || '').replace(/-/g, '/');
						let timeStrB = String(b.date || '').replace(/-/g, '/');
						let tA = new Date(timeStrA).getTime() || 0;
						let tB = new Date(timeStrB).getTime() || 0;
						return tB - tA; // 默认时间从大到小（最新）
					}
				});
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
		holdingsSearch() {
			this.holdingsCurrentPage = 1;
		},
		historySearch() {
			this.historyCurrentPage = 1;
		},
		totalHoldings(newVal) {
			const maxPage = Math.ceil(newVal / this.pageSize) || 1;
			if (this.holdingsCurrentPage > maxPage) this.holdingsCurrentPage = maxPage;
		},
		totalHistory(newVal) {
			const maxPage = Math.ceil(newVal / this.pageSize) || 1;
			if (this.historyCurrentPage > maxPage) this.historyCurrentPage = maxPage;
		}
	},

	beforeDestroy() {
		// 1. 标记组件已销毁，彻底阻断任何正在路上的异步回调重新触发定时器
		this.isComponentActive = false; 

		// 2. 清除时钟定时器
		if (this.timer) {
			clearInterval(this.timer);
		}
		// 3. 清除轮询定时器
		if (this.pollingTimer) {
			clearTimeout(this.pollingTimer);
			this.pollingTimer = null;
		}

		// 【新增】退出当前页面时，销毁主题监听
        this.$root.$off('theme-change');
	},

	beforeRouteLeave(to, from, next) {
		this.isComponentActive = false;
		next();
	},

	activated() {
		this.isComponentActive = true;
		this.loopAccBalance();
	},

	deactivated() {
		this.isComponentActive = false;
	},

	mounted() {
		// this.initializeAccBalance();
		const isOpen = localStorage.getItem("isOpen");
		if (isOpen !== null) {
			this.isOpen = isOpen === "2" ? true : false;
		}

		this.loopAccBalance(); 
		this.updateTime();
		this.timer = setInterval(this.updateTime, 1000);
		this.initTheme();
	},

	methods: {

		initTheme() {
			// 优先读取本地主题，如果没有则默认开启黑夜模式(true)
			const savedTheme = localStorage.getItem('app-theme-dark');
			if (savedTheme !== null) {
				this.isDark = savedTheme === 'true';
			}

			// 2. 实时监听外部 admin.vue 点击侧边栏弹窗传来的主题切换指令
            this.$root.$on('theme-change', (val) => {
                this.isDark = val;
            });
		},

		closeAll() {
			this.rtVisible = false;
		},

		handlerOpenRtSearch() {
			this.rtVisible = true;
		},

		async get_stock_rt_data_v2(row) {
			if (row && row.code) {
				this.currentCode = row.code;
			}

			if (!this.currentCode) {
				Message.warning('请输入股票代码！');
				return;
			}

			this.rtLoading = true;
			this.allHoldingsLoading = true;
			const resp = await get_stock_rt_data({code: this.currentCode}).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000) {
				const data = resp.data.data;
				this.stockList = [data];
				const row = {code: data.code, name: data.name};
				console.log("get_stock_rt_data_v2 -> data:", resp.data);
				
				this.handleShowStockDetails(row);
			} else {
				Message.error(resp?.data?.msg || '获取实时数据失败');
			}
			this.rtLoading = false;
			this.allHoldingsLoading = false;
		},

		// 个股的实时行情
		stockRealTimeDataDetails() {
			if (!this.currentCode) return [];
			const data = this.stockList.filter(s => s.code === this.currentCode);
			return data || [];
		},

		handleShowStockDetails(row) {
			this.currentCode = row.code;
			this.currentName = row.name;
			this.dialogVisible = true;
		},

		// 1.获取实时刷新行情的开关状态，2.更新实时实时刷新行情的开关状态
		async stockRealTimeSwitch(status) {
			const resp = await stock_real_time_switch({status}).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000) {
				this.isOpen = resp.data.data == 2 ? true : false;
				localStorage.setItem("isOpen", this.isOpen ? "2" : "1");
				Message.success(resp.data.msg || '操作成功');
			} else {
				Message.error(resp?.data?.msg || '操作失败');
				return;
			}
		},

		async loopAccBalance() {
			// 如果组件已经销毁，直接退出
			if (!this.isComponentActive) return;

			if (this.pollingTimer) {
				clearTimeout(this.pollingTimer);
				this.pollingTimer = null;
			}

			try {
				await this.initializeAccBalance();
			} catch (error) {
				console.error("账户数据更新异常:", error);
			} finally {
				// 【最关键的一步】：只有在组件还存活的情况下，才开启下一次的倒计时
				if (this.isComponentActive) {
					this.pollingTimer = setTimeout(() => {
						this.loopAccBalance();
					}, 5000); 
				}
			}
		},
		
		calculateA_ShareFee(tradeType, price, quantity) {
			const turnover = Number(price) * Number(quantity);
			if (isNaN(turnover) || turnover <= 0) return 0;
			
			// 1. 券商佣金: 默认万分之2.5，单笔最低5元
			let commission = turnover * 0.00025;
			if (commission < 5) commission = 5;
			
			// 2. 过户费: 沪深均为十万分之一 (0.001%)
			const transferFee = turnover * 0.00001;
			
			// 3. 印花税: 仅卖出单边收取，千分之0.5
			let stampDuty = 0;
			if (tradeType === 'sell') {
				stampDuty = turnover * 0.0005;
			}
			
			return Number((commission + transferFee + stampDuty).toFixed(2));
		},

		formatPrice(val) {
			const num = Number(val);
			return isNaN(num) ? '0.00' : num.toFixed(2);
		},

		// 修改弹窗
		changeSellModal(row) {
			this.buyForm.code = row.code;
			this.buyForm.name = row.name;
			this.buyForm.price = row.price; 
			this.buyForm.quantity = row.quantity;
			this.showBuyModal = true;
			this.isChange = true;
		},

		// 卖出弹窗
		openSellModal(row) {
			this.sellForm.code = row.code;
			this.sellForm.name = row.name;
			this.sellForm.price = row.trade; 
			this.sellForm.quantity = row.quantity;
			this.showBuyModal = true;
		},

		// 卖出提交逻辑：提交委托状态更新 -> 接口成功后刷新全局数据源以自动同步最新余额、持仓及流水列表
		async submitSell() {
			if (this.sellForm.price <= 0 || this.sellForm.quantity <= 0) {
				Message.warning('请输入有效的卖出价格与数量！');
				return;
			}

			if (this.currentAccountId === 'A' && (this.sellForm.quantity < 100 || (this.sellForm.quantity % 100 !== 0 && this.sellForm.quantity !== this.sellForm.maxQuantity))) {
				if (this.sellForm.quantity !== this.sellForm.maxQuantity) {
					Message.warning('A股卖出数量须为100的倍数，或一次性卖出所有余股！');
					return;
				}
			}

			if (this.sellForm.quantity > this.sellForm.maxQuantity) {
				Message.warning('卖出数量超过持仓可用数量！');
				return;
			}

			this.sellLoading = true;

			const resp = await update_trade_status({code: this.sellForm.code, status: 1}).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000) {
				// 关闭弹窗并重新获取列表数据更新视图
				this.showSellModal = false;
				this.initializeAccBalance();
				Message.success('卖出委托操作成功，数据同步更新中');
			} else {
				Message.error(resp?.data?.msg || '操作失败');
			}

			this.sellLoading = false;
		},

		cancelBuyModal() {
			this.showBuyModal = false;
			this.isChange = false;
		},

		// 撤单逻辑
		cancelOrder(row) {
			MessageBox.confirm(`确认撤回【${row.name}】的委托吗？`, '撤单提示', {
				confirmButtonText: '确定撤回',
				cancelButtonText: '暂不撤回',
				type: 'warning'
			}).then(async () => {
				const resp = await update_trade_status({code: row.code, status: 2}).catch(() => {
					Message.error("网络异常，撤单失败");
				});

				if (resp && resp.data && resp.data.code === 1000) {
					this.initializeAccBalance();
					Message.success('撤单成功，资金解冻重置');
				} else {
					Message.error(resp?.data?.msg || '撤单失败');
				}
			}).catch(() => { });
		},

		isInStockTime() {
			const now = new Date();
			const day = now.getDay();
			if (day < 1 || day > 5) return false;
			const hours = now.getHours();
			const minutes = now.getMinutes();
			const totalMinutes = hours * 60 + minutes;
			const morningStart = 9 * 60 + 30;
			const morningEnd = 11 * 60 + 38;
			const afternoonStart = 13 * 60;
			const afternoonEnd = 15 * 60 + 8;
			return (
				(totalMinutes >= morningStart && totalMinutes <= morningEnd) ||
				(totalMinutes >= afternoonStart && totalMinutes <= afternoonEnd)
			);
		},

		handleHoldingsPageChange(val) {
			this.holdingsCurrentPage = val;
		},

		handleHistoryPageChange(val) {
			this.historyCurrentPage = val;
		},

		// ==== 修改点：处理历史记录的排序变化 ====
		handleHistorySortChange({ prop, order }) {
			this.historySortProp = prop;
			this.historySortOrder = order;
			// 排序发生变化时，将表格页码重置到第一页
			this.historyCurrentPage = 1;
		},

		toggleStockRealTime() {
			this.isOpen = !this.isOpen;
			const status = this.isOpen ? 2 : 1;
			
			this.stockRealTimeSwitch(status);
		},

		toggleTheme() {
			this.isDark = !this.isDark;
		},
		updateTime() {
			const now = new Date();
			this.currentTime = now.toLocaleTimeString('zh-CN', { hour12: false });
		},

		// 数据初始化与同步刷新
		async initializeAccBalance() {
			this.isRunIcon = "el-icon-loading";
			const resp = await get_stock_real_time_list().catch(() => {
				Message.error("网络异常，无法获取实时列表");
			});

			if (resp && resp.data && resp.data.code === 1000) {
				const rawData = resp.data.data.data || [];
				const rawHd = resp.data.data.hd ||[];

				// 1. 映射持仓数据：提取 profit_loss 和 bep
				this.allHoldings = rawData.map(item => ({
					...item,
					trade: Number(item.trade || 0),   
					price: Number(item.price || 0),   
					quantity: Number(item.quantity || 0),
					profit_loss: Number(item.profit_loss || 0), 
					bep: item.bep || 0,                         
					is_deal_status: Number(item.is_deal_status || 2),
					trade_type: Number(item.trade_type || 3),
					date: item.ticktime || item.date || item.create_time || new Date().toLocaleString('zh-CN', { hour12: false }) 
				})).sort((a, b) => b.changepercent - a.changepercent);

				// 2. 映射历史流水：同步提取流水对应产生的 profit_loss 与 bep，用于界面展示与累计校准
				this.allHistory = rawHd.map(item => ({
					...item,
					trade: Number(item.trade || 0),   
					price: Number(item.price || 0),   
					quantity: Number(item.quantity || 0),
					profit_loss: Number(item.profit_loss || 0), 
					bep: item.bep || 0,
					is_deal_status: Number(item.is_deal_status || 2),
					trade_type: Number(item.trade_type || 3),
					date: item.ticktime || item.date || item.create_time || new Date().toLocaleString('zh-CN', { hour12: false }) 
				}));

			} else {
				Message.error(resp?.data?.msg || '获取数据失败');
				this.isRunIcon = "el-icon-refresh";
				return;
			}

			this.isRunIcon = "el-icon-refresh";

			// 精准校正账户可用余额：初始本金 - 当前占用本金 + 历史卖出已经实现的盈亏(累积历史流水里的 profit_loss)
			Object.keys(this.accounts).forEach(key => {
				// 当前账户中占用的本金总成本
				const holdCost = this.allHoldings
					.filter(s => s.accountId === key)
					.reduce((sum, stock) => sum + (stock.price * stock.quantity), 0);

				// 历史卖出记录已经结算实现的盈亏总额
				const realizedPnL = this.allHistory
					.filter(r => r.accountId === key && r.trade_type === 1) // trade_type 1 为卖出单
					.reduce((sum, record) => sum + (Number(record.profit_loss) || 0), 0);

				// 校准后的账户可用余额 = 初始本金 - 持仓占用成本 + 卖出产生的历史净利润/亏损
				this.accounts[key].balance = this.accounts[key].initialCapital - holdCost + realizedPnL;
			});
		},

		switchAccount(id) {
			this.currentAccountId = id;
			this.holdingsSearch = '';
			this.historySearch = '';
			this.holdingsCurrentPage = 1;
			this.historyCurrentPage = 1;
		},

		formatMoney(val) {
			if (!val && val !== 0) return '0.00';
			const sign = val < 0 ? '-' : (val > 0 ? '+' : '');
			return sign + Math.abs(Number(val)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		},

		// 针对具体后端盈亏数字返回红/绿高亮样式
		getProfitColor(val) {
			const num = Number(val);
			if (num > 0) return 'text-red';
			if (num < 0) return 'text-green';
			return '';
		},
		
		// 格式化后端的 bep (百分比值展示处理)
		formatBep(val) {
			if (!val && val !== 0) return '0.00%';
			let strVal = String(val).trim();
			let num = parseFloat(strVal);
			if (isNaN(num)) return '0.00%';
			const sign = num > 0 ? '+' : '';
			return sign + num.toFixed(2) + '%';
		},

		getChangePerColor(percent) {
			return percent >= 0 ? 'text-red' : 'text-green';
		},

		getPriceColor(current, cost) {
			const currNum = Number(current);
			const costNum = Number(cost);
			if (currNum > costNum) return 'text-red';
			if (currNum < costNum) return 'text-green';
			return '';
		},

		openBuyModal() {
			this.buyForm.code = '';
			this.buyForm.name = '';
			this.buyForm.price = 0;
			this.buyForm.quantity = 100;
			this.showBuyModal = true;
			this.isChange = false;
		},

		async getStockInfo() {
			if (!this.buyForm.code) {
				this.buyForm.name = '';
				return;
			}

			const resp = await get_stock_info_data({ code: this.buyForm.code }).catch(() => {
				Message.error("网络异常，无法获取股票信息");
			});

			if (resp && resp.data && resp.data.code === 1000) {
				this.buyForm.name = resp.data.data.name || '';
			} else {
				Message.error(resp.data.msg);
				this.buyForm.name = '';
			}
		},

		buyOrChange() {
			if (this.isChange) {
				this.changeHoldingData();
			} else {
				this.buyStockData();
			}
		},

		async changeHoldingData() {
			if (!this.buyForm.code || !this.buyForm.name || this.buyForm.price <= 0 || this.buyForm.quantity <= 0) {
				Message.warning('请完善股票信息和有效的价格/数量！');
				return;
			}

			this.buyLoading = true;
			const resp = await change_holding_data({ code: this.buyForm.code, price: parseFloat(this.buyForm.price), quantity: this.buyForm.quantity }).catch(() => {
				this.buyLoading = false;
			});

			if (resp && resp.data && resp.data.code === 1000) {
				this.initializeAccBalance();
				this.holdingsCurrentPage = 1;
				this.historyCurrentPage = 1;
				this.showBuyModal = false;
				this.isChange = false;
				Message.success('持仓修改已提交！');
			} else {
				Message.error(resp.data.msg);
			}
			this.buyLoading = false;
		},

		async buyStockData() {
			if (!this.isChange) {
				const exists = this.allHoldings.find(item => item.code === this.buyForm.code);
				if (exists) {
					Message.info("该股票已在持仓列表中");
					return;
				}
			}
			
			if (!this.buyForm.code || !this.buyForm.name || this.buyForm.price <= 0 || this.buyForm.quantity <= 0) {
				Message.warning('请完善股票信息和有效的价格/数量！');
				return;
			}

			if (this.currentAccountId === 'A' && (this.buyForm.quantity < 100 || this.buyForm.quantity % 100 !== 0)) {
				Message.warning('A股买入数量必须至少为100股，且为100的整数倍！');
				return;
			}

			const turnover = this.buyForm.price * this.buyForm.quantity;
			const totalCostAmount = turnover + this.buyFormFee;
			
			if (totalCostAmount > this.accounts[this.currentAccountId].balance) {
				Message.warning(`余额不足！加上手续费本次需冻结 ${this.currentAccount.symbol}${this.formatMoney(totalCostAmount)}`);
				return;
			}

			this.buyLoading = true;
			const resp = await get_stock_real_time_data({ code: this.buyForm.code, price: this.buyForm.price, quantity: this.buyForm.quantity }).catch(() => {
				this.buyLoading = false;
			});

			if (resp && resp.data && resp.data.code === 1000) {
				this.initializeAccBalance();
				this.holdingsCurrentPage = 1;
				this.historyCurrentPage = 1;
				this.showBuyModal = false;
				Message.success('委托买入已提交！');
			} else {
				Message.error(resp.data.msg);
			}
			this.buyLoading = false;
			this.isChange = false;
		},

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
	--color-hover: #66b1ff;
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
	--color-hover: #66b1ff;
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
	box-shadow: 0 6px 16px #2563eb80;
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

.refresh-btn {
	margin-left: auto;
    padding-right: 10px;
	cursor: pointer;
}

.search-icon {
	padding-left: 7px;
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
:deep(.custom-glass-table td.el-table__cell),
:deep(.custom-glass-table th),
:deep(.custom-glass-table td) {
	background-color: transparent !important;
	border-bottom: 1px solid var(--border-color) !important;
	white-space: nowrap !important;
	word-break: keep-all !important;
}

:deep(.custom-glass-table th.el-table__cell),
:deep(.custom-glass-table th) {
	background-color: var(--table-header-bg) !important;
	color: var(--text-secondary) !important;
	font-weight: 600;
	font-size: 14px;
}

:deep(.custom-glass-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell),
:deep(.custom-glass-table--enable-row-hover .el-table__body tr:hover > td) {
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

/* ================= 状态与操作样式 ================= */
.status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}
.status-badge.pending {
    background: rgba(230, 162, 60, 0.15);
    color: #e6a23c; 
}
.status-badge.success {
    background: rgba(103, 194, 58, 0.15);
    color: #67c23a; 
}

.type-badge {
	display: inline-block;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: bold;
}
.badge-buy { background: rgba(245, 108, 108, 0.15); color: #f56c6c; }
.badge-sell { background: rgba(103, 194, 58, 0.15); color: #67c23a; }
.badge-cancel { background: rgba(230, 162, 60, 0.15); color: #e6a23c; }

:deep(.el-button.is-plain) { background-color: transparent !important; }
:deep(.el-button--danger.is-plain) { border-color: #f56c6c; color: #f56c6c; }
:deep(.el-button--danger.is-plain:hover) { background-color: #f56c6c !important; color: #fff !important; }
:deep(.el-button--warning.is-plain) { border-color: #e6a23c; color: #e6a23c; }
:deep(.el-button--warning.is-plain:hover) { background-color: #e6a23c !important; color: #fff !important; }

.text-red { color: #f56c6c !important; font-weight: bold; }
.text-green { color: #67c23a !important; font-weight: bold; }
.text-yellow { color: #d9f00a !important; font-weight: bold; }

/* ================= 弹窗样式 ================= */
.modal-overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
	z-index: 1000; backdrop-filter: blur(4px);
}
.modal-content { width: 440px; padding: 32px; }
.modal-title { margin-top: 0; margin-bottom: 24px; font-size: 22px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; color: var(--text-secondary); font-size: 14px; }
.form-input {
	width: 100%; background: var(--input-bg); border: 1px solid var(--border-color);
	color: var(--text-primary); padding: 10px 14px; border-radius: 8px; outline: none; font-size: 15px;
	transition: border-color 0.2s;
}
.form-input:focus { border-color: #60a5fa; }
.input-with-hint { display: flex; flex-direction: column; gap: 6px; }
.hint-text { font-size: 12px; color: var(--text-secondary); }
.total-estimate {
	display: flex; justify-content: space-between; align-items: center; padding: 12px;
	background: var(--table-header-bg); border-radius: 8px; margin-top: 8px;
}
.estimate-label { font-size: 14px; color: var(--text-secondary); }
.estimate-value { font-size: 18px; }
.estimate-card { background: var(--table-header-bg); padding: 16px; border-radius: 8px; margin-top: 24px; }
.estimate-row { display: flex; justify-content: space-between; align-items: center; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
.btn-cancel {
	background: transparent; color: var(--text-primary); border: 1px solid var(--border-color);
	padding: 10px 20px; border-radius: 8px; cursor: pointer;
}
.btn-cancel:hover { background: var(--table-hover-bg); }
.btn-sell-confirm, .btn-primary {
	background: #f56c6c; color: #fff; border: none; padding: 10px 20px; border-radius: 8px;
	cursor: pointer; font-weight: bold;
}
.btn-sell-confirm:hover, .btn-primary:hover { background: #e05656; }

/* ============ 股票代码点击交互样式 ============ */
.stock-code-link {
    color: var(--color-blue);
    cursor: pointer;
    font-weight: bold;
    font-family: "Consolas", "Monaco", monospace;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
}

.stock-code-link i {
    margin-left: 4px;
    font-size: 13px;
    opacity: 0;
    transform: translateX(-3px);
    transition: all 0.3s ease;
}

.stock-code-link:hover {
    color: var(--color-hover);
    text-decoration: underline;
}

.stock-code-link:hover i {
    opacity: 1;
    transform: translateX(0);
}

.stock-rt-search {
	display: flex;
    gap: 15px;
}

/* ================= El-Dialog 适配主题样式 ================= */
:deep(.custom-glass-dialog) {
    background: var(--glass-bg) !important;
    border: 1px solid var(--glass-border);
    box-shadow: 0 8px 32px var(--glass-shadow);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
}

:deep(.custom-glass-dialog .el-dialog__title) {
    color: var(--text-primary);
    font-weight: bold;
}

:deep(.custom-glass-dialog .el-dialog__header) {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 15px;
}

:deep(.custom-glass-dialog .el-dialog__body) {
    color: var(--text-primary);
    padding: 20px;
}

:deep(.custom-glass-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: var(--text-secondary);
    transition: color 0.3s ease;
}

:deep(.custom-glass-dialog .el-dialog__headerbtn:hover .el-dialog__close) {
    color: var(--color-hover);
}

/* ================= 响应式 ================= */
@media (max-width: 768px) {
	.account-info { flex-direction: column; align-items: flex-start; gap: 16px; }
	.action-divider { display: none; }
	.btn-primary { margin-left: 0; width: 100%; }
}
</style>
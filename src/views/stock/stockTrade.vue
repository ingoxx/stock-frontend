<template>
	<div :class="['app-wrapper', isDark ? 'theme-dark' : 'theme-light']" :style="{ '--sidebar-gap': sidebarGap + 'px' }">
		<div class="main-container">

			<!-- 顶部导航栏 -->
			<header class="glass-header">
				<div class="logo-title">
					<div class="logo-icon">📈</div>
					<h1 class="gradient-text">A股/港股模拟交易终端</h1>
				</div>
				<div class="header-actions">
					<!-- 侧边距微调控制器 -->
					<div class="gap-control">
						<span class="gap-label">📐 侧边距:</span>
						<input 
							type="range" 
							v-model.number="sidebarGap" 
							min="0" 
							max="300" 
							step="4" 
							class="gap-slider"
						/>
						<span class="gap-value">{{ sidebarGap }}px</span>
					</div>

					<div class="time-badge">{{ currentTime }}</div>
					
					<!-- 实时刷新按钮 -->
					<button :class="['refresh-toggle-btn', { 'is-active': isOpen }]" @click="toggleStockRealTime">
						<span class="status-dot"></span>
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

					<!-- 总盈亏显示 -->
					<div class="info-item">
						<span class="info-label">总盈亏</span>
						<span :class="['info-value', getProfitColor(currentTotalProfit.amount)]">
							{{ formatMoney(currentTotalProfit.amount) }}
						</span>
					</div>

					<button class="btn-primary buy-btn" @click="openBuyModal">
						💰 买入新股
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

							<el-table-column label="最低" prop="low" min-width="90"></el-table-column>

							<el-table-column label="涨跌幅" min-width="90">
								<template slot-scope="{ row }">
									<span :class="getChangePerColor(row.changepercent)">{{ formatPrice(row.changepercent) }}%</span>
								</template>
							</el-table-column>

							<el-table-column label="挂单/买入均价" min-width="120">
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

							<!-- 浮动盈亏列 -->
							<el-table-column label="浮动盈亏 (收益率)" min-width="160">
								<template slot-scope="{ row }">
									<span v-if="row.is_deal_status === 2" :class="getProfitColor(row.profit_loss)">
										<span>{{ formatMoney(row.profit_loss) }}</span>
										<span class="profit-rate">({{ formatBep(row.bep) }})</span>
									</span>
									<span v-else style="color: var(--text-secondary); font-weight: normal;">--</span>
								</template>
							</el-table-column>

							<!-- 操作列：已加入加仓【买入】按钮，和券商一致 -->
							<el-table-column label="操作" min-width="210">
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

									<!-- 券商标准：对已有持仓进行继续买入挂单补仓 -->
									<el-button 
										v-if="row.is_deal_status === 2" 
										size="mini" 
										type="primary" 
										plain
										@click="openAddPositionModal(row)"
									>
										买入
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
										v-if="row.is_deal_status === 1" 
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
						<el-table :data="paginatedHistory" style="width: 100%" class="custom-glass-table"
							empty-text="当前账户暂无历史交易记录" @sort-change="handleHistorySortChange">
							
							<el-table-column prop="date" label="时间" min-width="190" sortable="custom"></el-table-column>

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

			<!-- 买入/加仓/修改持仓弹窗 (已重构为 el-dialog 并支持拖拽 v-dialogDrag) -->
			<el-dialog 
				v-dialogDrag
				:title="isChange ? '修改挂单' : '委托买入'" 
				:visible.sync="showBuyModal" 
				:close-on-click-modal="false"
				:before-close="cancelBuyModal"
				center
				custom-class="custom-glass-dialog custom-buy-sell-dialog"
			>
				<div class="form-group">
					<label>股票代码 / 名称</label>
					<div style="display: flex; gap: 10px;">
						<input v-model="buyForm.code" type="text" placeholder="代码: 600519" class="form-input" @blur="getStockInfo"/>
						<input v-model="buyForm.name" type="text" placeholder="名称: 贵州茅台" class="form-input" />
					</div>
				</div>
				<div class="form-group">
					<label>委托价格 ({{ currentAccount.symbol }})</label>
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
						<span class="estimate-label">本笔委托资金:</span>
						<span class="estimate-value">{{ formatMoney(buyForm.price * buyForm.quantity) }}</span>
					</div>
					<div class="estimate-row" style="margin-top: 6px;">
						<span class="estimate-label">预估手续费(佣金最低5元+过户费):</span>
						<span class="estimate-value text-red">+ {{ formatMoney(buyFormFee) }}</span>
					</div>
					<div class="estimate-row" style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
						<span class="estimate-label">本次共需冻结:</span>
						<span class="estimate-value text-red">{{ currentAccount.symbol }} {{ formatMoney((buyForm.price * buyForm.quantity) + buyFormFee) }}</span>
					</div>
					
					<!-- 精准加权成本摊薄计算 -->
					<div class="estimate-row" style="margin-top: 6px;" v-if="targetExistingStock && !isChange">
						<span class="estimate-label" style="font-size: 12px; color: var(--text-secondary);">
							* 当前已持有: {{ targetExistingStock.quantity }} 股 (成本价: {{ formatPrice(targetExistingStock.price) }} / 股)
						</span>
					</div>
					<div class="estimate-row" style="margin-top: 6px;" v-if="targetExistingStock && !isChange && buyForm.price > 0 && buyForm.quantity > 0">
						<span class="estimate-label" style="font-size: 12px; color: #409eff; font-weight: bold;">
							* 若委托成交，持仓成本将{{ costTrendText }}: {{ formatPrice(calculatedDilutedCost) }} / 股
						</span>
					</div>
					<div class="estimate-row" style="margin-top: 6px;" v-if="!targetExistingStock && !isChange && buyForm.price > 0 && buyForm.quantity > 0">
						<span class="estimate-label" style="font-size: 12px; color: #e6a23c;">
							* 包含手续费后，买入持仓首单成本为: {{ formatPrice(calculatedDilutedCost) }} / 股
						</span>
					</div>
				</div>

				<div class="modal-actions">
					<button class="btn-cancel" @click="cancelBuyModal">取消</button>
					<el-button :loading="buyLoading" type="primary" class="btn-primary" @click="buyOrChange">{{ isChange ? '提交修改' : '确认买入' }}</el-button>
				</div>
			</el-dialog>

			<!-- 卖出弹窗 -->
			<el-dialog 
				v-dialogDrag
				:title="`卖出股票 - ${sellForm.name}`" 
				:visible.sync="showSellModal" 
				:close-on-click-modal="false"
				center
				custom-class="custom-glass-dialog custom-buy-sell-dialog"
			>
				<div class="form-group">
					<label>持仓成本价: {{ currentAccount.symbol }} {{ sellForm.targetStock ? formatPrice(sellForm.targetStock.price) : '0.00' }}</label>
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
			</el-dialog>

			<!-- 实时详情与搜索部分略，保持不变 -->
			<el-dialog 
				v-dialogDrag
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

			<el-dialog 
				v-dialogDrag
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
	directives: {
		dialogDrag: {
			bind(el) {
				const dialogHeaderEl = el.querySelector('.el-dialog__header');
				const dragDom = el.querySelector('.el-dialog');
				if (!dialogHeaderEl || !dragDom) return;
				
				dialogHeaderEl.style.cursor = 'move';
				dialogHeaderEl.style.userSelect = 'none'; 

				const sty = dragDom.currentStyle || window.getComputedStyle(dragDom, null);

				dialogHeaderEl.onmousedown = (e) => {
					e.preventDefault(); 
					const disX = e.clientX - dialogHeaderEl.offsetLeft;
					const disY = e.clientY - dialogHeaderEl.offsetTop;

					let styL = sty.left;
					let styT = sty.top;

					if (styL === 'auto') {
						styL = '0px';
					} else if (styL.includes('%')) {
						styL = +document.body.clientWidth * (+styL.replace(/\%/g, '') / 100) + 'px';
					}

					if (styT === 'auto') {
						styT = '0px';
					} else if (styT.includes('%')) {
						styT = +document.body.clientHeight * (+styT.replace(/\%/g, '') / 100) + 'px';
					}

					const initLeft = parseFloat(styL) || 0;
					const initTop = parseFloat(styT) || 0;

					document.onmousemove = function (e) {
						const l = e.clientX - disX;
						const t = e.clientY - disY;
						dragDom.style.left = `${l + initLeft}px`;
						dragDom.style.top = `${t + initTop}px`;
					};

					document.onmouseup = function () {
						document.onmousemove = null;
						document.onmouseup = null;
					};
				};
			}
		}
	},
	data() {
		return {
			sidebarGap: 180, 
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
			isDark: true,
			isOpen: false,
			currentTime: '',
			timer: null,
			holdingsSearch: '',
			historySearch: '',
			historySortProp: 'date',   
			historySortOrder: 'descending',  
			allHoldings:[],
			allHistory:[],
			accounts: {
				'A': { id: 'A', name: 'A股账户', initialCapital: 1000000, balance: 1000000, symbol: '￥' },
				'HK': { id: 'HK', name: '港股账户', initialCapital: 1000000, balance: 1000000, symbol: 'HK$' }
			},
			currentAccountId: 'A',
			pageSize: 15,
			holdingsCurrentPage: 1,
			historyCurrentPage: 1,
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
						return sum + (stock.price * stock.quantity);
					} else if (stock.is_deal_status === 2) {
						return sum + (stock.trade * stock.quantity);
					}
					return sum;
				}, 0);
		},

		currentTotalProfit() {
			const holdings = this.allHoldings.filter(s => s.accountId === this.currentAccountId && s.is_deal_status === 2);
			const holdingsProfit = holdings.reduce((sum, stock) => sum + (Number(stock.profit_loss) || 0), 0);
			const historySells = this.allHistory.filter(r => r.accountId === this.currentAccountId && r.trade_type === 1);
			const realizedProfit = historySells.reduce((sum, record) => sum + (Number(record.profit_loss) || 0), 0);

			return { amount: holdingsProfit + realizedProfit };
		},

		// --- 东方财富/同花顺：加仓摊薄成本精准加权算法 ---
		targetExistingStock() {
			if (!this.buyForm.code) return null;
			// 精确匹配当前账户里已经持仓成功（可被摊薄合并）的老仓位
			return this.allHoldings.find(s =>
				s.accountId === this.currentAccountId &&
				s.code === this.buyForm.code &&
				s.is_deal_status === 2 
			);
		},

		calculatedDilutedCost() {
			const newQty = Number(this.buyForm.quantity) || 0;
			const newPrice = Number(this.buyForm.price) || 0;
			if (newQty <= 0 || newPrice <= 0) return 0;

			// 本次委托若成交的预计花销总额 (单价 * 数量 + 手续费)
			const newCostAmount = (newPrice * newQty) + this.buyFormFee;
			const existing = this.targetExistingStock;

			if (existing && !this.isChange) {
				// 证券核心成本摊薄公式：(原持仓总本金 + 新买入总本金) / (原持仓总数量 + 新买入总数量)
				const existingQty = Number(existing.quantity);
				const existingCostAmount = Number(existing.price) * existingQty; // existing.price 即服务端返回的当前综合成本均价
				
				const totalCostAmount = existingCostAmount + newCostAmount;
				const totalQty = existingQty + newQty;
				return totalCostAmount / totalQty;
			} else {
				// 如果是首次建仓或独立修改单
				return newCostAmount / newQty;
			}
		},

		// 动态智能提示对比：判断补仓操作是在拉低还是拉高成本
		costTrendText() {
			const existing = this.targetExistingStock;
			if (!existing || this.isChange) return '为'; 
			
			const existingCost = Number(existing.price);
			const newCost = this.calculatedDilutedCost;
			
			// 解决浮点数精度对比问题
			if (newCost < existingCost - 0.0001) return '摊薄拉低至';
			if (newCost > existingCost + 0.0001) return '摊薄拉高至';
			return '持平为';
		},

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

		baseFilteredHistory() {
			let list = this.allHistory.filter(r => r.accountId === this.currentAccountId);
			const keyword = this.historySearch.trim().toLowerCase();
			if (keyword) {
				list = list.filter(r => {
					let typeStr = r.trade_type === 3 ? '买入' : (r.trade_type === 1 ? '卖出' : '撤单');
					return r.code.includes(keyword) || r.name.includes(keyword) || typeStr.includes(keyword);
				});
			}

			if (this.historySortProp && this.historySortOrder) {
				list.sort((a, b) => {
					let valA = a[this.historySortProp];
					let valB = b[this.historySortProp];

					if (this.historySortProp === 'profit_loss') {
						valA = a.trade_type === 1 ? (Number(a.profit_loss) || 0) : 0;
						valB = b.trade_type === 1 ? (Number(b.profit_loss) || 0) : 0;
					} else if (this.historySortProp === 'date') {
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
						let timeStrA = String(a.date || '').replace(/-/g, '/');
						let timeStrB = String(b.date || '').replace(/-/g, '/');
						let tA = new Date(timeStrA).getTime() || 0;
						let tB = new Date(timeStrB).getTime() || 0;
						return tB - tA; 
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
		this.isComponentActive = false; 
		if (this.timer) {
			clearInterval(this.timer);
		}
		if (this.pollingTimer) {
			clearTimeout(this.pollingTimer);
			this.pollingTimer = null;
		}
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
			const savedTheme = localStorage.getItem('app-theme-dark');
			if (savedTheme !== null) {
				this.isDark = savedTheme === 'true';
			}
            this.$root.$on('theme-change', (val) => {
                this.isDark = val;
            });
		},
		closeAll() { this.rtVisible = false; },
		handlerOpenRtSearch() { this.rtVisible = true; },

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
				this.handleShowStockDetails(row);
			} else {
				Message.error(resp?.data?.msg || '获取实时数据失败');
			}
			this.rtLoading = false;
			this.allHoldingsLoading = false;
		},

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
			
			let commission = turnover * 0.00025;
			if (commission < 5) commission = 5;
			
			const transferFee = turnover * 0.00001;
			
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

		// 新增：针对老持仓提供的一键加仓(买入)挂单入口
		openAddPositionModal(row) {
			this.buyForm.code = row.code;
			this.buyForm.name = row.name;
			// 默认载入当前最新市价，方便用户快速参考做T
			this.buyForm.price = row.trade || row.price; 
			this.buyForm.quantity = 100;
			this.showBuyModal = true;
			this.isChange = false;
		},

		changeSellModal(row) {
			this.buyForm.code = row.code;
			this.buyForm.name = row.name;
			this.buyForm.price = row.price; 
			this.buyForm.quantity = row.quantity;
			this.showBuyModal = true;
			this.isChange = true;
		},

		openSellModal(row) {
			this.sellForm.code = row.code;
			this.sellForm.name = row.name;
			this.sellForm.price = row.trade; 
			this.sellForm.quantity = row.quantity;
			
			this.sellForm.maxQuantity = row.quantity;
			this.sellForm.targetStock = row;
			
			this.showSellModal = true;
		},

		async submitSell() {
			const sellQty = Number(this.sellForm.quantity);
			const maxQty = Number(this.sellForm.maxQuantity);

			if (this.sellForm.price <= 0 || sellQty <= 0) {
				Message.warning('请输入有效的卖出价格与数量！');
				return;
			}

			if (sellQty > maxQty) {
				Message.warning('卖出数量超过持仓可用数量！');
				return;
			}

			if (this.currentAccountId === 'A') {
				if (sellQty % 100 !== 0 && sellQty !== maxQty) {
					Message.warning('A股卖出数量须为100的倍数，或一次性卖出所有余股！');
					return;
				}
			}

			this.sellLoading = true;

			const resp = await update_trade_status({code: this.sellForm.code, status: 1}).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000) {
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

		handleHoldingsPageChange(val) {
			this.holdingsCurrentPage = val;
		},

		handleHistoryPageChange(val) {
			this.historyCurrentPage = val;
		},

		handleHistorySortChange({ prop, order }) {
			this.historySortProp = prop;
			this.historySortOrder = order;
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

		async initializeAccBalance() {
			this.isRunIcon = "el-icon-loading";
			const resp = await get_stock_real_time_list().catch(() => {
				Message.error("网络异常，无法获取实时列表");
			});

			if (resp && resp.data && resp.data.code === 1000) {
				const rawData = resp.data.data.data || [];
				const rawHd = resp.data.data.hd ||[];

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

			Object.keys(this.accounts).forEach(key => {
				const holdCost = this.allHoldings
					.filter(s => s.accountId === key)
					.reduce((sum, stock) => sum + (stock.price * stock.quantity), 0);

				const realizedPnL = this.allHistory
					.filter(r => r.accountId === key && r.trade_type === 1) 
					.reduce((sum, record) => sum + (Number(record.profit_loss) || 0), 0);

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

		getProfitColor(val) {
			const num = Number(val);
			if (num > 0) return 'text-red';
			if (num < 0) return 'text-green';
			return '';
		},
		
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
			const resp = await change_holding_data({ code: this.buyForm.code, price: parseFloat(this.buyForm.price), quantity: parseInt(this.buyForm.quantity) }).catch(() => {
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
			// **核心修复：彻底解除了任何拦阻补仓挂单的 if (exists) 校验，允许无限挂买单做T**
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
	margin-left: var(--sidebar-gap, 24px); 
	margin-right: auto;                     
	display: flex;
	flex-direction: column;
	gap: 24px;
	transition: margin-left 0.2s ease-out;  
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

/* ================= 顶部导航 ================= */
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

/* ================= 侧边距微调控制器样式 ================= */
.gap-control {
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--time-bg);
	padding: 6px 12px;
	border-radius: 20px;
	border: 1px solid var(--border-color);
	font-size: 13px;
}

.gap-label { color: var(--text-secondary); white-space: nowrap; }
.gap-value { color: var(--text-primary); font-weight: bold; min-width: 45px; text-align: right; }
.gap-slider {
	-webkit-appearance: none;
	appearance: none;
	width: 80px; height: 6px;
	background: var(--border-color); border-radius: 3px;
	outline: none; cursor: pointer; transition: background 0.3s;
}
.gap-slider::-webkit-slider-thumb {
	-webkit-appearance: none; appearance: none;
	width: 12px; height: 12px; border-radius: 50%;
	background: #60a5fa; cursor: pointer; border: none; transition: transform 0.1s;
}
.gap-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

.time-badge {
	background: var(--time-bg);
	padding: 6px 16px;
	border-radius: 20px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
	border: 1px solid var(--border-color);
}

.refresh-toggle-btn {
	background: transparent; border: 1px solid var(--border-color);
	color: var(--text-secondary); padding: 6px 16px; border-radius: 20px;
	cursor: pointer; font-weight: bold; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	display: inline-flex; align-items: center; gap: 8px; outline: none;
}

.refresh-toggle-btn:hover { background: var(--table-hover-bg); color: var(--text-primary); }

.refresh-toggle-btn .status-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background-color: var(--text-secondary); transition: all 0.3s ease;
}

.refresh-toggle-btn.is-active {
	border-color: rgba(103, 194, 58, 0.4);
	background: rgba(103, 194, 58, 0.1);
	color: #67c23a;
	box-shadow: 0 0 12px rgba(103, 194, 58, 0.15);
}

.refresh-toggle-btn.is-active .status-dot {
	background-color: #67c23a;
	box-shadow: 0 0 8px #67c23a;
	animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
	0% { box-shadow: 0 0 0 0px rgba(103, 194, 58, 0.7); }
	70% { box-shadow: 0 0 0 6px rgba(103, 194, 58, 0); }
	100% { box-shadow: 0 0 0 0px rgba(103, 194, 58, 0); }
}

/* ================= 账户面板与操作 ================= */
.account-dashboard {
	display: flex;
	flex-direction: column;
	padding: 0;
	overflow: hidden;
}

.account-tabs { display: flex; border-bottom: 1px solid var(--border-color); background: rgba(0, 0, 0, 0.05); }

.tab-btn {
	flex: 1; padding: 16px; background: transparent; border: none;
	color: var(--text-secondary); font-size: 16px; font-weight: bold;
	cursor: pointer; transition: all 0.3s;
}

.tab-btn:hover { background: var(--table-hover-bg); }
.tab-btn.active { background: var(--tab-active-bg); color: var(--text-primary); border-bottom: 3px solid #60a5fa; }

.account-info { display: flex; align-items: center; padding: 24px; gap: 32px; }
.info-item { display: flex; flex-direction: column; gap: 8px; }
.info-label { font-size: 13px; color: var(--text-secondary); }
.info-value { font-size: 20px; font-weight: bold; color: var(--text-primary); }
.balance-text { color: #60a5fa; font-size: 24px; }

.btn-primary {
	background: var(--title-gradient); color: #fff; border: none;
	padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold;
	cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
	transition: transform 0.2s, box-shadow 0.2s; margin-left: auto;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px #2563eb80; }

/* ================= 核心面板 ================= */
.content-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
.panel-card { padding: 24px; }

.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.panel-header h2 { margin: 0; font-size: 20px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }

.search-input {
	background: var(--input-bg); border: 1px solid var(--border-color);
	color: var(--text-primary); padding: 8px 16px; border-radius: 8px;
	width: 250px; outline: none; transition: border-color 0.2s;
}
.search-input:focus { border-color: #60a5fa; }
.refresh-btn { margin-left: auto; padding-right: 10px; cursor: pointer; }
.search-icon { padding-left: 7px; }

/* ================= Element UI 表格与分页穿透 ================= */
.table-container { overflow-x: auto; }

:deep(.custom-glass-table) { background-color: transparent !important; color: var(--text-primary) !important; }
:deep(.custom-glass-table tr),
:deep(.custom-glass-table th.el-table__cell),
:deep(.custom-glass-table td.el-table__cell),
:deep(.custom-glass-table th),
:deep(.custom-glass-table td) {
	background-color: transparent !important;
	border-bottom: 1px solid var(--border-color) !important;
	white-space: nowrap !important; word-break: keep-all !important;
}
:deep(.custom-glass-table th.el-table__cell),
:deep(.custom-glass-table th) {
	background-color: var(--table-header-bg) !important;
	color: var(--text-secondary) !important; font-weight: 600; font-size: 14px;
}

:deep(.custom-glass-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell),
:deep(.custom-glass-table--enable-row-hover .el-table__body tr:hover > td) { background-color: var(--table-hover-bg) !important; }
:deep(.custom-glass-table::before),
:deep(.custom-glass-table::after),
:deep(.el-table__inner-wrapper::before) { display: none !important; }

/* 分页组件样式覆写以融合主题 */
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 20px; }
:deep(.glass-pagination) {
	--el-pagination-bg-color: transparent;
	--el-pagination-text-color: var(--text-secondary);
	--el-pagination-button-color: var(--text-secondary);
	--el-pagination-button-disabled-bg-color: transparent;
	--el-pagination-hover-color: #60a5fa;
}
:deep(.glass-pagination .el-pager li) { background: transparent !important; color: var(--text-secondary) !important; transition: all 0.2s; }
:deep(.glass-pagination .el-pager li.is-active) { color: #60a5fa !important; font-weight: bold; }
:deep(.glass-pagination button) { background-color: transparent !important; color: var(--text-secondary) !important; }

.profit-rate { font-size: 12px; margin-left: 6px; opacity: 0.9; }

/* ================= 状态与操作样式 ================= */
.status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.status-badge.pending { background: rgba(230, 162, 60, 0.15); color: #e6a23c; }
.status-badge.success { background: rgba(103, 194, 58, 0.15); color: #67c23a; }

.type-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.badge-buy { background: rgba(245, 108, 108, 0.15); color: #f56c6c; }
.badge-sell { background: rgba(103, 194, 58, 0.15); color: #67c23a; }
.badge-cancel { background: rgba(230, 162, 60, 0.15); color: #e6a23c; }

:deep(.el-button.is-plain) { background-color: transparent !important; }
:deep(.el-button--danger.is-plain) { border-color: #f56c6c; color: #f56c6c; }
:deep(.el-button--danger.is-plain:hover) { background-color: #f56c6c !important; color: #fff !important; }
:deep(.el-button--warning.is-plain) { border-color: #e6a23c; color: #e6a23c; }
:deep(.el-button--warning.is-plain:hover) { background-color: #e6a23c !important; color: #fff !important; }
/* 新增加仓买入按钮高亮 */
:deep(.el-button--primary.is-plain) { border-color: #409eff; color: #409eff; }
:deep(.el-button--primary.is-plain:hover) { background-color: #409eff !important; color: #fff !important; }

.text-red { color: #f56c6c !important; font-weight: bold; }
.text-green { color: #67c23a !important; font-weight: bold; }
.text-yellow { color: #d9f00a !important; font-weight: bold; }

/* ================= 弹窗公共表单项 ================= */
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
    color: var(--color-blue); cursor: pointer; font-weight: bold;
    font-family: "Consolas", "Monaco", monospace; transition: all 0.3s ease;
    display: inline-flex; align-items: center;
}
.stock-code-link i { margin-left: 4px; font-size: 13px; opacity: 0; transform: translateX(-3px); transition: all 0.3s ease; }
.stock-code-link:hover { color: var(--color-hover); text-decoration: underline; }
.stock-code-link:hover i { opacity: 1; transform: translateX(0); }
.stock-rt-search { display: flex; gap: 15px; }

/* ================= El-Dialog 适配主题与拖拽样式 ================= */
:deep(.custom-glass-dialog) {
    background: var(--glass-bg) !important; border: 1px solid var(--glass-border);
    box-shadow: 0 8px 32px var(--glass-shadow); backdrop-filter: blur(12px); border-radius: 16px;
}
:deep(.custom-glass-dialog .el-dialog__title) { color: var(--text-primary); font-weight: bold; }
:deep(.custom-glass-dialog .el-dialog__header) {
    border-bottom: 1px solid var(--border-color); padding-bottom: 15px; cursor: move; user-select: none;
}
:deep(.custom-glass-dialog .el-dialog__body) { color: var(--text-primary); padding: 20px; }
:deep(.custom-glass-dialog .el-dialog__headerbtn .el-dialog__close) { color: var(--text-secondary); transition: color 0.3s ease; }
:deep(.custom-glass-dialog .el-dialog__headerbtn:hover .el-dialog__close) { color: var(--color-hover); }

/* ================= 买入与卖出弹窗深度样式定制 ================= */
:deep(.custom-buy-sell-dialog) { width: 440px !important; }
:deep(.custom-buy-sell-dialog .el-dialog__header) { padding: 32px 32px 10px 32px !important; border-bottom: none !important; }
:deep(.custom-buy-sell-dialog .el-dialog__title) { font-size: 22px !important; font-weight: bold; }
:deep(.custom-buy-sell-dialog .el-dialog__body) { padding: 10px 32px 32px 32px !important; }

/* ================= 响应式 ================= */
@media (max-width: 768px) {
	.account-info { flex-direction: column; align-items: flex-start; gap: 16px; }
	.btn-primary { margin-left: 0; width: 100%; }
}
</style>
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

        <!-- ================== 新增：自定义条件查询功能 ================== -->
        <div class="custom-query-section card">
            <div class="section-title">
                <span class="indicator"></span> 筛选指定行业近期回调的股票
            </div>
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <el-input v-model="price" placeholder="股票价格(默认没有限制)" clearable style="width: 250px;"></el-input>
                <el-input v-model="lookBackDays" placeholder="近多少个交易日(默认是近10个)" clearable
                    style="width: 250px;"></el-input>
                <el-input v-model="days" placeholder="连续跌的交易日(默认是近3个)" clearable style="width: 250px;"></el-input>

                <!-- 优化：利用具名插槽添加已查询高亮标记，并加入下拉层暗黑模式适配 -->
                <el-select clearable v-model="industryName" filterable placeholder="请选择行业(可搜索)"
                    :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                    <el-option v-for="item in rawIndustryData" :key="item.name" :label="item.name" :value="item.name">
                        <!-- 自定义下拉选项的内容 -->
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span :style="{ color: queriedIndustrySet.has(item.name) ? '#f56c6c' : 'inherit' }">{{
                                item.name }}</span>
                            <span v-if="queriedIndustrySet.has(item.name)"
                                style="color: #f56c6c; font-size: 12px;">可查询</span>
                        </div>
                    </el-option>
                </el-select>

                <!-- 刷新查询数据状态 -->
                <div class="flush-filter-stocks-data">
                    <el-tooltip class="item" effect="dark" content="查询状态" placement="top">
                        <i :class="isRunIconF" @click="get_good_stocks_history()"></i>
                    </el-tooltip>
                </div>

                <el-button size="small" type="primary" icon="el-icon-search" @click="get_good_stocks(1)"
                    :loading="filterStocksLoading">查询</el-button>

                <el-popover placement="top" width="160" v-model="visible"
                    :popper-class="isDarkMode ? 'dark-theme-popover' : ''">
                    <p>确定更新数据吗？</p>
                    <div style="text-align: right; margin: 0">
                        <el-button size="mini" type="text" @click="visible = false">取消</el-button>
                        <el-button type="primary" size="mini" @click="get_good_stocks(2)">确定</el-button>
                    </div>
                    <el-button size="small" slot="reference" type="danger" icon="el-icon-s-data"
                        :loading="filterStocksLoading">更新</el-button>
                </el-popover>

                <el-button size="small" type="warning" icon="el-icon-search" @click="reset_filter_date">重置</el-button>

            </div>
        </div>
        <!-- ================== 新增结束 ================== -->

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
                                <span class="rank-badge" :class="getRankClass(index)">{{ (currentPage - 1) * pageSize +
                                    index + 1 }}</span>
                            </td>
                            <td class="font-bold">
                                <!-- 新增：可点击的行业名称 -->
                                <div class="industry-name-link" @click="openIndustryStocks(item.name)"
                                    title="点击查看行业个股详情">
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
                <el-pagination background layout="total, prev, pager, next" :current-page.sync="currentPage"
                    :page-size="pageSize" :total="formattedIndustries.length" @current-change="handlePageChange">
                </el-pagination>
            </div>
        </div>

        <!-- ================== 修改：个股详情弹窗增加极值统计（使用 el-table） ================== -->
        <el-dialog :title="`${currentStockName} (${currentStockCode}) - 近${historyDays}天详情`"
            :visible.sync="stock30DaysDetailVisible" width="75%" :close-on-click-modal="false" :center="true"
            @close="closeAll">
            <div class="filter-date-search">
                <div class="date-picker-wrapper">
                    <el-date-picker v-model="dateRange" type="daterange" align="right" unlink-panels range-separator="至"
                        start-placeholder="开始日期" end-placeholder="结束日期" size="small" :picker-options="pickerOptions"
                        :popper-class="isDarkMode ? 'dark-theme-date-picker' : ''">
                    </el-date-picker>
                </div>
                <div class="search-wrapper">
                    <el-button type="primary" icon="el-icon-search" size="mini"
                        @click="get_date_range_stock_datas">查询</el-button>
                </div>
            </div>

            <!-- ======== 新增：极值统计看板（参考其他列表使用同样的 stripe 属性） ======== -->
            <div class="extremes-table-wrapper" v-if="extremesTableData && extremesTableData.length > 0"
                style="margin-top: 15px; margin-bottom: 15px;">
                <el-table :data="extremesTableData" size="small" stripe style="width: 100%;">
                    <el-table-column prop="label" label="指标名称" min-width="100" align="center"></el-table-column>

                    <el-table-column label="最高记录" align="center">
                        <el-table-column prop="maxVal" label="数值" min-width="120" align="right">
                            <template slot-scope="scope">
                                <!-- 适配新增的买入分析推荐列样式 -->
                                <span v-if="scope.row.key === 'buy_price'" style="color: #e6a23c; font-weight: bold;">
                                    <i class="el-icon-s-opportunity"></i>
                                    {{ scope.row.maxVal.toFixed(2) }}
                                </span>
                                <!-- 原有极值样式 -->
                                <span v-else class="text-up font-bold">
                                    <i class="el-icon-top"></i>
                                    <span v-if="scope.row.key === 'pct_chg'">{{ scope.row.maxVal > 0 ? '+' : '' }}{{
                                        scope.row.maxVal.toFixed(2) }}%</span>
                                    <span v-else-if="scope.row.key === 'volume'">{{ formatVolumeInYi(scope.row.maxVal)
                                        }}</span>
                                    <span v-else>{{ scope.row.maxVal.toFixed(2) }}</span>
                                </span>
                            </template>
                        </el-table-column>
                        <!-- 修改表头标题以兼容策略文字 -->
                        <el-table-column prop="maxDay" label="日期 / 说明" min-width="190" align="center"></el-table-column>
                    </el-table-column>

                    <el-table-column label="最低记录" align="center">
                        <el-table-column prop="minVal" label="数值" min-width="120" align="right">
                            <template slot-scope="scope">
                                <!-- 适配新增的买入分析推荐列样式 -->
                                <span v-if="scope.row.key === 'buy_price'" style="color: #67c23a; font-weight: bold;">
                                    <i class="el-icon-aim"></i>
                                    {{ scope.row.minVal.toFixed(2) }}
                                </span>
                                <!-- 原有极值样式 -->
                                <span v-else class="text-down font-bold">
                                    <i class="el-icon-bottom"></i>
                                    <span v-if="scope.row.key === 'pct_chg'">{{ scope.row.minVal > 0 ? '+' : '' }}{{
                                        scope.row.minVal.toFixed(2) }}%</span>
                                    <span v-else-if="scope.row.key === 'volume'">{{ formatVolumeInYi(scope.row.minVal)
                                        }}</span>
                                    <span v-else>{{ scope.row.minVal.toFixed(2) }}</span>
                                </span>
                            </template>
                        </el-table-column>
                        <!-- 修改表头标题以兼容策略文字 -->
                        <el-table-column prop="minDay" label="日期 / 说明" min-width="190" align="center"></el-table-column>
                    </el-table-column>
                </el-table>
            </div>
            <!-- ======== 新增结束 ======== -->

            <el-table :data="sortedStockHistoryData" v-loading="stocksLoading" element-loading-text="拼命加载中"
                element-loading-spinner="el-icon-loading" max-height="350" stripe style="width: 100%"
                :default-sort="{ prop: 'pct_chg', order: 'descending' }" @sort-change="handleStockSortChange">
                <el-table-column prop="code" label="股票代码" min-width="100" sortable="custom"></el-table-column>

                <el-table-column prop="pct_chg" label="涨跌幅" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.pct_chg)">
                            {{ scope.row.pct_chg > 0 ? '+' : '' }}{{ scope.row.pct_chg }}%
                        </span>
                    </template>
                </el-table-column>

                <!-- 收盘价及差值 -->
                <el-table-column prop="close" label="收盘" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.close }}</span>
                            <span v-if="scope.row.close_diff !== null" class="cell-diff"
                                :class="getPriceClass(scope.row.close_diff)">
                                {{ formatDiff(scope.row.close_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <!-- 开盘价及差值 -->
                <el-table-column prop="open" label="开盘" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.open }}</span>
                            <span v-if="scope.row.open_diff !== null" class="cell-diff"
                                :class="getPriceClass(scope.row.open_diff)">
                                {{ formatDiff(scope.row.open_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <!-- 最高价及差值 -->
                <el-table-column prop="high" label="最高" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.high }}</span>
                            <span v-if="scope.row.high_diff !== null" class="cell-diff"
                                :class="getPriceClass(scope.row.high_diff)">
                                {{ formatDiff(scope.row.high_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <!-- 最低价及差值 -->
                <el-table-column prop="low" label="最低" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.low }}</span>
                            <span v-if="scope.row.low_diff !== null" class="cell-diff"
                                :class="getPriceClass(scope.row.low_diff)">
                                {{ formatDiff(scope.row.low_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <!-- 成交额及差值 -->
                <el-table-column prop="volume" label="成交额(亿)" min-width="120" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ formatVolumeInYi(scope.row.volume) }}</span>
                            <span v-if="scope.row.volume_diff !== null" class="cell-diff"
                                :class="getPriceClass(scope.row.volume_diff)">
                                {{ formatVolumeDiffInYi(scope.row.volume_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="day" label="日期" min-width="110" sortable="custom"></el-table-column>
            </el-table>
        </el-dialog>

        <!-- ================== 个股走势图弹窗 ================== -->
        <el-dialog :center="true" :title="`${currentStockName} (${currentStockCode}) - 近${historyDays}天涨跌幅走势`"
            :visible.sync="chartDialogVisible" width="60%" :close-on-click-modal="false" @opened="onChartDialogOpened"
            @closed="onChartDialogClosed">
            <div class="summary-item up-down-dist">
                <div class="progress-bar-container">
                    <div class="bar-segment up-segment" :style="{ width: stockUpPercent + '%' }">
                        <span v-if="stockUpPercent > 10">{{ stockSummary.up }}天</span>
                    </div>
                    <div class="bar-segment down-segment" :style="{ width: stockDownPercent + '%' }">
                        <span v-if="stockDownPercent > 10">{{ stockSummary.down }}天</span>
                    </div>
                </div>
                <div class="dist-details">
                    <div class="detail-item text-up">
                        <span class="icon">▲</span> 涨: {{ stockSummary.up }}
                        <span class="ratio">({{ stockUpPercent.toFixed(1) }}%)</span>
                    </div>
                    <div class="detail-item text-down">
                        <span class="icon">▼</span> 跌: {{ stockSummary.down }}
                        <span class="ratio">({{ stockDownPercent.toFixed(1) }}%)</span>
                    </div>
                    <div class="detail-item text-down text-down-1">
                        <span class="icon history-detail" @click="showStock30DaysDetail"><i :class="isRunIcon"></i> {{
                            historyDays }}天详情</span>
                    </div>
                </div>
            </div>
            <div v-loading="chartLoading" element-loading-text="数据加载中" element-loading-spinner="el-icon-loading">
                <div ref="stockTrendChart" style="width: 100%; height: 400px;"></div>
            </div>
        </el-dialog>

        <!-- ================== 行业个股详情弹窗 ================== -->
        <el-dialog :title="`${currentIndustry} 行业 - 所有股票`" :visible.sync="dialogVisible" width="85%"
            :close-on-click-modal="false" destroy-on-close :center="true">
            <div class="dialog-header-actions section-search-1"
                style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                <el-input v-model="searchStockQuery" placeholder="输入股票代码或名称搜索" prefix-icon="el-icon-search" clearable
                    style="width: 230px;" size="small"></el-input>
                <el-input v-model="historyDays" placeholder="输入历史数据天数默认30天" prefix-icon="el-icon-search" clearable
                    style="width: 230px;" size="small"></el-input>
                <span style="color: #909399; font-size: 13px;">共找到 {{ processedStocks.length }} 家公司</span>
            </div>

            <el-table :data="paginatedStocks" v-loading="stocksLoading" element-loading-text="拼命加载中"
                element-loading-spinner="el-icon-loading" max-height="450" stripe style="width: 100%"
                :default-sort="{ prop: 'changepercent', order: 'descending' }" @sort-change="handleStockSortChange">
                <el-table-column prop="code" label="股票代码" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span class="stock-code-link" @click="handleOpenChart(scope.row)">
                            {{ scope.row.code }} <i class="el-icon-data-line"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="股票名称" min-width="120" sortable="custom"></el-table-column>
                <el-table-column label="新闻资讯" min-width="100">
                    <template slot-scope="scope">
                        <span class="stock-code-link" @click="handleOpenNews(scope.row)">
                            新闻资讯 <i class="el-icon-document"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="changepercent" label="涨跌幅度" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.changepercent)">
                            {{ scope.row.changepercent > 0 ? '+' : '' }}{{ scope.row.changepercent }}%
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="trade" label="收盘价格" min-width="100" sortable="custom"></el-table-column>
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

                <el-table-column prop="turnoverratio" label="换手率" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span>
                            {{ scope.row.turnoverratio }}%
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="per" label="per" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span>
                            {{ scope.row.per }}%
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="pb" label="市净率" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span>
                            {{ scope.row.pb }}%
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="amount" label="成交额(亿)" :formatter="formatAmount" min-width="110"
                    sortable="custom"></el-table-column>
                <el-table-column prop="mktcap" label="总市值(亿)" min-width="110" sortable="custom"></el-table-column>
                <el-table-column prop="main_business" label="主营" min-width="200">
                    <template slot-scope="scope">

                        <el-tooltip placement="top" effect="dark">
                            <div slot="content"
                                style="width: 400px; white-space: normal; word-wrap: break-word; word-break: break-all; line-height: 1.5;">
                                {{ scope.row.main_business }}
                            </div>
                            <div style="width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                {{ scope.row.main_business }}
                            </div>
                        </el-tooltip>

                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrapper" style="margin-top: 15px; text-align: right;">
                <el-pagination background layout="total, prev, pager, next" :current-page.sync="stockCurrentPage"
                    :page-size="stockPageSize" :total="processedStocks.length" @current-change="handleStockPageChange">
                </el-pagination>
            </div>
        </el-dialog>

        <!-- ================== 新闻资讯弹窗 ================== -->
        <el-dialog :title="`${currentNewsStockName} (${currentNewsStockCode}) - 新闻资讯`" :visible.sync="newsDialogVisible"
            width="80%" top="5vh" :center="true" :close-on-click-modal="false" @close="handleNewsDialogClose">
            <div v-loading="newsLoading" element-loading-text="网页加载中..." element-loading-spinner="el-icon-loading"
                style="height: 75vh; width: 100%;">
                <iframe v-if="newsDialogVisible" :src="currentNewsUrl" frameborder="0" width="100%" height="100%"
                    @load="handleIframeLoad">
                </iframe>
            </div>
        </el-dialog>

        <!-- ================== 条件查询结果弹窗 ================== -->
        <el-dialog :title="`${industryName}行业可选股票`" :visible.sync="customSearchDialogVisible" width="60%"
            :close-on-click-modal="false" :center="true">
            <div class="dialog-header-actions"
                style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <el-input v-model="customSearchQuery" placeholder="输入股票代码或日期搜索" prefix-icon="el-icon-search" clearable
                    style="width: 300px;" size="small"></el-input>
                <span style="color: #909399; font-size: 13px;">共找到 {{ processedCustomSearchData.length }} 条记录</span>
            </div>
            <el-table :data="paginatedCustomSearchData" stripe style="width: 100%" max-height="450">
                <el-table-column prop="code" label="代码 (code)" min-width="120">
                    <template slot-scope="scope">
                        <span class="stock-code-link"
                            @click="handleOpenChart({ code: scope.row.code, name: scope.row.name })">
                            {{ scope.row.code }} <i class="el-icon-data-line"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="名称 (name)" min-width="250"></el-table-column>
                <el-table-column prop="date" label="日期 (date)" min-width="250"></el-table-column>
            </el-table>
            <div class="pagination-wrapper" style="margin-top: 15px; text-align: right;">
                <el-pagination background layout="total, prev, pager, next" :current-page.sync="customSearchCurrentPage"
                    :page-size="customSearchPageSize" :total="processedCustomSearchData.length"
                    @current-change="handleCustomSearchPageChange">
                </el-pagination>
            </div>
        </el-dialog>

    </div>
</template>

<script>
import * as echarts from 'echarts';
import {
    get_stock_industry_up_down,
    get_stock_market_data,
    stock_data_switch,
    stock_data_status,
    get_industry_data,
    get_stock_info_data,
    get_stock_industry_list,
    filter_good_stocks,
    filter_good_stocks_history,
    stock_history_data_date_range,
    get_stock_history_data
} from '../../api';
import { Message, MessageBox } from 'element-ui';

export default {
    name: "MarketOverview",
    data() {
        return {
            dateRange: [],
            pickerOptions: {
                shortcuts: [{
                    text: '最近一周',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
                        picker.$emit('pick', [start, end]);
                    }
                }, {
                    text: '最近一个月',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
                        picker.$emit('pick', [start, end]);
                    }
                }, {
                    text: '最近三个月',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
                        picker.$emit('pick', [start, end]);
                    }
                }]
            },
            price: "",
            historyDays: "",
            isRunIconF: "el-icon-refresh",
            visible: false,

            filterStocksHistory: [],
            filterStocksLoading: false,
            insdustryData: [],

            lookBackDays: '',
            days: '',
            industryName: '',
            customSearchDialogVisible: false,
            customSearchData: [],
            customSearchQuery: '',
            customSearchCurrentPage: 1,
            customSearchPageSize: 10,

            stock30DaysDetailVisible: false,
            stockInfoData: {},
            chartDialogVisible: false,
            chartLoading: false,

            // 新闻资讯相关弹窗控制
            newsDialogVisible: false,
            newsLoading: true,
            currentNewsStockCode: '',
            currentNewsStockName: '',
            newsLoadingTimer: null,

            currentStockName: '',
            currentStockCode: '',
            currentStockHistoryData: [],
            stockHistoryData: [],

            myChart: null,
            mockData: [],
            searchStockQuery: '',
            stockCurrentPage: 1,
            stockPageSize: 10,
            stockSortProp: 'change',
            stockSortOrder: 'descending',

            queryIndustryData: "",
            stockIndustryFromCode: '',
            industryQueryTimer: null,
            industryQueryReqId: 0,
            industryQueryLoading: false,
            isDarkMode: true,
            currentTime: new Date().toLocaleTimeString(),
            chartInstance: null,
            isLoadIcon: "el-icon-loading",
            isRunIcon: "el-icon-data-line",

            sortKey: 'amount',
            sortOrder: 'desc',

            currentPage: 1,
            pageSize: 10,

            dialogVisible: false,
            currentIndustry: '',
            industryStocks: [],
            stocksLoading: false,

            marketSummary: {},
            stockSummary: {},
            rawIndustryData: []
        };
    },
    computed: {
        // ================== 计算：使用 el-table 的数据格式，并保证最新日期 ==================
        extremesTableData() {
            const data = this.currentStockHistoryData;
            if (!data || data.length === 0) return [];

            const getExtremes = (key) => {
                let maxObj = null;
                let minObj = null;

                for (let i = 0; i < data.length; i++) {
                    const rawVal = data[i][key];
                    if (rawVal === null || rawVal === undefined || rawVal === '') continue;

                    const currentVal = Number(rawVal);
                    if (isNaN(currentVal)) continue;

                    if (!maxObj || currentVal >= Number(maxObj[key])) {
                        maxObj = data[i];
                    }
                    if (!minObj || currentVal <= Number(minObj[key])) {
                        minObj = data[i];
                    }
                }

                return {
                    max: maxObj ? { val: Number(maxObj[key]), day: maxObj.day } : { val: 0, day: '-' },
                    min: minObj ? { val: Number(minObj[key]), day: minObj.day } : { val: 0, day: '-' }
                };
            };

            const metrics = [
                { key: 'pct_chg', label: '涨跌幅' },
                { key: 'close', label: '收盘价' },
                { key: 'open', label: '开盘价' },
                { key: 'high', label: '最高价' },
                { key: 'low', label: '最低价' },
                { key: 'volume', label: '成交额' }
            ];

            const result = metrics.map(m => {
                const ex = getExtremes(m.key);
                return {
                    label: m.label,
                    key: m.key,
                    maxVal: ex.max.val,
                    maxDay: ex.max.day,
                    minVal: ex.min.val,
                    minDay: ex.min.day
                };
            });

            // ====== 终极优化：基于指定全量数据的严密分析逻辑 ======
            const len = data.length;
            if (len > 0) {
                const latestItem = data[len - 1];
                const C = Number(latestItem.close);
                const O = Number(latestItem.open);
                const L = Number(latestItem.low);

                // 1. 激进型挂单 (Aggressive)：精准切入最新日内下半场，适合打短线
                let aggressiveBuy = (Math.min(C, O) + L) / 2;

                // 2. 稳健型挂单 (Steady)：基于指定时间范围内【所有数据】的量价分布分析
                let totalVolume = 0;
                let totalTurnover = 0; // 总成交金额基数
                let sumLow = 0;
                let validDays = 0;

                // 遍历你所选择的【整个区间（例如一个月）】的数据
                for (let i = 0; i < len; i++) {
                    const vol = Number(data[i].volume);
                    const closePrice = Number(data[i].close);
                    const highPrice = Number(data[i].high);
                    const lowPrice = Number(data[i].low);

                    if (!isNaN(closePrice) && !isNaN(lowPrice)) {
                        // 计算该日的典型价格 (Typical Price)
                        const tp = (highPrice + lowPrice + closePrice) / 3;
                        if (!isNaN(vol) && vol > 0) {
                            totalVolume += vol;
                            totalTurnover += tp * vol;
                        }
                        sumLow += lowPrice;
                        validDays++;
                    }
                }

                let steadyBuy = 0;
                if (validDays > 0) {
                    // 指标A：区间成交量加权均价 (VWAP) -> 算出该区间内所有持仓资金的【真实平均成本】
                    const vwap = totalVolume > 0 ? (totalTurnover / totalVolume) : (totalTurnover / validDays);
                    // 指标B：区间平均最低价 -> 算出该区间的【常态化底部支撑线】(过滤掉单日暴跌的噪音)
                    const avgLow = sumLow / validDays;

                    // 稳健型策略：取整个区间的「平均持仓成本」与「常态支撑线」的黄金中枢！
                    // 逻辑：既不傻等不可触及的历史最低点，又保证买在市场整体成本线以下的安全垫里。
                    steadyBuy = (vwap + avgLow) / 2;

                    if (isNaN(steadyBuy) || steadyBuy <= 0) {
                        steadyBuy = C * 0.95; // 极端托底保护
                    }
                } else {
                    steadyBuy = L;
                }

                // 极端纠偏保护：防止稳健价高于激进价
                if (aggressiveBuy > C) aggressiveBuy = C * 0.99; 
                if (steadyBuy >= aggressiveBuy) steadyBuy = aggressiveBuy * 0.985;

                result.push({
                    label: '推荐买入价',
                    key: 'buy_price',
                    maxVal: aggressiveBuy,
                    maxDay: '激进型 (短线实体下沿挂单)',
                    minVal: steadyBuy,
                    minDay: '稳健型 (区间综合成本与平均底部的中枢)'
                });
            }

            return result;
        },

        queriedIndustrySet() {
            const set = new Set();
            this.filterStocksHistory.forEach(item => {
                if (typeof item === 'string') {
                    set.add(item);
                } else if (item && item.industry) {
                    set.add(item.industry);
                }
            });
            return set;
        },
        processedCustomSearchData() {
            let filtered = this.customSearchData;
            if (this.customSearchQuery) {
                const query = this.customSearchQuery.toLowerCase();
                filtered = filtered.filter(item =>
                    (item.code && item.code.toLowerCase().includes(query)) ||
                    (item.date && item.date.toLowerCase().includes(query))
                );
            }
            return filtered;
        },
        paginatedCustomSearchData() {
            const start = (this.customSearchCurrentPage - 1) * this.customSearchPageSize;
            const end = start + this.customSearchPageSize;
            return this.processedCustomSearchData.slice(start, end);
        },
        currentNewsUrl() {
            if (!this.currentNewsStockCode) return '';
            return `https://finance.baidu.com/stock/ab-${this.currentNewsStockCode}?mainTab=%E8%B5%84%E8%AE%AF`;
        },
        processedStocks() {
            let filtered = this.industryStocks;
            if (this.searchStockQuery) {
                const query = this.searchStockQuery.toLowerCase();
                filtered = filtered.filter(item =>
                    item.name.toLowerCase().includes(query) ||
                    item.code.toLowerCase().includes(query)
                );
            }
            if (this.stockSortProp && this.stockSortOrder) {
                filtered.sort((a, b) => {
                    let valA = a[this.stockSortProp];
                    let valB = b[this.stockSortProp];
                    if (['code', 'name'].includes(this.stockSortProp)) {
                        if (valA < valB) return this.stockSortOrder === 'ascending' ? -1 : 1;
                        if (valA > valB) return this.stockSortOrder === 'ascending' ? 1 : -1;
                        return 0;
                    }
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                    return this.stockSortOrder === 'ascending' ? valA - valB : valB - valA;
                });
            }
            return filtered;
        },
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
        stockUpPercent() {
            return (this.stockSummary.up / this.stockSummary.total) * 100;
        },
        stockDownPercent() {
            return (Number(this.stockSummary.down) / this.stockSummary.total) * 100;
        },
        formattedIndustries() {
            let data = this.rawIndustryData.map(item => ({
                ...item,
                amountBtn: (item.amount / 100000000).toFixed(2),
            }));

            if (this.stockIndustryFromCode) {
                const q = this.stockIndustryFromCode.toLowerCase();
                data = data.filter(item => {
                    return item.name && item.name.toLowerCase().includes(q);
                });
            } else if (this.queryIndustryData) {
                const q = this.queryIndustryData.toLowerCase();
                data = data.filter(item => {
                    return item.name && item.name.toLowerCase().includes(q);
                });
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
        },
        sortedStockHistoryData() {
            if (!this.currentStockHistoryData || this.currentStockHistoryData.length === 0) {
                return [];
            }
            let sorted = [...this.currentStockHistoryData];
            if (this.stockSortProp) {
                sorted.sort((a, b) => {
                    let valA = a[this.stockSortProp];
                    let valB = b[this.stockSortProp];
                    if (['code', 'day'].includes(this.stockSortProp)) {
                        if (valA < valB) return this.stockSortOrder === 'ascending' ? -1 : 1;
                        if (valA > valB) return this.stockSortOrder === 'ascending' ? 1 : -1;
                        return 0;
                    }
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                    return this.stockSortOrder === 'ascending' ? valA - valB : valB - valA;
                });
            }
            return sorted;
        }
    },
    watch: {
        customSearchQuery() {
            this.customSearchCurrentPage = 1;
        },
        searchStockQuery() {
            this.stockCurrentPage = 1;
        },
        isDarkMode() {
            this.$nextTick(() => {
                this.initChart();
                if (this.chartDialogVisible && this.currentStockHistoryData && this.currentStockHistoryData.length > 0) {
                    this.renderTrendChart(this.currentStockHistoryData);
                }
            });
        },
        queryIndustryData(val) {
            this.currentPage = 1;
            this.handleQueryIndustryInput(val);
        },
    },

    beforeDestroy() {
        if (this.industryQueryTimer) {
            clearTimeout(this.industryQueryTimer);
            this.industryQueryTimer = null;
        }

        // 销毁时清理定时器
        if (this.newsLoadingTimer) {
            clearTimeout(this.newsLoadingTimer);
            this.newsLoadingTimer = null;
        }

        window.removeEventListener('resize', this.resizeChart);
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }
        this.$root.$off('theme-change');
    },

    mounted() {
        this.getStockMarketData();
        this.getIndustryUpDown();
        this.stockDataStatus();
        window.addEventListener('resize', this.resizeChart);
        this.initTheme();
        // 行业数据历史查询记录
        this.get_good_stocks_history();
    },

    methods: {

        // 新增安全的字符串日期提取工具，保障所有对比和排序逻辑不出错
        safeGetTime(dateStr) {
            if (!dateStr) return 0;
            let s = String(dateStr).replace(/\//g, '-');
            // 防范类似 "20260507" 这种无连接符的字符串解析为 NaN
            if (/^\d{8}$/.test(s)) {
                s = `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
            }
            const time = new Date(s).getTime();
            return isNaN(time) ? 0 : time;
        },

        formatDate(date) {
            if (!date) return '';
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        async get_date_range_stock_datas() {
            if (!this.dateRange || this.dateRange.length !== 2) {
                Message.warning({
                    message: '请选择一个有效的日期范围',
                    center: true
                });
                return;
            }
            this.stocksLoading = true;
            const startDate = this.formatDate(this.dateRange[0]);
            const endDate = this.formatDate(this.dateRange[1]);

            // 这里可以调用接口获取数据
            const resp = await stock_history_data_date_range({ code: this.currentStockCode, start: startDate, end: endDate });
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data || [];
                // 给数据计算前一天差值
                this.processStockHistoryDiffs(rd);
            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
            }

            this.stocksLoading = false;
        },

        reset_filter_date() {
            this.lookBackDays = '';
            this.days = '';
            this.price = '';
            this.industryName = '';
        },

        formatVolumeInYi(val) {
            if (val === null || val === undefined || val === '' || isNaN(val)) return '0.00';
            return (Number(val) / 100000000).toFixed(2);
        },

        // 格式化成交额差值：带正负号，以亿为单位，保留两位小数
        formatVolumeDiffInYi(val) {
            if (val === null || val === undefined || val === '' || isNaN(val)) return '';
            const num = Number(val);
            if (num === 0) return '0.00';

            const diffInYi = (num / 100000000).toFixed(2);
            return num > 0 ? `+${diffInYi}` : diffInYi;
        },
        // 辅助计算与格式化
        formatDiff(val) {
            if (val === null || val === undefined || isNaN(val)) return '';
            if (val === 0) return '0.00';
            return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
        },

        async get_good_stocks_history() {
            this.isRunIconF = "el-icon-loading";
            const resp = await filter_good_stocks_history();
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data || [];
                this.filterStocksHistory = rd;
            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
            }
            this.isRunIconF = "el-icon-refresh";
        },

        async get_good_stocks(typeCheck) {
            if (typeCheck === 1) {
                this.lookBackDays = 10;
                this.days = 1000;
                this.price = 0.1;
            } else {
                if (!this.lookBackDays) {
                    Message.warning({
                        message: '请输入近多少个交易日',
                        center: true
                    });
                    return;
                }
                if (!this.days) {
                    Message.warning({
                        message: '请输入连续跌的交易日',
                        center: true
                    });
                    return;
                }
            }
            if (!this.industryName) {
                Message.warning({
                    message: '请至少选择一个行业进行查询',
                    center: true
                });
                return;
            }
            this.filterStocksLoading = true;
            const resp = await filter_good_stocks({ industry: this.industryName, days: this.days, lookBackDays: this.lookBackDays, price: this.price || 0.1 });
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data || [];
                var msg = resp.data.msg || '正在查询...';
                this.customSearchData = rd;
                if (this.days == 1000) {
                    this.customSearchDialogVisible = true;
                } else {
                    Message.success({
                        message: msg,
                        center: true
                    });
                }
            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
            }
            this.filterStocksLoading = false;
            this.visible = false;
        },

        async get_industry_datas() {
            const resp = await get_stock_industry_list();
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data;
                this.insdustryData = rd;
            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
            }
        },

        handleCustomSearchPageChange(val) {
            this.customSearchCurrentPage = val;
        },

        handleCustomSearch() {
            this.customSearchQuery = '';
            this.customSearchCurrentPage = 1;
            this.customSearchData = [];
            this.customSearchDialogVisible = true;
        },

        initTheme() {
            const savedTheme = localStorage.getItem('app-theme-dark');
            if (savedTheme !== null) {
                this.isDarkMode = savedTheme === 'true';
            }
            this.$root.$on('theme-change', (val) => {
                this.isDarkMode = val;
            });
        },

        closeAll() {
            this.chartDialogVisible = false;
        },

        handleNewsDialogClose() {
            this.newsDialogVisible = false;
            this.newsLoading = false;
            if (this.newsLoadingTimer) {
                clearTimeout(this.newsLoadingTimer);
                this.newsLoadingTimer = null;
            }
        },

        handleIframeLoad() {
            this.newsLoading = false;
            if (this.newsLoadingTimer) {
                clearTimeout(this.newsLoadingTimer);
                this.newsLoadingTimer = null;
            }
        },

        handleOpenNews(row) {
            this.currentNewsStockCode = row.code;
            this.currentNewsStockName = row.name;
            this.newsLoading = true;
            this.newsDialogVisible = true;

            if (this.newsLoadingTimer) {
                clearTimeout(this.newsLoadingTimer);
            }
            this.newsLoadingTimer = setTimeout(() => {
                this.newsLoading = false;
            }, 2500);
        },

        showStock30DaysDetail() {
            this.stockSortProp = 'pct_chg';
            this.stockSortOrder = 'descending';
            this.stock30DaysDetailVisible = true;
        },
        formatAmount(row, column, cellValue, index) {
            if (cellValue === null || cellValue === undefined || isNaN(cellValue)) {
                return '0.00';
            }
            return (Number(cellValue) / 100000000).toFixed(2);
        },
        async getStockHistoryData(code) {
            this.historyDays = this.historyDays || 30;
            const resp = await get_stock_history_data({
                code: code,
                days: this.historyDays,
            });
            if (resp.data.code === 1000) {
                this.stockHistoryData = resp.data.data;
                return;
            }

            Message.error({
                message: resp.data.msg,
                center: true
            });
        },
        handleStockSortChange({
            prop,
            order
        }) {
            this.stockSortProp = prop;
            this.stockSortOrder = order;
            this.stockCurrentPage = 1;
        },

        handleStockPageChange(val) {
            this.stockCurrentPage = val;
        },
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
                    Message.error({
                        message: resp.data.msg,
                        center: true
                    });
                    return;
                }
                Message.success({
                    message: resp.data.msg,
                    center: true
                });
            }).catch(() => { });
        },

        async getStockMarketData() {
            const resp = await get_stock_market_data();
            if (resp.data.code === 1000) {
                var rd = resp.data.data;
                rd.amount = `${(rd.amount / 100000000).toFixed(2)}亿`;
                this.marketSummary = rd;
            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
            }
        },
        async getIndustryUpDown() {
            const resp = await get_stock_industry_up_down();
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data;
                this.rawIndustryData = rd;
                console.log("getIndustryUpDown >>> ", resp.data.other);

            } else {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
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

        handleQueryIndustryInput(val) {
            const keyword = String(val || '').trim();

            if (this.industryQueryTimer) {
                clearTimeout(this.industryQueryTimer);
                this.industryQueryTimer = null;
            }

            if (!/^\d{6}$/.test(keyword)) {
                this.stockIndustryFromCode = '';
                this.industryQueryReqId += 1;
                this.industryQueryLoading = false;
                return;
            }

            this.stockIndustryFromCode = '';
            this.industryQueryLoading = true;
            this.fetchIndustryByStockCode(keyword);
        },
        getIndustryValueFromResp(data) {
            const stockInfo = Array.isArray(data) ? data[0] : data;
            if (!stockInfo || typeof stockInfo !== 'object') return '';

            if (typeof stockInfo.industry === 'string') {
                return stockInfo.industry.trim();
            }
            if (stockInfo.industry && typeof stockInfo.industry === 'object' && typeof stockInfo.industry.name === 'string') {
                return stockInfo.industry.name.trim();
            }
            return '';
        },
        async fetchIndustryByStockCode(code) {
            const reqId = ++this.industryQueryReqId;

            try {
                const resp = await get_stock_info_data({
                    code
                });

                if (reqId !== this.industryQueryReqId) {
                    return;
                }

                if (resp.data.code !== 1000) {
                    this.stockIndustryFromCode = '';
                    Message.error({
                        message: resp.data.msg,
                        center: true
                    });
                    return;
                }

                this.stockIndustryFromCode = this.getIndustryValueFromResp(resp.data.data);

            } catch (error) {
                void error;
                if (reqId === this.industryQueryReqId) {
                    this.stockIndustryFromCode = '';
                }
            } finally {
                if (reqId === this.industryQueryReqId) {
                    this.industryQueryLoading = false;
                }
            }
        },
        async openIndustryStocks(industryName) {
            this.currentIndustry = industryName;
            this.dialogVisible = true;
            this.stocksLoading = true;
            const resp = await get_industry_data({
                name: industryName
            });
            if (resp.data.code !== 1000) {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
                return;
            }

            const mockData = resp.data.data;
            this.industryStocks = mockData.sort((a, b) => b.changepercent - a.changepercent);
            this.stocksLoading = false;
        },

        async generateMockStocks(name) {
            const resp = await get_industry_data({
                name
            });
            if (resp.data.code !== 1000) {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
                return;
            }

            const mockData = resp.data.data;
            this.mockData = mockData.sort((a, b) => b.changepercent - a.changepercent);
        },

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
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    },
                    formatter: '{b}: {c} 亿元',
                    backgroundColor: this.isDarkMode ? '#333' : '#fff',
                    textStyle: {
                        color: this.isDarkMode ? '#eee' : '#333'
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    top: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    axisLabel: {
                        color: labelColor
                    },
                    splitLine: {
                        lineStyle: {
                            type: 'dashed',
                            color: splitLineColor
                        }
                    }
                },
                yAxis: {
                    type: 'category',
                    data: categoryData,
                    axisLabel: {
                        fontWeight: 'bold',
                        color: axisColor,
                        fontSize: 13
                    },
                    axisTick: {
                        show: false
                    },
                    axisLine: {
                        show: false
                    }
                },
                series: [{
                    name: '成交额',
                    type: 'bar',
                    data: valueData,
                    barWidth: 20,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{
                            offset: 0,
                            color: '#409eff'
                        },
                        {
                            offset: 1,
                            color: barEndColor
                        }
                        ]),
                        borderRadius: [0, 4, 4, 0]
                    },
                    label: {
                        show: true,
                        position: 'right',
                        formatter: '{c}亿',
                        color: labelColor
                    }
                }]
            };
            this.chartInstance.setOption(option);
        },
        resizeChart() {
            if (this.chartInstance) this.chartInstance.resize();
            if (this.myChart) this.myChart.resize();
        },

        handleOpenChart(row) {
            this.currentStockCode = row.code;
            this.currentStockName = row.name;
            this.chartDialogVisible = true;
        },

        // 提取出的计算差值独立逻辑
        processStockHistoryDiffs(rawData) {
            // 使用安全的日期转换工具确保【严格升序（老日期在前、新日期在后）】，避免 new Date() 解析非标字符串失效
            rawData.sort((a, b) => this.safeGetTime(a.day) - this.safeGetTime(b.day));

            for (let i = 0; i < rawData.length; i++) {
                let current = rawData[i];
                if (i === 0) {
                    current.close_diff = null;
                    current.open_diff = null;
                    current.low_diff = null;
                    current.high_diff = null;
                    current.volume_diff = null;
                } else {
                    let prev = rawData[i - 1];
                    current.close_diff = Number(current.close) - Number(prev.close);
                    current.open_diff = Number(current.open) - Number(prev.open);
                    current.low_diff = Number(current.low) - Number(prev.low);
                    current.high_diff = Number(current.high) - Number(prev.high);
                    current.volume_diff = Number(current.volume) - Number(prev.volume);
                }
            }
            this.currentStockHistoryData = rawData;
        },

        async onChartDialogOpened() {
            this.chartLoading = true;
            this.stockSortProp = 'pct_chg';
            this.stockSortOrder = 'descending';
            this.historyDays = this.historyDays || 30;
            const resp = await get_stock_history_data({
                code: this.currentStockCode,
                days: this.historyDays,
            });
            if (resp.data.code !== 1000) {
                Message.error({
                    message: resp.data.msg,
                    center: true
                });
                return;
            }

            this.chartLoading = false;

            // 计算差值及升序排列
            this.processStockHistoryDiffs(resp.data.data || []);

            this.renderTrendChart(this.currentStockHistoryData);
            this.stockSummary = {
                total: this.currentStockHistoryData.length,
                up: this.currentStockHistoryData.filter(item => item.pct_chg > 0).length,
                down: this.currentStockHistoryData.filter(item => item.pct_chg < 0).length
            }
        },

        onChartDialogClosed() {
            if (this.myChart) {
                this.myChart.dispose();
                this.myChart = null;
            }
            this.currentStockHistoryData = [];
        },

        renderTrendChart(data) {
            if (!this.$refs.stockTrendChart) return;
            if (this.myChart) {
                this.myChart.dispose();
            }
            this.myChart = echarts.init(this.$refs.stockTrendChart);

            const xAxisData = data.map(item => item.day);
            const yAxisData = data.map(item => item.pct_chg);

            const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
            const splitLineColor = this.isDarkMode ? '#333333' : '#eee';

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                        let result = params[0].name + '<br/>';
                        params.forEach((item) => {
                            let marker = item.marker;
                            let color = item.data > 0 ? '#f56c6c' : '#00bfa5';
                            result += `${marker}${item.seriesName}: <span style="color:${color};font-weight:bold;">${item.data > 0 ? '+' : ''}${item.data}%</span>`;
                        });
                        return result;
                    },
                    backgroundColor: this.isDarkMode ? '#333' : '#fff',
                    textStyle: {
                        color: this.isDarkMode ? '#eee' : '#333'
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '5%',
                    top: '10%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: xAxisData,
                    axisLabel: {
                        color: axisColor
                    },
                    boundaryGap: false
                },
                yAxis: {
                    type: 'value',
                    name: '涨跌幅(%)',
                    nameTextStyle: {
                        color: axisColor
                    },
                    axisLabel: {
                        color: axisColor
                    },
                    splitLine: {
                        lineStyle: {
                            type: 'dashed',
                            color: splitLineColor
                        }
                    }
                },
                series: [{
                    name: '涨跌幅',
                    type: 'line',
                    data: yAxisData,
                    smooth: true,
                    itemStyle: {
                        color: '#409eff'
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            color: 'rgba(64,158,255,0.4)'
                        },
                        {
                            offset: 1,
                            color: 'rgba(64,158,255,0.05)'
                        }
                        ])
                    },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        data: [
                            {
                                yAxis: 0,
                                lineStyle: {
                                    color: this.isDarkMode ? '#555' : '#ccc',
                                    type: 'solid'
                                }
                            }
                        ]
                    }
                }]
            };
            this.myChart.setOption(option);
        }
    }
};
</script>

<style scoped>
/* ========== CSS 变量系统 ========== */
.market-overview {
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
    --shadow-color: rgba(0, 0, 0, 0.05);

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
    --shadow-color: rgba(0, 0, 0, 0.5);
    --color-hover: #66b1ff;
}

/* 全局容器 */
* {
    box-sizing: border-box;
}

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

.text-up {
    color: var(--color-up);
    font-weight: bold;
}

.text-down {
    color: var(--color-down);
    font-weight: bold;
}

.text-down-1 {
    padding-top: 2px;
}

.history-detail {
    color: var(--color-blue);
    cursor: pointer;
    font-size: 13px;
}

.font-mono {
    font-family: "Consolas", "Monaco", monospace;
}

/* ============ 新增：历史数据正负差值控制 CSS ============ */
.diff-cell {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    /* 使差值数字靠右对齐 */
    line-height: 1.2;
}

.cell-value {
    font-size: 14px;
    color: var(--text-primary);
}

.cell-diff {
    font-size: 12px;
    margin-top: 2px;
    font-weight: 600;
}


/* 通用卡片样式 */
.card {
    background: var(--bg-card);
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 var(--shadow-color);
    padding: 24px;
    margin-bottom: 20px;
    border: 1px solid transparent;
}

.dark-theme .card {
    border: 1px solid #333;
}

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

.header-left {
    display: flex;
    align-items: baseline;
    gap: 15px;
}

.page-header h2 {
    margin: 0;
    font-size: 22px;
    color: var(--text-primary);
}

.refresh-time {
    font-size: 13px;
    color: var(--text-secondary);
}

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

.theme-toggle:hover {
    color: var(--color-blue);
}

.toggle-text {
    font-size: 13px;
    margin-left: 6px;
}

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

.total-amount .label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

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

.total-amount .sub-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
    letter-spacing: 1px;
}

.up-down-dist .label {
    font-size: 14px;
    color: var(--text-regular);
    margin-bottom: 12px;
    font-weight: 500;
}

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

.up-segment {
    background-color: var(--color-up);
}

.down-segment {
    background-color: var(--color-down);
}

.dist-details {
    display: flex;
    gap: 20px;
    font-size: 14px;
}

.detail-item .icon {
    font-size: 12px;
    margin-right: 2px;
}

.detail-item .ratio {
    color: var(--text-secondary);
    font-weight: normal;
    font-size: 12px;
    margin-left: 4px;
}

/* 2. 图表区域 */
.chart-container {
    width: 100%;
    height: 400px;
}

/* 3. 表格区域 */
.table-container {
    overflow-x: auto;
}

.table-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.table-container::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

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
.sortable {
    cursor: pointer;
    transition: color 0.3s;
}

.sortable:hover {
    color: var(--color-hover);
}

.sort-icon::after {
    content: '⇅';
    margin-left: 4px;
    opacity: 0.3;
    font-size: 12px;
}

.sort-icon.asc::after {
    content: '↑';
    opacity: 1;
    color: var(--color-blue);
}

.sort-icon.desc::after {
    content: '↓';
    opacity: 1;
    color: var(--color-blue);
}

.data-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    color: var(--text-regular);
    text-align: left;
}

.data-table tr:hover td {
    background-color: var(--bg-hover);
}

.font-bold {
    font-weight: 600;
    color: var(--text-primary);
}

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

/* ============ 交互设计：行业名称点击及小图标 ============ */
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

/* ============ 暗黑模式下的弹窗及表格适配样式 (增加!important强制生效) ============ */
.dark-theme ::v-deep .el-dialog {
    background-color: var(--bg-card) !important;
}

.dark-theme ::v-deep .el-dialog__title {
    color: var(--text-primary) !important;
}

.dark-theme ::v-deep .el-dialog__body {
    color: var(--text-regular) !important;
}

.dark-theme ::v-deep .el-loading-mask {
    background-color: rgba(30, 30, 30, 0.8) !important;
}

/* 确保弹窗里的搜索框文字也可见 */
.dark-theme ::v-deep .el-input__inner {
    background-color: var(--bg-app) !important;
    color: var(--text-primary) !important;
    border-color: var(--border-color) !important;
}

/* ============ 新增：暗黑模式下日期选择器输入框适配 ============ */
.dark-theme ::v-deep .el-date-editor--daterange.el-input__inner {
    background-color: var(--bg-app) !important;
    border-color: var(--border-color) !important;
}

.dark-theme ::v-deep .el-date-editor .el-range-input {
    background-color: transparent !important;
    color: var(--text-primary) !important;
}

.dark-theme ::v-deep .el-date-editor .el-range-separator {
    color: var(--text-primary) !important;
    line-height: 24px;
}

.dark-theme ::v-deep .el-date-editor .el-input__icon {
    color: var(--text-secondary) !important;
}

/* 暗黑模式日期输入框 Placeholder 颜色适配 */
.dark-theme ::v-deep .el-range-editor .el-range-input::-webkit-input-placeholder {
    color: var(--text-secondary);
}

.dark-theme ::v-deep .el-range-editor .el-range-input::-moz-placeholder {
    color: var(--text-secondary);
}

.dark-theme ::v-deep .el-range-editor .el-range-input:-ms-input-placeholder {
    color: var(--text-secondary);
}

.dark-theme ::v-deep .el-range-editor .el-range-input::placeholder {
    color: var(--text-secondary);
}

/* ============ 表格暗黑样式 - 全局覆盖边框 ============ */
.dark-theme ::v-deep .el-table,
.dark-theme ::v-deep .el-table th,
.dark-theme ::v-deep .el-table tr,
.dark-theme ::v-deep .el-table td,
.dark-theme ::v-deep .el-table th.is-leaf,
.dark-theme ::v-deep .el-table th.is-group {
    background-color: var(--bg-card) !important;
    color: var(--text-regular);
    border-color: var(--border-color) !important;
}

.dark-theme ::v-deep .el-table th {
    color: var(--text-secondary);
    font-weight: 600;
}

/* 覆盖 el-table 所有伪元素产生的白色边框线 */
.dark-theme ::v-deep .el-table::before,
.dark-theme ::v-deep .el-table::after,
.dark-theme ::v-deep .el-table--border::after,
.dark-theme ::v-deep .el-table--group::after,
.dark-theme ::v-deep .el-table__fixed-right::before,
.dark-theme ::v-deep .el-table__fixed::before {
    background-color: var(--border-color) !important;
}

.dark-theme ::v-deep .el-table--border,
.dark-theme ::v-deep .el-table--group {
    border-color: var(--border-color) !important;
}

.dark-theme ::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
    background-color: var(--bg-progress) !important;
}

.dark-theme ::v-deep .el-table--enable-row-hover .el-table__body tr:hover>td {
    background-color: var(--bg-hover) !important;
}

@media (max-width: 768px) {
    .summary-card {
        gap: 20px;
    }

    .total-amount .value-wrapper {
        font-size: 28px;
    }

    .header-left {
        flex-direction: column;
        gap: 5px;
        align-items: flex-start;
    }
}

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

.flush-filter-stocks-data {
    cursor: pointer;
}

/* 控制 el-tooltip 显示内容的换行 */
.custom-column .el-tooltip {
    white-space: normal !important;
    word-wrap: break-word !important;
    max-width: 300px;
    word-break: break-all;
}
</style>

<style>
/* ============ 暗黑模式下的全局弹出层样式 ============ */
.dark-theme-date-picker,
.dark-theme-select,
.dark-theme-popover {
    background-color: #1e1e1e !important;
    border-color: #333333 !important;
    color: #b0b0b0 !important;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.5) !important;
}

/* 弹出层三角箭头颜色修正 */
.dark-theme-date-picker.el-popper[x-placement^="bottom"] .popper__arrow::after,
.dark-theme-select.el-popper[x-placement^="bottom"] .popper__arrow::after,
.dark-theme-popover.el-popper[x-placement^="bottom"] .popper__arrow::after {
    border-bottom-color: #1e1e1e !important;
}

.dark-theme-date-picker.el-popper[x-placement^="bottom"] .popper__arrow,
.dark-theme-select.el-popper[x-placement^="bottom"] .popper__arrow,
.dark-theme-popover.el-popper[x-placement^="bottom"] .popper__arrow {
    border-bottom-color: #333333 !important;
}

.dark-theme-date-picker.el-popper[x-placement^="top"] .popper__arrow::after,
.dark-theme-select.el-popper[x-placement^="top"] .popper__arrow::after,
.dark-theme-popover.el-popper[x-placement^="top"] .popper__arrow::after {
    border-top-color: #1e1e1e !important;
}

.dark-theme-date-picker.el-popper[x-placement^="top"] .popper__arrow,
.dark-theme-select.el-popper[x-placement^="top"] .popper__arrow,
.dark-theme-popover.el-popper[x-placement^="top"] .popper__arrow {
    border-top-color: #333333 !important;
}

/* --- 日期选择器下拉框详情样式 --- */
.dark-theme-date-picker .el-picker-panel__body-wrapper,
.dark-theme-date-picker .el-picker-panel__sidebar {
    background-color: #1e1e1e !important;
}

.dark-theme-date-picker .el-picker-panel__sidebar {
    border-right: 1px solid #333333 !important;
}

.dark-theme-date-picker .el-date-range-picker__content.is-left {
    border-right: 1px solid #333333 !important;
}

.dark-theme-date-picker .el-picker-panel__shortcut {
    color: #b0b0b0 !important;
}

.dark-theme-date-picker .el-picker-panel__shortcut:hover {
    background-color: #2c2c2c !important;
    color: #409eff !important;
}

.dark-theme-date-picker .el-date-range-picker__header {
    color: #e0e0e0 !important;
}

.dark-theme-date-picker .el-picker-panel__icon-btn {
    color: #b0b0b0 !important;
}

.dark-theme-date-picker .el-picker-panel__icon-btn:hover {
    color: #409eff !important;
}

.dark-theme-date-picker th {
    color: #b0b0b0 !important;
    border-bottom: 1px solid #333333 !important;
}

.dark-theme-date-picker .el-date-table td {
    color: #b0b0b0;
}

.dark-theme-date-picker .el-date-table td.in-range div {
    background-color: #333333 !important;
}

.dark-theme-date-picker .el-date-table td.in-range div:hover {
    background-color: #444444 !important;
}

.dark-theme-date-picker .el-date-table td.start-date span,
.dark-theme-date-picker .el-date-table td.end-date span,
.dark-theme-date-picker .el-date-table td.current span {
    background-color: #409eff !important;
    color: #ffffff !important;
}

.dark-theme-date-picker .el-date-table td.available:hover {
    color: #409eff !important;
}

.dark-theme-date-picker .el-date-table td.next-month,
.dark-theme-date-picker .el-date-table td.prev-month {
    color: #555555 !important;
}

/* --- Select下拉选择框详情样式 --- */
.dark-theme-select .el-select-dropdown__item {
    color: #b0b0b0 !important;
}

.dark-theme-select .el-select-dropdown__item.hover,
.dark-theme-select .el-select-dropdown__item:hover {
    background-color: #2c2c2c !important;
}

.dark-theme-select .el-select-dropdown__item.selected {
    color: #409eff !important;
    background-color: #333333 !important;
    font-weight: bold;
}

.filter-date-search {
    display: flex;
    align-items: center;
    gap: 10px;
}

/* --- Popover气泡框详情样式 --- */
.dark-theme-popover {
    color: #e0e0e0 !important;
}
</style>
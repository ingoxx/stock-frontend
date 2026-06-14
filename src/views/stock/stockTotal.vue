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

            <!-- 2. 右侧操作区：自选股入口 + 操作日志入口 + 主题切换等 -->
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="theme-toggle" @click="followedDialogVisible = true" title="查看自选股">
                    <i class="el-icon-star-on" style="color: #e6a23c;"></i>
                    <span class="toggle-text">我的自选 ({{ followedStocks.length }})</span>
                </div>
                <!-- 新增操作日志入口 -->
                <div class="theme-toggle" @click="logDialogVisible = true" title="查看操作日志">
                    <i class="el-icon-document" style="color: #409eff;"></i>
                    <span class="toggle-text">操作日志</span>
                </div>
            </div>
        </div>

        <!-- ================== 全新 Grid 布局核心大盘数据卡片 ================== -->
        <!-- 【优化项】：添加了 v-loading 绑定和加载提示文本 -->
        <div class="summary-card card" v-loading="summaryLoading || indexLoading" element-loading-text="大盘数据加载中" element-loading-spinner="el-icon-loading">
            
            <!-- 左侧：上证指数看板 -->
            <div class="summary-item index-summary" v-if="indexData">
                <div class="item-header">
                    <span class="title">{{ indexData.name }}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="time"><i class="el-icon-time"></i> {{ indexData.date }} {{ indexData.time }}</span>
                        <span class="refresh-sub-btn" @click="fetchIndexData(true)" title="刷新上证指数">
                            <span class="source-text">数据来源新浪财经</span> <i class="el-icon-refresh"></i>
                        </span>
                    </div>
                </div>
                <div class="item-body">
                    <div class="main-price" :class="getPriceClass(indexData.change_amount)">
                        <span class="price-num">{{ Number(indexData.close).toFixed(2) }}</span>
                        <span class="price-change">
                            {{ indexData.change_amount > 0 ? '+' : '' }}{{ Number(indexData.change_amount).toFixed(2) }}
                            ({{ indexData.change_percent > 0 ? '+' : '' }}{{ Number(indexData.change_percent).toFixed(2) }}%)
                        </span>
                    </div>
                    <div class="price-details">
                        <div class="detail-col">
                            <span class="d-label">开盘</span>
                            <span class="d-val" :class="getPriceClass(indexData.open - indexData.prev_close)">{{ Number(indexData.open).toFixed(2) }}</span>
                        </div>
                        <div class="detail-col">
                            <span class="d-label">最高</span>
                            <span class="d-val" :class="getPriceClass(indexData.high - indexData.prev_close)">{{ Number(indexData.high).toFixed(2) }}</span>
                        </div>
                        <div class="detail-col">
                            <span class="d-label">最低</span>
                            <span class="d-val" :class="getPriceClass(indexData.low - indexData.prev_close)">{{ Number(indexData.low).toFixed(2) }}</span>
                        </div>
                        <div class="detail-col">
                            <span class="d-label">成交额</span>
                            <span class="d-val">{{ (indexData.amount / 100000000).toFixed(2) }}亿</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 中间：总成交额 -->
            <div class="summary-item total-amount-summary">
                <div class="item-header">
                    <span class="title">两市总成交额</span>
                </div>
                <div class="item-body flex-center">
                    <span class="number-huge">{{ marketSummary.amount }}</span>
                </div>
            </div>

            <!-- 右侧：涨跌分布 -->
            <div class="summary-item up-down-summary">
                <div class="item-header">
                    <span class="title">涨跌分布 (共 {{ marketSummary.total }} 家)</span>
                </div>
                <div class="item-body flex-col-center">
                    <div class="progress-bar-container">
                        <div class="bar-segment up-segment" :style="{ width: upPercent + '%' }">
                            <span v-if="upPercent > 15">{{ marketSummary.up }}家</span>
                        </div>
                        <div class="bar-segment down-segment" :style="{ width: downPercent + '%' }">
                            <span v-if="downPercent > 15">{{ marketSummary.down }}家</span>
                        </div>
                    </div>
                    <div class="dist-details">
                        <div class="detail-item text-up">
                            <span class="icon">▲</span> 涨: <span class="d-val">{{ marketSummary.up }}</span>
                            <span class="ratio">({{ ((marketSummary.up / marketSummary.total) * 100).toFixed(1) }}%)</span>
                        </div>
                        <div class="detail-item text-down">
                            <span class="icon">▼</span> 跌: <span class="d-val">{{ marketSummary.down }}</span>
                            <span class="ratio">({{ ((Number(marketSummary.down) / marketSummary.total) * 100).toFixed(1) }}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================== 自定义条件查询功能 ================== -->
        <div class="custom-query-section card">
            <div class="section-title">
                <span class="indicator" :style="{ background: trend === 1 ? 'var(--color-up)' : 'var(--color-down)' }"></span> 
                筛选指定行业近期{{ trend === 1 ? '连续上涨' : '回调下跌' }}的股票
            </div>
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                
                <div class="trend-selector-wrapper">
                    <span class="filter-label">走势方向</span>
                    <el-radio-group v-model="trend" size="small" class="custom-trend-radio" @change="get_good_stocks_history()">
                        <el-radio-button :label="1">
                            <span class="trend-btn-content">
                                <i class="el-icon-top"></i> 连涨
                            </span>
                        </el-radio-button>
                        <el-radio-button :label="2">
                            <span class="trend-btn-content">
                                <i class="el-icon-bottom"></i> 连跌
                            </span>
                        </el-radio-button>
                    </el-radio-group>
                </div>

                <el-input v-model="price" placeholder="股票价格(默认没有限制)" clearable style="width: 220px;"></el-input>
                <el-input v-model="days" :placeholder="trend === 1 ? '连续上涨交易日(默认近3个)' : '连续下跌交易日(默认近3个)'" clearable style="width: 240px;"></el-input>

                <el-select clearable v-model="industryName" filterable placeholder="请选择行业(可搜索)" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                    <el-option v-for="item in rawIndustryData" :key="item.name" :label="item.name" :value="item.name">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span :style="{ color: queriedIndustrySet.has(item.name) ? '#f56c6c' : 'inherit' }">{{ item.name }}</span>
                            <span v-if="queriedIndustrySet.has(item.name)" style="color: #f56c6c; font-size: 12px;">可查询</span>
                        </div>
                    </el-option>
                </el-select>

                <div class="flush-filter-stocks-data">
                    <el-tooltip class="item" effect="dark" content="查询状态" placement="top">
                        <i :class="isRunIconF" @click="get_good_stocks_history()"></i>
                    </el-tooltip>
                </div>

                <el-button size="small" type="primary" icon="el-icon-search" @click="get_good_stocks(1)" :loading="filterStocksLoading">查询</el-button>

                <el-popover placement="top" width="160" v-model="visible" :popper-class="isDarkMode ? 'dark-theme-popover' : ''">
                    <p>确定更新数据吗？</p>
                    <div style="text-align: right; margin: 0">
                        <el-button size="mini" type="text" @click="visible = false">取消</el-button>
                        <el-button type="primary" size="mini" @click="get_good_stocks(2)">确定</el-button>
                    </div>
                    <el-button size="small" slot="reference" type="danger" icon="el-icon-s-data" :loading="filterStocksLoading">更新</el-button>
                </el-popover>

                <el-button size="small" type="warning" icon="el-icon-search" @click="reset_filter_date">重置</el-button>
            </div>
        </div>

        <!-- ================== 图表区域 ================== -->
        <div class="charts-wrapper">
            <div class="chart-section card" v-loading="industryChartLoading" element-loading-text="数据加载中" element-loading-spinner="el-icon-loading">
                <div class="section-title">
                    <span class="indicator"></span> 热门行业成交额 Top 10 (单位：亿)
                </div>
                <div ref="industryChart" class="chart-container"></div>
            </div>

            <div class="chart-section card" v-loading="inflowChartLoading" element-loading-text="数据加载中" element-loading-spinner="el-icon-loading">
                <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center;">
                        <span class="indicator" style="background: #67c23a;"></span> 行业资金净流入 Top 10 (单位：亿)
                    </div>
                    <span class="refresh-sub-btn" @click="fetchInflowData(true)" title="刷新行业资金流入">
                        <span class="source-text">数据来源东方财富</span> <i class="el-icon-refresh"></i> 
                    </span>
                </div>
                <div ref="inflowChart" class="chart-container"></div>
            </div>
        </div>

        <!-- 3. 行业详细数据列表 -->
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
                                涨 <i :class="getSortIcon('up')"></i>
                            </th>
                            <th width="20%" class="sortable" @click="handleSort('down')">
                                跌 <i :class="getSortIcon('down')"></i>
                            </th>
                            <th width="50%" class="sortable" @click="handleSort('amount')">
                                成金额 (亿元) <i :class="getSortIcon('amount')"></i>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in paginatedIndustries" :key="index">
                            <td>
                                <span class="rank-badge" :class="getRankClass(index)">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
                            </td>
                            <td class="font-bold">
                                <div class="industry-name-link" @click="openIndustryStocks(item.name)" title="点击查看行业个股详情">
                                    {{ item.name }}
                                    <i class="el-icon-data-line hover-icon"></i>
                                </div>
                            </td>
                            <td class="font-bold text-up">{{ item.up }}</td>
                            <td class="font-bold text-down">{{ item.down }}</td>
                            <td class="font-mono">{{ item.amountBtn }}</td>
                        </tr>
                        <tr v-if="paginatedIndustries.length === 0">
                            <td colspan="5" style="text-align: center; padding: 20px; color: #909399;">暂无数据</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="pagination-wrapper">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper" 
                    :current-page.sync="currentPage"
                    :page-size.sync="pageSize" 
                    :page-sizes="[10, 20, 50, 100]"
                    :total="formattedIndustries.length" 
                    @size-change="handleSizeChange"
                    @current-change="handlePageChange">
                </el-pagination>
            </div>
        </div>

        <!-- ================== 操作日志记录弹窗 ================== -->
        <el-dialog v-dialogDrag title="请求操作日志记录" :visible.sync="logDialogVisible" width="65%"
            :close-on-click-modal="false" :center="true">
            
            <div class="dialog-header-actions section-search-1" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <el-input v-model="searchLogQuery" placeholder="搜索操作名称或参数..." prefix-icon="el-icon-search" clearable style="width: 250px;" size="small"></el-input>
                    <el-date-picker v-model="searchLogDate" type="date" placeholder="选择日期过滤" size="small" :popper-class="isDarkMode ? 'dark-theme-date-picker' : ''" style="width: 160px;"></el-date-picker>
                </div>
                <el-button type="danger" size="small" icon="el-icon-delete" @click="clearLogs">清空日志</el-button>
            </div>

            <el-table :data="paginatedLogs" stripe style="width: 100%" max-height="500" size="small" empty-text="暂无操作记录">
                <el-table-column prop="time" label="操作时间" width="180"></el-table-column>
                <el-table-column prop="action" label="操作名称" width="220">
                    <template slot-scope="scope">
                        <el-tag size="small" type="info" effect="plain">{{ scope.row.action }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="params" label="请求参数详情 (JSON)">
                    <template slot-scope="scope">
                        <div class="log-params-view">
                            {{ scope.row.params || '无参数' }}
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrapper" style="margin-top: 15px; text-align: right;">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper" 
                    :current-page.sync="logCurrentPage"
                    :page-size.sync="logPageSize" 
                    :page-sizes="[15, 30, 50, 100]"
                    :total="filteredLogs.length" 
                    @size-change="handleLogSizeChange"
                    @current-change="handleLogPageChange">
                </el-pagination>
            </div>
        </el-dialog>

        <!-- ================== 我的自选/关注股票弹窗 ================== -->
        <el-dialog v-dialogDrag title="我的自选 / 关注股票" :visible.sync="followedDialogVisible" width="85%"
            :close-on-click-modal="false" :center="true">
            
            <div class="dialog-header-actions section-search-1" style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <el-input v-model="searchFollowedQuery" placeholder="输入股票代码或名称搜索" prefix-icon="el-icon-search" clearable style="width: 230px;" size="small"></el-input>
                    <el-button type="success" size="small" icon="el-icon-refresh" @click="refreshFollowedRealTime()" :loading="followedLoading">刷新自选行情</el-button>
                </div>
            </div>

            <el-table :data="paginatedFollowedStocks" v-loading="followedLoading" stripe style="width: 100%" max-height="450" size="small">
                <el-table-column prop="code" label="股票代码" min-width="90">
                    <template slot-scope="scope">
                        <span class="stock-code-link" @click="handleOpenChart(scope.row)">
                            {{ scope.row.code }} <i class="el-icon-data-line"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="股票名称" min-width="110"></el-table-column>
                <el-table-column prop="industry" label="行业" min-width="110"></el-table-column>
                <el-table-column prop="pct_chg" label="今日涨跌幅" min-width="100">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.pct_chg)">
                            {{ scope.row.pct_chg > 0 ? '+' : '' }}{{scope.row.pct_chg }}%
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="close" label="最新价" min-width="90"></el-table-column>
                <el-table-column prop="open" label="今日开盘" min-width="90"></el-table-column>
                <el-table-column prop="high" label="最高价" min-width="90">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.high - scope.row.open)">{{ scope.row.high }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="low" label="最低价" min-width="90">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.low - scope.row.open)">{{ scope.row.low }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="volume" label="成交额(亿)" min-width="110">
                    <template slot-scope="scope">
                        <span>{{ formatVolumeInYi(scope.row.volume) }}</span>
                    </template>
                </el-table-column>

                <!-- 【新增与深度优化列】：已设监控条件精美展示区 -->
                <el-table-column label="监控预警条件配置" min-width="230">
                    <template slot-scope="scope">
                        <div v-if="getMonitorForStock(scope.row.code)">
                            <!-- 1. 若监控已触发 (status === 2) 显示红色闪烁标签 -->
                            <div v-if="getMonitorForStock(scope.row.code).status === 2" class="monitor-info-box">
                                <el-tag type="danger" size="small" effect="dark" class="monitor-triggered-tag">
                                    <i class="el-icon-message-solid"></i> 监控已触发预警
                                </el-tag>
                            </div>
                            <!-- 2. 若监控未触发 (status === 1) 且有设定条件，正常显示数值 -->
                            <div v-else-if="getMonitorForStock(scope.row.code).price || (getMonitorForStock(scope.row.code).pct !== undefined && getMonitorForStock(scope.row.code).pct !== null && getMonitorForStock(scope.row.code).pct !== '')" class="monitor-info-box">
                                <div class="monitor-item" v-if="getMonitorForStock(scope.row.code).price">
                                    <span class="m-label"><i class="el-icon-bottom-right"></i> 跌至价位</span>
                                    <span class="m-value price">≤ {{ getMonitorForStock(scope.row.code).price }} 元</span>
                                    <!-- 新增：展示距离最新价的跌幅百分比 -->
                                    <span v-if="getMonitorDropPercent(scope.row) !== null" :class="getDropPercentClass(getMonitorDropPercent(scope.row))" style="margin-left: 6px; font-size: 11px; font-weight: bold;">
                                        (距现价 {{ getMonitorDropPercent(scope.row) > 0 ? '+' : '' }}{{ getMonitorDropPercent(scope.row).toFixed(2) }}%)
                                    </span>
                                </div>
                            </div>
                            <!-- 3. 没有有效条件则显示兜底文本 -->
                            <span v-else class="no-monitor-text">- 暂未配置监控 -</span>
                        </div>
                        <span v-else class="no-monitor-text">- 暂未配置监控 -</span>
                    </template>
                </el-table-column>

                <el-table-column label="操作" min-width="200" fixed="right" align="center">
                    <template slot-scope="scope">
                        <el-button type="danger" size="mini" icon="el-icon-delete" @click="unfollowStock(scope.row)">移除</el-button>
                        <el-button type="warning" size="mini" icon="el-icon-bell" @click="openMonitorConfig(scope.row)">配置监控</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="pagination-wrapper" style="margin-top: 15px; justify-content: flex-end;">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper" 
                    :current-page.sync="followedCurrentPage"
                    :page-size.sync="followedPageSize" 
                    :page-sizes="[8, 15, 30, 50]"
                    :total="processedFollowedStocks.length" 
                    @size-change="handleFollowedSizeChange"
                    @current-change="handleFollowedPageChange">
                </el-pagination>
            </div>
        </el-dialog>

        <!-- ================== 配置监控条件单弹窗 (已精美重绘升级) ================== -->
        <el-dialog v-dialogDrag :title="`智能监控条件单`" :visible.sync="monitorDialogVisible" width="520px"
            :close-on-click-modal="false" :center="true">
            <div class="monitor-dialog-header">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: baseline;">
                        <span class="monitor-stock-name">{{ monitorForm.name }}</span>
                        <span class="monitor-stock-code">{{ monitorForm.code }}</span>
                    </div>
                    <el-tag size="small" :type="monitorForm.currentPrice > 0 ? 'danger' : 'success'" effect="dark" class="price-tag">
                        现价: {{ monitorForm.currentPrice }} ({{ monitorForm.currentPct > 0 ? '+' : '' }}{{ monitorForm.currentPct }}%)
                    </el-tag>
                </div>
            </div>
            
            <div class="monitor-form-container">
                <el-alert title="触发任一设定条件时将向您发送提醒通知" type="info" show-icon :closable="false" class="custom-alert" :class="isDarkMode ? 'dark-theme-alert' : ''"></el-alert>
                
                <el-form :model="monitorForm" label-width="100px" size="small" style="margin-top: 15px;">
                    <!-- 向上突破区 -->
                    <div class="monitor-card up-card">
                        <div class="card-header text-up"><i class="el-icon-top-right"></i> 向下回落监控 (止损/抄底)</div>
                        <div class="card-body">
                            <el-form-item label="价格跌到 ≤">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <el-input v-model="monitorForm.targetPriceUp" placeholder="例如: 15.50" clearable style="flex: 1;">
                                        <template slot="append">元</template>
                                    </el-input>
                                    <span v-if="targetPriceChangePct !== null" :class="getPriceClass(targetPriceChangePct)" style="font-size: 13px; font-weight: bold; white-space: nowrap; min-width: 100px; text-align: left;">
                                        {{ targetPriceChangePct > 0 ? '涨幅' : '跌幅' }}: {{ targetPriceChangePct > 0 ? '+' : '' }}{{ targetPriceChangePct.toFixed(2) }}%
                                    </span>
                                </div>
                            </el-form-item>
                        </div>
                    </div>
                </el-form>

                <div class="feishu-hint">
                    <i class="el-icon-message-solid"></i> <span>信息会实时推送到飞书机器人群</span>
                </div>
            </div>
            
            <div slot="footer" class="dialog-footer">
                <el-button @click="monitorDialogVisible = false" size="small" plain>取 消</el-button>
                <el-button type="primary" @click="saveMonitorConfig" size="small" :loading="monitorSaving" icon="el-icon-finished">保 存 监 控</el-button>
            </div>
        </el-dialog>


        <!-- ================== 个股详情弹窗 ================== -->
        <el-dialog v-dialogDrag :title="`${currentStockName} (${currentStockCode}) - 近${historyDays}天详情`"
            :visible.sync="stock30DaysDetailVisible" width="60%" :close-on-click-modal="false" :center="true"
            @close="closeAll">
            
            <div class="filter-date-search">
                <div class="date-picker-wrapper">
                    <el-date-picker v-model="dateRange" type="daterange" align="right" unlink-panels range-separator="至"
                        start-placeholder="开始日期" end-placeholder="结束日期" size="small" :picker-options="pickerOptions"
                        :popper-class="isDarkMode ? 'dark-theme-date-picker' : ''">
                    </el-date-picker>
                </div>
                <div class="search-wrapper">
                    <el-button type="primary" icon="el-icon-search" size="mini" :loading="stocksLoading" @click="get_date_range_stock_datas">查询区间</el-button>
                </div>
                <div class="search-wrapper">
                    <el-button type="success" icon="el-icon-odometer" size="mini" :loading="stocksLoading" @click="get_stock_rt_data_v2(true)">追加今日</el-button>
                </div>
                <div class="search-wrapper" style="margin-left: auto;">
                    <el-button 
                        type="warning" 
                        :icon="isCurrentStockFollowed ? 'el-icon-star-on' : 'el-icon-star-off'" 
                        size="mini" 
                        :disabled="isCurrentStockFollowed"
                        :title="isCurrentStockFollowed ? '已在关注列表中' : ''"
                        @click="followCurrentStock">
                        {{ isCurrentStockFollowed ? '已关注' : '加入自选' }}
                    </el-button>
                </div>
            </div>

            <!-- ======== 全新升级：动态折线图分析面板 (自定义多指标) ======== -->
            <div class="algo-params-panel" style="margin-top: 15px;">
                <div class="panel-header" @click="toggleCustomChartPanel">
                    <span><i class="el-icon-data-board"></i> 多维度动态折线图分析 (支持精准到日)</span>
                    <i :class="showCustomChartPanel ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                <transition name="fade-slide">
                    <div v-show="showCustomChartPanel" class="panel-content">
                        <!-- 图表控制栏 -->
                        <div class="custom-chart-controls" style="margin-bottom: 15px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 13px; color: var(--text-secondary); font-weight: bold;">查看指标：</span>
                                <el-select v-model="selectedChartField" size="small" style="width: 160px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                    <el-option v-for="opt in chartFieldOptions" :key="opt.value" :label="opt.label" :value="opt.value">
                                        <i :class="opt.icon" style="margin-right: 5px;"></i> {{ opt.label }}
                                    </el-option>
                                </el-select>
                            </div>
                            <span class="chart-hint-text">
                                <i class="el-icon-mouse"></i> 提示：若时间跨度较长，可滑动底部拉杆或使用鼠标滚轮缩放查看精确单日明细。
                            </span>
                        </div>

                        <!-- 图表容器 -->
                        <div v-loading="stocksLoading" element-loading-background="transparent">
                            <div ref="customFieldChart" style="width: 100%; height: 360px;"></div>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- ======== AI 自然语言研判模块 ======== -->
            <div class="ai-terminal-panel" style="margin-top: 15px;">
                <div class="panel-header" @click="showAIAnalysis = !showAIAnalysis">
                    <span><i class="el-icon-magic-stick"></i> AI根据历史数据分析走势</span>
                    <i :class="showAIAnalysis ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                
                <transition name="fade-slide">
                    <div v-show="showAIAnalysis" class="panel-content ai-body">
                        <!-- AI 模式与参数设置区 -->
                        <div class="ai-settings-row">
                            <span style="font-size: 13px; color: var(--text-secondary); margin-right: 10px;">驱动大脑：</span>
                            <el-radio-group v-model="aiConfig.mode" size="mini" style="margin-right: 15px;" :disabled="aiStatus === 'loading' || aiStatus === 'typing'">
                                <el-radio-button label="local">🚀 本地极速引擎</el-radio-button>
                                <el-radio-button label="api">🧠 云端大模型</el-radio-button>
                            </el-radio-group>
                            
                            <el-button v-if="aiStatus === 'idle' || aiStatus === 'finished'" type="primary" size="mini" @click="triggerAIGeneration">
                                <i class="el-icon-s-promotion"></i> 立即生成分析
                            </el-button>
                            <el-button v-else type="danger" size="mini" @click="stopAIGeneration" icon="el-icon-video-pause">
                                停止生成
                            </el-button>

                            <div v-if="aiStatus === 'loading' || aiStatus === 'typing'" class="ai-running-indicator">
                                <i class="el-icon-loading"></i>
                                <span>{{ aiStatus === 'loading' ? '正在与大脑神经中枢通讯...' : '数据研判中...' }}</span>
                            </div>
                            <div v-else-if="aiStatus === 'finished'" class="ai-finished-indicator">
                                <i class="el-icon-circle-check"></i>
                                <span>分析已完成</span>
                            </div>
                        </div>
                        
                        <div class="ai-settings-api-ext" v-if="aiConfig.mode === 'api'">
                            <el-select v-model="aiConfig.preset" size="mini" @change="handleAiPresetChange" placeholder="选择预设" style="width: 165px; margin-right: 10px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                <el-option label="Gemini (默认)" value="gemini"></el-option>
                                <el-option label="DeepSeek" value="deepseek"></el-option>
                            </el-select>
                            
                            <el-select v-model="aiConfig.model" filterable allow-create placeholder="选择或输入模型" size="mini" style="width: 220px; margin-right: 10px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                <el-option v-for="item in availableModels" :key="item" :label="item" :value="item"></el-option>
                            </el-select>
                        </div>

                        <div class="terminal-box">
                            <div class="terminal-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
                                    <span class="terminal-title">Stock_AI_Agent_Terminal ~ {{ currentStockCode }} [{{ aiConfig.mode === 'api' ? aiConfig.preset.toUpperCase() : 'LOCAL_ENGINE' }}]</span>
                                </div>
                                <div v-if="aiStatus === 'finished'" class="terminal-actions">
                                    <span class="action-btn copy-btn" @click="copyAiContent" title="复制内容"><i class="el-icon-document-copy"></i> 复制</span>
                                    <span class="action-btn clear-btn" @click="clearAiContent" title="清空终端"><i class="el-icon-delete"></i> 清空</span>
                                </div>
                            </div>
                            <div class="terminal-content" v-html="formattedTerminalContent"></div>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- ======== 量化策略调参面板 ======== -->
            <div class="algo-params-panel" style="margin-top: 15px;">
                <div class="panel-header" @click="showAlgoParams = !showAlgoParams">
                    <span><i class="el-icon-setting"></i> 智能量化买点：策略参数调优 (修改后实时回测)</span>
                    <i :class="showAlgoParams ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                <transition name="fade-slide">
                    <div v-show="showAlgoParams" class="panel-content">
                        <el-row :gutter="20" class="param-row">
                            <el-col :span="8">
                                <div class="param-label">主策略模式</div>
                                <el-select v-model="algoParams.strategyMode" size="mini" style="width: 100%;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                    <el-option label="智能自适应 (推荐)" value="auto"></el-option>
                                    <el-option label="强制: 顺势突破 (右侧)" value="trend"></el-option>
                                    <el-option label="强制: 逆向抄底 (左侧)" value="contrarian"></el-option>
                                    <el-option label="强制: 箱体震荡 (均值)" value="box"></el-option>
                                </el-select>
                            </el-col>
                            <el-col :span="8">
                                <div class="param-label">激进点：近期走势跟随权重 (0~1)</div>
                                <el-slider v-model="algoParams.aggrTraceWeight" :min="0" :max="1" :step="0.05" show-input input-size="mini"></el-slider>
                            </el-col>
                            <el-col :span="8">
                                <div class="param-label">稳健点：绝对底部支撑权重 (0~1)</div>
                                <el-slider v-model="algoParams.steadySupportWeight" :min="0" :max="1" :step="0.05" show-input input-size="mini"></el-slider>
                            </el-col>
                        </el-row>
                        <el-row :gutter="20" class="param-row" style="margin-top: 15px;">
                            <el-col :span="8">
                                <div class="param-label">右侧突破：加价抢筹率 (如1.01=加价1%)</div>
                                <el-input-number size="mini" v-model="algoParams.breakoutPremium" :precision="3" :step="0.005" :min="1.000" :max="1.100" controls-position="right" style="width: 100%;"></el-input-number>
                            </el-col>
                            <el-col :span="8">
                                <div class="param-label">左侧恐慌：打折接刀率 (如0.95=打95折)</div>
                                <el-input-number size="mini" v-model="algoParams.panicDiscount" :precision="3" :step="0.005" :min="0.800" :max="1.000" controls-position="right" style="width: 100%;"></el-input-number>
                            </el-col>
                        </el-row>
                    </div>
                </transition>
            </div>

            <!-- ======== 极值与策略推演看板 ======== -->
            <div class="algo-params-panel" v-if="extremesTableData && extremesTableData.length > 0" style="margin-top: 15px; margin-bottom: 15px;">
                <div class="panel-header" @click="showExtremesTable = !showExtremesTable">
                    <span><i class="el-icon-s-data"></i> 核心数据指标与策略推演 (极值看板)</span>
                    <i :class="showExtremesTable ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                <transition name="fade-slide">
                    <div v-show="showExtremesTable" class="panel-content" style="padding: 0;">
                        <el-table :data="extremesTableData" size="small" stripe style="width: 100%;">
                            <el-table-column prop="label" label="核心数据指标" min-width="100" align="center"></el-table-column>
                            <el-table-column label="近期极限峰值 (高点/激进)" align="center">
                                <el-table-column prop="maxVal" label="数值" min-width="120" align="right">
                                    <template slot-scope="scope">
                                        <span v-if="scope.row.key === 'buy_price'" style="color: #e6a23c; font-weight: bold;">
                                            <i class="el-icon-s-opportunity"></i> {{ scope.row.maxVal.toFixed(2) }}
                                        </span>
                                        <span v-else class="text-up font-bold">
                                            <i class="el-icon-top"></i>
                                            <span v-if="scope.row.key === 'pct_chg'">{{ scope.row.maxVal > 0 ? '+' : '' }}{{ scope.row.maxVal.toFixed(2) }}%</span>
                                            <span v-else-if="scope.row.key === 'volume'">{{ formatVolumeInYi(scope.row.maxVal) }}</span>
                                            <span v-else>{{ scope.row.maxVal.toFixed(2) }}</span>
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="maxDay" label="出现日期 / 策略推演" min-width="260" align="left"></el-table-column>
                            </el-table-column>

                            <el-table-column label="近期极限谷底 (低点/防守)" align="center">
                                <el-table-column prop="minVal" label="数值" min-width="120" align="right">
                                    <template slot-scope="scope">
                                        <span v-if="scope.row.key === 'buy_price'" style="color: #67c23a; font-weight: bold;">
                                            <i class="el-icon-aim"></i> {{ scope.row.minVal.toFixed(2) }}
                                        </span>
                                        <span v-else class="text-down font-bold">
                                            <i class="el-icon-bottom"></i>
                                            <span v-if="scope.row.key === 'pct_chg'">{{ scope.row.minVal > 0 ? '+' : '' }}{{ scope.row.minVal.toFixed(2) }}%</span>
                                            <span v-else-if="scope.row.key === 'volume'">{{ formatVolumeInYi(scope.row.minVal) }}</span>
                                            <span v-else>{{ scope.row.minVal.toFixed(2) }}</span>
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="minDay" label="出现日期 / 策略推演" min-width="260" align="left"></el-table-column>
                            </el-table-column>
                        </el-table>
                    </div>
                </transition>
            </div>

            <!-- ======== K线形态组合统计看板 (支持涨跌交替多特征分析) ======== -->
            <div class="algo-params-panel" v-if="currentStockHistoryData && currentStockHistoryData.length > 0" style="margin-top: 15px; margin-bottom: 15px;">
                <div class="panel-header" @click="showPatternStat = !showPatternStat">
                    <span><i class="el-icon-pie-chart"></i> K线形态组合统计 (涨跌交替特征分析)</span>
                    <i :class="showPatternStat ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                </div>
                <transition name="fade-slide">
                    <div v-show="showPatternStat" class="panel-content">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 13px; color: var(--text-secondary); font-weight: bold;">分析形态：</span>
                                <el-select v-model="patternStatType" size="small" style="width: 150px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                    <el-option label="涨后跌回踩" value="up_down"></el-option>
                                    <el-option label="跌后涨反弹" value="down_up"></el-option>
                                </el-select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 13px; color: var(--text-secondary); font-weight: bold;">对比字段：</span>
                                <el-select v-model="patternStatField" size="small" style="width: 140px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                    <el-option label="最低价" value="low"></el-option>
                                    <el-option label="收盘价" value="close"></el-option>
                                    <el-option label="开盘价" value="open"></el-option>
                                    <el-option label="最高价" value="high"></el-option>
                                </el-select>
                            </div>
                            <span class="chart-hint-text" style="margin-left: 0;">
                                <i class="el-icon-info"></i> 统计特定交易日（{{ patternStatTypeLabel }}），当日【{{ patternStatFieldLabel }}】与前一日的差值占比分布。
                            </span>
                        </div>
                        
                        <div v-if="patternStatData.total > 0" class="pattern-stat-result">
                            <div class="stat-summary-boxes" style="display: flex; gap: 20px; margin-bottom: 15px;">
                                <div class="stat-box" style="flex: 1; padding: 15px; background: var(--bg-hover); border-radius: 6px; text-align: center; border: 1px solid var(--border-color);">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">符合形态总天数</div>
                                    <div style="font-size: 24px; font-weight: bold; font-family: Consolas;">{{ patternStatData.total }} 天</div>
                                </div>
                                <div class="stat-box" style="flex: 1; padding: 15px; background: rgba(245, 108, 108, 0.05); border-radius: 6px; text-align: center; border: 1px solid rgba(245, 108, 108, 0.2);">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">差值 > 0 (高于前日)</div>
                                    <div style="font-size: 24px; font-weight: bold; color: var(--color-up); font-family: Consolas;">{{ patternStatData.upCount }} 天</div>
                                    <div style="font-size: 12px; color: var(--color-up); margin-top: 5px; font-weight: bold;">占比: {{ patternStatData.upRatio }}%</div>
                                </div>
                                <div class="stat-box" style="flex: 1; padding: 15px; background: rgba(0, 191, 165, 0.05); border-radius: 6px; text-align: center; border: 1px solid rgba(0, 191, 165, 0.2);">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 5px;">差值 ≤ 0 (低于或等于前日)</div>
                                    <div style="font-size: 24px; font-weight: bold; color: var(--color-down); font-family: Consolas;">{{ patternStatData.downCount }} 天</div>
                                    <div style="font-size: 12px; color: var(--color-down); margin-top: 5px; font-weight: bold;">占比: {{ patternStatData.downRatio }}%</div>
                                </div>
                            </div>
                            
                            <div class="progress-bar-container" style="height: 24px; border-radius: 12px; overflow: hidden; display: flex; background-color: var(--bg-progress);">
                                <div class="bar-segment up-segment" :style="{ width: patternStatData.upRatio + '%', backgroundColor: 'var(--color-up)', transition: 'width 0.5s' }">
                                    <span v-if="parseFloat(patternStatData.upRatio) > 5">{{ patternStatData.upRatio }}%</span>
                                </div>
                                <div class="bar-segment down-segment" :style="{ width: patternStatData.downRatio + '%', backgroundColor: 'var(--color-down)', transition: 'width 0.5s' }">
                                    <span v-if="parseFloat(patternStatData.downRatio) > 5">{{ patternStatData.downRatio }}%</span>
                                </div>
                            </div>
                        </div>
                        <div v-else style="text-align: center; padding: 30px; color: var(--text-secondary);">
                            当前数据区间内没有找到符合 "{{ patternStatTypeLabel }}" 形态的数据。
                        </div>
                    </div>
                </transition>
            </div>

            <!-- 详细历史数据表格 -->
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

                <el-table-column prop="close" label="收盘" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.close }}</span>
                            <span v-if="scope.row.close_diff !== null" class="cell-diff" :class="getPriceClass(scope.row.close_diff)">
                                {{ formatDiff(scope.row.close_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="open" label="开盘" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.open }}</span>
                            <span v-if="scope.row.open_diff !== null" class="cell-diff" :class="getPriceClass(scope.row.open_diff)">
                                {{ formatDiff(scope.row.open_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="high" label="最高" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.high }}</span>
                            <span v-if="scope.row.high_diff !== null" class="cell-diff" :class="getPriceClass(scope.row.high_diff)">
                                {{ formatDiff(scope.row.high_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="low" label="最低" min-width="110" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ scope.row.low }}</span>
                            <span v-if="scope.row.low_diff !== null" class="cell-diff" :class="getPriceClass(scope.row.low_diff)">
                                {{ formatDiff(scope.row.low_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="volume" label="成交额(亿)" min-width="120" sortable="custom">
                    <template slot-scope="scope">
                        <div class="diff-cell">
                            <span class="cell-value">{{ formatVolumeInYi(scope.row.volume) }}</span>
                            <span v-if="scope.row.volume_diff !== null" class="cell-diff" :class="getPriceClass(scope.row.volume_diff)">
                                {{ formatVolumeDiffInYi(scope.row.volume_diff) }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="day" label="日期" min-width="110" sortable="custom"></el-table-column>
            </el-table>
        </el-dialog>

        <!-- ================== 个股走势图弹窗 (全新升级多字段切换) ================== -->
        <el-dialog v-dialogDrag :center="true" :title="`${currentStockName} (${currentStockCode}) - 近${historyDays}天走势分析`"
            :visible.sync="chartDialogVisible" width="60%" :close-on-click-modal="false" @opened="onChartDialogOpened"
            @closed="onChartDialogClosed">
            
            <!-- 新增下拉控制区 -->
            <div class="custom-chart-controls" style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; background: var(--bg-hover); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 13px; color: var(--text-secondary); font-weight: bold;">查看维度：</span>
                    <el-select v-model="selectedTrendField" size="small" style="width: 150px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''" @change="renderTrendChart(currentStockHistoryData)">
                        <el-option v-for="opt in chartFieldOptions" :key="opt.value" :label="opt.label" :value="opt.value">
                            <i :class="opt.icon" style="margin-right: 5px;"></i> {{ opt.label }}
                        </el-option>
                    </el-select>
                </div>
                <span class="chart-hint-text">
                    <i class="el-icon-mouse"></i> 支持鼠标滚轮缩放图表查看明细
                </span>
            </div>

            <!-- 原始涨跌统计区 (依然保留，直观反映统计情况) -->
            <div class="summary-item up-down-dist" style="margin-bottom: 15px;">
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
                        <span class="icon history-detail" @click="showStock30DaysDetail"><i :class="isRunIcon"></i> 历史极值与测算详情</span>
                    </div>
                </div>
            </div>
            <div v-loading="chartLoading" element-loading-text="数据加载中" element-loading-spinner="el-icon-loading">
                <div ref="stockTrendChart" style="width: 100%; height: 400px;"></div>
            </div>
        </el-dialog>

        <!-- ================== 行业个股详情弹窗 ================== -->
        <el-dialog v-dialogDrag :title="`${currentIndustry} 行业 - 所有股票`" :visible.sync="dialogVisible" width="70%"
            :close-on-click-modal="false" destroy-on-close :center="true">
            <div class="dialog-header-actions section-search-1"
                style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                <el-input v-model="searchStockQuery" placeholder="输入股票代码或名称搜索" prefix-icon="el-icon-search" clearable style="width: 230px;" size="small"></el-input>
                <el-input v-model="historyDays" placeholder="输入历史数据天数默认30天" prefix-icon="el-icon-search" clearable style="width: 230px;" size="small"></el-input>
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
                        <span>{{ scope.row.turnoverratio }}%</span>
                    </template>
                </el-table-column>
                <el-table-column prop="per" label="per" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span>{{ scope.row.per }}%</span>
                    </template>
                </el-table-column>
                <el-table-column prop="pb" label="市净率" min-width="100" sortable="custom">
                    <template slot-scope="scope">
                        <span>{{ scope.row.pb }}%</span>
                    </template>
                </el-table-column>
                <el-table-column prop="amount" label="成交额(亿)" :formatter="formatAmount" min-width="110" sortable="custom"></el-table-column>
                <el-table-column prop="mktcap" label="总市值(亿)" min-width="110" sortable="custom"></el-table-column>
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
            </el-table>

            <div class="pagination-wrapper" style="margin-top: 15px; justify-content: flex-end;">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper" 
                    :current-page.sync="stockCurrentPage"
                    :page-size.sync="stockPageSize" 
                    :page-sizes="[10, 20, 50, 100]"
                    :total="processedStocks.length" 
                    @size-change="handleStockSizeChange"
                    @current-change="handleStockPageChange">
                </el-pagination>
            </div>
        </el-dialog>

        <!-- ================== 新闻资讯弹窗 ================== -->
        <el-dialog v-dialogDrag :title="`${currentNewsStockName} (${currentNewsStockCode}) - 新闻资讯`" :visible.sync="newsDialogVisible"
            width="80%" top="5vh" :center="true" :close-on-click-modal="false" @close="handleNewsDialogClose">
            <div v-loading="newsLoading" element-loading-text="网页加载中..." element-loading-spinner="el-icon-loading"
                style="height: 75vh; width: 100%;">
                <iframe v-if="newsDialogVisible" :src="currentNewsUrl" frameborder="0" width="100%" height="100%" @load="handleIframeLoad">
                </iframe>
            </div>
        </el-dialog>

        <!-- ================== 条件查询结果弹窗 ================== -->
        <el-dialog v-dialogDrag :title="`${industryName}行业可选股票 (${trend === 1 ? '连续上涨' : '连续下跌'})`" :visible.sync="customSearchDialogVisible" width="60%"
            :close-on-click-modal="false" :center="true">
            <div class="dialog-header-actions"
                style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <el-input v-model="customSearchQuery" placeholder="输入股票代码或日期搜索" prefix-icon="el-icon-search" clearable style="width: 300px;" size="small"></el-input>
                <span style="color: #909399; font-size: 13px;">共找到 {{ processedCustomSearchData.length }} 条记录</span>
            </div>
            <el-table :data="paginatedCustomSearchData" stripe style="width: 100%" max-height="450">
                <el-table-column prop="code" label="代码 (code)" min-width="120">
                    <template slot-scope="scope">
                        <span class="stock-code-link" @click="handleOpenChart({ code: scope.row.code, name: scope.row.name })">
                            {{ scope.row.code }} <i class="el-icon-data-line"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="名称 (name)" min-width="250"></el-table-column>
                <el-table-column prop="date" label="日期 (date)" min-width="250"></el-table-column>
            </el-table>
            <div class="pagination-wrapper" style="margin-top: 15px; justify-content: flex-end;">
                <el-pagination background layout="total, sizes, prev, pager, next, jumper" 
                    :current-page.sync="customSearchCurrentPage"
                    :page-size.sync="customSearchPageSize" 
                    :page-sizes="[15, 30, 50, 100]"
                    :total="processedCustomSearchData.length"
                    @size-change="handleCustomSearchSizeChange"
                    @current-change="handleCustomSearchPageChange">
                </el-pagination>
            </div>
        </el-dialog>

    </div>
</template>

<script>
import * as echarts from 'echarts';
import { marked } from 'marked';
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
    get_sh_index, 
    get_capital_inflow, 
    get_stock_rt_data, 
    get_self_selected_stocks, 
    add_self_selected_stock, 
    del_self_selected_stock_v2, 
    get_stock_history_data, 
    set_stock_alerts, 
    get_stock_alerts,
} from '../../api';
import { Message, MessageBox } from 'element-ui';

export default {
    name: "MarketOverview",
    directives: {
        dialogDrag: {
            bind(el) {
                const dialogHeaderEl = el.querySelector('.el-dialog__header');
                const dragDom = el.querySelector('.el-dialog');
                if (!dialogHeaderEl || !dragDom) return;
                
                dialogHeaderEl.style.cursor = 'move';

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
            summaryLoading: false,
            indexLoading: false,

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
                }, {
                    text: '最近半年',
                    onClick(picker) {
                        const end = new Date();
                        const start = new Date();
                        start.setTime(start.getTime() - 3600 * 1000 * 24 * 180);
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

            trend: 2, 
            lookBackDays: '',
            days: '',
            industryName: '',
            customSearchDialogVisible: false,
            customSearchData: [],
            customSearchQuery: '',
            customSearchCurrentPage: 1,
            customSearchPageSize: 15,

            stock30DaysDetailVisible: false,
            stockInfoData: {},
            chartDialogVisible: false,
            chartLoading: false,
            
            industryChartLoading: false,
            inflowChartLoading: false,

            showAlgoParams: false,
            showAIAnalysis: false, 
            showExtremesTable: false, 
            
            // ================== 新增涨跌交替多组合形态统计相关变量 ==================
            showPatternStat: true,
            patternStatType: 'up_down', // 默认选中"涨后跌"组合
            patternStatField: 'low',

            showCustomChartPanel: false,
            selectedChartField: 'close',
            selectedTrendField: 'pct_chg', // 新增：个股走势图弹窗默认指标
            customChartInstance: null,
            chartFieldOptions: [
                { label: '收盘价', value: 'close', icon: 'el-icon-s-data' },
                { label: '开盘价', value: 'open', icon: 'el-icon-time' },
                { label: '最高价', value: 'high', icon: 'el-icon-top' },
                { label: '最低价', value: 'low', icon: 'el-icon-bottom' },
                { label: '成交额(亿)', value: 'volume', icon: 'el-icon-coin' },
                { label: '涨跌幅(%)', value: 'pct_chg', icon: 'el-icon-data-line' }
            ],
            
            aiConfig: {
                mode: 'api',
                preset: 'gemini',
                apiKey: '',
                apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
                model: 'gemini-3.5-flash'
            },
            aiStatus: 'idle', 
            aiStreamedText: '等待指令输入...',

            algoParams: {
                strategyMode: 'auto',
                aggrTraceWeight: 0.5,
                steadySupportWeight: 0.55,
                breakoutPremium: 1.000,
                panicDiscount: 0.95
            },

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
            inflowChartInstance: null,

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
            rawIndustryData: [],
            
            indexData: {
                "name": "上证指数", "open": 4061.4629, "prev_close": 4057.74, "close": 4054.6956,
                "high": 4064.7075, "low": 4032.5826, "change_amount": -3.04, "change_percent": -0.07,
                "volume": 416713587, "amount": 812383270625.0, "date": "2026-06-02", "time": "11:25:56"
            },
            inflowData: [],

            followedStocks: [],
            searchFollowedQuery: '',
            followedLoading: false,
            followedDialogVisible: false,
            // ================== 新增自选股分页变量 ==================
            followedCurrentPage: 1,
            followedPageSize: 8,
            
            // ================== 新增配置监控条件单变量 ==================
            monitorConfigs: [], // 新增数组：存储所有获取到的股票监控配置
            monitorDialogVisible: false,
            monitorSaving: false,
            monitorForm: {
                code: '',
                name: '',
                currentPrice: 0,
                currentPct: 0,
                targetPriceUp: '',
                targetPriceDown: '',
                targetPctUp: '',
                targetPctDown: ''
            },

            // ======== 日志相关状态 ========
            logDialogVisible: false,
            operationLogs: [],
            searchLogQuery: '',
            searchLogDate: null,
            logCurrentPage: 1,
            logPageSize: 15
        };
    },
    computed: {
        isCurrentStockFollowed() {
            if (!this.currentStockCode) return false;
            return this.followedStocks.some(item => item.code === this.currentStockCode);
        },
        targetPriceChangePct() {
            const current = parseFloat(this.monitorForm.currentPrice);
            const target = parseFloat(this.monitorForm.targetPriceUp);
            if (isNaN(current) || isNaN(target) || current === 0 || !target) {
                return null;
            }
            return ((target - current) / current) * 100;
        },
        formattedTerminalContent() {
            let textToParse = this.aiStreamedText || '';
            if (this.aiStatus === 'typing') {
                textToParse += '█';
            }
            let html = '';
            try {
                html = marked.parse(textToParse);
            } catch (e) {
                html = textToParse;
            }
            return html.replace(/█/g, '<span class="cursor-blink">█</span>');
        },
        
        // ================== 涨跌交替形态组合统计所需计算属性 ==================
        patternStatFieldLabel() {
            const map = { 'low': '最低价', 'close': '收盘价', 'open': '开盘价', 'high': '最高价' };
            return map[this.patternStatField] || '最低价';
        },
        patternStatTypeLabel() {
            return this.patternStatType === 'up_down' ? '前一日上涨，当日下跌' : '前一日下跌，当日上涨';
        },
        patternStatData() {
            const data = this.currentStockHistoryData;
            // 因为至少需要2天来对比
            if (!data || data.length < 2) return { total: 0, upCount: 0, downCount: 0, upRatio: '0.00', downRatio: '0.00' };
            
            let total = 0;
            let upCount = 0;
            let downCount = 0;
            
            const field = this.patternStatField;
            const type = this.patternStatType;

            // 因为 data 已经按照日期升序排序 (从早到晚)，所以 data[i-1] 是前一日，data[i] 是当日
            for (let i = 1; i < data.length; i++) {
                const prev = data[i - 1];
                const current = data[i];
                
                const prevPct = Number(prev.pct_chg);
                const currPct = Number(current.pct_chg);
                
                let isMatch = false;
                // 1. 涨后跌回踩：前一天涨，今天跌
                if (type === 'up_down' && prevPct > 0 && currPct < 0) {
                    isMatch = true;
                }
                // 2. 跌后涨反弹：前一天跌，今天涨
                if (type === 'down_up' && prevPct < 0 && currPct > 0) {
                    isMatch = true;
                }

                if (isMatch) {
                    total++;
                    const diff = Number(current[field]) - Number(prev[field]);
                    // 如果今日的特定价差 > 0 代表比昨日还要高
                    if (diff > 0) {
                        upCount++;
                    } else {
                        downCount++;
                    }
                }
            }
            
            let upRatio = '0.00';
            let downRatio = '0.00';
            if (total > 0) {
                upRatio = ((upCount / total) * 100).toFixed(2);
                downRatio = ((downCount / total) * 100).toFixed(2);
            }
            
            return { total, upCount, downCount, upRatio, downRatio };
        },

        extremesTableData() {
            const data = this.currentStockHistoryData;
            if (!data || data.length === 0) return [];

            const len = data.length;
            
            // 1. 安全解构算法参数，提供默认值防止因参数缺失导致 NaN
            const p = this.algoParams || {}; 
            const _mode = p.strategyMode;
            const _aggr = p.aggrTraceWeight ?? 0;
            const _steady = p.steadySupportWeight ?? 0;
            const _premium = p.breakoutPremium ?? 1;
            const _discount = p.panicDiscount ?? 1;

            const metrics = [
                { key: 'pct_chg', label: '涨跌幅' }, 
                { key: 'close', label: '收盘价' },
                { key: 'open', label: '开盘价' }, 
                { key: 'high', label: '最高价' },
                { key: 'low', label: '最低价' }, 
                { key: 'volume', label: '成交额' }
            ];

            // 初始化极值收集器
            const extremes = {};
            for (const m of metrics) {
                extremes[m.key] = { maxVal: -Infinity, maxDay: '-', minVal: Infinity, minDay: '-' };
            }

            // 初始化统计变量
            let totalVolume = 0; 
            let totalTurnover = 0; 
            let periodHigh = -Infinity; 
            let periodLow = Infinity; 
            let validDays = 0;

            // ==========================================
            // 【核心优化】合并为一个 O(N) 循环，只遍历一次数组
            // ==========================================
            for (let i = 0; i < len; i++) {
                const item = data[i];
                const day = item.day || '-';

                // 1. 统计各项指标的极值
                for (let j = 0; j < metrics.length; j++) {
                    const key = metrics[j].key;
                    const rawVal = item[key];
                    if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
                        const val = Number(rawVal);
                        if (!isNaN(val)) {
                            const ext = extremes[key];
                            // 使用 >= 和 <= 可以保留原代码“遇到相同极值时采用最新日期”的逻辑
                            if (val >= ext.maxVal) {
                                ext.maxVal = val;
                                ext.maxDay = day;
                            }
                            if (val <= ext.minVal) {
                                ext.minVal = val;
                                ext.minDay = day;
                            }
                        }
                    }
                }

                // 2. 累计 VWAP 与周期高低点
                const closePrice = Number(item.close);
                const highPrice = Number(item.high);
                const lowPrice = Number(item.low);
                const vol = Number(item.volume);

                if (!isNaN(closePrice) && !isNaN(lowPrice) && !isNaN(highPrice)) {
                    const tp = (highPrice + lowPrice + closePrice) / 3;
                    if (!isNaN(vol) && vol > 0) { 
                        totalVolume += vol; 
                        totalTurnover += tp * vol; 
                    }
                    if (highPrice > periodHigh) periodHigh = highPrice;
                    if (lowPrice < periodLow) periodLow = lowPrice;
                    validDays++;
                }
            }

            // 格式化极值输出结果
            const result = metrics.map(m => {
                const ext = extremes[m.key];
                return { 
                    label: m.label, 
                    key: m.key, 
                    maxVal: ext.maxVal === -Infinity ? 0 : ext.maxVal, 
                    maxDay: ext.maxDay, 
                    minVal: ext.minVal === Infinity ? 0 : ext.minVal, 
                    minDay: ext.minDay 
                };
            });

            // ==========================================
            // 3. 计算推荐买入价
            // ==========================================
            const latestItem = data[len - 1];
            const C = Number(latestItem.close);
            const L = Number(latestItem.low);
            const H = Number(latestItem.high);
            const latestVol = Number(latestItem.volume);
            const latestPctChg = Number(latestItem.pct_chg);

            const avgVol = validDays > 0 ? (totalVolume / validDays) : 1;
            const vwap = totalVolume > 0 ? (totalTurnover / totalVolume) : C;
            
            // 避免修改原始累加变量，提高可读性
            const finalPeriodLow = periodLow === Infinity ? L : periodLow;
            const finalPeriodHigh = periodHigh === -Infinity ? H : periodHigh;

            const volRatio = latestVol / avgVol;
            const range = finalPeriodHigh - finalPeriodLow;
            const positionRatio = range > 0 ? (C - finalPeriodLow) / range : 0.5; 

            let currentMode = _mode;
            let envDesc = "";
            if (currentMode === 'auto') {
                if (positionRatio > 0.65 && volRatio > 1.2 && latestPctChg > 1) { 
                    currentMode = 'trend'; 
                    envDesc = "量价齐升(自适应:顺势右侧)"; 
                } else if (positionRatio < 0.35 && volRatio > 1.2 && latestPctChg < -1) { 
                    currentMode = 'contrarian'; 
                    envDesc = "恐慌杀跌(自适应:逆向左侧)"; 
                } else if (volRatio < 0.6 && positionRatio < 0.4) { 
                    currentMode = 'contrarian'; 
                    envDesc = "极致地量(自适应:左侧潜伏)"; 
                } else { 
                    currentMode = 'box'; 
                    envDesc = "常态博弈(自适应:均值回归)"; 
                }
            } else {
                envDesc = currentMode === 'trend' ? '强制:顺势右侧' : (currentMode === 'contrarian' ? '强制:逆向左侧' : '强制:箱体震荡');
            }

            const dayMid = (H + L + C) / 3; 
            let aggressiveBuy = 0;
            let aggrDesc = "";

            if (currentMode === 'trend') {
                const base = C * _aggr + dayMid * (1 - _aggr);
                aggressiveBuy = base * _premium;
                aggrDesc = `【顺势高举高打】 溢价抢筹 (${envDesc})`;
            } else if (currentMode === 'contrarian') {
                const base = L * _aggr + dayMid * (1 - _aggr);
                aggressiveBuy = base * _discount;
                aggrDesc = `【逆势深度埋伏】 偏离现价打折接刀 (${envDesc})`;
            } else {
                const base = ((C + L) / 2) * _aggr + dayMid * (1 - _aggr);
                const mixedDiscount = (_premium + _discount) / 2;
                aggressiveBuy = base * mixedDiscount;
                aggrDesc = `【箱体常态低吸】 均价与下沿加权挂单 (${envDesc})`;
            }

            let steadyBuy = 0;
            let steadyDesc = "";
            const structuralSupport = (finalPeriodLow * _steady) + (vwap * (1 - _steady));

            if (currentMode === 'trend') {
                steadyBuy = vwap * (1 - _steady) + structuralSupport * _steady; 
                steadyDesc = `【顺势波段防守】 依托大众持仓与底层防守支撑 (${envDesc})`;
            } else if (currentMode === 'contrarian') {
                steadyBuy = structuralSupport * _discount;
                steadyDesc = `【结构大底极限防守】 极限打折接盘 (${envDesc})`;
            } else {
                steadyBuy = structuralSupport;
                steadyDesc = `【箱体下沿综合防守】 综合大底支撑权重:${(_steady * 100).toFixed(0)}% (${envDesc})`;
            }

            if (aggressiveBuy > C * 1.09) aggressiveBuy = C * 1.09;
            if (steadyBuy >= aggressiveBuy) steadyBuy = aggressiveBuy * 0.98;

            result.push({ 
                label: '推荐买入价', 
                key: 'buy_price', 
                maxVal: aggressiveBuy, 
                maxDay: aggrDesc, 
                minVal: steadyBuy, 
                minDay: steadyDesc 
            });

            return result;
        },
        queriedIndustrySet() {
            const set = new Set();
            this.filterStocksHistory.forEach(item => {
                if (typeof item === 'string') set.add(item);
                else if (item && item.industry) set.add(item.industry);
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
            const validTotal = this.marketSummary.up + Number(this.marketSummary.down);
            if (!validTotal) return 50;
            return (this.marketSummary.up / validTotal) * 100;
        },
        downPercent() {
            const validTotal = this.marketSummary.up + Number(this.marketSummary.down);
            if (!validTotal) return 50;
            return (Number(this.marketSummary.down) / validTotal) * 100;
        },
        stockUpPercent() {
            const validTotal = this.stockSummary.up + Number(this.stockSummary.down);
            if (!validTotal) return 50;
            return (this.stockSummary.up / validTotal) * 100;
        },
        stockDownPercent() {
            const validTotal = this.stockSummary.up + Number(this.stockSummary.down);
            if (!validTotal) return 50;
            return (Number(this.stockSummary.down) / validTotal) * 100;
        },
        formattedIndustries() {
            let data = this.rawIndustryData.map(item => ({
                ...item, amountBtn: (item.amount / 100000000).toFixed(2),
            }));

            if (this.stockIndustryFromCode) {
                const q = this.stockIndustryFromCode.toLowerCase();
                data = data.filter(item => item.name && item.name.toLowerCase().includes(q));
            } else if (this.queryIndustryData) {
                const q = this.queryIndustryData.toLowerCase();
                data = data.filter(item => item.name && item.name.toLowerCase().includes(q));
            }

            return data.sort((a, b) => {
                let valA = a[this.sortKey]; let valB = b[this.sortKey];
                return this.sortOrder === 'asc' ? valA - valB : valB - valA;
            });
        },
        paginatedIndustries() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.formattedIndustries.slice(start, end);
        },
        sortedStockHistoryData() {
            if (!this.currentStockHistoryData || this.currentStockHistoryData.length === 0) return [];
            let sorted = [...this.currentStockHistoryData];
            if (this.stockSortProp) {
                sorted.sort((a, b) => {
                    let valA = a[this.stockSortProp], valB = b[this.stockSortProp];
                    if (['code', 'day'].includes(this.stockSortProp)) {
                        if (valA < valB) return this.stockSortOrder === 'ascending' ? -1 : 1;
                        if (valA > valB) return this.stockSortOrder === 'ascending' ? 1 : -1;
                        return 0;
                    }
                    valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0;
                    return this.stockSortOrder === 'ascending' ? valA - valB : valB - valA;
                });
            }
            return sorted;
        },
        processedFollowedStocks() {
            let filtered = this.followedStocks || [];
            if (this.searchFollowedQuery) {
                const query = this.searchFollowedQuery.toLowerCase();
                filtered = filtered.filter(item =>
                    (item.name && item.name.toLowerCase().includes(query)) ||
                    (item.code && item.code.toLowerCase().includes(query))
                );
            }
            return filtered;
        },
        // ================== 新增：返回分页后的自选股列表 ==================
        paginatedFollowedStocks() {
            const start = (this.followedCurrentPage - 1) * this.followedPageSize;
            const end = start + this.followedPageSize;
            return this.processedFollowedStocks.slice(start, end);
        },
        availableModels() {
            if (this.aiConfig.preset === 'gemini') {
                return ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3.5-flash'];
            } else if (this.aiConfig.preset === 'deepseek') {
                return ['deepseek-chat'];
            }
            return [];
        },
        filteredLogs() {
            let logs = this.operationLogs;
            if (this.searchLogQuery) {
                const query = this.searchLogQuery.toLowerCase();
                logs = logs.filter(log => 
                    (log.action && log.action.toLowerCase().includes(query)) ||
                    (log.params && log.params.toLowerCase().includes(query))
                );
            }
            if (this.searchLogDate) {
                const dateStr = this.formatDate(this.searchLogDate);
                logs = logs.filter(log => log.time.startsWith(dateStr));
            }
            return logs;
        },
        paginatedLogs() {
            const start = (this.logCurrentPage - 1) * this.logPageSize;
            const end = start + this.logPageSize;
            return this.filteredLogs.slice(start, end);
        }
    },
    watch: {
        customSearchQuery() { this.customSearchCurrentPage = 1; },
        searchStockQuery() { this.stockCurrentPage = 1; },
        searchLogQuery() { this.logCurrentPage = 1; },
        searchLogDate() { this.logCurrentPage = 1; },
        // 当自选列表搜索条件变化时，自动回到第一页
        searchFollowedQuery() { this.followedCurrentPage = 1; },
        aiConfig: {
            deep: true,
            handler(newVal) {
                let list = this.getAiConfigList();
                const index = list.findIndex(item => item.preset === newVal.preset);
                if (index !== -1) {
                    list[index] = Object.assign({}, list[index], newVal);
                } else {
                    list.push(Object.assign({}, newVal));
                }
                localStorage.setItem('stock_ai_config', JSON.stringify(list));
            }
        },
        aiStreamedText() {
            this.$nextTick(() => {
                const el = this.$el.querySelector('.terminal-content');
                if (el) { el.scrollTop = el.scrollHeight; }
            });
        },
        isDarkMode() {
            this.$nextTick(() => {
                this.initChart(); this.initInflowChart();
                if (this.chartDialogVisible && this.currentStockHistoryData && this.currentStockHistoryData.length > 0) {
                    this.renderTrendChart(this.currentStockHistoryData);
                }
                if (this.showCustomChartPanel && this.customChartInstance) {
                    this.renderCustomChart();
                }
            });
        },
        queryIndustryData(val) {
            this.currentPage = 1;
            this.handleQueryIndustryInput(val);
        },
        selectedChartField() {
            if (this.showCustomChartPanel) {
                this.renderCustomChart();
            }
        }
    },

    beforeDestroy() {
        if (this.industryQueryTimer) { clearTimeout(this.industryQueryTimer); this.industryQueryTimer = null; }
        if (this.newsLoadingTimer) { clearTimeout(this.newsLoadingTimer); this.newsLoadingTimer = null; }
        if (this._aiAbortController) { this._aiAbortController.abort(); }
        window.removeEventListener('resize', this.resizeChart);
        if (this.chartInstance) this.chartInstance.dispose();
        if (this.inflowChartInstance) this.inflowChartInstance.dispose();
        if (this.customChartInstance) this.customChartInstance.dispose();
        this.$root.$off('theme-change');
    },

    mounted() {
        this.loadLogs();
        this.initAiConfig();
        this.getStockMarketData();
        this.getIndustryUpDown();
        this.stockDataStatus();
        window.addEventListener('resize', this.resizeChart);
        this.initTheme();
        this.initInflowChart();
        this.get_good_stocks_history();
        this.initFollowedStocks();
        
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    },

    methods: {
        // ======= 获取并清洗本地 AI 缓存配置列表 ========
        getAiConfigList() {
            const saved = localStorage.getItem('stock_ai_config');
            let list = [];
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        list = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        // 如果之前数据结构被污染成 { "0": {...}, "mode": "api"... }，这里会将其洗白成标准数组
                        for (let key in parsed) {
                            if (!isNaN(Number(key)) && typeof parsed[key] === 'object') {
                                list.push(parsed[key]);
                            }
                        }
                        // 兼容最老版本的单一对象配置
                        if (list.length === 0 && parsed.preset) {
                            list.push(parsed);
                        }
                    }
                } catch (e) {
                    console.error('解析本地 AI 缓存失败:', e);
                }
            }
            return list;
        },

        initAiConfig() {
            const list = this.getAiConfigList();
            if (list && list.length > 0) {
                let current = list.find(item => item.preset === this.aiConfig.preset);
                if (!current) {
                    current = list[0];
                }
                this.aiConfig = Object.assign({}, this.aiConfig, current);
            }
        },

        handleAiPresetChange(val) {
            const list = this.getAiConfigList();
            const found = list.find(item => item.preset === val);
            
            if (found) {
                this.aiConfig = Object.assign({}, this.aiConfig, found);
            } else {
                if (val === 'deepseek') {
                    this.aiConfig.apiUrl = 'https://api.deepseek.com/chat/completions';
                    this.aiConfig.model = 'deepseek-chat';
                    this.aiConfig.apiKey = '';
                } else if (val === 'gemini') {
                    this.aiConfig.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
                    this.aiConfig.model = 'gemini-3.5-flash';
                    this.aiConfig.apiKey = '';
                }
            }
        },

        // ======= 获取所有监控配置 =======
        async getMonitorConfigs() {
            try {
                const resp = await get_stock_alerts();
                if (resp && resp.data && resp.data.code === 1000) {
                    this.monitorConfigs = resp.data.data || [];
                } else {
                    this.monitorConfigs = [];
                }
            } catch (error) {
                console.error("获取监控配置失败:", error);
                this.monitorConfigs = [];
            }
        },

        // 提取单个股票对应的配置信息
        getMonitorForStock(code) {
            return this.monitorConfigs.find(config => config.code === code) || null;
        },

        // 新增：计算监控的目标下跌值距离最新收盘价的差值百分比
        getMonitorDropPercent(row) {
            const config = this.getMonitorForStock(row.code);
            if (!config || !config.price || !row.close) return null;
            const target = parseFloat(config.price);
            const latest = parseFloat(row.close);
            if (isNaN(target) || isNaN(latest) || latest === 0) return null;
            // 距离现价变化百分比计算
            return ((target - latest) / latest) * 100;
        },

        // 新增：根据差值正负返回不同的涨跌色样式类
        getDropPercentClass(val) {
            if (val === null || isNaN(val)) return '';
            return val < 0 ? 'text-down' : 'text-up';
        },

        // ======= 获取关注的股票列表 ========
        async getSelfSelectedStocks() {
            this.followedLoading = true;
            try {
                const resp = await get_self_selected_stocks();
                if (resp && resp.data && resp.data.code === 1000) {
                    // 兼容后端返回结构是 resp.data (纯数组) 还是 resp.data.data (标准包装对象) 的情况
                    const list = Array.isArray(resp.data.data) ? resp.data.data : (Array.isArray(resp.data) ? resp.data : []);
                    this.followedStocks = list.map(item => ({
                        code: item.code,
                        name: item.name,
                        industry: item.industry,
                        pct_chg: 0, close: 0, open: 0, high: 0, low: 0, volume: 0
                    }));
                    // 获取完自选列表基础信息后，立即自动获取它们的实时行情以填充表格
                    await this.refreshFollowedRealTime(false);
                } else {
                    this.followedStocks = [];
                }   
            } catch (error) {
                console.error("获取自选股失败:", error);
                this.followedStocks = [];
            } finally {
                this.followedLoading = false;
            }
        },

        // ======= 自选股分页事件处理 =======
        handleFollowedPageChange(val) {
            this.followedCurrentPage = val;
        },
        handleFollowedSizeChange(val) {
            this.followedPageSize = val;
            this.followedCurrentPage = 1;
        },

        // ======= 打开监控配置表单弹窗 =======
        openMonitorConfig(row) {
            const existingConfig = this.getMonitorForStock(row.code);
            this.monitorForm = {
                code: row.code,
                name: row.name,
                currentPrice: row.close || 0,
                currentPct: row.pct_chg || 0,
                // 如果已经有配置，带入进行回显
                targetPriceUp: existingConfig && existingConfig.price ? existingConfig.price : '',
                targetPctUp: existingConfig && existingConfig.pct !== undefined && existingConfig.pct !== null ? existingConfig.pct : '',
                targetPriceDown: '',
                targetPctDown: ''
            };
            this.monitorDialogVisible = true;
        },

        // ======= 提交保存监控配置 =======
        async saveMonitorConfig() {
            this.monitorSaving = true;
            this.recordLog('配置个股条件单监控', { code: this.monitorForm.code, form: this.monitorForm });
            
            // 校验：不能两项都未填写
            if (!this.monitorForm.targetPriceUp && this.monitorForm.targetPctUp === '') {
                Message.error({ message: '请至少填写一个价格下跌的目标价或目标跌幅', center: true });
                this.monitorSaving = false;
                return;
            }

            try {
                const resp = await set_stock_alerts({
                    code: this.monitorForm.code, 
                    price: this.monitorForm.targetPriceUp ? parseFloat(this.monitorForm.targetPriceUp) : 0, 
                    pct: this.monitorForm.targetPctUp !== '' ? parseFloat(this.monitorForm.targetPctUp) : 0,
                    status: parseInt(1), 
                }); 

                if (resp && resp.data && resp.data.code === 1000) {
                    Message.success(resp.data.msg || '监控配置保存成功');
                    // 保存成功后立刻刷新配置数据，更新列表中展现的标签
                    await this.getMonitorConfigs();
                } else {
                    Message.error(resp.data ? (resp.data.msg || resp.data.message) : '保存失败');
                }

                this.monitorDialogVisible = false;
            } catch (error) {
                Message.error({ message: '配置保存失败，请稍后重试', center: true });
            } finally {
                this.monitorSaving = false;
            }
        },


        // ======= 添加关注的股票列表 ========
        async addSelfSelectedStock(stockCode) {
            this.followedLoading = true;
            try {
                const resp = await add_self_selected_stock({ code: stockCode });
                if (resp && resp.data && resp.data.code === 1000) {
                    Message.success({ message: '已添加到自选', center: true });
                    // 添加成功后，重新获取最新的自选股列表
                    await this.getSelfSelectedStocks();
                } else {
                    Message.error({ message: resp.data ? (resp.data.message || resp.data.msg) : '添加失败', center: true });
                }
            } finally {
                this.followedLoading = false;
            }
        },

        // ======= 删除关注的股票列表 ========
        async delSelfSelectedStock(stockCode) {
            this.followedLoading = true;
            try {
                const resp = await del_self_selected_stock_v2({ code: stockCode });
                if (resp && resp.data && resp.data.code === 1000) {
                    Message.success({ message: '已从自选中移除', center: true });
                    // 删除成功后，重新获取最新的自选股列表
                    await this.getSelfSelectedStocks();
                } else {
                    Message.error({ message: resp.data ? (resp.data.message || resp.data.msg) : '删除失败', center: true });
                }
            } finally {
                this.followedLoading = false;
            }
        },

        // ======== 日志相关方法 ========
        loadLogs() {
            const logs = localStorage.getItem('app_operation_logs');
            if (logs) {
                try {
                    this.operationLogs = JSON.parse(logs);
                } catch(e) {
                    this.operationLogs = [];
                }
            }
        },
        recordLog(action, paramsObj) {
            const now = new Date();
            const log = {
                id: now.getTime() + Math.random().toString(36).substr(2, 5),
                timestamp: now.getTime(),
                time: now.toLocaleString('zh-CN', { hour12: false }),
                action: action,
                params: paramsObj ? JSON.stringify(paramsObj, null, 2) : ''
            };
            this.operationLogs.unshift(log); 
            
            if (this.operationLogs.length > 1000) {
                this.operationLogs = this.operationLogs.slice(0, 1000);
            }
            
            localStorage.setItem('app_operation_logs', JSON.stringify(this.operationLogs));
        },
        clearLogs() {
            MessageBox.confirm('确定要清空所有操作日志吗?', '提示', { type: 'warning' }).then(() => {
                this.operationLogs = [];
                localStorage.removeItem('app_operation_logs');
                Message.success({ message: '已清空日志', center: true });
            }).catch(() => {});
        },
        handleLogPageChange(val) {
            this.logCurrentPage = val;
        },
        handleLogSizeChange(val) {
            this.logPageSize = val;
            this.logCurrentPage = 1;
        },

        toggleCustomChartPanel() {
            this.showCustomChartPanel = !this.showCustomChartPanel;
            if (this.showCustomChartPanel) {
                this.$nextTick(() => {
                    this.renderCustomChart();
                });
            }
        },

        renderCustomChart() {
            if (!this.$refs.customFieldChart) return;
            
            let data = this.currentStockHistoryData ? [...this.currentStockHistoryData] : [];
            if (!data || data.length === 0) {
                if (this.customChartInstance) { this.customChartInstance.clear(); }
                return;
            }
            data.sort((a, b) => this.safeGetTime(a.day) - this.safeGetTime(b.day));

            if (this.customChartInstance) { 
                this.customChartInstance.dispose(); 
            }
            this.customChartInstance = echarts.init(this.$refs.customFieldChart);

            const xAxisData = data.map(item => item.day);
            const field = this.selectedChartField;
            
            const fieldOption = this.chartFieldOptions.find(opt => opt.value === field);
            const fieldName = fieldOption ? fieldOption.label : '数值';

            let yAxisData = [];
            data.forEach(item => {
                let val = item[field];
                if (field === 'volume' && val !== null && val !== undefined) {
                    val = (Number(val) / 100000000).toFixed(2);
                } else if (val !== null && val !== undefined) {
                    val = Number(val).toFixed(2);
                } else {
                    val = 0;
                }
                yAxisData.push(val);
            });

            const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
            const splitLineColor = this.isDarkMode ? '#333333' : '#eee';
            
            const validY = yAxisData.map(Number).filter(n => !isNaN(n));
            const minVal = Math.min(...validY);
            const maxVal = Math.max(...validY);
            const diff = maxVal - minVal;

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
                    formatter: (params) => {
                        let result = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].name}</div>`;
                        params.forEach((item) => {
                            let marker = item.marker;
                            let valStr = item.data;
                            let unit = '';
                            if (field === 'pct_chg') { unit = '%'; valStr = (item.data > 0 ? '+' : '') + item.data; }
                            if (field === 'volume') { unit = ' 亿'; }
                            result += `${marker}${item.seriesName}: <span style="font-weight:bold;">${valStr}${unit}</span>`;
                        });
                        return result;
                    },
                    backgroundColor: this.isDarkMode ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.95)',
                    textStyle: { color: this.isDarkMode ? '#eee' : '#333' },
                    borderColor: this.isDarkMode ? '#444' : '#e4e7ed',
                    borderWidth: 1,
                    padding: [8, 12]
                },
                grid: { left: '2%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
                dataZoom: [
                    { type: 'inside', start: 0, end: 100 },
                    { type: 'slider', height: 20, bottom: '2%', borderColor: 'transparent', backgroundColor: this.isDarkMode ? '#2c2c2c' : '#f0f2f5', fillerColor: 'rgba(138, 43, 226, 0.2)', handleStyle: { color: '#8A2BE2' } }
                ],
                xAxis: { 
                    type: 'category', 
                    data: xAxisData, 
                    axisLabel: { color: axisColor, fontSize: 11 }, 
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: splitLineColor } }
                },
                yAxis: { 
                    type: 'value', 
                    name: fieldName, 
                    nameTextStyle: { color: axisColor, padding: [0, 0, 0, 10] }, 
                    axisLabel: { color: axisColor }, 
                    splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } },
                    scale: true,
                    min: diff === 0 ? null : (minVal - diff * 0.1).toFixed(2),
                    max: diff === 0 ? null : (maxVal + diff * 0.1).toFixed(2)
                },
                series: [{
                    name: fieldName,
                    type: 'line',
                    data: yAxisData,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    showSymbol: false,
                    itemStyle: { 
                        color: '#8A2BE2' 
                    },
                    lineStyle: {
                        width: 2,
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#4169E1' }, 
                            { offset: 1, color: '#8A2BE2' }  
                        ])
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(138, 43, 226, 0.4)' },
                            { offset: 1, color: 'rgba(65, 105, 225, 0.05)' }
                        ])
                    }
                }]
            };
            this.customChartInstance.setOption(option);
        },

        copyAiContent() {
            if (!this.aiStreamedText) return;
            try {
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = this.formattedTerminalContent;
                const textToCopy = tempDiv.innerText || tempDiv.textContent;
                
                const el = document.createElement('textarea');
                el.value = textToCopy;
                el.setAttribute('readonly', '');
                el.style.position = 'absolute';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                
                Message.success({ message: '研判内容已成功复制到剪贴板', center: true });
            } catch (err) {
                console.error('复制失败', err);
                Message.error({ message: '复制失败，请手动选取复制', center: true });
            }
        },

        clearAiContent() {
            this.aiStatus = 'idle';
            this.aiStreamedText = 'System Ready. 等待用户启动 AI 引擎注入指令...';
            Message.success({ message: '终端已清空', center: true });
        },

        stopAIGeneration() {
            if (this._aiAbortController) {
                this._aiAbortController.abort();
                this._aiAbortController = null;
            }
            if (this.aiStatus === 'loading' || this.aiStatus === 'typing') {
                this.aiStatus = 'finished';
                this.aiStreamedText += `\n\n<span style="color:#e6a23c; font-weight:bold;">[已手动停止生成]</span>`;
            }
        },

        async triggerAIGeneration() {
            if (this.aiStatus === 'loading' || this.aiStatus === 'typing') return;
            
            this.recordLog('触发AI自然语言研判生成', { mode: this.aiConfig.mode, code: this.currentStockCode, model: this.aiConfig.model });

            const data = this.currentStockHistoryData.filter(item => !isNaN(Number(item.close)) && !isNaN(Number(item.pct_chg)));
            if (!data || data.length < 5) {
                Message.warning('数据过少，无法执行有效的 AI 研判');
                return;
            }

            this.aiStatus = 'loading';
            this.aiStreamedText = '';
            
            if (this.aiConfig.mode === 'api') {
                if (!this.aiConfig.apiKey || !this.aiConfig.apiUrl) {
                    Message.warning('检测到 API Key为空,请先在系统设置中配置有效的 API Key');
                    return;
                }
                await this.callCloudLLM(data);
            } else {
                this.runLocalNLP(data);
            }
        },

        async callCloudLLM(data) {
            let fullRawResponse = '';
            try {
                const simplifiedData = data.map(d => `股票名称:${this.currentStockName},股票代码:${d.code},日期:${d.day},开盘:${d.open},收盘:${d.close},最高:${d.high},最低:${d.low},涨跌幅:${d.pct_chg}%,成交额:${d.volume}`).join(' | ');
                
                const prompt = `你是一位【A股历史交易数据审计师、市场行为统计分析专家】。

你的职责是基于用户提供的历史交易数据和公开披露信息，对已经发生的市场行为进行统计分析、异常检测、结构变化分析和价格分布研究。

你必须优先发现异常，而不是先做普通分析。

━━━━━━━━━━━━━━━━━━

【分析原则】

允许：

✓ 历史数据分析

✓ 统计学分析

✓ 价格分布分析

✓ 成交额分析

✓ 市场活跃度分析

✓ 历史结构变化分析

✓ 历史价格观察区分析

✓ 公开信息整理

禁止：

✗ 预测未来走势

✗ 判断未来涨跌概率

✗ 推荐买卖

✗ 提供投资建议

✗ 提供交易策略

✗ 提供目标价格

✗ 提供仓位建议

所有结论必须建立在历史数据基础上。

━━━━━━━━━━━━━━━━━━

【免责声明】

以下内容仅基于历史交易数据 and 公开披露信息进行统计分析与现象描述。

不构成投资建议。

━━━━━━━━━━━━━━━━━━

【输入数据】

最近 ${data.length} 个交易日历史数据：

${simplifiedData}

字段：

日期

开盘价

收盘价

最高价

最低价

涨跌幅

成交额

━━━━━━━━━━━━━━━━━━

# 第一部分：异常交易事件检测（最高优先级）

先执行异常检测。

如果发现异常：

必须优先输出：

# 🚨异常交易事件专项分析

━━━━━━━━━━━━━━━━━━

## 收盘价异常

检查最新交易日：

是否创：

* 20日最低收盘价
* 60日最低收盘价
* 120日最低收盘价
* 20日最高收盘价
* 60日最高收盘价
* 120日最高收盘价

━━━━━━━━━━━━━━━━━━

## 成交额异常

检查：

* 成交额是否超过20日均值30%以上
* 成交额是否低于20日均值30%以上
* 是否连续3日以上放量
* 是否连续3日以上缩量

━━━━━━━━━━━━━━━━━━

## 波动异常

检查：

* 振幅是否超过20日均值30%以上
* 是否创20日最大振幅
* 是否创60日最大振幅

━━━━━━━━━━━━━━━━━━

## 如果创60日或120日最低收盘价

必须额外输出：

### 历史结构变化分析

说明：

1. 是否跌破最近60日主要交易区间

2. 是否跌破最近120日主要交易区间

3. 是否跌破历史成交密集区

4. 是否跌破成交额加权平均价格（VWAP）

5. 当前价格相对于最近60日价格分布的位置

6. 当前价格相对于最近120日价格分布的位置

7. 当前价格偏离VWAP百分比

必须给出具体数据。

━━━━━━━━━━━━━━━━━━

### 历史价格观察区

统计：

距离当前价格最近的：

① 历史成交密集区

② 历史高活跃交易区

③ VWAP区域

④ 历史异常放量区

输出：

| 区域类型 | 价格区间 | 出现频率 | 成交额占比 |

说明：

这些区域在历史样本中的统计特征。

仅描述历史事实。

━━━━━━━━━━━━━━━━━━

### 跌破有效性分析

分析：

1. 是否收盘跌破

2. 是否仅盘中跌破

3. 跌破幅度

4. 是否伴随放量

5. 是否伴随振幅扩大

6. 最近5日连续跌幅

7. 最近20日价格重心迁移幅度

说明：

本次属于：

* 轻微偏离
* 明显偏离
* 深度偏离

依据必须引用数据。

━━━━━━━━━━━━━━━━━━

# 第二部分：逐日精细化分析

必须覆盖全部交易日。

每个交易日输出：

* 日期
* 收盘价
* 涨跌幅
* 成交额

并计算：

实体值

振幅

成交额变化率

说明：

价格重心变化

波动变化

市场活跃度变化

━━━━━━━━━━━━━━━━━━

# 第三部分：连续性分析

统计：

* 连涨天数
* 连跌天数
* 连续放量天数
* 连续缩量天数

识别：

* 缩量上涨
* 放量上涨
* 缩量下跌
* 放量下跌

分别统计次数。

解释其历史市场行为特征。

━━━━━━━━━━━━━━━━━━

# 第四部分：价格分布与成交研究

计算：

平均收盘价

中位收盘价

VWAP

价格标准差

━━━━━━━━━━━━━━━━━━

输出：

## 历史成交密集区

| 区间 | 出现次数 | 占比 |

━━━━━━━━━━━━━━━━━━

## 历史高活跃区

| 区间 | 平均成交额 |

━━━━━━━━━━━━━━━━━━

## 历史价格重心区

说明：

价格主要围绕哪些区域波动。

━━━━━━━━━━━━━━━━━━

# 第五部分：异常交易日研究

识别：

* 异常放量日
* 异常缩量日
* 异常振幅日
* 异常涨跌幅日

输出：

日期

对应价格

对应成交额

异常原因

━━━━━━━━━━━━━━━━━━

# 第六部分：公告关联分析

联网检索最近30日：

交易所公告

公司公告

监管公告

财经媒体报道

输出3条最重要信息。

并统计：

公告前后：

* 成交额变化
* 振幅变化
* 价格重心变化

仅描述事实。

━━━━━━━━━━━━━━━━━━

# 第七部分：历史市场状态评分

评分范围：

0-100

评分项：

价格结构稳定性（20）

成交额活跃度（20）

波动率稳定性（20）

成交密集度（20）

异常事件数量（20）

输出：

总评分

各项评分原因

说明：

评分仅代表历史样本状态。

━━━━━━━━━━━━━━━━━━

# 第八部分：最终总结

必须单独输出：

### 最值得关注的异常

### 当前价格所处历史位置

### 当前价格距离最近成交密集区距离

### 当前价格距离VWAP距离

### 成交密集区是否迁移

### 价格重心是否迁移

### 市场活跃度变化情况

### 后续重点观察指标

仅从历史统计角度说明：

* 成交额变化
* 振幅变化
* 成交密集区变化
* VWAP变化
* 价格重心变化

━━━━━━━━━━━━━━━━━━

【禁止词】

买点

卖点

建仓

补仓

加仓

减仓

清仓

止损

止盈

抄底

逃顶

支撑位

压力位

利好

利空

看涨

看跌

━━━━━━━━━━━━━━━━━━

统一使用：

历史价格观察区

历史成交密集区

历史高活跃交易区

历史价格重心区

历史结构变化

历史市场状态

历史统计结果显示

`;

                if (this._aiAbortController) this._aiAbortController.abort();
                this._aiAbortController = new AbortController();

                const response = await fetch(this.aiConfig.apiUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${this.aiConfig.apiKey}` 
                    },
                    body: JSON.stringify({ 
                        model: this.aiConfig.model, 
                        messages: [{ role: 'user', content: prompt }], 
                        stream: true
                    }), 
                    signal: this._aiAbortController.signal
                });

                if (!response.ok) {
                    let errText = response.statusText;
                    try {
                        const errJson = await response.json();
                        errText = errJson.error?.message || JSON.stringify(errJson);
                    } catch(e) { errText = await response.text(); }
                    throw new Error(`HTTP ${response.status}: ${errText}`);
                }
                
                this.aiStatus = 'typing';
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let isDone = false;

                while (!isDone) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunkStr = decoder.decode(value, { stream: true });
                    fullRawResponse += chunkStr; 
                    buffer += chunkStr;

                    const lines = buffer.split('\n');
                    buffer = lines.pop(); 

                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;
                        
                        if (line.startsWith('data:')) {
                            const jsonStr = line.substring(5).trim();
                            if (jsonStr === '[DONE]') { isDone = true; break; }
                            try {
                                const json = JSON.parse(jsonStr);
                                if (json.choices && json.choices.length > 0) {
                                    const choice = json.choices[0];
                                    if (choice.delta && choice.delta.content) { this.aiStreamedText += choice.delta.content; }
                                }
                            } catch (e) {}
                        } else {
                            try {
                                const json = JSON.parse(line);
                                if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
                                else if (json.choices && json.choices[0] && json.choices[0].message) {
                                    this.aiStreamedText += json.choices[0].message.content || '';
                                }
                            } catch(e) {}
                        }
                    }
                }
                
                if (buffer.trim()) {
                    let line = buffer.trim();
                    if (line.startsWith('data:')) {
                        const jsonStr = line.substring(5).trim();
                        if (jsonStr !== '[DONE]') {
                            try {
                                const json = JSON.parse(jsonStr);
                                const chunk = json.choices?.[0]?.delta?.content || '';
                                if (chunk) this.aiStreamedText += chunk;
                            } catch (e) {}
                        }
                    } else {
                        try {
                            const json = JSON.parse(line);
                            if (json.choices && json.choices[0] && json.choices[0].message) {
                                this.aiStreamedText += json.choices[0].message.content || '';
                            }
                        } catch(e) {}
                    }
                }

                if (!this.aiStreamedText || !this.aiStreamedText.trim()) {
                    throw new Error(`接口通讯正常 (200 OK) 但未返回有效内容。`);
                }

                if (this.aiStatus !== 'idle') { this.aiStatus = 'finished'; }

            } catch (err) {
                if (err.name !== 'AbortError') {
                    const safeErrorMessage = err.message || JSON.stringify(err);
                    const errorHtml = `\n\n<span style="color:#f56c6c; font-weight:bold;">[System Error] 大模型调用失败: ${safeErrorMessage}</span>`;
                    this.aiStreamedText = (this.aiStreamedText || '') + errorHtml;
                }
                this.aiStatus = 'finished';
            }
        },

        runLocalNLP(data) {
            this.aiStatus = 'typing'; 
            const first = data[0]; const last = data[data.length - 1]; const periodDays = data.length;
            const firstClose = Number(first.close); const lastClose = Number(last.close);
            let sumClose = 0, upDays = 0, downDays = 0, highest = -Infinity, lowest = Infinity;
            let maxGain = -Infinity, maxDrop = Infinity, maxVolPct = 0, maxVol = -Infinity;

            for (let i = 0; i < data.length; i++) {
                const c = Number(data[i].close), h = Number(data[i].high), l = Number(data[i].low);
                const pct = Number(data[i].pct_chg), v = Number(data[i].volume);
                sumClose += c;
                if (h > highest) highest = h; if (l < lowest) lowest = l;
                if (pct > 0) upDays++; else if (pct < 0) downDays++;
                if (pct > maxGain) maxGain = pct; if (pct < maxDrop) maxDrop = pct;
                if (!isNaN(v) && v > maxVol) { maxVol = v; maxVolPct = pct; }
            }

            const avgClose = sumClose / periodDays;
            const closeChange = lastClose - firstClose;
            const closePct = firstClose > 0 ? (closeChange / firstClose) * 100 : 0;
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

            let p1 = lastClose > avgClose * 1.05 ? pick([`大家注意看，这股票最近挺有冲劲的。最新收盘价稳稳站在这几天平均线上。`]) 
                 : lastClose < avgClose * 0.95 ? pick([`走势有点难看，收盘价掉到了买入平均成本线下面。`])
                 : pick([`最近这段时间，它一直在横着走，买卖双方正在互相观望等待方向。`]);

            let p2 = upDays > downDays && maxGain > Math.abs(maxDrop) ? `价格波动明显多头占上风，哪怕掉下来一点都有人愿意抄底。`
                 : downDays > upDays && Math.abs(maxDrop) > maxGain ? `绿多红少，跌起来特别狠，反弹基本就是让人逃命的。`
                 : `大涨和大跌的日子一半一半，感觉像是在洗盘折腾人。`;

            let p3 = maxVolPct > 3 ? `在大涨的那天突然放出天量，说明肯定有大资金进场扫货了。`
                 : maxVolPct < -3 ? `最让人担心的就是暴跌那天居然放出了巨量，后头可能还得接着跌。`
                 : `成交量中规中矩，资金没有明显的一致性动作。`;

            let p4 = closePct > 3 ? `【建议】：势头正猛，向上的路已被打开，建议持有或趁着盘中回踩试水。`
                 : closePct < -3 ? `【建议】：跌势还没看到底，建议管住手在外面看着，等企稳。`
                 : `【建议】：正处于不上不下的尴尬位置，往上往下都有可能，建议保持观望。`;

            this.streamTypewriterEffect(`${p1}\n\n${p2}\n\n${p3}\n\n${p4}`);
        },

        async streamTypewriterEffect(htmlContent) {
            this.aiStatus = 'typing';
            this.aiStreamedText = '';
            const tokens = []; let i = 0;
            while(i < htmlContent.length) {
                if (htmlContent[i] === '<') {
                    let tag = '';
                    while (htmlContent[i] !== '>' && i < htmlContent.length) { tag += htmlContent[i]; i++; }
                    if (i < htmlContent.length) { tag += htmlContent[i]; i++; }
                    tokens.push(tag);
                } else {
                    tokens.push(htmlContent[i]); i++;
                }
            }

            for (let t of tokens) {
                if (this.aiStatus !== 'typing') break;
                this.aiStreamedText += t;
                if (!t.startsWith('<')) { await new Promise(r => setTimeout(r, 15 + Math.random() * 20)); }
            }
            if (this.aiStatus === 'typing') this.aiStatus = 'finished';
        },

        async initFollowedStocks() {
            // 直接调用真实的后端接口获取自选股列表
            await this.getSelfSelectedStocks();
        },

        async followCurrentStock() {
            const code = this.currentStockCode; 
            const name = this.currentStockName;
            this.recordLog('关注个股', { code, name });

            if (!code) { Message.warning({ message: '无效的代码', center: true }); return; }
            if (this.followedStocks.some(item => item.code === code)) { Message.info({ message: '已在关注列表中', center: true }); return; }

            // 直接调用真实的添加自选接口
            await this.addSelfSelectedStock(code);
        },

        unfollowStock(row) {
            MessageBox.confirm(`确定取消关注 ${row.name} 吗？`, '提示', { type: 'warning', center: true }).then(async () => {
                // 直接调用真实的移除自选接口
                await this.delSelfSelectedStock(row.code);
            }).catch(() => {});
        },

        async refreshFollowedRealTime(showMsg = true) {
            if (!this.followedStocks || this.followedStocks.length === 0) return;
            if (showMsg) this.recordLog('刷新自选股票实时行情', { count: this.followedStocks.length });
            this.followedLoading = true;
            try {
                const updatedList = [];
                for (let item of this.followedStocks) {
                    const resp = await get_stock_rt_data({ code: item.code }).catch(() => null);
                    if (resp && resp.data && resp.data.code === 1000 && resp.data.data) {
                        const rtData = resp.data.data;
                        updatedList.push({
                            code: item.code, name: item.name, industry: item.industry,
                            pct_chg: Number(rtData.changepercent || 0), close: Number(rtData.trade || 0),
                            open: Number(rtData.open || 0), high: Number(rtData.high || 0),
                            low: Number(rtData.low || 0), volume: Number(rtData.volume || 0)
                        });
                        // 获取完自选列表基础信息后，顺便获取已配置的所有监控单条件，以便渲染表格
                        await this.getMonitorConfigs();
                    } else { 
                        updatedList.push(item); 
                    }
                }
                this.followedStocks = updatedList;
                if (showMsg) Message.success({ message: '自选行情刷新成功', center: true });
            } catch (e) {
                console.error(e);
            } finally { 
                this.followedLoading = false; 
            }
        },

        async syncFollowedToServer() {
            // 现在已经实现了实时的添加和删除同步，这个按钮的作用可以调整为强制从服务端重新拉取最新列表
            this.recordLog('从服务器同步自选股票', {});
            await this.getSelfSelectedStocks();
            Message.success({ message: '已获取最新自选列表', center: true });
        },

        async get_stock_rt_data_v2(showMsg = false) {
			if (!this.currentStockCode) return;
            this.recordLog('追加单个股票今日实时数据', { code: this.currentStockCode, showMsg });
            
            const todayStr = this.formatDate(new Date());
            if (this.currentStockHistoryData.some(item => item.day === todayStr)) {
                if (showMsg) Message.info({ message: '今日行情已在列表中', center: true });
                return;
            }

            this.stocksLoading = true;
			const resp = await get_stock_rt_data({ code: this.currentStockCode }).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000 && resp.data.data) {
				const rtData = resp.data.data;
                const mappedItem = {
                    code: rtData.code || this.currentStockCode,
                    pct_chg: Number(rtData.changepercent || 0), close: Number(rtData.trade || 0),
                    open: Number(rtData.open || 0), high: Number(rtData.high || 0),
                    low: Number(rtData.low || 0), volume: Number(rtData.volume || 0),
                    day: todayStr
                };

                const filteredList = this.currentStockHistoryData.filter(item => item.day !== todayStr);
                filteredList.push(mappedItem);
                this.processStockHistoryDiffs(filteredList);

                if (this.myChart) this.renderTrendChart(this.currentStockHistoryData);
                if (this.showCustomChartPanel && this.customChartInstance) { this.renderCustomChart(); }
                
                this.stockSummary = {
                    total: this.currentStockHistoryData.length,
                    up: this.currentStockHistoryData.filter(item => item.pct_chg > 0).length,
                    down: this.currentStockHistoryData.filter(item => item.pct_chg < 0).length
                };
                if (showMsg) Message.success({ message: '今日实时数据追加成功', center: true });
			}
            this.stocksLoading = false;
		},

        async fetchInflowData(showMsg = false) {
            this.recordLog('刷新行业资金流向数据', { showMsg });
            this.inflowChartLoading = true;
            try {
                const resp = await get_capital_inflow();
                if (resp && resp.data && resp.data.code == 1000) {
                    this.inflowData = resp.data.data;
                    this.$nextTick(() => { this.initInflowChart(); });
                    if (showMsg) Message.success({ message: resp.data.msg, center: true });
                } else {
                    if (showMsg) Message.error({ message: resp.data.msg, center: true });
                }
            } finally { this.inflowChartLoading = false; }
        },

        async fetchIndexData(showMsg = false) {
            this.recordLog('刷新大盘核心指数', { showMsg });
            this.indexLoading = true;
            try {
                const resp = await get_sh_index();
                if (resp && resp.data && resp.data.code == 1000) {  
                    this.indexData = resp.data.data;
                    if (showMsg) Message.success({ message: '指数刷新成功', center: true });
                }
            } finally {
                this.indexLoading = false;
            }
        },

        safeGetTime(dateStr) {
            if (!dateStr) return 0;
            let s = String(dateStr).replace(/\//g, '-');
            if (/^\d{8}$/.test(s)) s = `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
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
                Message.warning({ message: '请选择有效日期范围', center: true }); return;
            }
            this.recordLog('按日期区间查询股票历史数据', { code: this.currentStockCode, dateRange: this.dateRange });
            this.stocksLoading = true;
            const startDate = this.formatDate(this.dateRange[0]);
            const endDate = this.formatDate(this.dateRange[1]);

            const resp = await stock_history_data_date_range({ code: this.currentStockCode, start: startDate, end: endDate });
            if (resp && resp.data && resp.data.code === 1000) {
                this.processStockHistoryDiffs(resp.data.data || []);
                if (this.myChart) this.renderTrendChart(this.currentStockHistoryData);
                if (this.showCustomChartPanel && this.customChartInstance) { this.renderCustomChart(); }
            } else { Message.error({ message: resp.data.msg, center: true }); }
            this.stocksLoading = false;
        },

        reset_filter_date() { 
            this.lookBackDays = ''; this.days = ''; this.price = ''; this.industryName = ''; this.trend = 2; 
        },

        formatVolumeInYi(val) {
            if (val === null || val === undefined || val === '' || isNaN(val)) return '0.00';
            return (Number(val) / 100000000).toFixed(2);
        },

        formatVolumeDiffInYi(val) {
            if (val === null || val === undefined || val === '' || isNaN(val)) return '';
            const num = Number(val);
            if (num === 0) return '0.00';
            const diffInYi = (num / 100000000).toFixed(2);
            return num > 0 ? `+${diffInYi}` : diffInYi;
        },

        formatDiff(val) {
            if (val === null || val === undefined || isNaN(val)) return '';
            if (val === 0) return '0.00';
            return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
        },

        async get_good_stocks_history() {
            this.recordLog('获取可选行业列表状态数据', {});
            this.isRunIconF = "el-icon-loading";
            const resp = await filter_good_stocks_history({trend: this.trend});
            if (resp && resp.data && resp.data.code === 1000) { this.filterStocksHistory = resp.data.data || []; } 
            this.isRunIconF = "el-icon-refresh";
        },

        async get_good_stocks(typeCheck) {
            if (typeCheck === 1) { this.lookBackDays = 10; this.days = 1000; this.price = 0.1; } 
            else {
                if (!this.days) { 
                    Message.warning({ message: `请输入连续${this.trend === 1 ? '上涨' : '下跌'}的交易日`, center: true }); 
                    return; 
                }
            }
            if (!this.industryName) { Message.warning({ message: '请选择行业', center: true }); return; }
            
            this.recordLog('查询条件筛选符合的股票数据', { typeCheck, industry: this.industryName, days: this.days, price: this.price, trend: this.trend });
            this.filterStocksLoading = true;
            
            const resp = await filter_good_stocks({ 
                industry: this.industryName, days: this.days, lookBackDays: 10, price: this.price || 0.1, trend: this.trend 
            });
            if (resp && resp.data && resp.data.code === 1000) {
                this.customSearchData = resp.data.data || [];
                if (this.days == 1000) { this.customSearchDialogVisible = true; } 
                else { Message.success({ message: resp.data.msg, center: true }); }
            }
            this.filterStocksLoading = false; this.visible = false;
        },

        async get_industry_datas() {
            this.recordLog('获取全量行业分类列表', {});
            const resp = await get_stock_industry_list();
            if (resp && resp.data && resp.data.code === 1000) { this.insdustryData = resp.data.data; } 
        },

        handleCustomSearchPageChange(val) { this.customSearchCurrentPage = val; },
        handleCustomSearchSizeChange(val) {
            this.customSearchPageSize = val;
            this.customSearchCurrentPage = 1;
        },

        initTheme() {
            const savedTheme = localStorage.getItem('app-theme-dark');
            if (savedTheme !== null) { this.isDarkMode = savedTheme === 'true'; }
            this.$root.$on('theme-change', (val) => { this.isDarkMode = val; });
        },

        closeAll() { this.chartDialogVisible = false; },

        handleNewsDialogClose() {
            this.newsDialogVisible = false; this.newsLoading = false;
            if (this.newsLoadingTimer) { clearTimeout(this.newsLoadingTimer); this.newsLoadingTimer = null; }
        },

        handleIframeLoad() {
            this.newsLoading = false;
            if (this.newsLoadingTimer) { clearTimeout(this.newsLoadingTimer); this.newsLoadingTimer = null; }
        },

        handleOpenNews(row) {
            this.recordLog('打开股票新闻资讯详情页', { code: row.code, name: row.name });
            this.currentNewsStockCode = row.code; this.currentNewsStockName = row.name;
            this.newsLoading = true; this.newsDialogVisible = true;
            if (this.newsLoadingTimer) { clearTimeout(this.newsLoadingTimer); }
            this.newsLoadingTimer = setTimeout(() => { this.newsLoading = false; }, 2500);
        },

        showStock30DaysDetail() {
            this.stockSortProp = 'pct_chg'; this.stockSortOrder = 'descending'; this.stock30DaysDetailVisible = true;
        },

        formatAmount(row, column, cellValue, index) {
            if (cellValue === null || cellValue === undefined || isNaN(cellValue)) { return '0.00'; }
            return (Number(cellValue) / 100000000).toFixed(2);
        },

        handleStockSortChange({ prop, order }) {
            this.stockSortProp = prop; this.stockSortOrder = order; this.stockCurrentPage = 1;
        },

        handleStockPageChange(val) { this.stockCurrentPage = val; },
        handleStockSizeChange(val) {
            this.stockPageSize = val;
            this.stockCurrentPage = 1;
        },
        
        refreshData() { this.getStockMarketData(); this.getIndustryUpDown(); this.fetchIndexData(false); this.initFollowedStocks();},

        async stockDataStatus() {
            this.recordLog('检查服务端股票数据更新状态', {});
            this.isRunIcon = "el-icon-loading";
            const resp = await stock_data_status();
            if (resp.data.code === 1000) { this.isRunIcon = "el-icon-data-line"; }
        },

        stockDataSwitch() {
            MessageBox.confirm('确定刷新两市所有股票的实时数据吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', center: true })
            .then(async () => {
                this.recordLog('手动切换股票数据源处理', {});
                this.isRunIcon = "el-icon-loading";
                const resp = await stock_data_switch();
                if (resp.data.code !== 1000) { Message.error({ message: resp.data.msg, center: true }); return; }
                Message.success({ message: resp.data.msg, center: true });
            }).catch(() => { });
        },

        async getStockMarketData() {
            this.recordLog('获取两市总览聚合数据', {});
            this.summaryLoading = true;
            try {
                const resp = await get_stock_market_data();
                if (resp.data.code === 1000) {
                    var rd = resp.data.data;
                    rd.amount = `${(rd.amount / 100000000).toFixed(2)}亿`;
                    this.marketSummary = rd;
                }
            } finally {
                this.summaryLoading = false;
            }
        },

        async getIndustryUpDown() {
            this.recordLog('获取行业涨跌分布及核心指数看板', {});
            this.industryChartLoading = true;
            this.inflowChartLoading = true;
            try {
                const resp = await get_stock_industry_up_down();
                if (resp && resp.data && resp.data.code === 1000) {
                    var rd = resp.data.data;
                    this.rawIndustryData = rd.data;
                    this.indexData = rd.sh_index_data;
                    this.inflowData = rd.capital_inflow_data;
                    this.$nextTick(() => { this.initInflowChart(); });
                }
                this.initChart();
            } finally {
                this.industryChartLoading = false;
                this.inflowChartLoading = false;
            }
        },

        toggleTheme() { this.isDarkMode = !this.isDarkMode; },
        
        handleSort(key) {
            if (this.sortKey === key) { this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'; } 
            else { this.sortKey = key; this.sortOrder = 'desc'; }
            this.currentPage = 1;
        },

        getSortIcon(key) {
            if (this.sortKey !== key) return 'sort-icon default';
            return this.sortOrder === 'asc' ? 'sort-icon asc' : 'sort-icon desc';
        },

        handlePageChange(val) { this.currentPage = val; },
        handleSizeChange(val) {
            this.pageSize = val;
            this.currentPage = 1;
        },

        getRankClass(index) {
            const globalRank = (this.currentPage - 1) * this.pageSize + index + 1;
            return globalRank <= 3 ? 'top-rank' : '';
        },

        handleQueryIndustryInput(val) {
            const keyword = String(val || '').trim();
            if (this.industryQueryTimer) { clearTimeout(this.industryQueryTimer); this.industryQueryTimer = null; }
            if (!/^\d{6}$/.test(keyword)) {
                this.stockIndustryFromCode = ''; this.industryQueryReqId += 1; this.industryQueryLoading = false; return;
            }
            this.stockIndustryFromCode = ''; this.industryQueryLoading = true;
            this.fetchIndustryByStockCode(keyword);
        },

        getIndustryValueFromResp(data) {
            const stockInfo = Array.isArray(data) ? data[0] : data;
            if (!stockInfo || typeof stockInfo !== 'object') return '';
            if (typeof stockInfo.industry === 'string') { return stockInfo.industry.trim(); }
            if (stockInfo.industry && typeof stockInfo.industry === 'object' && typeof stockInfo.industry.name === 'string') { return stockInfo.industry.name.trim(); }
            return '';
        },

        async fetchIndustryByStockCode(code) {
            this.recordLog('根据股票代码查询归属行业', { code });
            const reqId = ++this.industryQueryReqId;
            try {
                const resp = await get_stock_info_data({ code });
                if (reqId !== this.industryQueryReqId) { return; }
                if (resp.data.code !== 1000) { this.stockIndustryFromCode = ''; return; }
                this.stockIndustryFromCode = this.getIndustryValueFromResp(resp.data.data);
            } catch (error) {
                if (reqId === this.industryQueryReqId) { this.stockIndustryFromCode = ''; }
            } finally {
                if (reqId === this.industryQueryReqId) { this.industryQueryLoading = false; }
            }
        },

        async openIndustryStocks(industryName) {
            this.recordLog('打开目标行业股票明细列表', { industryName });
            this.currentIndustry = industryName; this.dialogVisible = true; this.stocksLoading = true;
            const resp = await get_industry_data({ name: industryName });
            if (resp.data.code !== 1000) return;
            const mockData = resp.data.data;
            this.industryStocks = mockData.sort((a, b) => b.changepercent - a.changepercent);
            this.stocksLoading = false;
        },

        getPriceClass(val) {
            const num = Number(val);
            if (num > 0) return 'text-up';
            if (num < 0) return 'text-down';
            return '';
        },

        initChart() {
            if (!this.$refs.industryChart) return;
            if (this.chartInstance) { this.chartInstance.dispose(); }
            this.chartInstance = echarts.init(this.$refs.industryChart);

            const top10Data = [...this.rawIndustryData].sort((a, b) => b.amount - a.amount).slice(0, 10).reverse();
            const categoryData = top10Data.map(item => item.name);
            const valueData = top10Data.map(item => (item.amount / 100000000).toFixed(2));

            const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
            const labelColor = this.isDarkMode ? '#707070' : '#909399';
            const splitLineColor = this.isDarkMode ? '#333333' : '#eee';
            const barEndColor = this.isDarkMode ? '#1e1e1e' : '#ecf5ff';

            const option = {
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c} 亿元', backgroundColor: this.isDarkMode ? '#333' : '#fff', textStyle: { color: this.isDarkMode ? '#eee' : '#333' } },
                grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
                xAxis: { type: 'value', boundaryGap: [0, 0.01], axisLabel: { color: labelColor }, splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } } },
                yAxis: { type: 'category', data: categoryData, axisLabel: { fontWeight: 'bold', color: axisColor, fontSize: 13 }, axisTick: { show: false }, axisLine: { show: false } },
                series: [{
                    name: '成交额', type: 'bar', data: valueData, barWidth: 16,
                    itemStyle: { color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [ { offset: 0, color: '#409eff' }, { offset: 1, color: barEndColor } ]), borderRadius: [0, 4, 4, 0] },
                    label: { show: true, position: 'right', formatter: '{c}亿', color: labelColor, fontSize: 11 }
                }]
            };
            this.chartInstance.setOption(option);
        },

        initInflowChart() {
            if (!this.$refs.inflowChart) return;
            if (this.inflowChartInstance) { this.inflowChartInstance.dispose(); }
            this.inflowChartInstance = echarts.init(this.$refs.inflowChart);

            const textColor = this.isDarkMode ? '#b0b0b0' : '#606266';
            const borderColor = this.isDarkMode ? '#1e1e1e' : '#fff';
            const tooltipBg = this.isDarkMode ? '#333' : '#fff';
            const tooltipColor = this.isDarkMode ? '#eee' : '#333';

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'item',
                    formatter: function(params) {
                        const d = params.data.raw;
                        return `<div style="font-weight:bold; margin-bottom:5px;">${d.industry_name}</div>净流入金额: <span style="color:#f56c6c; font-weight:bold;">${d.net_inflow_billion_yuan} 亿</span><br/>所属行业指数: ${d.industry_index}`;
                    },
                    backgroundColor: tooltipBg, textStyle: { color: tooltipColor }
                },
                legend: { type: 'scroll', orient: 'vertical', right: '2%', top: 'center', textStyle: { color: textColor } },
                series: [{
                    name: '资金净流入', type: 'pie', radius: ['40%', '65%'], center: ['35%', '50%'], avoidLabelOverlap: true,
                    itemStyle: { borderRadius: 6, borderColor: borderColor, borderWidth: 2 },
                    label: {
                        show: true, position: 'outside', formatter: '{name|{b}}\n{value|{c} 亿}',
                        rich: { name: { color: textColor, fontSize: 12, lineHeight: 18 }, value: { color: '#f56c6c', fontSize: 13, fontWeight: 'bold', lineHeight: 18 } }
                    },
                    labelLine: { show: true, length: 15, length2: 20, smooth: true },
                    data: this.inflowData.map(item => ({ name: item.industry_name, value: item.net_inflow_billion_yuan, raw: item }))
                }]
            };
            this.inflowChartInstance.setOption(option);
        },

        resizeChart() {
            if (this.chartInstance) this.chartInstance.resize();
            if (this.inflowChartInstance) this.inflowChartInstance.resize();
            if (this.myChart) this.myChart.resize();
            if (this.customChartInstance) this.customChartInstance.resize();
        },

        handleOpenChart(row) {
            this.currentStockCode = row.code; this.currentStockName = row.name; this.chartDialogVisible = true;
        },

        processStockHistoryDiffs(rawData) {
            rawData.sort((a, b) => this.safeGetTime(a.day) - this.safeGetTime(b.day));

            for (let i = 0; i < rawData.length; i++) {
                let current = rawData[i];
                if (i === 0) {
                    current.close_diff = null; current.open_diff = null;
                    current.low_diff = null; current.high_diff = null; current.volume_diff = null;
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
            this.recordLog('查看目标股票历史涨跌及基本数据', { code: this.currentStockCode, days: this.historyDays });
            this.chartLoading = true; this.stockSortProp = 'pct_chg'; this.stockSortOrder = 'descending';
            this.historyDays = this.historyDays || 30;
            const resp = await get_stock_history_data({ code: this.currentStockCode, days: this.historyDays });
            
            this.chartLoading = false;
            if (resp.data.code !== 1000) return;
            
            this.processStockHistoryDiffs(resp.data.data || []);
            this.renderTrendChart(this.currentStockHistoryData);
            
            this.stockSummary = {
                total: this.currentStockHistoryData.length,
                up: this.currentStockHistoryData.filter(item => item.pct_chg > 0).length,
                down: this.currentStockHistoryData.filter(item => item.pct_chg < 0).length
            };
            
            this.aiStatus = 'idle';
            this.aiStreamedText = 'System Ready. 等待用户启动 AI 引擎注入指令...';
            this.showExtremesTable = false;
            this.showPatternStat = true;
        },

        onChartDialogClosed() {
            if (this.myChart) { this.myChart.dispose(); this.myChart = null; }
            if (this.customChartInstance) { this.customChartInstance.dispose(); this.customChartInstance = null; }
            this.currentStockHistoryData = [];
            this.aiStatus = 'idle';
            this.showExtremesTable = false; 
            
            // 还原组合分析默认参数
            this.showPatternStat = true;
            this.patternStatType = 'up_down';
            this.patternStatField = 'low';

            if (this._aiAbortController) {
                this._aiAbortController.abort();
                this._aiAbortController = null;
            }
        },

        // ================== 全新优化的走势图渲染逻辑 ==================
        renderTrendChart(data) {
            if (!this.$refs.stockTrendChart) return;
            if (this.myChart) { this.myChart.dispose(); }
            this.myChart = echarts.init(this.$refs.stockTrendChart);

            if (!data || data.length === 0) return;

            const xAxisData = data.map(item => item.day);
            const field = this.selectedTrendField;
            
            const fieldOption = this.chartFieldOptions.find(opt => opt.value === field);
            const fieldName = fieldOption ? fieldOption.label : '数值';

            let yAxisData = [];
            data.forEach(item => {
                let val = item[field];
                if (field === 'volume' && val !== null && val !== undefined) {
                    val = (Number(val) / 100000000).toFixed(2); // 统一转换为亿
                } else if (val !== null && val !== undefined) {
                    val = Number(val).toFixed(2);
                } else {
                    val = 0;
                }
                yAxisData.push(val);
            });

            const axisColor = this.isDarkMode ? '#b0b0b0' : '#303133';
            const splitLineColor = this.isDarkMode ? '#333333' : '#eee';
            
            // 动态计算 Y 轴 min max
            const validY = yAxisData.map(Number).filter(n => !isNaN(n));
            const minVal = Math.min(...validY);
            const maxVal = Math.max(...validY);
            const diff = maxVal - minVal;

            let yAxisMin = diff === 0 ? null : (minVal - diff * 0.1).toFixed(2);
            let yAxisMax = diff === 0 ? null : (maxVal + diff * 0.1).toFixed(2);
            
            let markLine = undefined;
            if (field === 'pct_chg') {
                markLine = { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: this.isDarkMode ? '#555' : '#ccc', type: 'solid' } }] };
            }

            // 根据数据类型使用精美的动态配色
            let lineColor, colorStops, areaStops;
            if (field === 'pct_chg') {
                lineColor = '#409eff';
                colorStops = [{ offset: 0, color: '#409eff' }, { offset: 1, color: '#66b1ff' }];
                areaStops = [{ offset: 0, color: 'rgba(64,158,255,0.4)' }, { offset: 1, color: 'rgba(64,158,255,0.05)' }];
            } else if (field === 'volume') {
                lineColor = '#e6a23c';
                colorStops = [{ offset: 0, color: '#e6a23c' }, { offset: 1, color: '#f5da8c' }];
                areaStops = [{ offset: 0, color: 'rgba(230,162,60,0.4)' }, { offset: 1, color: 'rgba(230,162,60,0.05)' }];
            } else {
                // 开盘、收盘、最高、最低价格等
                lineColor = '#f56c6c';
                colorStops = [{ offset: 0, color: '#f56c6c' }, { offset: 1, color: '#ff9e9e' }];
                areaStops = [{ offset: 0, color: 'rgba(245,108,108,0.4)' }, { offset: 1, color: 'rgba(245,108,108,0.05)' }];
            }

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
                    formatter: (params) => {
                        let result = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].name}</div>`;
                        params.forEach((item) => {
                            let valStr = item.data;
                            let unit = '';
                            if (field === 'pct_chg') { unit = '%'; valStr = (item.data > 0 ? '+' : '') + item.data; }
                            if (field === 'volume') { unit = ' 亿'; }
                            result += `${item.marker}${item.seriesName}: <span style="color:${lineColor};font-weight:bold;">${valStr}${unit}</span>`;
                        });
                        return result;
                    },
                    backgroundColor: this.isDarkMode ? 'rgba(50,50,50,0.9)' : 'rgba(255,255,255,0.95)',
                    textStyle: { color: this.isDarkMode ? '#eee' : '#333' },
                    borderColor: this.isDarkMode ? '#444' : '#e4e7ed',
                    borderWidth: 1,
                    padding: [8, 12]
                },
                grid: { left: '2%', right: '4%', bottom: '5%', top: '10%', containLabel: true },
                // 添加了支持鼠标滚轮缩放的属性
                dataZoom: [
                    { type: 'inside', start: 0, end: 100 }
                ],
                xAxis: { 
                    type: 'category', 
                    data: xAxisData, 
                    axisLabel: { color: axisColor }, 
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: splitLineColor } }
                },
                yAxis: { 
                    type: 'value', 
                    name: fieldName, 
                    nameTextStyle: { color: axisColor, padding: [0, 0, 0, 10] }, 
                    axisLabel: { color: axisColor }, 
                    splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } },
                    scale: true,
                    min: yAxisMin,
                    max: yAxisMax
                },
                series: [{
                    name: fieldName,
                    type: 'line',
                    data: yAxisData,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    showSymbol: false,
                    itemStyle: { color: lineColor },
                    lineStyle: {
                        width: 2,
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops)
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, areaStops)
                    },
                    markLine: markLine
                }]
            };
            this.myChart.setOption(option);
        }
    }
};
</script>

<style scoped>
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
    --color-orange: #e6a23c;
    --color-purple: #9c27b0;
    --color-green: #67c23a;
    --color-hover: #66b1ff;
    transition: background-color 0.3s, color 0.3s;
}

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

* { box-sizing: border-box; }

.market-overview { background-color: var(--bg-app); min-height: 100vh; padding: 20px; font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif; color: var(--text-primary); }
.section-search { width: 300px; margin-bottom: 20px; }
::v-deep .section-search .el-input__inner, ::v-deep .section-search-1 .el-input__inner { background: var(--bg-app); border-color: var(--border-color); color: var(--text-primary); }

.text-up { color: var(--color-up); font-weight: bold; }
.text-down { color: var(--color-down); font-weight: bold; }
.text-down-1 { padding-top: 2px; }
.history-detail { color: var(--color-blue); cursor: pointer; font-size: 13px; }
.font-mono { font-family: "Consolas", "Monaco", monospace; }

.diff-cell { display: inline-flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }
.cell-value { font-size: 14px; color: var(--text-primary); }
.cell-diff { font-size: 12px; margin-top: 2px; font-weight: 600; }

.card { background: var(--bg-card); border-radius: 8px; box-shadow: 0 2px 12px 0 var(--shadow-color); padding: 24px; margin-bottom: 20px; border: 1px solid transparent; }
.dark-theme .card { border: 1px solid #333; }

.section-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; color: var(--text-primary); }
.indicator { width: 4px; height: 18px; background: var(--color-blue); border-radius: 2px; margin-right: 10px; transition: background-color 0.3s; }

.page-header { display: flex; justify-space: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; align-items: baseline; gap: 15px; }
.page-header h2 { margin: 0; font-size: 22px; color: var(--text-primary); }
.refresh-time { font-size: 13px; color: var(--text-secondary); }
.refresh-btn { cursor: pointer; color: #707070; }
.refresh-sub-btn { cursor: pointer; color: var(--text-secondary); transition: color 0.3s; display: inline-flex; align-items: center; }
.refresh-sub-btn:hover { color: var(--color-blue); }
.source-text { font-size: 9px; }

.theme-toggle { display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border-radius: 20px; background-color: var(--bg-card); box-shadow: 0 2px 8px var(--shadow-color); color: var(--text-regular); transition: all 0.3s; margin-left: 10px; }
.theme-toggle:hover { color: var(--color-blue); }
.toggle-text { font-size: 13px; margin-left: 6px; }

.summary-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: stretch; }
@media (max-width: 1200px) { .summary-card { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .summary-card { grid-template-columns: 1fr; gap: 16px; } }

.summary-item { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
.dark-theme .summary-item { background: rgba(255, 255, 255, 0.02); }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.item-header .title { font-size: 15px; font-weight: bold; color: var(--text-secondary); }
.item-header .time { font-size: 12px; color: var(--text-secondary); font-family: "Consolas", "Monaco", monospace; }

.index-summary .main-price { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; }
.index-summary .price-num { font-size: 34px; font-weight: 800; font-family: "Consolas", "Monaco", monospace; }
.index-summary .price-change { font-size: 15px; font-weight: bold; }
.price-details { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--bg-app); padding: 10px; border-radius: 6px; gap: 5px; }
.detail-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.detail-col .d-label { font-size: 12px; color: var(--text-secondary); }
.detail-col .d-val { font-size: 13px; font-weight: 600; font-family: "Consolas", "Monaco", monospace; color: var(--text-primary); }

.total-amount-summary .flex-center { flex: 1; display: flex; align-items: center; justify-content: flex-start; }
.total-amount-summary .number-huge { font-size: 38px; font-weight: 800; background: linear-gradient(90deg, var(--text-primary), var(--text-regular)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: "Consolas", "Monaco", monospace; }

.up-down-summary .flex-col-center { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.progress-bar-container { height: 16px; border-radius: 8px; overflow: hidden; display: flex; background-color: var(--bg-progress); margin-bottom: 15px; }
.bar-segment { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold; transition: width 0.5s ease; white-space: nowrap; overflow: hidden; }
.up-segment { background-color: var(--color-up); }
.down-segment { background-color: var(--color-down); }
.dist-details { display: flex; justify-content: space-between; font-size: 14px; padding: 0 5px; }
.detail-item .icon { font-size: 12px; margin-right: 2px; }
.detail-item .d-val { font-weight: 600; font-family: "Consolas", "Monaco", monospace; }
.detail-item .ratio { color: var(--text-secondary); font-size: 12px; margin-left: 4px; }

.charts-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 1024px) { .charts-wrapper { grid-template-columns: 1fr; } }
.chart-container { width: 100%; height: 380px; }

.algo-params-panel { border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-app); overflow: hidden; }
.panel-header { padding: 10px 15px; background: var(--bg-hover); cursor: pointer; font-weight: bold; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center; transition: background 0.3s; }
.panel-header:hover { background: var(--bg-progress); }
.panel-content { padding: 15px; border-top: 1px solid var(--border-color); }
.param-row { align-items: center; }
.param-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; }
.dark-theme .algo-params-panel { background: #1e1e1e; border-color: #333; }
.dark-theme .panel-header { background: #2c2c2c; color: #e0e0e0; }
.dark-theme .panel-content { border-color: #333; }

.chart-hint-text { font-size: 12px; color: #909399; margin-left: auto; }
.dark-theme .chart-hint-text { color: #707070; }

.ai-terminal-panel { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-app); overflow: hidden; }
.ai-status-text { font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 4px; }
.ai-status-text.idle { background: var(--bg-progress); color: var(--text-secondary); }
.ai-status-text.loading { background: rgba(230,162,60,0.1); color: var(--color-orange); }
.ai-status-text.typing { background: rgba(64,158,255,0.1); color: var(--color-blue); }
.ai-status-text.finished { background: rgba(103,194,58,0.1); color: var(--color-green); }

.ai-body { padding: 15px; background: var(--bg-app); }
.ai-settings-row { display: flex; align-items: center; margin-bottom: 15px; background: var(--bg-card); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); }
.ai-running-indicator { display: inline-flex; align-items: center; margin-left: 15px; color: var(--color-blue); font-weight: bold; animation: pulse 1.5s infinite; }
.ai-running-indicator i { font-size: 16px; margin-right: 6px; }

/* 新增：AI完成时的标记样式 */
.ai-finished-indicator { display: inline-flex; align-items: center; margin-left: 15px; color: var(--color-green); font-weight: bold; }
.ai-finished-indicator i { font-size: 16px; margin-right: 6px; }

.ai-settings-api-ext { display: flex; align-items: center; margin-bottom: 15px; background: rgba(64, 158, 255, 0.05); padding: 10px; border-radius: 4px; border: 1px dashed var(--color-blue); }

.terminal-box { background: #1e1e1e; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); border: 1px solid #333; }
.terminal-header { background: #2d2d2d; padding: 8px 12px; display: flex; align-items: center; border-bottom: 1px solid #111; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.dot-red { background: #ff5f56; } .dot-yellow { background: #ffbd2e; } .dot-green { background: #27c93f; }
.terminal-title { margin-left: 10px; color: #888; font-size: 12px; font-family: Consolas, Monaco, monospace; }

.terminal-actions { display: flex; gap: 15px; }
.action-btn { cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; transition: opacity 0.3s; font-family: Consolas, Monaco, monospace; }
.action-btn:hover { opacity: 0.8; }
.action-btn.copy-btn { color: #409eff; }
.action-btn.clear-btn { color: #f56c6c; }

.terminal-content { 
    padding: 15px; color: #a9b7c6; font-family: Consolas, Monaco, monospace; 
    font-size: 14px; line-height: 1.8; min-height: 150px; max-height: 400px; 
    overflow-y: auto; text-align: justify; 
}
.terminal-content::-webkit-scrollbar { width: 8px; }
.terminal-content::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
.terminal-content::-webkit-scrollbar-thumb:hover { background: #666; }
.terminal-content::-webkit-scrollbar-track { background: #1e1e1e; }

.terminal-content ::v-deep p { margin: 0 0 10px 0; }
.terminal-content ::v-deep h1, .terminal-content ::v-deep h2, .terminal-content ::v-deep h3 { margin: 15px 0 10px 0; color: #fff; font-size: 15px; font-weight: bold; }
.terminal-content ::v-deep ul, .terminal-content ::v-deep ol { margin: 0 0 10px 0; padding-left: 20px; }
.terminal-content ::v-deep li { margin-bottom: 5px; list-style-type: disc; }
.terminal-content ::v-deep strong, .terminal-content ::v-deep b { color: #f56c6c; font-weight: bold; }
.terminal-content ::v-deep code { background-color: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }

.cursor-blink { display: inline-block; width: 8px; height: 15px; background: #67c23a; margin-left: 2px; animation: blink 1s step-end infinite; vertical-align: text-bottom; }

@keyframes blink { 50% { opacity: 0; } }
@keyframes pulse { 50% { opacity: 0.5; } }

.dark-theme .ai-terminal-panel { background: #121212; border-color: #333; }
.dark-theme .ai-body { background: #121212; }
.dark-theme .ai-settings-row { background: #1e1e1e; border-color: #333; }

.table-container { overflow-x: auto; }
.table-container::-webkit-scrollbar { width: 6px; height: 6px; }
.table-container::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background-color: var(--bg-app); color: var(--text-secondary); font-weight: 600; padding: 12px 16px; text-align: left; font-size: 13px; user-select: none; }

.sortable { cursor: pointer; transition: color 0.3s; }
.sortable:hover { color: var(--color-hover); }
.sort-icon::after { content: '⇅'; margin-left: 4px; opacity: 0.3; font-size: 12px; }
.sort-icon.asc::after { content: '↑'; opacity: 1; color: var(--color-blue); }
.sort-icon.desc::after { content: '↓'; opacity: 1; color: var(--color-blue); }

.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 14px; color: var(--text-regular); text-align: left; }
.data-table tr:hover td { background-color: var(--bg-hover); }
.font-bold { font-weight: 600; color: var(--text-primary); }
.rank-badge { display: inline-block; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 4px; background-color: var(--bg-badge); color: var(--text-secondary); font-size: 12px; font-weight: bold; }
.top-rank { background-color: var(--bg-top-rank); color: var(--color-up); }

.industry-name-link { display: inline-flex; align-items: center; cursor: pointer; color: var(--text-primary); transition: all 0.3s; }
.industry-name-link .hover-icon { margin-left: 6px; font-size: 14px; color: var(--color-blue); opacity: 0; transition: opacity 0.3s ease; transform: translateX(-5px); }
.industry-name-link:hover { color: var(--color-blue); }
.industry-name-link:hover .hover-icon { opacity: 1; transform: translateX(0); }

.pagination-wrapper { margin-top: 20px; display: flex; justify-content: center; }
::v-deep .el-pagination.is-background .btn-next, ::v-deep .el-pagination.is-background .btn-prev, ::v-deep .el-pagination.is-background .el-pager li { background-color: var(--bg-app); color: var(--text-regular); border: 1px solid var(--border-color); }
::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active { background-color: var(--color-blue); color: #fff; border-color: var(--color-blue); }
::v-deep .el-pagination__total { color: var(--text-secondary); }

/* 针对深色模式下跳转框背景的补丁 */
.dark-theme ::v-deep .el-pagination__editor.el-input .el-input__inner { background-color: var(--bg-app) !important; border-color: var(--border-color) !important; color: var(--text-primary) !important; }
.dark-theme ::v-deep .el-pagination__jump { color: var(--text-regular) !important; }
/* 新增：针对深色模式下页大小下拉框的背景补丁 */
.dark-theme ::v-deep .el-pagination__sizes .el-input__inner { background-color: var(--bg-app) !important; border-color: var(--border-color) !important; color: var(--text-primary) !important; }

.dark-theme ::v-deep .el-dialog { background-color: var(--bg-card) !important; }
.dark-theme ::v-deep .el-dialog__title { color: var(--text-primary) !important; }
.dark-theme ::v-deep .el-dialog__body { color: var(--text-regular) !important; }
.dark-theme ::v-deep .el-loading-mask { background-color: rgba(30, 30, 30, 0.8) !important; }
.dark-theme ::v-deep .el-input__inner { background-color: var(--bg-app) !important; color: var(--text-primary) !important; border-color: var(--border-color) !important; }

/* 输入框 Append/Prepend 暗黑模式全面适配修复 */
.dark-theme ::v-deep .el-input-group__append,
.dark-theme ::v-deep .el-input-group__prepend {
    background-color: var(--bg-hover) !important;
    border-color: var(--border-color) !important;
    color: var(--text-secondary) !important;
}

.dark-theme ::v-deep .el-date-editor--daterange.el-input__inner { background-color: var(--bg-app) !important; border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-date-editor .el-range-input { background-color: transparent !important; color: var(--text-primary) !important; }
.dark-theme ::v-deep .el-date-editor .el-range-separator { color: var(--text-primary) !important; line-height: 24px; }
.dark-theme ::v-deep .el-date-editor .el-input__icon { color: var(--text-secondary) !important; }

.dark-theme ::v-deep .el-table, .dark-theme ::v-deep .el-table th, .dark-theme ::v-deep .el-table tr, .dark-theme ::v-deep .el-table td, .dark-theme ::v-deep .el-table th.is-leaf, .dark-theme ::v-deep .el-table th.is-group { background-color: var(--bg-card) !important; color: var(--text-regular); border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table th { color: var(--text-secondary); font-weight: 600; }
.dark-theme ::v-deep .el-table::before, .dark-theme ::v-deep .el-table::after { background-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table--border, .dark-theme ::v-deep .el-table--group { border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td { background-color: var(--bg-progress) !important; }


/* ============================================================================== */
/* 彻底修复：表格固定列与普通列之间的黑色边框问题 */
/* ============================================================================== */
.dark-theme ::v-deep .el-table__fixed-right,
.dark-theme ::v-deep .el-table__fixed {
    background-color: transparent !important;
    box-shadow: none !important; /* 移除强制常驻的阴影，避免看起来像黑色边框 */
    border-left: none !important; /* 去除固定列左侧强制设置的竖向黑线 */
    border-right: none !important;
}

/* 当表格向左滚动时，恢复原生的柔和过渡阴影，而不使用刺眼的实线边框 */
.dark-theme ::v-deep .el-table.is-scrolling-left .el-table__fixed-right,
.dark-theme ::v-deep .el-table.is-scrolling-middle .el-table__fixed-right {
    box-shadow: -3px 0 6px -2px rgba(0, 0, 0, 0.3) !important;
}

/* 去除导致黑色/白线穿透的伪元素 */
.dark-theme ::v-deep .el-table__fixed-right::before,
.dark-theme ::v-deep .el-table__fixed::before {
    display: none !important;
}

.dark-theme ::v-deep .el-table__fixed-right-patch {
    background-color: var(--bg-card) !important;
    border-bottom: 1px solid var(--border-color) !important;
}

/* 确保表头、表体的每一行只有横向边框，没有竖向边框，与其他普通列保持一致 */
.dark-theme ::v-deep .el-table__fixed-right th,
.dark-theme ::v-deep .el-table__fixed-right td {
    border-left: none !important;
    border-right: none !important;
    background-color: var(--bg-card); /* 默认底色 */
}

/* 解决固定列斑马纹和Hover时底色同步问题 */
.dark-theme ::v-deep .el-table--striped .el-table__fixed-body-wrapper .el-table__body tr.el-table__row--striped td,
.dark-theme ::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td {
    background-color: var(--bg-progress) !important;
}

/* ============================================================================== */
/* 彻底修复：表格整行 Hover 同步高亮（解决 Fixed 列导致的部分不高亮问题） */
/* ============================================================================== */
::v-deep .el-table__body tr:hover > td,
::v-deep .el-table__body tr.hover-row > td {
    background-color: var(--bg-hover) !important;
}

.dark-theme ::v-deep .el-table__body tr:hover > td,
.dark-theme ::v-deep .el-table__body tr.hover-row > td {
    background-color: var(--bg-hover) !important;
}
/* ============================================================================== */


/* 优化表单边框和背景 */
.dark-theme ::v-deep .el-form-item__label {
    color: var(--text-regular) !important;
}

@media (max-width: 768px) { .header-left { flex-direction: column; gap: 5px; align-items: flex-start; } }

.stock-code-link { color: var(--color-blue); cursor: pointer; font-weight: bold; font-family: "Consolas", "Monaco", monospace; transition: all 0.3s ease; display: inline-flex; align-items: center; }
.stock-code-link i { margin-left: 4px; font-size: 13px; opacity: 0; transform: translateX(-3px); transition: all 0.3s ease; }
.stock-code-link:hover { color: var(--color-hover); text-decoration: underline; }
.stock-code-link:hover i { opacity: 1; transform: translateX(0); }
.flush-filter-stocks-data { cursor: pointer; }
.custom-column .el-tooltip { white-space: normal !important; word-wrap: break-word !important; max-width: 300px; word-break: break-all; }

.trend-selector-wrapper {
    display: inline-flex; align-items: center; gap: 10px; background: var(--bg-hover);
    padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border-color); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}
.dark-theme .trend-selector-wrapper { background: rgba(255, 255, 255, 0.03); }
.filter-label { font-size: 13px; font-weight: 600; color: var(--text-regular); }
.custom-trend-radio ::v-deep .el-radio-button__inner { background: transparent !important; border: none !important; color: var(--text-regular) !important; border-radius: 15px !important; padding: 6px 16px !important; font-weight: bold; transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1); font-size: 13px; box-shadow: none !important; }
.custom-trend-radio ::v-deep .el-radio-button__orig-radio:checked + .el-radio-button__inner { color: #ffffff !important; }
.custom-trend-radio ::v-deep .el-radio-button:first-child.is-active .el-radio-button__inner { background: linear-gradient(135deg, #ff7875, #f5222d) !important; box-shadow: 0 4px 10px rgba(245, 34, 45, 0.3) !important; }
.custom-trend-radio ::v-deep .el-radio-button:last-child.is-active .el-radio-button__inner { background: linear-gradient(135deg, #4dccc6, #00bfa5) !important; box-shadow: 0 4px 10px rgba(0, 191, 165, 0.3) !important; }
.trend-btn-content { display: inline-flex; align-items: center; gap: 4px; }

/* 日志数据展示区美化 */
.log-params-view {
    max-height: 80px; 
    overflow-y: auto; 
    font-family: Consolas, Monaco, monospace; 
    font-size: 12px; 
    background: var(--bg-hover); 
    padding: 8px; 
    border-radius: 4px;
    border: 1px solid var(--border-color);
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* ================== 新增监控条件单弹窗相关精美卡片样式 ================== */
.monitor-dialog-header {
    display: flex;
    align-items: center;
    padding-bottom: 15px;
    border-bottom: 1px dashed var(--border-color);
}
.monitor-stock-name {
    font-size: 18px;
    font-weight: bold;
    color: var(--text-primary);
    margin-right: 8px;
}
.monitor-stock-code {
    font-size: 14px;
    color: var(--text-secondary);
    font-family: Consolas, Monaco, monospace;
}
.monitor-form-container {
    padding-top: 15px;
}
.dark-theme-alert {
    background-color: rgba(64, 158, 255, 0.1) !important;
    color: #409eff !important;
    border: 1px solid rgba(64, 158, 255, 0.2);
}

.monitor-card {
    border-radius: 6px;
    margin-top: 15px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
}
.monitor-card .card-header {
    padding: 8px 12px;
    font-size: 13px;
    font-weight: bold;
    background: var(--bg-hover);
    border-bottom: 1px solid var(--border-color);
}
.monitor-card .card-body {
    padding: 15px 15px 15px 5px;
}
.up-card {
    border-left: 3px solid var(--color-up);
}
.down-card {
    border-left: 3px solid var(--color-down);
}

/* 飞书推送横幅样式 */
.feishu-hint {
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #409eff;
    background: rgba(64, 158, 255, 0.1);
    padding: 8px;
    border-radius: 4px;
    border: 1px dashed rgba(64, 158, 255, 0.3);
}
.feishu-hint i {
    margin-right: 6px;
    font-size: 16px;
}

/* 监控面板内部元素夜间模式自适应 */
.dark-theme .feishu-hint {
    background: rgba(64, 158, 255, 0.05);
}
.dark-theme .monitor-card {
    background: rgba(255, 255, 255, 0.02);
}
.dark-theme .monitor-card .card-header {
    background: rgba(255, 255, 255, 0.04);
}

/* ================== 表格内部：直观的微型监控数据看板 ================== */
.monitor-info-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 0;
}
.monitor-item {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    background: var(--bg-app);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 3px 8px;
    line-height: 1.4;
    box-shadow: 0 1px 2px var(--shadow-color);
}
.monitor-item .m-label {
    color: var(--text-secondary);
    margin-right: 8px;
}
.monitor-item .m-value {
    font-weight: bold;
    font-family: "Consolas", "Monaco", monospace;
}
.monitor-item .m-value.price {
    color: var(--color-up);
}
.monitor-item .m-value.pct {
    color: var(--color-orange);
}
.no-monitor-text {
    color: var(--text-secondary);
    font-size: 12px;
    font-style: italic;
}

/* ================== 新增：已触发监控的高亮动画警报标签 ================== */
.monitor-triggered-tag {
    animation: alert-blink 1.5s infinite;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
    padding: 0 8px;
    font-size: 12px;
}
@keyframes alert-blink {
    0%, 100% { box-shadow: 0 0 5px rgba(245, 108, 108, 0.4); opacity: 1; }
    50% { box-shadow: 0 0 12px rgba(245, 108, 108, 0.9); opacity: 0.8; }
}
</style>

<style>
.dark-theme-date-picker, .dark-theme-select, .dark-theme-popover { background-color: #1e1e1e !important; border-color: #333333 !important; color: #b0b0b0 !important; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.5) !important; }
.dark-theme-date-picker.el-popper[x-placement^="bottom"] .popper__arrow::after, .dark-theme-select.el-popper[x-placement^="bottom"] .popper__arrow::after, .dark-theme-popover.el-popper[x-placement^="bottom"] .popper__arrow::after { border-bottom-color: #1e1e1e !important; }
.dark-theme-date-picker.el-popper[x-placement^="bottom"] .popper__arrow, .dark-theme-select.el-popper[x-placement^="bottom"] .popper__arrow, .dark-theme-popover.el-popper[x-placement^="bottom"] .popper__arrow { border-bottom-color: #333333 !important; }
.dark-theme-date-picker.el-popper[x-placement^="top"] .popper__arrow::after, .dark-theme-select.el-popper[x-placement^="top"] .popper__arrow::after, .dark-theme-popover.el-popper[x-placement^="top"] .popper__arrow::after { border-top-color: #1e1e1e !important; }
.dark-theme-date-picker.el-popper[x-placement^="top"] .popper__arrow, .dark-theme-select.el-popper[x-placement^="top"] .popper__arrow, .dark-theme-popover.el-popper[x-placement^="top"] .popper__arrow { border-top-color: #333333 !important; }
.dark-theme-date-picker .el-picker-panel__body-wrapper, .dark-theme-date-picker .el-picker-panel__sidebar { background-color: #1e1e1e !important; }
.dark-theme-date-picker .el-picker-panel__sidebar { border-right: 1px solid #333333 !important; }
.dark-theme-date-picker .el-date-range-picker__content.is-left { border-right: 1px solid #333333 !important; }
.dark-theme-date-picker .el-picker-panel__shortcut { color: #b0b0b0 !important; }
.dark-theme-date-picker .el-picker-panel__shortcut:hover { background-color: #2c2c2c !important; color: #409eff !important; }
.dark-theme-date-picker .el-date-range-picker__header { color: #e0e0e0 !important; }
.dark-theme-date-picker .el-picker-panel__icon-btn { color: #b0b0b0 !important; }
.dark-theme-date-picker .el-picker-panel__icon-btn:hover { color: #409eff !important; }
.dark-theme-date-picker th { color: #b0b0b0 !important; border-bottom: 1px solid #333333 !important; }
.dark-theme-date-picker .el-date-table td { color: #b0b0b0; }
.dark-theme-date-picker .el-date-table td.in-range div { background-color: #333333 !important; }
.dark-theme-date-picker .el-date-table td.in-range div:hover { background-color: #444444 !important; }
.dark-theme-date-picker .el-date-table td.start-date span, .dark-theme-date-picker .el-date-table td.end-date span, .dark-theme-date-picker .el-date-table td.current span { background-color: #409eff !important; color: #ffffff !important; }
.dark-theme-date-picker .el-date-table td.available:hover { color: #409eff !important; }
.dark-theme-date-picker .el-date-table td.next-month, .dark-theme-date-picker .el-date-table td.prev-month { color: #555555 !important; }
.dark-theme-select .el-select-dropdown__item { color: #b0b0b0 !important; }
.dark-theme-select .el-select-dropdown__item.hover, .dark-theme-select .el-select-dropdown__item:hover { background-color: #2c2c2c !important; }
.dark-theme-select .el-select-dropdown__item.selected { color: #409eff !important; background-color: #333333 !important; font-weight: bold; }
.filter-date-search { display: flex; align-items: center; gap: 10px; }
.dark-theme-popover { color: #e0e0e0 !important; }
</style>
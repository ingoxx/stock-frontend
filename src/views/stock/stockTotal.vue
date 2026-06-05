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

            <!-- 2. 右侧操作区：自选股入口 + 主题切换 -->
            <div style="display: flex; gap: 12px; align-items: center;">
                <div class="theme-toggle" @click="followedDialogVisible = true" title="查看自选股">
                    <i class="el-icon-star-on" style="color: #e6a23c;"></i>
                    <span class="toggle-text">我的自选 ({{ followedStocks.length }})</span>
                </div>
                <!-- <div class="theme-toggle" @click="toggleTheme" title="切换主题">
                    <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
                    <span class="toggle-text">{{ isDarkMode ? '开灯' : '关灯' }}</span>
                </div> -->
            </div>
        </div>

        <!-- ================== 全新 Grid 布局核心大盘数据卡片 ================== -->
        <div class="summary-card card">
            
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
                            <span class="ratio">({{ upPercent.toFixed(1) }}%)</span>
                        </div>
                        <div class="detail-item text-down">
                            <span class="icon">▼</span> 跌: <span class="d-val">{{ marketSummary.down }}</span>
                            <span class="ratio">({{ downPercent.toFixed(1) }}%)</span>
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
                
                <!-- 走势方向精美切换组件 -->
                <div class="trend-selector-wrapper">
                    <span class="filter-label">走势方向</span>
                    <el-radio-group v-model="trend" size="small" class="custom-trend-radio">
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
                <el-input v-model="lookBackDays" placeholder="近多少个交易日(默认是近10个)" clearable style="width: 240px;"></el-input>
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
            <div class="chart-section card">
                <div class="section-title">
                    <span class="indicator"></span> 热门行业成交额 Top 10 (单位：亿)
                </div>
                <div ref="industryChart" class="chart-container"></div>
            </div>

            <div class="chart-section card">
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
                <el-pagination background layout="total, prev, pager, next" :current-page.sync="currentPage"
                    :page-size="pageSize" :total="formattedIndustries.length" @current-change="handlePageChange">
                </el-pagination>
            </div>
        </div>

        <!-- ================== 我的自选/关注股票弹窗 ================== -->
        <el-dialog v-dialogDrag title="我的自选 / 关注股票" :visible.sync="followedDialogVisible" width="70%"
            :close-on-click-modal="false" :center="true">
            
            <div class="dialog-header-actions section-search-1" style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <el-input v-model="searchFollowedQuery" placeholder="输入股票代码或名称搜索" prefix-icon="el-icon-search" clearable style="width: 230px;" size="small"></el-input>
                    <el-button type="success" size="small" icon="el-icon-refresh" @click="refreshFollowedRealTime()" :loading="followedLoading">刷新自选行情</el-button>
                </div>
                <el-button type="primary" size="small" icon="el-icon-upload" @click="syncFollowedToServer()" :loading="followedLoading">同步至服务器</el-button>
            </div>

            <el-table :data="processedFollowedStocks" v-loading="followedLoading" stripe style="width: 100%" max-height="450" size="small">
                <el-table-column prop="code" label="股票代码" min-width="110">
                    <template slot-scope="scope">
                        <span class="stock-code-link" @click="handleOpenChart(scope.row)">
                            {{ scope.row.code }} <i class="el-icon-data-line"></i>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="股票名称" min-width="130"></el-table-column>
                <el-table-column prop="pct_chg" label="今日涨跌幅" min-width="110">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.pct_chg)">
                            {{ scope.row.pct_chg > 0 ? '+' : '' }}{{ scope.row.pct_chg }}%
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="close" label="最新价" min-width="110"></el-table-column>
                <el-table-column prop="open" label="今日开盘" min-width="110"></el-table-column>
                <el-table-column prop="high" label="最高价" min-width="110">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.high - scope.row.open)">{{ scope.row.high }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="low" label="最低价" min-width="110">
                    <template slot-scope="scope">
                        <span :class="getPriceClass(scope.row.low - scope.row.open)">{{ scope.row.low }}</span>
                    </template>
                </el-table-column>
                <el-table-column prop="volume" label="成交额(亿)" min-width="130">
                    <template slot-scope="scope">
                        <span>{{ formatVolumeInYi(scope.row.volume) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="120" align="center">
                    <template slot-scope="scope">
                        <el-button type="danger" size="mini" icon="el-icon-delete" @click="unfollowStock(scope.row)">取消关注</el-button>
                    </template>
                </el-table-column>
            </el-table>
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
                    <el-button type="primary" icon="el-icon-search" size="mini" :loading="stocksLoading" @click="get_date_range_stock_datas">查询</el-button>
                </div>
                <div class="search-wrapper">
                    <el-button type="success" icon="el-icon-odometer" size="mini" :loading="stocksLoading" @click="get_stock_rt_data_v2(true)">实时</el-button>
                </div>
                <div class="search-wrapper">
                    <el-button type="warning" icon="el-icon-star-off" size="mini" @click="followCurrentStock">关注当前股票</el-button>
                </div>
            </div>

            <!-- ======== 全新：真正 AI 自然语言研判模块 ======== -->
            <div class="ai-terminal-panel" style="margin-top: 15px;">
                <div class="panel-header ai-header" @click="showAIAnalysis = !showAIAnalysis">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="el-icon-magic-stick" style="color: #67c23a; font-size: 18px;"></i> 
                        <span style="font-weight: bold; font-size: 15px; color: var(--text-primary)">AI 通俗易懂走势研判模型</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span v-if="aiStatus !== 'idle'" class="ai-status-text" :class="aiStatus">
                            {{ aiStatus === 'loading' ? '正在连接神经中枢...' : (aiStatus === 'typing' ? 'AI 正在输出研判...' : '生成完毕') }}
                        </span>
                        <i :class="showAIAnalysis ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                    </div>
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
                            
                            <!-- 立即生成按钮与停止按钮动态切换 (确保 100% 随时可点，去除了按钮本身 loading 的事件封锁) -->
                            <el-button v-if="aiStatus === 'idle' || aiStatus === 'finished'" type="primary" size="mini" @click="triggerAIGeneration">
                                <i class="el-icon-s-promotion"></i> 立即生成分析
                            </el-button>
                            <el-button v-else type="danger" size="mini" @click="stopAIGeneration" icon="el-icon-video-pause">
                                停止生成
                            </el-button>

                            <!-- AI 生成时的圆形进度提示栏 (不阻塞按钮点击) -->
                            <div v-if="aiStatus === 'loading' || aiStatus === 'typing'" class="ai-running-indicator">
                                <i class="el-icon-loading"></i>
                                <span>{{ aiStatus === 'loading' ? '正在与大脑神经中枢通讯...' : '数据研判中...' }}</span>
                            </div>
                        </div>
                        
                        <!-- AI 高级接口设置区 -->
                        <div class="ai-settings-api-ext" v-if="aiConfig.mode === 'api'">
                            <el-select v-model="aiConfig.preset" size="mini" @change="handleAiPresetChange" placeholder="选择预设" style="width: 165px; margin-right: 10px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                <el-option label="Gemini (默认)" value="gemini"></el-option>
                                <el-option label="DeepSeek" value="deepseek"></el-option>
                            </el-select>
                            
                            <el-input v-model="aiConfig.apiUrl" placeholder="接口 URL" size="mini" style="width: 320px; margin-right: 10px;"></el-input>
                            
                            <!-- 
                                【重点优化：模型选择器】
                                1. 替换为了可模糊检索、可由用户直接输入新模型名称 (allow-create) 的下拉选择框
                                2. 模型绑定根据 preset 联动，支持 Gemini 的多个新型号以及 DeepSeek 的 chat 选项
                            -->
                            <el-select v-model="aiConfig.model" filterable allow-create placeholder="选择或输入模型" size="mini" style="width: 220px; margin-right: 10px;" :popper-class="isDarkMode ? 'dark-theme-select' : ''">
                                <el-option v-for="item in availableModels" :key="item" :label="item" :value="item"></el-option>
                            </el-select>
                            
                            <el-input v-model="aiConfig.apiKey" placeholder="在此输入你的 API Key (本地保存)" size="mini" show-password style="width: 265px;"></el-input>
                        </div>

                        <!-- 终端打字机输出区 -->
                        <div class="terminal-box">
                            <div class="terminal-header">
                                <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
                                <span class="terminal-title">Stock_AI_Agent_Terminal ~ {{ currentStockCode }} [{{ aiConfig.mode === 'api' ? aiConfig.preset.toUpperCase() : 'LOCAL_ENGINE' }}]</span>
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

        <!-- ================== 个股走势图弹窗 ================== -->
        <el-dialog v-dialogDrag :center="true" :title="`${currentStockName} (${currentStockCode}) - 近${historyDays}天涨跌幅走势`"
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
                        <span class="icon history-detail" @click="showStock30DaysDetail"><i :class="isRunIcon"></i> {{ historyDays }}天详情</span>
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

            <div class="pagination-wrapper" style="margin-top: 15px; text-align: right;">
                <el-pagination background layout="total, prev, pager, next" :current-page.sync="stockCurrentPage"
                    :page-size="stockPageSize" :total="processedStocks.length" @current-change="handleStockPageChange">
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
    get_stock_history_data
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

            trend: 2, // 默认选中的走势方向：2 为连续下跌(回调)，1 为连续上涨
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

            showAlgoParams: false,
            showAIAnalysis: false, 
            showExtremesTable: false, 
            
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
                steadySupportWeight: 0.6,
                breakoutPremium: 1.005,
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
            followedDialogVisible: false
        };
    },
    computed: {
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
        extremesTableData() {
            const data = this.currentStockHistoryData;
            if (!data || data.length === 0) return [];

            const getExtremes = (key) => {
                let maxObj = null; let minObj = null;
                for (let i = 0; i < data.length; i++) {
                    const rawVal = data[i][key];
                    if (rawVal === null || rawVal === undefined || rawVal === '') continue;
                    const currentVal = Number(rawVal);
                    if (isNaN(currentVal)) continue;

                    if (!maxObj || currentVal >= Number(maxObj[key])) maxObj = data[i];
                    if (!minObj || currentVal <= Number(minObj[key])) minObj = data[i];
                }
                return {
                    max: maxObj ? { val: Number(maxObj[key]), day: maxObj.day } : { val: 0, day: '-' },
                    min: minObj ? { val: Number(minObj[key]), day: minObj.day } : { val: 0, day: '-' }
                };
            };

            const metrics = [
                { key: 'pct_chg', label: '涨跌幅' }, { key: 'close', label: '收盘价' },
                { key: 'open', label: '开盘价' }, { key: 'high', label: '最高价' },
                { key: 'low', label: '最低价' }, { key: 'volume', label: '成交额' }
            ];

            const result = metrics.map(m => {
                const ex = getExtremes(m.key);
                return { label: m.label, key: m.key, maxVal: ex.max.val, maxDay: ex.max.day, minVal: ex.min.val, minDay: ex.min.day };
            });

            const len = data.length;
            if (len > 0) {
                const latestItem = data[len - 1];
                const C = Number(latestItem.close), L = Number(latestItem.low), H = Number(latestItem.high);
                const latestVol = Number(latestItem.volume), latestPctChg = Number(latestItem.pct_chg);
                
                // 【修复】：显式解构所有的参数值，确保 Vue 对各个参数建立完善的计算依赖跟踪体系
                const p = this.algoParams; 
                const _mode = p.strategyMode;
                const _aggr = p.aggrTraceWeight;
                const _steady = p.steadySupportWeight;
                const _premium = p.breakoutPremium;
                const _discount = p.panicDiscount;

                let totalVolume = 0, totalTurnover = 0; 
                let periodHigh = -Infinity, periodLow = Infinity, validDays = 0;

                for (let i = 0; i < len; i++) {
                    const vol = Number(data[i].volume), closePrice = Number(data[i].close);
                    const highPrice = Number(data[i].high), lowPrice = Number(data[i].low);

                    if (!isNaN(closePrice) && !isNaN(lowPrice)) {
                        const tp = (highPrice + lowPrice + closePrice) / 3;
                        if (!isNaN(vol) && vol > 0) { totalVolume += vol; totalTurnover += tp * vol; }
                        if (highPrice > periodHigh) periodHigh = highPrice;
                        if (lowPrice < periodLow) periodLow = lowPrice;
                        validDays++;
                    }
                }

                const avgVol = validDays > 0 ? (totalVolume / validDays) : 1;
                const vwap = totalVolume > 0 ? (totalTurnover / totalVolume) : C;
                if (periodLow === Infinity) periodLow = L;
                if (periodHigh === -Infinity) periodHigh = H;

                const volRatio = latestVol / avgVol;
                const range = periodHigh - periodLow;
                const positionRatio = range > 0 ? (C - periodLow) / range : 0.5; 

                let currentMode = _mode, envDesc = "";
                if (currentMode === 'auto') {
                    if (positionRatio > 0.65 && volRatio > 1.2 && latestPctChg > 1) { currentMode = 'trend'; envDesc = "量价齐升(自适应:顺势右侧)"; }
                    else if (positionRatio < 0.35 && volRatio > 1.2 && latestPctChg < -1) { currentMode = 'contrarian'; envDesc = "恐慌杀跌(自适应:逆向左侧)"; }
                    else if (volRatio < 0.6 && positionRatio < 0.4) { currentMode = 'contrarian'; envDesc = "极致地量(自适应:左侧潜伏)"; }
                    else { currentMode = 'box'; envDesc = "常态博弈(自适应:均值回归)"; }
                } else {
                    envDesc = currentMode === 'trend' ? '强制:顺势右侧' : (currentMode === 'contrarian' ? '强制:逆向左侧' : '强制:箱体震荡');
                }

                let dayMid = (H + L + C) / 3; 
                let aggressiveBuy = 0, aggrDesc = "";

                // 【修复】：将 _aggr, _premium, _discount 参数融进所有走势分支中，确保用户随时滑动滑块都有回测反馈
                if (currentMode === 'trend') {
                    let base = C * _aggr + dayMid * (1 - _aggr);
                    aggressiveBuy = base * _premium;
                    aggrDesc = `【顺势高举高打】 溢价抢筹 (${envDesc})`;
                } else if (currentMode === 'contrarian') {
                    let base = L * _aggr + dayMid * (1 - _aggr);
                    aggressiveBuy = base * _discount;
                    aggrDesc = `【逆势深度埋伏】 偏离现价打折接刀 (${envDesc})`;
                } else {
                    // 箱体模式采用折价与溢价的均值，并使用收盘与极低的调和均价作为基础
                    let base = ((C + L) / 2) * _aggr + dayMid * (1 - _aggr);
                    let mixedDiscount = (_premium + _discount) / 2;
                    aggressiveBuy = base * mixedDiscount;
                    aggrDesc = `【箱体常态低吸】 均价与下沿加权挂单 (${envDesc})`;
                }

                let steadyBuy = 0, steadyDesc = "";
                let structuralSupport = (periodLow * _steady) + (vwap * (1 - _steady));

                if (currentMode === 'trend') {
                    // 【修复】：顺势不破 VWAP 稳健点也带入底层结构防守权重
                    steadyBuy = vwap * (1 - _steady) + structuralSupport * _steady; 
                    steadyDesc = `【顺势波段防守】 依托大众持仓与底层防守支撑 (${envDesc})`;
                } else if (currentMode === 'contrarian') {
                    // 极限杀跌采用结构支撑并附带打折系数进行极值接盘
                    steadyBuy = structuralSupport * _discount;
                    steadyDesc = `【结构大底极限防守】 极限打折接盘 (${envDesc})`;
                } else {
                    steadyBuy = structuralSupport;
                    steadyDesc = `【箱体下沿综合防守】 综合大底支撑权重:${(_steady*100).toFixed(0)}% (${envDesc})`;
                }

                // 统一底线安全风控约束（买点必须合乎逻辑）
                if (aggressiveBuy > C * 1.09) aggressiveBuy = C * 1.09;
                if (steadyBuy >= aggressiveBuy) steadyBuy = aggressiveBuy * 0.98;

                result.push({ label: '推荐买入价', key: 'buy_price', maxVal: aggressiveBuy, maxDay: aggrDesc, minVal: steadyBuy, minDay: steadyDesc });
            }
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
        
        // ================= 联动大模型的可选列表 =================
        availableModels() {
            if (this.aiConfig.preset === 'gemini') {
                return [
                    'gemini-3.1-flash-lite',
                    'gemini-3.1-pro-preview',
                    'gemini-3.5-flash'
                ];
            } else if (this.aiConfig.preset === 'deepseek') {
                return [
                    'deepseek-chat'
                ];
            }
            return [];
        }
    },
    watch: {
        customSearchQuery() { this.customSearchCurrentPage = 1; },
        searchStockQuery() { this.stockCurrentPage = 1; },
        aiConfig: {
            deep: true,
            handler(newVal) {
                localStorage.setItem('stock_ai_config', JSON.stringify(newVal));
            }
        },
        isDarkMode() {
            this.$nextTick(() => {
                this.initChart(); this.initInflowChart();
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
        if (this.industryQueryTimer) { clearTimeout(this.industryQueryTimer); this.industryQueryTimer = null; }
        if (this.newsLoadingTimer) { clearTimeout(this.newsLoadingTimer); this.newsLoadingTimer = null; }
        if (this._aiAbortController) { this._aiAbortController.abort(); }
        window.removeEventListener('resize', this.resizeChart);
        if (this.chartInstance) this.chartInstance.dispose();
        if (this.inflowChartInstance) this.inflowChartInstance.dispose();
        this.$root.$off('theme-change');
    },

    mounted() {
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
        initAiConfig() {
            const saved = localStorage.getItem('stock_ai_config');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    this.aiConfig = Object.assign({}, this.aiConfig, parsed);
                } catch (e) {
                    console.error('解析本地 AI 缓存失败:', e);
                }
            }
        },

        handleAiPresetChange(val) {
            if (val === 'deepseek') {
                this.aiConfig.apiUrl = 'https://api.deepseek.com/chat/completions';
                this.aiConfig.model = 'deepseek-chat';
            } else if (val === 'gemini') {
                this.aiConfig.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
                this.aiConfig.model = 'gemini-3.5-flash';
            }
        },

        // ================= 停止当前大模型生成 =================
        stopAIGeneration() {
            // 切断 AbortController 拦截真实网络请求
            if (this._aiAbortController) {
                this._aiAbortController.abort();
                this._aiAbortController = null;
            }
            // 变更状态为 finished 立即中断本地输出
            if (this.aiStatus === 'loading' || this.aiStatus === 'typing') {
                this.aiStatus = 'finished';
                this.aiStreamedText += `\n\n<span style="color:#e6a23c; font-weight:bold;">[已手动停止生成]</span>`;
            }
        },

        async triggerAIGeneration() {
            if (this.aiStatus === 'loading' || this.aiStatus === 'typing') return;
            
            const data = this.currentStockHistoryData.filter(item => !isNaN(Number(item.close)) && !isNaN(Number(item.pct_chg)));
            if (!data || data.length < 5) {
                Message.warning('数据过少，无法执行有效的 AI 研判');
                return;
            }

            this.aiStatus = 'loading';
            this.aiStreamedText = '';
            
            if (this.aiConfig.mode === 'api') {
                if (!this.aiConfig.apiKey || !this.aiConfig.apiUrl) {
                    Message.warning('检测到 API Key 或 URL 为空，系统已自动切回本地离线极速引擎');
                    this.aiConfig.mode = 'local';
                    this.triggerAIGeneration();
                    return;
                }
                await this.callCloudLLM(data);
            } else {
                this.runLocalNLP(data);
            }
        },

        // --- 1. 真·云端大模型 API 调用 (重点升级：容错提取和完整报错追踪) ---
        async callCloudLLM(data) {
            let fullRawResponse = ''; // 完整记录从服务端收到的所有纯文本，用于调试和报错

            try {
                const simplifiedData = data.map(d => `股票名称:${this.currentStockName},股票代码:${d.code},日期:${d.day},开盘:${d.open},收盘:${d.close},最高:${d.high},最低:${d.low},涨跌幅:${d.pct_chg}%,成交额:${d.volume}`).join(' | ');
                
                const prompt = `你是一位客观、严谨的【A股交易时间序列数据高级特征诊断官】。你的职责是从纯粹的数据科学、历史回溯与统计学视角，对输入的交易数据集（日期、开盘、收盘、最高、最低、涨跌幅、成交额）进行多维度的、连续多日动态趋势的“白话翻译”与“资金情绪深度诊断”。

【重要安全红线】：本任务属于“历史交易特征分析与多维数据统计”的科学科普范畴，禁止进行任何未来走势预测、禁止推荐任何买卖方向。请在回答首行加粗输出免责声明：“本内容仅为历史交易时间序列数据的客观回顾与多维统计翻译，不代表任何投资决策建议。”

【近期关键数据】
这个数据是最近${data.length}天的历史数据，包含了开盘价、收盘价、最高价、最低价、涨跌幅和成交额等信息。数据格式如下：
${simplifiedData}

【多维度深度特征诊断要求】
请针对上方数据集，严谨地完成以下四大维度的“多日连续动态特征诊断”（必须结合具体的日期、价格、成交额数值进行精准深度分析）：

### 📊 维度一：多日连续“成交额趋势”专项诊断（核心）
请在整个数据集中，检索是否存在连续2天或3天以上“成交额持续放大”或“成交额持续萎缩”的现象，并进行白话深度翻译：
- 【成交额持续放大（放量）意味着什么？】：大白话翻译这是不是意味着资金博弈烈度在连续升级？（是有人在疯狂不计成本割肉，还是有大资金在连续进场抢筹码？请结合当时的涨跌幅给出解释）。
- 【成交额持续萎缩（缩量）意味着什么？】：大白话翻译这是否意味着市场陷入交易冰点？（是不是说明多空双方都开始选择“躺平”，没人想买也没人想卖？后续可能会发生什么方向选择？）。

### 📈 维度二：多日连续“量价协同特征”深度解译
请不要割裂价格与成交额，必须将连续几日的“成交额趋势”与“收盘价趋势”合并在一起，诊断是否存在以下历史特征并白话解释：
- 【价格上涨 + 成交额连续萎缩（缩量上涨）】：大白话翻译这说明了什么？（例如：虽然价格涨了，但参与的资金一天比一天少，说明是“无量空涨”，筹码可能锁定很好，但也说明没有新资金捧场）。
- 【价格下跌 + 成交额连续萎缩（缩量下跌）】：大白话翻译这说明了什么？（例如：虽然一直在跌，但卖出的资金没有变大，说明没有引发恐慌性的割肉潮，想卖的人卖得差不多了）。
- 【价格下跌 + 成交额连续放大（放量下跌）】：大白话翻译这说明了什么？（例如：有人在惊慌失措地割肉抛售，但同时底下也有大资金在疯狂接盘，多空双方在某一天发生了激烈的大交手）。

### 🔍 维度三：日内波动率（高低点跨度）的连续演变诊断
请计算并观察每日「最高价 - 最低价」的差值与振幅，在连续多日内是处于“连续扩大”还是“连续收窄”状态，并翻译其代表的情绪：
- 【波动空间连续收窄】：（大白话翻译：多空双方是不是打累了？行情是不是陷入极度纠结的‘变盘前夜’？）。
- 【波动空间连续放大】：（大白话翻译：市场盘中情绪是不是极度不稳定，多空震荡过于剧烈？）。

### 🗺️ 维度四：历史高频密集交投区与重心漂移
- 【价格重心变化】：纵观整个周期，每日收盘价的平均重心是在向上移还是向下移？
- 【历史托底区间】：根据这几天的整体数据，指出哪个具体价格区间是“资金连续多次托住、一跌到这里就缩量不跌或放量反弹”的【历史波动下沿区间】（即数据层面的‘资金防守线’），白话翻译这个区间在历史数据中的支撑逻辑。

【排版要求】：直接输出诊断报告。使用清晰的 Markdown 标题与列表排版，并严格使用HTML标签标注数据：<b style="color:#f56c6c">红色突出上涨、放量突破或托底等积极数据特征</b>，<b style="color:#67c23a">绿色突出下跌、连续缩量或抛压等消极数据特征</b>。`;

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
                    } catch(e) {
                        errText = await response.text();
                    }
                    throw new Error(`HTTP ${response.status}: ${errText}`);
                }
                
                this.aiStatus = 'typing';
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let isDone = false;
                let hasReceivedData = false;

                while (!isDone) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    hasReceivedData = true;
                    const chunkStr = decoder.decode(value, { stream: true });
                    fullRawResponse += chunkStr; // 持续累计所有原始响应报文
                    buffer += chunkStr;

                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // 保留不完整的最后一行片段

                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;
                        
                        // 1. 标准流式返回解析 (SSE: Server-Sent Events)
                        if (line.startsWith('data:')) {
                            const jsonStr = line.substring(5).trim();
                            if (jsonStr === '[DONE]') {
                                isDone = true;
                                break;
                            }
                            try {
                                const json = JSON.parse(jsonStr);
                                if (json.choices && json.choices.length > 0) {
                                    const choice = json.choices[0];
                                    
                                    // 提取文本
                                    if (choice.delta && choice.delta.content) {
                                        this.aiStreamedText += choice.delta.content;
                                    }
                                    
                                    // 检查是否遇到非正常原因停止 (比如 safety 安全拦截、内容过滤)
                                    if (choice.finish_reason && choice.finish_reason !== 'stop' && choice.finish_reason !== null) {
                                        console.warn("API 流数据被中断，异常停止原因(finish_reason):", choice.finish_reason);
                                    }
                                }
                            } catch (e) {
                                // 静默跳过不完整 JSON 解析
                            }
                        } else {
                            // 2. 降级：不满足 SSE 规范 of 纯 JSON 返回（可能是鉴权、参数错误或直接下发的全量报文）
                            try {
                                const json = JSON.parse(line);
                                if (json.error) {
                                    throw new Error(json.error.message || JSON.stringify(json.error));
                                } else if (json.choices && json.choices[0] && json.choices[0].message) {
                                    this.aiStreamedText += json.choices[0].message.content || '';
                                }
                            } catch(e) {}
                        }
                    }
                }
                
                // 处理可能留存在 buffer 里的最后一块文本
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
                            if (json.error) {
                                throw new Error(json.error.message || JSON.stringify(json.error));
                            } else if (json.choices && json.choices[0] && json.choices[0].message) {
                                this.aiStreamedText += json.choices[0].message.content || '';
                            }
                        } catch(e) {}
                    }
                }

                // 【核心拦截】：如果返回 200，但拼凑出来的内容完全为空
                if (!this.aiStreamedText || !this.aiStreamedText.trim()) {
                    console.error("【AI请求异常】HTTP 返回了 200，但未能解析到任何文本内容。\n完整原始返回报文如下：\n", fullRawResponse);
                    throw new Error(`接口通讯正常 (200 OK) 但未返回有效内容，可能是触发了平台内容审查限制或接口格式不兼容。\n原始返回请前往浏览器 F12 控制台查看。`);
                }

                if (this.aiStatus !== 'idle') {
                    this.aiStatus = 'finished';
                }

            } catch (err) {
                if (err.name === 'AbortError') {
                    // 如果是被 stopAIGeneration 取消的，什么都不做，已经拼接了提示
                } else {
                    console.error("【大模型报错信息打印】", err);
                    
                    const safeErrorMessage = err.message || JSON.stringify(err);
                    const errorHtml = `\n\n<span style="color:#f56c6c; font-weight:bold;">[System Error] 大模型调用失败: ${safeErrorMessage}。<br>建议打开浏览器控制台 (F12) 查看详细请求日志，检查 API Key 额度或切换回【本地极速引擎】。</span>`;
                    
                    if (this.aiStreamedText && this.aiStreamedText.length > 5) {
                        this.aiStreamedText += errorHtml;
                    } else {
                        this.aiStreamedText = errorHtml;
                    }
                    // 如果有 fullRawResponse 同时也把它打在控制台备查
                    if (fullRawResponse) {
                        console.log("【伴随错误发生时的原始响应数据】：\n", fullRawResponse);
                    }
                }
                this.aiStatus = 'finished';
            }
        },

        // --- 2. 进阶级本地 AST 动态语法生成器 ---
        runLocalNLP(data) {
            this.aiStatus = 'typing'; 
            
            const first = data[0];
            const last = data[data.length - 1];
            const periodDays = data.length;

            const firstClose = Number(first.close);
            const lastClose = Number(last.close);
            let sumClose = 0, sumVol = 0, upDays = 0, downDays = 0;
            let highest = -Infinity, lowest = Infinity;
            let maxGain = -Infinity, maxDrop = Infinity, maxVolPct = 0;
            let gapUpCount = 0, gapDownCount = 0;
            let maxVol = -Infinity;

            for (let i = 0; i < data.length; i++) {
                const c = Number(data[i].close), o = Number(data[i].open);
                const h = Number(data[i].high), l = Number(data[i].low);
                const pct = Number(data[i].pct_chg), v = Number(data[i].volume);
                sumClose += c;
                if (!isNaN(v)) sumVol += v;
                if (h > highest) highest = h;
                if (l < lowest) lowest = l;
                if (pct > 0) upDays++; else if (pct < 0) downDays++;
                if (pct > maxGain) maxGain = pct;
                if (pct < maxDrop) maxDrop = pct;
                if (!isNaN(v) && v > maxVol) { maxVol = v; maxVolPct = pct; }
                if (i > 0 && Number(data[i-1].close) > 0) {
                    const gapPct = ((o - Number(data[i-1].close)) / Number(data[i-1].close)) * 100;
                    if (gapPct > 1) gapUpCount++; else if (gapPct < -1) gapDownCount++;
                }
            }

            const avgClose = sumClose / periodDays;
            const closeChange = lastClose - firstClose;
            const closePct = firstClose > 0 ? (closeChange / firstClose) * 100 : 0;
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

            let p1, p2, p3, p4;

            if (lastClose > avgClose * 1.05) {
                p1 = pick([
                    `大家注意看，这股票最近挺有冲劲的。最新收盘价 <b style="color:var(--color-up)">${lastClose.toFixed(2)}</b> 稳稳站在了这几天的平均成本（${avgClose.toFixed(2)}）之上。而且收盘价基本都跑到了开盘价上面，说明这几天大家买入的意愿很强，拿钱进场的人都赚钱了。`,
                    `走势看着让人挺安心的！现在的收盘价明显高出了前几天的平均价（${avgClose.toFixed(2)}）。每天开盘后都有资金愿意花更高的价格买入把它往上推，<b style="color:var(--color-up)">说明现在做多的人占了上风</b>。`
                ]);
            } else if (lastClose < avgClose * 0.95) {
                p1 = pick([
                    `这股票最近走得有点难看。现在的收盘价 <b style="color:var(--color-down)">${lastClose.toFixed(2)}</b> 已经掉到了大家买入的平均成本（${avgClose.toFixed(2)}）下面。经常是一开盘就被砸，收盘比开盘还低，说明里面的人都在排队亏本卖。`,
                    `目前的走势有点危险，收盘价被压在了平均线（${avgClose.toFixed(2)}）下方喘不过气。一开盘就有人抢着往外跑，<b style="color:var(--color-down)">现在买的话很容易接到别人不要的烂摊子</b>。`
                ]);
            } else {
                p1 = pick([
                    `最近这段时间，它一直在横着走，没啥大动静。最新收盘价和这几天的平均价（${avgClose.toFixed(2)}）差不多。每天开盘和收盘的价格也没差多少，说明买的人和卖的人正在互相观望，<b style="color:var(--color-blue)">都在等接下来的方向</b>。`,
                    `这只票最近像是在睡大觉，价格一直在平均线（${avgClose.toFixed(2)}）附近晃悠。开盘价和收盘价粘在一块，说明买卖双方谁也说服不了谁，<b style="color:var(--color-blue)">可能马上就要选个方向发力了</b>。`
                ]);
            }

            if (upDays > downDays && maxGain > Math.abs(maxDrop)) {
                p2 = pick([
                    `看看涨跌幅，最近红的日子明显多过绿的，最高更是涨到过 ${highest.toFixed(2)} 的好价格，单天最大涨幅有 ${maxGain.toFixed(2)}%。就算是最低价也没跌下去多少，说明哪怕掉下来一点都有人愿意抄底。`,
                    `波动上看，多方明显在使劲往上顶。价格曾一度冲高到 ${highest.toFixed(2)}，这说明只要势头一好，大家就都愿意追进来买，整体涨的力气远远大于跌的力气。`
                ]);
            } else if (downDays > upDays && Math.abs(maxDrop) > maxGain) {
                p2 = pick([
                    `涨跌幅这块儿就很惨了，单天居然跌出过 ${maxDrop.toFixed(2)}% 的大坑。最低直接探到了 ${lowest.toFixed(2)}，一旦涨上去点就被人立马砸下来（最高也才 ${highest.toFixed(2)}），买票的人都被吓坏了。`,
                    `这段时间绿多红少，跌起来的时候特别狠。价格最低滑到了 ${lowest.toFixed(2)}，偶尔最高冲一下也就停了，说明反弹就是给人逃命的机会，完全没有持续上涨的动力。`
                ]);
            } else {
                p2 = pick([
                    `价格上上下下波动得挺厉害，最高冲到了 ${highest.toFixed(2)}，最低也去摸过 ${lowest.toFixed(2)}。大涨和大跌的日子一半一半，感觉像是在洗盘折腾人。`,
                    `这几天红绿交替着来，涨起来最高有 ${maxGain.toFixed(2)}%，跌下去也挺狠的。高点和低点拉得很宽，说明里面的资金分歧很大，有的人看好，有的人想跑。`
                ]);
            }

            if (maxVolPct > 3) p3 = `再说说成交量，它在大涨的那天突然放出天量，买卖的钱一下子变多了，<b>说明肯定有大资金看准机会进场扫货了，这可是个好兆头</b>。`;
            else if (maxVolPct < -3) p3 = `最让人担心的就是它的成交量，在暴跌的那天居然放出了巨量。<b>这说明很多人（包括大户）都在拼命割肉往外跑，后头可能还得接着跌</b>。`;
            else p3 = `成交量看起来中规中矩，虽然有过放量，但是价格却没怎么动。这说明<b>虽然成交热火朝天，但是买的人 and 卖的人只是在互道傻X，并没有真正拉出空间</b>。`;

            if (gapUpCount > gapDownCount) p3 += ` 另外大家注意没，它经常一大早刚开盘就直接低开，说明大伙头一天晚上就已经悲观透顶了，一开盘就赶紧跑。`;
            else if (gapDownCount > gapUpCount) p3 += ` 还有个不好的点，它经常一大早刚开盘就直接低开，说明大伙头一天晚上就已经悲观透顶了，一开盘就赶紧跑。`;

            if (closePct > 3) p4 = `【老哥建议】：现在势头正猛，向上的路已经被打开了。<b>建议如果手里有的千万别轻易卖了，没有的话可以趁着盘中回踩稍微买点试试水！</b>`;
            else if (closePct < -3) p4 = `【老哥建议】：雪崩的时候没有一片雪花是无辜的，现在的跌势根本还没看到底。<b>建议咱们现在千万别手痒去抄底，管住手在外面看着，等它真正不跌了再考虑！</b>`;
            else p4 = `【老哥建议】：现在正处于不上不下的尴尬位置，往上往下都有可能。<b>建议咱们先按兵不动，保持观望，等它哪天明确往一边使劲突破了，咱们再跟着上车！</b>`;

            const finalReport = `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
            this.streamTypewriterEffect(finalReport);
        },

        // --- 3. 安全防崩溃的打字机流式输出引擎 ---
        async streamTypewriterEffect(htmlContent) {
            this.aiStatus = 'typing';
            this.aiStreamedText = '';
            
            const tokens = [];
            let i = 0;
            while(i < htmlContent.length) {
                if (htmlContent[i] === '<') {
                    let tag = '';
                    while (htmlContent[i] !== '>' && i < htmlContent.length) { 
                        tag += htmlContent[i]; 
                        i++; 
                    }
                    if (i < htmlContent.length) { 
                        tag += htmlContent[i]; 
                        i++; 
                    }
                    tokens.push(tag);
                } else {
                    tokens.push(htmlContent[i]);
                    i++;
                }
            }

            for (let t of tokens) {
                // 如果发现状态不再是 typing (说明用户点击了停止)
                if (this.aiStatus !== 'typing') {
                    break;
                }
                this.aiStreamedText += t;
                if (!t.startsWith('<')) {
                    await new Promise(r => setTimeout(r, 15 + Math.random() * 20)); 
                }
            }
            if (this.aiStatus === 'typing') {
                this.aiStatus = 'finished';
            }
        },

        async initFollowedStocks() {
            const localData = localStorage.getItem('followed_stocks');
            if (localData) {
                try {
                    this.followedStocks = JSON.parse(localData) || [];
                } catch (e) {
                    console.error('解析 localStorage 关注股票数据失败:', e);
                    this.followedStocks = [];
                }
            }
            if (!this.followedStocks || this.followedStocks.length === 0) {
                await this.fetchFollowedStocksFromServer();
            }
        },

        async fetchFollowedStocksFromServer() {
            this.followedLoading = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const mockServerData = []; 
                this.followedStocks = mockServerData;
                localStorage.setItem('followed_stocks', JSON.stringify(this.followedStocks));
            } catch (e) {
                console.error('从服务器获取自选股失败:', e);
            } finally {
                this.followedLoading = false;
            }
        },

        async followCurrentStock() {
            const code = this.currentStockCode;
            const name = this.currentStockName;
            if (!code) {
                Message.warning({ message: '无效的股票代码，无法关注', center: true });
                return;
            }

            const isAlreadyFollowed = this.followedStocks.some(item => item.code === code);
            if (isAlreadyFollowed) {
                Message.info({ message: '该股票已在关注列表中', center: true });
                return;
            }

            this.followedLoading = true;
            try {
                let rtItem = {
                    code: code,
                    name: name,
                    pct_chg: 0,
                    close: 0,
                    open: 0,
                    high: 0,
                    low: 0,
                    volume: 0
                };

                const resp = await get_stock_rt_data({ code });
                if (resp && resp.data && resp.data.code === 1000 && resp.data.data) {
                    const rtData = resp.data.data;
                    rtItem = {
                        code: code,
                        name: name,
                        pct_chg: rtData.changepercent !== undefined ? Number(rtData.changepercent) : 0,
                        close: rtData.trade !== undefined ? Number(rtData.trade) : 0,
                        open: rtData.open !== undefined ? Number(rtData.open) : 0,
                        high: rtData.high !== undefined ? Number(rtData.high) : 0,
                        low: rtData.low !== undefined ? Number(rtData.low) : 0,
                        volume: rtData.volume !== undefined ? Number(rtData.volume) : 0
                    };
                } else {
                    if (this.currentStockHistoryData && this.currentStockHistoryData.length > 0) {
                        const latest = this.currentStockHistoryData[this.currentStockHistoryData.length - 1];
                        rtItem = {
                            code: code,
                            name: name,
                            pct_chg: latest.pct_chg !== undefined ? Number(latest.pct_chg) : 0,
                            close: latest.close !== undefined ? Number(latest.close) : 0,
                            open: latest.open !== undefined ? Number(latest.open) : 0,
                            high: latest.high !== undefined ? Number(latest.high) : 0,
                            low: latest.low !== undefined ? Number(latest.low) : 0,
                            volume: latest.volume !== undefined ? Number(latest.volume) : 0
                        };
                    }
                }

                this.followedStocks.push(rtItem);
                localStorage.setItem('followed_stocks', JSON.stringify(this.followedStocks));
                Message.success({ message: `关注成功: ${name} (${code})`, center: true });
            } catch (e) {
                console.error(e);
                Message.error({ message: '关注失败，请稍后重试', center: true });
            } finally {
                this.followedLoading = false;
            }
        },

        unfollowStock(row) {
            MessageBox.confirm(`确定取消关注股票 ${row.name} (${row.code}) 吗？`, '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                center: true
            }).then(() => {
                this.followedStocks = this.followedStocks.filter(item => item.code !== row.code);
                localStorage.setItem('followed_stocks', JSON.stringify(this.followedStocks));
                Message.success({ message: '取消关注成功', center: true });
            }).catch(() => {});
        },

        async refreshFollowedRealTime() {
            if (!this.followedStocks || this.followedStocks.length === 0) {
                Message.warning({ message: '自选列表暂无股票，无需刷新', center: true });
                return;
            }
            this.followedLoading = true;
            try {
                const updatedList = [];
                for (let item of this.followedStocks) {
                    const resp = await get_stock_rt_data({ code: item.code }).catch(() => null);
                    if (resp && resp.data && resp.data.code === 1000 && resp.data.data) {
                        const rtData = resp.data.data;
                        updatedList.push({
                            code: item.code,
                            name: item.name,
                            pct_chg: rtData.changepercent !== undefined ? Number(rtData.changepercent) : 0,
                            close: rtData.trade !== undefined ? Number(rtData.trade) : 0,
                            open: rtData.open !== undefined ? Number(rtData.open) : 0,
                            high: rtData.high !== undefined ? Number(rtData.high) : 0,
                            low: rtData.low !== undefined ? Number(rtData.low) : 0,
                            volume: rtData.volume !== undefined ? Number(rtData.volume) : 0
                        });
                    } else {
                        updatedList.push(item);
                    }
                }
                this.followedStocks = updatedList;
                localStorage.setItem('followed_stocks', JSON.stringify(this.followedStocks));
                Message.success({ message: '自选股行情刷新成功', center: true });
            } catch (e) {
                console.error('自选行情刷新异常:', e);
            } finally {
                this.followedLoading = false;
            }
        },

        async syncFollowedToServer() {
            this.followedLoading = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 800));
                localStorage.setItem('followed_stocks', JSON.stringify(this.followedStocks));
                Message.success({ message: '同步至服务器成功（本地缓存已刷新）', center: true });
            } catch (e) {
                console.error('同步服务器发生错误:', e);
                Message.error({ message: '同步失败，请检查网络后重试', center: true });
            } finally {
                this.followedLoading = false;
            }
        },

        async get_stock_rt_data_v2(showMsg = false) {
			if (!this.currentStockCode) { Message.warning({ message: '当前股票代码无效', center: true }); return; }
            const todayStr = this.formatDate(new Date());
            const hasToday = this.currentStockHistoryData.some(item => item.day === todayStr);
            if (hasToday) {
                if (showMsg) Message.info({ message: '今日实时行情数据已存在于列表中，无需重复追加', center: true });
                return;
            }

            this.stocksLoading = true;
			const resp = await get_stock_rt_data({ code: this.currentStockCode }).catch(() => {});
			if (resp && resp.data && resp.data.code === 1000) {
				const rtData = resp.data.data;
                if (rtData) {
                    const mappedItem = {
                        code: rtData.code || this.currentStockCode,
                        pct_chg: rtData.changepercent !== undefined ? Number(rtData.changepercent) : 0,
                        close: rtData.trade !== undefined ? Number(rtData.trade) : 0,
                        open: rtData.open !== undefined ? Number(rtData.open) : 0,
                        high: rtData.high !== undefined ? Number(rtData.high) : 0,
                        low: rtData.low !== undefined ? Number(rtData.low) : 0,
                        volume: rtData.volume !== undefined ? Number(rtData.volume) : 0,
                        day: todayStr
                    };

                    const filteredList = this.currentStockHistoryData.filter(item => item.day !== todayStr);
                    filteredList.push(mappedItem);
                    this.processStockHistoryDiffs(filteredList);

                    if (this.myChart) this.renderTrendChart(this.currentStockHistoryData);
                    
                    this.stockSummary = {
                        total: this.currentStockHistoryData.length,
                        up: this.currentStockHistoryData.filter(item => item.pct_chg > 0).length,
                        down: this.currentStockHistoryData.filter(item => item.pct_chg < 0).length
                    };

                    if (showMsg) Message.success({ message: '今日实时行情数据已成功追加', center: true });
                } else { Message.warning({ message: '未获取到有效的实时数据', center: true }); }
			} else { Message.error({ message: resp?.data?.msg || `获取实时数据失败`, center: true }); }
            this.stocksLoading = false;
		},

        async fetchInflowData(showMsg = false) {
            const resp = await get_capital_inflow();
            if (resp && resp.data && resp.data.code == 1000) {
                this.inflowData = resp.data.data;
                this.$nextTick(() => { this.initInflowChart(); });
                if (showMsg) Message.success({ message: '资金流向数据刷新成功', center: true });
            } else { Message.error(resp.data.msg || '获取资金流入数据失败'); }
        },

        async fetchIndexData(showMsg = false) {
            const resp = await get_sh_index();
            if (resp && resp.data && resp.data.code == 1000) {  
                this.indexData = resp.data.data;
                if (showMsg) Message.success({ message: '上证指数数据刷新成功', center: true });
            } else { Message.error(resp.data.msg || '获取上证指数数据失败'); }
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
                Message.warning({ message: '请选择一个有效的日期范围', center: true }); return;
            }
            this.stocksLoading = true;
            const startDate = this.formatDate(this.dateRange[0]);
            const endDate = this.formatDate(this.dateRange[1]);

            const resp = await stock_history_data_date_range({ code: this.currentStockCode, start: startDate, end: endDate });
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data || [];
                this.processStockHistoryDiffs(rd);
            } else { Message.error({ message: resp.data.msg, center: true }); }
            this.stocksLoading = false;
        },

        reset_filter_date() { 
            this.lookBackDays = ''; 
            this.days = ''; 
            this.price = ''; 
            this.industryName = ''; 
            this.trend = 2; // 重置时恢复到默认的连续下跌趋势
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
            this.isRunIconF = "el-icon-loading";
            const resp = await filter_good_stocks_history();
            if (resp && resp.data && resp.data.code === 1000) { this.filterStocksHistory = resp.data.data || []; } 
            else { Message.error({ message: resp.data.msg, center: true }); }
            this.isRunIconF = "el-icon-refresh";
        },

        async get_good_stocks(typeCheck) {
            if (typeCheck === 1) { this.lookBackDays = 10; this.days = 1000; this.price = 0.1; } 
            else {
                if (!this.lookBackDays) { Message.warning({ message: '请输入近多少个交易日', center: true }); return; }
                if (!this.days) { 
                    const dirText = this.trend === 1 ? '上涨' : '下跌';
                    Message.warning({ message: `请输入连续${dirText}的交易日`, center: true }); 
                    return; 
                }
            }
            if (!this.industryName) { Message.warning({ message: '请至少选择一个行业进行查询', center: true }); return; }
            this.filterStocksLoading = true;
            
            // 将 trend 变量引入 API 请求参数中
            const resp = await filter_good_stocks({ 
                industry: this.industryName, 
                days: this.days, 
                lookBackDays: this.lookBackDays, 
                price: this.price || 0.1, 
                trend: this.trend 
            });
            if (resp && resp.data && resp.data.code === 1000) {
                this.customSearchData = resp.data.data || [];
                if (this.days == 1000) { this.customSearchDialogVisible = true; } 
                else { Message.success({ message: resp.data.msg || '正在查询...', center: true }); }
            } else { Message.error({ message: resp.data.msg, center: true }); }
            this.filterStocksLoading = false; this.visible = false;
        },

        async get_industry_datas() {
            const resp = await get_stock_industry_list();
            if (resp && resp.data && resp.data.code === 1000) { this.insdustryData = resp.data.data; } 
            else { Message.error({ message: resp.data.msg, center: true }); }
        },

        handleCustomSearchPageChange(val) { this.customSearchCurrentPage = val; },

        handleCustomSearch() {
            this.customSearchQuery = ''; this.customSearchCurrentPage = 1;
            this.customSearchData = []; this.customSearchDialogVisible = true;
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

        async getStockHistoryData(code) {
            this.historyDays = this.historyDays || 30;
            const resp = await get_stock_history_data({ code: code, days: this.historyDays });
            if (resp.data.code === 1000) { this.stockHistoryData = resp.data.data; return; }
            Message.error({ message: resp.data.msg, center: true });
        },

        handleStockSortChange({ prop, order }) {
            this.stockSortProp = prop; this.stockSortOrder = order; this.stockCurrentPage = 1;
        },

        handleStockPageChange(val) { this.stockCurrentPage = val; },
        
        refreshData() { this.getStockMarketData(); this.getIndustryUpDown(); this.fetchIndexData(false); },

        async stockDataStatus() {
            this.isRunIcon = "el-icon-loading";
            const resp = await stock_data_status();
            if (resp.data.code === 1000) { this.isRunIcon = "el-icon-data-line"; return; }
        },

        stockDataSwitch() {
            MessageBox.confirm('确定提交吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', center: true })
            .then(async () => {
                this.isRunIcon = "el-icon-loading";
                const resp = await stock_data_switch();
                if (resp.data.code !== 1000) { Message.error({ message: resp.data.msg, center: true }); return; }
                Message.success({ message: resp.data.msg, center: true });
            }).catch(() => { });
        },

        async getStockMarketData() {
            const resp = await get_stock_market_data();
            if (resp.data.code === 1000) {
                var rd = resp.data.data;
                rd.amount = `${(rd.amount / 100000000).toFixed(2)}亿`;
                this.marketSummary = rd;
            } else { Message.error({ message: resp.data.msg, center: true }); }
        },

        async getIndustryUpDown() {
            const resp = await get_stock_industry_up_down();
            if (resp && resp.data && resp.data.code === 1000) {
                var rd = resp.data.data;
                this.rawIndustryData = rd.data;
                this.indexData = rd.sh_index_data;
                this.inflowData = rd.capital_inflow_data;
                this.$nextTick(() => { this.initInflowChart(); });
            } else { Message.error({ message: resp.data.msg, center: true }); }
            this.initChart();
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
            const reqId = ++this.industryQueryReqId;
            try {
                const resp = await get_stock_info_data({ code });
                if (reqId !== this.industryQueryReqId) { return; }
                if (resp.data.code !== 1000) {
                    this.stockIndustryFromCode = ''; Message.error({ message: resp.data.msg, center: true }); return;
                }
                this.stockIndustryFromCode = this.getIndustryValueFromResp(resp.data.data);
            } catch (error) {
                if (reqId === this.industryQueryReqId) { this.stockIndustryFromCode = ''; }
            } finally {
                if (reqId === this.industryQueryReqId) { this.industryQueryLoading = false; }
            }
        },

        async openIndustryStocks(industryName) {
            this.currentIndustry = industryName; this.dialogVisible = true; this.stocksLoading = true;
            const resp = await get_industry_data({ name: industryName });
            if (resp.data.code !== 1000) { Message.error({ message: resp.data.msg, center: true }); return; }
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
            this.chartLoading = true; this.stockSortProp = 'pct_chg'; this.stockSortOrder = 'descending';
            this.historyDays = this.historyDays || 30;
            const resp = await get_stock_history_data({ code: this.currentStockCode, days: this.historyDays });
            if (resp.data.code !== 1000) { Message.error({ message: resp.data.msg, center: true }); return; }

            this.chartLoading = false;
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
        },

        onChartDialogClosed() {
            if (this.myChart) { this.myChart.dispose(); this.myChart = null; }
            this.currentStockHistoryData = [];
            this.aiStatus = 'idle';
            this.showExtremesTable = false; 
            if (this._aiAbortController) {
                this._aiAbortController.abort();
                this._aiAbortController = null;
            }
        },

        renderTrendChart(data) {
            if (!this.$refs.stockTrendChart) return;
            if (this.myChart) { this.myChart.dispose(); }
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
                    backgroundColor: this.isDarkMode ? '#333' : '#fff', textStyle: { color: this.isDarkMode ? '#eee' : '#333' }
                },
                grid: { left: '3%', right: '4%', bottom: '5%', top: '10%', containLabel: true },
                xAxis: { type: 'category', data: xAxisData, axisLabel: { color: axisColor }, boundaryGap: false },
                yAxis: { type: 'value', name: '涨跌幅(%)', nameTextStyle: { color: axisColor }, axisLabel: { color: axisColor }, splitLine: { lineStyle: { type: 'dashed', color: splitLineColor } } },
                series: [{
                    name: '涨跌幅', type: 'line', data: yAxisData, smooth: true, itemStyle: { color: '#409eff' },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ { offset: 0, color: 'rgba(64,158,255,0.4)' }, { offset: 1, color: 'rgba(64,158,255,0.05)' } ]) },
                    markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0, lineStyle: { color: this.isDarkMode ? '#555' : '#ccc', type: 'solid' } }] }
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

.ai-terminal-panel { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-app); overflow: hidden; }
.ai-header { padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border-bottom: 1px solid var(--border-color); cursor: pointer; }
.ai-status-text { font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 4px; }
.ai-status-text.idle { background: var(--bg-progress); color: var(--text-secondary); }
.ai-status-text.loading { background: rgba(230,162,60,0.1); color: var(--color-orange); }
.ai-status-text.typing { background: rgba(64,158,255,0.1); color: var(--color-blue); }
.ai-status-text.finished { background: rgba(103,194,58,0.1); color: var(--color-green); }

.ai-body { padding: 15px; background: var(--bg-app); }
.ai-settings-row { display: flex; align-items: center; margin-bottom: 15px; background: var(--bg-card); padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); }

/* ==== 新增进度条及加载样式 ==== */
.ai-running-indicator {
    display: inline-flex;
    align-items: center;
    margin-left: 15px;
    color: var(--color-blue);
    font-weight: bold;
    animation: pulse 1.5s infinite;
}
.ai-running-indicator i {
    font-size: 16px;
    margin-right: 6px;
}

.ai-settings-api-ext { display: flex; align-items: center; margin-bottom: 15px; background: rgba(64, 158, 255, 0.05); padding: 10px; border-radius: 4px; border: 1px dashed var(--color-blue); }

.terminal-box { background: #1e1e1e; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); border: 1px solid #333; }
.terminal-header { background: #2d2d2d; padding: 8px 12px; display: flex; align-items: center; border-bottom: 1px solid #111; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.dot-red { background: #ff5f56; } .dot-yellow { background: #ffbd2e; } .dot-green { background: #27c93f; }
.terminal-title { margin-left: 10px; color: #888; font-size: 12px; font-family: Consolas, Monaco, monospace; }

.terminal-content { padding: 15px; color: #a9b7c6; font-family: Consolas, Monaco, monospace; font-size: 14px; line-height: 1.8; min-height: 150px; text-align: justify; }
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
.dark-theme .ai-header { background: #1e1e1e; border-color: #333; }
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
::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active { background-color: var(--color-blue); color: #fff; }
::v-deep .el-pagination__total { color: var(--text-secondary); }

.dark-theme ::v-deep .el-dialog { background-color: var(--bg-card) !important; }
.dark-theme ::v-deep .el-dialog__title { color: var(--text-primary) !important; }
.dark-theme ::v-deep .el-dialog__body { color: var(--text-regular) !important; }
.dark-theme ::v-deep .el-loading-mask { background-color: rgba(30, 30, 30, 0.8) !important; }
.dark-theme ::v-deep .el-input__inner { background-color: var(--bg-app) !important; color: var(--text-primary) !important; border-color: var(--border-color) !important; }

.dark-theme ::v-deep .el-date-editor--daterange.el-input__inner { background-color: var(--bg-app) !important; border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-date-editor .el-range-input { background-color: transparent !important; color: var(--text-primary) !important; }
.dark-theme ::v-deep .el-date-editor .el-range-separator { color: var(--text-primary) !important; line-height: 24px; }
.dark-theme ::v-deep .el-date-editor .el-input__icon { color: var(--text-secondary) !important; }
.dark-theme ::v-deep .el-range-editor .el-range-input::-webkit-input-placeholder, .dark-theme ::v-deep .el-range-editor .el-range-input::-moz-placeholder, .dark-theme ::v-deep .el-range-editor .el-range-input:-ms-input-placeholder, .dark-theme ::v-deep .el-range-editor .el-range-input::placeholder { color: var(--text-secondary); }

.dark-theme ::v-deep .el-table, .dark-theme ::v-deep .el-table th, .dark-theme ::v-deep .el-table tr, .dark-theme ::v-deep .el-table td, .dark-theme ::v-deep .el-table th.is-leaf, .dark-theme ::v-deep .el-table th.is-group { background-color: var(--bg-card) !important; color: var(--text-regular); border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table th { color: var(--text-secondary); font-weight: 600; }
.dark-theme ::v-deep .el-table::before, .dark-theme ::v-deep .el-table::after, .dark-theme ::v-deep .el-table--border::after, .dark-theme ::v-deep .el-table--group::after, .dark-theme ::v-deep .el-table__fixed-right::before, .dark-theme ::v-deep .el-table__fixed::before { background-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table--border, .dark-theme ::v-deep .el-table--group { border-color: var(--border-color) !important; }
.dark-theme ::v-deep .el-table--striped .el-table__body tr.el-table__row--striped td { background-color: var(--bg-progress) !important; }
.dark-theme ::v-deep .el-table--enable-row-hover .el-table__body tr:hover>td { background-color: var(--bg-hover) !important; }

@media (max-width: 768px) { .header-left { flex-direction: column; gap: 5px; align-items: flex-start; } }

.stock-code-link { color: var(--color-blue); cursor: pointer; font-weight: bold; font-family: "Consolas", "Monaco", monospace; transition: all 0.3s ease; display: inline-flex; align-items: center; }
.stock-code-link i { margin-left: 4px; font-size: 13px; opacity: 0; transform: translateX(-3px); transition: all 0.3s ease; }
.stock-code-link:hover { color: var(--color-hover); text-decoration: underline; }
.stock-code-link:hover i { opacity: 1; transform: translateX(0); }
.flush-filter-stocks-data { cursor: pointer; }
.custom-column .el-tooltip { white-space: normal !important; word-wrap: break-word !important; max-width: 300px; word-break: break-all; }

/* ================== 走势方向精美切换组件样式 ================== */
.trend-selector-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-hover);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}
.dark-theme .trend-selector-wrapper {
    background: rgba(255, 255, 255, 0.03);
}
.filter-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-regular);
}
.custom-trend-radio ::v-deep .el-radio-button__inner {
    background: transparent !important;
    border: none !important;
    color: var(--text-regular) !important;
    border-radius: 15px !important;
    padding: 6px 16px !important;
    font-weight: bold;
    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
    font-size: 13px;
    box-shadow: none !important;
}
/* 连涨激活状态 (采用A股上涨红色渐变与发光微阴影) */
.custom-trend-radio ::v-deep .el-radio-button__orig-radio:checked + .el-radio-button__inner {
    color: #ffffff !important;
}
.custom-trend-radio ::v-deep .el-radio-button:first-child.is-active .el-radio-button__inner {
    background: linear-gradient(135deg, #ff7875, #f5222d) !important;
    box-shadow: 0 4px 10px rgba(245, 34, 45, 0.3) !important;
}
/* 连跌激活状态 (采用A股下跌绿色/青色渐变与发光微阴影) */
.custom-trend-radio ::v-deep .el-radio-button:last-child.is-active .el-radio-button__inner {
    background: linear-gradient(135deg, #4dccc6, #00bfa5) !important;
    box-shadow: 0 4px 10px rgba(0, 191, 165, 0.3) !important;
}
.trend-btn-content {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
</style>

<style>
/* ================== 全局暗黑主题下的 Element 控件覆写 ================== */
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
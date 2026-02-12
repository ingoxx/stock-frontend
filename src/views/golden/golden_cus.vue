<template>
    <!-- 1. 绑定动态 class 'dark-theme' -->
    <div class="box" :class="{ 'dark-theme': isDarkMode }">
        
        <!-- 新增：顶部栏（标题 + 主题切换） -->
        <div class="header-bar">
            <div class="header-title">
                <i class="el-icon-coin"></i> 黄金实时监控
            </div>
            <div class="theme-toggle" @click="toggleTheme" title="切换主题">
                <i :class="isDarkMode ? 'el-icon-sunny' : 'el-icon-moon'"></i>
                <span class="toggle-text">{{ isDarkMode ? '日间' : '夜间' }}</span>
            </div>
        </div>

        <div class="c1">
            <!-- golden content -->
            <div class="cd-1 card">
                <div class="price-label">实时金价 (CNY/g)</div>
                <div class="price-value font">{{ golden_real_time_price || 'Loading...' }}</div>
                <div class="price-time font-1">
                    <i class="el-icon-time"></i> 更新时间：{{ golden_real_time_date || '--:--:--' }}
                </div>
            </div>

            <div class="cd-2 card">
                <div class="control-title">监控设置</div>
                <div class="cd-2-1">
                    <div class="cd-2-1-1">
                        <span class="input-label">差额通知</span>
                        <el-input v-model="gold_diff_price" :disabled="dev" placeholder="输入差额" clearable size="small"></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <span class="input-label">卖出阈值</span>
                        <el-input v-model="gold_sell_price" :disabled="dev" placeholder="卖出价格" clearable size="small"></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <span class="input-label">买入阈值</span>
                        <el-input v-model="gold_buy_price" :disabled="dev" placeholder="买入价格" clearable size="small"></el-input>
                    </div>
                </div>
                <div class="cd-2-2">
                    <el-button size="small" icon="el-icon-refresh-left" :disabled="dev" @click="reset()">重置</el-button>
                    <el-button :loading="setPriceLoading" type="primary" size="small" icon="el-icon-check" :disabled="dev" @click="submit()">提交配置</el-button>
                </div>
            </div>
        </div>

        <div class="c2 card">
            <!-- stock content -->
            <div class="sc" v-if="tableData.length > 0">
                <span class="sc-1">
                    <span class="indicator-dot"></span> 实时刷新中{{ point }}
                </span>
            </div>
            <div class="tb">
                <template>
                    <el-table
                        :data="tableData"
                        :default-sort="{prop: 'date', order: 'descending'}"
                        v-loading="tableLoading"
                        style="width: 100%"
                        height="400"
                    >
                        <el-table-column prop="price" label="价格 (元/克)" :formatter="formatter" align="center">
                            <template slot-scope="scope">
                                <span class="table-price">{{ scope.row.price }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="date" label="更新时间" sortable align="center"></el-table-column>
                    </el-table>
                </template>
            </div>
        </div>

        <div class="dialog">
            <el-dialog
                :title="secret_dia_title"
                :visible.sync="dialogVisible"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
                :show-close="false"
                :center="true"
                width="300px"
                custom-class="custom-dialog"
            >
                <div class="key">
                    <el-input v-model="secret_key" placeholder="请输入访问口令" clearable @keyup.enter.native="start()" show-password></el-input>
                </div>
                <span slot="footer" class="dialog-footer">
                    <el-button :loading="secret_loading" size="small" type="primary" @click="start()" tabindex="0" icon="el-icon-unlock">验证进入</el-button>
                </span>
            </el-dialog>
        </div>
    </div>
</template>

<script>
    import { get_golden_prices_list, set_golden_prices } from '../../api';
    import { Message, MessageBox } from 'element-ui';

    export default {
        name: 'golden',
        data()  {
            return {
                isDarkMode: false, // 新增：控制黑夜模式
                setPriceLoading: false,
                cusDiaVisible: false,
                cusDiaContent: "",
                cusDiaTitle: "",
                dev: false,
                secret_loading: false,
                point: "",
                secret_dia_title: "安全验证",
                stock_list: [],
                golden_real_time_date: "--",
                golden_real_time_price: 0.0,
                set_timer: null,
                flush_timer: null,
                gold_diff_price: null,
                gold_sell_price: null,
                gold_buy_price: null,
                dialogVisible: false,
                secret_key: null,
                tableData: [],
                tableLoading: true,
            }
        },
        methods: {
            // 新增：切换主题
            toggleTheme() {
                this.isDarkMode = !this.isDarkMode;
            },
            reset() {
                this.gold_diff_price = null;
                this.gold_sell_price = null;
                this.gold_buy_price = null;
            },
            submit() {
                if (!this.gold_diff_price) return Message.error({ message: "差额不能为空", center: true });
                if (!this.gold_sell_price) return Message.error({ message: "卖出价格不能为空", center: true });
                if (!this.gold_buy_price) return Message.error({ message: "买入价格不能为空", center: true });
 
                MessageBox.confirm('确定提交当前监控配置吗？', '配置确认', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true
                }).then(() => {
                    this.set_golden_prices_mth();
                }).catch(() => {});
            },
            formatter(row, column) {
                return row.price;
            },
            async get_golden_prices_list_mth() {
                // 不要在轮询时每次都显示 loading，体验不好，仅第一次显示
                if(this.tableData.length === 0) this.tableLoading = true;
                
                try {
                    const resp = await get_golden_prices_list();
                    if (resp.data.code === 1000) {
                        this.tableData = resp.data.data;
                        if(this.tableData.length > 0) {
                            var latest = this.tableData[this.tableData.length - 1];
                            this.golden_real_time_price = latest.price;
                            this.golden_real_time_date = latest.date;
                        }
                        localStorage.setItem('is_pass', 'y');
                    } else {
                        Message.error({ message: resp.data.msg, center: true });
                        clearInterval(this.set_timer);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    this.tableLoading = false;
                }
            },
            loop_get_golden_price_mth() {
                var is_pass = localStorage.getItem('is_pass');
                if (is_pass === 'y' && !this.set_timer && !this.flush_timer) {
                    this.flush_timer = setInterval(() => {
                        this.point += '.';
                        if (this.point.length > 3) {
                            this.point = ''; 
                        }
                    }, 500);

                    // 立即执行一次
                    this.get_golden_prices_list_mth();
                    this.set_timer = setInterval(() => {
                        this.get_golden_prices_list_mth();
                    }, 5000)
                } else {
                    this.dialogVisible = true;
                }
            },
            async start() {
                this.secret_loading = true;
                var sign = localStorage.getItem('sign');
                if (!sign) {
                    if (!this.secret_key) {
                        Message.error({ message: "输入口令", center: true });
                        this.secret_loading = false;
                        return;
                    }
                    localStorage.setItem('sign', this.secret_key);
                }
                await this.get_golden_prices_list_mth();
                this.loop_get_golden_price_mth();
                this.secret_loading = false;
                this.dialogVisible = false;
            },
            async set_golden_prices_mth() {
                this.setPriceLoading = true;
                const resp = await set_golden_prices({
                    diff_price: parseFloat(this.gold_diff_price), 
                    buy_price: parseFloat(this.gold_buy_price), 
                    sell_price: parseFloat(this.gold_sell_price)
                });
                
                if (resp.data.code === 1000) {
                    Message.success({ message: resp.data.msg, center: true });
                } else {
                    Message.error({ message: resp.data.msg, center: true });
                }
                this.setPriceLoading = false;
            },
        },
        mounted() {
            this.loop_get_golden_price_mth();
        },
        beforeDestroy() {
            if(this.set_timer) clearInterval(this.set_timer);
            if(this.flush_timer) clearInterval(this.flush_timer);
        }
    }
</script>

<style lang="scss" scoped>
/* ========== CSS 变量定义 ========== */
.box {
    /* 白天模式变量 */
    --bg-app: #f5f7fa;
    --bg-card: #ffffff;
    --text-primary: #303133;
    --text-secondary: #909399;
    --border-color: #ebeef5;
    --gold-color: #e6a23c;
    --shadow-color: rgba(0, 0, 0, 0.05);
    
    /* 元素覆盖 */
    --el-bg-color: #ffffff;
    --el-border-color: #dcdfe6;
    --el-text-color: #606266;

    transition: background-color 0.3s, color 0.3s;
}

/* 黑夜模式变量 */
.box.dark-theme {
    --bg-app: #121212;
    --bg-card: #1e1e1e;
    --text-primary: #e0e0e0;
    --text-secondary: #707070;
    --border-color: #333333;
    --gold-color: #ffbf00;
    --shadow-color: rgba(0, 0, 0, 0.5);

    /* 元素覆盖 */
    --el-bg-color: #2c2c2c;
    --el-border-color: #444444;
    --el-text-color: #cccccc;
}

/* ========== 布局样式 ========== */
.box {
    padding: 20px;
    background-color: var(--bg-app);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--text-primary);
}

/* 顶部栏 */
.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}
.header-title {
    font-size: 20px;
    font-weight: bold;
    color: var(--gold-color);
}
.theme-toggle {
    cursor: pointer;
    padding: 6px 12px;
    background: var(--bg-card);
    border-radius: 20px;
    box-shadow: 0 2px 8px var(--shadow-color);
    color: var(--text-secondary);
    font-size: 14px;
    transition: all 0.3s;
    margin-right: 43px;
}
.theme-toggle:hover { color: var(--gold-color); }

/* 通用卡片 */
.card {
    background-color: var(--bg-card);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px 0 var(--shadow-color);
    margin-bottom: 20px;
    border: 1px solid transparent;
}
.dark-theme .card { border: 1px solid #333; }

/* 实时金价区域 */
.cd-1 {
    text-align: center;
    border-top: 4px solid var(--gold-color);
}
.price-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
.price-value { 
    font-size: 42px; 
    font-weight: bold; 
    color: var(--gold-color); 
    font-family: 'Consolas', monospace;
    margin-bottom: 10px;
}
.price-time { font-size: 12px; color: var(--text-secondary); }

/* 控制区域 */
.control-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 20px;
    padding-left: 10px;
    border-left: 4px solid var(--gold-color);
}

.cd-2-1 {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}
.cd-2-1-1 {
    flex: 1;
    min-width: 150px;
}
.input-label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.cd-2-2 {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* 列表区域 */
.sc {
    margin-bottom: 15px;
    font-size: 13px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
}
.indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #67c23a;
    display: inline-block;
    margin-right: 6px;
    animation: blink 1s infinite;
}
@keyframes blink { 50% { opacity: 0.4; } }

.table-price {
    font-weight: bold;
    color: var(--gold-color);
}

/* ========== Element UI 深度覆盖 (核心) ========== */
::v-deep .el-input__inner {
    background-color: var(--bg-app) !important;
    border-color: var(--border-color) !important;
    color: var(--text-primary) !important;
}

::v-deep .el-table, 
::v-deep .el-table__expanded-cell {
    background-color: transparent !important;
    color: var(--text-primary) !important;
}

::v-deep .el-table th, 
::v-deep .el-table tr {
    background-color: transparent !important;
}

/* 表格斑马纹和Hover效果 */
::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td {
    background-color: var(--bg-app) !important;
}

::v-deep .el-table td, 
::v-deep .el-table th.is-leaf {
    border-bottom: 1px solid var(--border-color) !important;
}

/* 弹窗适配 */
::v-deep .el-dialog {
    background-color: var(--bg-card);
}
::v-deep .el-dialog__title {
    color: var(--text-primary);
}
::v-deep .el-dialog__body {
    padding: 20px;
}

/* 加载遮罩适配 */
::v-deep .el-loading-mask {
    background-color: rgba(255, 255, 255, 0.7);
}
.dark-theme ::v-deep .el-loading-mask {
    background-color: rgba(0, 0, 0, 0.7);
}
</style>
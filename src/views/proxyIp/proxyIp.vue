<template>
    <div :class="['proxy-dashboard', isDarkMode ? 'dark-theme' : 'light-theme']">
        <div class="dashboard-container">
            <header class="dashboard-header">
                <div class="title-group">
                    <h2><i class="el-icon-connection"></i> Proxy Pool Node Matrix</h2>
                    <span class="subtitle">实时代理节点监控与调度中心</span>
                </div>
                <div class="action-group">
                    <el-button type="primary" icon="el-icon-download" size="small" round @click="exportData">
                        导出节点
                    </el-button>
                    <div class="theme-switch" @click="toggleTheme" :title="isDarkMode ? '切换到白天模式' : '切换到黑夜模式'">
                        <i :class="isDarkMode ? 'el-icon-moon' : 'el-icon-sunny'"></i>
                    </div>
                </div>
            </header>

            <div class="control-panel glass-card">
                <el-input v-model="searchQuery" placeholder="搜索 IP 地址..." prefix-icon="el-icon-search" clearable
                    class="filter-item search-input">
                </el-input>

                <el-select v-model="filterType" placeholder="协议类型" clearable class="filter-item">
                    <el-option label="HTTP" value="HTTP"></el-option>
                    <el-option label="HTTPS" value="HTTPS"></el-option>
                    <el-option label="SOCKS5" value="SOCKS5"></el-option>
                </el-select>

                <el-select v-model="filterNat" placeholder="匿名度" clearable class="filter-item">
                    <el-option label="高匿 (Elite)" value="高匿"></el-option>
                    <el-option label="普匿 (Anonymous)" value="普匿"></el-option>
                    <el-option label="透明 (Transparent)" value="透明"></el-option>
                </el-select>
            </div>

            <div class="table-wrapper glass-card">
                <el-table :data="paginatedData" style="width: 100%" :row-class-name="tableRowClassName"
                    @row-dblclick="copyIp">

                    <el-table-column prop="ip" label="节点 IP : 端口" min-width="180">
                        <template slot-scope="{ row }">
                            <div class="ip-cell">
                                <span class="ip-text">{{ row.ip }}</span>
                                <el-tooltip content="点击复制" placement="top">
                                    <i class="el-icon-document-copy copy-icon" @click.stop="copyIp(row)"></i>
                                </el-tooltip>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="type" label="协议类型" width="120">
                        <template slot-scope="{ row }">
                            <el-tag :type="getProtocolTagType(row.type)" effect="dark" size="small" class="custom-tag">
                                {{ row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>

                    <el-table-column prop="nat" label="匿名级别" width="120">
                        <template slot-scope="{ row }">
                            <span :class="['nat-indicator', getNatClass(row.nat)]">
                                <i class="el-icon-view"></i> {{ row.nat }}
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column prop="vld" label="健康度 / 延迟" width="200">
                        <template slot-scope="{ row }">
                            <div class="latency-cell">
                                <span :class="['latency-text', getLatencyClass(row.vld)]">{{ row.vld }} ms</span>
                                <div class="latency-bar-bg">
                                    <div class="latency-bar-fill" :style="getLatencyBarStyle(row.vld)"
                                        :class="getLatencyClass(row.vld)"></div>
                                </div>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column prop="date" label="最后验证时间" min-width="160">
                        <template slot-scope="{ row }">
                            <span class="date-text"><i class="el-icon-time"></i> {{ row.date }}</span>
                        </template>
                    </el-table-column>
                </el-table>

                <div class="pagination-container">
                    <el-pagination @current-change="handleCurrentChange" :current-page.sync="currentPage"
                        :page-size="pageSize" layout="total, prev, pager, next, jumper" :total="filteredData.length"
                        background>
                    </el-pagination>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    Message,
    MessageBox
} from 'element-ui';
export default {
    name: "ProxyDashboard",
    data() {
        return {
            isDarkMode: true, // 默认开启黑夜模式，更具极客感
            searchQuery: "",
            filterType: "",
            filterNat: "",
            currentPage: 1,
            pageSize: 10,
            // 模拟后端返回的数据
            rawData: [
                { ip: "118.190.244.238:8080", nat: "高匿", type: "HTTPS", date: "2026-03-06 14:23:11", vld: 45 },
                { ip: "27.42.168.46:9000", nat: "高匿", type: "SOCKS5", date: "2026-03-06 14:20:05", vld: 120 },
                { ip: "114.231.42.112:8888", nat: "透明", type: "HTTP", date: "2026-03-06 14:15:33", vld: 550 },
                { ip: "61.164.39.69:53281", nat: "普匿", type: "HTTPS", date: "2026-03-06 14:10:01", vld: 210 },
                // ... 可以在此补充更多模拟数据用于测试翻页
            ]
        };
    },
    mounted() {
        // 自动生成一些假数据填满分页
        for (let i = 0; i < 35; i++) {
            this.rawData.push({
                ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 8000) + 1000}`,
                nat: ["高匿", "普匿", "透明"][Math.floor(Math.random() * 3)],
                type: ["HTTP", "HTTPS", "SOCKS5"][Math.floor(Math.random() * 3)],
                date: "2026-03-06 14:00:00",
                vld: Math.floor(Math.random() * 800) + 10
            });
        }
    },
    computed: {
        // 处理多条件过滤
        filteredData() {
            return this.rawData.filter(item => {
                const matchSearch = item.ip.includes(this.searchQuery);
                const matchType = this.filterType ? item.type === this.filterType : true;
                const matchNat = this.filterNat ? item.nat === this.filterNat : true;
                return matchSearch && matchType && matchNat;
            });
        },
        // 处理分页
        paginatedData() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.filteredData.slice(start, end);
        }
    },
    watch: {
        // 过滤条件改变时，重置回第一页
        searchQuery() { this.currentPage = 1; },
        filterType() { this.currentPage = 1; },
        filterNat() { this.currentPage = 1; }
    },
    methods: {
        toggleTheme() {
            this.isDarkMode = !this.isDarkMode;
        },
        handleCurrentChange(val) {
            this.currentPage = val;
        },
        copyIp(row) {
            const textToCopy = row.ip;
            // 现代浏览器剪贴板 API
            navigator.clipboard.writeText(textToCopy).then(() => {
                Message.success({
                    message: `节点 ${textToCopy} 已复制到剪贴板`,
                    customClass: this.isDarkMode ? 'dark-message' : ''
                });
            }).catch(() => {
                Message.error('复制失败，请手动选择复制');
            });
        },
        exportData() {
            Message.info("正在生成节点配置文档...");
            // 此处可接入导出 CSV/JSON 的逻辑
        },
        // 样式与状态辅助函数
        getProtocolTagType(type) {
            const map = { 'HTTPS': 'success', 'SOCKS5': 'warning', 'HTTP': 'info' };
            return map[type] || 'primary';
        },
        getNatClass(nat) {
            const map = { '高匿': 'color-safe', '普匿': 'color-warn', '透明': 'color-danger' };
            return map[nat] || '';
        },
        getLatencyClass(vld) {
            if (vld < 100) return 'latency-fast';
            if (vld < 400) return 'latency-medium';
            return 'latency-slow';
        },
        getLatencyBarStyle(vld) {
            // 假设 1000ms 为满条
            let percent = (vld / 1000) * 100;
            if (percent > 100) percent = 100;
            return { width: `${percent}%` };
        },
        tableRowClassName({ row, rowIndex }) {
            return 'custom-table-row';
        }
    }
};
</script>

<style scoped>
/* 核心设计思路：响应你的定制色系，全局色彩由 CSS 变量控制 */
.proxy-dashboard {
  /* 亮色模式变量 (保持清新风格) */
  --bg-color: #f4f7fa;
  --card-bg: rgba(255, 255, 255, 0.85);
  --text-main: #2c3e50;
  --text-sub: #7f8c8d;
  --border-color: #ebeef5;
  --hover-bg: #f0f4f8;
  --bg-progress: #ebeef5;
  --bg-badge: #ffffff;
  
  --color-safe: #27ae60;
  --color-warn: #f39c12;
  --color-danger: #c0392b;

  min-height: 100vh;
  padding: 30px 20px;
  background-color: var(--bg-color);
  color: var(--text-main);
  transition: all 0.4s ease;
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}

/* 黑夜模式 - 完美融入你的专属定制色系 */
.proxy-dashboard.dark-theme {
  /* --- 应用你的定制专属色系 --- */
  --bg-app: #121212;
  --bg-card: #1e1e1e;
  --bg-hover: #2c2c2c;
  --bg-progress: #333333;
  --bg-badge: #333333;

  /* 将系统变量映射到你的定制色 */
  --bg-color: var(--bg-app);
  --card-bg: var(--bg-card);
  --hover-bg: var(--bg-hover);
  --border-color: var(--bg-hover); /* 边框色直接用 hover 色，融入背景更加无缝 */
  
  --text-main: #e0e0e0; /* 配合纯黑背景的柔和灰白字 */
  --text-sub: #8a8a8a;
  
  /* 状态色在纯黑背景下稍微提亮，增加霓虹质感 */
  --color-safe: #00e676;
  --color-warn: #ffea00;
  --color-danger: #ff1744;
}

.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部样式 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.title-group h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-group .subtitle {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 5px;
  display: block;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.theme-switch {
  cursor: pointer;
  font-size: 22px;
  color: var(--text-main);
  transition: transform 0.3s;
}
.theme-switch:hover {
  transform: rotate(30deg);
}

/* 卡片样式 */
.glass-card {
  background: var(--card-bg);
  /* 移除了高强度的毛玻璃，配合你的实体纯色，改成更干净的面板风格 */
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  padding: 20px;
  transition: all 0.3s ease;
}
.dark-theme .glass-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); /* 加深阴影，让 #1e1e1e 在 #121212 上浮起来 */
}

/* 控制面板 */
.control-panel {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}
.filter-item {
  width: 200px;
}
.search-input {
  width: 300px;
}

/* Element UI 输入框在暗黑模式下的穿透处理 */
::v-deep .dark-theme .el-input__inner {
  background-color: var(--bg-hover);
  border-color: var(--border-color);
  color: var(--text-main);
}

/* 表格深度定制 */
.table-wrapper {
  padding: 0;
  overflow: hidden;
}

::v-deep .el-table {
  background-color: transparent !important;
  color: var(--text-main);
}
::v-deep .el-table tr {
  background-color: transparent !important;
}
::v-deep .el-table th.el-table__cell {
  background-color: var(--hover-bg) !important;
  color: var(--text-sub);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}
::v-deep .el-table td.el-table__cell {
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}
::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
  background-color: var(--hover-bg) !important;
}
::v-deep .el-table::before {
  display: none;
}

/* 单元格内部元素定制 */
.ip-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
}
.copy-icon {
  cursor: pointer;
  color: var(--text-sub);
  opacity: 0;
  transition: all 0.2s;
}
.ip-cell:hover .copy-icon {
  opacity: 1;
  color: var(--color-safe);
}

/* 标签应用你指定的 badge 颜色 */
::v-deep .dark-theme .custom-tag {
  background-color: var(--bg-badge);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  border-radius: 6px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.nat-indicator {
  font-weight: 600;
  font-size: 13px;
}

/* 延迟可视化进度条 */
.latency-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.latency-text {
  font-size: 13px;
  font-weight: 600;
}
.latency-bar-bg {
  width: 100px;
  height: 4px;
  background-color: var(--bg-progress); /* 你的专属进度条底色 */
  border-radius: 2px;
  overflow: hidden;
}
.latency-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease-out;
}

/* 状态颜色 */
.color-safe, .latency-fast { color: var(--color-safe); }
.color-warn, .latency-medium { color: var(--color-warn); }
.color-danger, .latency-slow { color: var(--color-danger); }

.latency-fast.latency-bar-fill { background-color: var(--color-safe); }
.latency-medium.latency-bar-fill { background-color: var(--color-warn); }
.latency-slow.latency-bar-fill { background-color: var(--color-danger); }

.date-text {
  color: var(--text-sub);
  font-size: 13px;
}

/* 分页定制 */
.pagination-container {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
}
::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active {
  background-color: var(--color-safe);
}
::v-deep .el-pagination.is-background .btn-next, 
::v-deep .el-pagination.is-background .btn-prev, 
::v-deep .el-pagination.is-background .el-pager li {
  background-color: var(--hover-bg);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}
</style>
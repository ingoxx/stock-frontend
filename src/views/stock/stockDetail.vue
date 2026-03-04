<template>
  <!-- 根节点通过动态 class 绑定主题 -->
  <div class="stock-dashboard" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <div class="glass-container">
      
      <!-- 头部标题与控制区 -->
      <div class="header">
        <div class="title-box">
          <i class="el-icon-data-line pulse-icon"></i>
          <h1>实时行情监控中心</h1>
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
        <el-input 
          v-model="searchCode" 
          placeholder="请输入股票代码 (如: 300265)" 
          class="custom-input"
          @keyup.enter.native="fetchStockData">
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <el-button type="primary" class="add-btn" @click="fetchStockData" :loading="loading">
          <i class="el-icon-plus"></i> 添加自选
        </el-button>
      </div>

      <!-- 股票数据表格 -->
      <div class="table-wrapper">
        <el-table 
          :data="stockList" 
          style="width: 100%" 
          class="custom-table"
          :empty-text="'暂无自选股票，请在上方添加'">
          
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
              <el-tag :type="scope.row.changepercent >= 0 ? 'danger' : 'success'" effect="dark" class="change-tag">
                <i :class="scope.row.changepercent >= 0 ? 'el-icon-top' : 'el-icon-bottom'"></i>
                {{ scope.row.changepercent.toFixed(2) }}%
              </el-tag>
            </template>
          </el-table-column>

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

          <el-table-column label="操作" width="100" align="center">
            <template slot-scope="scope">
              <el-button type="text" class="delete-btn" @click="removeStock(scope.$index)">
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
    Message,
    MessageBox
} from 'element-ui';

export default {
  name: "StockDashboard",
  data() {
    return {
      isDarkMode: true, // 默认黑夜模式
      searchCode: "",
      loading: false,
      stockList:[],
      currentTime: "",
      updateTimer: null,
      clockTimer: null,
    };
  },
  mounted() {
    // 尝试从本地存储读取用户的主题偏好
    const savedTheme = localStorage.getItem("dashboard_theme");
    if (savedTheme !== null) {
      this.isDarkMode = savedTheme === "dark";
    }

    this.stockList.push(this.getMockData("300265"));
    this.startClock();
    this.startRealTimeSimulation();
  },
  beforeDestroy() {
    clearInterval(this.updateTimer);
    clearInterval(this.clockTimer);
  },
  methods: {
    // 切换主题方法
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
      localStorage.setItem("dashboard_theme", this.isDarkMode ? "dark" : "light");
    },

    fetchStockData() {
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
      
      setTimeout(() => {
        const newData = this.getMockData(this.searchCode);
        this.stockList.unshift(newData);
        Message.success(`成功添加股票：${newData.name}`);
        this.searchCode = "";
        this.loading = false;
      }, 600);
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

    startRealTimeSimulation() {
      this.updateTimer = setInterval(() => {
        this.stockList.forEach(stock => {
          const randomChange = (Math.random() - 0.5) * 0.1; 
          let newTrade = parseFloat(stock.trade) + randomChange;
          
          stock.trade = newTrade.toFixed(2);
          stock.changepercent += randomChange;
          
          if (newTrade > parseFloat(stock.high)) stock.high = newTrade.toFixed(2);
          if (newTrade < parseFloat(stock.low)) stock.low = newTrade.toFixed(2);
          
          stock.ticktime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
          stock.volume += Math.floor(Math.random() * 1000);
        });
      }, 3000);
    },

    getMockData(code) {
      const names =["通光线缆", "东方财富", "宁德时代", "贵州茅台", "比亚迪", "隆基绿能", "腾讯控股"];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      if (code === "300265") {
        return {
          "symbol": "sz300265", "code": "300265", "name": "通光线缆", 
          "open": "14.62", "settlement": "14.9", "trade": "17.88", 
          "high": "17.88", "low": "14.49", "amount": 1371381565, 
          "volume": 8166554, "ticktime": "15:35:15", "industry": "", 
          "main_business": "", "changepercent": 20.0, "buy": "14.62"
        };
      } else {
        const basePrice = (Math.random() * 100 + 10).toFixed(2);
        const changePct = (Math.random() * 20 - 10);
        return {
          "symbol": `sz${code}`, "code": code, "name": randomName,
          "open": basePrice, "settlement": basePrice, 
          "trade": (parseFloat(basePrice) * (1 + changePct/100)).toFixed(2),
          "high": (parseFloat(basePrice) * 1.05).toFixed(2), 
          "low": (parseFloat(basePrice) * 0.95).toFixed(2),
          "amount": Math.floor(Math.random() * 2000000000), 
          "volume": Math.floor(Math.random() * 10000000), 
          "ticktime": new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          "changepercent": changePct
        };
      }
    }
  }
};
</script>

<style scoped>
/* ================= CSS 变量：定义双主题 ================= */
.theme-dark {
  --app-bg: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  --glass-bg: rgba(30, 41, 59, 0.6);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: rgba(0, 0, 0, 0.5);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --title-gradient: linear-gradient(to right, #60a5fa, #a78bfa);
  --time-bg: rgba(0, 0, 0, 0.3);
  --input-bg: rgba(15, 23, 42, 0.5);
  --border-color: #334155;
  --table-header-bg: rgba(15, 23, 42, 0.4);
  --table-hover-bg: rgba(51, 65, 85, 0.5);
  --icon-color: #64748b;
  --flat-color: #cbd5e1;
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
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 25px 50px -12px var(--glass-shadow);
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
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
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
  background: #cbd5e1; /* 白天模式底色 */
  border-radius: 30px;
  position: relative;
  transition: background 0.4s ease;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.track-dark {
  background: #0f172a; /* 黑夜模式底色 */
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.thumb-dark {
  transform: translateX(32px); /* 拨到右侧 */
  background: #1e293b;
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

::v-deep .el-table th, ::v-deep .el-table tr {
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

::v-deep .el-table--enable-row-hover .el-table__body tr:hover > td {
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
  color: #ef4444 !important; /* 红涨 */
}
.color-down {
  color: #10b981 !important; /* 绿跌 */
}
.color-flat {
  color: var(--flat-color) !important; /* 平盘 */
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
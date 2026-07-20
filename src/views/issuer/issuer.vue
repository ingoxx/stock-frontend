<template>
  <!-- 最外层容器，控制黑夜/白天模式 -->
  <div class="bp-container" :class="{ 'is-dark': isDark }">
    
    <!-- 1. 顶部 Header -->
    <div class="bp-header">
      <div class="header-logo">
        <i class="el-icon-document" style="color: #409EFF; margin-right: 8px;"></i>
        <span>故障记录文档</span>
      </div>
      <div class="header-actions">
        <el-button type="success" size="small" icon="el-icon-plus" @click="openProblemDialog">录入新故障</el-button>
        <!-- 主题切换按钮 -->
        <div class="theme-btn" @click="toggleTheme" :title="isDark ? '切换到白天' : '切换到黑夜'">
          <i :class="isDark ? 'el-icon-sunny' : 'el-icon-moon'"></i>
        </div>
      </div>
    </div>

    <!-- 2. 主体 Body (强制横向排列，绝不错乱) -->
    <div class="bp-body">
      
      <!-- 左侧边栏 (Sidebar) -->
      <div class="bp-sidebar">
        <div class="sidebar-action">
          <el-button type="primary" plain size="small" style="width: 100%;" icon="el-icon-folder-add" @click="openCategoryDialog">
            添加新分类
          </el-button>
        </div>
        
        <!-- 左侧分类列表 (纯手工 CSS 构建，替代 el-menu，永不失效) -->
        <div class="menu-list">
          <div 
            class="menu-item" 
            v-for="cat in categories" 
            :key="cat.id"
            :class="{ 'active': activeCategoryId === cat.id }"
            @click="activeCategoryId = cat.id"
          >
            <i class="el-icon-folder-opened"></i>
            <span class="menu-text">{{ cat.name }}</span>
            <i class="el-icon-arrow-right menu-arrow" v-show="activeCategoryId === cat.id"></i>
          </div>
        </div>
      </div>

      <!-- 右侧主内容区 (Main) -->
      <div class="bp-main">
        <div class="main-header">
          <h2 class="category-title">
            <el-tag size="small" type="info" style="margin-right: 12px;">当前分类</el-tag>
            {{ currentCategoryName }}
          </h2>
        </div>

        <!-- 缺省空白页 -->
        <div class="empty-state" v-if="currentProblems.length === 0">
          <i class="el-icon-reading empty-icon"></i>
          <p>当前分类下暂无故障记录，请点击右上角录入</p>
        </div>

        <!-- 故障卡片列表 (手工卡片，替代 el-collapse，更加美观) -->
        <div class="problem-list" v-else>
          <div class="problem-card" v-for="(prob, index) in currentProblems" :key="prob.id">
            <div class="card-header">
              <div class="card-title">
                <span class="index-badge">#{{ index + 1 }}</span>
                {{ prob.title }}
              </div>
              <el-button type="text" style="color: #f56c6c;" icon="el-icon-delete" @click="deleteProblem(prob.id)">删除</el-button>
            </div>
            <div class="card-body">
              <div class="solution-label"><i class="el-icon-magic-stick"></i> 解决方法与排查思路：</div>
              <div class="solution-code">{{ prob.solution }}</div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 弹窗：添加分类 -->
    <el-dialog title="添加问题分类" :visible.sync="categoryVisible" width="400px" :close-on-click-modal="false">
      <el-form :model="categoryForm" ref="categoryForm" :rules="categoryRules" size="small" label-position="top">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称，如: 数据库"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="categoryVisible = false" size="small">取 消</el-button>
        <el-button type="primary" @click="submitCategory" size="small">确 定</el-button>
      </div>
    </el-dialog>

    <!-- 弹窗：添加故障问题 -->
    <el-dialog :title="'录入故障 - ' + currentCategoryName" :visible.sync="problemVisible" width="580px" :close-on-click-modal="false">
      <el-form :model="problemForm" ref="problemForm" :rules="problemRules" size="small" label-position="top">
        <el-form-item label="问题简述 (标题)" prop="title">
          <el-input v-model="problemForm.title" placeholder="请简短描述遇到的报错或现象"></el-input>
        </el-form-item>
        <el-form-item label="详细解决方法" prop="solution">
          <el-input type="textarea" :rows="6" v-model="problemForm.solution" placeholder="请输入排查思路、相关命令及最终解决办法..."></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="problemVisible = false" size="small">取 消</el-button>
        <el-button type="primary" @click="submitProblem" size="small">保 存 记 录</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
export default {
  name: 'TroubleRecord',
  data() {
    return {
      isDark: false,
      activeCategoryId: 1, // 默认选中的分类
      
      categoryVisible: false,
      problemVisible: false,

      categories: [
        { id: 1, name: 'Kubernetes' },
        { id: 2, name: 'Docker' },
        { id: 3, name: 'AI 模型' },
        { id: 4, name: 'Linux 系统' }
      ],

      problems: [
        { 
          id: 1, 
          categoryId: 1, 
          title: 'Pod 状态一直处于 CrashLoopBackOff', 
          solution: '1. 查看 Pod 容器异常日志：\n   kubectl logs <pod-name> -n <namespace>\n2. 查看调度事件：\n   kubectl describe pod <pod-name> -n <namespace>\n3. 常见原因是健康检查（liveness probe）失败或内存 OOMKilled。' 
        },
        { 
          id: 2, 
          categoryId: 2, 
          title: 'Docker 容器内无法解析并访问外网', 
          solution: '1. 检查宿主机 IP 转发：sysctl net.ipv4.ip_forward\n   若为0，修改 /etc/sysctl.conf 增加 net.ipv4.ip_forward=1 并执行 sysctl -p。\n2. 重启 docker 服务：systemctl restart docker' 
        }
      ],

      categoryForm: { name: '' },
      categoryRules: { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] },

      problemForm: { title: '', solution: '' },
      problemRules: {
        title: [{ required: true, message: '请输入问题简述', trigger: 'blur' }],
        solution: [{ required: true, message: '请输入解决方法', trigger: 'blur' }]
      }
    }
  },
  computed: {
    // 过滤得到当前选中的分类名
    currentCategoryName() {
      const cat = this.categories.find(c => c.id === this.activeCategoryId);
      return cat ? cat.name : '未分类';
    },
    // 过滤得到当前分类下的故障列表
    currentProblems() {
      return this.problems.filter(p => p.categoryId === this.activeCategoryId);
    }
  },
  methods: {
    toggleTheme() {
      this.isDark = !this.isDark;
    },
    openCategoryDialog() {
      this.categoryForm.name = '';
      this.categoryVisible = true;
      this.$nextTick(() => { this.$refs.categoryForm && this.$refs.categoryForm.clearValidate(); });
    },
    submitCategory() {
      this.$refs.categoryForm.validate(valid => {
        if (valid) {
          const newId = Date.now();
          this.categories.push({ id: newId, name: this.categoryForm.name });
          this.activeCategoryId = newId; // 自动跳转到新分类
          this.categoryVisible = false;
          this.$message.success('分类创建成功');
        }
      });
    },
    openProblemDialog() {
      this.problemForm = { title: '', solution: '' };
      this.problemVisible = true;
      this.$nextTick(() => { this.$refs.problemForm && this.$refs.problemForm.clearValidate(); });
    },
    submitProblem() {
      this.$refs.problemForm.validate(valid => {
        if (valid) {
          this.problems.push({
            id: Date.now(),
            categoryId: this.activeCategoryId, // 自动挂载到当前左侧选中的分类
            title: this.problemForm.title,
            solution: this.problemForm.solution
          });
          this.problemVisible = false;
          this.$message.success('记录添加成功');
        }
      });
    },
    deleteProblem(id) {
      this.$confirm('确定要删除这条记录吗?', '提示', { type: 'warning' }).then(() => {
        this.problems = this.problems.filter(p => p.id !== id);
        this.$message.success('删除成功');
      }).catch(() => {});
    }
  }
}
</script>

<style scoped>
/* ==========================================
   强制页面级 CSS Reset 与 颜色变量
   ========================================== */
.bp-container {
  /* 白天模式颜色 */
  --bg-main: #f5f7fa;
  --bg-aside: #ffffff;
  --bg-header: #ffffff;
  --bg-card: #ffffff;
  --text-main: #303133;
  --text-sub: #606266;
  --text-light: #909399;
  --border-color: #ebeef5;
  --hover-bg: #f5f7fa;
  --active-bg: #ecf5ff;
  --code-bg: #282c34;
  --code-text: #abb2bf;

  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column !important; /* 强制纵向排列 header和body */
  overflow: hidden;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background-color: var(--bg-main);
  transition: background-color 0.3s;
}

.bp-container.is-dark {
  /* 黑夜模式颜色 */
  --bg-main: #0c0c0e;
  --bg-aside: #1b1b1e;
  --bg-header: #1b1b1e;
  --bg-card: #1e1e22;
  --text-main: #f4f4f5;
  --text-sub: #a1a1aa;
  --text-light: #71717a;
  --border-color: #2e2e33;
  --hover-bg: #26262b;
  --active-bg: #2e2e38;
  --code-bg: #141416;
  --code-text: #9a9ca3;
}

/* ==========================================
   1. 顶部 Header (强制横向 Flex)
   ========================================== */
.bp-header {
  height: 60px;
  flex-shrink: 0;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: row !important; /* 强制横向 */
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  z-index: 10;
}
.header-logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
}
.header-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.theme-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-sub);
  cursor: pointer;
  margin-left: 16px;
}
.theme-btn:hover {
  background-color: var(--active-bg);
  color: #409EFF;
}

/* ==========================================
   2. 主体 Body (强制横向 Flex：左宽260，右占满)
   ========================================== */
.bp-body {
  flex: 1;
  display: flex;
  flex-direction: row !important; /* 强制横向，绝不错乱 */
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* 左侧栏 */
.bp-sidebar {
  width: 260px;
  flex-shrink: 0;
  background-color: var(--bg-aside);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column !important;
}
.sidebar-action {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}
.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.menu-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 44px;
  padding: 0 20px;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.2s;
}
.menu-item:hover {
  background-color: var(--hover-bg);
}
.menu-item.active {
  background-color: var(--active-bg);
  color: #409EFF;
  border-right: 3px solid #409EFF;
}
.menu-text {
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  font-weight: 500;
}
.menu-arrow {
  font-size: 12px;
}

/* 右侧内容区 */
.bp-main {
  flex: 1;
  background-color: var(--bg-main);
  padding: 24px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.main-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
.category-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
}

/* ==========================================
   3. 故障卡片区 (自定义卡片，替代 el-collapse)
   ========================================== */
.problem-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.problem-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
}
.index-badge {
  background-color: var(--active-bg);
  color: #409EFF;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  margin-right: 12px;
}
.card-body {
  padding: 20px;
}
.solution-label {
  font-size: 15px;
  font-weight: 600;
  color: #409EFF;
  margin-bottom: 12px;
}
.solution-code {
  background-color: var(--code-bg);
  color: var(--code-text);
  padding: 16px;
  border-radius: 6px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  border-left: 4px solid #409EFF;
}

/* 缺省空白页 */
.empty-state {
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-light);
}
.empty-icon {
  font-size: 64px;
  color: var(--border-color);
  margin-bottom: 16px;
}

/* ==========================================
   4. 暗黑模式 对 Element UI 弹窗和表单 的兼容
   ========================================== */
.bp-container.is-dark ::v-deep .el-dialog {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
}
.bp-container.is-dark ::v-deep .el-dialog__title,
.bp-container.is-dark ::v-deep .el-form-item__label {
  color: var(--text-main);
}
.bp-container.is-dark ::v-deep .el-input__inner,
.bp-container.is-dark ::v-deep .el-textarea__inner {
  background-color: #242428;
  border-color: var(--border-color);
  color: var(--text-main);
}
.bp-container.is-dark ::v-deep .el-message-box {
  background-color: var(--bg-card);
  border-color: var(--border-color);
}
.bp-container.is-dark ::v-deep .el-message-box__title,
.bp-container.is-dark ::v-deep .el-message-box__content {
  color: var(--text-main);
}
</style>
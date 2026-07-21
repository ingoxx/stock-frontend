<template>
  <div class="bp-wrapper" :class="{ 'is-dark': isDark }" v-loading="pageLoading" element-loading-background="rgba(0, 0, 0, 0.8)">
    
    <!-- ================= 1. 全新毛玻璃 Header ================= -->
    <header class="bp-header">
      <div class="header-left">
        <div class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'">
          <i :class="sidebarCollapsed ? 'el-icon-s-unfold' : 'el-icon-s-fold'"></i>
        </div>
        <div class="header-logo">
          <div class="logo-icon-wrapper">
            <i class="el-icon-data-analysis"></i>
          </div>
          <span class="logo-text">Trouble<span class="logo-highlight">Docs</span></span>
        </div>
      </div>
      
      <div class="header-actions">
        <el-button class="glow-btn primary-gradient-btn" size="small" icon="el-icon-plus" @click="openProblemDialog">
          录入新故障
        </el-button>
        <div class="divider"></div>
        <div class="theme-btn" @click="toggleTheme" :title="isDark ? '切换到白天模式' : '切换到暗黑深邃模式'">
          <i :class="isDark ? 'el-icon-sunny' : 'el-icon-moon'"></i>
        </div>
        <el-avatar class="user-avatar" size="small" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"></el-avatar>
      </div>
    </header>

    <!-- ================= 2. 主体区 (Flex 弹性并排) ================= -->
    <div class="bp-body">
      
      <!-- 左侧边栏 (Sidebar) -->
      <aside class="bp-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
        <div class="sidebar-top-action">
          <el-button class="add-cat-btn" plain size="small" icon="el-icon-folder-add" @click="openCategoryDialog" :loading="apiLoading">
            新建问题分类
          </el-button>
          
          <div class="search-box-wrapper">
            <el-input 
              class="modern-el-input"
              v-model="searchCategoryQuery" 
              placeholder="搜索分类目录..." 
              prefix-icon="el-icon-search"
              clearable
            ></el-input>
          </div>
        </div>
        
        <div class="menu-list" v-loading="apiLoading">
          <div class="empty-hint" v-if="filteredCategories.length === 0">
            <i class="el-icon-box"></i>
            <span>暂无匹配分类</span>
          </div>

          <div 
            class="menu-item" 
            v-for="cat in filteredCategories" 
            :key="cat.id"
            :class="{ 'active': activeCategoryId === cat.id }"
            @click="selectCategory(cat.id)"
          >
            <div class="menu-left">
              <i class="menu-cat-icon" :class="activeCategoryId === cat.id ? 'el-icon-folder-opened' : 'el-icon-folder'"></i>
              <el-input 
                v-if="editCategoryId === cat.id"
                :ref="'catInput_' + cat.id"
                v-model="cat.name"
                size="mini"
                class="category-inline-input"
                @blur="finishEditCategory(cat)"
                @keyup.enter.native="finishEditCategory(cat)"
                @click.stop.native
              ></el-input>
              <div v-else class="menu-text-wrapper">
                <span class="menu-text" :title="cat.name">{{ cat.name }}</span>
                <span class="menu-badge" v-if="cat.docCount > 0">{{ cat.docCount }}</span>
              </div>
            </div>
            
            <el-popover
              :ref="'popover_' + cat.id"
              placement="right-start"
              width="180"
              trigger="click"
              :visible-arrow="false"
              :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'"
            >
              <div class="action-menu-list">
                <div class="action-item" @click.stop="handleCategoryCommand('share', cat)">
                  <i class="el-icon-share"></i> <span>分享该库</span>
                </div>
                <div class="action-item" @click.stop="handleCategoryCommand('rename', cat)">
                  <i class="el-icon-edit"></i> <span>重命名分类</span>
                </div>
                <div class="action-divider"></div>
                <div class="action-item danger" @click.stop="requestDeleteCategory(cat)">
                  <i class="el-icon-delete"></i> <span>删除整个分类</span>
                </div>
              </div>
              <div class="menu-more" slot="reference" @click.stop>
                <i class="el-icon-more"></i>
              </div>
            </el-popover>
          </div>
        </div>
      </aside>

      <!-- 右侧阅读工作区 (Main) -->
      <main class="bp-main">
        <div class="main-content-container">
          
          <div class="main-header">
            <div class="category-meta">
              <div class="category-badge">当前目录</div>
              <h1 class="category-title">{{ currentCategoryName }}</h1>
              <p class="category-subtitle">共收录 {{ currentProblems.length }} 个故障解决方案</p>
            </div>
            
            <div class="main-header-actions">
              <div class="search-box-wrapper main-search">
                <el-input 
                  class="modern-el-input"
                  v-model="searchProblemQuery" 
                  placeholder="搜索故障 (支持标题/内容)" 
                  prefix-icon="el-icon-search"
                  clearable
                ></el-input>
              </div>

              <!-- 全选控制框：仅在多选模式下优雅渐显 -->
              <transition name="el-fade-in-linear">
                <el-checkbox 
                  v-if="isBatchMode && currentProblems.length > 0" 
                  class="check-all-box" 
                  :indeterminate="isIndeterminate" 
                  v-model="checkAll"
                >
                  本页全选
                </el-checkbox>
              </transition>

              <el-popover
                ref="exportPopover"
                placement="bottom-end"
                width="220"
                trigger="click"
                :visible-arrow="false"
                :popper-class="isDark ? 'custom-dark-popover' : 'custom-light-popover'"
              >
                <div class="action-menu-list">
                  <div class="action-item" @click="exportToMarkdown('all')">
                    <i class="el-icon-document-copy"></i> <span>直接导出当前目录全量</span>
                  </div>
                  <div class="action-item" :class="{'is-disabled': selectedProblemIds.length === 0}" @click="selectedProblemIds.length > 0 && exportToMarkdown('selected')">
                    <i class="el-icon-finished"></i> <span>导出勾选项 ({{ selectedProblemIds.length }})</span>
                  </div>
                  <div class="action-divider"></div>
                  <!-- 控制是否进入跨目录多选模式 -->
                  <div class="action-item" @click="toggleBatchMode" :class="{ 'is-active-item': isBatchMode }">
                    <i class="el-icon-document-checked"></i> <span>{{ isBatchMode ? '退出自定义跨目录选择' : '自定义跨目录选出文档' }}</span>
                  </div>
                </div>
                <el-button slot="reference" class="export-btn" icon="el-icon-download" plain>
                  导出文档 <i class="el-icon-arrow-down el-icon--right"></i>
                </el-button>
              </el-popover>
            </div>
          </div>
          
          <!-- 多选模式下的吸顶操作横幅 -->
          <transition name="toast-slide-down">
            <div v-if="isBatchMode" class="batch-mode-banner">
              <div class="batch-banner-left">
                <i class="el-icon-magic-stick"></i> 
                跨目录多选模式已开启。请在左侧勾选，目前已选中 <strong>{{ selectedProblemIds.length }}</strong> 篇文档。
              </div>
              <div class="batch-banner-right">
                <el-button size="mini" plain @click="toggleBatchMode">取 消</el-button>
                <el-button size="mini" type="primary" class="primary-gradient-btn" @click="exportToMarkdown('selected')" :disabled="selectedProblemIds.length === 0">导出已选项</el-button>
              </div>
            </div>
          </transition>

          <!-- 缺省状态 -->
          <div class="empty-state" v-if="currentProblems.length === 0">
            <div class="empty-art">
              <i class="el-icon-document-delete"></i>
            </div>
            <h3>{{ searchProblemQuery ? '未找到相关内容' : '此目录还是空的' }}</h3>
            <p>{{ searchProblemQuery ? '请尝试更换搜索关键词或检查拼写' : '您可以点击右上角按钮录入第一条故障记录' }}</p>
          </div>

          <!-- 故障流瀑布列表：现替换为 paginatedProblems 控制当前页显示数据 -->
          <el-checkbox-group v-model="selectedProblemIds" class="problem-list" :class="{'is-batch-mode': isBatchMode}" v-else v-loading="apiLoading">
            
            <div class="problem-item-wrapper" v-for="(prob, index) in paginatedProblems" :key="prob.id">
              
              <!-- 外部滑动圆形多选框 -->
              <div class="outer-checkbox-wrapper" @click.stop="toggleSingleSelection(prob.id)">
                <el-checkbox class="outer-checkbox" :label="prob.id">{{""}}</el-checkbox>
              </div>
              
              <!-- 原卡片主体 -->
              <div class="problem-card" :class="{'is-selected': selectedProblemIds.includes(prob.id)}" @click="isBatchMode && toggleSingleSelection(prob.id)">
                <div class="card-header">
                  <div class="card-title-group">
                    <!-- 全局递增的编号 -->
                    <div class="index-badge">#{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</div>
                    
                    <el-input 
                      v-if="editTitleId === prob.id"
                      :ref="'titleInput_' + prob.id"
                      v-model="prob.title" 
                      size="small"
                      class="inline-edit-input"
                      @blur="finishEditTitle(prob)"
                      @keyup.enter.native="finishEditTitle(prob)"
                      @click.stop.native
                    ></el-input>
                    <div v-else class="editable-text-wrapper" @click.stop="startEditTitle(prob.id)">
                      <h3 class="editable-text">{{ prob.title }}</h3>
                      <i class="el-icon-edit edit-icon" title="点击编辑"></i>
                    </div>
                  </div>
                  
                  <div class="card-header-actions" @click.stop>
                    <span class="update-time"><i class="el-icon-time"></i> {{ prob.updatedAt || '刚刚' }}</span>
                    <div class="action-icons">
                      <el-button type="text" class="icon-btn" icon="el-icon-download" @click.stop="exportSingleProblem(prob)" title="仅导出此文档"></el-button>
                      <el-button type="text" class="card-delete-btn icon-btn" icon="el-icon-delete" @click.stop="requestDeleteProblem(prob.id)" title="删除记录"></el-button>
                    </div>
                  </div>
                </div>
                
                <div class="card-body" @click.stop>
                  <div class="solution-header">
                    <div class="solution-label">
                      <i class="el-icon-magic-stick"></i> 排查思路与解决方案
                      <span class="edit-hint">点击虚线框内修改</span>
                    </div>
                    <div class="solution-actions">
                      <div class="copy-btn" @click.stop="openMoveDialog(prob)">
                        <i class="el-icon-folder-opened"></i> <span>移动到指定目录</span>
                      </div>
                      <div class="copy-btn" @click.stop="copySolution(prob.solution)">
                        <i class="el-icon-document-copy"></i> <span>复制代码</span>
                      </div>
                    </div>
                  </div>
                  
                  <el-input 
                    v-if="editSolutionId === prob.id"
                    :ref="'solutionInput_' + prob.id"
                    type="textarea" 
                    :autosize="{ minRows: 4, maxRows: 12 }"
                    v-model="prob.solution" 
                    class="inline-edit-textarea"
                    @blur="finishEditSolution(prob)"
                  ></el-input>
                  <div 
                    v-else 
                    class="solution-code editable-block" 
                    @click="startEditSolution(prob.id)"
                  >
                    {{ prob.solution }}
                  </div>
                </div>
              </div>

            </div>
          </el-checkbox-group>

          <!-- ================= 新增：现代化底部交互分页器 ================= -->
          <div class="pagination-wrapper" v-if="currentProblems.length > 0">
            <el-pagination
              background
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="[5, 10, 20]"
              :page-size="pageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :total="currentProblems.length">
            </el-pagination>
          </div>

        </div>
      </main>
    </div>

    <!-- 移动目录弹窗 -->
    <el-dialog title="移动故障文档到指定目录" :visible.sync="moveDialogVisible" width="450px" :close-on-click-modal="false" custom-class="modern-dialog">
      <el-form size="small" label-position="top">
        <el-form-item label="选择目标分类目录">
          <el-select 
            v-model="moveToCategoryId" 
            placeholder="请选择你要转移到的目标目录" 
            style="width: 100%;"
            :popper-class="isDark ? 'custom-dark-select' : 'custom-light-select'"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
              :disabled="cat.id === (moveTargetProblem && moveTargetProblem.categoryId)"
            >
              <span style="float: left">{{ cat.name }}</span>
              <span v-if="cat.id === (moveTargetProblem && moveTargetProblem.categoryId)" style="float: right; color: #8492a6; font-size: 13px">当前所在</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="moveDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
        <el-button type="primary" @click="confirmMoveProblem" size="small" :loading="apiLoading" class="primary-gradient-btn">确 认 移 动</el-button>
      </div>
    </el-dialog>

    <!-- 删除确认窗 -->
    <el-dialog title="操作确认" :visible.sync="deleteDialogVisible" width="400px" :close-on-click-modal="false" custom-class="modern-dialog">
      <div class="dialog-danger-content">
        <i class="el-icon-warning"></i>
        <span>{{ deleteMessage }}</span>
      </div>
      <div slot="footer">
        <el-button @click="deleteDialogVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
        <el-button type="danger" @click="confirmDelete" size="small" :loading="apiLoading">确 认 删 除</el-button>
      </div>
    </el-dialog>

    <!-- 撤回提示 Toast -->
    <transition name="toast-slide-down">
      <div class="undo-toast" v-if="undoData" :class="{ 'is-dark-toast': isDark }">
        <div class="undo-toast-content">
          <i class="el-icon-circle-check"></i>
          <span>删除成功，<strong class="countdown-text">{{ undoCountdown }}</strong> 秒内可撤销。</span>
        </div>
        <el-button class="undo-btn" size="mini" @click="executeUndo" :loading="apiLoading">撤回恢复</el-button>
      </div>
    </transition>
    <transition name="toast-slide-up">
      <div class="custom-success-toast" v-if="toastVisible" :class="{ 'is-dark-toast': isDark }">
        <i class="el-icon-success"></i>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <!-- 新建分类及故障窗 -->
    <el-dialog title="新建分类" :visible.sync="categoryVisible" width="400px" :close-on-click-modal="false" custom-class="modern-dialog">
      <el-form :model="categoryForm" ref="categoryForm" :rules="categoryRules" size="small" label-position="top">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="例如: 前端工程化、数据库排错..."></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="categoryVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
        <el-button type="primary" @click="submitCategory" size="small" :loading="apiLoading" class="primary-gradient-btn">确 认</el-button>
      </div>
    </el-dialog>

    <el-dialog :title="'在【' + currentCategoryName + '】中录入'" :visible.sync="problemVisible" width="650px" :close-on-click-modal="false" custom-class="modern-dialog">
      <el-form :model="problemForm" ref="problemForm" :rules="problemRules" size="small" label-position="top">
        <el-form-item label="故障现象描述 / 标题" prop="title">
          <el-input v-model="problemForm.title" placeholder="请描述报错信息或现象 (例如: Nginx 502 Bad Gateway)"></el-input>
        </el-form-item>
        <el-form-item label="排查思路与详细解决代码" prop="solution">
          <el-input type="textarea" :autosize="{ minRows: 6, maxRows: 12 }" v-model="problemForm.solution" placeholder="粘贴日志、排查步骤及最终有效的修改命令..."></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="problemVisible = false" size="small" :disabled="apiLoading" plain>取 消</el-button>
        <el-button type="primary" @click="submitProblem" size="small" :loading="apiLoading" class="primary-gradient-btn">保 存 发 布</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
const CACHE_CAT_KEY = 'trouble_docs_categories';
const CACHE_PROB_KEY = 'trouble_docs_problems';
const mockDelay = () => new Promise(resolve => setTimeout(resolve, 300));
const getNowDate = () => new Date().toISOString().split('T')[0];

const api = {
  async getCategories() {
    await mockDelay();
    const data = localStorage.getItem(CACHE_CAT_KEY);
    if (data) return JSON.parse(data);
    const defaultData = [
      { id: 1, name: 'Kubernetes (K8s)' },
      { id: 2, name: 'Docker / 容器化' },
      { id: 3, name: 'AI 模型部署' },
      { id: 4, name: 'Linux 系统底层' }
    ];
    localStorage.setItem(CACHE_CAT_KEY, JSON.stringify(defaultData));
    return defaultData;
  },
  async addCategory(cat) {
    await mockDelay();
    const list = await this.getCategories();
    list.push(cat);
    localStorage.setItem(CACHE_CAT_KEY, JSON.stringify(list));
    return cat;
  },
  async updateCategory(id, name) {
    await mockDelay();
    const list = await this.getCategories();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) list[idx].name = name;
    localStorage.setItem(CACHE_CAT_KEY, JSON.stringify(list));
  },
  async deleteCategory(id) {
    await mockDelay();
    const list = await this.getCategories();
    localStorage.setItem(CACHE_CAT_KEY, JSON.stringify(list.filter(c => c.id !== id)));
    const probs = await this.getProblems();
    localStorage.setItem(CACHE_PROB_KEY, JSON.stringify(probs.filter(p => p.categoryId !== id)));
  },

  async getProblems() {
    await mockDelay();
    const data = localStorage.getItem(CACHE_PROB_KEY);
    if (data) return JSON.parse(data);
    
    // 为了方便您体验分页功能，初次运行自动生成 12 条测试数据
    const defaultData = [];
    for (let i = 1; i <= 12; i++) {
      defaultData.push({
        id: i,
        categoryId: 1,
        title: `Kubernetes 集群排错测试案例 ${i}：Pod CrashLoopBackOff`,
        updatedAt: '2026-07-21',
        solution: '1. 检查日志流：\n   kubectl logs <pod-name> -n <namespace>\n2. 检查资源瓶颈及探针配置。'
      });
    }
    defaultData.push({ id: 13, categoryId: 2, title: 'Docker 容器内无法解析外部 DNS 域名', updatedAt: '2026-07-21', solution: '修改 /etc/sysctl.conf 增加 net.ipv4.ip_forward=1 并执行 sysctl -p 生效。' });
    
    localStorage.setItem(CACHE_PROB_KEY, JSON.stringify(defaultData));
    return defaultData;
  },
  async addProblem(prob) {
    await mockDelay();
    const list = await this.getProblems();
    prob.updatedAt = getNowDate();
    list.unshift(prob);
    localStorage.setItem(CACHE_PROB_KEY, JSON.stringify(list));
    return prob;
  },
  async updateProblem(id, payload) {
    await mockDelay();
    const list = await this.getProblems();
    const idx = list.findIndex(p => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...payload, updatedAt: getNowDate() };
    }
    localStorage.setItem(CACHE_PROB_KEY, JSON.stringify(list));
    return list[idx];
  },
  async deleteProblem(id) {
    await mockDelay();
    const list = await this.getProblems();
    localStorage.setItem(CACHE_PROB_KEY, JSON.stringify(list.filter(p => p.id !== id)));
  }
};

export default {
  name: 'TroubleRecord',
  data() {
    return {
      isDark: true,
      sidebarCollapsed: false, 
      pageLoading: true, 
      apiLoading: false, 
      activeCategoryId: null,
      
      // 分页器相关属性
      currentPage: 1,
      pageSize: 10,
      
      // 控制左滑动画及跨目录多选的标志
      isBatchMode: false,
      selectedProblemIds: [],
      
      moveDialogVisible: false,
      moveTargetProblem: null,
      moveToCategoryId: null,
      
      categoryVisible: false,
      problemVisible: false,
      searchCategoryQuery: '',
      searchProblemQuery: '',
      
      deleteDialogVisible: false,
      deleteMessage: '',
      deleteTarget: null, 
      
      undoData: null,
      undoTimer: null,
      undoCountdown: 20, 
      toastVisible: false,
      toastMsg: '',
      toastTimer: null,
      
      editCategoryId: null,
      editTitleId: null,
      editSolutionId: null,

      categories: [],
      problems: [],

      categoryForm: { name: '' },
      categoryRules: { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] },
      problemForm: { title: '', solution: '' },
      problemRules: {
        title: [{ required: true, message: '描述不能为空', trigger: 'blur' }],
        solution: [{ required: true, message: '请提供排查思路', trigger: 'blur' }]
      }
    }
  },
  computed: {
    filteredCategories() {
      let result = this.categories;
      if (this.searchCategoryQuery) {
        const query = this.searchCategoryQuery.toLowerCase();
        result = result.filter(c => c.name.toLowerCase().includes(query));
      }
      return result.map(cat => ({
        ...cat,
        docCount: this.problems.filter(p => p.categoryId === cat.id).length
      }));
    },
    currentCategoryName() {
      const cat = this.categories.find(c => c.id === this.activeCategoryId);
      return cat ? cat.name : '全部记录';
    },
    // 当前目录下根据检索条件过滤后的 总记录全集
    currentProblems() {
      let probs = this.problems.filter(p => p.categoryId === this.activeCategoryId);
      if (this.searchProblemQuery) {
        const query = this.searchProblemQuery.toLowerCase();
        probs = probs.filter(
          p => p.title.toLowerCase().includes(query) || p.solution.toLowerCase().includes(query)
        );
      }
      return probs;
    },
    // 当前页将要显示的切割后的记录
    paginatedProblems() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.currentProblems.slice(start, end);
    },
    isIndeterminate() {
      // 针对【本页全选】做判定：当前页有多少数据被选中
      const selectedInCurrentPage = this.paginatedProblems.filter(p => this.selectedProblemIds.includes(p.id)).length;
      return selectedInCurrentPage > 0 && selectedInCurrentPage < this.paginatedProblems.length;
    },
    checkAll: {
      get() {
        return this.paginatedProblems.length > 0 && this.paginatedProblems.every(p => this.selectedProblemIds.includes(p.id));
      },
      set(val) {
        const currentPageIds = this.paginatedProblems.map(p => p.id);
        if (val) {
          // 选中本页全部（不丢失其他页或分类的数据）
          const toAdd = currentPageIds.filter(id => !this.selectedProblemIds.includes(id));
          this.selectedProblemIds.push(...toAdd);
        } else {
          // 清空本页全选
          this.selectedProblemIds = this.selectedProblemIds.filter(id => !currentPageIds.includes(id));
        }
      }
    }
  },
  watch: {
    // 监听搜索词，重置回第一页
    searchProblemQuery() {
      this.currentPage = 1;
    },
    // 监听当前分类下的数据量变化（防止删除或筛选时导致空页）
    currentProblems(newVal) {
      const maxPage = Math.ceil(newVal.length / this.pageSize) || 1;
      if (this.currentPage > maxPage) {
        this.currentPage = maxPage;
      }
    }
  },
  async created() {
    await this.fetchData();
  },
  methods: {
    async fetchData() {
      this.pageLoading = true;
      try {
        const [cats, probs] = await Promise.all([api.getCategories(), api.getProblems()]);
        this.categories = cats;
        this.problems = probs;
        if (!this.activeCategoryId && this.categories.length > 0) {
          this.activeCategoryId = this.categories[0].id;
        }
      } catch (err) {
        console.error(err);
      } finally {
        this.pageLoading = false;
      }
    },
    
    // ======== 分页器交互事件 ========
    handleSizeChange(val) {
      this.pageSize = val;
      this.currentPage = 1;
    },
    handleCurrentChange(val) {
      this.currentPage = val;
    },

    getCategoryName(id) {
      const cat = this.categories.find(c => c.id === id);
      return cat ? cat.name : '未知目录';
    },

    toggleBatchMode() {
      if (this.$refs.exportPopover) {
        this.$refs.exportPopover.doClose();
      }
      this.isBatchMode = !this.isBatchMode;
      if (!this.isBatchMode) {
        this.selectedProblemIds = [];
      }
    },

    // 提供给最外层的卡片包裹器使用：支持点击空白区域直接勾选
    toggleSingleSelection(id) {
      if (!this.isBatchMode) return;
      const idx = this.selectedProblemIds.indexOf(id);
      if (idx === -1) {
        this.selectedProblemIds.push(id);
      } else {
        this.selectedProblemIds.splice(idx, 1);
      }
    },

    exportToMarkdown(mode) {
      if (this.$refs.exportPopover) {
        this.$refs.exportPopover.doClose();
      }

      let targetProblems = [];
      if (mode === 'all') {
        targetProblems = this.currentProblems;
      } else if (mode === 'selected') {
        targetProblems = this.problems.filter(p => this.selectedProblemIds.includes(p.id));
      }

      if (targetProblems.length === 0) {
        this.showToast('没有可导出的记录');
        return;
      }
      
      const fileName = mode === 'selected' ? '自定义选择_组合排错手册' : `${this.currentCategoryName}_排错手册`;
      this.generateMarkdownAndDownload(targetProblems, fileName);
      
      if (mode === 'selected') {
        this.isBatchMode = false;
        this.selectedProblemIds = [];
      }
    },

    exportSingleProblem(prob) {
      this.generateMarkdownAndDownload([prob], `${prob.title}_单篇排错日志`);
    },

    generateMarkdownAndDownload(targetProblems, fileName) {
      let mdContent = `# 故障排错手册 - TroubleDocs\n\n`;
      mdContent += `> 自动生成时间：${new Date().toLocaleString()}\n> 共计收录 ${targetProblems.length} 条记录\n\n---\n\n`;

      targetProblems.forEach((prob, idx) => {
        const catName = this.getCategoryName(prob.categoryId);
        mdContent += `## ${idx + 1}. [${catName}] ${prob.title}\n`;
        mdContent += `*最后更新于 ${prob.updatedAt || getNowDate()}*\n\n`;
        mdContent += `**排查思路与解决方案：**\n\n\`\`\`bash\n${prob.solution}\n\`\`\`\n\n---\n\n`;
      });

      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.showToast('Markdown 文档生成并下载成功！');
    },

    openMoveDialog(prob) {
      this.moveTargetProblem = prob;
      this.moveToCategoryId = prob.categoryId; 
      this.moveDialogVisible = true;
    },
    
    async confirmMoveProblem() {
      if (!this.moveToCategoryId || !this.moveTargetProblem) {
        this.showToast('请选择迁移的目标目录');
        return;
      }
      this.apiLoading = true;
      try {
        const targetId = this.moveTargetProblem.id;
        const newCatId = this.moveToCategoryId;
        
        await api.updateProblem(targetId, { categoryId: newCatId });
        
        const probIndex = this.problems.findIndex(p => p.id === targetId);
        if (probIndex !== -1) {
          this.problems[probIndex].categoryId = newCatId;
        }
        
        this.selectedProblemIds = this.selectedProblemIds.filter(id => id !== targetId);
        
        this.moveDialogVisible = false;
        this.showToast('文档已成功转移到指定新目录');
      } catch (e) {
        console.error(e);
        this.showToast('系统移动失败');
      } finally {
        this.apiLoading = false;
      }
    },

    copySolution(text) {
      if (!text) return;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('代码内容已成功复制到剪贴板');
        }).catch(() => { this.fallbackCopy(text); });
      } else {
        this.fallbackCopy(text);
      }
    },
    fallbackCopy(text) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus(); textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('代码内容已成功复制到剪贴板');
      } catch (err) {
        this.showToast('复制失败，请手动框选复制。');
      }
      document.body.removeChild(textArea);
    },

    showToast(msg) {
      this.toastMsg = msg;
      this.toastVisible = true;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
    },

    toggleTheme() { this.isDark = !this.isDark; },
    
    selectCategory(id) {
      this.activeCategoryId = id;
      this.searchProblemQuery = ''; 
      this.currentPage = 1; // 切换分类强制重置为第一页
    },
    
    handleCategoryCommand(command, cat) {
      this.safeClosePopover(cat.id);
      if (command === 'share') {
        this.showToast(`【${cat.name}】的知识库分享链接已生成`);
      } else if (command === 'rename') {
        this.editCategoryId = cat.id;
        this.$nextTick(() => {
          const inputRef = this.$refs['catInput_' + cat.id];
          if (inputRef && inputRef[0]) inputRef[0].focus();
        });
      }
    },

    requestDeleteCategory(cat) {
      this.safeClosePopover(cat.id);
      this.deleteTarget = { type: 'category', id: cat.id };
      this.deleteMessage = `确定删除【${cat.name}】目录及其关联的所有排错记录吗？`;
      this.deleteDialogVisible = true;
    },
    requestDeleteProblem(id) {
      this.deleteTarget = { type: 'problem', id: id };
      this.deleteMessage = `确定要永久删除这条故障记录吗？`;
      this.deleteDialogVisible = true;
    },

    async confirmDelete() {
      if (!this.deleteTarget) return;
      const targetType = this.deleteTarget.type;
      const targetId = this.deleteTarget.id;
      let backupData = null;
      
      this.apiLoading = true;
      try {
        if (targetType === 'category') {
          const index = this.categories.findIndex(c => c.id === targetId);
          if (index !== -1) {
            backupData = {
              type: 'category', catIndex: index,
              category: { ...this.categories[index] },
              problems: this.problems.filter(p => p.categoryId === targetId)
            };
            await api.deleteCategory(targetId);
            this.categories.splice(index, 1);
            this.problems = this.problems.filter(p => p.categoryId !== targetId);
            if (this.activeCategoryId === targetId) {
              this.activeCategoryId = this.categories.length > 0 ? this.categories[0].id : null;
            }
          }
        } 
        else if (targetType === 'problem') {
          const index = this.problems.findIndex(p => p.id === targetId);
          if (index !== -1) {
            backupData = {
              type: 'problem', probIndex: index, problem: { ...this.problems[index] }
            };
            await api.deleteProblem(targetId);
            this.problems.splice(index, 1);
            this.selectedProblemIds = this.selectedProblemIds.filter(sid => sid !== targetId);
          }
        }
      } finally {
        this.apiLoading = false;
        this.deleteDialogVisible = false;
        this.deleteTarget = null;
        if (backupData) this.triggerUndoToast(backupData);
      }
    },

    triggerUndoToast(backupData) {
      if (this.undoTimer) clearInterval(this.undoTimer);
      this.undoData = backupData;
      this.undoCountdown = 20;
      this.undoTimer = setInterval(() => {
        this.undoCountdown--;
        if (this.undoCountdown <= 0) {
          clearInterval(this.undoTimer);
          this.undoTimer = null;
          this.undoData = null;
        }
      }, 1000);
    },

    async executeUndo() {
      if (!this.undoData) return;
      const backupData = this.undoData;
      this.apiLoading = true;
      try {
        this.undoData = null;
        if (this.undoTimer) { clearInterval(this.undoTimer); this.undoTimer = null; }

        if (backupData.type === 'category') {
          await api.addCategory(backupData.category);
          for (let p of backupData.problems) { await api.addProblem(p); }
          this.categories.splice(backupData.catIndex, 0, backupData.category);
          this.problems.push(...backupData.problems);
          this.activeCategoryId = backupData.category.id;
        } 
        else if (backupData.type === 'problem') {
          await api.addProblem(backupData.problem);
          this.problems.splice(backupData.probIndex, 0, backupData.problem);
          this.activeCategoryId = backupData.problem.categoryId;
        }
      } finally {
        this.apiLoading = false;
      }
    },

    safeClosePopover(id) {
      const popover = this.$refs['popover_' + id];
      if (popover) {
        if (Array.isArray(popover)) { if (popover[0]) popover[0].doClose(); } 
        else { popover.doClose(); }
      }
    },

    async finishEditCategory(cat) {
      if (this.editCategoryId !== cat.id) return; 
      this.editCategoryId = null;
      if (!cat.name || !cat.name.trim()) cat.name = '未命名分类';
      else cat.name = cat.name.trim();
      await api.updateCategory(cat.id, cat.name);
      this.showToast('目录重命名已保存生效');
    },

    startEditTitle(id) {
      this.editTitleId = id;
      this.$nextTick(() => {
        const ref = this.$refs['titleInput_' + id];
        if (ref && ref[0]) ref[0].focus();
      });
    },
    async finishEditTitle(prob) {
      if (this.editTitleId !== prob.id) return;
      this.editTitleId = null;
      const updated = await api.updateProblem(prob.id, { title: prob.title });
      prob.updatedAt = updated.updatedAt;
    },

    startEditSolution(id) {
      this.editSolutionId = id;
      this.$nextTick(() => {
        const ref = this.$refs['solutionInput_' + id];
        if (ref && ref[0]) ref[0].focus();
      });
    },
    async finishEditSolution(prob) {
      if (this.editSolutionId !== prob.id) return;
      this.editSolutionId = null;
      const updated = await api.updateProblem(prob.id, { solution: prob.solution });
      prob.updatedAt = updated.updatedAt;
    },

    openCategoryDialog() {
      this.categoryForm.name = '';
      this.categoryVisible = true;
      this.$nextTick(() => { this.$refs.categoryForm && this.$refs.categoryForm.clearValidate(); });
    },
    async submitCategory() {
      this.$refs.categoryForm.validate(async valid => {
        if (valid) {
          this.apiLoading = true;
          try {
            const newCat = { id: Date.now(), name: this.categoryForm.name.trim() };
            await api.addCategory(newCat);
            this.categories.push(newCat);
            this.activeCategoryId = newCat.id;
            this.categoryVisible = false;
            this.showToast('知识库目录创建成功');
          } finally {
            this.apiLoading = false;
          }
        }
      });
    },

    openProblemDialog() {
      this.problemForm = { title: '', solution: '' };
      this.problemVisible = true;
      this.$nextTick(() => { this.$refs.problemForm && this.$refs.problemForm.clearValidate(); });
    },
    async submitProblem() {
      this.$refs.problemForm.validate(async valid => {
        if (valid) {
          this.apiLoading = true;
          try {
            const newProb = {
              id: Date.now(),
              categoryId: this.activeCategoryId,
              title: this.problemForm.title.trim(),
              solution: this.problemForm.solution.trim(),
              updatedAt: getNowDate()
            };
            await api.addProblem(newProb);
            this.problems.unshift(newProb);
            this.currentPage = 1; // 新增内容强制回到第一页首位
            this.problemVisible = false;
            this.showToast('新故障记录发布成功');
          } finally {
            this.apiLoading = false;
          }
        }
      });
    }
  }
}
</script>

<style scoped>
/* ==========================================
   全新 SaaS 级色彩变量与字体排版
   ========================================== */
.bp-wrapper {
  --bg-app: #f8fafc;
  --bg-sidebar: #ffffff;
  --bg-header: rgba(255, 255, 255, 0.85);
  --bg-card: #ffffff;
  --text-h1: #0f172a;
  --text-p: #334155;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --hover-sidebar: #f1f5f9;
  --active-sidebar: #e0f2fe;
  --primary-blue: #0ea5e9;
  --code-bg: #1e293b;
  --code-text: #cbd5e1;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);

  height: 100vh; width: 100%; display: flex; flex-direction: column !important; overflow: hidden; margin: 0;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  background-color: var(--bg-app); color: var(--text-p); transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bp-wrapper.is-dark {
  --bg-app: #09090b; --bg-sidebar: #18181b; --bg-header: rgba(24, 24, 27, 0.75); --bg-card: #18181b;
  --text-h1: #f8fafc; --text-p: #cbd5e1; --text-muted: #64748b; --border-color: #27272a; --hover-sidebar: #27272a;
  --active-sidebar: rgba(14, 165, 233, 0.15); --primary-blue: #38bdf8; --code-bg: #0f172a; --code-text: #94a3b8;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5); --shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Header 及导航条 */
.bp-header { height: 64px; flex-shrink: 0; background-color: var(--bg-header); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-color); display: flex; flex-direction: row !important; justify-content: space-between; align-items: center; padding: 0 24px; z-index: 50; }
.header-left { display: flex; align-items: center; gap: 20px; }
.collapse-btn { font-size: 20px; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
.collapse-btn:hover { color: var(--primary-blue); }
.header-logo { display: flex; align-items: center; gap: 10px; }
.logo-icon-wrapper { background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 10px rgba(14, 165, 233, 0.3); }
.logo-text { font-size: 19px; font-weight: 700; color: var(--text-h1); letter-spacing: -0.5px; }
.logo-highlight { color: var(--primary-blue); }

.header-actions { display: flex; flex-direction: row; align-items: center; gap: 16px; }
.primary-gradient-btn { background: linear-gradient(135deg, #0ea5e9, #3b82f6) !important; border: none !important; color: white !important; font-weight: 500; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25); transition: all 0.3s ease; }
.primary-gradient-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4); }
.divider { width: 1px; height: 24px; background-color: var(--border-color); }
.theme-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--text-muted); cursor: pointer; background-color: var(--hover-sidebar); transition: all 0.2s; }
.theme-btn:hover { color: var(--primary-blue); transform: rotate(15deg); }
.user-avatar { border: 2px solid var(--border-color); }

/* 排错主体区域 (左右自适应) */
.bp-body { flex: 1; display: flex; flex-direction: row !important; height: calc(100vh - 64px); overflow: hidden; }

.bp-sidebar { width: 280px; flex-shrink: 0; background-color: var(--bg-sidebar); border-right: 1px solid var(--border-color); display: flex; flex-direction: column !important; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s; }
.bp-sidebar.is-collapsed { width: 0; opacity: 0; border-right: none; overflow: hidden; }
.sidebar-top-action { padding: 20px 16px 12px 16px; }
.add-cat-btn { width: 100%; border-radius: 8px !important; border-color: var(--border-color) !important; color: var(--text-p) !important; background: transparent !important; font-weight: 500; box-shadow: var(--shadow-sm); }
.add-cat-btn:hover { border-color: var(--primary-blue) !important; color: var(--primary-blue) !important; }

.search-box-wrapper { position: relative; margin-top: 12px; }
.modern-el-input ::v-deep .el-input__inner { background-color: var(--bg-app) !important; border-color: var(--border-color); color: var(--text-p); border-radius: 8px; font-size: 13px; transition: border-color 0.2s; }
.modern-el-input ::v-deep .el-input__inner:focus { border-color: var(--primary-blue); }
.modern-el-input ::v-deep .el-input__prefix { color: var(--text-muted); }

.menu-list { flex: 1; overflow-y: auto; padding: 0 12px 20px 12px; }
.empty-hint { text-align: center; padding: 30px 0; color: var(--text-muted); font-size: 13px; display: flex; flex-direction: column; gap: 8px; }
.empty-hint i { font-size: 24px; }
.menu-item { display: flex; flex-direction: row; justify-content: space-between; align-items: center; height: 40px; padding: 0 12px; margin-bottom: 4px; border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: all 0.2s; box-sizing: border-box; }
.menu-item:hover { background-color: var(--hover-sidebar); color: var(--text-h1); }
.menu-item.active { background-color: var(--active-sidebar); color: var(--primary-blue); font-weight: 600; }
.menu-left { display: flex; align-items: center; flex: 1; min-width: 0; }
.menu-cat-icon { font-size: 16px; }
.menu-text-wrapper { display: flex; align-items: center; flex: 1; min-width: 0; margin-left: 10px; }
.menu-text { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-badge { margin-left: 8px; font-size: 11px; font-weight: 600; color: var(--text-muted); background-color: var(--border-color); padding: 2px 6px; border-radius: 12px; flex-shrink: 0; }
.menu-item.active .menu-badge { background-color: var(--primary-blue); color: white; }

.category-inline-input { margin-left: 8px; flex: 1; }
.category-inline-input ::v-deep .el-input__inner { height: 26px; line-height: 26px; padding: 0 8px; font-size: 13px; }
.menu-more { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: transparent; transition: all 0.2s; }
.menu-item:hover .menu-more, .menu-item.active .menu-more { color: var(--text-muted); }
.menu-more:hover { background-color: var(--border-color); color: var(--text-h1) !important; }

/* 核心排错卡片模块 (Card/Main) */
.bp-main { flex: 1; padding: 0; overflow-y: auto; scroll-behavior: smooth; position: relative; }
.main-content-container { max-width: 1000px; margin: 0 auto; padding: 40px 40px 100px 40px; }
.main-header { margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
.category-badge { display: inline-block; font-size: 12px; font-weight: 600; color: var(--primary-blue); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.category-title { margin: 0 0 8px 0; font-size: 32px; font-weight: 800; color: var(--text-h1); letter-spacing: -0.5px; }
.category-subtitle { margin: 0; font-size: 14px; color: var(--text-muted); }
.main-header-actions { display: flex; align-items: center; gap: 16px; }
.main-search { width: 260px; margin-top: 0; }
.check-all-box { margin-right: 4px; color: var(--text-muted); flex-shrink: 0; white-space: nowrap; }
.export-btn { border-radius: 8px !important; color: var(--text-p) !important; border-color: var(--border-color) !important; background-color: var(--bg-card) !important; box-shadow: var(--shadow-sm); }
.export-btn:hover { border-color: var(--primary-blue) !important; color: var(--primary-blue) !important; }

/* ======== 横幅提示信息 ======== */
.batch-mode-banner {
  background-color: var(--active-sidebar); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 12px;
  padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.05);
}
.batch-banner-left { color: var(--primary-blue); font-size: 14px; display: flex; align-items: center; }
.batch-banner-left i { margin-right: 8px; font-size: 18px; }
.batch-banner-left strong { background-color: var(--primary-blue); color: white; padding: 0 8px; border-radius: 12px; margin: 0 4px; }
.batch-banner-right { display: flex; gap: 12px; }

/* ======== 列表容器与项包装 ======== */
.problem-list { display: flex; flex-direction: column; gap: 24px; width: 100%; box-sizing: border-box; }

.problem-item-wrapper {
  display: flex;
  align-items: center; 
  width: 100%;
}

/* ============================================================
   【完美圆润】外置巨大圆形 Checkbox 设计
   ============================================================ */
.outer-checkbox-wrapper {
  width: 0;
  height: 36px; /* 提供固定高度，彻底告别 overflow 裁剪 */
  opacity: 0;
  overflow: hidden;
  transform: translateX(-30px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.problem-list.is-batch-mode .outer-checkbox-wrapper {
  width: 36px;
  opacity: 1;
  margin-right: 16px;
  transform: translateX(0);
}

/* 取消自身点击事件干扰，由父容器接管 */
.outer-checkbox {
  pointer-events: none;
}

/* 隐藏原有 label */
.outer-checkbox ::v-deep .el-checkbox__label { display: none !important; }

/* 重构真实的圆形容器框 */
.outer-checkbox ::v-deep .el-checkbox__inner {
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important; /* 核心：完美正圆 */
  border: 2px solid #94a3b8 !important; /* 稍微加厚边框，质感更好 */
  background-color: transparent !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 核心修复：未勾选时将对号缩放至 0 (隐藏对号)，不再强制显示 */
.outer-checkbox ::v-deep .el-checkbox__inner::after {
  box-sizing: content-box;
  content: "";
  border: 2px solid #FFF;
  border-left: 0;
  border-top: 0;
  height: 11px !important;
  left: 7px !important;
  position: absolute;
  top: 3px !important;
  width: 5px !important;
  transform: rotate(45deg) scaleY(0) !important; /* <-- 默认不可见 */
  transform-origin: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 核心修复：只有被选中时，对号才会弹出来 (放大为 1) */
.outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner::after {
  transform: rotate(45deg) scaleY(1) !important;
}

/* 悬停边缘亮起 */
.outer-checkbox-wrapper:hover .outer-checkbox ::v-deep .el-checkbox__inner {
  border-color: var(--primary-blue) !important;
}

/* 选中时：严格应用主题设置的背景与边框，配合阴影发光 */
.outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: var(--primary-blue) !important;
  border-color: var(--primary-blue) !important;
  box-shadow: 0 0 12px rgba(14, 165, 233, 0.5); 
}

/* 暗色模式下未选中时的边框针对性适配 */
.bp-wrapper.is-dark .outer-checkbox ::v-deep .el-checkbox__inner {
  border-color: #64748b !important;
}
.bp-wrapper.is-dark .outer-checkbox-wrapper:hover .outer-checkbox ::v-deep .el-checkbox__inner,
.bp-wrapper.is-dark .outer-checkbox ::v-deep .el-checkbox__input.is-checked .el-checkbox__inner {
  border-color: var(--primary-blue) !important;
}
/* ============================================================ */

/* 卡片主体（多选模式下允许点击卡片整体进行勾选） */
.problem-card {
  flex: 1; 
  background-color: var(--bg-card); 
  border: 1px solid var(--border-color); 
  border-radius: 12px; 
  display: flex; 
  flex-direction: column; 
  box-shadow: var(--shadow-card); 
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; 
  overflow: hidden; 
}
.problem-list.is-batch-mode .problem-card {
  cursor: pointer; 
}
.bp-wrapper.is-dark .problem-card:hover { border-color: rgba(56, 189, 248, 0.4); box-shadow: 0 0 20px rgba(56, 189, 248, 0.05), var(--shadow-card); }
.problem-card.is-selected { border-color: var(--primary-blue); box-shadow: 0 0 0 1px var(--primary-blue), var(--shadow-card); }

.card-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; background-color: rgba(0,0,0,0.01); }
.card-title-group { display: flex; align-items: flex-start; flex: 1; min-width: 0; }

.index-badge { background-color: var(--active-sidebar); color: var(--primary-blue); padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-right: 16px; margin-top: 2px; font-family: monospace; flex-shrink: 0; }
.editable-text-wrapper { display: inline-flex; align-items: center; padding: 2px 8px; margin-left: -8px; border-radius: 6px; cursor: pointer; border: 1px dashed transparent; transition: all 0.2s; }
.editable-text-wrapper:hover { background-color: var(--hover-sidebar); border-color: var(--border-color); }
.editable-text { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-h1); line-height: 1.4; }
.editable-text-wrapper .edit-icon { margin-left: 10px; font-size: 14px; color: var(--text-muted); opacity: 0; }
.editable-text-wrapper:hover .edit-icon { opacity: 1; }

.card-header-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.update-time { font-size: 12px; color: var(--text-muted); }
.action-icons { display: flex; gap: 12px; align-items: center; }
.icon-btn { padding: 0 !important; font-size: 16px !important; color: var(--text-muted) !important; transition: color 0.2s; }
.icon-btn:hover { color: var(--primary-blue) !important; }
.card-delete-btn { color: #ef4444 !important; opacity: 0.6; }
.card-delete-btn:hover { opacity: 1; color: #ef4444 !important; }

.card-body { padding: 24px; }
.solution-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.solution-label { font-size: 14px; font-weight: 600; color: var(--text-h1); display: flex; align-items: center; }
.solution-label i { color: var(--primary-blue); margin-right: 8px; font-size: 16px; }
.edit-hint { font-size: 12px; color: var(--text-muted); font-weight: 400; margin-left: 12px; opacity: 0; transition: opacity 0.3s; }
.card-body:hover .edit-hint { opacity: 1; }

.solution-actions { display: flex; gap: 12px; align-items: center; }
.copy-btn { font-size: 12px; font-weight: 500; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 6px 10px; border-radius: 6px; background-color: var(--hover-sidebar); transition: all 0.2s; }
.copy-btn i { margin-right: 6px; font-size: 14px; }
.copy-btn:hover { color: var(--primary-blue); background-color: var(--active-sidebar); }

.editable-block { background-color: var(--code-bg); color: var(--code-text); padding: 20px; border-radius: 8px; font-family: "JetBrains Mono", Consolas, "Courier New", monospace; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
.editable-block:hover { border-color: var(--primary-blue); box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.2); }

.empty-state { margin-top: 80px; display: flex; flex-direction: column; align-items: center; color: var(--text-muted); }
.empty-art { font-size: 64px; color: var(--border-color); margin-bottom: 20px; }
.empty-state h3 { color: var(--text-h1); margin: 0 0 8px 0; }

/* ==========================================
   全新引入的分页器底部样式
   ========================================== */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

/* 分页器暗色模式与现代化主题深度重写 */
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li:not(.disabled).active { background-color: var(--primary-blue); color: white; border-color: var(--primary-blue); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); }
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .btn-next,
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .btn-prev,
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li { background-color: var(--bg-card); color: var(--text-p); border: 1px solid var(--border-color); border-radius: 6px; transition: all 0.2s; }
.bp-wrapper.is-dark ::v-deep .el-pagination.is-background .el-pager li:not(.disabled):not(.active):hover { color: var(--primary-blue); border-color: var(--primary-blue); }
.bp-wrapper.is-dark ::v-deep .el-pagination button:disabled { background-color: var(--bg-card); color: var(--text-muted); border-color: var(--border-color); }
.bp-wrapper.is-dark ::v-deep .el-pagination__total,
.bp-wrapper.is-dark ::v-deep .el-pagination__jump { color: var(--text-muted); }
.bp-wrapper.is-dark ::v-deep .el-pagination__jump .el-input__inner { background-color: var(--bg-app); border-color: var(--border-color); color: var(--text-p); }
.bp-wrapper.is-dark ::v-deep .el-pagination__sizes .el-input__inner { background-color: var(--bg-app); border-color: var(--border-color); color: var(--text-p); }

/* 全局美化弹窗与轻提示 Toast */
.undo-toast { position: fixed; top: 80px; left: 50%; margin-left: -160px; width: 320px; background-color: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-radius: 12px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 999999; }
.undo-toast.is-dark-toast { background-color: #18181b; border-color: #27272a; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
.undo-toast-content { display: flex; align-items: center; font-size: 14px; color: #0f172a; font-weight: 500;}
.undo-toast.is-dark-toast .undo-toast-content { color: #f8fafc; }
.countdown-text { color: #f59e0b; font-size: 16px; margin: 0 4px; min-width: 20px; display: inline-block; text-align: center; }
.undo-btn { border-radius: 6px !important; }

.toast-slide-down-enter-active, .toast-slide-down-leave-active { transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-slide-down-enter, .toast-slide-down-leave-to { opacity: 0; transform: translateY(-20px) scale(0.95); }

.custom-success-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 12px 24px; border-radius: 30px; display: flex; align-items: center; font-size: 14px; font-weight: 500; z-index: 999999; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.1); }
.custom-success-toast.is-dark-toast { background-color: rgba(22, 163, 74, 0.15); border-color: rgba(22, 163, 74, 0.3); color: #4ade80; }
.toast-slide-up-enter-active, .toast-slide-up-leave-active { transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-slide-up-enter, .toast-slide-up-leave-to { opacity: 0; transform: translate(-50%, -20px); }

.bp-wrapper ::v-deep .modern-dialog { border-radius: 12px; overflow: hidden; }
.bp-wrapper.is-dark ::v-deep .modern-dialog { background-color: var(--bg-card); border: 1px solid var(--border-color); }
.bp-wrapper.is-dark ::v-deep .el-dialog__title, .bp-wrapper.is-dark ::v-deep .el-form-item__label { color: var(--text-h1); }
.bp-wrapper.is-dark ::v-deep .el-input__inner, .bp-wrapper.is-dark ::v-deep .el-textarea__inner { background-color: var(--code-bg); border-color: var(--border-color); color: var(--text-p); }
.bp-wrapper.is-dark ::v-deep .el-input__inner:focus, .bp-wrapper.is-dark ::v-deep .el-textarea__inner:focus { border-color: var(--primary-blue); }
.bp-wrapper.is-dark ::v-deep .el-loading-mask { background-color: rgba(0, 0, 0, 0.75) !important; backdrop-filter: blur(4px); }
.dialog-danger-content { display: flex; align-items: flex-start; color: #ef4444; font-size: 15px; margin: 10px 0; }
.dialog-danger-content i { font-size: 24px; margin-right: 12px; margin-top: -2px; }

</style>

<style>
/* 悬浮菜单全局深色主题化处理 */
.action-menu-list { display: flex; flex-direction: column; }
.action-item { padding: 10px 16px; font-size: 13px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; font-weight: 500; }
.action-item i { margin-right: 10px; font-size: 16px; }
.action-item.danger { color: #ef4444; }
.action-item.danger:hover { color: #f87171; }
.action-item.is-disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.action-item.is-active-item { color: #0ea5e9; background-color: rgba(14, 165, 233, 0.1); }
.action-divider { height: 1px; margin: 4px 0; }

.custom-dark-popover { background-color: #18181b !important; border: 1px solid #27272a !important; padding: 6px 0 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5) !important; }
.custom-dark-popover .action-item { color: #cbd5e1; }
.custom-dark-popover .action-item:hover { background-color: #27272a; color: #38bdf8; }
.custom-dark-popover .action-divider { background-color: #27272a; }
.custom-dark-popover .is-active-item { color: #38bdf8 !important; background-color: rgba(56, 189, 248, 0.1) !important; }

.custom-light-popover { padding: 6px 0 !important; border-radius: 12px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important; border: 1px solid #e2e8f0 !important; }
.custom-light-popover .action-item { color: #334155; }
.custom-light-popover .action-item:hover { background-color: #f1f5f9; color: #0ea5e9; }
.custom-light-popover .action-divider { background-color: #e2e8f0; }

.custom-dark-select { background-color: #18181b !important; border: 1px solid #27272a !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5) !important; }
.custom-dark-select .el-select-dropdown__item { color: #cbd5e1 !important; }
.custom-dark-select .el-select-dropdown__item.hover, .custom-dark-select .el-select-dropdown__item:hover { background-color: #27272a !important; }
.custom-dark-select .el-select-dropdown__item.selected { color: #38bdf8 !important; background-color: rgba(56, 189, 248, 0.1) !important; font-weight: bold; }
.custom-dark-select .el-select-dropdown__item.is-disabled { color: #64748b !important; }
.custom-dark-select .popper__arrow::after { border-bottom-color: #18181b !important; }
.custom-light-select { border-radius: 8px !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important; border: 1px solid #e2e8f0 !important; }
</style>
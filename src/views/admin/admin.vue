<template>
	<div id="app" class="layout-container">
	  
	  <aside class="left-sidebar" :class="{ 'collapsed': isCollapsed }">
		
		<div class="sidebar-header">
		  <span class="app-title" v-show="!isCollapsed">ProTrader</span>
		  
		  <div class="toggle-btn" @click="toggleSidebar">
			<i :class="isCollapsed ? 'fas fa-bars' : 'fas fa-outdent'"></i>
		  </div>
		</div>
  
		<div class="nav-menu">
		  
		  <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/stock/total/list' }"
			@click="handleNav('/stock/total/list')"
			:title="isCollapsed ? 'A股大盘数据' : ''"
		  >
			<div class="icon-box">
			  <i class="fas fa-chart-line"></i>
			</div>
			<span class="nav-text" v-show="!isCollapsed">A股大盘数据</span>
		  </div>
  
		  <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/golden_cus/list' }"
			@click="handleNav('/golden_cus/list')"
			:title="isCollapsed ? '黄金变动数据' : ''"
		  >
			<div class="icon-box">
			  <i class="fas fa-coins"></i>
			</div>
			<span class="nav-text" v-show="!isCollapsed">黄金变动数据</span>
		  </div>
  
		  <!-- <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/settings' }"
			@click="handleNav('/settings')"
			:title="isCollapsed ? '系统设置' : ''"
		  >
			<div class="icon-box">
			  <i class="fas fa-cog"></i>
			</div>
			<span class="nav-text" v-show="!isCollapsed">系统设置</span>
		  </div> -->
  
		</div>
	  </aside>
  
	  <main class="right-content">
		<keep-alive>
		  <router-view class="page-viewport"></router-view>
		</keep-alive>
	  </main>
  
	</div>
  </template>
  
  <script>
  export default {
	name: 'App',
	data() {
	  return {
		isCollapsed: false // 默认为展开状态
	  };
	},
	methods: {
	  toggleSidebar() {
		this.isCollapsed = !this.isCollapsed;
	  },
	  handleNav(path) {
		if (this.$route.path === path) return;
		this.$router.push(path).catch(err => {
		  if (err.name !== 'NavigationDuplicated') console.error(err);
		});
	  }
	}
  }
  </script>
  
  <style>
  /* 全局基础设置 */
  html, body {
	margin: 0;
	padding: 0;
	height: 100%;
	width: 100%;
	background-color: #f0f2f5;
	overflow: hidden; 
	font-family: "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  
  /* 引入 FontAwesome (如果本地没引，可以用这个 CDN 测试) */
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
  </style>
  
  <style scoped>
  /* ========== 布局容器 ========== */
  .layout-container {
	display: flex;       
	width: 100vw;
	height: 100vh;
  }
  
  /* ========== 左侧侧边栏 (核心) ========== */
  .left-sidebar {
	width: 240px;             /* 默认展开宽度 */
	background-color: #111827; /* 更深邃的深色背景 */
	color: #e5e7eb;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;           
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 贝塞尔曲线让动效更高级 */
	border-right: 1px solid #1f2937;
	overflow: hidden;         
	z-index: 1000;
  }
  
  /* --- 折叠状态下的宽度 --- */
  .left-sidebar.collapsed {
	width: 64px;
  }
  
  /* ========== 1. 顶部 Header 区域 ========== */
  .sidebar-header {
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: space-between; 
	padding: 0 16px;
	background-color: #111827;
	border-bottom: 1px solid #1f2937;
	white-space: nowrap;
  }
  
  .collapsed .sidebar-header {
	padding: 0;
	justify-content: center;
  }
  
  .app-title {
	font-size: 1.2rem;
	font-weight: 700;
	color: #3b82f6; 
	letter-spacing: 1px;
  }
  
  /* 切换按钮样式 */
  .toggle-btn {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: 8px;
	color: #9ca3af;
	transition: all 0.2s;
  }
  
  .toggle-btn:hover {
	background-color: #1f2937;
	color: #ffffff;
  }
  
  /* ========== 2. 菜单列表区域 ========== */
  .nav-menu {
	padding: 12px 0;
	flex: 1;
  }
  
  /* 单个菜单项样式 */
  .nav-item {
	height: 50px;
	margin: 4px 8px; /* 给菜单项留一点边距，看起来更现代 */
	display: flex;
	align-items: center;
	padding: 0 12px;
	cursor: pointer;
	color: #9ca3af;
	border-radius: 8px;
	transition: all 0.3s;
	white-space: nowrap;
	position: relative;
  }
  
  .nav-item:hover {
	background-color: rgba(255, 255, 255, 0.05);
	color: #ffffff;
  }
  
  .nav-item.active {
	background-color: #3b82f6;
	color: #ffffff;
  }
  
  /* 图标容器 */
  .icon-box {
	min-width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	transition: margin 0.3s;
  }
  
  /* 展开状态下的图标右间距 */
  .nav-item .icon-box {
	margin-right: 12px;
  }
  
  .nav-text {
	font-size: 14px;
	font-weight: 500;
	opacity: 1;
	transition: opacity 0.2s;
  }
  
  /* ========== 折叠状态下的微调 ========== */
  
  .collapsed .nav-item {
	margin: 4px 10px; /* 折叠后调整外边距使之居中 */
	padding: 0;
	justify-content: center;
  }
  
  .collapsed .icon-box {
	margin-right: 0;
  }
  
  /* 激活状态的侧边指示条 (可选) */
  .nav-item.active::before {
	content: "";
	position: absolute;
	left: -8px;
	height: 20px;
	width: 4px;
	background-color: #ffffff;
	border-radius: 0 4px 4px 0;
	display: none; /* 如果背景变色了，指示条可以隐藏 */
  }
  
  /* ========== 右侧内容区 ========== */
  .right-content {
	flex: 1;
	background-color: #f3f4f6;
	overflow: hidden;
	display: flex;
	flex-direction: column;
  }
  
  .page-viewport {
	flex: 1;
	width: 100%;
	overflow-y: auto;
	padding: 20px;
	box-sizing: border-box;
  }
  </style>
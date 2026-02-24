<template>
	<div id="app" class="layout-container">
	  
	  <!-- 左侧：侧边栏 -->
	  <aside class="left-sidebar">
		<div class="logo-box">
		  <i class="fas fa-chart-line"></i>
		  <span>ProTrader</span>
		</div>
  
		<div class="nav-links">
		  <!-- 
			【关键修改】：
			1. 不再使用 <router-link>，改用普通的 <div>
			2. 使用 @click 事件手动调用跳转函数
			3. 这样浏览器就不把它当成链接，绝对不会新开页面！
		  -->
		  <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/stock/total/list' }"
			@click="handleNav('/stock/total/list')"
		  >
			<i class="fas fa-globe-asia icon"></i>
			<span>A股大盘数据</span>
		  </div>
  
		  <!-- <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/stock/detail/list' }"
			@click="handleNav('/stock/detail/list')"
		  >
			<i class="fas fa-search-dollar icon"></i>
			<span>A股行业数据</span>
		  </div> -->
		  <div 
			class="nav-item" 
			:class="{ 'active': $route.path === '/golden_cus/list' }"
			@click="handleNav('/golden_cus/list')"
		  >
			<i class="fas fa-search-dollar icon"></i>
			<span>黄金变动数据</span>
		  </div>
		</div>
	  </aside>
  
	  <!-- 右侧：内容区 -->
	  <main class="right-content">
		<!-- 
		  keep-alive 只是为了缓存，
		  router-view 才是内容显示的容器 
		-->
		<keep-alive>
		  <router-view class="page-viewport"></router-view>
		</keep-alive>
	  </main>
  
	</div>
  </template>
  
  <script>
  export default {
	name: 'App',
	methods: {
	  // 【核心跳转逻辑】
	  handleNav(path) {
		// 1. 如果已经在当前页面，就不跳转，防止报错
		if (this.$route.path === path) return;
  
		// 2. 使用 Vue Router 的 push 方法进行“无刷新跳转”
		// 这完全在 JavaScript 内部完成，不经过浏览器 URL 处理，所以不会新开页面
		this.$router.push(path).catch(err => {
		  // 捕获重复导航的微小错误，忽略即可
		  if (err.name !== 'NavigationDuplicated') {
			console.error(err);
		  }
		});
	  }
	}
  }
  </script>
  
  <style>
  /* 全局重置 */
  html, body {
	margin: 0;
	padding: 0;
	height: 100%;
	width: 100%;
	background-color: #f0f2f5;
	overflow: hidden; 
	font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  </style>
  
  <style scoped>
  /* 布局容器 */
  .layout-container {
	display: flex;       
	width: 100vw;
	height: 100vh;
  }
  
  /* 左侧样式 */
  .left-sidebar {
	width: 240px;
	background-color: #1f2937;
	color: white;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
  }
  
  /* 右侧样式 */
  .right-content {
	flex: 1;
	position: relative;
	background-color: #f0f2f5;
	overflow: hidden;
  }
  
  .page-viewport {
	width: 100%;
	height: 100%;
	overflow-y: auto;
	padding: 0;
  }
  
  /* 装饰样式 */
  .logo-box {
	height: 64px;
	display: flex;
	align-items: center;
	padding-left: 20px;
	font-size: 20px;
	font-weight: bold;
	border-bottom: 1px solid #374151;
	color: #60a5fa;
  }
  
  .nav-links {
	padding-top: 20px;
  }
  
  /* 菜单项样式 */
  .nav-item {
	display: flex;
	align-items: center;
	height: 50px;
	padding-left: 20px;
	color: #9ca3af;
	cursor: pointer; /* 变成手型，看起来像链接 */
	transition: 0.3s;
	user-select: none; /* 防止双击选中文字 */
  }
  
  .nav-item:hover {
	background-color: #374151;
	color: white;
  }
  
  /* 选中高亮样式 */
  .nav-item.active {
	background-color: #111827;
	color: #60a5fa;
	border-right: 4px solid #60a5fa;
  }
  
  .icon {
	width: 24px;
	margin-right: 10px;
	text-align: center;
  }
  </style>
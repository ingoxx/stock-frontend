import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
	path: '/',
    component: () => import('../views/admin/admin.vue'), // 使用布局组件作为外壳
    redirect: '/stock/total/list',
	children: [
		// 简单的黄金信息页面
		{
			path: '/golden/list',
			name: 'golden-list',
			component: () => import(/* webpackChunkName: "about" */ '../views/golden/golden.vue')
		},
		// 简单的黄金信息页面
		{
			path: '/golden_cus/list',
			name: 'golden_cus-list',
			component: () => import(/* webpackChunkName: "about" */ '../views/golden/golden_cus.vue')
		},
		// 简单的股票信息页面
		{
			path: '/stock/detail/list',
			name: 'stock-detail',
			component: () => import(/* webpackChunkName: "about" */ '../views/stock/stockDetail.vue')
		},
		// 简单的股票信息页面
		{
			path: '/stock/total/list',
			name: 'stock-total',
			component: () => import(/* webpackChunkName: "about" */ '../views/stock/stockTotal.vue')
		},
	],
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router

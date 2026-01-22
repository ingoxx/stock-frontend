import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  // 简单的股票信息页面
  {
    path: '/golden/list',
    name: 'golden-list',
    component: () => import(/* webpackChunkName: "about" */ '../views/stock/stock.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router

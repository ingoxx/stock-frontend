import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'


// 第三方插件
import 'element-ui/lib/theme-chalk/index.css';
import 'element-ui/lib/theme-chalk/base.css';
import { Table } from 'element-ui'
import { TableColumn } from 'element-ui'
import { Input } from 'element-ui'
import { Button } from 'element-ui'
import { Dialog } from 'element-ui'

Vue.use(Table);
Vue.use(TableColumn);
Vue.use(Input);
Vue.use(Button);
Vue.use(Dialog);


Vue.config.productionTip = false


new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

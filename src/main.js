import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'


// 第三方插件
import 'element-ui/lib/theme-chalk/index.css'
import 'element-ui/lib/theme-chalk/base.css'
import { Table } from 'element-ui'
import { TableColumn } from 'element-ui'
import { Input } from 'element-ui'
import { Button } from 'element-ui'
import { Dialog } from 'element-ui'
import { Loading } from 'element-ui'
import { Popconfirm } from 'element-ui'
import { Pagination } from 'element-ui'
import { Tooltip } from 'element-ui'
import { Switch } from 'element-ui'
import { Tag } from 'element-ui'
import { Select } from 'element-ui'
import { Option } from 'element-ui'
import { Form } from 'element-ui'
import { FormItem } from 'element-ui'
import { Popover } from 'element-ui'
import { DatePicker } from 'element-ui'
import { Slider } from 'element-ui'
import { Row } from 'element-ui'
import { Col } from 'element-ui'
import { RadioGroup } from 'element-ui'
import { RadioButton } from 'element-ui'

Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Input)
Vue.use(Button)
Vue.use(Dialog)
Vue.use(Loading)
Vue.use(Popconfirm)
Vue.use(Pagination)
Vue.use(Tooltip)
Vue.use(Switch)
Vue.use(Tag)
Vue.use(Select)
Vue.use(Option)
Vue.use(Form)
Vue.use(FormItem)
Vue.use(Popover)
Vue.use(DatePicker)
Vue.use(Slider)
Vue.use(Row)
Vue.use(Col)
Vue.use(RadioGroup)
Vue.use(RadioButton)


Vue.config.productionTip = false


new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

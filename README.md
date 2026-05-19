# stock

一个基于 Vue 2 + Element UI 的股票信息与可视化前端应用（前端仓库）。

体验地址（在线演示）：https://tc.anythingai.online/stock/total/list

## 目录
- `src/`：源码，包含视图、组件、路由和状态管理。
- `public/`：静态资源与页面模板。
- `k8s/`：Kubernetes 部署清单（deployment / service / kustomization）。
- `style/`：项目样式文件（Sass / CSS）。

## 技术栈
- Vue 2.x
- Vue Router
- Vuex
- Element UI
- ECharts
- Axios
- Sass

## 先决条件
- Node.js >= 14
- npm (或使用 yarn)

## 安装依赖
在项目根目录运行：

```bash
npm install
```

## 开发
本项目使用 Vue CLI 提供的本地开发服务：

```bash
npm run serve
```

运行后打开浏览器访问默认地址（通常为 `http://localhost:8080`）。

## 构建生产包

```bash
npm run build
```

构建产物输出到 `dist/` 目录，可将其用于静态服务器或容器镜像构建。

## Docker & Kubernetes（可选部署）

示例：先构建镜像并推送到镜像仓库（根据实际镜像名替换）：

```bash
docker build -t <your-registry>/stock-frontend:latest .
docker push <your-registry>/stock-frontend:latest
```

仓库中包含 k8s 部署文件：`k8s/`。使用 `kubectl` 或 `kustomize` 部署：

```bash
kubectl apply -k k8s/
```

（根据集群/命名空间/镜像地址调整 `kustomization.yaml` 和 `deployment.yaml`）

## 配置说明
- 后端 API 基础地址位于 `src/utils/baseUrl.js`（或 `src/api/index.js` 中的配置），根据你的环境修改。
- 如果需要切换环境（开发/测试/生产），请在构建前调整对应配置或通过环境变量注入。

## 项目结构（重点文件）
- `src/main.js`：应用入口，挂载 Vue 实例并注册路由、状态管理和全局插件。
- `src/App.vue`：根组件。
- `src/router/index.js`：路由定义。
- `src/store/index.js`：Vuex 主入口；`src/store/stock/` 包含与股票相关的模块。
- `src/api/`：封装的 API请求入口（使用 axios）。
- `src/views/stock/`：股票相关页面（`stockDetail.vue`、`stockTotal.vue`、`stockTrade.vue`）。
- `src/views/golden/`：黄金/指标相关视图。
- `src/components/`：可复用组件（如 `cusDia.vue`）。
- `style/`：样式源码，包含 Sass 文件与编译后的 CSS。

## 功能
以下为基于 `src/views` 目录中各视图文件整理的页面功能一览：
- `admin/admin.vue`：应用主布局与侧边导航，包含：
	- 菜单入口：大盘数据、模拟交易、黄金变动数据；
	- 折叠侧栏与系统设置面板；
- `golden/golden_cus.vue`：增强版黄金监控，额外提供：
	- 黑夜/日间主题切换；
	- 更丰富的样式与交互（更友好的弹窗与提示）；
- `stock/stockTotal.vue`（实时行情）：
	- 实时行情表格、搜索添加自选、自动轮询更新；
	- 显示涨跌幅、成交量/成交额、行业/市值等关键字段；
	- 主题切换与本地主题持久化；
    - 大盘总成交额、涨跌分布可视化（ECharts）；
	- 行业成交额 Top10、行业分类统计表，支持搜索、排序、分页；
	- 个股 30 天详情与走势图弹窗，行业个股详情弹窗；
- `stock/stockTrade.vue`（模拟交易终端）：
	- 多账户模拟（A 股 / 港股），账户切换与余额、持仓总览；
	- 持仓管理（分页、搜索）、历史成交查看、撤单/卖出/买入流程（含估算手续费与盈亏）；
	- 实时/轮询行情获取、手动查询实时详情、买入/卖出弹窗表单与验证规则；

这些功能点基于视图源码中的 UI 控件、API 调用和方法实现整理，若需要我可以：

- 将每个视图的关键 API（`src/api` 中的方法名）列成表格并加入 README；
- 为每个页面写一段使用示例和截图占位说明（方便后续补图）；
- 或把功能提取成单独的 `docs/FEATURES.md` 文档。

## 常见问题与提示
- API 请求跨域：开发环境下可通过后端代理或在 `vue.config.js` 中配置 `devServer.proxy`。
- ECharts 渲染问题：确保容器有明确宽高并在视图可见时调用 `resize()`。
- Element UI 国际化或自定义主题：编辑 `style/` 中的 Sass 变量并重新编译。

## 测试与验证
本仓库目前没有集成自动化测试。如需添加，可考虑引入 Jest + vue-test-utils。

## 贡献
- 欢迎以 issue 或 pull request 形式提交问题与改进。
- 提交规范建议：描述清晰的变更目的、相关截图（如 UI 变更）以及回归测试说明。

## 联系与许可证
- 作者/维护者：请在仓库主页查看作者信息或直接通过 issue 联系。
- 许可证：请根据实际情况在仓库根目录添加 `LICENSE` 文件并标明许可类型。

---

如果你希望我把 `README.md` 再细化为部署步骤脚本、添加典型环境变量示例或把 API 文档补充到 `docs/`，我可以继续完善。

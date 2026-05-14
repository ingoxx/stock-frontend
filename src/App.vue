<template>
	<div id="app">
		<!-- 1. 控制总开关：如果有口令 (isAuth为true)，才渲染内部真实页面 -->
		<router-view v-if="isAuth" />

		<!-- 2. 全局验证弹窗：如果没有口令，直接拦截并要求输入 -->
		<div class="dialog">
			<el-dialog :title="secret_dia_title" :visible.sync="dialogVisible" :close-on-click-modal="false"
				:close-on-press-escape="false" :show-close="false" :center="true" width="300px"
				custom-class="custom-dialog">
				<div class="key">
					<el-input v-model="secret_key" placeholder="请输入访问口令" clearable @keyup.enter.native="start()"
						show-password></el-input>
				</div>
				<span slot="footer" class="dialog-footer">
					<el-button :loading="secret_loading" size="small" type="primary" @click="start()" tabindex="0"
						icon="el-icon-unlock">
						验证进入
					</el-button>
				</span>
			</el-dialog>
		</div>
	</div>
</template>

<script>
import { Message } from 'element-ui';

export default {
	name: 'App',
	data() {
		return {
			isAuth: false, // 授权状态拦截开关
			dialogVisible: false,
			secret_dia_title: '系统安全验证',
			secret_key: '',
			secret_loading: false
		};
	},
	created() {
		// 页面刷新或第一次打开时，检查本地是否已经有口令
		this.checkSign();
	},
	watch: {
		// 监听路由跳转，防止用户在使用过程中手动清理缓存
		$route() {
			this.checkSign();
		}
	},
	methods: {
		checkSign() {
			const sign = localStorage.getItem('sign');
			if (sign) {
				// 已有口令，正常放行
				this.isAuth = true;
				this.dialogVisible = false;
			} else {
				// 没有口令，拦截并弹窗
				this.isAuth = false;
				this.dialogVisible = true;
			}
		},

		async start() {
			this.secret_loading = true;
			let sign = localStorage.getItem('sign');

			if (!sign) {
				if (!this.secret_key) {
					Message.error({ message: "请输入访问口令", center: true });
					this.secret_loading = false;
					return;
				}

				// 验证通过，将用户输入的口令存入 localStorage
				localStorage.setItem('sign', this.secret_key);
			}

			// 如果有必须要全局前置加载的方法（如取全局字典/金价等），可以在这里 await
			// await this.get_golden_prices_list_mth();
			// this.loop_get_golden_price_mth();

			// 放行渲染所有路由，并关闭弹窗
			this.isAuth = true;
			this.secret_loading = false;
			this.dialogVisible = false;
			Message.success({ message: "验证成功", center: true });
		}
	}
};
</script>

<style lang="scss">
/* 你原有的代码样式保持不变 */
html,
body {
	margin: 0;
	padding: 0;
	height: 100%;
	box-sizing: border-box;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	height: 100%;
}

/* 可以稍微美化一下输入框弹窗 */
.custom-dialog {
	.el-dialog__header {
		padding-top: 25px;
	}

	.key {
		margin: 10px 0;
	}
}
</style>
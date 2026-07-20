<template>
	<div id="app">
		<!-- 1. 控制总开关：如果有口令 (isAuth为true)，才渲染内部真实页面 -->
		<router-view v-if="isAuth" />

		<!-- 2. 全局验证弹窗：股票黑夜主题全屏拦截 -->
		<transition name="fade">
			<div v-if="dialogVisible" class="stock-auth-wrapper">
				<!-- 背景装饰元素：网格与红绿光晕 -->
				<div class="bg-grid"></div>
				<div class="glow-green"></div>
				<div class="glow-red"></div>

				<!-- 验证核心面板 -->
				<div class="auth-card">
					<div class="card-header">
						<i class="el-icon-data-line logo-icon"></i>
						<h2>{{ secret_dia_title }}</h2>
						<p class="subtitle">Secure Financial Terminal</p>
					</div>

					<div class="card-body">
						<el-input v-model="secret_key" placeholder="请输入终端访问口令" clearable @keyup.enter.native="start()"
							show-password prefix-icon="el-icon-lock">
						</el-input>
					</div>

					<div class="card-footer">
						<el-button class="stock-btn" :loading="secret_loading" @click="start()" tabindex="0">
							{{ secret_loading ? '连接中...' : '授权接入终端' }}
							<i v-if="!secret_loading" class="el-icon-right"></i>
						</el-button>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script>
import { Message } from 'element-ui';
import { login_auth } from '@/api';

export default {
	name: 'App',
	data() {
		return {
			isAuth: false, // 授权状态拦截开关
			dialogVisible: false,
			secret_dia_title: 'A股数据分析系统安全验证',
			secret_key: '',
			secret_loading: false
		};
	},
	created() {
		this.checkSign();
	},
	watch: {
		$route() {
			this.checkSign();
		}
	},
	methods: {
		checkSign() {
			const sign = localStorage.getItem('sign');
			if (sign) {
				this.isAuth = true;
				this.dialogVisible = false;
			} else {
				this.isAuth = false;
				this.dialogVisible = true;
			}
		},

		async start() {
			let sign = localStorage.getItem('sign');

			// 如果本地没有口令，需要走接口验证
			if (!sign) {
				if (!this.secret_key) {
					Message.error({ message: "请输入访问口令", center: true });
					return;
				}

				this.secret_loading = true;
				try {
					const response = await login_auth({ sign: this.secret_key });
					if (response && response.data && response.data.code == 1000) {
						// 验证通过，将用户输入的口令存入 localStorage
						localStorage.setItem('sign', this.secret_key);
						Message.success({ message: response.data.msg || "验证通过，欢迎进入系统", center: true });
					} else {
						Message.error({ message: response.data.msg || "口令无效", center: true });
						this.secret_loading = false;
						return; // 失败直接 return
					}
				} catch (error) {
					Message.error({ message: error.message || "网络请求异常", center: true });
					this.secret_loading = false;
					return;
				}
			}

			// 放行渲染所有路由，并关闭弹窗
			this.isAuth = true;
			this.secret_loading = false;
			this.dialogVisible = false;
		}
	}
};
</script>

<style lang="scss">
/* ====== 全局基础样式 ====== */
html,
body {
	margin: 0;
	padding: 0;
	height: 100%;
	box-sizing: border-box;
	background-color: #0B0E11;
	/* 极暗夜景背景色 */
}

#app {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	height: 100%;
}

/* ====== 股票黑夜主题验证面板 ====== */
/* ====== 股票黑夜主题验证面板 ====== */
.stock-auth-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background-color: #0B0E11;
	display: flex;
	justify-content: center;
	align-items: center;
	/* 【关键修复】这里改为 1999，确保 Element UI 的 Message (2000+) 能显示在它上面 */
	z-index: 1999; 
	overflow: hidden;

	/* 辅助网格背景 */
	.bg-grid {
		position: absolute;
		width: 100%;
		height: 100%;
		background-image: 
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 40px 40px;
		z-index: 1;
		pointer-events: none; /* 【关键修复】防止背景挡住鼠标点击 */
	}

	/* 交易氛围光晕 */
	.glow-green {
		position: absolute;
		bottom: 15%;
		left: 15%;
		width: 400px;
		height: 400px;
		background: #0ECB81;
		filter: blur(200px);
		opacity: 0.15;
		z-index: 1;
		border-radius: 50%;
		pointer-events: none; /* 【关键修复】防止光晕图层拦截点击事件 */
	}

	.glow-red {
		position: absolute;
		top: 15%;
		right: 15%;
		width: 400px;
		height: 400px;
		background: #F6465D;
		filter: blur(200px);
		opacity: 0.12;
		z-index: 1;
		border-radius: 50%;
		pointer-events: none; /* 【关键修复】防止光晕图层拦截点击事件 */
	}

	/* 居中面板卡片 */
	.auth-card {
		position: relative;
		z-index: 10;
		width: 380px;
		background: #1E2329;
		/* 交易软件经典卡片色 */
		border: 1px solid #2B3139;
		border-radius: 12px;
		padding: 45px 35px;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
		transition: transform 0.3s ease;

		&:hover {
			border-color: #363D45;
			transform: translateY(-2px);
		}

		/* 头部标题区 */
		.card-header {
			text-align: center;
			margin-bottom: 35px;

			.logo-icon {
				font-size: 42px;
				color: #FCD535;
				/* 交易黄 */
				margin-bottom: 15px;
				text-shadow: 0 0 20px rgba(252, 213, 53, 0.4);
			}

			h2 {
				margin: 0;
				color: #EAECEF;
				font-size: 22px;
				font-weight: 600;
				letter-spacing: 1px;
			}

			.subtitle {
				margin: 8px 0 0;
				color: #848E9C;
				font-size: 13px;
				letter-spacing: 2px;
				text-transform: uppercase;
			}
		}

		/* 输入框区深度改造 Element UI */
		.card-body {
			margin-bottom: 25px;

			::v-deep .el-input__inner {
				background-color: #0B0E11;
				border: 1px solid #2B3139;
				color: #EAECEF;
				height: 48px;
				line-height: 48px;
				font-size: 15px;
				border-radius: 6px;
				transition: all 0.3s;

				&:focus {
					border-color: #FCD535;
					box-shadow: 0 0 0 2px rgba(252, 213, 53, 0.15);
				}

				&::placeholder {
					color: #5E6673;
				}
			}

			::v-deep .el-input__prefix {
				color: #848E9C;
				left: 12px;

				i {
					line-height: 48px;
					font-size: 16px;
				}
			}

			::v-deep .el-input__suffix {
				right: 12px;

				i {
					line-height: 48px;
				}
			}
		}

		/* 底部按钮 */
		.card-footer {
			.stock-btn {
				width: 100%;
				height: 48px;
				background-color: #FCD535;
				border: none;
				color: #181A20;
				font-size: 16px;
				font-weight: 600;
				border-radius: 6px;
				transition: all 0.3s;
				display: flex;
				justify-content: center;
				align-items: center;
				gap: 8px;

				&:hover {
					background-color: #F0C822;
					box-shadow: 0 8px 20px rgba(252, 213, 53, 0.3);
				}

				&:active {
					transform: scale(0.98);
				}

				&.is-loading {
					background-color: #bfa12a;
					color: #181A20;
				}
			}
		}
	}
}

/* 进场退场动画 */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
<template>
    <div class="box">
        <el-dialog
            :title="title"
            :visible.sync="dialogVisible"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
            :center="true"
            >
            <div class="key">
                <span>{{content}}</span>
            </div>
            <span slot="footer" class="dialog-footer">
                <el-button @click="dialogVisible = false">取 消</el-button>
                <el-button  size="small" type="primary" icon="el-icon-money">确 定</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
    import { set_golden_prices } from '../api';
    import { Message } from 'element-ui';
    
    export default {
        name: "cusDia",
        props: {
            diff_price: {
                type: String,
                required: true,
            },
            buy_price: {
                type: String,
                required: true,
            },
            sell_price: {
                type: String,
                required: true,
            },
            title: {
                type: String,
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            dialogVisible: {
                type: Boolean,
                required: true,
                default: false,
            },
            showClose: {
                type: Boolean,
                default: true,
            }
        },
        methods: {
            async set_golden_prices_mth() {
                if (!this.diff_price) {
                    Message.error(
                        {
                            message: "差额不能为空",
                            center: true,
                        }
                    );
                    return;
                }

                if (!this.buy_price) {
                    Message.error(
                        {
                            message: "买入不能为空",
                            center: true,
                        }
                    );
                    return;
                }

                if (!this.sell_price) {
                    Message.error(
                        {
                            message: "卖出不能为空",
                            center: true,
                        }
                    );
                    return;
                }

                const resp = await set_golden_prices({diff_price: 0, buy_price: 0, sell_price: 0})
                if (resp.data.code === 1000) {
                    Message.success({
                        message: resp.data.msg,
                        center: true,
                    });
                    return;
                }

                Message.error(
                    {
                        message: resp.data.msg,
                        center: true,
                    }
                );
            },
        }
    } 
</script>

<style scoped lang="scss">

</style>
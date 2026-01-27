<template>
    <div class="box">
        <div class="c1">
            <!-- golden content -->
            <div class="cd-1">
                <span class="font">{{ golden_real_time_price }}</span>
                <span class="font-1">更新：{{ golden_real_time_date}}</span>
            </div>
            <div class="cd-2">
                <div class="cd-2-1">
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_diff_price" :disabled="dev" placeholder="设定差额通知" clearable></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_sell_price" :disabled="dev" placeholder="设定卖出价格通知" clearable></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_buy_price" :disabled="dev" placeholder="设定买入价格通知" clearable></el-input>
                    </div>
                </div>
                <div class="cd-2-2">
                    <!-- <el-button type="primary" size="small" icon="el-icon-money">提交</el-button> -->
                    <el-popconfirm
                        confirm-button-text='确定'
                        cancel-button-text='不用了'
                        icon="el-icon-info"
                        icon-color="red"
                        title="确定提交吗？"
                        
                        >
                        <el-button slot="reference" type="primary" size="small" icon="el-icon-money" :disabled="dev">提交</el-button>
                    </el-popconfirm>
                </div>
            </div>
        </div>
        <div class="c2">
            <!-- stock content -->
            <div class="sc" v-if="tableData.length > 0">
                <span class="sc-1">实时刷新中{{ point }}</span>
            </div>
            <div class="tb">
                <template>
                    <el-table
                    :data="tableData"
                    :default-sort = "{prop: 'date', order: 'descending'}"
                    >
                    <el-table-column
                        prop="price"
                        label="价格"
                        :formatter="formatter"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="date"
                        label="日期"
                        sortable
                        >
                    </el-table-column>
                    </el-table>
                </template>
            </div>
        </div>
    <div class="dialog">
        <el-dialog
            :title="secret_dia_title"
            :visible.sync="dialogVisible"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
            :center="true"
            >
            <div class="key">
                <el-input v-model="secret_key" :placeholder="secret_dia_title" clearable></el-input>
            </div>
            <span slot="footer" class="dialog-footer">
                <!-- <el-button @click="dialogVisible = false">取 消</el-button> -->
                <el-button :loading="secret_loading" size="small" type="primary" @click="start()" icon="el-icon-money">确 定</el-button>
            </span>
            </el-dialog>
    </div>
    </div>
</template>

<script>
    import { get_golden_prices_list, set_golden_prices } from '../../api';
    import { Message } from 'element-ui';

    export default {
        name: 'stock',
        data()  {
            return {
                dev: true,
                secret_loading: false,
                point: "",
                secret_dia_title: "请输入口令",
                stock_list: [],
                golden_real_time_date: "null",
                golden_real_time_price: 0.0,
                set_timer: null,
                flush_timer: null,
                gold_diff_price: null,
                gold_sell_price: null,
                gold_buy_price: null,
                dialogVisible: false,
                secret_key: null,
                tableData: [],
            }
        },
        computed: {},
        components: {},
        methods: {
            formatter(row, column) {
                return row.price;
            },
            async get_golden_prices_list_mth() {
                const resp = await get_golden_prices_list();
                if (resp.data.code === 1000) {
                    this.tableData = resp.data.data;
                    var latest = this.tableData[this.tableData.length - 1];
                    this.golden_real_time_price = latest.price;
                    this.golden_real_time_date = latest.date;
                    sessionStorage.setItem('is_pass', 'y');
                } else {
                    Message.error({
                        message: resp.data.msg,
                        center: true
                    });
                    clearInterval(this.set_timer);
                }
            },
            loop_get_golden_price_mth() {
                var is_pass = sessionStorage.getItem('is_pass');
                if (is_pass === 'y' && !this.set_timer && !this.flush_timer) {
                    this.flush_timer = setInterval(() => {
                        this.point += '.';
                        if (this.point.length > 3) {
                            this.point = ''; 
                        }
                    }, 500);

                    this.set_timer = setInterval(() => {
                        this.get_golden_prices_list_mth();
                    }, 5000)
                } else {
                    this.dialogVisible = true;
                }
            },
            async start() {
                this.secret_loading = true;
                var sign = sessionStorage.getItem('sign');
                if (!sign) {
                    if (!this.secret_key) {
                        Message.error({
                            message: "输入口令",
                            center: true,
                        });
                        return;
                    }
                    
                    sessionStorage.setItem('sign', this.secret_key);
                }
                await this.get_golden_prices_list_mth();
                this.loop_get_golden_price_mth();
                this.secret_loading = false;
                this.dialogVisible = false;
            },
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
        },
        mounted() {
            this.loop_get_golden_price_mth();
        }
    }
</script>

<style lang="scss" scoped>
    @import '../../../public/style/stock/stock.scss';
</style>
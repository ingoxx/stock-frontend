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
                    <el-button  size="small" icon="el-icon-setting" :disabled="dev" @click="reset()">重置</el-button>
                    <el-button :loading="setPriceLoading" type="primary" size="small" icon="el-icon-money" :disabled="dev" @click="submit()">提交</el-button>
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
                    v-loading="tableLoading"
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
                <el-input v-model="secret_key" :placeholder="secret_dia_title" clearable @keyup.enter.native="start()"></el-input>
            </div>
            <span slot="footer" class="dialog-footer">
                <!-- <el-button @click="dialogVisible = false">取 消</el-button> -->
                <el-button :loading="secret_loading" size="small" type="primary" @click="start()" tabindex="0" icon="el-icon-money">确 定</el-button>
            </span>
        </el-dialog>
        <!-- <cusDia 
            :title="cusDiaTitle" 
            :content="cusDiaContent" 
            :visible="cusDiaVisible">
        </cusDia> -->
    </div>
    </div>
</template>

<script>
    import { get_golden_prices_list, set_golden_prices } from '../../api';
    import { Message, MessageBox } from 'element-ui';
    // import cusDia from '../../components/cusDia.vue'

    export default {
        name: 'golden',
        data()  {
            return {
                setPriceLoading: false,
                cusDiaVisible: false,
                cusDiaContent: "",
                cusDiaTitle: "",
                dev: false,
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
                tableLoading: true,
            }
        },
        computed: {
            // cusDia,
        },
        components: {},
        methods: {
            reset() {
                this.gold_diff_price = null;
                this.gold_sell_price = null;
                this.gold_buy_price = null;
            },
            submit() {
                if (!this.gold_diff_price) {
                    Message.error(
                        {
                            message: "差额不能为空",
                            center: true,
                        }
                    );
                    return;
                }

                if (!this.gold_sell_price) {
                    Message.error(
                        {
                            message: "卖出价格不能为空",
                            center: true,
                        }
                    );
                    return;
                }

                if (!this.gold_buy_price) {
                    Message.error(
                        {
                            message: "买入价格不能为空",
                            center: true,
                        }
                    );
                    return;
                }
 
                MessageBox.confirm('确定提交吗？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    center: true,
                    roundButton: true,
                    beforeClose: (action, instance, done) => {
                        this.$nextTick(() => {
                        const messageBox = document.querySelector('.el-message-box');
                        if (messageBox) {
                            messageBox.style.width = '200px';  // 设置宽度
                            messageBox.style.position = 'relative';  // 设置位置
                        }
                        });
                    done();
                    }
                }).then(() => {
                    this.set_golden_prices_mth();
                }).catch(() => {
                    
                });
            },
            formatter(row, column) {
                return row.price;
            },
            async get_golden_prices_list_mth() {
                this.tableLoading = true;
                const resp = await get_golden_prices_list();
                if (resp.data.code === 1000) {
                    this.tableData = resp.data.data;
                    var latest = this.tableData[this.tableData.length - 1];
                    this.golden_real_time_price = latest.price;
                    this.golden_real_time_date = latest.date;
                    localStorage.setItem('is_pass', 'y');
                    this.tableLoading = false;
                } else {
                    Message.error({
                        message: resp.data.msg,
                        center: true
                    });
                    clearInterval(this.set_timer);
                }
            },
            loop_get_golden_price_mth() {
                var is_pass = localStorage.getItem('is_pass');
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
                var sign = localStorage.getItem('sign');
                if (!sign) {
                    if (!this.secret_key) {
                        Message.error({
                            message: "输入口令",
                            center: true,
                        });
                        return;
                    }
                    
                    localStorage.setItem('sign', this.secret_key);
                }
                await this.get_golden_prices_list_mth();
                this.loop_get_golden_price_mth();
                this.secret_loading = false;
                this.dialogVisible = false;
            },
            async set_golden_prices_mth() {
                this.setPriceLoading = true;
                const resp = await set_golden_prices(
                    {
                        diff_price: parseFloat(this.gold_diff_price), 
                        buy_price: parseFloat(this.gold_buy_price), 
                        sell_price: parseFloat(this.gold_sell_price)
                    }
                );
                
                if (resp.data.code === 1000) {
                    Message.success({
                        message: resp.data.msg,
                        center: true,
                    });
                } else {
                    Message.error(
                        {
                            message: resp.data.msg,
                            center: true,
                        }
                    );
                }
                this.setPriceLoading = false;
            },
        },
        mounted() {
            this.loop_get_golden_price_mth();
        }
    }
</script>

<style lang="scss" scoped>
    @import '../../../public/style/golden/golden';
</style>
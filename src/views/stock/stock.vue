<template>
    <div class="box">
        <div class="c1">
            <!-- golden content -->
            <div class="cd-1">
                <span class="font">{{ golden_real_time_price }}</span>
                <span class="font-1">更新：2026-01-22 16:32:57</span>
            </div>
            <div class="cd-2">
                <div class="cd-2-1">
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_diff_price" placeholder="设定差额" clearable></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_sell_price" placeholder="设定卖出价格" clearable></el-input>
                    </div>
                    <div class="cd-2-1-1">
                        <el-input v-model="gold_buy_price" placeholder="设定买入价格" clearable></el-input>
                    </div>
                </div>
                <div class="cd-2-2">
                    <el-button type="primary" size="small">确定</el-button>
                </div>
            </div>
        </div>
        <div class="c2">
            <!-- stock content -->
            <div class="sc">
                
            </div>
            <div class="tb">
                <template>
                    <el-table
                    :data="tableData"
                    >
                    <el-table-column
                        prop="price"
                        label="价格"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="date"
                        label="日期"
                        >
                    </el-table-column>
                    </el-table>
                </template>
            </div>
        </div>
    <div class="dialog">
        <el-dialog
            title="输入密钥"
            :visible.sync="dialogVisible"
            >
            <div class="key">
                <el-input v-model="secret_key" placeholder="输入密钥" clearable></el-input>
            </div>
            <span slot="footer" class="dialog-footer">
                <el-button @click="dialogVisible = false">取 消</el-button>
                <el-button type="primary" @click="dialogVisible = false">确 定</el-button>
            </span>
            </el-dialog>
    </div>
    </div>
</template>

<script>
    import { get_stock_list } from '../../api';

    export default {
        name: 'stock',
        data()  {
            return {
                stock_list: [],
                golden_real_time_price: 1082.15,
                set_timer: null,
                gold_diff_price: null,
                gold_sell_price: null,
                gold_buy_price: null,
                dialogVisible: true,
                secret_key: null,
                tableData: [
                    {
                        date: '2026-01-22 15:20:10',
                        price: '1083.12',
                    }, 
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    }, 
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    },
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    },
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    },
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    },
                    {
                        date: '2026-01-22 15:20:12',
                        price: '1081.46',
                    },
                ],
            }
        },
        computed: {},
        components: {},
        methods: {
            get_stock_list_mth() {},
            get_golden_price_mth() {},
            loop_flush_all_data_mth() {},
        },
        mounted() {

        }
    }
</script>

<style lang="scss" scoped>
    @import '../../../public/style/stock/stock.scss';
</style>
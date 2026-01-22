import { get, post, loginPost } from '../utils/http'


export const get_stock_list = (params) => get("/v1/golden/list", params);
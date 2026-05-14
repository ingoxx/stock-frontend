import { get, post, loginPost } from '../utils/http'


export const get_golden_prices_list = (params) => get(`/v1/golden/list?sign=${localStorage.getItem('sign')}`, params);
export const set_golden_prices = (params) => post(`/v1/golden/set?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_industry_list = (params) => get(`/v1/stock/industry/list?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_industry_up_down = (params) => get(`/v1/stock/industry/up-down?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_market_data = (params) => get(`/v1/stock/market-data?sign=${localStorage.getItem('sign')}`, params);
export const stock_data_switch = (params) => get(`/v1/stock/switch?sign=${localStorage.getItem('sign')}`, params);
export const stock_data_status = (params) => get(`/v1/stock/run-status?sign=${localStorage.getItem('sign')}`, params);
export const get_industry_data = (params) => get(`/v1/stock/industry/data?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_history_data = (params) => get(`/v1/stock/history/data?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_info_data = (params) => get(`/v1/stock/info/data?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_real_time_data = (params) => get(`/v1/stock/real-time/data?sign=${localStorage.getItem('sign')}`, params);
export const get_stock_real_time_list = (params) => get(`/v1/stock/real-time/list?sign=${localStorage.getItem('sign')}`, params);
export const del_self_selected_stock = (params) => post(`/v1/stock/self-selected-del?sign=${localStorage.getItem('sign')}`, params);
export const update_trade_status = (params) => post(`/v1/stock/trade-status/update?sign=${localStorage.getItem('sign')}`, params);
export const stock_real_time_switch = (params) => post(`/v1/stock/real-time/switch?sign=${localStorage.getItem('sign')}`, params);

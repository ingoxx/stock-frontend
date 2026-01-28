import { get, post, loginPost } from '../utils/http'


export const get_golden_prices_list = (params) => get(`/v1/golden/list?sign=${localStorage.getItem('sign')}`, params);
export const set_golden_prices = (params) => post(`/v1/golden/set?sign=${localStorage.getItem('sign')}`, params);
const API_BASE=(import.meta.env.VITE_API_URL??"http://localhost:8000/api/v1").replace(/\/$/,"");

export type Category={id:string;nameUz:string;nameRu:string};
export type ApiProduct={id:string;categoryId:string|null;titleUz:string;titleRu?:string|null;descriptionUz?:string|null;descriptionRu?:string|null;currency:string;priceMinor:number;status:string;category?:Category|null;imageUrl?:string|null;thumbnailUrl?:string|null;source?:string};
export type ProductList={items:ApiProduct[];page:number;limit:number;total:number;pages:number};
export type PddProduct={id:string;title:string;description:string|null;priceCnyMinor:number|null;imageUrl:string|null;thumbnailUrl:string|null;sales:number|null;goodsSign:string|null;raw:Record<string,unknown>};

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const token=localStorage.getItem("pdu_access_token");
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
  const res=await fetch(API_BASE+path,{...init,headers:{"Content-Type":"application/json",...(token?{"Authorization":`Bearer ${token}`}:{ }),...(init?.headers??{})},signal:controller.signal});
  clearTimeout(timer); let body:unknown; try{body=await res.json();}catch{body=null;}
  if(!res.ok){const message=typeof body==="object"&&body&&"message" in body?String((body as {message?:unknown}).message):`API error ${res.status}`;throw new Error(message);}
  return body as T;
}
export const api={
  health:()=>request<{status:string;database:string;integrations:{pinduoduo:{configured:boolean;gateway:string}}}>("/health"),
  categories:()=>request<Category[]>("/categories"),
  products:(params:{search?:string;categoryId?:string;page?:number;limit?:number}={})=>{const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>v!==undefined&&q.set(k,String(v)));return request<ProductList>(`/products?${q}`);},
  product:(id:string)=>request<ApiProduct>(`/products/${encodeURIComponent(id)}`),
  addresses:()=>request<Array<{id:string;city:string;street:string;house:string;recipientName:string;phone:string}>>("/addresses"),
  checkoutPreview:()=>request<{subtotal:number;shipping:number;serviceFee:number;discount:number;total:number;currency:string}>("/checkout/preview",{method:"POST"}),
  createOrder:(deliveryAddress:string,idempotencyKey:string)=>request("/orders",{method:"POST",headers:{"Idempotency-Key":idempotencyKey},body:JSON.stringify({deliveryAddress})}),
  orders:()=>request("/orders"),
  pddStatus:()=>request<{provider:string;configured:boolean;gateway:string}>("/integrations/pinduoduo/status"),
  pddSearch:(keyword:string,page=1,pageSize=20)=>request<{source:string;page:number;pageSize:number;total:number;items:PddProduct[]}>(`/integrations/pinduoduo/goods/search?keyword=${encodeURIComponent(keyword)}&page=${page}&page_size=${pageSize}`),
  requestOtp:(phone:string)=>request<{accepted:boolean;expiresInSeconds:number;devCode?:string}>("/auth/request-otp",{method:"POST",body:JSON.stringify({phone})}),
  verifyOtp:(phone:string,code:string)=>request<{accessToken:string;user:{id:string;phone:string}}>("/auth/verify-otp",{method:"POST",body:JSON.stringify({phone,code})})
};
export const formatUzs=(minor:number)=>new Intl.NumberFormat("ru-RU").format(Math.round(minor/100))+" сум";
export const formatCny=(minor:number|null)=>minor===null?"Цена уточняется":`¥ ${(minor/100).toFixed(2)}`;
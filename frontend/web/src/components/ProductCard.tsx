export type ProductCardProps={title:string;price:number;oldPrice?:number;imageUrl?:string};
export function ProductCard(props:ProductCardProps){return <article data-design="PDU/ProductCard" data-product-id={props.title}>{props.title}</article>}

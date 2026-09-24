import type { ButtonHTMLAttributes } from "react";
export function Button({variant="primary",...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: "primary"|"secondary"}) {
  return <button data-design="PDU/Button" data-variant={variant} {...props}/>;
}

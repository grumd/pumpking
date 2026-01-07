import{r as t}from"./index-k0Q3n1S8.js";function f(l=!1,r={}){const[n,u]=t.useState(l),s=t.useCallback(()=>{u(e=>e||(r.onOpen?.(),!0))},[r.onOpen]),o=t.useCallback(()=>{u(e=>e&&(r.onClose?.(),!1))},[r.onClose]),a=t.useCallback(()=>{n?o():s()},[o,s,n]);return[n,{open:s,close:o,toggle:a}]}export{f as u};
//# sourceMappingURL=use-disclosure-CAwfJcH5.js.map

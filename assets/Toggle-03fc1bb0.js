var h=Object.defineProperty;var i=(t,e,s)=>e in t?h(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var o=(t,e,s)=>(i(t,typeof e!="symbol"?e+"":e,s),s);import{g as n,_ as l,j as c}from"./index-9de2e070.js";class d extends n.Component{constructor(){super();o(this,"onChange",s=>{this.props.onChange(s.target.checked)});this.id=l.uniqueId()}render(){return c.jsxs("div",{className:"toggle-checkbox",children:[c.jsx("input",{type:"checkbox",className:"toggle-checkbox-cb",id:this.id,onChange:this.onChange,checked:this.props.checked}),c.jsx("label",{htmlFor:this.id,className:"toggle",children:c.jsx("span",{})}),this.props.children&&c.jsx("label",{htmlFor:this.id,className:"text-label",children:this.props.children})]})}}export{d as T};
//# sourceMappingURL=Toggle-03fc1bb0.js.map
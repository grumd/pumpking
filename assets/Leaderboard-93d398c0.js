var ve=Object.defineProperty;var Ee=(e,a,t)=>a in e?ve(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t;var j=(e,a,t)=>(Ee(e,typeof a!="symbol"?a+"":a,t),t);import{g as de,t as T,_ as n,j as s,r as w,F as fe,C as P,D as V,h as be,i as ae,k as te,l as R,L as G,m as Ce,n as Oe,o as ne,q as _e,s as Re,v as Pe,w as Te,x as ye,y as ue,z as je,A as me,B as Le,E as ke,I as y,S as p,J as Q,b as Ie,a as He,u as De,c as U,K as Me,M as re,N as Fe,O as Be,d as Ue,P as we,Q as We,T as le,U as Ye,V as Ke,W as Ge,f as Ve,e as $e}from"./index-9de2e070.js";import{R as Xe,S as L}from"./index-3b570a28.js";import{c as J}from"./index-02d73131.js";import{T as k}from"./ToggleButton-fff6d650.js";import{T as qe}from"./Toggle-03fc1bb0.js";import{O as he,c as ze}from"./index.esm-3007a725.js";import{C as Qe,F as Ze}from"./Chart-4c8dad7a.js";import{c as pe}from"./index-fa5dac72.js";import{u as Je}from"./usePlayers-91a65387.js";import{u as es}from"./useUser-9ccd8d49.js";import"./numeral-5b7fed37.js";import"./Tooltip-3e7b8b5d.js";import"./index-584f57a2.js";import"./index-1f744030.js";import"./ChartLabel-d943c3ac.js";class W extends de.Component{constructor(a){super(a),this.state={value:(n.isNil(a.value)?a.defaultValue:a.value)||""},n.bindAll(["handleChange","handleBlur","handleKeyPress"],this)}componentDidUpdate(a){a.value!==this.props.value&&this.setState({value:this.props.value})}handleChange(a){const t=a.target.value;this.setState({value:t},()=>this.props.onChange(t))}handleBlur(a){const{type:t}=this.props,{value:r}=this.state;if(t==="number"){const l=Number(r);l>=Number(a.target.min)&&l<=Number(a.target.max)?this.props.onBlur(l,a):(this.setState({value:this.props.value}),this.props.onBlur(this.props.value,a))}}handleKeyPress(a){a.key==="Enter"&&this.handleBlur(a)}render(){const{className:a}=this.props;return s.jsx("input",{...n.omit(["defaultValue","onChange"],this.props),className:J(a,"text-input"),value:this.state.value,onBlur:this.handleBlur,onKeyPress:this.handleKeyPress,onInput:this.handleChange,onChange:n.noop})}}j(W,"propTypes",{value:T.any,defaultValue:T.any,onChange:T.func,onBlur:T.func,type:T.string,className:T.string,trimOnBlur:T.bool}),j(W,"defaultProps",{value:null,type:"text",onChange:n.noop,onBlur:n.noop});class Z extends w.PureComponent{constructor(a){super(),this.state={open:a.defaultOpen||!1}}render(){const{children:a,title:t,className:r}=this.props,{open:l}=this.state;return s.jsxs("div",{className:J("collapsible-bar",r,{open:l}),children:[s.jsxs("div",{className:"header",onClick:()=>this.setState(u=>({open:!u.open})),children:[s.jsx("div",{className:"collapse-button",children:s.jsx(fe,{})}),s.jsx("div",{className:"title",children:t})]}),a&&s.jsx("div",{className:"collapsible-children",children:a})]})}}j(Z,"propTypes",{className:T.string,children:T.any,title:T.any,defaultOpen:T.bool});function ss({filterValue:e,onChange:a}){const t=n.getOr(P,"range",e),r=n.getOr(null,"type",e),l=n.getOr(V,"duration",e),u=be();let h=u.FILTER_CHARTS;if(e){const o=r||"";h=t[0]===t[1]?`${o}${t[0]}`:`${o}${t[0]} - ${o}${t[1]}`,h=u.CHARTS+": "+h,n.isEqual(l,V)||(h+=" ***")}const i=o=>{a({range:t,type:r,...o,duration:n.isEmpty(o.duration)?l:o.duration})};return s.jsx("div",{children:s.jsx(he,{overlayClassName:"chart-range-overlay-outer",overlayItem:s.jsx("button",{className:"filter-charts-button btn btn-sm btn-dark",children:h}),children:s.jsxs("div",{className:"chart-range-overlay",children:[s.jsxs("div",{className:"buttons",children:[s.jsx(k,{text:"Single",active:r==="S",onToggle:o=>{i({type:o?"S":null})}}),s.jsx(k,{text:"Double",active:r==="D",onToggle:o=>{i({type:o?"D":null})}})]}),s.jsx(Xe,{range:t,min:P[0],max:P[1],onChange:o=>i({range:o})}),s.jsxs("div",{className:"inputs",children:[s.jsx("button",{className:"btn btn-sm btn-dark",onClick:()=>i({range:[Math.max(t[0]-1,P[0]),t[1]]}),children:s.jsx(ae,{})}),s.jsx(W,{type:"number",className:"form-control",min:P[0],max:Math.min(P[1],t[1]),value:t[0],onBlur:o=>{i({range:[o,t[1]]})}}),s.jsx("button",{className:"btn btn-sm btn-dark",onClick:()=>{const o=Math.min(t[0]+1,P[1]);i({range:[o,t[1]<o?o:t[1]]})},children:s.jsx(te,{})}),s.jsx("div",{className:"_flex-fill"}),s.jsx("button",{className:"btn btn-sm btn-dark",onClick:()=>{const o=Math.max(t[1]-1,P[0]);i({range:[t[0]>o?o:t[0],o]})},children:s.jsx(ae,{})}),s.jsx(W,{type:"number",className:"form-control",min:Math.max(P[0],t[0]),max:P[1],value:t[1],onBlur:o=>i({range:[t[0],o]})}),s.jsx("button",{className:"btn btn-sm btn-dark",onClick:()=>i({range:[t[0],Math.min(t[1]+1,P[1])]}),children:s.jsx(te,{})})]}),s.jsxs("div",{className:"buttons-duration",children:[s.jsx(k,{text:"Standard",active:l.includes(R.STD),onToggle:o=>{i({duration:o?[...l,R.STD]:n.without([R.STD],l)})}}),s.jsx(k,{text:"Short",active:l.includes(R.SHORT),onToggle:o=>{i({duration:o?[...l,R.SHORT]:n.without([R.SHORT],l)})}}),s.jsx(k,{text:"Remix",active:l.includes(R.REMIX),onToggle:o=>{i({duration:o?[...l,R.REMIX]:n.without([R.REMIX],l)})}}),s.jsx(k,{text:"Full",active:l.includes(R.FULL),onToggle:o=>{i({duration:o?[...l,R.FULL]:n.without([R.FULL],l)})}})]})]})})})}const as=e=>({...e.presets}),ts={loadPresets:Te,savePreset:ye,openPreset:ue,deletePreset:je,selectPreset:me};class ge extends de.Component{constructor(){super(...arguments);j(this,"state",{});j(this,"onChangeSelection",t=>{this.props.selectPreset(t.name)});j(this,"onRewritePreset",()=>{const{currentPreset:t}=this.props;this.props.savePreset(t.name)});j(this,"onSavePreset",()=>{const{name:t}=this.state;this.props.savePreset(t),this.setState({isAddingNew:!1})})}componentDidMount(){this.props.loadPresets()}render(){const{presets:t,currentPreset:r,isLoading:l}=this.props,{name:u,isAddingNew:h}=this.state,i=this.context;return s.jsx("div",{children:s.jsx(he,{overlayItem:s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-right",children:[s.jsx(Ce,{}),i.PRESETS]}),children:s.jsxs("div",{className:"presets-control-overlay",children:[s.jsx(L,{className:"select _margin-bottom",classNamePrefix:"select",placeholder:i.PRESETS_PLACEHOLDER,options:t,value:r,onChange:this.props.selectPreset,noOptionsMessage:()=>i.EMPTY}),r&&s.jsxs("div",{className:"buttons-presets _margin-bottom",children:[s.jsx("div",{className:"_flex-fill"}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-right",onClick:this.props.openPreset,disabled:l,children:[s.jsx(Oe,{})," ",i.OPEN]}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-right",onClick:this.onRewritePreset,disabled:l,children:[s.jsx(ne,{})," ",i.OVERWRITE]}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon",onClick:this.props.deletePreset,disabled:l,children:[s.jsx(_e,{})," ",i.DELETE]})]}),!h&&s.jsxs("div",{className:"buttons-presets _margin-bottom",children:[s.jsx("div",{className:"_flex-fill"}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-left _self-align-end",onClick:()=>this.setState({isAddingNew:!0}),disabled:l,children:[s.jsx(Re,{})," ",i.ADD]})]}),h&&s.jsxs("div",{className:"adding-new _margin-bottom",children:[s.jsx(W,{value:u,placeholder:i.PRESET_NAME_PLACEHOLDER,className:"form-control",onChange:o=>this.setState({name:o})}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-left",onClick:this.onSavePreset,disabled:!u||l,children:[s.jsx(ne,{})," ",i.SAVE]}),s.jsx("button",{className:"btn btn-sm btn-dark btn-icon _margin-left",onClick:()=>this.setState({isAddingNew:!1}),disabled:l,children:i.CANCEL})]})]})})})}}j(ge,"contextType",G);const ns=Pe(as,ts)(ge);var $={exports:{}},xe={À:"A",Á:"A",Â:"A",Ã:"A",Ä:"A",Å:"A",Ấ:"A",Ắ:"A",Ẳ:"A",Ẵ:"A",Ặ:"A",Æ:"AE",Ầ:"A",Ằ:"A",Ȃ:"A",Ç:"C",Ḉ:"C",È:"E",É:"E",Ê:"E",Ë:"E",Ế:"E",Ḗ:"E",Ề:"E",Ḕ:"E",Ḝ:"E",Ȇ:"E",Ì:"I",Í:"I",Î:"I",Ï:"I",Ḯ:"I",Ȋ:"I",Ð:"D",Ñ:"N",Ò:"O",Ó:"O",Ô:"O",Õ:"O",Ö:"O",Ø:"O",Ố:"O",Ṍ:"O",Ṓ:"O",Ȏ:"O",Ù:"U",Ú:"U",Û:"U",Ü:"U",Ý:"Y",à:"a",á:"a",â:"a",ã:"a",ä:"a",å:"a",ấ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",æ:"ae",ầ:"a",ằ:"a",ȃ:"a",ç:"c",ḉ:"c",è:"e",é:"e",ê:"e",ë:"e",ế:"e",ḗ:"e",ề:"e",ḕ:"e",ḝ:"e",ȇ:"e",ì:"i",í:"i",î:"i",ï:"i",ḯ:"i",ȋ:"i",ð:"d",ñ:"n",ò:"o",ó:"o",ô:"o",õ:"o",ö:"o",ø:"o",ố:"o",ṍ:"o",ṓ:"o",ȏ:"o",ù:"u",ú:"u",û:"u",ü:"u",ý:"y",ÿ:"y",Ā:"A",ā:"a",Ă:"A",ă:"a",Ą:"A",ą:"a",Ć:"C",ć:"c",Ĉ:"C",ĉ:"c",Ċ:"C",ċ:"c",Č:"C",č:"c",C̆:"C",c̆:"c",Ď:"D",ď:"d",Đ:"D",đ:"d",Ē:"E",ē:"e",Ĕ:"E",ĕ:"e",Ė:"E",ė:"e",Ę:"E",ę:"e",Ě:"E",ě:"e",Ĝ:"G",Ǵ:"G",ĝ:"g",ǵ:"g",Ğ:"G",ğ:"g",Ġ:"G",ġ:"g",Ģ:"G",ģ:"g",Ĥ:"H",ĥ:"h",Ħ:"H",ħ:"h",Ḫ:"H",ḫ:"h",Ĩ:"I",ĩ:"i",Ī:"I",ī:"i",Ĭ:"I",ĭ:"i",Į:"I",į:"i",İ:"I",ı:"i",Ĳ:"IJ",ĳ:"ij",Ĵ:"J",ĵ:"j",Ķ:"K",ķ:"k",Ḱ:"K",ḱ:"k",K̆:"K",k̆:"k",Ĺ:"L",ĺ:"l",Ļ:"L",ļ:"l",Ľ:"L",ľ:"l",Ŀ:"L",ŀ:"l",Ł:"l",ł:"l",Ḿ:"M",ḿ:"m",M̆:"M",m̆:"m",Ń:"N",ń:"n",Ņ:"N",ņ:"n",Ň:"N",ň:"n",ŉ:"n",N̆:"N",n̆:"n",Ō:"O",ō:"o",Ŏ:"O",ŏ:"o",Ő:"O",ő:"o",Œ:"OE",œ:"oe",P̆:"P",p̆:"p",Ŕ:"R",ŕ:"r",Ŗ:"R",ŗ:"r",Ř:"R",ř:"r",R̆:"R",r̆:"r",Ȓ:"R",ȓ:"r",Ś:"S",ś:"s",Ŝ:"S",ŝ:"s",Ş:"S",Ș:"S",ș:"s",ş:"s",Š:"S",š:"s",Ţ:"T",ţ:"t",ț:"t",Ț:"T",Ť:"T",ť:"t",Ŧ:"T",ŧ:"t",T̆:"T",t̆:"t",Ũ:"U",ũ:"u",Ū:"U",ū:"u",Ŭ:"U",ŭ:"u",Ů:"U",ů:"u",Ű:"U",ű:"u",Ų:"U",ų:"u",Ȗ:"U",ȗ:"u",V̆:"V",v̆:"v",Ŵ:"W",ŵ:"w",Ẃ:"W",ẃ:"w",X̆:"X",x̆:"x",Ŷ:"Y",ŷ:"y",Ÿ:"Y",Y̆:"Y",y̆:"y",Ź:"Z",ź:"z",Ż:"Z",ż:"z",Ž:"Z",ž:"z",ſ:"s",ƒ:"f",Ơ:"O",ơ:"o",Ư:"U",ư:"u",Ǎ:"A",ǎ:"a",Ǐ:"I",ǐ:"i",Ǒ:"O",ǒ:"o",Ǔ:"U",ǔ:"u",Ǖ:"U",ǖ:"u",Ǘ:"U",ǘ:"u",Ǚ:"U",ǚ:"u",Ǜ:"U",ǜ:"u",Ứ:"U",ứ:"u",Ṹ:"U",ṹ:"u",Ǻ:"A",ǻ:"a",Ǽ:"AE",ǽ:"ae",Ǿ:"O",ǿ:"o",Þ:"TH",þ:"th",Ṕ:"P",ṕ:"p",Ṥ:"S",ṥ:"s",X́:"X",x́:"x",Ѓ:"Г",ѓ:"г",Ќ:"К",ќ:"к",A̋:"A",a̋:"a",E̋:"E",e̋:"e",I̋:"I",i̋:"i",Ǹ:"N",ǹ:"n",Ồ:"O",ồ:"o",Ṑ:"O",ṑ:"o",Ừ:"U",ừ:"u",Ẁ:"W",ẁ:"w",Ỳ:"Y",ỳ:"y",Ȁ:"A",ȁ:"a",Ȅ:"E",ȅ:"e",Ȉ:"I",ȉ:"i",Ȍ:"O",ȍ:"o",Ȑ:"R",ȑ:"r",Ȕ:"U",ȕ:"u",B̌:"B",b̌:"b",Č̣:"C",č̣:"c",Ê̌:"E",ê̌:"e",F̌:"F",f̌:"f",Ǧ:"G",ǧ:"g",Ȟ:"H",ȟ:"h",J̌:"J",ǰ:"j",Ǩ:"K",ǩ:"k",M̌:"M",m̌:"m",P̌:"P",p̌:"p",Q̌:"Q",q̌:"q",Ř̩:"R",ř̩:"r",Ṧ:"S",ṧ:"s",V̌:"V",v̌:"v",W̌:"W",w̌:"w",X̌:"X",x̌:"x",Y̌:"Y",y̌:"y",A̧:"A",a̧:"a",B̧:"B",b̧:"b",Ḑ:"D",ḑ:"d",Ȩ:"E",ȩ:"e",Ɛ̧:"E",ɛ̧:"e",Ḩ:"H",ḩ:"h",I̧:"I",i̧:"i",Ɨ̧:"I",ɨ̧:"i",M̧:"M",m̧:"m",O̧:"O",o̧:"o",Q̧:"Q",q̧:"q",U̧:"U",u̧:"u",X̧:"X",x̧:"x",Z̧:"Z",z̧:"z"},Ne=Object.keys(xe).join("|"),rs=new RegExp(Ne,"g"),ls=new RegExp(Ne,""),Ae=function(e){return e.replace(rs,function(a){return xe[a]})},os=function(e){return!!e.match(ls)};$.exports=Ae;$.exports.has=os;$.exports.remove=Ae;var is=$.exports;const cs=Le(is);var b={CASE_SENSITIVE_EQUAL:9,EQUAL:8,STARTS_WITH:7,WORD_STARTS_WITH:6,STRING_CASE:5,STRING_CASE_ACRONYM:4,CONTAINS:3,ACRONYM:2,MATCHES:1,NO_MATCH:0},_={CAMEL:.8,PASCAL:.6,KEBAB:.4,SNAKE:.2,NO_CASE:0};ee.rankings=b;ee.caseRankings=_;function ee(e,a,t){if(t===void 0&&(t={}),!a)return e;var r=t,l=r.keys,u=r.threshold,h=u===void 0?b.MATCHES:u,i=e.reduce(o,[]);return i.sort(xs).map(function(d){var S=d.item;return S});function o(d,S,N){var v=ds(S,l,a,t),A=v.rankedItem,C=v.rank,x=v.keyIndex,E=v.keyThreshold,I=E===void 0?h:E;return C>=I&&d.push({rankedItem:A,item:S,rank:C,index:N,keyIndex:x}),d}}function ds(e,a,t,r){if(!a)return{rankedItem:e,rank:oe(e,t,r),keyIndex:-1,keyThreshold:r.threshold};var l=As(e,a);return l.reduce(function(u,h,i){var o=u.rank,d=u.keyIndex,S=u.keyThreshold,N=h.itemValue,v=h.attributes,A=oe(N,t,r),C=v.minRanking,x=v.maxRanking,E=v.threshold;return A<C&&A>=b.MATCHES?A=C:A>x&&(A=x),A>o&&(o=A,d=i,S=E),{rankedItem:N,rank:o,keyIndex:d,keyThreshold:S}},{rank:b.NO_MATCH,keyIndex:-1,keyThreshold:r.threshold})}function oe(e,a,t){if(e=ie(e,t),a=ie(a,t),a.length>e.length)return b.NO_MATCH;if(e===a)return b.CASE_SENSITIVE_EQUAL;var r=ms(e),l=hs(e,a,r),u=ps(e,a,r);return e=e.toLowerCase(),a=a.toLowerCase(),e===a?b.EQUAL+r:e.indexOf(a)===0?b.STARTS_WITH+r:e.indexOf(" "+a)!==-1?b.WORD_STARTS_WITH+r:l?b.STRING_CASE+r:r>0&&u?b.STRING_CASE_ACRONYM+r:e.indexOf(a)!==-1?b.CONTAINS+r:a.length===1?b.NO_MATCH:us(e).indexOf(a)!==-1?b.ACRONYM+r:gs(e,a)}function us(e){var a="",t=e.split(" ");return t.forEach(function(r){var l=r.split("-");l.forEach(function(u){a+=u.substr(0,1)})}),a}function ms(e){var a=e.toLowerCase()!==e,t=e.indexOf("-")>=0,r=e.indexOf("_")>=0;if(!a&&!r&&t)return _.KEBAB;if(!a&&r&&!t)return _.SNAKE;if(a&&!t&&!r){var l=e[0].toUpperCase()===e[0];return l?_.PASCAL:_.CAMEL}return _.NO_CASE}function hs(e,a,t){var r=e.toLowerCase().indexOf(a.toLowerCase());switch(t){case _.SNAKE:return e[r-1]==="_";case _.KEBAB:return e[r-1]==="-";case _.PASCAL:case _.CAMEL:return r!==-1&&e[r]===e[r].toUpperCase();default:return!1}}function ps(e,a,t){var r=null;switch(t){case _.SNAKE:r="_";break;case _.KEBAB:r="-";break;case _.PASCAL:case _.CAMEL:r=/(?=[A-Z])/;break;default:r=null}var l=e.split(r);return a.toLowerCase().split("").reduce(function(u,h,i){var o=l[i];return u&&o&&o[0].toLowerCase()===h},!0)}function gs(e,a){var t=0,r=0;function l(N,v,A){for(var C=A;C<v.length;C++){var x=v[C];if(x===N)return t+=1,C+1}return-1}function u(N){var v=t/a.length,A=b.MATCHES+v*(1/N);return A}var h=l(a[0],e,0);if(h<0)return b.NO_MATCH;r=h;for(var i=1;i<a.length;i++){var o=a[i];r=l(o,e,r);var d=r>-1;if(!d)return b.NO_MATCH}var S=r-h;return u(S)}function xs(e,a){var t=-1,r=1,l=e.rankedItem,u=e.rank,h=e.keyIndex,i=a.rankedItem,o=a.rank,d=a.keyIndex;return u===o?h===d?String(l).localeCompare(i):h<d?t:r:u>o?t:r}function ie(e,a){var t=a.keepDiacritics;return e=""+e,t||(e=cs(e)),e}function Ns(e,a){typeof a=="object"&&(a=a.key);var t;return typeof a=="function"?t=a(e):a.indexOf(".")!==-1?t=a.split(".").reduce(function(r,l){return r?r[l]:null},e):t=e[a],t!=null?[].concat(t):null}function As(e,a){return a.reduce(function(t,r){var l=Ns(e,r);return l&&l.forEach(function(u){t.push({itemValue:u,attributes:Ss(r)})}),t},[])}function Ss(e){return typeof e=="string"&&(e={key:e}),ke({maxRanking:1/0,minRanking:-1/0},e)}const vs=(e,a)=>{const t=n.getOr(P,"range",e),r=n.getOr(null,"type",e),l=n.getOr(V,"duration",e);return n.filter(u=>l!==V&&!l.includes(u.duration)?!1:u.chartLevel>=t[0]&&u.chartLevel<=t[1]&&(!r||u.chartType.startsWith(r)),a)},Es=(e,a=Q,t)=>{if(e.length===0)return[];const r=performance.now(),l=t.playersHiddenStatus,u=a.showHiddenFromPreferences,h=n.map("value",a.players),i=n.map("value",a.playersOr),o=n.map("value",a.playersNot),d=n.get("value",a.sortingType),S=n.get("value",a.rank)||y.SHOW_ALL,N=[p.PROTAGONIST,p.PP_ASC,p.PP_DESC,p.NEW_SCORES_PLAYER].includes(d)?n.get("value",a.protagonist):null,v=n.map("value",a.excludeAntagonists),A=[n.orderBy([m=>n.max(n.map(g=>u||!l[g.playerId]?g.dateAddedObject.getTime():0,m.results))],["desc"])],C=N?[n.orderBy([m=>n.max(n.map(g=>g.nickname===N?g.dateAddedObject.getTime():0,m.results))],["desc"])]:A,x=[n.filter(m=>n.map("nickname",m.results).includes(N)),n.map(m=>{const g=n.findIndex({nickname:N},m.results),O=m.results[g].score,H=n.flow([n.take(g),n.uniqBy("nickname"),n.remove(f=>v.includes(f.nickname)||f.score===O)])(m.results),D=Math.sqrt(n.reduce((f,M)=>f+(M.score/O-.99)**2,0,H));return{...m,distanceFromProtagonist:D}}),n.orderBy(["distanceFromProtagonist"],["desc"])],E=(m="desc")=>[n.filter(g=>n.map("nickname",g.results).includes(N)),n.orderBy(g=>n.find({nickname:N},g.results).pp||0,m)],I=(m="desc")=>[n.orderBy(g=>g.difficulty??Number(g.chartLevel),m)],X={[p.DEFAULT]:A,[p.NEW_SCORES_PLAYER]:C,[p.PROTAGONIST]:x,[p.PP_ASC]:E("asc"),[p.PP_DESC]:E("desc"),[p.EASIEST_SONGS]:I("asc"),[p.HARDEST_SONGS]:I("desc")}[d]||A,q=n.flow(n.compact([n.map(m=>{let g=null,O=null;const H=[],D=m.results.filter((f,M)=>{const F=!S||S===y.SHOW_ALL?!0:S===y.SHOW_ONLY_RANK?f.isRank:S===y.SHOW_ONLY_NORANK?!f.isRank:S===y.SHOW_BEST?!H.includes(f.playerId):!0;S===y.SHOW_BEST&&H.push(f.playerId);const Y=(!f.isUnknownPlayer||M===0)&&F;return Y&&((!g||g<f.date)&&(g=f.date),(!O||O<f.dateAdded)&&(O=f.dateAdded)),Y},m.results);return{...m,latestScoreDate:g,latestAddedScoreDate:O,results:D,songFullName:`${m.song} ${m.chartType}${m.chartLevel}`}}),a.chartRange&&(m=>vs(a.chartRange,m)),(h.length||i.length||o.length)&&n.filter(m=>{const g=n.map("nickname",m.results);return(!h.length||n.every(O=>g.includes(O),h))&&(!i.length||n.some(O=>g.includes(O),i))&&(!o.length||!n.some(O=>g.includes(O),o))}),n.filter(m=>n.size(m.results)),...X,a.song&&(m=>ee(m,a.song.trim(),{keys:["songFullName"]}))]))(e);return console.log("Sorting took",performance.now()-r,"ms"),q},fs=pe(e=>e.results.data,e=>e.results.filter,e=>e.preferences.data,Es),bs=pe(e=>e.results.data,(e,a)=>a.params.sharedChartId,(e,a)=>e.filter(r=>r.sharedChartId==a).map(r=>({...r,latestScoreDate:n.max(n.map("date",r.results)),latestAddedScoreDate:n.max(n.map("dateAdded",r.results))}))),z=10,ce=n.memoize(e=>[{label:e.NEW_TO_OLD_SCORES,value:p.DEFAULT},{label:e.NEW_TO_OLD_SCORES_OF_A_PLAYER,value:p.NEW_SCORES_PLAYER},{label:e.WORST_TO_BEST_BY_PP,value:p.PP_ASC},{label:e.BEST_TO_WORST_BY_PP,value:p.PP_DESC},{label:e.EASY_TO_HARD_CHARTS,value:p.EASIEST_SONGS},{label:e.HARD_TO_EASY_CHARTS,value:p.HARDEST_SONGS}]),Cs=n.memoize(e=>[{label:e.SHOW_ALL_SCORES,value:y.SHOW_ALL},{label:e.BEST_SCORE,value:y.SHOW_BEST},{label:e.RANK_ONLY,value:y.SHOW_ONLY_RANK},{label:e.ONLY_NO_RANK,value:y.SHOW_ONLY_NORANK}]),Os=()=>{const e=Je(),a=es();return w.useMemo(()=>({isLoading:a.isLoading||e.isLoading,options:!a.data||!e.data?[]:n.flow(n.map(({nickname:t,arcade_name:r,id:l})=>({label:`${t} (${r})`,value:t,isCurrentPlayer:a.data.id===l})),n.sortBy(t=>t.isCurrentPlayer?"!":n.toLower(t.label)))(e.data)}),[e,a])},Ws=()=>{var se;const e=Ie(),a=He(),t=De(),r=!!a.sharedChartId,{options:l,isLoading:u}=Os(),h=U(c=>{var B,K;return(K=(B=c.user.data)==null?void 0:B.player)==null?void 0:K.can_add_results_manually}),i=U(c=>r?bs(c,{params:a}):fs(c)),o=U(c=>c.results.filter),d=r?Q:o,S=U(c=>c.charts.error||c.tracklist.error),N=U(c=>c.charts.isLoading||c.tracklist.isLoading||c.results.isLoading),v=U(c=>c.presets.presets),[A,C]=w.useState(z),x=w.useContext(G),E=n.curry((c,B)=>{const K={...d,[c]:B};e(Me(K)),C(z),re(le.filter,K)}),I=()=>{e(Ge()),re(le.filter,Q)},X=async()=>{C(z),N||(await e(Ve()),e($e()))},q=n.debounce(300,c=>{E("song",c)}),m=()=>s.jsx(G.Consumer,{children:c=>s.jsxs("div",{className:"simple-search",children:[s.jsx("div",{className:"song-name _margin-right _margin-bottom",children:s.jsx(W,{value:d.song||"",placeholder:c.SONG_NAME_PLACEHOLDER,className:"form-control",onChange:q})}),s.jsx("div",{className:"chart-range _margin-right _margin-bottom",children:s.jsx(ss,{filterValue:d.chartRange,onChange:E("chartRange")})}),s.jsx("div",{className:"_flex-fill"}),s.jsxs("div",{className:"_flex-row _margin-bottom",children:[s.jsx(ns,{}),s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon _margin-right",onClick:I,children:[s.jsx(Ye,{})," ",c.RESET_FILTERS]}),s.jsxs("button",{disabled:N,className:"btn btn-sm btn-dark btn-icon",onClick:X,children:[s.jsx(Ke,{})," ",c.REFRESH]})]})]})}),g=()=>s.jsx(G.Consumer,{children:c=>s.jsxs("div",{className:"filters",children:[s.jsxs("div",{className:"people-filters",children:[s.jsx("label",{className:"label",children:c.SHOW_CHARTS_PLAYED_BY}),s.jsxs("div",{className:"players-block",children:[s.jsxs("div",{className:"_margin-right",children:[s.jsx("label",{className:"label",children:c.EACH_OF_THESE}),s.jsx(L,{closeMenuOnSelect:!1,className:"select players",classNamePrefix:"select",placeholder:c.PLAYERS_PLACEHOLDER,isMulti:!0,options:l,isLoading:u,value:n.getOr(null,"players",d),onChange:E("players")})]}),s.jsxs("div",{className:"_margin-right",children:[s.jsx("label",{className:"label",children:c.AND_ANY_OF_THESE}),s.jsx(L,{closeMenuOnSelect:!1,className:"select players",classNamePrefix:"select",placeholder:c.PLAYERS_PLACEHOLDER,isMulti:!0,options:l,isLoading:u,value:n.getOr(null,"playersOr",d),onChange:E("playersOr")})]}),s.jsxs("div",{className:"_margin-right",children:[s.jsx("label",{className:"label",children:c.AND_NONE_OF_THESE}),s.jsx(L,{closeMenuOnSelect:!1,className:"select players",classNamePrefix:"select",placeholder:c.PLAYERS_PLACEHOLDER,isMulti:!0,options:l,isLoading:u,value:n.getOr(null,"playersNot",d),onChange:E("playersNot")})]})]})]}),s.jsx("div",{className:"people-filters",children:s.jsx("div",{className:"players-block",children:s.jsxs("div",{className:"_margin-right",children:[s.jsx("label",{className:"label",children:c.SHOW_RANK}),s.jsx(L,{closeMenuOnSelect:!1,className:"select",classNamePrefix:"select",placeholder:"...",options:Cs(c),value:n.getOr(null,"rank",d)||y.SHOW_ALL,onChange:E("rank")})]})})}),s.jsx("div",{children:s.jsx(qe,{checked:n.getOr(!1,"showHiddenFromPreferences",d),onChange:E("showHiddenFromPreferences"),children:c.SHOW_HIDDEN_PLAYERS})})]})}),O=()=>s.jsxs("div",{className:"sortings",children:[s.jsxs("div",{children:[s.jsx("label",{className:"label",children:x.SORTING_LABEL}),s.jsx(L,{placeholder:x.SORTING_PLACEHOLDER,className:"select",classNamePrefix:"select",isClearable:!1,options:ce(x),value:n.getOr(ce(x)[0],"sortingType",d),onChange:E("sortingType")})]}),[p.PROTAGONIST,p.PP_ASC,p.PP_DESC,p.NEW_SCORES_PLAYER].includes(n.get("sortingType.value",d))&&s.jsxs("div",{children:[s.jsx("label",{className:"label",children:x.PLAYER_LABEL}),s.jsx(L,{className:J("select players",{"red-border":!n.get("protagonist",d)}),classNamePrefix:"select",placeholder:x.PLAYERS_PLACEHOLDER,options:l,isLoading:u,value:n.getOr(null,"protagonist",d),onChange:E("protagonist")})]}),[p.PROTAGONIST].includes(n.get("sortingType.value",d))&&s.jsxs("div",{children:[s.jsx("label",{className:"label",children:x.EXCLUDE_FROM_COMPARISON}),s.jsx(L,{closeMenuOnSelect:!1,className:"select players",classNamePrefix:"select",placeholder:x.PLAYERS_PLACEHOLDER,options:l,isLoading:u,isMulti:!0,value:n.getOr([],"excludeAntagonists",d),onChange:E("excludeAntagonists")})]})]}),H=i.length>A,D=n.get("sortingType.value",d),f=[p.PP_ASC,p.PP_DESC].includes(D),M=[p.PROTAGONIST,p.PP_ASC,p.PP_DESC,p.NEW_SCORES_PLAYER].includes(D),F=(se=d==null?void 0:d.protagonist)==null?void 0:se.value,Y=w.useMemo(()=>n.slice(0,ze.length,n.uniq(n.compact([M&&F,...n.map("value",d.players),...n.map("value",d.playersOr)]))),[d.players,d.playersOr,M,F]),Se=w.useCallback(c=>s.jsx(Qe,{showHiddenPlayers:d.showHiddenFromPreferences,chartIndex:c,showProtagonistPpChange:f,uniqueSelectedNames:Y,protagonistName:F,isChartView:r},i[c].sharedChartId),[d.showHiddenFromPreferences,F,f,Y,i,r]);return s.jsx(Ze.Provider,{value:i,children:s.jsx("div",{className:"leaderboard-page",children:s.jsxs("div",{className:"content",children:[r&&s.jsxs("div",{className:"simple-search",children:[s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon",onClick:()=>t(-1),children:[s.jsx(Fe,{})," ",x.BACK_BUTTON]}),s.jsx("div",{className:"_flex-fill"}),h&&s.jsx(Be,{exact:!0,to:Ue.leaderboard.sharedChart.addResult.getPath(a),children:s.jsxs("button",{className:"btn btn-sm btn-dark btn-icon",children:[s.jsx(we,{})," Add result"]})})]}),!r&&s.jsxs(s.Fragment,{children:[s.jsxs("div",{className:"search-block",children:[m(),s.jsx(Z,{title:x.FILTERS,children:g()}),s.jsx(Z,{title:x.SORTING,children:O()})]}),!!v.length&&s.jsxs("div",{className:"presets-buttons",children:[s.jsxs("span",{children:[x.PRESETS,":"]}),v.map(c=>s.jsx(k,{text:c.name,className:"btn btn-sm btn-dark _margin-right",active:n.get("filter",c)===d,onToggle:()=>{e(me(c)),e(ue())}},c.name))]})]}),s.jsxs("div",{className:"top-list",children:[N&&s.jsx(We,{}),n.isEmpty(i)&&!N&&(S?S.message:x.NO_RESULTS),!N&&Array(A<i.length?A:i.length).fill(()=>{}).map((c,B)=>Se(B)),!N&&H&&s.jsx("button",{className:"btn btn-primary",onClick:()=>C(A+10),children:x.SHOW_MORE})]})]})})})};export{Ws as default};
//# sourceMappingURL=Leaderboard-93d398c0.js.map
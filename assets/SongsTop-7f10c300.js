import{v as u,h as f,j as s,r as d,Q as g,aB as j,an as x,am as m,aJ as L,aK as P,aL as N}from"./index-c9c95ee9.js";import{c as y}from"./index-edda0df8.js";function r({fetchList:e,title:c,renderRightSide:t}){const[l,n]=d.useState([]),[h,o]=d.useState(!1),p=t||(a=>s.jsxs("div",{className:"playcount",children:[s.jsx(j,{}),s.jsx("span",{children:a.countplay})]}));return d.useEffect(()=>{o(!0),e().then(a=>{a.success&&n(a.data),o(!1)}).catch(()=>{o(!1)})},[e]),s.jsxs("div",{className:"top-songs-list",children:[s.jsx("div",{className:"top-songs-header",children:s.jsx("span",{children:c})}),h&&s.jsx(g,{}),!h&&l.map((a,i)=>s.jsxs("div",{className:"top-songs-item",children:[s.jsx("div",{className:y("place",`top-${i+1}`,{best:i<3}),children:s.jsxs("span",{children:[i+1,"."]})}),s.jsx("div",{className:"song-name",children:a.full_name}),p(a)]},a.id))]})}function T(e){return t=>s.jsx("div",{className:"date",children:s.jsx("span",{children:t.last_play?x(e,m(t.last_play)):e.NEVER})})}const R=u(null,{fetchMostPlayed:L,fetchMostPlayedMonth:P,fetchLeastPlayed:N})(function({fetchMostPlayed:c,fetchMostPlayedMonth:t,fetchLeastPlayed:l}){const n=f();return s.jsxs("div",{className:"songs-top-page",children:[s.jsx(r,{fetchList:c,title:n.TOP_POPULAR_TRACKS}),s.jsx(r,{fetchList:t,title:n.MONTHLY_TOP_POPULAR_TRACKS}),s.jsx(r,{fetchList:l,title:n.TRACKS_PLAYED_LONG_TIME_AGO,renderRightSide:T(n)}),s.jsx("div",{className:"top-songs-list -placeholder"})]})});export{R as default};
//# sourceMappingURL=SongsTop-7f10c300.js.map
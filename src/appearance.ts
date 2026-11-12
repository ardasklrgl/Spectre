export type Appearance={toolbar:boolean;size:number};
export function readAppearance():Appearance{try{const p=JSON.parse(localStorage.getItem('study-appearance')||'{}');return {toolbar:p.toolbar!==false,size:[13,14,16].includes(p.size)?p.size:14}}catch{return {toolbar:true,size:14}}}
export function saveAppearance(p:Appearance){localStorage.setItem('study-appearance',JSON.stringify(p))}

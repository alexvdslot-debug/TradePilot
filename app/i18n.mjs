const dictionaries={nl:new Map(),en:new Map()},literalTranslations=new Map();
let locale='nl-NL';
const interpolate=(text,values)=>String(text).replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??''));
export function registerTranslations(namespace,nl,en){
 for(const [key,value] of Object.entries(nl)){const qualified=namespace+'.'+key;dictionaries.nl.set(qualified,value);dictionaries.en.set(qualified,en[key]??value);literalTranslations.set(value,en[key]??value);}
}
export function setLocale(value){locale=value==='en-US'?'en-US':'nl-NL';if(typeof document!=='undefined')document.documentElement.lang=locale==='en-US'?'en':'nl';}
export const getLocale=()=>locale;
export function t(key,values={}){return interpolate((locale==='en-US'?dictionaries.en:dictionaries.nl).get(key)??dictionaries.nl.get(key)??key,values);}
export function translate(text,values={}){return dictionaries.nl.has(text)?t(text,values):interpolate(locale==='en-US'?(literalTranslations.get(text)??text):text,values);}
export function formatCurrency(value,currency='EUR',options={}){const number=Number(value);return Number.isFinite(number)?new Intl.NumberFormat(locale,{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2,...options}).format(number):'—';}
export function translateElement(root){root.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n)});}

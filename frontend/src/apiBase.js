export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||            
  process.env.REACT_APP_API_BASE ||              
  (typeof importMeta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) || 
  "http://localhost:8000";                      

export function withApiBase(url) {
  if (typeof url !== "string") return url;
  return url.replace(/^http:\/\/localhost:8000/i, API_BASE);
}

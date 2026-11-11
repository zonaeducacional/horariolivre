/** Pick the better WCAG contrast against an sRGB background (small text: >= 4.5:1). */
export function corTexto(background:string):'#000000'|'#ffffff' {
  if(!/^#[\da-f]{6}$/i.test(background))return '#000000';
  const rgb=[1,3,5].map(i=>parseInt(background.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  const luminance=0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
  return (luminance+0.05)/0.05>=1.05/(luminance+0.05)?'#000000':'#ffffff';
}

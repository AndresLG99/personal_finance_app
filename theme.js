// Tema (claro/oscuro/sistema por default) y color de acentuación configurable (punto 5).
//
// El CÁLCULO real de color (derivar --accent-ink/-soft/-dark/-hover/-border/-shadow/
// -tint-weak a partir de un solo color base) vive en window.__theme, definido en un
// <script> normal al inicio de <head> en index.html, ANTES de las hojas de estilo —
// un módulo como este se ejecuta después de que el HTML ya se parseó, demasiado tarde
// para aplicar el tema guardado sin parpadeo (un instante en el color por default antes
// de saltar al guardado). Aquí solo se agrega la PERSISTENCIA (localStorage) y se llama a
// esa misma función para no mantener la fórmula de color duplicada en dos lugares: si se
// cambia una, hay que cambiar la otra (ver ese <script> en index.html).
//
// "Sistema" (default) no guarda nada: sin anda en localStorage, data-theme no se fija y
// los media queries (prefers-color-scheme) en styles.css deciden, incluso si el sistema
// cambia mientras la app está abierta (sin recargar). "Claro"/"Oscuro" fijan data-theme
// explícitamente, por encima del sistema.
const MODE_KEY='theme:mode',ACCENT_KEY='theme:accent';

export const DEFAULT_ACCENT=(typeof window!=='undefined'&&window.__theme?.DEFAULT_ACCENT)||'#FF7A4A';

export function getThemeMode(){
  try{const m=localStorage.getItem(MODE_KEY);return m==='light'||m==='dark'?m:'system';}catch{return 'system';}
}
export function getAccent(){
  try{const a=localStorage.getItem(ACCENT_KEY);return a&&/^#[0-9a-fA-F]{6}$/.test(a)?a:DEFAULT_ACCENT;}catch{return DEFAULT_ACCENT;}
}
export function setThemeMode(mode){
  window.__theme?.setMode(mode);
  try{if(mode==='light'||mode==='dark')localStorage.setItem(MODE_KEY,mode);else localStorage.removeItem(MODE_KEY);}catch{}
}
export function setAccent(hex){
  if(!/^#[0-9a-fA-F]{6}$/.test(hex))return;
  window.__theme?.applyAccent(hex);
  try{localStorage.setItem(ACCENT_KEY,hex);}catch{}
}
export function resetAccent(){
  window.__theme?.applyAccent(DEFAULT_ACCENT);
  try{localStorage.removeItem(ACCENT_KEY);}catch{}
}
// Re-aplica lo guardado (por si window.__theme no llegó a correr a tiempo, p. ej. en una
// prueba automatizada que inyecta el DOM sin pasar por el <script> de index.html).
export function initTheme(){
  setThemeMode(getThemeMode());
  window.__theme?.applyAccent(getAccent());
}

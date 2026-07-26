export const THEME_STORAGE_KEY = 'postit_theme';

/**
 * Applies the saved (or system) theme to <html> before first paint.
 *
 * Rendered as an inline script from the server layout, where a <script> is
 * legitimate and actually executes. next-themes rendered its equivalent from
 * inside a client component, which React 19 warns about ("Scripts inside React
 * components are never executed when rendering on the client").
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d);
}catch(e){}})();`;

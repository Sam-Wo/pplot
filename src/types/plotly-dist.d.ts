// `plotly.js-dist-min` ships no types of its own. It is the same runtime API as
// `plotly.js`, so we re-export the community @types/plotly.js typings for it.
declare module 'plotly.js-dist-min' {
  import Plotly from 'plotly.js';
  export = Plotly;
}

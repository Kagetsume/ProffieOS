const path = require('path');

/** md-to-pdf config. Run from the repo root:
 *  npx md-to-pdf examples/config-layers-color-card.md --config-file examples/config-layers-color-card.config.js
 */
module.exports = {
  stylesheet: [path.join(__dirname, 'config-layers-color-card.css')],
  highlight_style: 'github',
  marked_options: {
    gfm: true,
  },
  pdf_options: {
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: false,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%; font-size:8px; font-family: Segoe UI, Helvetica, Arial, sans-serif; color:#5c6570; text-align:center;"><span class="pageNumber"></span></div>',
    margin: {
      top: '0.5in',
      right: '0.55in',
      bottom: '0.6in',
      left: '0.55in',
    },
  },
};

/**
 * PostCSS plugin to remove problematic vendor prefixes that cause CSS parsing errors
 */
module.exports = (opts = {}) => {
  return {
    postcssPlugin: 'remove-vendor-prefixes',
    Once(root, { result }) {
      // Log plugin execution for debugging
      console.log('PostCSS remove-vendor-prefixes plugin executing...');
    },
    Declaration: {
      '-webkit-text-size-adjust': (decl) => {
        console.log('Removing -webkit-text-size-adjust:', decl.value);
        decl.remove();
      },
      '-ms-text-size-adjust': (decl) => {
        console.log('Removing -ms-text-size-adjust:', decl.value);
        decl.remove();
      },
      '-moz-text-size-adjust': (decl) => {
        console.log('Removing -moz-text-size-adjust:', decl.value);
        decl.remove();
      }
    },
    DeclarationExit(decl) {
      // Catch any remaining instances
      const problematicProps = [
        '-webkit-text-size-adjust',
        '-ms-text-size-adjust',
        '-moz-text-size-adjust'
      ];
      
      if (problematicProps.includes(decl.prop)) {
        console.log('DeclarationExit: Removing', decl.prop, ':', decl.value);
        decl.remove();
      }
    },
    Rule(rule) {
      // Remove rules with invalid pseudo-selectors that cause parsing errors
      const problematicSelectors = [
        ':host:not(button)', // Should be :host(:not(button))
        ':-moz-focus-inner',
        '::global'
      ];
      
      problematicSelectors.forEach(selector => {
        if (rule.selector && rule.selector.includes(selector)) {
          console.log('Removing problematic rule selector:', rule.selector);
          rule.remove();
        }
      });
    }
  }
}

module.exports.postcss = true;
export default {
  input: 'src/hiMarc.js',
  output: [
    {
      file: 'lib/bundle-node.js',
      format: 'cjs'
    },
    {
      file: 'lib/bundle-browser.js',
      format: 'iife',
      name: 'mrkToObject'
    }
  ]
};

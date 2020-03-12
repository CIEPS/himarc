export default {
  input: 'src/himarc.js',
  output: [
    {
      file: 'lib/bundle-node.js',
      format: 'cjs'
    },
    {
      file: 'lib/bundle-browser.js',
      format: 'iife',
      name: 'himarc'
    }
  ]
};

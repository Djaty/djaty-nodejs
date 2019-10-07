# Djaty NodeJS SDK

## Installation
`$ npm install @djaty/djaty-nodejs`

## Usage
- [Official NodeJS SDK Docs](https://djaty.com/docs/SDKs/nodeJs/index.html)

## Quick Start
You can start using Djaty NodeJS SDK with [the default configuration](https://djaty.com/docs/SDKs/nodeJs/configuring.html#so-the-default-trackingoptions-are)
by just including it at the root app file and passing the `apiKey` and `apiSecret`
attributes as the following example:

```javascript
const djaty = require('@djaty/djaty-nodejs');

djaty.init({
  apiKey: 'API_KEY',
  apiSecret: 'API_SECRET'
});
```

To use the NodeJS SDK inside Express and Koa based applications, please take a look at [Official NodeJS SDK Docs](https://djaty.com/docs/SDKs/nodeJs/index.html)

## Development
### Install dependencies
`$ npm install`

### Build
`$ npm run build`

### Run tests
`$ npm run test`

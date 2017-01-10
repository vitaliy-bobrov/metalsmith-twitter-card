# metalsmith-twitter-card

  A Metalsmith plugin that adds [Twitter Card](https://dev.twitter.com/cards/overview) meta tags to enable Twitter share rich snippets.
  Plugin supports all twitter card types and validates file metadata to have all required properties.

## Installation

    $ npm install --save-dev metalsmith-twitter-card

## Usage

Place `metalsmith-twitter-card` plugin after html files generation, for example after `metalsmith-layouts`.

```js
const Metalsmith  = require('metalsmith');
const twitterCard = require('metalsmith-twitter-card');

Metalsmith(__dirname)
  .use(twitterCard({
    siteurl: 'my-site.com'
  }));
```

  To enable twitter tags generation add `twitter` to frontmatter with required sub-properties. Or you can just set `twitter: true` to use default defined in plugin options.
  Properties cound be just a string value, css selector (only class and id supported), or metadata property name.
    Example:

  ```yaml
  ---
  title: Hello World
  description: My pretty description.
  twitter:
    card: summary            // Sets card type to `summary`
    site: '@myaccount'       // Sets twitter account to `@myaccount`
    title: '#page-title'     // Will look for element with id `page-title`
                             // and take its text content as twitter card title.
    description: description // Will look for a description property in file frontmatter,
                             // if nothing founded in it, will look for this property in plugin options.
  ---
  ```

  To disable twitter tags generation for particular file just ommit `twitter` property in frontmatter.

## Options

You can pass any twitter card properties to plugin to set default values. If file contain properties, it will use properties from file, override defaults.
Example:

```js
const Metalsmith  = require('metalsmith');
const twitterCard = require('metalsmith-twitter-card');

Metalsmith(__dirname)
  .use(twitterCard({
    siteurl: 'my-site.com',
    card: 'summary_large_image', // Sets default card type.
    site: '@myaccount',          // Sets default twitter username.
    title: 'title',              // By default will use title property from file metadata as twitter card title.
    description: 'description'   // By default will use description property
                                 // from file metadata as twitter card description.
  }));
```

In file you can override defaults, for example:

 ```yaml
  ---
  title: Hello World
  description: My pretty description.
  twitter:
    card: summary            // Will override default card type `summary_large_image` with `summary`
    site: '@another-account' // Will override default twitter account `@myaccount` with `@another-account`
  ---
  ```

### siteurl - **Required**
  Type: String

  Default: ''

  Your site url, used to generate absolute path for images.

#### CLI

  You can also use the plugin with the Metalsmith CLI by adding a key to your `metalsmith.json` file:

```json
{
  "plugins": {
    "metalsmith-twitter-card": {
      "siteurl": "my-site.com"
    }
  }
}
```

## License

  MIT

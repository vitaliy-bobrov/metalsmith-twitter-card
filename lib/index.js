const debug = require('debug')('metalsmith-twitter-card');
const url = require('url');
const extname = require('path').extname;
const escape = require('escape-html');
const cheerio = require('cheerio');

// List of available card types, see https://dev.twitter.com/cards/getting-started
// with required and allowed properties.
const CARD_PROPS = {
  summary: {
    required: ['card', 'site', 'title', 'description'],
    allowed: ['image', 'image:alt', 'creator']
  },
  'summary_large_image': {
    required: ['card', 'site', 'title', 'description'],
    allowed: ['image', 'image:alt', 'creator']
  },
  app: {
    required: ['card', 'site', 'description', 'app:id:iphone', 'app:id:ipad', 'app:id:googleplay'],
    allowed: ['creator', 'app:url:iphone', 'app:url:ipad', 'app:url:googleplay', 'app:country']
  },
  player: {
    required: ['card', 'site', 'title', 'player', 'player:width', 'player:height', 'image'],
    allowed: ['creator', 'description', 'image:alt', 'player:stream', 'player:stream:content_type']
  }
};

// Properties that need absolute url.
const PROPS_WITH_PATH = ['image'];

/**
 * Merges user options with defaults.
 * @param  {Object} options - plugin options.
 * @return {Object}
 */
const normalize = options => {
  if (!options.siteurl) {
    throw new Error('siteurl is required option for twitter card');
  }

  options.card = options.card && CARD_PROPS.hasOwnProperty(options.card) ? options.card : 'summary';

  return options;
};

/**
 * Checks whether a file is an HTML file.
 * @param {String} - path
 * @return {Boolean}
 */
const html = path => /\.html/.test(extname(path));

/**
 * Checks twitter metadata is present.
 * @param  {Object} meta - file metadata.
 * @return {Boolean}
 */
const checkMetadata = meta => {
  if (!meta.twitter || (typeof meta.twitter !== 'object' && typeof meta.twitter !== 'boolean')) {
    return false;
  }

  return true;
};

/**
 * Validates twitter username
 * @param  {String} username - twitter username.
 * @return {Boolean}
 */
const validUsername = username => username[0] === '@';

/**
 * Validates card data.
 * @param  {Object} meta - twitter card metadata.
 * @return {undefined}
 */
const validateMetadata = meta => {
  if (!CARD_PROPS.hasOwnProperty(meta.card)) {
    throw new Error(`${meta.card} is not valid twitter card type`);
  }

  let required = CARD_PROPS[meta.card].required;
  let allowed = required.concat(CARD_PROPS[meta.card].allowed);

  required.forEach(prop => {
    if (!meta[prop]) {
      throw new Error(`${prop} is required for ${meta.card} twitter card type`);
    }
  });

  for (let prop in meta) {
    // Remove disallowed data.
    if (!allowed.includes(prop)) {
      delete meta[prop];
    }

    switch (prop) {
      case 'site':
      case 'creator':
        if (!validUsername(meta[prop])) {
          meta[prop] = `@${meta[prop]}`;
        }

        break;

      default:
        break;
    }
  }
};

/**
 * Creates meta tag markup.
 * @param  {String} prop    - twitter card property.
 * @param  {String} content - property value.
 * @return {String}
 */
const createTag = (prop, value) => `<meta name="twitter:${prop}" content="${value}" />`;

/**
 * Checks for allowed CSS selector
 * @param  {String} value - value to check
 * @return {Boolean}
 */
const isSelector = value => /^[#,.]{1}[A-Za-z][0-9A-Za-z\-\._:]*$/.test(value);

// Variables to create function.
let isProperty;
let absolutePath;

/**
 * Prepares meta tag contents.
 * @param  {String} value    - metadata value.
 * @param  {Object} $cheerio - cheerio page object.
 * @param  {Boolean} path    - is property need absolute path.
 * @return {String}
 */
const prepareContent = (value, $cheerio, path) => {
  let content = '';

  debug('prepare meta tag content: %s', value);

  if(isSelector(value)) {
    let el = $cheerio(value);

    if ($cheerio(el).eq(0).attr('src')) {
      content = $cheerio(el).eq(0).attr('src');
    } else {
      content = $cheerio(el).eq(0).text();
    }
  } else if(isProperty(value)) {
    content = escape(isProperty(value));
  } else {
    content = escape(value);
  }

  if (path) {
    content = absolutePath(content);
  }

  return content;
};

/**
 * Inserts meta tags to document head.
 * @param  {Object} contents - file contents.
 * @param  {Object} meta     - twitter card metadata.
 * @return {String}
 */
const insertTags = (contents, meta) => {
  let $ = cheerio.load(contents, {decodeEntities: false});
  let markup = '';
  let value;

  for (let prop in meta) {
    value = prepareContent(meta[prop], $, PROPS_WITH_PATH.includes(prop));
    if (value) {
      markup += createTag(prop, value);
    } else {
      throw new Error(`Provided ${prop} is not valid or not present`);
    }
  }

  $('head').append(markup);

  return $.html();
};

/**
 * Metalsmith plugin to add Twitter card meta tags.
 * @param  {Object} options - plugin options.
 * @return {Function}
 */
const plugin = options => {
  options = normalize(options);
  const siteurl = options.siteurl;
  /**
   * Resolves absolute path.
   * @param  {String} path - resource path.
   * @return {String}
   */
  absolutePath = path => url.resolve(siteurl, path);

  delete options.siteurl;

  return (files, metalsmith, done) => {
    try {
      Object.keys(files).forEach(file => {
        let data = files[file];
        debug('checking file: %s', file);

        if (!html(file) || !checkMetadata(data)) return;

        let tags = Object.assign({}, options, data.twitter);

        isProperty = value => {
          let result = data.hasOwnProperty(value) ? data[value] : false;

          if (!result) {
            result = options.hasOwnProperty(value) ? options[value] : false;
          }

          return result;
        };

        validateMetadata(tags);

        debug('inserting meta tags to file contents: %O', tags);

        data.contents = new Buffer(insertTags(data.contents, tags));
      });

      done();
    }
    catch(err) {
      done(err);
    }
  };
};

module.exports = plugin;

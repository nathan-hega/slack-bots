var request   = require('request');
var _         = require('lodash');
var async     = require('async');
var cheerio   = require('cheerio');
var helpers = require('../lib/helpers');
var nconf     = require('nconf');

module.exports = function (req, res, next) {
  var slackError = helpers.slackError(res);

  var slackToken = nconf.get("SLACK_DEFINEBOT_TOKEN");

  async.waterfall([
    configure,
    requestDefinition,
    parseData,
    formatData,
    finalize
    ], function (error, results) {
      // Return a formatted error attachment.
      if (error) {
        slackError(error);
      } 
      return next();
    });

  function configure (callback) {
    // Prepare our 'res.bot' which will contain the Slack formatted data once execution completes.
    res.bot = {
      username: 'definebot',
      response_type: 'in_channel'
    };

    // Make sure we have a word to define.
    if (!req.body.text) {
      return callback('Please provide a word to define (`req.body.text`)');
    }

    // A token is generated with each Slack app. The token can be used to verify
    // the request is coming from Slack.
    // Reference: https://api.slack.com/slash-commands (Validating the Command)
    if (slackToken && slackToken !== req.body.token) {
      return callback('The Slack token received is invalid.');
    }

    return callback(null);
  }

  function requestDefinition (callback) {
    request({
      uri: 'https://www.merriam-webster.com/dictionary/' + req.body.text
    }, function (error, response, body) {
      if (error) {
        callback(error);
      } else {
        // Load the HTML into cheerio for later parsing.
        $ = cheerio.load(body);
      }

      return callback(null, $);
    });
  }

  function parseData ($, callback) {
    var data = {};

    // The query is not guaranteed to be the name of the word - e.g. autocorrections.
    // Expose this to the user by scraping the 'word' from the HTML rather than using 'req.body.text'.
    data.word = $('.word-and-pronunciation h1').text() || null;
    data.title = $('title').text() || null;
    data.type = $('.word-attributes .main-attr em').first().text() || null;
    data.syllables = $('.word-syllables').first().cleanText() || null;
    // Remove some misc. slashes.
    data.pronunciation = $('span.pr').first().cleanText().replace(/\\/g,'') || null;

    data.definitions = _.map($('.definition-list').first().find('p.definition-inner-item > span'), function (definition) {
      var $definition = $(definition);
      $definition.children(':not(a)').remove();
      var text = $definition.cleanText();
      if (text) {
        return text;
      } else {
        return null;
      }
    });

    // Compact the array in case some nulls snuck in there.
    data.definitions = _.compact(data.definitions);

    // Example sentences.
    data.example = $('.examples-box ol.definition-list li').first().text();

    return callback(null, data); 
  }

  // Format the data output to adhere to Slack guidelines.
  // https://api.slack.com/docs/messages
  function formatData (data, callback) {
    if (data.definitions.length) {
      // Stringify the definitions.
      var definitions = '';
      _.each(data.definitions, function (definition) {
        definitions += "* " + definition + " \n ";
      });

      var attachment = {
        "fallback": definitions,
        "text": data.title,
        "fields": [
          {
            "title": "Word",
            "value": data.word,
            "short": true
          },
          {
            "title": "Type",
            "value": data.type,
            "short": true
          },
          {
            "title": "Pronunciation",
            "value": data.pronunciation,
            "short": true
          },
          {
            "title": "Syllables",
            "value": data.syllables,
            "short": true
          },
          {
            "title": "Definition(s)",
            "value": definitions,
            "short": false
          }
        ],
        "color": "#551A8B"
      };

      return callback(null, attachment);
    } else {
      return callback("Unable to find definition for: *" + req.body.text + "*", null);
    }
  }

  // Finalize the response by appending 'attachments' to the payload.
  function finalize (attachment, callback) {
    res.bot.attachments = [attachment];
    return callback(null, null);
  }
};

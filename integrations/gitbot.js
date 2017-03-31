var request   = require('request');
var _         = require('lodash');
var async     = require('async');
var moment    = require('moment');
var nconf     = require('nconf');
var helpers = require('../lib/helpers');

module.exports = function (req, res, next) {
  // These should be set as environment variables
  var githubUsername = nconf.get("GITHUB_USERNAME");
  var githubToken = nconf.get("GITHUB_TOKEN");
  var slackToken = nconf.get("SLACK_GITBOT_TOKEN");

  var slackError = helpers.slackError(res);

  var teams = nconf.get('gitbot:teams');
  var orginization = nconf.get('gitbot:orginization');
  var colors = nconf.get('gitbot:colors');

  var headers = {
    'User-Agent'    : githubUsername,
    'Authorization' : 'token ' + githubToken
  };

  var members = null;
  var team = null;
  var repositories = [];
  var requests = [];
  var responses = [];
  var attachments = [];

  async.series([
    configure,
    repositoryFetch,
    requestFactory,
    executeRequests,
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
      username: 'gitbot',
      response_type: 'in_channel'
    };

    // Check for github credentials during gitbot execution.
    // This allows the server to run without necessarily having to configure gitbot
    // (i.e. allows users to utilize the code for definebot and/or other bots without configuring gitbot).
    if((!githubToken) || (!githubUsername)) {
      return callback('Please set GITHUB_TOKEN and GITHUB_USERNAME as environment variables.');
    }

    // Throw an error if no team is specified.
    var teamIds = _.keys(teams || {});
    if (!(_.contains(teamIds, req.body.text))) {
      return callback('Please supply a valid team name e.g. `/gitbot team-alpha`');
    }

    // A token is generated with each Slack app. The token can be used to verify
    // the request is coming from Slack.
    // Reference: https://api.slack.com/slash-commands (Validating the Command)
    if (slackToken && slackToken !== req.body.token) {
      return callback('The Slack token received is invalid.');
    }


    // Set some global variables for the rest of the script.
    team = teams[req.body.text];
    members = team.members;

    return callback(null, null);
  }

  function repositoryFetch (callback) {
    // If 'repositories' is not set in config, use the Github API to fetch them.
    // The team 'repositories' key takes precedence over the global 'repositories' key,
    // see README.md for more details.
    if (team.repositories && team.repositories.length) {
      repositories = team.repositories;
    } else {
      repositories = nconf.get('gitbot:repositories');
    }

    if (repositories && !repositories.length) {
      request({
        uri : orginization + 'repos',
        json : true,
        headers : headers
      }, function (error, response, body) {
        if (error) {
          return callback('Unable to fetch repositories from the Github API.');
        }
        
        _.each(body, function (repository) {
          if (repository.name) {
            repositories.push(repository.name);
          }
        });
        
        if (!repositories.length) {
          return callback('Unable to parse repositories from the Github API response.'); 
        } else {
          return callback(null, null);
        }
      });
    } else {
      return callback(null, null);
    }
  }

  // Create the request functions to run in parallel.
  function requestFactory (callback) {
    _.each(repositories, function (repository) {
      // Push a new function in the requests array to run in parallel later.
      requests.push(function (callback) {

        // Replace 'orgs' with 'repos' to form the proper pull request API URL.
        var uri = orginization.replace('orgs', 'repos') + repository + '/pulls';

        request({
          uri : uri,
          json : true,
          headers : headers
        // These callbacks will parse the responses and pull out the data we need.
        }, function (error, response, body) {
          var apiResponse = {
            repository: repository,
            pullRequests: [],
            error: null
          };

          // We don't want to halt execution because an API call failed. Instead, let's stash the error in apiResponse and handle it later.
          if (error) {
            apiResponse.error = error;
          } else {
            _.each(body, function (pullRequest) {
              // Make sure the author of the PR is part of the requesting team.
              var inTeam = (pullRequest.user) ? _.contains(members, pullRequest.user.login) : false;

              if (inTeam) {
                // Determine the age of the PR.
                var created = moment(pullRequest.created_at);
                var now = moment();
                var age = now.diff(created, 'days');

                // Determine the color of the attachment based on the age of the PR.
                var color = null;
                if (colors) {
                  var normal = colors.normal;
                  var warning = colors.warning;
                  var danger = colors.danger;

                  if (age >= normal.range[0] && age <= normal.range[1]) {
                    color = normal.color;
                  } else if (age >= warning.range[0] && age <= warning.range[1]) {
                    color = warning.color;
                  } else if (age >= danger.range[0]) {
                    color = danger.color;
                  }
                }

                apiResponse.pullRequests.push({
                  author: pullRequest.user.login,
                  title: pullRequest.title.length > 75 ? pullRequest.title.substr(0,72) + '...' : pullRequest.title,
                  link: pullRequest.html_url,
                  age: age,
                  assignee: pullRequest.assignee ? pullRequest.assignee.login : 'Unassigned',
                  branch: pullRequest.base.ref,
                  color: color
                });
              }
            });
          }
          return callback(null, apiResponse);
        });
      });
    });

    return callback(null, null);
  }

  // Execute requests we created in 'requestFactory'.
  function executeRequests (callback) {
    async.parallel(requests, function (error, results) {
      // stash these for formatting
      responses = results;
      return callback(null, null);
    });
  }

  // Format the data output to adhere to Slack guidelines.
  // https://api.slack.com/docs/messages
  function formatData (callback) {
    // Create statistics object - populated below as we iterate through and format all the PR data.
    var statistics = {
      repositoryBreakdown: {},
      totalAge: 0,
      prCount: 0,
      averageAge: 0
    }
    
    _.each(responses, function (repository, index) {
      var repositoryName = repository.repository;

      if (!repository.error) {
        // Format each pull request as a separate attachment.
        _.each(repository.pullRequests, function (pullRequest) {

          // Aggregate some data for the statistics attachment.
          if (statistics.repositoryBreakdown[repositoryName]) {
            statistics.repositoryBreakdown[repositoryName]++;
          } else {
            statistics.repositoryBreakdown[repositoryName] = 1;
          }

          statistics.prCount++;
          statistics.totalAge += parseInt(pullRequest.age);

          var attachment = {
            "fallback": "<" + pullRequest.link + "|" + pullRequest.title + ">",
            "text": "<" + pullRequest.link + "|" + pullRequest.title + ">",
            "fields": [
              {
                "title": "Author",
                "value": pullRequest.author,
                "short": true
              },
              {
                "title": "Age (days)",
                "value": pullRequest.age,
                "short": true
              },
              {
                "title": "Assignee",
                "value": pullRequest.assignee,
                "short": true
              },
              {
                "title": "Branch",
                "value": pullRequest.branch,
                "short": true
              },
              {
                "title": "Repository",
                "value": repositoryName,
                "short": true
              }
            ],
            "color": pullRequest.color
          };

          attachments.push(attachment);
        })
      }
    });

    // Sort the formatted pull requests by age.
    // !IMPORTANT! If you edit the order of 'fields', be sure to update the sort function below accordingly.
    // I don't like having to hard code the array index to the proper field for sorting; however, 
    // Slack's formatting rules limit my options significantly.
    attachments = _.sortBy(attachments, function (o) {
      return o.fields[1].value;
    });

    statistics.averageAge = parseInt(statistics.totalAge / statistics.prCount);

    // Create a formatted string version of the repository breakdown.
    var formattedRepositoryBreakdown = '';
    _.each(statistics.repositoryBreakdown, function (repositoryCount, repositoryName) {
      formattedRepositoryBreakdown += "repository: <http://github.com/brandingbrand/" + repositoryName + "|" + repositoryName + "> ---- count: "+ repositoryCount +"\n";
    });

    // Create the statistics attachment and insert it at the front of the attachments array.
    var statisticsAttachment = {
      "fallback": "Repository Statistics",
      "text": "Repository Statistics",
      "fields": [
        {
          "title": "Total PRs",
          "value": statistics.prCount,
          "short": true
        },
        {
          "title": "Average Age (days)",
          "value": statistics.averageAge,
          "short": true
        },
        {
          "title": "Repository Breakdown",
          "value": formattedRepositoryBreakdown,
          "short": false
        }
      ],
      "color": "#551A8B"
    }

    attachments.unshift(statisticsAttachment);

    return callback(null, null);
  }

  // Finalize the response by appending 'attachments' to the payload
  function finalize (callback) {
    res.bot.attachments = attachments;
    return callback(null, null);
  }
};

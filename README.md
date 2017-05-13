- [Gitbot](#gitbot)
- [Definebot](#definebot)
- [Testing](#test) 


Slack Bots
======
A Node.js / Express server that integrates with [Slack slash commands](https://api.slack.com/slash-commands). Currently supported integrations:
- Gitbot
- Definebot

*Please note that this codebase was started years ago and only recently updated to expand the functionality. It is based on a "legacy custom integration" rather than the new "Slack app".*


From the Slack website:
> You're viewing documentation on legacy custom integrations, an older way for teams to build into their Slack team. To securely utilize the newest platform features like message buttons & the Events API, build internal integrations as part of a Slack app just for your team instead. Get started.

For those not familiar with Slack or slash commands, here is the basic premise of Slack slash commands:
1. Configure a slash command in Slack
2. When executing the slash command in Slack, Slack will POST data regarding the command to the URL you have specified / configured
3. Your server will respond to that POST accordingly with formatted data depending on what the command was and what your server supports.

The goal of this project is to give developers a good starting point for slash commands. **By forking this, you automatically get a server that responds to Slack slash commands for definebot (for more information, read below). With minimal configuration updates, your server can also provide a response to gitbot (for more information and configuration instructions, read below).**

<a name="gitbot"></a>
## Gitbot
Configure this bot to retrieve pull requests on demand via Slack. Issuing a 'slash command' (e.g. `/gitbot team-alpha`) in Slack will result in a formatted response from this server containing information regarding the specified team's pull requests. Here is the information the server returns:
- Statistical overview of the teams' pull requests 
  - Total PRs, average age of all PRs (days), and a mapping of each reposotiry with the current # of open pull requests
- For each pull request: 
  - Author, age (days), assignee, branch, and repository data
  - Each pull request panel is color coded to denote the age of the PR. 
  - The list of PRs is sorted by age.

![screen shot 2017-03-31 at 3 56 23 pm](https://cloud.githubusercontent.com/assets/2591298/24568231/2a000746-162f-11e7-8ca0-50b7faace966.png)
![screen shot 2017-03-31 at 3 57 16 pm](https://cloud.githubusercontent.com/assets/2591298/24568230/2a0003fe-162f-11e7-9204-cd7574234540.png)

### Configuration
`orginization` - Represents the github API URL that the server will use to fetch pull requests data from. For orginizations, the URL follows this pattern: **https://api.github.com/orgs/ORGINIZATION-NAME/**

`teams` - each team has three components: a string identifier, an array of team members, and an optional array of repositories.

*Note: The 'repositories' key inside of the team configuration object takes precedence over the global 'repositories' configuration key.*

```
"teams": {
  "team-alpha": {
    "repositories": [
    ],
    "members": [
      "nathan-hega",
      "example_username2",
      "example_username3"
    ]
  },
  "team-bravo": {
    "repositories": [
      "repository-three"
    ],
    "members": [
      "nathan-hega"
    ]
  }
},

// /gitbot team-alpha 
// should return pull requests for the 'team-alpha' team

// /gitbot team-bravo
// should return pull requests for the 'team-bravo' team - only 'repository-three' will be queried for pull requests

// /gitbot
// should return an error - team idenfitifer is required

// /gitbot team-zeta
// should return an error - "team-zeta" is not defined in the configuration example above
```

`repositories` - If this array is populated with repository names, gitbot will only fetch pull requests from the list of defined repositories. If this key is not set, the bot will automatically use the github api to fetch a list of repositories found within the specified orginization and use those repositories to query for pull request data. A good example of when to use the 'repositories' key is if you have many repositories in your orginization but only a handful are relevant to your gitbot integration.

#### Example Configuration
1. Fork repository
2. Update config.json with your orginization specific data and set environment variables
3. Make sure the server works as expected locally (see 'Testing' section below for how to test this locally)
4. If the server works locally, configure it on a server that Slack can POST to
5. Configure the slash command in Slack as a 'legacy custom integration'
   * https://api.slack.com/slash-commands
   * https://api.slack.com/custom-integrations
6. Assuming everything is configured correctly, your server should be working as expected.
   * If you want to validate requests via a Slack token, be sure to add that environment variable after you configure the integration through Slack.


### Environment Variables

| Variable | Required |                                                                     Notes                                                                    |
|:--------|:--------|:--------------------------------------------------------------------------------------------------------------------------------------------|
|   GITHUB_TOKEN   |     Y    | Github API key for the bot to use|
|   GITHUB_USERNAME   |     Y    | Github username for the bot to use |
|   SLACK_GITBOT_TOKEN   |     N    |  Slack token generated when you configure the slash command. If you set this to an environment variable, the code will automatically validate the token to ensure requests are coming from Slack. If you do not set this value, the logic will ignore the token check. [It's recommended by Slack that you validate the token](https://api.slack.com/slash-commands) (section "Validating the Command"). |

<a name="definebot"></a>
## Definebot
This bot will use the merriam-webster website to supply definitions to the incoming requests. The server makes a request to the merriam-webster website and then parses that HTML for the data points we are looking to extract. This method employs the Cheerio module and is dependent on the website's HTML. Please submit an issue if parsing of the HTML is broken and I will adjust.


![screen shot 2017-03-31 at 3 31 32 pm](https://cloud.githubusercontent.com/assets/2591298/24568228/29f5c042-162f-11e7-9473-851f92f6caf7.png)
![screen shot 2017-03-31 at 3 33 10 pm](https://cloud.githubusercontent.com/assets/2591298/24568229/29ff39ba-162f-11e7-8b37-bc2e0a3648f7.png)


### Environment Variables
| Variable | Required |                                                                     Notes                                                                    |
|:--------|:--------|:--------------------------------------------------------------------------------------------------------------------------------------------|
|   SLACK_DEFINEBOT_TOKEN   |     N    |  Slack token generated when you configure the slash command. If you set this to an environment variable, the code will automatically validate the token to ensure requests are coming from Slack. If you do not set this value, the logic will ignore the token check. [It's recommended by Slack that you validate the token](https://api.slack.com/slash-commands) (section "Validating the Command"). |

<a name="test"></a>
## Testing
**Note:** You can test the server with the default configuration as is, but in order for gitbot to respond with valid PR data, you must request access to [the test orginization I created](https://github.com/test-github-organization-api) otherwise the github API will not allow you to query for pull requests. I have no problem granting access to anyone who wishes to utilize the test orginization for this application or others (github api testing, etc...).

There are two aspects to testing this locally:
1. Requesting a Slack response from your server (mainly testing for data correctness / functionality)
2. Testing the server response inside of Slack (mainly testing for proper formatting of the data)

### Requesting a Slack Response
I recommend you utilize POSTMAN for this task. See the POSTMAN section below for more information. If you don't want to use POSTMAN to test functionality, check out these Slack webpages and mimic the payloads Slack will be sending to your server:
* https://api.slack.com/slash-commands
* https://api.slack.com/custom-integrations


Here is a rough outline of what a request from Slack will look like to your server:
``` json
"url": "http://localhost:3000/gitbot",
"method": "POST",
"headers": "",
"data": [{
  "key": "token",
  "value": "TOKEN",
  "type": "text"
  }, {
  "key": "team_id",
  "value": "T0001",
  "type": "text"
  }, {
  "key": "team_domain",
  "value": "example",
  "type": "text"
  }, {
  "key": "channel_id",
  "value": "C2147483705",
  "type": "text"
  }, {
  "key": "channel_name",
  "value": "test",
  "type": "text"
  }, {
  "key": "user_id",
  "value": "U2147483697",
  "type": "text"
  }, {
  "key": "user_name",
  "value": "Steve",
  "type": "text"
  }, {
  "key": "command",
  "value": "/gitbot",
  "type": "text"
  }, {
  "key": "text",
  "value": "team-alpha",
  "type": "text"
  }, {
  "key": "response_url",
  "value": "https://hooks.slack.com/commands/1234/5678",
  "type": "text"
}],
```

The server should respond with something like this: 
``` json
{
    "username": "gitbot",
    "response_type": "in_channel",
    "attachments": [
        {
            "fallback": "Repository Statistics",
            "text": "Repository Statistics",
            "fields": [
                {
                    "title": "Total PRs",
                    "value": 4,
                    "short": true
                },
                {
                    "title": "Average Age (days)",
                    "value": 19,
                    "short": true
                },
                {
                    "title": "Repository Breakdown",
                    "value": "repository: <http://github.com/brandingbrand/repository-one|repository-one> ---- count: 2\nrepository: <http://github.com/brandingbrand/repository-two|repository-two> ---- count: 1\nrepository: <http://github.com/brandingbrand/repository-three|repository-three> ---- count: 1\n",
                    "short": false
                }
            ],
            "color": "#551A8B"
        },
        {
            "fallback": "<https://github.com/test-github-organization-api/repository-two/pull/1|Test PR>",
            "text": "<https://github.com/test-github-organization-api/repository-two/pull/1|Test PR>",
            "fields": [
                {
                    "title": "Author",
                    "value": "nathan-hega",
                    "short": true
                },
                {
                    "title": "Age (days)",
                    "value": 1,
                    "short": true
                },
                {
                    "title": "Assignee",
                    "value": "Unassigned",
                    "short": true
                },
                {
                    "title": "Branch",
                    "value": "master",
                    "short": true
                },
                {
                    "title": "Repository",
                    "value": "repository-two",
                    "short": true
                }
            ],
            "color": "#98FB98"
        },
        {
            "fallback": "<https://github.com/test-github-organization-api/repository-one/pull/2|Update README.md>",
            "text": "<https://github.com/test-github-organization-api/repository-one/pull/2|Update README.md>",
            "fields": [
                {
                    "title": "Author",
                    "value": "nathan-hega",
                    "short": true
                },
                {
                    "title": "Age (days)",
                    "value": 25,
                    "short": true
                },
                {
                    "title": "Assignee",
                    "value": "Unassigned",
                    "short": true
                },
                {
                    "title": "Branch",
                    "value": "master",
                    "short": true
                },
                {
                    "title": "Repository",
                    "value": "repository-one",
                    "short": true
                }
            ],
            "color": "#FF6A6A"
        },
        {
            "fallback": "<https://github.com/test-github-organization-api/repository-one/pull/1|Update README.md>",
            "text": "<https://github.com/test-github-organization-api/repository-one/pull/1|Update README.md>",
            "fields": [
                {
                    "title": "Author",
                    "value": "nathan-hega",
                    "short": true
                },
                {
                    "title": "Age (days)",
                    "value": 25,
                    "short": true
                },
                {
                    "title": "Assignee",
                    "value": "Unassigned",
                    "short": true
                },
                {
                    "title": "Branch",
                    "value": "master",
                    "short": true
                },
                {
                    "title": "Repository",
                    "value": "repository-one",
                    "short": true
                }
            ],
            "color": "#FF6A6A"
        },
        {
            "fallback": "<https://github.com/test-github-organization-api/repository-three/pull/1|Update README.md>",
            "text": "<https://github.com/test-github-organization-api/repository-three/pull/1|Update README.md>",
            "fields": [
                {
                    "title": "Author",
                    "value": "nathan-hega",
                    "short": true
                },
                {
                    "title": "Age (days)",
                    "value": 25,
                    "short": true
                },
                {
                    "title": "Assignee",
                    "value": "Unassigned",
                    "short": true
                },
                {
                    "title": "Branch",
                    "value": "master",
                    "short": true
                },
                {
                    "title": "Repository",
                    "value": "repository-three",
                    "short": true
                }
            ],
            "color": "#FF6A6A"
        }
    ]
}
```
*This is an example of 'gitbot', but in many cases it's easier to test 'definebot' since it requires no configuration upfront and consequently minimizes the chances for errors to occur while testing. Here is an example request and response for 'definebot' for the sake of consistency:*

``` json
"url": "http://localhost:3000/definebot",
"method": "POST",
"headers": "",
"data": [{
  "key": "token",
  "value": "TOKEN",
  "type": "text"
  }, {
  "key": "team_id",
  "value": "T0001",
  "type": "text"
  }, {
  "key": "team_domain",
  "value": "example",
  "type": "text"
  }, {
  "key": "channel_id",
  "value": "C2147483705",
  "type": "text"
  }, {
  "key": "channel_name",
  "value": "test",
  "type": "text"
  }, {
  "key": "user_id",
  "value": "U2147483697",
  "type": "text"
  }, {
  "key": "user_name",
  "value": "Steve",
  "type": "text"
  }, {
  "key": "command",
  "value": "/defintebot",
  "type": "text"
  }, {
  "key": "text",
  "value": "habitat",
  "type": "text"
  }, {
  "key": "response_url",
  "value": "https://hooks.slack.com/commands/1234/5678",
  "type": "text"
}],
```

```json
{
    "username": "definebot",
    "attachments": [
        {
            "fallback": "* the place or environment where a plant or animal naturally or normally lives and grows \n * the typical place of residence of a person or a group \n * a housing for a controlled physical environment in which people can live under surrounding inhospitable conditions (as under the sea) \n * the place where something is commonly found \n ",
            "text": "Habitat | Definition of Habitat by Merriam-Webster",
            "fields": [
                {
                    "title": "Word",
                    "value": "habitat",
                    "short": true
                },
                {
                    "title": "Type",
                    "value": "noun",
                    "short": true
                },
                {
                    "title": "Pronunciation",
                    "value": "ˈha-bə-ˌtat",
                    "short": true
                },
                {
                    "title": "Syllables",
                    "value": "hab·i·tat",
                    "short": true
                },
                {
                    "title": "Definition(s)",
                    "value": "* the place or environment where a plant or animal naturally or normally lives and grows \n * the typical place of residence of a person or a group \n * a housing for a controlled physical environment in which people can live under surrounding inhospitable conditions (as under the sea) \n * the place where something is commonly found \n ",
                    "short": false
                }
            ],
            "color": "#551A8B"
        }
    ]
}
```

The response data above represents formatted responses from our server. It is formatted to adhere to Slack styling and is what allows us to color code the panels, format the text with markdown, etc... If you see data from your server that looks right, it means your server is functioning correctly. The next thing to test is the formatting of the data in Slack.

### Validating Slack Formatting
To validate that the formatting of your server's response data is correct, you must set up [an incoming webhook.](https://api.slack.com/incoming-webhooks)

Once your webhook is configured, you can use POSTMAN to POST to the URL supplied by Slack. You will simply copy and paste the response from your server and send it to the incoming webhook. Then, head over to the Slack channel you put the webhook on and check to make sure things work as expected. You should see a formatted Slack message.


### POSTMAN
[POSTMAN](https://www.getpostman.com/) is like the curl command, only wrapped with a nice GUI and some handy features like the ability to save requests in collections, re-issue requests quickly, and share collections with other developers. I use POSTMAN to test both aspects of this server. 

Below is the collection I have used, please import it into POSTMAN:
``` json
{"id":"d084a6ac-5c67-370d-8141-a10ba9462be7","name":"Slack-Slash","timestamp":1490909509978,"requests":[{"collectionId":"d084a6ac-5c67-370d-8141-a10ba9462be7","id":"37b40850-524b-a594-dfe3-52c6637be40a","name":"gitbot","description":"","url":"http://localhost:3000/gitbot","method":"POST","headers":"","data":[{"key":"token","value":"TOKEN","type":"text"},{"key":"team_id","value":"T0001","type":"text"},{"key":"team_domain","value":"example","type":"text"},{"key":"channel_id","value":"C2147483705","type":"text"},{"key":"channel_name","value":"test","type":"text"},{"key":"user_id","value":"U2147483697","type":"text"},{"key":"user_name","value":"Steve","type":"text"},{"key":"command","value":"/gitbot","type":"text"},{"key":"text","value":"team-alpha","type":"text"},{"key":"response_url","value":"https://hooks.slack.com/commands/1234/5678","type":"text"}],"dataMode":"urlencoded","timestamp":0,"responses":[],"version":2},{"collectionId":"d084a6ac-5c67-370d-8141-a10ba9462be7","id":"4f0e5a37-9da4-b9c9-f503-aa5317d31c15","name":"definebot","description":"","url":"http://localhost:3000/definebot","method":"POST","headers":"","data":[{"key":"token","value":"TOKEN","type":"text"},{"key":"team_id","value":"T0001","type":"text"},{"key":"team_domain","value":"example","type":"text"},{"key":"channel_id","value":"C2147483705","type":"text"},{"key":"channel_name","value":"test","type":"text"},{"key":"user_id","value":"U2147483697","type":"text"},{"key":"user_name","value":"Steve","type":"text"},{"key":"command","value":"/defintebot","type":"text"},{"key":"text","value":"habitat","type":"text"},{"key":"response_url","value":"https://hooks.slack.com/commands/1234/5678","type":"text"}],"dataMode":"urlencoded","timestamp":0,"responses":[],"version":2}]}
```

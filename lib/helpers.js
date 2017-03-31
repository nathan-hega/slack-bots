var config = require(process.cwd() + '/config.json')
var _ = require('lodash')

// Create a closure to access 'res' without having to pass it with each invocation.
exports.slackError = function (res) {
  return function (error) {
    var errorAttachment = {
      fallback: 'Error!',
      text: '*Error* \n' + error,
      color: "#FF0000",
      mrkdwn_in: ["text"]
    };

    // Create or override 'attachments' with the error attachment.
    res.bot = res.bot || {};
    res.bot.attachments = [errorAttachment];
  
    return;
  };
};

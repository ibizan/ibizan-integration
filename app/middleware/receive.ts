import { BLACKLISTED_SLACK_MESSAGE_TYPES, REGEX } from '../shared/constants';
import { isDMChannel, Message, random } from '../shared/common';
import Copy from '../i18n';
import { Slack } from '../logger';

export function applyReceiveMiddleware(controller: botkit.Controller) {
    function onReceiveMessage(bot: botkit.Bot, message: Message) {
        if (message &&
            message.text &&
            message.text.length < 30 &&
            (message.text.match(REGEX.ibizan) || message.channel && message.channel.substring(0, 1) === 'D')) {
            bot.reply(message, `_${random(message.copy.access.unknownCommand)} ${random(message.copy.access.askForHelp)}_`);
            Slack.addReaction('question', message);
            return;
        }
    }

    function onReceiveUpdateSlackLogger(bot: botkit.Bot, message: Message, next: () => void) {
        Slack.setBot(bot);
        next();
    }

    function onReceiveSwallowBlacklistedMessageTypes(bot: botkit.Bot, message: Message, next: () => void) {
        if (BLACKLISTED_SLACK_MESSAGE_TYPES.indexOf(message.type) === -1) {
            next();
        }
    }

    function onReceiveFormatMessage(bot: botkit.Bot, message: Message, next: () => void) {
        next();
    }

    function onReceiveSetUser(bot: botkit.Bot, message: Message, next: () => void) {
        if (!message.user) {
            next();
            return;
        }
        bot.api.users.info({ user: message.user }, (err, data) => {
            if (err || (data && !data.ok)) {
                next();
                return;
            }
            const { user } = data;
            message.user_obj = user;
            next();
        });
    }

    function onReceiveSetChannel(bot: botkit.Bot, message: Message, next: () => void) {
        if (!message.channel) {
            next();
            return;
        }
        if (isDMChannel(message.channel)) {
            bot.api.im.list({}, (err, data) => {
                if (err || (data && !data.ok)) {
                    next();
                    return;
                }
                const ims = data.ims.filter(im => im.id === message.channel) || [];
                if (!ims || (ims && ims.length !== 1)) {
                    next();
                    return;
                }
                const matchingIm = ims[0];
                bot.api.users.info({ user: matchingIm.user }, (err, data) => {
                    if (err || (data && !data.ok)) {
                        next();
                        return;
                    }
                    const { user } = data;
                    message.channel_obj = {
                        id: message.channel,
                        name: user.name
                    }
                    next();
                });
            });
        } else {
            bot.api.channels.info({ channel: message.channel }, (err, data) => {
                if (err || (data && !data.ok)) {
                    next();
                    return;
                }
                const { channel } = data;
                message.channel_obj = channel;
                next();
            });
        }
    }

    function onReceiveSetCopyForLocale(bot: botkit.Bot, message: Message, next: () => void) {
        message.copy = Copy.forLocale();
        next();
    }

    controller.on('message_received', onReceiveMessage);

    controller.middleware.receive.use(onReceiveSwallowBlacklistedMessageTypes)
        .use(onReceiveUpdateSlackLogger)
        .use(onReceiveSetUser)
        .use(onReceiveSetChannel)
        .use(onReceiveSetCopyForLocale)
        .use(onReceiveFormatMessage);
}
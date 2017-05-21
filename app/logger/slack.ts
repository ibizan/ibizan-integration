import { Message, typeIsArray } from '../shared/common';

export namespace SlackLogger {
    let bot: botkit.Bot;

    export function setBot(newBot: botkit.Bot) {
        bot = newBot;
    }

    function composeMessage(text: string, channel: string, attachment?: string | { text: string, fallback: string }[]) {
        const message: any = {
            text,
            channel,
            parse: 'full',
            username: 'ibizan',
            attachments: null
        };

        if (attachment) {
            if (typeof attachment === 'string') {
                message.attachments = {
                    text: attachment,
                    fallback: attachment.replace(/\W/g, '')
                };
            } else {
                message.attachments = attachment;
            }
        }

        return message;
    }

    export function log(text: string, channel: string, attachment?: string | { text: string, fallback: string }[]) {
        if (!text) {
            console.error('No text passed to log function');
            return
        } else if (!bot) {
            console.error(`No robot available to send message: ${text}`);
            return;
        }
        const message = composeMessage(text, channel, attachment);
        bot.send(message, (err) => {

        });
    }

    export function logDM(text: string, id: string, attachment?: string | { text: string, fallback: string }[]) {
        if (bot && text && id) {
            bot.api.im.open({ user: id }, (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }
                const message = composeMessage(text, data.channel.id, attachment);
                bot.send(message, (err) => {

                });
            });
        }
    }

    export function error(text: string, error?: any) {
        if (!text) {
            console.error('SlackLogger#error called with no message');
            return;
        }
        bot.api.channels.list({}, (err, data) => {
            if (err || (data && !data.ok)) {
                console.error(err);
                return;
            }
            let sent = false;
            data.channels.forEach(channel => {
                if (channel.name !== 'ibizan-diagnostics' || sent) {
                    return;
                }
                const message = composeMessage(`(${new Date()}) ERROR: ${text}\n${error || ''}`, channel.id);
                bot.send(message, err => { });
                sent = true;
            });
            bot.api.channels.join({ name: 'ibizan-diagnostics' }, (err, data) => {
                if (err || (data && !data.ok)) {
                    console.error(err);
                    return;
                }
                const message = composeMessage(`(${new Date()}) ERROR: ${text}\n${error || ''}`, data.channel.id);
                bot.send(message, err => { });
            });
        });
    }

    export function addReaction(reaction: string, message: Message, attempt: number = 0) {
        if (attempt > 0 && attempt <= 2) {
            console.debug(`Retrying adding ${reaction}, attempt ${attempt}...`);
        }
        if (attempt >= 3) {
            console.error(`Failed to add ${reaction} to ${message} after ${attempt} attempts`);
            log(message.copy.logger.failedReaction, message.user_obj.name);
        } else if (bot && reaction && message) {
            setTimeout(() => {
                bot.api.reactions.add({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: reaction
                }, (err, data) => {
                    if (err || (data && !data.ok)) {
                        attempt += 1;
                        addReaction(reaction, message, attempt);
                    } else {
                        if (attempt >= 1) {
                            console.debug(`Added ${reaction} to ${message} after ${attempt} attempts`);
                        }
                    }
                });
            }, 1000 * attempt);
        } else {
            console.error('Slack web client unavailable');
        }
    }

    export function removeReaction(reaction: string, message: Message, attempt: number = 0) {
        if (attempt > 0 && attempt <= 2) {
            console.debug(`Retrying removal of ${reaction}, attempt ${attempt}...`);
        }
        if (attempt >= 3) {
            console.error(`Failed to remove ${reaction} from ${message} after ${attempt} attempts`);
            log(message.copy.logger.failedReaction, message.user_obj.name);
        } else if (bot && reaction && message) {
            setTimeout(() => {
                bot.api.reactions.remove({
                    timestamp: message.ts,
                    channel: message.channel,
                    name: reaction
                }, (err, data) => {
                    if (err || (data && !data.ok)) {
                        attempt += 1;
                        removeReaction(reaction, message, attempt);
                    } else {
                        if (attempt >= 1) {
                            console.debug(`Removed ${reaction} from ${message} after ${attempt} attempts`);
                        }
                    }
                });
            }, 1000 * attempt);
        } else {
            console.error('Slack web client unavailable');
        }
    }
}
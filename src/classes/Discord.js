const { Webhook, MessageBuilder } = require('discord-webhook-node');

const Log = require('../../Log')
const config = require('../config.json')

if(config.webhook_url === []){
    Log.Error('Discord webhook url cannot be empty, insert it in the config.json file')
    process.exit()
}

const hooks = []
const botSettings = config.discord_message_settings;

var setBotName = botSettings.botName && botSettings.botName != "";
var setBotImage = botSettings.botImage && botSettings.botImage != "";

config.webhook_url.forEach(x => {
    var hook = new Webhook(x);

    if(setBotName){
        hook.setUsername(botSettings.botName)
    }

    if(setBotImage){
        hook.setAvatar(botSettings.botImage)
    }

    hooks.push(hook)
})

let Discord = {};

Discord.notifyProduct = async ({title, storeUrl, image, url, variants, status}) => {
    const embed = new MessageBuilder().setTitle(title).setAuthor('Premytheus', botSettings.storeLogo, botSettings.storeUrl).setURL(url).setColor(`#${botSettings.color}`);

    var availablesVariants = variants.filter(x => x.available);
    if(availablesVariants.length > 0){
        var sizesDescription = []
        sizesDescription.push("")
        var count = 0
    
        availablesVariants.forEach(x => {
            var toAdd = `${x.title} [[ATC](https://${storeUrl}/cart/add?id=${x.id})]\n`
            if(sizesDescription[count].length + toAdd.length > 1024){
                sizesDescription.push(toAdd);
                count++;
            }
            else{
                sizesDescription[count] += toAdd;
            }
        })

        sizesDescription.forEach(x => {
            embed.addField('**Sizes**', x, true)
        })
    }

    embed.addField('**Price**', variants[0].price, true)

    if(status.length > 0){
        embed.addField('**Status**', status.join('\n'), true)
    }

    embed.addField('**Links**', `[[Cart](https://${storeUrl}/cart)]`, true).setThumbnail(image); 

    if(botSettings.footerDescription && botSettings.footerDescription != "" || botSettings.footerImage && botSettings.footerImage != ""){
        embed.setFooter(botSettings.footerDescription, botSettings.footerImage)
    }

    if(botSettings.timeOfNotification){
        embed.setTimestamp()
    }

    hooks.forEach(hook => {
        hook.send(embed);
    })
}

Discord.info = async (title) => {
    hooks.forEach(hook => {
        hook.info(title);
    })  
}

module.exports = Discord;
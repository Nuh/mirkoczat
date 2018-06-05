const debug = Debug('DISCORD');
const DiscordClient = new require('discord.js');

class Discord extends AbstractCoreModule {
    constructor(applicationInstance) {
        super(applicationInstance);

        // INSTANCEs
        this.client = new DiscordClient.Client();
        this.connected = false;

        // DATA
        this.channels = {};
    }

    prepare() {
//        this.client.login(this.app.property('token'));
    }

    run() {
//        let client = this.client;
//        client.on('ready', () => {
//            for (let guild of client.guilds.values()) {
//                for (let channel of guild.channels.values()) {
//                    if (channel.type === 'text' && channel.name === 'patostreamy') {
//                        channel.createWebhook('PatoBOT', 'https://www.wykop.pl/cdn/c3397992/PatoBOT_WKQEVgsIlW,q150.jpg')
//                               .then(webhook => {
//                                    webhook.send('test').then(() => webhook.delete())
//                               })
//                        channel.send('test')
//                        debug('%o', channel)
//                    }
//                }
//            }
//          console.log(`Logged in as ${client.user.tag}!`);
//        });
//
//                client.on('message', msg => {
//                  if (msg.content === 'ping') {
//                    msg.reply('Pong!');
//                  }
//                });

    }
}

module.exports = Discord;
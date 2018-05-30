const WebSocket = require('ws');

let getState = function (nick) {
    if ((this.settings.operators || []).indexOf(nick) !== -1) {
        return 'privileged';
    } else if ((this.settings.voices || []).indexOf(nick) !== -1) {
        return 'voiced';
    }
    return 'none';
};

let notifyMessage = function(payload, type = null, args = null) {
    let myUsername = this.getUsername();
    if (!payload || !payload.body) {
        return;
    }

    let rawMsg = payload.body.trim().toString() || '';
    let directPattern = myUsername ? new RegExp(`^(\\s?@[\\w-]+[:]?\\s+)?\\s?[@]?(${myUsername})[:]?\\s+`) : null;

    let msg = directPattern ? rawMsg.replace(directPattern, '') : rawMsg
    let permission = getState.call(this, payload.user);
    let isCommand = msg.trim().startsWith('!');
    let isMyMessage = _.isEqual(payload.user, myUsername)
    let isDirectMessage = !isMyMessage && (payload.type == 'query' || (directPattern && !!rawMsg.match(directPattern)));
    let isHighlightMessage = isDirectMessage || (!isMyMessage && !isCommand && this.highlightMatcher && !!msg.match(this.highlightMatcher));

    // Extend default payload
    payload = _.extend(payload, {permission: permission, command: isCommand, direct: isDirectMessage, highlight: isHighlightMessage, myMessage: isMyMessage});

    // Notify message
    let queueName = ['channel', this.name, type || payload.type || 'message']
    let userArgs = _.castArray(args || [])
    this.queue.emit.apply(this.queue, [queueName].concat(args === null ? [msg] : userArgs).concat([payload]))

    // Notify command to individual queue
    if (isCommand && !isMyMessage) {
        queueName = ['channel', this.name, 'command', permission]
        let command = msg.replace(/ .*/, '').replace(/^\!/, '');
        let cmdArgs = _.compact(msg.split(' ').splice(1));
        this.queue.emit.apply(this.queue, [queueName].concat(userArgs).concat([command, cmdArgs, payload]))
    }
};

class Channel {
    constructor(queue, server, room, token, highlightMatcher) {
        this.debug = Debug(`CHANNEL:${room}`);
        this.queue = queue;

        this.url = encodeURI(`${server}?tag=${room}&token=${token && token.token ? token.token : token}`);
        this.name = room;
        this.token = token;
        this.highlightMatcher = highlightMatcher;
        this.queuedMessages = [];

        this.topic = '';
        this.users = [];
        this.whoiam = {};
        this.settings = {
            operators: [],
            voices: [],
            muted: [],
            banned: [],
            messages: 0,
            muteAll: false,
            muteAnon: true,
            allowedAll: true,
            allowedAnon: true,
            embedded: false,
            motd: null
        };

        this.intervals = {
            state: null,
            message: null
        };
    }

    isConnected() {
        return this.connected && !_.isNil(this.ws)
    }

    connect(callback) {
        this.disconnect();

        this.ws = new WebSocket(this.url);
        this.ws.on('message', (data, flags) => {
            let message = JSON.parse(data);
            let {topic, ref, event, payload} = message;

            // Decorate payload
            payload = _.extend(payload, {
                user: payload.caller || payload.user,
                body: _.trim(payload.body) || '',
                date: new Date(),
                type: 'msg:me' === event ? 'action' : ('msg:priv' === event ? 'query' : 'message'),
                login: this.token && this.token.login ? this.token.login : null,
                channel: this.name,
                private: ['msg:send', 'msg:plus', 'msg:me'].indexOf(event) === -1
            });
            if ('msg:priv' === event) { // Normalize body of private messages
                payload.body = payload.body.substring(Math.max(0, payload.body.indexOf(':') + 1)).trim();
            }

            // Ignore old messages
            if (_.startsWith(event, 'msg:') && !this.settings.executeMessages) {
                return
            }

            // Parse by event type
            switch (event) {
                case 'join': {
                    this.wasConnected = this.connected = true;

                    if (!this.intervals.state) {
                        this.refreshState();
                        this.intervals.state = setInterval(() => this.refreshState.call(this), 15000)
                    }
                    if (!this.intervals.message) {
                        this.intervals.message = setInterval(() => {
                            this.send.call(this, _.castArray(this.queuedMessages).shift(), true)
                        }, 1000)
                    }

                    this.queue.emit(['channel', this.name, 'connect'], payload);
                    (callback || _.noop)(this.queue);
                    break;
                }

                case 'msg:me': {
                    notifyMessage.call(this, payload);
                    break;
                }
                case 'msg:send': {
                    notifyMessage.call(this, payload);
                    break;
                }
                case 'msg:priv': {
                    notifyMessage.call(this, payload);
                    break;
                }

                case 'info:cmd': {
                    let msg = payload.body;
                    if (msg.startsWith('Wiadomość od operatorów')) {
                        let [, nick, message] = msg.split(': ');
                        this.settings.motd = {
                            author: nick,
                            message: (message || '').trim(),
                            date: null
                        };
                        this.settings.updated = new Date();
                    } else if (msg.indexOf(' ustawia MOTD: ') !== -1) {
                        let [nick, message] = msg.split(' ustawia MOTD: ');
                        this.settings.motd = {
                            author: nick,
                            message: (message || '').trim(),
                            date: new Date()
                        };
                        this.settings.updated = new Date();
                    } else if (msg.startsWith('Czat z osadzonym materiałem') || msg.indexOf(' zmienił osadzony materiał: ') !== -1) {
                        this.settings.embedded = true;
                        this.settings.updated = new Date();
                    } else if (msg.endsWith(' usunął osadzony materiał.')) {
                        this.settings.embedded = false;
                        this.settings.updated = new Date();
                    } else if (msg.indexOf('` ustawił nowy temat: `') !== -1) {
                        msg = msg.split('` ustawił nowy temat: `')[1] || '';
                        this.settings.topic = msg.substring(0, msg.length - 2) || '';
                        this.settings.updated = new Date();
                    } else if (msg.startsWith('Nowy wymagany staż konta: ')) {
                        this.settings.requiredDays = parseInt(msg.split('Nowy wymagany staż konta: ')[1].trim().split(' ')[0] || '0', 10);
                        this.settings.updated = new Date();
                    } else if (msg === 'Dostęp anonimowy włączony') {
                        this.settings.allowedAnon = true;
                        this.settings.updated = new Date();
                    } else if (msg === 'Dostęp anonimowy wyłączony') {
                        this.settings.allowedAnon = false;
                        this.settings.updated = new Date();
                    } else if (msg === 'Dostęp tylko dla @ i + włączony') {
                        this.settings.allowedAll = true;
                        this.settings.updated = new Date();
                    } else if (msg === 'Dostęp tylko dla @ i + wyłączony') {
                        this.settings.allowedAll = false;
                        this.settings.updated = new Date();
                    } else if (msg.startsWith('Kanał pamięta ')) {
                        this.settings.messages = parseInt(msg.split('Kanał pamięta ')[1].trim().split(' ')[0] || '0', 10);
                        this.settings.updated = new Date();
                    } else if (msg.startsWith('(widoczne tylko dla moderatorów): ')) {
                        // via /mod, ignore now
                    } else if (msg.startsWith('Moderator `') || (msg.startsWith('User ') && msg.indexOf(' uciszony') !== -1)) {
                        let [, nick, , target] = msg.split('`');
                        nick = nick ? nick.replace(/@.*/, '').trim() : null;
                        target = target ? target.trim() : null;

                        if (nick && target && msg.indexOf('` wyrzuca `') !== -1) { // Moderator `BosmanPociagowy@test` wyrzuca `mirek12325`. // kick
                            notifyMessage.call(this, payload, 'kick', [target, nick])
                        } else if (nick && target && msg.indexOf('` wygnał `') !== -1) { // Moderator `BosmanPociagowy@test` wygnał `mirek69520`. // ban
                            notifyMessage.call(this, payload, 'ban', [target, nick])
                        }
                        // mod actions, ignore now
                    } else if (msg.indexOf(' ogłasza #rozdajo...') !== -1 || msg.startsWith('Wylosowano ') || msg.indexOf(' losuje liczbę ') !== -1) {
                        // ignore...
                    } else {
                        let processStateChanges = (type, values) => {
                            let oldValues = this.settings[type] || [];
                            let newValues = _.map(values, _.trim);
                            let duplicates = _(newValues).groupBy().pickBy(x => x.length > 1).keys().compact().value();
                            newValues = _(newValues).without(duplicates).compact().value();
                            if (!_.isEqual(newValues, oldValues)) {
                                this.settings[type] = newValues;
                                this.settings.updated = new Date();

                                this.queue.emit(['channel', this.name, 'state', type], newValues, oldValues);

                                let added = _.without.apply(_, [newValues].concat(oldValues)),
                                    removed = _.without.apply(_, [oldValues].concat(newValues));
                                this.debug('Changed %s state, added: %o, removed: %o', type, added, removed);
                                if (!(_.isEqual(newValues, added) || _.isEqual(newValues, removed))) {
                                    this.debug('Currently state of %s: %o', type, newValues);
                                }
                            }
                        };

                        let opts = payload.body.split('; ');
                        for (let i in opts) {
                            let opt = opts[i];
                            let [name, value] = opt.split(': ');
                            switch (name) {
                                case 'Moderatorzy':
                                    processStateChanges('operators', value.split(', '));
                                    break;
                                case 'Wyróżnieni':
                                    processStateChanges('voices', value.split(', '));
                                    break;
                                case 'Uciszeni':
                                    processStateChanges('muted', value.split(', '));
                                    break;
                                case 'Wygnani':
                                    processStateChanges('banned', value.split(', '));
                                    break;
                                case 'Pamiętane wiadomości':
                                    this.settings.messages = parseInt(value, 10);
                                    break;
                                case 'Wpuszczaj anonimowych':
                                    this.settings.allowedAnon = ('tak' === value.substring(0, 3));
                                    break;
                                case 'Mute_anon':
                                    this.settings.muteAnon = ('tak' === value.substring(0, 3));
                                    break;
                                case 'Mute_all':
                                    this.settings.muteAll = ('tak' === value.substring(0, 3));
                                    break;
                            }
                        }
                    }
                    break;
                }
                case 'info:enter': {
                    this.queue.emit(['channel', this.name, 'join'], payload);
                    break;
                }
                case 'info:leave': {
                    this.queue.emit(['channel', this.name, 'leave'], payload);
                    break;
                }
                case 'info:room': {
                    this.users = (payload || {}).users || this.users;
                    this.topic = (payload || {}).topic || this.topic;
                    break;
                }
                case 'info:user': {
                    this.whoiam = payload || this.whoiam;
                    this.settings.executeMessages = true
                    break;
                }

                case 'heartbeat': {
                    this.sendRaw({
                        topic: "phoenix",
                        event: "heartbeat",
                        payload: {}
                    });
                }
            }
        });

        this.ws.on('open', () => {
            this.debug('Server open connectivity');
            this.sendRaw({
                topic: `rooms:${this.name}`,
                event: "phx_join",
                payload: {}
            });
        });
        this.ws.on('close', (code, message) => {
            this.disconnect()

            let doReconnect = [1005, 1006].indexOf(code) === -1;
            if (doReconnect) {
                _.delay(() => this.connect.call(this), 3000)
            }

            this.debug('Server close connectivity: %s [code %s]%s', message || 'no reason', code, doReconnect ? ' (RECONNECT)' : '')
            this.queue.emit(['channel', this.name, 'user', this.token.login, 'disconnect']);
        });
        this.ws.on('error', (error) => {
            this.debug('Server error: %s', error && error.message ? error.message : error)
        });
        return this
    }

    disconnect() {
        this.connected = false;

        for (let type in this.intervals) {
            let interval = this.intervals[type];
            if (interval) {
                this.intervals[type] = null;
                clearInterval(interval);
            }
        }

        if (!_.isNil(this.ws)) {
            try {
                this.ws.eventNames().forEach((eventName) => this.ws.removeAllListeners(eventName))
                this.ws.close();
            } catch(e) {
                this.debug('Error while closing WebSocket connectivity: %s', e.message || e)
            } finally {
                try {
                    this.ws.terminate()
                } catch(ex) {
                    // Ignore...
                }
            }
            this.ws = null;
        }

        return this
    }

    getUsername() {
        return this.token && this.token.login ? this.token.login : null;
    }

    getUsers() {
        return _.castArray(this.users);
    }

    getSettings() {
        return this.settings;
    }

    sendMessage(message, priority = false) {
        let q = _.clone(this.queuedMessages);
        q[priority ? 'unshift' : 'push'].call(q, message);
        this.queuedMessages = _.uniq(q)
        return this;
    }

    send(message, queueIfNotConnected = false) {
        if (message) {
            if (this.isConnected()) {
                this.sendRaw({
                    topic: `rooms:${this.name}`,
                    event: 'msg:send',
                    payload: {
                        body: message
                    }
                });
            } else if (queueIfNotConnected) {
                this.sendMessage(message, true)
            }
        }
        return this
    }

    sendRaw(obj) {
        if (obj) {
            try {
                let ref = (this.ref = (this.ref || 0) + 1);
                this.ws.send(JSON.stringify(_.extend(obj, {ref: ref})));
            } catch(e) {
                this.debug('Failed send message to WebSocket: %o', e);
            }
        }
        return this;
    }


    /*** ACTIONS ***/
    refreshState() {
        if (!this._refreshState) {
            this._refreshState = _.throttle(() => this.send('/state'), 500)
        }
        this._refreshState();
        return new Promise((resolve) => _.delay(resolve, 500))
    }

    doMute(nick, quiet = false) {
        this.refreshState().then(() => {
            let isOp = this.settings.operators.indexOf(nick) !== -1;
            if (!isOp) {
                this.doUnvoice(nick);
                this.send(quiet ? `/mute ${nick}` : `/mute! ${nick}`);
            }
        });
        return this;
    }

    doUnmute(nick) {
        this.refreshState().then(() => {
            let isMuted = this.settings.muted.indexOf(nick) !== -1;
            if (isMuted) {
                this.sendMessage(`/unmute ${nick}`, true);
            }
        });
        return this;
    }

    doUnvoice(nick) {
        this.refreshState().then(() => {
            let isVoiced = this.settings.voices.indexOf(nick) !== -1;
            if (isVoiced) {
                this.send(`/unv ${nick}`);
            }
        });
        return this;
    }

}

module.exports = Channel;
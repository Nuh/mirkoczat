const debug = Debug('GUARD:combining-unicode');
const stripCombiningMarks = require('strip-combining-marks');

var eventHandler = function(rawMsg, data) {
    if (data.myMessage || data.permission == 'privileged') {
        return;
    }

    var cleanMsg = stripCombiningMarks(rawMsg) || '';

    var ratio = rawMsg ? cleanMsg.length/rawMsg.length : 0;
    var maxRatio = Math.min(this.app.property('guard:combiningUnicode:ratio', 0.5), 0.66);
    if (ratio < maxRatio) {
        var channel = data.channel;
        var nick = data.user;
        this.register(channel, nick);
    }
}

class Guard {
    constructor(applicationInstance) {
        this.app = applicationInstance
        this.users = []

        this.levelWarn = this.app.property('guard:combiningUnicode:warn:level', 3)
        this.warnTime = this.app.property('guard:combiningUnicode:warn:timeout', 30)
        this.levelMute = Math.max(this.levelWarn, this.app.property('guard:combiningUnicode:mute:level', 5))
        this.muteTime = this.app.property('guard:combiningUnicode:mute:seconds', 60)
        this.maxMuteTime = Math.max(this.muteTime, this.app.property('guard:combiningUnicode:mute:maxSeconds', 1800))

        this.mitigationTime = this.app.property('guard:combiningUnicode:mitigation:time', 30)
        this.mitigationInterval = null
    }

    dependency() {
        return ['mirkoczat']
    }

    run() {
        this.app.bus('channel::*::message', eventHandler.bind(this))
        this.mitigationInterval = setInterval(this.mitigation.bind(this), this.mitigationTime * 1000)
    }

    stop() {
        this.app.bus().offAny(eventHandler)
        if (this.mitigationInterval) {
            clearInterval(this.mitigationInterval)
        }
    }

    getOrCreateUserData(channel, nick) {
        var data = _.find(this.users, {channel: channel, nick: nick})
        if (_.isNil(data)) {
            data = {channel: channel, nick: nick, level: 0}
            this.users.push(data)
        }
        return data
    }

    mitigation() {
        for (var i in this.users) {
            var user = this.users[i]
            if (!(user.muted || user.warned)) {
                user.level = Math.max(0, (user.level || 0) - 1)
            }
        }
    }

    register(channel, nick) {
        var data = this.getOrCreateUserData(channel, nick)
        var lvl = ++data.level
        debug('Registered spamer %s@%s with counted %d offense(s)', nick, channel, lvl)

        if (this.levelMute > 0 && lvl >= this.levelMute) {
            this.mute(channel, nick)
        } else if (!data.warned && this.levelWarn > 0 && lvl < this.levelMute && lvl >= this.levelWarn) {
            this.warn(channel, nick)
        }
        return this
    }

    warn(channel, nick) {
        var data = this.getOrCreateUserData(channel, nick)
        data.warned = true

        // Do warn
        this.app.bus().emit(`channel::${channel}::send::priority`, `/msg ${nick} ${this.app.property('guard:combiningUnicode:warn:message', 'Warn! Please do not flood!')}`)

        // Planned unwarn
        var seconds = Math.max(10, this.warnTime)
        if (data.unwarnTimeout) {
            clearTimeout(data.unwarnTimeout)
        }
        data.unwarnTimeout = setTimeout(function() {
            data.level = Math.ceil(0.50 * data.level)
            data.warned = false
            data.unwarnTimeout = null
        }, seconds * 1000)

        debug('Warned %s@%s for counted %d offense(s)', nick, channel, data.level)
    }

    mute(channel, nick) {
        var bus = this.app.bus()
        var data = this.getOrCreateUserData(channel, nick)
        data.count = data.unmuteTimeout ? data.count : (data.count || 0) + 1
        data.muted = true

        // Clear old umute
        if (data.unmuteTimeout) {
            clearTimeout(data.unmuteTimeout)
        }

        // Do mute
        bus.emit(`channel::${channel}::execute`, 'mute', nick)

        // Planned unmute
        var seconds = Math.min(this.maxMuteTime, this.muteTime * Math.max(1, data.count))
        data.unmuteTimeout = setTimeout(function() {
            data.level = Math.ceil(0.25 * data.level)
            data.muted = false
            data.unmuteTimeout = null
            bus.emit(`channel::${channel}::execute`, 'unmute', nick)
            debug('Unmute %s@%s after %d seconds', nick, channel, seconds)
        }, seconds * 1000)

        debug('Muted %s@%s %d time(s) for %d seconds', nick, channel, data.count, seconds)
    }
}

module.exports = Guard

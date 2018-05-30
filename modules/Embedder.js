const debug = Debug('EMBEDDER');
const AsyncPolling = require('async-polling');
const Promise = require('bluebird');
const RequestPromise = require('request-promise');
const Cookie = require('tough-cookie');
const cheerio = require('cheerio');

var convertRawToModel = function(data) {
    return {
        id: normalizeId(data.title),
        platform: data.platform,
        custom: false,
        online: data.online === 1,
        name: data.title,
        title: '',
        streamId: data.lastStreamVideoId,
        views: data.views,
        viewers: data.viewers
    }
}

var createModel = function(streamId, platform) {
    var s = normalizeStreamId(streamId)
    var name = s.name || s.id || `custom-${s.platform ? s.platform + '-' : ''}stream-${Math.floor(1000 + Math.random() * 9000)}`
    return {
        id: normalizeId(name),
        platform: s.platform,
        custom: true,
        online: true,
        name: name,
        title: '',
        streamId: s.name || s.url,
        views: 0,
        viewers: 0
    }
}

var normalizeId = function(name) {
    return _.trim((name || '').toLowerCase())
}

var normalizeStreamId = function(url) {
    var youtube = (/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be|yt\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/.exec(url) || [])[5]
    if (youtube) { // YouTube
        return {
            platform: 'youtube',
            url: url,
            name: youtube,
            id: normalizeId(youtube)
        }
    }
    var showup = (/^((?:https?:)?\/\/)?((?:www|m|beta)\.)?((?:showup\.tv))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/.exec(url) || [])[5]
    if (showup) { // ShowUp
        return {
            platform: 'showup',
            url: url,
            name: showup,
            id: normalizeId(showup)
        }
    }
    var chaturbate = (/^((?:https?:)?\/\/)?((?:www|beta)\.)?((?:chaturbate\.com))(\/(?:fullvideo\/\?b=|embed\/)?)([\w\-]+)(\S+)?$/.exec(url) || [])[5]
    if (chaturbate) { // Chaturbate
        return {
            platform: 'chaturbate',
            url: url,
            name: chaturbate,
            id: normalizeId(chaturbate)
        }
    }
    return {
        platform: 'unknown',
        url: url,
        name: '',
        id: ''
    }
}

// Communication with channel
let _reply = function(data, msg) {
    let nick = data ? data.user || data : null;
    let channel = data ? data.channel : '';
    return nick && msg ? _sendMessage.call(this, `/msg ${nick} ${msg}`, channel) : Promise.reject('No nick or message to reply!');
}

let _sendMessage = function(msg, channel = '') {
    var queue = channel ? `channel::${channel}::send` : 'mirkoczat::send'
    this.app.bus().emit(queue, msg)
    return Promise.resolve()
}

class Embedder {
    constructor(applicationInstance) {
        // Config
        this.pollingInterval = Math.max(applicationInstance.property('embedder:pollingInterval', 60 * 1000), 10 * 1000)
        this.youTubeApiKey = applicationInstance.property('embedder:youtube:apiKey')
        this.api = _.castArray(applicationInstance.property('embedder:api', [
                               'https://patostreamy.herokuapp.com/api/channels?platform=youtube',
                               'https://patostreamy.herokuapp.com/api/channels?platform=showup']));

        // Instances
        this.app = applicationInstance;
        this.polling = AsyncPolling((callback) => this.execute.call(this, callback), this.pollingInterval);

        // DATAs
        this.customStreams = [];
        this.ignoreStreamers = []
        this.lastReceivedStreamers = []
    }

    dependency() {
        return ['mirkoczat']
    }

    run() {
        if (this.initialized || this.app.property('embedder:enabled', true)) {
            this.polling.stop()
            this.polling.run()
        }

        this.registerEvents()
        this.initialized = true
    }

    stop() {
        this.polling.stop()
    }

    refresh() {
        this.lastReceivedStreamers = [];
        this.run()
    }

    registerEvents() {
        if (this.registeredEvents) {
            return
        }
        this.registeredEvents = true

        var that = this
        var streamsList = function() {
            var streams = _.map(that.lastReceivedStreamers, function(s) { return `${s.name || s.id} (${s.custom ? 'custom ' : ''}${s.platform})${s.embeddable ? '' : ' - NOT EMBEDDABLE'}` }).join(', ').trim() || 'brak osadzeń'
            return `Lista osadzeń: ${streams}`
        }

        this.app.bus('channel::*::command::privileged', (command, args, data) => {
            switch (command) {
                case 'iframe-ignore':
                    var streamers = _.uniq(_.compact(_.map(args.join(' ').split(','), normalizeId)));
                    if (!_.size(streamers)) {
                        _reply.call(that, `Ignorowani streamerzy: ${that.ignoreStreamers.join(', ')}`)
                        return
                    }
                    if (that.ignore(streamers)) {
                        _reply.call(this, data, `Zignorowano stream: ${streamers.join(', ')}`);
                    }
                break;

                case 'iframe-unignore':
                    var streamers = _.uniq(_.compact(_.map(args.join(' ').split(','), normalizeId)));
                    if (!_.size(streamers)) {
                        _reply.call(that, data, 'Nie podano nazwę streamera do usunięcia z listy ignorowanych!')
                        return
                    }

                    streamers = _.intersection(streamers, that.ignoreStreamers)
                    if(_.size(streamers)) {
                        that.ignoreStreamers = _.difference(that.ignoreStreamers, streamers);
                        _reply.call(that, data, `Przestano ignorować stream: ${streamers.join(',')}`);
                        that.run();
                    }
                break;

                case 'iframe-refresh':
                    that.refresh()
                    _reply.call(that, data, 'Osadzenie zostało odświeżone!')
                break;

                case 'iframe-run':
                case 'iframe-auto':
                case 'iframe-start':
                    that.refresh()
                    _reply.call(that, data, 'Auto-osadzanie streamerów zostało włączone');
                break;

                case 'iframe-stop':
                    that.stop();
                    _reply.call(that, data, 'Auto-osadzanie zostało wyłączone!');
                break;

                case 'iframe':
                case 'iframe-add':
                    var urls = args
                    if (_.size(urls) > 0) {
                        var modified = false
                        urls.forEach(function(url) {
                            var m = createModel(url)
                            if (!_.find(that.customStreams, function(s) { return m.platform === s.platform && (s.id === m.id || s.streamId === m.id); })) {
                                modified = true
                                that.customStreams.push(m)
                            } else {
                                _reply.call(that, data, `Stream ${url} dodano już wcześniej!`);
                            }
                        });
                        if (modified) {
                            that.refresh();
                        }
                    } else {
                        _sendMessage.call(this, streamsList(), data.channel)
                    }
                break;

                case 'iframe-remove':
                case 'iframe-delete':
                    var ids = _.trim(args.join(' ')).split(';')
                    if (_.size(ids) > 0) {
                        var modified = false
                        for (var i in ids) {
                            var id = ids[i]
                            var m = normalizeStreamId(id) || {}
                            var stream = _.find(that.customStreams, m.platform !== 'unknown' ? {platform: m.platform, id: m.id || m.url} : {id: m.id || m.url}) || _.find(that.customStreams, m.platform !== 'unknown' ? {platform: m.platform, streamId: m.id || m.url} : {streamId: m.id || m.url}) || _.find(that.customStreams, m.platform !== 'unknown' ? {platform: m.platform, url: m.url} : {url: m.url})
                            if (stream) {
                                modified = true
                                that.customStreams = _.difference(that.customStreams, [stream]);
                                _reply.call(that, data, `Usunięto ręcznie dodanego streama: ${stream.name || stream.id}${stream.title ? ' - ' + stream.title : ''}`)
                            } else {
                                _reply.call(that, data, `Nie znaleziono ręcznie dodanego streama: ${m.name || m.id || id}`);
                            }
                        }
                        if (modified) {
                            that.refresh()
                        }
                    }
                break;

                case 'iframe-remove-all':
                case 'iframe-delete-all':
                    if(_.size(that.customStreams)) {
                        _reply.call(that, data, 'Usunięto wszystkie manualne osadzenia')
                        that.customStreams = [];
                        that.refresh()
                    }
                break;

                case 'iframe-list':
                    _reply.call(that, data, streamsList())
                break;
            };
        });
    }

    ignore(names) {
        let oldIgnored =_.castArray(this.ignoreStreamers);
        let newIgnored = Array.from(new Set(oldIgnored.concat(_.castArray(names))));
        if (!_.isEqual(oldIgnored, newIgnored)) {
            let diffs = _.without.apply(_, [newIgnored].concat(oldIgnored));

            this.ignoreStreamers = newIgnored;
            this.run();

            debug('Ignore streamer: %o\nAll ignored streamers: %o', diffs, this.ignoreStreamers);
            return diffs;
        }
        return false;
    }

    execute(callback = _.noop) {
        var that = this

        var isNeedRefresh = function(data) {
            return !_.isEqualWith(data.sort(), that.lastReceivedStreamers.sort(), function(a, b) {
                var convert = function(data) {
                    return {
                        platform: (data.platform || 'unknown').toLowerCase(),
                        streamId: (data.streamId || '').toLowerCase()
                    }
                }

                if (a === b) return true;
                if (a == null || b == null) return false;
                if (a.length != b.length) return false;

                for (var i = 0; i < a.length; ++i) {
                    if (!_.isEqual(convert(a), convert(b))) {
                        return false;
                    }
                }

                return true;
            })
        }

        // Steps
        var getOnlineStreams = function(urls) {
            let _getOnlineStreams = (url) => !url ? Promise.resolve() : RequestPromise({ uri: url, json: true })
                                            .then((data) => Promise.resolve(_.map(data, convertRawToModel.bind(this))));

            return Promise.map(_.castArray(urls), _getOnlineStreams.bind(this))
                    .then((data) => Promise.resolve(_.chain(data)
                        .flattenDeep()
                        .filter('online')
                        .filter((data) => !_.find(that.ignoreStreamers, (ignore) => data && ignore && (normalizeId(ignore) === normalizeId(data.id))))
                        .value()));
        }

        var extendStreamInformations = function(streams) {
            let _extendContentInformations = (stream) => {
                 switch ((stream || {}).platform) {
                     case 'youtube':
                         return extendYouTubeStreamInformations.call(this, stream);
                     case 'showup':
                         return extendShowUpStreamInformations.call(this, stream);
                 }

                 stream.embeddable = true
                 return Promise.resolve(stream)
            };

            return Promise.map(_.castArray(streams), _extendContentInformations.bind(this))
                .then((stream) => Promise.resolve(_.flattenDeep(stream)));
        }

        var extendYouTubeStreamInformations = function(data) {
            let id = data.streamId
            return getYouTubeStreamData(id, this.youTubeApiKey)
                    .then(function (ytData) {
                        if (ytData.snippet) {
                            let name = ytData.snippet.channelTitle || data.id
                            data.id = normalizeId(name)
                            data.name = name
                            data.title = ytData.snippet.title || ''
                        }
                        if (ytData.status) {
                            data.embeddable = id && ytData.status.embeddable !== false
                        }
                        return Promise.resolve(data)
                    })
                    .catch((error) => {
                        debug('Error while gathering details of stream %s (%s): %o', data.name || data.id, 'youtube', error);
                        if (_.isNil(data.embeddable)) {
                            data.embeddable = !!id;
                        }
                        return Promise.resolve(data);
                    });
        }

        var extendShowUpStreamInformations = function(data) {
            var showupUrl = 'beta.showup.tv'
            var jarFemale = RequestPromise.jar();
            jarFemale.setCookie(new Cookie.Cookie({ key: "accept_rules", value: "true", domain: showupUrl, httpOnly: false }), 'https://' + showupUrl);
            jarFemale.setCookie(new Cookie.Cookie({ key: "category", value: "female", domain: showupUrl, httpOnly: false }), 'https://' + showupUrl);
            var jarMale = RequestPromise.jar();
            jarMale.setCookie(new Cookie.Cookie({ key: "accept_rules", value: "true", domain: showupUrl, httpOnly: false }), 'https://' + showupUrl);
            jarMale.setCookie(new Cookie.Cookie({ key: "category", value: "male", domain: showupUrl, httpOnly: false }), 'https://' + showupUrl);
            return Promise.all([
                        RequestPromise({ method: 'GET', jar: jarFemale, uri: 'https://' + showupUrl + '/site/trans_list/get_list/big', json: true }),
                        RequestPromise({ method: 'GET', jar: jarMale, uri: 'https://' + showupUrl + '/site/trans_list/get_list/big', json: true })
                ]).reduce(function(prev, cur) {
                    return prev.concat(cur);
                }, [])
                .then(function(json) {
                    var stream = _.chain(json)
                        .find(function(e) {
                            var name = e.username;
                            return normalizeId(name) === data.id || name === data.streamId;
                        })
                        .value()

                    if (stream) {
                        var name = (stream || {}).username || data.id
                        data.id = normalizeId(name)
                        data.name = name
                        data.title = (stream || {}).description || data.title
                        data.streamId = (stream || {}).stream_id || data.streamId
                        data.viewers = (stream || {}).viewers || data.viewers
                        data.embeddable = !!stream;
                    } else {
                        debug(`No found any details for stream: ${data.name || data.id} (showup)!`)
                    }

                    return Promise.resolve(data)
                })
        }


        var prepareEmbeddableContent = function(data) {
            return Promise.map(data || [], prepareEmbeddableContentGeneric)
                .reduce(function(prev, cur) {
                    return prev.concat(cur);
                }, [])
                .then(function(contents) {
                    return Promise.resolve({
                        contents: contents,
                        data: data
                    })
                })
        }

        var prepareEmbeddableContentGeneric = function(data) {
            switch ((data || {}).platform) {
                case 'youtube':
                    return prepareEmbeddableContentForYoutube(data)
                case 'showup':
                    return prepareEmbeddableContentForShowup(data)
                case 'chaturbate':
                    return prepareEmbeddableContentForChaturbate(data)
            }
            return prepareEmbeddableContentForCustom(data)
        }

        var prepareEmbeddableContentForYoutube = function(data) {
            return Promise.resolve(data.embeddable ? `https://www.youtube.com/embed/${data.streamId}?autoplay=1` : null)
        }

        var prepareEmbeddableContentForShowup = function(data) {
            return data.embeddable ? generateHtmlShowUp(data).then(utils.uploadHtml) : Promise.resolve(null)
        }

        var prepareEmbeddableContentForChaturbate = function(data) {
            return Promise.resolve(data.embeddable ? `https://chaturbate.com/embed/${data.streamId}/?bgcolor=transparent&campaign=NCVrd&tour=Jrvi&embed_video_only=1&target=_parent` : null)
        }

        var prepareEmbeddableContentForCustom = function(data) {
            return Promise.resolve(data ? data.url || data.streamId : data)
        }


        var mergeContents = function(data) {
            var urls = _.uniq(_.compact(data.contents))
            var promise = Promise.resolve(_.first(urls))
            if (_.size(urls) > 1) {
                promise = generateHtmlMultipleIframes(urls).then(utils.uploadHtml)
            }
            return promise.then(function(url) { return Promise.resolve(_.extend({ mergeContents: url }, data)) })
        }


        var executeCommands = function(data) {
            var url = data.mergeContents
            if (url) {
                that.embed(url)
                    .then(function() {
                        var messages = _.chain(data.data)
                            .map(function(stream) {
                                 if (stream.embeddable || (!stream.platform || stream.platform === 'unknown')) {
                                     return `Osadzono: ${stream.name || stream.id}${stream.title ? ' - ' + stream.title : ''}${stream.platform && stream.platform !== 'unknown' ? ', ' + (stream.custom ? 'custom ' : '') + stream.platform : ''}${stream.viewers ? ', ' + stream.viewers + ' widzów' : ''}${stream.views ? ' / ' + stream.views + ' wyświetleń' : ''}`
                                 }
                                 debug(`Stream ${stream.name || stream.id} is not embeddable - will be ignored!`)
                                 return null
                            })
                            .compact()
                            .value()

                        for (var i in messages) {
                            _sendMessage.call(that, messages[i])
                        }
                    })
            }
        }

        // HTML
        var generateHtmlMultipleIframes = function(urls) {
            var templateStart = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="width: 100vw; height: 100vh; display: flex; margin: 0; padding: 0; border: 0; align-items: center; justify-content: center; flex-direction: row; flex-wrap: wrap; flex-flow: row wrap; align-content: flex-end; columns: 2 auto; ">',
                templateEnd = '</body></html>'
            var template = '<iframe src="#URL#" style="width: #WIDTH#; height: #HEIGHT#; border: 0; margin: 0; padding: 0;"></iframe>'
            var height = _.size(urls) == 2 ? 50 : (100 / Math.min(Math.ceil(_.size(urls) / 2)))

            var body = _.chain(urls)
                .map(function(url, index) {
                    var width = _.size(urls) == 2 ? 100 : (index === (_.size(urls) - 1) && _.size(urls) % 2 === 1 ? 100 : 50)
                    return template.replace('#URL#', url)
                        .replace('#HEIGHT#', height + '%')
                        .replace('#WIDTH#', width + '%')
                })
                .value()
            return Promise.resolve(_.size(body) > 0 ? templateStart + body.join('') + templateEnd : null)
        }

        var generateHtmlShowUp = function(data) {
            var template = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://vjs.zencdn.net/6.6.3/video-js.css" rel="stylesheet"> <script src="https://vjs.zencdn.net/6.6.3/video.js"></script> <script src="https://cdn.jsdelivr.net/npm/videojs-flash@2/dist/videojs-flash.min.js"></script> <style> .video-js, #video { position: relative !important; width: 100% !important; height: 100vh !important;}.video-js.vjs-playing .vjs-tech {pointer-events: none;} .video-js .vjs-control.vjs-play-control.vjs-playing, .video-js .vjs-progress-control, .video-js .vjs-time-control { display: none; } </style></head><body style="width: 100vw; height: 100vh; margin: 0; padding: 0; border: 0; overflow: hidden; background: #000;"><center><video id="video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" data-setup=\'{"techOrder": ["flash", "html5"]}\'><source type="rtmp/mp4" src="#URL#"></video></center> <script>videojs(document.getElementById(\'video\')).on(\'play\', function(video) { setTimeout(function() {document.getElementById(\'video\').setAttribute(\'style\', \'width: 99.9%!important\'); }, 300); }); </script></body></html>'
            return Promise.resolve(data.streamId ? template.replace('#URL#', `rtmp://5.135.128.167/liveedge/${data.streamId}`) : null)
        }

        return getOnlineStreams(this.api)
            .then((data) => Promise.resolve(_.uniqBy(data.concat(this.customStreams), 'streamId', 'platform')))
            .then((data) => isNeedRefresh(data) ? Promise.resolve(this.lastReceivedStreamers = data) : Promise.reject('No found changes'))
            .then((data) => {
                if(!_.size(data)) {
                    this.embed();
                    return Promise.reject('No streams');
                }
                return Promise.resolve(data);
            })
            .then(extendStreamInformations.bind(this))
            .then(prepareEmbeddableContent.bind(this))
            .then(mergeContents.bind(this))
            .then(executeCommands.bind(this))
            .then((data) => (callback || _.noop)(data, null), (error) => {
                debug('External API - received reject: %o', error);
                return (callback || _.noop)(null, error);
            });
    }

    embed(url) {
        if (url && url.trim()) {
            debug('Embedding page: %s' , url);
            return _sendMessage.call(this, `/iframe ${url}`);
        }

        debug('Cleanup embed')
        return _sendMessage.call(this, '/iframe ');
    }
}

let getYouTubeStreamData = function (id, key) {
    if (!id) {
        return Promise.reject('No id of youtube stream!')
    }
    if (!key) {
        return Promise.reject('No key to YouTube API!');
    }
    return RequestPromise({ method: 'GET', uri: `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${key}&part=snippet,status`, json: true })
        .then((ytData) => {
            let data = _.first((ytData || {}).items)
            return data && data.status ? Promise.resolve(data) : Promise.reject('No status of youtube stream!');
        });
}

module.exports = Embedder;

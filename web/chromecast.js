var chromecast = new (function() {
  var self = this;
  self.appId = undefined;
  self.namespace = 'urn:x-cast:message';

  if (navigator.userAgent.indexOf('CrKey') >= 0) {
    // we are inside of ChromeCast :-)
    document.write('<script type="text/javascript" src="https://www.gstatic.com/cast/sdk/libs/receiver/2.0.0/cast_receiver.js" async></script>');

    window.addEventListener('load', function() {
      var castReceiverManager = cast.receiver.CastReceiverManager.getInstance();

      castReceiverManager.onReady = function(e) {
        console.log('Received Ready event: ' + JSON.stringify(e.data));
        castReceiverManager.setApplicationState("ready");
      };

      var messageBus = castReceiverManager.getCastMessageBus(self.namespace);
      messageBus.onMessage = function(e) {
        console.log('Incoming message: ' + JSON.stringify(e.data));
        document.dispatchEvent(new CustomEvent('message', {detail: e.data}));
        messageBus.send(e.senderId, e.data);
      };

      castReceiverManager.start({statusText: 'starting'});
    });
  }
  else if (navigator.userAgent.indexOf('Chrome') >= 0 && navigator.userAgent.indexOf('CrKey') < 0) {
    document.write('<script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js" async></script>');

    window['__onGCastApiAvailable'] = function(loaded, error) {
      if (loaded) self.init(self.appId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      else console.log(error);
    };
  }

  var session;
  var receiverAvailable = false;
  var nop = function() {};
  var onerror = function(e) {console.log(e)};
  var queue = [];

  self.send = function(url, callback) {
    if (session) loadMedia(url, callback);
    else queue.push([url, callback]);
  };

  self.message = function(message, callback) {
    session.sendMessage(self.namespace, message, callback || nop, onerror);
  };

  self.init = function(appId, callback) {
    var sessionRequest = new chrome.cast.SessionRequest(appId);
    var apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionListener, receiverListener);
    chrome.cast.initialize(apiConfig, callback || nop, onerror);
  };

  self.launch = function() {
    if (!session) {
      chrome.cast.requestSession(sessionListener);
    }
  };

  self.stop = function(callback) {
    if (session) {
      session.stop(callback, onerror);
      session = null;
    }
  };

  function sessionListener(s) {
    session = s;
    if (queue.length) loadMedia.apply(self, queue.pop());
  }

  function receiverListener(e) {
    if (e === chrome.cast.ReceiverAvailability.AVAILABLE) {
      receiverAvailable = true;
    }
  }

  function loadMedia(url, callback) {
    var mediaInfo = new chrome.cast.media.MediaInfo(url);
    mediaInfo.metadata = new chrome.cast.media.PhotoMediaMetadata();
    mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.PHOTO;
    mediaInfo.contentType = 'image/jpg';

    var request = new chrome.cast.media.LoadRequest(mediaInfo);
    request.autoplay = true;
    request.currentTime = 0;
    session.loadMedia(request, callback || nop, onerror);
  }
})();

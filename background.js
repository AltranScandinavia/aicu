
var KEYS = {personalNewsFeed: 'PERSONAL_NEWS_FEED', internalNews: 'INTERNAL_NEWS_FEED', altranForum: 'ALTRAN_FORUM', altranEvents: 'ALTRAN_EVENT_CALENDAR'};

var BASE_URL      = 'https://altranintranet.sharepoint.com';

var PERSONAL_NEWS_FEED = '/_api/social.feed/my/news';
var INTERNAL_NEWS_FEED = "/news/_api/web/lists/getbytitle('posts')/items?$orderby=Modified desc";
var ALTRAN_FORUM       = "/AltranForum/_api/web/lists/getbytitle('Discussions List')/items?$orderby=Modified desc";
var ALTRAN_EVENTS      = "/AltranEventCalendar/_api/web/lists/getbytitle('EventCalendar')/items?$orderby=Modified desc";


function BackgroundPoller () {

};

BackgroundPoller.prototype.incrementBadgeText = function() {
  chrome.browserAction.getBadgeText({}, function (text) {
    var badgeText = '1';
    if (!isNaN(parseInt(text))) {
      badgeText = parseInt(text, 10) + parseInt(badgeText, 10);
    }
    chrome.browserAction.setBadgeText({'text':''+badgeText});
  });
};

BackgroundPoller.prototype.fetchData = function (URL, callback) {
  var me = this;
  $.ajax({
    'url': URL,
    'type': 'GET',
    'dataType': 'json',
    'success': function(data) { 
      callback(data);
    },
    'error': function(err) { console.log('ERROR!'); console.log(err); },
    'beforeSend': setHeader
  });
  function setHeader(xhr) {
    xhr.setRequestHeader('Accept', 'application/json;odata=verbose');
  } 
};

BackgroundPoller.prototype.checkPersonalNewsFeed = function () {
  var me = this;
  
  function checkPersonalNewsFeedData(data) {
    var latestUpdate = data.d.SocialFeed.NewestProcessed;

    chrome.storage.local.get('PERSONAL_NEWS_FEED', function (newsFeedItems) {
      var lastStoredDate = new Date();
      var newsFeedItem = newsFeedItems['PERSONAL_NEWS_FEED'];
      
      if (newsFeedItem && newsFeedItem.newestProcessed) {
        lastStoredDate = new Date(newsFeedItem.newestProcessed);
      }
      var lastPolledDate = new Date(data.d.SocialFeed.Threads.results[0].RootPost.ModifiedTime);

      if (lastStoredDate.toString() != lastPolledDate.toString()) {
        console.log('new item found, display notification');
        newsFeedItem = { 'newItemFound': true, 'newestProcessed': lastPolledDate.toString()};
        chrome.storage.local.set({'PERSONAL_NEWS_FEED': newsFeedItem}, function() {
          if (chrome.extension.lastError) {
            console.log('An error occurred: ' + chrome.extension.lastError.message);
          }
        });
        me.incrementBadgeText();
       
      }
    });
  }
  me.fetchData(BASE_URL + PERSONAL_NEWS_FEED, checkPersonalNewsFeedData);
};

BackgroundPoller.prototype.checkInternalNewsFeed = function () {
  var me = this;
  me.checkList.call(me, 'INTERNAL_NEWS_FEED', BASE_URL + INTERNAL_NEWS_FEED);

};
 
BackgroundPoller.prototype.checkAltranForum = function () {
  var me = this;
  me.checkList.call(me, 'ALTRAN_FORUM', BASE_URL + ALTRAN_FORUM);

};

BackgroundPoller.prototype.checkAltranEvents = function () {
  var me = this;
  me.checkList.call(me, 'ALTRAN_EVENT_CALENDAR', BASE_URL + ALTRAN_EVENTS);

};
BackgroundPoller.prototype.checkList = function (storageKey, listUrl) {
  var me = this;
  
  function checkListDataForChanges(data) {
    var latestUpdate = data.d.results[0].Modified;
    
    chrome.storage.local.get(storageKey, function (listDataItems) {
      var lastStoredDate = new Date();
      var newsFeedItem = listDataItems[storageKey];

      if (newsFeedItem && newsFeedItem.newestProcessed) {
        lastStoredDate = new Date(newsFeedItem.newestProcessed);
      }
      var lastPolledDate = new Date(data.d.results[0].Modified);

      if (lastStoredDate.toString() != lastPolledDate.toString()) {
        newsFeedItem = { 'newItemFound': true, 'newestProcessed': lastPolledDate.toString()};
        var itemData = {};
        itemData[storageKey] = newsFeedItem;
        chrome.storage.local.set(itemData, function() {
          if (chrome.extension.lastError) {
            console.log('An error occurred: ' + chrome.extension.lastError.message);
          }
        });
        me.incrementBadgeText();
      }
    });
  }
  me.fetchData(listUrl, checkListDataForChanges);
};

var backgroundPoller = new BackgroundPoller();

function pollSP() {

  console.log('requesting personal DATA');
  backgroundPoller.checkPersonalNewsFeed();
  
  console.log('requesting internal DATA');
  backgroundPoller.checkInternalNewsFeed();
  
  console.log('requesting forum DATA');
  backgroundPoller.checkAltranForum();

  console.log('requesting event DATA');
  backgroundPoller.checkAltranEvents();
  
  setTimeout(function() {
    pollSP();
  }, 10*60*1000);
}

pollSP();
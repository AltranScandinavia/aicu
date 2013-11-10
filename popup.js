// Shows the new item and removed the badge from the extension icon
var KEYS = {personalNewsFeed: 'PERSONAL_NEWS_FEED', internalNews: 'INTERNAL_NEWS_FEED', altranForum: 'ALTRAN_FORUM', altranEvents: 'ALTRAN_EVENT_CALENDAR'};

var decrementBadgeText = function() {
  chrome.browserAction.getBadgeText(function (text) {
    var badgeText = '';
    if (!isNaN(paraseInt(text))) {
      badgeText = (parseInt(text, 10)-1);
      badgeText = badgeText > 0 ? badgeText : '';
    }
    chrome.browserAction.setBadgeText({'text':''+badgeText});
  });
};

var showUnreadLists = {
  showPersonalNewsFeed: function () {
    var me = this;
    chrome.storage.local.get('PERSONAL_NEWS_FEED', function (newsFeedItems) {
      var newsFeedItem = newsFeedItems['PERSONAL_NEWS_FEED'];
      
      var newItemsFound = !(newsFeedItem !== undefined && newsFeedItem.newItemFound == false);

      me.createLink.call(me, newItemsFound, 'personal');

      var lastStoredDate = (!newsFeedItem || !newsFeedItem.newestProcessed) ? new Date().toString : newsFeedItem.newestProcessed;
      newsFeedItem = { 'newItemFound': false, 'newestProcessed': lastStoredDate};
      
      chrome.storage.local.set({'PERSONAL_NEWS_FEED': newsFeedItem}, function() {
        if (chrome.extension.lastError) {
          console.log('An error occurred: ' + chrome.extension.lastError.message);
        }
      });
      chrome.browserAction.setBadgeText({'text':''});
    });
  },
  showInternalNewsFeed: function () {
    var me = this;
    me.showLinkForItem.call(me, 'INTERNAL_NEWS_FEED', 'internal');

  },  
  showAltranForum: function () {
    var me = this;
    me.showLinkForItem.call(me, 'ALTRAN_FORUM', 'forum');

  },    
  
  showAltranEvents: function () {
    var me = this;
    me.showLinkForItem.call(me, 'ALTRAN_EVENT_CALENDAR', 'event');
  },  
  showLinkForItem: function (storageKey, linkName) {
    var me = this;
    chrome.storage.local.get(storageKey, function (newsFeedItems) {
      var newsFeedItem = newsFeedItems[storageKey];
      
      var newItemsFound = !(newsFeedItem !== undefined && newsFeedItem.newItemFound == false);
      me.createLink.call(me, newItemsFound, linkName);

      var lastStoredDate = (!newsFeedItem || !newsFeedItem.newestProcessed) ? new Date().toString : newsFeedItem.newestProcessed;
      newsFeedItem = { 'newItemFound': false, 'newestProcessed': lastStoredDate};
      var data = {};
      data[storageKey] = newsFeedItem;
      chrome.storage.local.set(data, function() {
        if (chrome.extension.lastError) {
          console.log('An error occurred: ' + chrome.extension.lastError.message);
        }
      });
      chrome.browserAction.setBadgeText({'text':''});
    });
  },  

  
  createLink: function (newItemsFound, linkName) {
    var link = document.getElementById(linkName+'-link');
    if (newItemsFound) {
      link.classList.add('new_items_found');
    } else {
      link.classList.remove('new_items_found');
    }
  }
};

document.addEventListener('DOMContentLoaded', function () {
  showUnreadLists.showPersonalNewsFeed();
  showUnreadLists.showInternalNewsFeed();
  showUnreadLists.showAltranForum();
  showUnreadLists.showAltranEvents();
});

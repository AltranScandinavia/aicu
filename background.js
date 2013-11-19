// Checks the current user's followed sites for updates.
// If an item has been modified or added since last time the script was run, 
// the change will be stored to local storage and the badge-text will be updated.
// popup.html is called when clicking on the extension badge.

var BASE_URL = 'https://altranintranet.sharepoint.com';

var POLL_INTERVAL_IN_MINUTES = 10;

function BackgroundPoller () {

};
// Increments chrome extension badge text
BackgroundPoller.prototype.incrementBadgeText = function() {
  chrome.browserAction.getBadgeText({}, function (text) {
    var badgeText = '1';
    if (!isNaN(parseInt(text))) {
      badgeText = parseInt(text, 10) + parseInt(badgeText, 10);
    }
    chrome.browserAction.setBadgeText({'text':''+badgeText});
  });
};

// Generic ajax sharepoint call
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

// Builds the list templates filter. Only check for updates in lists of these types.
// With memoization.
BackgroundPoller.prototype.templateFilterBuilder = function () {
  // Only check for updates in lists that are in these categories:
  
  // http://mirusp2010.blogspot.se/2013/03/list-template-id.html
  // 101   Document library
  // 103   Links list
  // 104   Announcements list
  // 106   Events list
  // 107   Tasks list
  // 108   Discussion board
  // 119   Wiki Page library
  // 301   Blog Posts list
  // 302   Blog Comments list

  if (!this.templateFilter) {
    var followedTemplates = [101, 103, 104, 106, 107, 108, 119, 301, 302];
    this._templateFilter = ''; 
    for (var i = 0; i<followedTemplates.length; i++) {
      this._templateFilter+='(BaseTemplate eq ' + followedTemplates[i] + ')';
      if (followedTemplates.length>(i+1)) {
        this._templateFilter+= ' or ';
      }
    }; 
  }
  return this._templateFilter;
};

// Fetch the sites the current user is following
BackgroundPoller.prototype.checkFollowedSites = function () {
  
  var sitesURL = BASE_URL + '/_api/social.following/my/followed(types=4)?$orderby=Name asc';
  var me = this;
  var followedSitesCallback = function(data) { 

    var followedSites = data.d.Followed.results;
    var i = 0;
    var siteName, siteUrl;
    for (i = 0; i<followedSites.length; i++) {
      siteName = followedSites[i].Name;
      siteUrl = followedSites[i].Uri;
      me.fetchFollowedListsForSite(followedSites[i]);
      if ( i > 2) {
        //break; // testilitest ********************************************************
      }
    }
  };
  this.fetchData(sitesURL, followedSitesCallback);
  
};

// Checka the lists following the filter for the given site.
BackgroundPoller.prototype.fetchFollowedListsForSite = function (site) {
  
  if (site.Uri.indexOf('sharepoint.com:443/personal/') != -1) {
    return; // Ignore personal site
  }
  if (site.Uri.indexOf('https://altranintranet.sharepoint.com:443/News') == -1) {    
    //return; // Only test news-site to simplify debugging  
  }
  
  var me = this;
  var templateFilter = me.templateFilterBuilder.call(me);
  
  var listsURL = site.Uri + '/_api/lists?$filter=' + templateFilter;
  var checkListsForUpdatesCb = function (lists) {
    me.checkListsForUpdates(site, lists);
  };
  backgroundPoller.fetchData(listsURL, checkListsForUpdatesCb);
};

// Go through the given lists of the given site to check for any updates since last check.
BackgroundPoller.prototype.checkListsForUpdates = function (site, lists) {
  var me = this;
  var siteLists = lists.d.results;
  
  chrome.storage.local.get(site.Id, function (storedData) {
    var siteObject = storedData[site.Id];
    siteObject = siteObject == undefined ? {} : siteObject;
    siteObject.name = site.Name;
    siteObject.id = site.Id;
    siteObject.url = site.Uri;

    var updatedLists = [];
    
    // Deferred/promise so the storedUpdatedLists() only gets called once 
    // to prevent storing/writing over by competing async functions.
    var onComplete = function(listToStore) {
      updatedLists.push(listToStore);
      if (updatedLists.length === siteLists.length) {
        me.storeUpdatedLists(site, updatedLists);
      }
    };
    var i = 0;
    var listTitle, listId;
    for (i = 0; i<siteLists.length; i++) {
      var list = siteLists[i];
      var storedList = me.getListById(list.Id, siteObject.lists);
      me.checkListForUpdates(site, list, storedList, onComplete);
    }
  });
};

// Returns the list with the given Id
BackgroundPoller.prototype.getListById = function (listId, lists) {
  if (lists===undefined || lists.length===0) {
    return undefined;
  }
  var i;
  for (i=0; i<lists.length; i++) {
    if (lists[i].id === listId) {
      return lists[i];
    }
  }
  return undefined;
};

// Compare the items of the list fetched from SP with the stored list to see which ones (if any) that have been modified since last check.
// The function must cope with lists that migth not have been previously stored.
// The onComplete-callback works like a deferred/promise - when all lists of the site have been checked the complete site is stored. 
BackgroundPoller.prototype.checkListForUpdates = function (site, list, storedList, onComplete) {
  var me = this;
  var itemsUrl = site.Uri + "/_api/Web/Lists(guid'" + list.Id + "')/Items?$orderby=Modified desc";
  
  var itemsCallback = function(items) {
    
    if (storedList == undefined) {
      // List not previoiusly stored, add it.
      var listToStore = { 
        'id': list.Id,
        'title': list.Title,
        'newItemFound': false, 
        'newestProcessed': new Date(list.LastItemModifiedDate).toString(), 
        'newItems': []
      };
                        
      onComplete(listToStore);
    } else {
      // Compare new list to previously stored list
      var lastStoredDate = new Date(storedList.newestProcessed);

      var lastPolledDate = new Date(list.LastItemModifiedDate);
      if (lastStoredDate.toString() != lastPolledDate.toString()) {
        // New items found
        var listToStore = { 
          'id': list.Id,
          'title': list.Title,
          'newItemFound': true, 
          'newestProcessed': lastPolledDate.toString(), 
          'newItems': []
        };  
        items = items.d.results;
        var newItems = [];
        var i, newItem, item, modified;
        for (i=0; i<items.length; i++) {
          item = items[i];
          modified = new Date(item.Modified);
          if (modified > lastStoredDate) {
            newItem = {
              'title': item.Title, 
              'created': item.Created, 
              'modified': item.Modified, 
              'type': item.__metadata.type
            };
            newItems.push(newItem);
          }
        }
        listToStore.newItems = newItems;
        onComplete(listToStore);
        me.incrementBadgeText();
      } else {
        // No new items
        var listToStore = {
          'id': list.Id,
          'title': list.Title,
          'newItemFound': false,
          'newestProcessed': lastStoredDate.toString(),
          'newItems': []
        };
        onComplete(listToStore);
      }
    }
  };
  me.fetchData(itemsUrl, itemsCallback);
};

// Stores the site object with the site Id as key.
// Looks something like this:
// {
//  '8.6deac5c6...': {
//    id: '8.6deac5c6...',
//    lists: [
//      id: '08ad0b27..',
//      newItemFound: true,
//      newItems: [
//        {
//          title: 'A comment...', 
//          created: '2013-11-01....', 
//          modified: '2013-11-01....', 
//          type: 'SP.Data.CommentsListItem'
//        }
//      ]
//    ],
//    name: 'Altran Forum',
//    url: 'https://altranintranet.shareoiunt.com:443/sites../...'
//  },
//  '8.25c3231...': {
//    id: '8.25c3231...',
//    ...
//  }
// }
// Print local storage contents with: 
//  chrome.storage.local.get(function(data) { console.log(data); });
// 
BackgroundPoller.prototype.storeUpdatedLists = function (site, lists) {
  var me = this;
  var siteObject = {};
  siteObject.name = site.Name;
  siteObject.id = site.Id;
  siteObject.url = site.Uri;
  siteObject.lists = lists;
  var itemData = {};
  itemData[site.Id] = siteObject;
  chrome.storage.local.set(itemData, function() {
    if (chrome.extension.lastError) {
      console.log('An error occurred: ' + chrome.extension.lastError.message);
    }
  });
};

var backgroundPoller = new BackgroundPoller();
function pollSP() {
  
  console.log('Checking followed sites...     timestamp: ' + new Date().toISOString() );
  backgroundPoller.checkFollowedSites();
  
  setTimeout(function() {
    pollSP();
  }, POLL_INTERVAL_IN_MINUTES*60*1000);
}

pollSP();
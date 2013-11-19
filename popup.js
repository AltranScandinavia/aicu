// Shows the new items and removes the badge from the extension's icon
function UnreadContent() {
};

// Populate the popup with the followed sites and their lists, and any show any changes that have been found
// After the popup has been shown, reset the stored lists
UnreadContent.prototype.display = function() {
  var me = this;
  chrome.storage.local.get(function(data) { 
    var storedSite;
    for (key in data) {
      if (!data.hasOwnProperty(key)) continue;
      storedSite = data[key];
      me.displayUpdatesForSite(storedSite);
    }
    me.clearNewItemsForSites(data);
    chrome.storage.local.set(data, function() {
      if (chrome.extension.lastError) {
        console.log('An error occurred: ' + chrome.extension.lastError.message);
      }
    });
    chrome.browserAction.setBadgeText({'text':''});
  });
  
};

// Create the html-elements for the popup from the stored site data
UnreadContent.prototype.displayUpdatesForSite = function(site) {
  var siteContainer = $('<div id="' + site.id + '" class="site-container"/>');
  
  var siteHeader = $('<h4><a class="site-link" href="' + site.url + '" target="_blank">' + site.name + '</a></h4>');
  siteContainer.append(siteHeader);
  
  var i, j, list, items, sectionElem, listTitleElem, listElem, anyNewItemsFound = false;
  for (i=0; i<site.lists.length; i++) {
    list = site.lists[i];
    if (list.newItemsFound === false || list.newItems.length === 0) continue;
    anyNewItemsFound = true;
    
    sectionElem = $('<section></section')
    listTitleElem = $('<h5 class="list-header">' + list.title + '</h5>');
    sectionElem.append(listTitleElem);
    listElem = $('<ul class="list-items" />');
    for (j=0; j<list.newItems.length; j++) {
      listElem.append($('<li class="list-item">' + list.newItems[j].title + '</li>'));
    }
    
    sectionElem.append(listElem);
    siteContainer.append(sectionElem);
  }

  if (anyNewItemsFound === false) {
    siteContainer.append('<em class="no-new-items">No new items</em>');
  }
  siteContainer.append($('<hr class="site-underline"/>'));
  $('div.main-container').append(siteContainer);
};

// Go through all sites and clear them from updates 
UnreadContent.prototype.clearNewItemsForSites = function(sites) {
  var me = this;
  var storedSite;
  for (key in sites) {
    if (!sites.hasOwnProperty(key)) continue;
    storedSite = sites[key];
    me.clearNewItemsForSite(storedSite);
  }
};

// Set the newItemFound to false and clear the newItems-list
UnreadContent.prototype.clearNewItemsForSite = function(site) {
  var i;
  var lists = site.lists;
  console.log('site');
  console.log(site);
  for (i = 0; i<lists.length; i++) {
    var list = lists[i];
    console.log('list');
    console.log(list);
    list.newItemFound = false;
    list.newItems = [];
  }
};

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

// This is triggered whenever the badge is pressed and the popup is about to be displayed
document.addEventListener('DOMContentLoaded', function () {
  var unreadContent = new UnreadContent();
  unreadContent.display();
});

// Shows the new items and removes the badge from the extension's icon

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

function UnreadContent() {

};

UnreadContent.prototype.display = function() {
  var me = this;
  chrome.storage.local.get(function(data) { 
    var storedSite;
    for (key in data) {
      if (!data.hasOwnProperty(key)) continue;
      storedSite = data[key];
      me.displayUpdatesForSite(storedSite);
    }
  });
  chrome.browserAction.setBadgeText({'text':''});
};

UnreadContent.prototype.displayUpdatesForSite = function(site) {
  // Create the html-elements from the stored site data
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

document.addEventListener('DOMContentLoaded', function () {
  var unreadContent = new UnreadContent();
  unreadContent.display();
});

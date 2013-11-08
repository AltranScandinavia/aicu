// Shows the new item and removed the badge from the extension icon

var showUnreadLists = {
  showNewsFeed: function (e) {
    var me = this;
    chrome.storage.local.get('NewsFeed', function (newsFeedItems) {
      var newsFeedItem = newsFeedItems['NewsFeed'];
      console.log(newsFeedItem);
      
      var linkText = 'News Feed';
      if (newsFeedItem !== undefined && newsFeedItem.newItemFound == false) {
        linkText = 'No News';
      }
      me.createLink.call(me, linkText);

      var lastStoredDate = (!newsFeedItem || !newsFeedItem.newestProcessed) ? new Date().toString : newsFeedItem.newestProcessed;
      newsFeedItem = { 'newItemFound': false, 'newestProcessed': lastStoredDate};
      
      chrome.storage.local.set({'NewsFeed': newsFeedItem}, function() {
        if (chrome.extension.lastError) {
          console.log('An error occurred: ' + chrome.extension.lastError.message);
        }
      });
      chrome.browserAction.setBadgeText({'text':''});
    });
  },
  createLink: function (linkText) {
    var div = document.createElement('div');
    var anchor = document.createElement('a');
    anchor.innerHTML = linkText;
    anchor.href = 'https://altranintranet.sharepoint.com';
    anchor.target = '_blank';
    div.appendChild(anchor);
    document.body.appendChild(div); 
  }
};

document.addEventListener('DOMContentLoaded', function () {
  showUnreadLists.showNewsFeed();
});

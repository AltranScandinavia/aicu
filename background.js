// SP OBJ:
// xml.SPXML.d.SocialFeed.Threads.results[0].RootPost.Text
// xml.SPXML.d.SocialFeed.Threads.results[0].RootPost.ModifiedTime
// var date = new Date(xml.SPXML.d.SocialFeed.Threads.results[0].RootPost.ModifiedTime)

var BASE_URL = 'https://altranintranet.sharepoint.com';
var NEWS_FEED = '/_api/social.feed/my/news';
var backgroundPoller = {

  requestXML: function() {

  var me = this;
    $.ajax({
      'url': BASE_URL + NEWS_FEED,
      'type': 'GET',
      'dataType': 'json',
      'success': function(data) { 
        me.checkNewsFeed.call(me, data);
      },
      'error': function(err) { console.log('ERROR!'); console.log(err); },
      'beforeSend': setHeader
    });
    function setHeader(xhr) {
      xhr.setRequestHeader('Accept', 'application/json;odata=verbose');
    }    
  },
  
  checkNewsFeed: function (data) {
    var me = this;
    var latestUpdate = data.d.SocialFeed.NewestProcessed;

    chrome.storage.local.get('NewsFeed', function (newsFeedItems) {
      var lastStoredDate = new Date();
      var newsFeedItem = newsFeedItems['NewsFeed'];
      
      if (newsFeedItem && newsFeedItem.newestProcessed) {
        lastStoredDate = new Date(newsFeedItem.newestProcessed);
      }
      var lastPolledDate = new Date(data.d.SocialFeed.Threads.results[0].RootPost.ModifiedTime);

      if (lastStoredDate.toString() != lastPolledDate.toString()) {
        console.log('new item found, display notification');
        newsFeedItem = { 'newItemFound': true, 'newestProcessed': lastPolledDate.toString()};
        chrome.storage.local.set({'NewsFeed': newsFeedItem}, function() {
          if (chrome.extension.lastError) {
            console.log('An error occurred: ' + chrome.extension.lastError.message);
          }
        });
        chrome.browserAction.setBadgeText({'text':'1'});
      }
    });
  }
};

function pollSP() {
  console.log('requesting XML');
  backgroundPoller.requestXML();
  setTimeout(function() {
    pollSP();
  }, 10*60*1000);
}

pollSP();
var FeedParser = require('feedparser');
var request = require('request'); // for fetching the feed
var fs = require('fs');

var rssurlfn = "feedurl.txt";

var jslistfn = "../radio/public/jslist.js"
var etag;
var feedurl;
var etagfn = "etag.txt";

// first read in the rss filename from a textfile

fs.readFile(rssurlfn,'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  feedurl = data;
  console.log(data);

  //then read the etag for that rss feed if there is one to avoid getting it again

  fs.readFile(etagfn,'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    etag = data;
    console.log(data);
  });

  var req0 = request(feedurl, {method: 'HEAD'}, function(err, res, body){
    console.log(res.headers["etag"]);
    if(etag){
      if(etag!=res.headers["etag"]){
        //save the new one, do the download
        saveEtag(res.headers["etag"]);
      }
    }else{
      saveEtag(res.headers["etag"]);
    }
  });

});

//save the etag in a file

function saveEtag(et){
  fs.writeFile(etagfn, et, function(err) {
   if(err) {
     return console.log(err);
   }
   console.log("etag was saved!");     
   getRSS();
  });
}

// get the feed itself

function getRSS(){

  var thelist = [];

  var req = request(feedurl);
  var feedparser = new FeedParser();
  req.on('error', function (error) {
    console.log("err 1");
    console.log(error);
    // handle any request errors
  });

  req.on('response', function (res) {
    var stream = this; // `this` is `req`, which is a stream

    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    }
    else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function (error) {
    // always handle errors
    console.log("err a");
    console.log(error);
  });

  feedparser.on('readable', function () {
    // This is where the action is!
    var stream = this; // `this` is `feedparser`, which is a stream
    var meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
    var item;

    // keep a copy of everything

    while (item = stream.read()) {
      var nd = item.date;
      var d = Date.parse(nd);
      var dz = new Date(d);
      thelist.push({"title":item.title, "url":item.link, "date":dz.toISOString()});
    }
  });

  feedparser.on('end', function(err){

    // go through each one checking it's actually an mp3

    syncLoop(thelist.length, function(loop){  
      var i = loop.iteration();
      console.log(i);
      var item = thelist[i];
      if(item.url.indexOf(".mp3") == -1){
         console.log("no mp3, looking for one");
         var req = request(item.url,{"timeout": 5000}, function(err, res, body){

            // hack parse the html to find the frst mp3

            if(body){
              if(m = body.match( /\"(http\S*?\.mp3.*?)\"/ ) ){
                console.log("found an mp3 - "+m[1]);
                thelist[i] = {"title":item.title, "url":m[1], "date":item.date}
                loop.next();
              }
            }
         });
         req.on('error', function(err) {
            console.log("err 3");
            loop.next();
         });
      }else{
        loop.next();
      }
    }, function(){
      console.log('done');

      // sort by date, newest first

      thelist.sort(function(a,b){
         return new Date(b.date) - new Date(a.date);
      });
      console.log(thelist);

      // save it as javascript

      fs.writeFile(jslistfn, "var rss = "+JSON.stringify(thelist, null, 2), function(err) {
        if(err) {
          return console.log(err);
        }
        console.log("js file was saved!");     
      });

    });

  });

}


// from https://zackehh.com/handling-synchronous-asynchronous-loops-javascriptnode-js/
function syncLoop(iterations, process, exit){  
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
        next:function(){
            if(done){
                if(shouldExit && exit){
                    return exit(); // Exit if we're done
                }
            }
            // If we're not finished
            if(index < iterations){
                index++; // Increment our index
                process(loop); // Run our process, pass in the loop
            // Otherwise we're done
            } else {
                done = true; // Make sure we say we're done
                if(exit) exit(); // Call the callback on exit
            }
        },
        iteration:function(){
            return index - 1; // Return the loop number we're on
        },
        break:function(end){
            done = true; // End the loop
            shouldExit = end; // Passing end as true means we still call the exit callback
        }
    };
    loop.next();
    return loop;
}

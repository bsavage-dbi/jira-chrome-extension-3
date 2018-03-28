function getJIRAFeed(callback, errorCallback){
    var user = document.getElementById("user").value;
    if(user == undefined) return;
    
    var url = "https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+"+user+"&providers=issues";
    make_request(url, "").then(function(response) {
      // empty response type allows the request.responseXML property to be returned in the makeRequest call
      callback(url, response);
    }, errorCallback);
}
/**
 * @param {string} searchTerm - Search term for JIRA Query.
 * @param {function(string)} callback - Called when the query results have been  
 *   formatted for rendering.
 * @param {function(string)} errorCallback - Called when the query or call fails.
 */
async function getQueryResults(s, callback, errorCallback) {                                                 
    try {
      var response = await make_request(s, "json");
      callback(createHTMLElementResult(response));
    } catch (error) {
      errorCallback(error);
    }
}

function make_request(url, responseType) {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = responseType;
    req.onload = function() {
      var response = responseType ? req.response : req.responseXML;
      if(response && response.errorMessages && response.errorMessages.length > 0){
        reject(response.errorMessages[0]);
        return;
      }
      resolve(response);
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    }
    req.onreadystatechange = function() { 
      if(req.readyState == 4 && req.status == 401) { 
          reject("You must be logged in to JIRA to see this project.");
      }
    }

    // Make the request
    req.send();
  });
}



function loadOptions(){
  chrome.storage.sync.get({
    project: 'Sunshine',
    user: 'nyx.linden'
  }, function(items) {
    console.log("load options ")
    console.log(items)
    document.getElementById('project').value = items.project;
    document.getElementById('user').value = items.user;
  });
}
function buildJQL(callback) {
  var callbackBase = "https://jira.secondlife.com/rest/api/2/search?jql=";
  var project = document.getElementById("project").value;
  var status = document.getElementById("statusSelect").value;
  var inStatusFor = document.getElementById("daysPast").value
  var fullCallbackUrl = callbackBase;
  fullCallbackUrl += `project=${project}+and+status=${status}+and+status+changed+to+${status}+before+-${inStatusFor}d&fields=id,status,key,assignee,summary&maxresults=100`;
  callback(fullCallbackUrl);
}
function createHTMLElementResult(response){

// 
// Create HTML output to display the search results.
// results.json in the "json_results" folder contains a sample of the API response
// hint: you may run the application as well if you fix the bug. 
//  
  var list = document.createElement('ul');
  response.issues.forEach(function(issue){
    var fields = issue.fields;
    var status = fields.status;
    var item = document.createElement('li');
    item.innerHTML = 'key-'+issue.key+' ,summury'+fields.summary+'description-'+status.description;
    list.appendChild(item);
  });
  return list.outerHTML;
  //return '<p>There may be results, but you must read the response and display them.</p>';
}

// utility 
function domify(str){
  var dom = (new DOMParser()).parseFromString('<!doctype html><body>' + str,'text/html');
  return dom.body.textContent;
}

async function checkProjectExists(){
    try {
      return await make_request("https://jira.secondlife.com/rest/api/2/project/SUN", "json");
      
    } catch (errorMessage) {
      logErrorMessage('status', errorMessage);
    }
}

// Setup
document.addEventListener('DOMContentLoaded', function() {
  // if logged in, setup listeners
    checkProjectExists().then(function() {
      //load saved options
      loadOptions();

      // query click handler
      document.getElementById("query").onclick = function(){
        // build query
        buildJQL(function(url) {
          setInnerHtml('status', 'Performing JIRA search for ' + url);
          toggle('status', false);
          // perform the search
          getQueryResults(url, function(return_val) {
            // render the results
            console.log("after render html method"+return_val)
  
            setInnerHtml('status', 'Query term: ' + url + '\n');
            toggle('status', false);
            
            var jsonResultDiv = document.getElementById('query-result');
            jsonResultDiv.innerHTML = return_val;
            jsonResultDiv.hidden = false;

          }, function(errorMessage) {
            logErrorMessage('status', errorMessage);
          });
        });
      }

      // activity feed click handler
      document.getElementById("feed").onclick = function(){   
        // get the xml feed
        getJIRAFeed(function(url, xmlDoc) {
          setInnerHtml('status', 'Activity query: ' + url + '\n');
          toggle('status', false);

          // render result
          var feed = xmlDoc.getElementsByTagName('feed');
          var entries = feed[0].getElementsByTagName("entry");
          var list = document.createElement('ul');

          for (var index = 0; index < entries.length; index++) {
            var html = entries[index].getElementsByTagName("title")[0].innerHTML;
            var updated = entries[index].getElementsByTagName("updated")[0].innerHTML;
            var item = document.createElement('li');
            item.innerHTML = new Date(updated).toLocaleString() + " - " + domify(html);
            list.appendChild(item);
          }

          var feedResultDiv = document.getElementById('query-result');
          if(list.childNodes.length > 0){
            feedResultDiv.innerHTML = list.outerHTML;
          } else {
            setInnerHtml('status', 'There are no activity results.');
            toggle('status', false);
          }
          
          feedResultDiv.hidden = false;

        }, function(errorMessage) {
          logErrorMessage('status', errorMessage);
        });    
      };        

    }).catch(function(errorMessage) {
      logErrorMessage('status', errorMessage);
    });   
});

//Set inner html content
function setInnerHtml(id, message){
  document.getElementById(id).innerHTML=message;
}

// Set toggle id
function toggle(id, value){
  document.getElementById(id).hidden = value;
}

function logErrorMessage(id, errorMessage){
  setInnerHtml(id, 'ERROR. ' + errorMessage);
  toggle(id, false);
}

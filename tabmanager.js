//TabPlus Tab Manager. Ray 2016, All rights reserved

function TabManager(useTabStore) {
	this.tabStore = {};
	this.localTabStore = {};
	
	//Variables:
	var cEn = 0, cTmr = null, gThis = this;
	this.totalTabs = 0; this.totalBytes = 0;
	
	//Extension Options:
	this.NoDelayTabs = 15; //Max tabs before auto-delay: > 15
	this.TabDelay = 500; //Auto-delay timeout (ms)
	this.SavePinned = false; //Save pinned tabs
	this.NewWindows = 1; //0 = Never, 1 = When No Other Tabs, 2 = Always
	
	//-- Public Functions:
	
	//Load all tab list entries and construct tabStore hierarchy:
	this.loadTabStore = function(onComplete) {
		chrome.storage.sync.getBytesInUse(null, function(b) {gThis.totalBytes = b});
		gThis.tabStore = {}; gThis.localTabStore = {}; gThis.totalTabs = 0;
		loadTabs(true, function(s) {
			if(s) loadTabs(false, onComplete);
			else if(onComplete) onComplete(false);
		});
		return gThis; //For stacking upon initialization.
	}
	
	function loadTabs(local, onComplete) {
		(local?chrome.storage.local:chrome.storage.sync).get(null, function(items) {
			console.log((local?"LOCAL":"SYNCED")+" STORAGE:",items); //<---- TEMP
			if(chrome.runtime.lastError) { if(onComplete) onComplete(false); console.log("Error reading database!", chrome.runtime.lastError); return; }
			var redo = false; for(var iKey in items) if(iKey[0] == "/") {
				var title = iKey.substr(iKey.lastIndexOf("/")+1), list = items[iKey],
				dir = gotoDir(iKey.substring(0,iKey.lastIndexOf("/")), true, local);
				if(!dir || dir.hasOwnProperty(title) || !(list instanceof Array) || typeof list[0] != "string" || !(list[1] instanceof Array)) {
					delItems(iKey, null, local); redo = true; console.log("Removing mal-formatted or duplicate entry '"+(local?"local":"sync")+iKey+"'");
				} else { dir[title] = list; gThis.totalTabs += list.length-1; }
			}
			if(redo) { console.log("Corrupt database entries were found during read. Cleaning and re-starting..."); gThis.loadTabStore(onComplete); }
			else { setOptions(items.options||[]); if(onComplete) onComplete(true); cEn = 0; }
		});
	}
	
	//Only load options:
	this.loadOptions = function(onComplete) {
		chrome.storage.sync.get({options:[]}, function(items) {
			if(chrome.runtime.lastError) { if(onComplete) onComplete(false); console.log("Error loading options!", chrome.runtime.lastError); }
			else { setOptions(items.options); if(onComplete) onComplete(true); }
		});
		return gThis; //For stacking upon initialization.
	}
	
	//Read directory contents at path:
	this.readDir = function(path, storeMode) {
		return gotoDir(path, null, storeMode);
	}
	
	//Create a new folder:
	this.makeDir = function(name, path, storeMode) {
		var dir = gotoDir(path, null, storeMode); if(!dir) return false;
		dir[name] = {}; return dir[name];
	}
	
	this.rename = function(path, name, newName, storeMode) {
		var dir = gotoDir(path, null, storeMode); if(!dir) return false;
		if(name != newName) { dir[newName] = dir[name];
		delete dir[name]; } return dir[newName];
	}
	
	this.remove = function(name, path, storeMode) {
		var dir = gotoDir(path, null, storeMode); if(!dir || !dir[name]) return false;
		//if(dir[name] instanceof Array) this.removeTabs(name, path);
		delete dir[name]; return true;
	}
	
	//Synchronize all tablists to cloud:
	this.syncToCloud = function(storeMode, onComplete) {
		var syncObj = {}; subSync("");
		function subSync(fPath) {
			var f = gotoDir(fPath, false, storeMode), sk = Object.keys(f), si;
			for(var i=0,l=sk.length; i<l; i++) { si = f[sk[i]];
				if(si instanceof Array) { if(si.length > 1) syncObj[fPath+"/"+sk[i]] = si; }
				else subSync(fPath+"/"+sk[i]);
			}
		}
		doSync(syncObj, function(s) {
			if(s) cleanStore(Object.keys(syncObj), onComplete, storeMode);
			else if(onComplete) onComplete(false);
		}, storeMode);
	}
	
	//Synchronize config options to cloud:
	this.syncOptions = function(onComplete) {
		doSync({options:[
			gThis.NoDelayTabs,
			gThis.TabDelay,
			gThis.SavePinned
		]}, onComplete);
	}
	
	//Write only one tablist:
	this.writeTabs = function(name, list, onComplete) {
		this.tabStore[name] = list; var sObj = {};
		sObj["/"+name] = list; doSync(sObj, onComplete, true);
	}
	
	//-- Event Listeners:
	
	this.onChanged = false;
	
	chrome.storage.onChanged.addListener(function(chg, t) { if(cEn >= 0) {
		var cLen = Object.keys(chg).length; if(!cLen) return;
		if(cTmr !== null/* && cTmr !== -1*/) { clearTimeout(cTmr); console.log("onchange TIMER WAS CLEARED!!!"); } //Clear timer if running.
		
		/*var cInt = setInterval(function() { //Queue till ready to run new timer:
			if(cTmr === null) { cTmr = setTimeout(runCallback, 500); clearInterval(cInt); }
		},1);*/
		cTmr = setTimeout(runCallback, 500);
		
		function runCallback() {
			(useTabStore===false?gThis.loadOptions:gThis.loadTabStore)(function() {
				if(gThis.onChanged) gThis.onChanged(!chg.options || cLen > 1, t == "local"); cTmr = null;
			});
		}
	}});
	
	//-- Internal Functions:
	
	//Navigate to directory and return contents:
	function gotoDir(path, makeNew, storeMode) {
		var dir = path.split('/'), i=0, l=dir.length, oItem, item;
		if(storeMode === true) item = this.localTabStore; else if(storeMode) item = storeMode; else item = this.tabStore;
		while(path[i] == '/') i++; if(i==path.length) return item;
		for(; i<l; i++) {
			oItem = item; item = item[dir[i]];
			if(item instanceof Array) return false; else if(typeof item != 'object') {
				if(makeNew) { oItem[dir[i]] = {}; item = oItem[dir[i]]; } else return false;
			}
		}
		return item;
		/*var dir = path.split("/"), item = this.tabStore;
		for(var i=0,l=dir.length-1; i<l; i++) { item = item[dir[i]];
		if(!item || !Object.keys(item).length) return false; }
		return item;*/
	} gotoDir = gotoDir.bind(this);
	
	//Saves entries to the cloud:
	function doSync(entry, onComplete, storeMode) {
		cEn--; (storeMode?chrome.storage.local:chrome.storage.sync).set(entry, function() {
			if(onComplete) onComplete(chrome.runtime.lastError?false:true);
			if(chrome.runtime.lastError) console.log("Error writing to storage!", chrome.runtime.lastError);
			setTimeout(function() { cEn++; },5);
		});
	} doSync = doSync.bind(this);
	
	//Clean storage:
	function cleanStore(whitelist, onComplete, storeMode) {
		(storeMode?chrome.storage.local:chrome.storage.sync).get(null, function(items) {
			if(chrome.runtime.lastError) {
				console.log("Error reading database!", chrome.runtime.lastError);
				if(onComplete) onComplete(false); return;
			}
			var iKeys = Object.keys(items), rem = []; for(var i=0,l=iKeys.length; i<l; i++)
			if(whitelist.indexOf(iKeys[i]) === -1 && iKeys[i] !== "options") rem.push(iKeys[i]);
			delItems(rem, onComplete, storeMode);
		});
	} cleanStore = cleanStore.bind(this);
	
	//Deletes entries in storage:
	function delItems(entry, onComplete, storeMode) {
		cEn--; (storeMode?chrome.storage.local:chrome.storage.sync).remove(entry, function() {
			if(onComplete) onComplete(chrome.runtime.lastError?false:true);
			if(chrome.runtime.lastError) console.log("Error deleting stored items!", chrome.runtime.lastError);
			setTimeout(function() { cEn++; },5);
		});
	} delItems = delItems.bind(this);
	
	//Set options to loaded list:
	function setOptions(optList) {
		this.NoDelayTabs = optList[0] || 15;
		this.TabDelay = optList[1] || 500;
		this.SavePinned = optList[2] || false;
		this.NewWindows = optList[3] || 1;
	} setOptions = setOptions.bind(this);
}
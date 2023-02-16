//TabPlus Background Service. Ray 2016, All rights reserved

//-- Compile-Time (not really) Settings:

var NameFilter = /[^ -.0-\[\]^_a-z|]/g, //Same as [^a-zA-Z0-9!-.:-@[-_| ]. Or use [^ -_a-z|] to allow '\' and '/'
NameMaxLen = 30, //Max name len: <= 30
MaxSyncTablistTabs = 50;

//-- Event Listeners & Initialization:

var tabPlus; includeScript("tabmanager.js", function() {
	tabPlus = new TabManager(false).loadOptions(); openMainPage();
});

function openMainPage(initData) {
	var urlSearch = chrome.extension.getURL("tabplus.html");
	var urlName = "tabplus.html#"; if(initData) urlName += encodeURIComponent(initData);
	chrome.tabs.query({url:urlSearch}, function(tabs) {
		if(tabs.length == 0) chrome.tabs.create({url:urlName});
		else {
			//If there's more than one, close all but the first.
			for(var i=1,l=tabs.length; i<l; i++) chrome.tabs.remove(tabs[i].id);
			//And focus the tab.
			chrome.tabs.update(tabs[0].id, {active:true,url:urlName});
			chrome.windows.update(tabs[0].windowId, {focused:true});
		}
	});
}

//-- Background Service Functions:

function runTabSaver(tabs, saveType) {
	var tabList = [genDate()], pastActive = false,
	i=0, l=tabs.length; tabPlus.loadTabStore(function(s) {if(s && l>0) tabTimer()});
	function tabTimer() {
		doTabRead(); i++;
		if(i<l) { if((i-1)%tabPlus.NoDelayTabs==tabPlus.NoDelayTabs-1) setTimeout
		(tabTimer, tabPlus.TabDelay); else tabTimer(); } else saveTablist();
	}
	function doTabRead() {
		var tab = tabs[i]; if(tab.active) pastActive = true;
		if(tab.id && !isSystemTab(tab)) {
			if((saveType == "left" && !pastActive) ||
			(saveType == "right" && pastActive && !tab.active) ||
			(saveType != "left" && saveType != "right")) {
				console.log("Tab "+tab.index+": "+tab.title);
				tabList.push([tab.title, tab.url]);
				chrome.tabs.remove(tab.id);
			}
		}
	}
	function saveTablist() { if(tabList.length > 1) {
		console.log("Tab List:",tabList);
		var name = autogenName(tabPlus.localTabStore);
		tabPlus.writeTabs(name, tabList, function(s) {
			if(s) openMainPage(name);
		});
	}}
}

function runTabOpener(tablist, windowId) {
	chrome.windows.get(windowId, {populate:true}, function(currWindow) {
		if(tabPlus.NewWindows == 0 || (tabPlus.NewWindows == 1 && currWindow.tabs.length <= 2)) addTabs(currWindow);
		else chrome.windows.create({url:addTabs(true)});
	});
	function addTabs(win) {
		var winId=win.id,tabs=[]; for(var i=1,l=tablist.length; i<l; i++) {
			if(win === true) tabs.push(tablist[i][1]); else chrome.tabs
			.create({windowId:winId,url:tablist[i][1],selected:false});
		}
		if(win === true) return tabs;
	}
}

function genDate() {
	var d = new Date(); return d.getMonth()+"."+d.getDate()+"."+
	d.getFullYear()+"."+d.getHours()+"."+d.getMinutes()+"."+d.getSeconds();
}

function autogenName(dirContent) {
	var num=0; while(dirContent["_"+num]||dirContent["~_"+num]) num++; return "_"+num;
}

function findName(name, dirContent) {
	name = name.replace(NameFilter, "").trim(); if(!dirContent[name] && !dirContent["~"+name]) return name;
	var num=1; while(dirContent[name+" ("+num+")"]||dirContent["~"+name+" ("+num+")"]) num++; return name+" ("+num+")";
}

var start = false; function startup() {
	if(!start) { start = true; return true; }
	return false;
}

//-- Internal Functions:

function isSystemTab(tab) { var n = tab.url; return n.indexOf("chrome://")==0 || n.indexOf("chrome-extension://")==0; }

function includeScript(src, callback) {
	var scr = document.createElement('script'); scr.src = src;
	scr.addEventListener('load', callback, false);
	document.head.appendChild(scr);
}
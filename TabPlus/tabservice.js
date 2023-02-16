//TabPlus Background Service. Ray 2016, All rights reserved

'use strict';
let window={},history={back:()=>{},forward:()=>{}};
class HTMLCollection{}; class Element{};
importScripts("utils.js", "tabmanager.js");

const delay=ms => new Promise(r => setTimeout(r,ms)),
TabPlus=new TabManager(), Svc={
	getOpt:async o => TabPlus[o],
	openMainPage:async data => {
		let ser=chrome.runtime.getURL("tabplus.html"), uri="tabplus.html";
		if(data) uri+='#'+encodeURIComponent(data);
		let tabs=await chrome.tabs.query({url:ser});
		if(!tabs.length) chrome.tabs.create({url:uri}); else {
			tabs.each(t => chrome.tabs.remove(t.id),1);
			await chrome.tabs.update(tabs[0].id, {active:true,url:uri});
			await chrome.windows.update(tabs[0].windowId, {focused:true});
		}
	}, runTabSaver:async (tabs, type) => {
		let l=tabs.length; if(!l) return;
		let tList=[genDate()],i=0,tab,pastAct,nd=TabPlus.NoDelayTabs;
		await TabPlus.loadTabStore();
		while(i<l) {
			tab=tabs[i++]; if(tab.active) pastAct=1;
			if(tab.id && !isSystemTab(tab) && ((type == "left" && !pastAct) ||
			(type == "right" && pastAct && !tab.active) || (type != "left" && type != "right"))) {
				tList.push([tab.title, tab.url]); chrome.tabs.remove(tab.id);
			}
			if(i&&i%nd==0) await delay(TabPlus.TabDelay);
		}
		console.log("Tab List:",tList);
		if(tList.length<2) throw "The selected option(s) cannot be saved!";
		try {await TabPlus.writeTabs(tList)} catch(e) {await Svc.runTabOpener(tList);throw e}
		await Svc.openMainPage('local/');
	}, runTabOpener:async (tList, winID) => {
		let win; if(winID) win=await chrome.windows.get(winID, {populate:true});
		if(!winID || TabPlus.NewWindows || !(TabPlus.NewWindows==1 && win.tabs.length<=2)) win=null;
		let tabs=[]; tList.each(t => {
			if(win) chrome.tabs.create({windowId:win.id,url:t[1],selected:false}); else tabs.push(t[1]);
		},1);
		if(!win) chrome.windows.create({url:tabs});
	}
}
function isSystemTab(tab) {return tab.url.startsWith('chrome:') || tab.url.startsWith('chrome-extension:')}

TabPlus.loadOpts();
chrome.runtime.onInstalled.addListener(()=>Svc.openMainPage());
chrome.runtime.onConnect.addListener(p => p.onMessage.addListener(async m => {
	if(m.t=='run') {
		let r,e; try {r=await Svc[m.a.shift()].apply(null,m.a)} catch(er) {e=er}
		try {p.postMessage({r:r,c:m.c,e:e?e.toString():null})} catch(e) {}
	}
}));
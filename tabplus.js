//TabPlus Main Script. Ray 2016, All rights reserved.

//-- Main Application Code:

var tabPlus, tabService, Path = "", DirContent = {},
IsLocal = true, loadFlag = true, saveTmr = null;

window.onload = function() {
	//Start Loading Animation:
	gui.runIconLoader();
	//loader.remove(); document.body.style.overflow = null;
	
	setTimeout(function() {
		//Init Tab Manager:
		tabPlus = new TabManager().loadTabStore(function() {
			//Get Tab Service:
			chrome.runtime.getBackgroundPage(function(service) {
				tabService = service; initLoad();
				setTimeout(function() { loadFlag = false; }, tabService.startup()?4000:200); //Whaaaat? I can increase the load-time on startup if I want. Shhh... Don't tell.
				window.onpopstate = setFromHash;
			});
		});
		tabPlus.onChanged = saveDataChanged;
	},40);
};

function setFromHash() {
	var path = decodeURIComponent(window.location.hash.substr(1));
	if(!path || (path != Path && path.substr(1) != Path)) {
		if(path[0] == '|') { setLocal(false); path = path.substr(1); } else setLocal(true);
		setPath(path); if(!Path && !Object.keys(DirContent).length) { //If at root and no content, but content in other mode tab, auto-switch:
			var otherDir = tabPlus.readDir("", !IsLocal);
			if(Object.keys(otherDir).length) { setLocal(!IsLocal); setPath(); }
		}
	}
}

function initLoad() {
	//Save & Load Options:
	saveSel.onclick = function(){setTimeout(saveToDisk,1)};
	loadSel.onclick = loadFromDisk;
	
	//Local & Synced Tabs:
	lTab.onclick = function() { setLocal(true); setPath(); }
	sTab.onclick = function() { setLocal(false); setPath(); }
	
	//New Folder:
	nFold.onclick = function() {
		var dir = tabPlus.readDir(Path, IsLocal), name = tabService.findName("New Folder", dir),
		f = gui.addFolder(name, "", fNav, true); DirContent[name] = dir[name] = {}; gui.renameFolder(f);
	};
	
	setFromHash(); if(Path) console.log("__ initPath",Path);
}

function drawPage() {
	clearPage(); if(Path) gui.addFolder("..", "Click to go back", fBack);
	var keys = Object.keys(DirContent), item;
	for(var i=0,l=keys.length; i<l; i++) {
		item = DirContent[keys[i]];
		if(item instanceof Array) new gui.TabList(keys[i], item);
		else {
			var d = getNewestDate(Path+"/"+keys[i]);
			if(!d) d = ""; gui.addFolder(keys[i], d, fNav, true);
		}
	}
}

function clearPage() {
	gui.clearFolders();
	var lists = document.getElementsByClassName("tablist"), lObj = [];
	for(var i=0,l=lists.length; i<l; i++) lObj.push(lists[i].this);
	for(i=0,l=lObj.length; i<l; i++) lObj[i].removeSelf(true);
}

//-- Major Functions:

function setPath(path, skipClean) {
	console.log("setpath",(path||"/"),skipClean||"");
	if(!skipClean) cleanupAll(false); var dir; if(typeof path == "string" && (dir = sortFolder(path)))
	{ Path = path; DirContent = dir; } else { Path = ""; DirContent = sortFolder("") || {}; }
	window.location.hash = encodeURIComponent(Path); setTimeout(function(){clearPage();drawPage()},10);
	tabStats.textContent = "Total: "+tabPlus.totalTabs+" Tabs ("+parseBytes(tabPlus.totalBytes)+" Synced)";
	pathBar.textContent = (IsLocal?"local":"sync")+(Path||"/");
}

function setLocal(local) {
	if(local) { lTab.classList.add("sel"); sTab.classList.remove("sel"); IsLocal = true; }
	else { lTab.classList.remove("sel"); sTab.classList.add("sel"); IsLocal = false; }
}

function saveConfig(saveBoth) {
	if(saveTmr !== null) clearTimeout(saveTmr); saveTmr = setTimeout(function() {
		saveTmr = null;
		if(saveBoth) {
			console.log("Saving local & synced configs...");
			tabPlus.syncToCloud(true); tabPlus.syncToCloud(false);
		} else {
			console.log("Saving "+(IsLocal?"local":"synced")+" config...");
			tabPlus.syncToCloud(IsLocal);
		}
	}, 1000);
}

function saveToDisk(n,doLocal,doSync) {
	if(typeof n != 'string') n = "tabs";
	saveAsFile(n, [doLocal===false?{}:tabPlus.localTabStore,doSync===false?{}:tabPlus.tabStore]);
}

Function.prototype.wrap = function() {
	const f = this, a = arguments; return function(){return f.apply(arguments,a)};
}

function loadFromDisk() {
	//Setup uploader & elements:
	var up = new Uploader('.tpp', uContainer), pop = uContainer.parentNode, rp;
	pop.style.display = null; uClose.onclick = function(){close()};
	setTimeout(function(){pop.style.opacity = 1},20);
	//Process dropped files:
	up.onFileLoad = function(data) {
		let tstores; try { tstores = JSON.parse(data); } catch(e) { return "Pre-Parse Error: Invalid JSON string"; }
		if(!(tstores instanceof Array) || tstores.length != 2) return "Pre-Parse Error: Data root must be array of length 2";
		
		var lstore = tstores[0], sstore = tstores[1];
		if(typeof lstore != 'object' || lstore instanceof Array) return "Pre-Parse Error: Local tabstore must be object";
		if(typeof sstore != 'object' || sstore instanceof Array) return "Pre-Parse Error: Synced tabstore must be object";
		
		//Sanity-check new tabstore data in a sandboxed environment:
		function testPath(fPath, store) {
			var f = tabPlus.readDir(fPath, store), sk = Object.keys(f), si;
			for(var i=0,l=sk.length; i<l; i++) { si = f[sk[i]];
				//Test item names:
				var snt = sk[i]; if(snt[0] == ' ' || snt[snt.length-1] == ' ') return "at '"+fPath+"': Leading or trailing spaces in tablist or folder name ("+sk[i]+")";
				if(si instanceof Array && snt[0] == '~') snt = snt.substr(1); //<-- These chars are allowed only at start, and only for tablists.
				if(snt.length < 1 || snt.match(tabService.NameFilter)) return "at '"+fPath+"': Non-allowed characters in tablist or folder name ("+sk[i]+")";
				//Test item data:
				if(si instanceof Array) { //Tablists:
					if(si.length <= 1) return "at '"+fPath+"/"+sk[i]+"': No items in tablist or date not present";
					if(typeof si[0] != 'string') return "at '"+fPath+"/"+sk[i]+"': Date must be of type string";
					
					//Tablist date string:
					var dIn = si[0].split('.'); if(dIn.length != 6) return "at '"+fPath+"/"+sk[i]+"': Date is not correct length";
					for(var z=0,x=dIn.length; z<x; z++) if(isNaN(Number(dIn[z]))) return "at '"+fPath+"/"+sk[i]+"': Item in date string at index "+i+" is not a number";
					
					//Tablist tabs:
					for(var g=1,q=si.length; g<q; g++) {
						if(!(si[g] instanceof Array)) return "at '"+fPath+"/"+sk[i]+"': Tab entry at index "+g+" must be array";
						if(si[g].length != 2) return "at '"+fPath+"/"+sk[i]+"': Tab entry at index "+g+" must contain exactly two values";
						if(typeof si[g][0] != 'string') return "at '"+fPath+"/"+sk[i]+"': Tab entry at index "+g+": Field 0 (name) must be string";
						if(typeof si[g][1] != 'string') return "at '"+fPath+"/"+sk[i]+"': Tab entry at index "+g+": Field 1 (url) must be string";
					}
				} else if(typeof si == 'object') { //Folders:
					if(Object.keys(si).length < 1) return "at '"+fPath+"/"+sk[i]+"': Folder has no content. 'Sup wit dat";
					var err = testPath(fPath+"/"+sk[i], store); if(err) return err; //Recursively test sub-folders. Any errors cause a cascade effect.
				} else return "at '"+fPath+"/"+sk[i]+": Unexpected item of type "+typeof(si);
			}
		}
		var err = testPath("", lstore); if(err) return "Parser Error: Local "+err;
		err = testPath("", sstore); if(err) return "Parser Error: Synced "+err;
		
		setTimeout(function() {
			var uc = makeEl('div',"upContents",makeEl('div',"upFileBox",uContainer));
			uc.innerHTML = "<div class='icon'></div><span>Select an option</span><br>";
			up.element.style.display = 'none'; var ll = Object.keys(lstore).length, sl = Object.keys(sstore).length;
			
			if(ll>0) fileLoadOption(uc,"Load Local Tabs",ll,close.wrap(lstore,null));
			if(sl>0) fileLoadOption(uc,"Load Synced Tabs",sl,close.wrap(null,sstore));
			if(ll>0 && sl>0) fileLoadOption(uc,"Load All Tabs",ll+sl,close.wrap(lstore,sstore));
			if(sl>0) fileLoadOption(uc,"Load All Tabs As Local",ll+sl,close.wrap(combineTablists(sstore,lstore),null));
			fileLoadOption(uc,"Cancel",null,close.wrap());
			
			makeEl('br',null,uc); makeEl('br',null,uc); makeEl('br',null,uc);
			rp = makeEl('input',null,uc); rp.type = 'checkbox'; rp.checked = true;
			rp.style.display = 'initial'; rp.style.marginRight = '6px';
			makeEl('span',null,uc,"Replace Existing");
		},1000);
	}
	function close(local, sync) {
		if(local || sync) {
			saveToDisk("backup");
			if(local) { if(!rp||rp.checked) tabPlus.localTabStore = local; else combineTablists(tabPlus.localTabStore,local); }
			if(sync) { if(!rp||rp.checked) tabPlus.tabStore = sync; else combineTablists(tabPlus.tabStore,sync); }
			tabPlus.syncToCloud(true); tabPlus.syncToCloud(false);
			setTimeout(function(){setPath(Path)},100);
		}
		uClose.onclick = null; up.onFileLoad = null; pop.style.opacity = 0;
		setTimeout(function() { uContainer.innerHTML = null; pop.style.display = 'none'; },1200);
	}
}

function combineTablists(a,b) {
	var k = Object.keys(b);
	for(var i=0,l=k.length,n,m; i<l; i++) {
		n = k[i]; m = 1; while(a[n]) n = k[i]+" ("+(m++)+")";
		a[n] = b[k[i]];
	}
	return a;
}

function fileLoadOption(p, name, sub, func) {
	makeEl('br',null,p); var l = makeEl('label',null,p);
	l.innerHTML = "<strong>"+name+"</strong>"+(sub?" ("+sub+")":""); l.onclick = func;
}

function makeEl(tag, cls, par, con) {
	var el = document.createElement(tag);
	if(cls) el.className = cls; if(par) par.appendChild(el);
	if(con) el.textContent = con;
	return el;
}

//-- Event Listeners:

function fNav() { setPath(Path+"/"+this.fName); }
function fBack() { setPath(Path.substring(0,Path.lastIndexOf("/"))); }

gui.onTablistNameChange = function(oT) {
	var t = this.title; if(t == oT) return;
	if(!DirContent[oT]) { console.log("FAILED TO UPDATE NAME ("+oT+" to "+t+")"); return; }
	tabPlus.rename(Path, oT, t, IsLocal); DirContent[t] = DirContent[oT]; delete DirContent[oT];
	saveConfig();
}

gui.onTablistLocked = function(oldLocked) {
	var oT = (oldLocked?"~":"")+this.rTitle;
	if(!DirContent[oT]) { console.log("FAILED TO UPDATE LOCK STATUS ("+oT+" to "+this.title+")"); return; }
	gui.onTablistNameChange.bind(this)(oT, true);
	saveConfig();
}

gui.onTablistRemoved = function(system) {
	var keys = Object.keys(DirContent), item;
	for(var i=0,l=keys.length; i<l; i++) {
		item = DirContent[keys[i]]; if(item instanceof Array
		&& item.length <= 1) { tabPlus.remove(keys[i], Path, IsLocal); delete DirContent[keys[i]]; }
	}
	if(!system) saveConfig();
}

gui.onTabRemoved = function() { saveConfig(); }

gui.onTabDragged = function(local, shift) {
	if(local === true || local === false) {
		if(shift && local != IsLocal) setLocal(local);
		setPath(); saveConfig(true);
	} else saveConfig();
}

gui.onFolderDragged = function(local) {
	if(local === true || local === false) {
		if(local != IsLocal) setLocal(local);
		setPath(); saveConfig(true);
	} else saveConfig();
}

function saveDataChanged(itmChg, local) {
	console.log("savedatachange",(local?"local":"sync"));
	if(itmChg) { setLocal(local); setPath(); }
}

//-- Helpful Functions:

function saveAsFile(name, data) {
	var blob = new Blob([JSON.stringify(data)], {type:'text/plain'}),
	dLink = document.createElement('a'); dLink.download = name+'.tpp';
	dLink.href = window.URL.createObjectURL(blob); dLink.click();
	window.URL.revokeObjectURL(blob);
}

/*Array.prototype.move = function (iOld, iNew) {
	if(iOld < 0) iOld = 0; if(iOld >= this.length) iOld = this.length-1;
	if(iNew < 0) iNew = 0; if(iNew >= this.length) iNew = this.length-1;
	var itm = this[iOld];
	if(iOld < iNew) { //To move element down, shift other elements up.
		for(var i = iOld; i < iNew; i++) {
			this[i] = this[i+1];
		}
	} else if(iOld > iNew) { //To move element up, shift other elements down.
		for(var i = iOld; i > iNew; i--) {
			this[i] = this[i-1];
		}
	}
	this[iNew] = itm;
};*/

function cleanupAll(dirSet) {
	var fCnt = 0; function subCleanup(fPath) {
		var f = tabPlus.readDir(fPath, IsLocal), sk = Object.keys(f), si;
		for(var i=0,l=sk.length; i<l; i++) { si = f[sk[i]];
			var snt = sk[i].replace(tabService.NameFilter, "").trim();
			if(si instanceof Array && sk[i][0] == '~') snt = '~'+snt; //<-- These chars are allowed only at start, and only for tablists.
			if(sk[i] != snt) { tabPlus.rename(fPath, sk[i], snt, IsLocal); console.log("cleanup renamed tablist",sk[i],"from",(IsLocal?"local":"sync")+fPath,"to",snt); sk[i] = snt; }
			if(si instanceof Array) { if(si.length <= 1) { tabPlus.remove(sk[i], fPath, IsLocal); console.log("cleanup removed tablist",sk[i],"from",(IsLocal?"local":"sync")+fPath); }}
			else {
				if(!fPath) fCnt++; subCleanup(fPath+"/"+sk[i]);
				if(!Object.keys(si).length) { tabPlus.remove(sk[i], fPath, IsLocal); console.log("cleanup removed folder",sk[i],"from",(IsLocal?"local":"sync")+fPath); if(!fPath) fCnt--; }
			}
		}
	}
	subCleanup(""); if(dirSet !== false) { Path = ""; DirContent = sortFolder("") || {}; }
	files.parentNode.parentNode.style.display = fCnt?null:"none";
}

function sortFolder(path) {
	/*var content; if(typeof path == "string") content = tabPlus.readDir(path);
	else { content = path; path = Path; } if(!content) return false;*/
	var content = tabPlus.readDir(path, IsLocal); if(!content) return false;
	
	var newCont = {}, cloneCont = {}, cKeys = Object.keys(content),
	l = cKeys.length, lowest = null, lDate;//, isFolder = false;
	
	//Clone object to prevent ruining the original:
	for(var i=0; i<l; i++) cloneCont[cKeys[i]] = content[cKeys[i]];
	
	//Do the following again for every item:
	for(var p=0,m=l; p<m; p++) {
		//Run through items to find the next in the series, perfering folders to non-folders:
		lowest = null; for(var i=0; i<l; i++) {
			var key = cKeys[i], folder = !(cloneCont[key] instanceof Array);
			
			//Folder & Alphabetically Sotrted:
			//if(lowest === null || (key < lowest && folder == isFolder) ||
			//(folder && !isFolder)) { lowest = key; isFolder = folder; }
			
			//Date Sorted:
			var dTest; if(!folder) dTest = cloneCont[key][0]; else dTest = getNewestDate(path+"/"+key);
			if(lowest === null || isDateNewer(dTest, lDate)) { lowest = key; lDate = dTest; }
		}
		//Add the item to newCont (the order is all we're changing) and remove it from cloneCont:
		newCont[lowest] = cloneCont[lowest]; delete cloneCont[lowest];
		cKeys = Object.keys(cloneCont); l = cKeys.length;
	}
	return newCont;
}

function getNewestDate(path) {
	var fCont = tabPlus.readDir(path, IsLocal), fKeys = Object.keys(fCont), tItm, newest = false;
	if(!fCont) return false; for(var m=0,k=fKeys.length; m<k; m++) {
		if(fCont[fKeys[m]] instanceof Array) tItm = fCont[fKeys[m]][0];
		else tItm = getNewestDate(path+"/"+fKeys[m]);
		if(!newest || isDateNewer(tItm, newest)) newest = tItm;
	}
	return newest;
}

function isDateNewer(a, b) {
	if(typeof a != "string") return false; if(typeof b != "string") return true;
	a = a.split('.'); a = new Date((Number(a[0])+1)+"/"+a[1]+"/"+a[2]+"/"+a[3]+":"+a[4]+":"+a[5]);
	b = b.split('.'); b = new Date((Number(b[0])+1)+"/"+b[1]+"/"+b[2]+"/"+b[3]+":"+b[4]+":"+b[5]);
	return a > b;
}

function parseBytes(num) {
	if(num >= 1e+9) return Math.floor(num/1e+9)+"GB";
	if(num >= 1e+6) return Math.floor(num/1e+6)+"MB";
	if(num >= 1000) return Math.floor(num/1000)+"KB";
	return num+"B";
}
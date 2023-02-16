//TabPlus Main Script. Ray 2016, All rights reserved.

/*TODO:
- Implement extension options
- Minify CSS and JS files to save space

if(!window.DLIST) window.DLIST=[],window.dRem=() => {window.DLIST.each(d => d.remove());window.DLIST=[]};
if(window.DLIST.length<150) {window.DLIST.push(utils.mkDiv(document.body,null,{top:r.top+scrollY,left:r.left+scrollX,position:'absolute',width:r.w,height:r.h,background:'rgba(255,0,0,.3)'}))}
function cleanupAll(dirSet) {
	var fCnt = 0; function subCleanup(fPath) {
		var f = tabPlus.readDir(fPath, IsLocal), sk = Object.keys(f), si;
		for(var i=0,l=sk.length; i<l; i++) { si = f[sk[i]];
			var snt = sk[i].replace(tabService.NameFilter, "").trim();
			if(si instanceof Array && sk[i][0] == '~') snt = '~'+snt; //<-- These chars are allowed only at start, and only for tablists.
			if(sk[i] != snt) { tabPlus.rename(fPath, sk[i], snt, IsLocal); console.log("cleanup renamed tablist",sk[i],"from",(IsLocal?"local":"sync")+fPath,"to",snt); sk[i] = snt; }
			if(si instanceof Array) { if(si.length <= 1) { tabPlus.remove(sk[i], fPath, IsLocal); console.log("cleanup removed tablist",sk[i],"from",(IsLocal?"local":"sync")+fPath); }}
			else {
				if(!fPath) fCnt++; subCleanup(fPath+'/'+sk[i]);
				if(!Object.keys(si).length) { tabPlus.remove(sk[i], fPath, IsLocal); console.log("cleanup removed folder",sk[i],"from",(IsLocal?"local":"sync")+fPath); if(!fPath) fCnt--; }
			}
		}
	}
	subCleanup(""); if(dirSet !== false) { Path = ""; DirContent = sortFolder("") || {}; }
	files.parentNode.parentNode.style.display = fCnt?null:"none";
}*/
const NewTxt=`Welcome to TabPlus!\n\n\
Changes in ${VER}:\n\
- Ported to the new manifest v3 API.\n\
- Total codebase rewrite with asynchronous architecture and service workers, for massively improved performance and stability.\n\
- Fixed graphical bugs on loading screen in newer Chrome(/Chromium) versions.\n\
- More error messages (instead of failing silently, without telling you!)\n\
- Automatic restore-from-backup on critical sync error. Say no more to the sync tab eating your tabs into the void because your internet is slow.\n\
- INFINITE SCROLLING! (Yeah boiii, now you can legit have 10,000+ tabs with zero lag! Tabs load via pop-in, as you scroll, similar to Discord and other messengers.)\n\n\
TIP: Try holding shift while moving, dragging, or deleting tabs. It's pretty handy!`;

'use strict';
const LoadOvf=100; //Load Overflow Margin
let DB, TabPlus, Path,
DirCont, LoadFlag;

window.onload=async () => {try {
	DB=document.body, GUI.runIconLoader(), TabServiceInit(),
	(TabPlus=new TabManager(1)).onFirstLoad=() => alert(NewTxt);
	await TabPlus.loadTabStore(), await utils.delay(600), initLoad();
} catch(e) {hErr(e)}}

//-- Page Control

function initLoad() {
	TabPlus.onChanged=setPath;
	saveSel.onclick=saveToDisk.wrap("tabs");
	loadSel.onclick=loadFromDisk;
	lTab.path='local/', sTab.path='sync/', folders.noDrop=1;
	sTab.onclick=lTab.onclick=tClick;
	nFold.onclick=() => {
		let n=findName("New Folder",DirCont); DirCont[n]=1;
		GUI.renameFolder(GUI.addFolder(n,'',fNav,1));
	}
	(window.onpopstate=setFromHash)();
}
function setFromHash() {
	let p=decodeURIComponent(location.hash.substr(1));
	if(p==Path) return; setPath(p); //Auto-switch tab if no content:
	//if(!Object.keys(DirCont).length) setPath(isSync(p)?'local/':'sync/');
}

async function drawPage() {
	GUI.clearFolders(); GUI.clearTLists();
	if(Path.indexOf('/')!=Path.lastIndexOf('/')) GUI.addFolder("..", "Click to go back", fBack);
	let k,n,t=[]; for(k in DirCont) {
		if(Array.isArray(n=DirCont[k])) t.push(new GUI.TabList(k,n));
		else GUI.addFolder(k, getNewestDate(Path+k), fNav, 1);
	}
	await utils.delay(1); t.each(t => t.bCheck());
	document.fonts.ready.then(GUI.endLoad);
}

//-- Path Handling

let readDir=p => p==Path?DirCont:TabPlus.readDir(p), pathIn=f => Path+f.fName+'/',
pathOut=p => (p=p||Path,p.substring(0,p.lastIndexOf('/',p.length-2)+1));
function tClick() {setPath(this.path)}
function fNav() {setPath(pathIn(this))}
function fBack() {setPath(pathOut())}

//-- File Control

function isSync(p) {return (p||Path).startsWith('sync')?1:0}
function setBar() {
	tabStats.textContent=`${TabPlus.totalTabs} Tabs (${TabPlus.totalUse} Sync Used)`;
}
function setPath(p) {try {
	if(!LoadFlag) GUI.runIconLoader(1); if(!p) p='local/';
	console.log('setPath',p);
	if(isSync(p)) lTab.classList.remove('sel'),sTab.classList.add('sel');
	else lTab.classList.add('sel'),sTab.classList.remove('sel');
	DirCont=sortFolder(p); location.hash=encodeURIComponent(Path=p);
	setBar(); pathBar.textContent=p; setTimeout(drawPage,1);
} catch(e) {hErr(e)}}

function sortFolder(p) {
	let d=TabPlus.readDir(p),nd={},v=Object.keys(d).length,k,t,ln,ld;
	while(v--) { //Date Sort
		ln=null; for(k in d) {
			if(Array.isArray(d[k])) t=d[k][0]; else t=getNewestDate(p+k);
			if(ln===null || isDateNewer(t,ld)) ln=k,ld=t;
		}
		nd[ln]=d[ln]; delete d[ln];
	}
	return nd;
}

function flush() {TabPlus.set(Path,DirCont)}
async function doSync(all) {try {
	if(await TabPlus.awaitSync(all?[0,1]:isSync())) return;
	flush(); await TabPlus.sync(all?null:isSync()); setBar();
} catch(e) {hErr(e)}}

function readAll() {
	let d=[]; TabPlus.sTypes.each(s => {d.push(readSub(s+'/'))});
	return d;
}
function readSub(p) {
	let d=readDir(p),k,o={};
	for(k in d) o[k]=Array.isArray(d[k])?d[k]:readSub(p+k+'/');
	return o;
}
function tlFromDirs(d,tl,p) {
	tl=tl||{tt:0},p=p||'/'; for(let k in d) Array.isArray(d[k])?
		(tl[p+k]=d[k],tl.tt+=d[k].length-1):tlFromDirs(d[k],tl,p+k+'/');
	return tl;
}

//-- Disk Load/Save

async function saveToDisk(n) {await utils.delay(1),saveAsFile(n,readAll())}
function saveAsFile(n,d) {
	console.log("Save File",n,d);
	let b=new Blob([JSON.stringify(d)], {type:'text/plain'}),
	dl=document.createElement('a'); dl.download=n+'.tpp';
	dl.href=URL.createObjectURL(b); dl.click(); URL.revokeObjectURL(b);
}

function loadFromDisk() {
	//Uploader & Elements
	let up=new Uploader('.tpp',uCont),pop=uCont.parentNode,rp;
	pop.style.display=null; uClose.onclick=()=>close();
	setTimeout(()=>{pop.style.opacity=1},20);
	//Parse Files
	up.onFileLoad=d => {
		let ts,r; try {ts=JSON.parse(d)} catch(e) {return "Invalid JSON Data"}
		if(!(Array.isArray(ts)) || ts.length!=2) return "Invalid TabList";
		if(r=ts.each((t,n) => (tstFold(t,'/',n)||(ts[n]=tlFromDirs(t),null)))) return r;
		setTimeout(() => {
			let uc=utils.mkDiv(utils.mkDiv(uCont,'upFileBox'),'upContents'),
			ll=ts[0].tt, sl=ts[1].tt; delete ts[0].tt; delete ts[1].tt;
			uc.innerHTML="<div class='icon'></div><span>Select an option</span><br>";
			up.element.style.display='none';
			if(ll>0) fLoadOpt(uc,"Load Local Tabs",ll,close.wrap(ts[0]));
			if(sl>0) fLoadOpt(uc,"Load Synced Tabs",sl,close.wrap(null,ts[1]));
			if(ll>0 && sl>0) fLoadOpt(uc,"Load All Tabs",ll+sl,close.wrap(ts[0],ts[1]));
			if(sl>0) fLoadOpt(uc,"Load All Tabs As Local",ll+sl,
				() => close(mixTLists(ts[0],ts[1])));
			fLoadOpt(uc,"Cancel",null,()=>close());
			utils.mkEl('br',uc), utils.mkEl('br',uc), utils.mkEl('br',uc);
			rp=utils.mkEl('input',uc,null,{display:'initial',marginRight:'6px'}),
			rp.type='checkbox', rp.checked=1, rp.id='RP';
			utils.mkEl('label',uc,null,null,"Replace Existing").setAttribute('for','RP');
		},1000);
	}
	async function close(lt,st) {
		uClose.onclick=null, pop.style.opacity=0; setTimeout(() => {
			up.remove(),uCont.replaceChildren(),pop.style.display='none';
		},1200);
		if(lt||st) {
			await saveToDisk("backup");
			if(lt && !rp.checked) lt=mixTLists(TabPlus.getTabs(0),lt);
			if(st && !rp.checked) st=mixTLists(TabPlus.getTabs(1),st);
			await TabPlus.loadTabStore([lt,st]); setPath();
		}
	}
}
function tstFold(f,p,n) { //Test folders recursively
	if(typeof f!='object' || Array.isArray(f)) return `Invalid Folder @ ${n}:`+p;
	for(let k in f) if(Array.isArray(f[k])) {
		if(!TabPlus.PathTest.test(p+k) || f[k].length<2 || !testDate(f[k][0]))
			return `Bad TabList Entry @ ${n}:`+p+k;
	} else return tstFold(f[k],p+k+'/',n);
}
function fLoadOpt(p,n,sn,clk) {
	utils.mkEl('br',p); let l=utils.mkEl('label',p); l.onclick=clk;
	l.innerHTML=`<b>${n}</b>${sn?` (${sn})`:''}`;
}
function mixTLists(a,b) {
	let k,n,l,s,t,v; for(k in b) {
		v=b[k], k=k.split('/'), s=k.pop(), k=k.join('/')+'/',
		n=0, l=s.startsWith('~'); t=s=l?s.substr(1):s;
		while(a[k+t]||a[k+'~'+t]) t=s+` (${++n})`;
		a[k+(l?'~':'')+t]=v;
	}
	return a;
}

//-- Events

GUI.onFolderMoved=async (n,np) => {
	if(await TabPlus.awaitSync()) return; console.log("Move folder",n,"to",np);
	n+='/'; await TabPlus.moveFolder(Path+n,np+n); DirCont=sortFolder(Path);
}
GUI.onTabsMoved=async (n,np) => {
	if(await TabPlus.awaitSync()) return; console.log("Move tabs",n,"to",np);
	await TabPlus.moveTabList(Path+n,np); DirCont=sortFolder(Path);
}
GUI.onTabMoved=async (np,d) => {
	if(await TabPlus.awaitSync()) return; console.log("Move tab",d,"to",np);
	let p=Path==np,o=p?DirCont:{}; o[genName(readDir(np))]=d; if(!p) TabPlus.set(np,o,1);
	doSync(isSync()!=isSync(np)).then(() => {if(p) setPath(Path)});
}
GUI.onTabsLocked=GUI.onNameChange=async (ot,nt,fd) => {
	if(nt==ot || await TabPlus.awaitSync()) return;
	console.log("Rename",fd?"folder":"tabs",ot,"to",nt);
	if(fd) await TabPlus.moveFolder(Path+ot+'/',Path+nt+'/'); else {
		if(DirCont[nt]||!DirCont[ot]) throw `Name ${nt} taken or invalid`;
		DirCont[nt]=DirCont[ot]; delete DirCont[ot]; doSync();
	}
}
GUI.onTabsRemoved=async t => {console.log("Remove",t),delete DirCont[t],doSync()}

//-- Support

async function hErr(e) {
	try {alert(e),await TabPlus.loadTabStore(),setPath()}
	catch(e) {alert(e),location.hash='',location.reload()} throw e;
}
function getNewestDate(p) {
	let d=readDir(p+'/'),k,n; for(k in d) {
		if(Array.isArray(d[k])) k=d[k][0]; else continue;
		if(!n || isDateNewer(k,n)) n=k;
	}
	return n;
}
function isDateNewer(a,b) {
	if(typeof a != 'string') return; if(typeof b != 'string') return 1;
	a=a.split('.'), a=new Date((Number(a[0])+1)+'/'+a[1]+'/'+a[2]+'/'+a[3]+':'+a[4]+':'+a[5]);
	b=b.split('.'), b=new Date((Number(b[0])+1)+'/'+b[1]+'/'+b[2]+'/'+b[3]+':'+b[4]+':'+b[5]);
	return a>b;
}
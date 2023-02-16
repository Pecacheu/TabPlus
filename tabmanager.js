//TabPlus Tab Manager. Ray 2016, All rights reserved

'use strict';
const VER='v'+chrome.runtime.getManifest().version;
/*function TestStore() {
	let s={}; this.get=async () => utils.copy(s);
	this.set=async o => {for(let k in o) s[k]=utils.copy(o[k])}
	this.remove=async kl => {kl.each(k => {delete s[k]})}
	this.clear=async () => {s={}}
}*/

function TabManager(useTabs) {
	this.sTypes=['local','sync'], this.NameFilter=/[^ -.0-\[\]^_a-z|]/g,
	this.PathTest=/^(\/[ -.0-\[\]^_a-z|]+)*\/~?[ -.0-\[\]^_a-z|]+$/;
	const NameRpl=/[^\x00-\x7F]/g, sDb=[chrome.storage.local,chrome.storage.sync],
	SyncDelay=1000; //Min cooldown after sync
	let lo,tabs=[],back=[],tc=[],dSync=[];

	//Extension Options
	const opts={
		NameMaxLen:30, //Max TabList/folder name length
		TNameMax:100, //Max tab name length
		NoDelayTabs:15, //Max tabs before auto-delay
		TabDelay:500, //Auto-delay (ms)
		//SavePinned:0, //Save pinned tabs TODO: Not yet implemented
		NewWindows:1, //0:Never, 1:When No Other Tabs, 2:Always
		TPVer:0
	}
	this.loadOpts=async () => {
		lo=1; let o=await sDb[1].get(opts),k; for(k in o) this[k]=o[k];
		if(useTabs && this.TPVer!=VER) {
			if(this.onFirstLoad) this.onFirstLoad();
			this.TPVer=VER,await this.setOpts();
		}
	}, this.setOpts=async () => {
		let o={},k; for(k in opts) o[k]=this[k]; await sDb[1].set(o);
	}

	//General
	utils.define(this, 'totalTabs', () => tc[0]+tc[1]);
	this.loadTabStore=async nTl => {
		if(!lo) await this.loadOpts();
		await this.awaitSync(); dSync.s=Object.keys(tabs);
		if(nTl) {
			for(let i=0,l=nTl.length,n; i<l; ++i) if(n=nTl[i])
				await sDb[i].clear(),await loadTabs(i,n);
			await this.sync(null,1);
		} else await loadTabs(0),await loadTabs(1),await getUse();
		dSync.s=0;
	}
	let getUse=async () => {
		this.totalUse=Math.floor(await sDb[1].getBytesInUse()/sDb[1].QUOTA_BYTES*100)+'%';
	}, loadTabs=async (s,db) => {try {
		let d=db||await sDb[s].get(), dd=tabs[s]={},
		ss=this.sTypes[s], tt=0,rd,k,p,t,n,di;
		for(k in d) if(k[0]=='/') {
			di=k.lastIndexOf('/'),p=k.substr(0,di),t=k.substr(di+1),n=d[k];
			if(di==-1 || !this.PathTest.test(k) || d[p+'/~'+t] || d[p]
			|| !Array.isArray(n) || !testDate(n[0]) || !Array.isArray(n[1])) {
				if(!rd) alert("Corrupt data was found. Cleaning..."),dd=[],rd=1;
				dd.push(k); console.log("Del bad",ss+k);
			} else dd[k]=n, tt+=n.length-1, n.each(t => {t[0]=trimTab(t[0])},1);
		}
		if(rd) {await sDb[s].remove(dd);return loadTabs(s)}
		tc[s]=tt, back[s]=db?{}:utils.copy(dd); console.log("READ",ss,tt,dd);
	} catch(e) {throw "Error reading database:\n"+e}},
	trimTab=n => (n.length>this.TNameMax?
		n.substr(0,this.TNameMax-3)+'...':n).replace(NameRpl,'');

	//Directory Operations
	let tStore=(p,fd) => {
		let n=p.indexOf('/'),s=p.substr(0,n),t=this.sTypes.indexOf(s);
		if(t!=-1) s=tabs[t]; else throw "Bad path type";
		if(!fd==p.endsWith('/')) throw "Bad path trail";
		return [s,p.substr(n),t];
	}
	this.getTabs=s => tabs[s];
	this.readDir=(path,rec) => {
		let d=tStore(path,1),k,pl,st,p={}; path=d[1],d=d[0],pl=path.length;
		for(k in d) if(k.length>pl && k.startsWith(path)) {
			if(rec || (st=k.indexOf('/',pl))==-1) p[k.substr(pl)]=d[k];
			else p[k.substring(pl,st)]=1;
		}
		return p;
	}
	let DS=() => {if(dSync.s) throw "Sync in progress!"}
	this.moveFolder=async (op,np) => {
		DS(); let d=this.readDir(op,1),od=tStore(op,1),nd=tStore(np,1),
		ot=od[2],nt=nd[2],k,rc={},x,n,v; op=od[1],np=nd[1],od=od[0],nd=nd[0];
		if(ot==nt && (op.startsWith(np)||np.startsWith(op)))
			throw "Cannot move a folder into itself!";
		for(k in d) {
			x=k.lastIndexOf('/'), n=x==-1?k:k.substr(x+1);
			v=np+k.substr(0,x+1), x=this.sTypes[nt]+v;
			n=findName(n,rc[x]||(rc[x]=this.readDir(x)));
			if(!od[op+k]||nd[v+n]) throw `TabList ${op+k} invalid`;
			if(!this.PathTest.test(v+n)) throw v+n+" failed path test!";
			nd[v+n]=od[op+k],rc[x][n]=1; delete od[op+k];
		}
		await this.sync(nt==ot?nt:null);
	}
	this.moveTabList=async (op,np) => {
		DS(); let n,pp=np,od=tStore(op),nd=tStore(np,1),ot=od[2],nt=nd[2];
		op=od[1],np=nd[1],od=od[0],nd=nd[0], n=op.substr(op.lastIndexOf('/')+1);
		np+=findName(n,this.readDir(pp)); if(!od[op]||nd[np]) throw `TabList ${op} invalid`;
		nd[np]=od[op]; delete od[op]; await this.sync(nt==ot?nt:null);
	}

	//New TabList
	this.writeTabs=async tl => {
		let l='local/',n=genName(this.readDir(l));
		tl.each(t => {t[0]=trimTab(t[0])},1);
		tabs[0]['/'+n]=tl; await this.sync(0); return l+n;
	}
	//Set TabLists (not folders)
	this.set=(path,tl,nDel) => {
		DS(); let k,d=tStore(path,1),od=this.readDir(path); path=d[1],d=d[0];
		if(!nDel) for(k in od) if(Array.isArray(od[k])) delete d[path+k];
		for(k in tl) if(Array.isArray(tl[k])) d[path+k]=tl[k];
	}

	//Auto Sync
	chrome.storage.onChanged.addListener(async () => {
		if(dSync.s) return; console.log("Data changed!");
		await this.loadOpts(); if(useTabs) await this.loadTabStore();
		if(this.onChanged) this.onChanged();
	});
	this.awaitSync=async nb => {if(dSync.s) {
		if(nb!=null) {
			if(!Array.isArray(nb)) nb=[nb];
			if(!nb.each(n => dSync.s.indexOf(n)==-1?1:null)) return 1;
			dSync.s.push(nb);
		}
		let o={}; dSync.push(o);
		do {while(dSync.s) await utils.delay(50)} while(dSync[0]!=o);
		dSync.shift(); if(dSync.e) return dSync.length?0:(dSync.e=0),1;
	}}
	this.sync=async (sl,pe) => {
		let ts=sl; sl=sl==null?Object.keys(tabs):[sl];
		if(!pe && await this.awaitSync(sl)) return;
		dSync.s=Array.from(sl); let i=0,l=sl.length,s,er;
		console.log("Sync Data",sl);
		try {for(; i<l; ++i) {
			s=sl[i]; let tt=0,k,db=sDb[s],d=tabs[s],od=back[s],dd=[];
			for(k in d) tt+=d[k].length-1; tc[s]=tt;
			for(k in od) if(!d[k]) dd.push(k);
			/*let cd=[],cn=[]; for(k in d) if(!od[k]) cn.push(k);
				else if(od[k].length!=d[k].length) cd.push(k+` [${od[k].length} -> ${d[k].length}]`);
			console.log("Changes: --",dd,"~~",cd,"++",cn);*/
			await db.set(d); if(dd.length) await db.remove(dd);
			await getUse();
		}} catch(e) {er=e}
		if(er) { //Restore from backup
			if(dSync.e) {
				try {document.body.replaceChildren()} catch(e) {}
				alert("Critical Failure: Could not restore backup!\n"+er); throw er;
			}
			for(i=0; i<l; ++i) tabs[s=sl[i]]=back[s],back[s]=await sDb[s].get();
			dSync.e=1; setTimeout(()=>this.sync(ts,1),1);
			throw er+"\nPlease wait, restoring from backup...";
		} else for(i=0; i<l; ++i) back[s=sl[i]]=utils.copy(tabs[s]);
		setTimeout(()=>{dSync.s=0},SyncDelay);
	}
}

//Useful Functions
function genDate() {
	let d=new Date(); return d.getMonth()+'.'+d.getDate()+'.'+
	d.getFullYear()+'.'+d.getHours()+'.'+d.getMinutes()+'.'+d.getSeconds();
}
function testDate(d) {
	if(typeof d!='string') return; d=d.split('.');
	return d.length==6 && !d.each(n => Number.isInteger(Number(n))?null:1);
}
function noName(n) {return /^_\d+$/.test(n)}
function pType(p) {return p.substr(0,p.indexOf('/'))}
function genName(dir) {let n=0,s; while(dir[s='_'+n]||dir['~'+s]) ++n; return s}
function findName(n,dir) {
	let c=1,s,l=n.startsWith('~'); if(l) n=n.substr(1);
	l=l?'~':''; if(n.startsWith('_')) return l+genName(dir);
	if(!dir[n]&&!dir['~'+n]) return l+n;
	while(dir[s=n+` (${c})`]||dir['~'+s]) ++c; return l+s;
}
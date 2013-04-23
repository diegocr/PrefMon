/* ***** BEGIN LICENSE BLOCK *****
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/
 *
 * The Original Code is Preferences Monitor Mozilla Extension.
 *
 * The Initial Developer of the Original Code is
 * Copyright (C)2013 Diego Casorran <dcasorran@gmail.com>
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

let ecleaner = {};

(function (w) {
	
	let {classes:Cc,interfaces:Ci,utils:Cu,results:Cr} = Components,
		d = w.document, $ = d.getElementById.bind(d),
		pkg = 'eCleaner v2.3';
	
	Cu.import("resource://gre/modules/Services.jsm");
	Cu.import("resource://gre/modules/AddonManager.jsm");
	
	let eReserved = [
		'alwaysUnpack', 'blocklist', 'bootstrappedAddons', 'databaseSchema',
		'dss', 'enabledAddons', 'enabledItems', 'getAddons', 'getMoreThemesURL', 'installCache',
		'lastAppVersion', 'logging', 'pendingOperations', 'spellcheck', 'update',
		'webservice', '{972ce4c6-7e08-4474-a285-3208198ce6fd}', 'change', 'checkCompatibility',
		'installedDistroAddon', 'modern@themes', 'input', 'lastPlatformVersion', 'ui',
		'autoDisableScopes', 'shownSelectionUI', 'minCompatibleAppVersion', 'minCompatiblePlatformVersion',
		'strictCompatibility', 'hotfix'
	];
	let nReserved = [
		'browser','dom','intl','javascript','services','security','profiler','privacy','print','plugins',
		'plugin','places','pdfjs','nglayout','network','mousewheel','middlemouse','memory','media','layout',
		'lightweightThemes','layers','inspector','images','image','idle','html5','gfx','general','gecko','font',
		'editor','devtools','app','accessibility','capability','social','stagefright','toolkit','bidi','profile',
		'view_source','pfs','webgl','hangmonitor','permissions','prefs','signon','device','offline-apps','jsloader',
		'svg','geo','urlclassifier','prompts','slider','focusmanager','viewmanager','full-screen-api','converter',
		'gestures','keyword','zoom','notification','startup','breakpad','alerts','advanced','application',
		'xpinstall','clipboard','toolbar','signed','pref','print_printer','storage','datareporting','wap',
		'memory_info_dumper','spellchecker','gl','plain_text'
	];
	let pReserved = [
		'addons.sqlite','blocklist.xml','bookmarkbackups','cert8.db','compatibility.ini','content-prefs.sqlite',
		'cookies.sqlite','cookies.sqlite-shm','cookies.sqlite-wal','downloads.sqlite','extensions','extensions.ini',
		'extensions.sqlite','extensions.sqlite-journal','formhistory.sqlite','key3.db','localstore.rdf','mimeTypes.rdf',
		'minidumps','parent.lock','permissions.sqlite','places.sqlite','places.sqlite-shm','places.sqlite-wal',
		'pluginreg.dat','prefs.js','search.json','secmod.db','sessionstore.bak','sessionstore.js','signons.sqlite',
		'urlclassifierkey3.txt','webapps','webappsstore.sqlite','bookmarks.html','cert_override.txt','chrome',
		'chromeappsstore.sqlite','lightweighttheme-footer','lightweighttheme-header','localstore-safe.rdf',
		'search-metadata.json','search.sqlite','urlclassifier3.sqlite','searchplugins','signons3.txt',
		'history.dat','hostperm.1','lwtheme','addons.sqlite-journal','persdict.dat','.parentlock','.autoreg',
		'webappsstore.sqlite-shm','webappsstore.sqlite-wal'
	];
	
	let RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService),
		LS = Cc["@mozilla.org/rdf/datasource;1?name=local-store"].getService(Ci.nsIRDFDataSource);
	
	function c(n,a,e) {
		if(!(n = d.createElement(n)))
			return null;
		
		if(a)for(let x in a)n.setAttribute(x,n[x] = '' + a[x]);
		if(e)for(let i = 0, m = e.length ; i < m ; ++i ) {
			if(e[i]) n.appendChild(e[i]);
		}
		return n;
	}
	
	function add(b, g, n, e, i) {
		g = {
			label: decodeURIComponent(g),
			data: e && JSON.stringify(e) || 'null'
		};
		if( i ) {
			g.image = /^\w+$/.test(i) ? 'chrome://prefmon-ecleaner/content/'+i+'.png':i;
			g.class = 'listcell-iconic';
		}
		return b.appendChild(c('listitem',0,[c('listcell',g),c('listcell',{label:n})]))
	}
	
	function so(obj) {
		let keys = [];
		for (let k in obj)
			keys.push(k);
		// Services.console.logStringMessage(keys);
		keys.sort(function (a, b)a.toLowerCase() > b.toLowerCase());
		var nObj = {};
		for each(let k in keys)
			nObj[k] = obj[k];
		return nObj;
	}
	
	function x(a, b) {
		Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).alert(a.defaultView, pkg, b);
	}
	
	function Window() Services.wm.getMostRecentWindow('navigator:browser');
	function OpenURL(base,q) {
		let W = Window(),
			B = W.gBrowser;
		
		let u = base + (q ? q : '');
		if(new RegExp('^'+base).test(B.contentWindow.location.href)) {
			W.loadURI(u);
		} else {
			B.selectedTab = B.addTab(u);
		}
	}
	function nf(p) {
		let f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		f.initWithPath(p);
		return f;
	}
	
	let triggerNode;
	ecleaner.pop = function(ev) {
		let n = triggerNode.firstElementChild.label.split(':'),
			z = JSON.parse(triggerNode.firstElementChild.getAttribute('data')),
			j = ({e:0,p:1,d:2,l:3})[triggerNode.parentNode.id[0]];
		if( j < 2 ) {
			n = encodeURIComponent((z?(j?'Mozilla Firefox Profile ':z+'.'):'')+(n[1] || n[0]));
		} else {
			n = encodeURIComponent(j-2?n[0]:z.t);
		}
		switch(parseInt(ev.target.id)) {
			case 1:
				switch(j) {
					case 2:
						OpenURL(z.u);
						break;
					case 1:
						try {
							nf(z).reveal();
						} catch(e) {
							x(d, e);
						}	break;
					case 3:
					case 0: {
						let p = Services.prefs,
							k = 'general.warnOnAboutConfig',
							v = p.getBoolPref(k);
						
						if(v) {
							p.setBoolPref(k, !1);
						}
						OpenURL('about:config','?filter='+n);
						
						if(v) {
							w.setTimeout(function() p.setBoolPref(k, !0), 900);
						}
					}
				}
				break;
			case 2:
				OpenURL('https://www.google.com/search','?q='+n)
		}
	};
	
	let io = Services.io;
	function newURI(u) io.newURI(u,null,null);
	
	let tld = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService),
		fis = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);
	function gf(u) {
		u = newURI(u);
		let i = fis.getFaviconImageForPage(u);
		if(i.equals(fis.defaultFavicon)) {
			i = fis.getFaviconImageForPage(newURI(u.prePath));
			if(i.equals(fis.defaultFavicon)) {
				if(!(/^[\d.]+$/.test(u.host))) {
					i = fis.getFaviconImageForPage(newURI(u.scheme+'://'+tld.getBaseDomainFromHost(u.host)));
				}
				if(i.equals(fis.defaultFavicon)) {
					/**
					 * Generate favicon from url's hash
					 * Inspired by Don Park's Identicon
					 * Copyright (C)2013 Diego Casorran
					 * [Made for eCleaner Fx Extension]
					 */
					let canvas = d.createElementNS("http://www.w3.org/1999/xhtml", "canvas"),
						ctx = canvas.getContext("2d");
					canvas.width = canvas.height = 16;
					ctx.fillStyle = "#"+hash(u.prePath).toString(16);
					ctx.beginPath();
					ctx.arc(8, 8, 8, 0, Math.PI*2, !0);
					ctx.closePath();
					ctx.fill();
					i = newURI(canvas.toDataURL("image/png"));
				}
			}
		}
		return i.spec;
	}
	
	let tbl = [];
	for (let i = 0; i < 256; ++i) {
		let n = i << 8;
		for (let j = 8; j > 0; --j)
			n = n & 0x8000 ? (n << 1) ^ 0x1021 : n << 1;
		tbl.push(n & 0xffff);
	}
	function hash(str) {
		let h=0xfffe,
			n=str.length;
		while(n--)
			h=tbl[((h>>8)^str.charCodeAt(n))&0xff]^((h<<8)&0xffff);
		return (h << 7) ^ 0xfffffe;
	}
	
	function flt() {
		let v = $('Filter').value.toLowerCase(),
			i = $('tabbox').selectedIndex;
		
		switch(i) {
			case 0: i = 'extension';  break;
			case 1: i = 'profile';    break;
			case 2: i = 'downloads';  break;
			case 3: i = 'localstore'; break;
		}
		
		i = IterateList(i,null,function(n,l,d) {
			l = '' + l + '~' + (d && d.u || '');
			if(v && !~l.toLowerCase().indexOf(v)) {
				n.parentNode.setAttribute('hidden', 'true');
			} else {
				if(n.parentNode.hasAttribute('hidden')) {
					n.parentNode.removeAttribute('hidden');
				}
			}
		});
		i.scrollToIndex(i.getNumberOfVisibleRows()-1);
		i.scrollToIndex(0);
		// XXX: fixme..
		i = i.ownerDocument.getAnonymousElementByAttribute(i,'rows','10');
		i.style.overflow = v ? 'hidden' : 'auto';
	}
	
	function lsf(u,cb) {
		let R = RDF.GetResource(u),
			P = LS.ArcLabelsOut(R),
			C = 0;
		
		while(P.hasMoreElements()) {
			let e = P.getNext();
			if(e instanceof Ci.nsIRDFResource) {
				e.QueryInterface(Ci.nsIRDFResource);
				// let n = LS.GetTarget(R,e,!0);
				// LS.Unassert(R,e,n);
				let n = LS.GetTargets(R,e,!0);
				while(n.hasMoreElements()) {
					let i = n.getNext();
					if(i instanceof Ci.nsIRDFNode) {
						i.QueryInterface(Ci.nsIRDFNode);
						if(cb)cb(R,e,i);
						C++;
					}
				}
			}
		}
		return C;
	}
	
	function ldr() {
		let l = $('extension_list'), n,t,h,s,
			p = Services.prefs.getBranch('');
		
		$('ec_title').value = pkg;
		
		let badge = d.createElement('html:div');
		badge.style.cssText = 'position:fixed;background-color:#18bde6;color:#fff;'
			// + 'top: 16px; left: -50px; transform:rotate(-25deg);'
			+ 'top: 12px; left: -45px; transform:rotate(-20deg);'
			+ 'width: 200px; height: auto; display: block; text-align:center;'
			+ 'padding:4px;box-shadow:0 0 2px rgba(0,0,0,0.8);font:13px Georgia';
		badge.textContent = 'PrefMon Edition';
		d.documentElement.lastElementChild.appendChild(badge);
		
		t = c('tabbox',{flex:1,id:'tabbox',oncommand:"ecleaner.f()"},[
			c('tabs',0,[
				c('tab',{label:'  Extensions  '}),
				c('tab',{label:'  Profile  '}),
				c('tab',{label:'  Downloads  '}),
				c('tab',{label:'  LocalStore  '})
			]),
			c('tabpanels',{flex:1,class:'xul_nosp'},[
				c('tabpanel',0,[  l.cloneNode(true)]),
				c('tabpanel',0,[n=l.cloneNode(true)]),
				c('tabpanel',0,[h=l.cloneNode(true)]),
				c('tabpanel',0,[s=l.cloneNode(true)])
			])
		]);
		n.id = 'profile_list';
		n.firstElementChild.firstElementChild.setAttribute('label','Entry');
		n.firstElementChild.lastElementChild.setAttribute('label','Items');
		h.id = 'downloads_list';
		h.firstElementChild.firstElementChild.setAttribute('label','File');
		h.firstElementChild.lastElementChild.setAttribute('label','Date');
		s.id = 'localstore_list';
		s.firstElementChild.firstElementChild.setAttribute('label','Resource');
		s.firstElementChild.lastElementChild.setAttribute('label','Nodes');
		l.parentNode.replaceChild(t,l);
		l = $('extension_list');
		w.sizeToContent();
		
		let ss = {};
		for each(let o in p.getChildList("", {})) {
			o = o.split('.');
			let r = o.shift(), ns = '';
			if (~nReserved.indexOf(r))
				continue;
			if(r === 'extensions') {
				ns = r;
				r = o.shift();
			}
			if (~eReserved.indexOf(r))
				continue;
			if (typeof ss[r] == 'undefined') {
				ss[r] = {cnt: 0, ns: ns};
			}
			ss[r].cnt++;
		}
		ss = so(ss);
		for (let o in ss) {
			if (o.charAt(0) == '{') {
				let __id = o;
				AddonManager.getAddonByID(o, function (x) {
					if (x) {
						if (x.type == 'extension') {
							add(l, x.name + ':' + x.id, ss[x.id].cnt, ss[x.id].ns);
						}
					} else {
						add(l, 'UNKNOWN ADD-ON:' + __id, ss[__id].cnt, ss[__id].ns);
					}
				});
			} else {
				add(l, o, ss[o].cnt, ss[o].ns);
			}
		}
		
		$('contextmenu').addEventListener("popupshowing", function(ev) {
			let obj = ev.target.triggerNode;
			while(obj && obj.localName != "listitem")
				obj = obj.parentNode;
			if (!obj)
				return ev.preventDefault();
			triggerNode = obj;
		}, false);
		
		try {
			Services.scriptloader.loadSubScript('chrome://prefmon-ecleaner/content/readdir.js');
			
			let ProfD = so(readDir(null,pReserved)), l = $('profile_list'), C = readDir.ctl;
			
			for(let e in ProfD) {
				let size = ProfD[e][C+'sizeFmt'], a = ProfD[e][C+'entry'];
				
				add(l, e, ProfD[e][C+'files'] + ' ('+size+')', a.path, a.isDirectory() ? 'folder':'file');
			}
			ProfD = undefined;
			
		} catch(ex) {
			Services.console.logStringMessage(ex);
		}
		
		w.setTimeout(function() {
			
			let nhs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService),
				hsq = nhs.getNewQuery(),
				nso = nhs.getNewQueryOptions();
			
			nso.sortingMode = 3;
			hsq.setTransitions([7],1);
			let hqr = nhs.executeQuery(hsq, nso).root;
			hqr.containerOpen = true;
			
			let l = $('downloads_list'),
				n = hqr.childCount;
			while(n--) {
				let dl = hqr.getChild(n);
				
				add(l, dl.title, new Date(dl.time/1000).toISOString(),
					{t:dl.title,u:dl.uri,d:dl.time}, gf(dl.uri))
						.setAttribute('tooltiptext',decodeURIComponent(dl.uri));
			}
			hqr.containerOpen = false;
			
		}, 400);
		
		w.setTimeout(function(){
			
			let R = LS.GetAllResources(),
				l = $('localstore_list'),
				x = {};
			while(R.hasMoreElements()) {
				let e = R.getNext();
				if(e instanceof Ci.nsIRDFResource) {
					e.QueryInterface(Ci.nsIRDFResource);
					
					let v = e.Value,u=v,
						p = u.indexOf('://') + 1;
					
					if(0 === p) {
						u = u.split(/[?#]/).shift();
					} else {
						while(u.charAt(p) == '/')++p;
						u = u.substr(p,u.indexOf('/',p)-p);
						
						if(~['global','mozapps','browser','components','modules','gre','app'].indexOf(u)) {
							u = v;
							if(!~u.indexOf('#'))
								continue;
							u = 'UI[#' + u.split('#').pop() + ']';
						}
					}
					
					if(u.length > 40)
						u = u.substr(0,40) + '...';
					
					if(!(u in x)) {
						
						x[u] = {c: 0, d: []};
					}
					x[u].c += lsf(v);
					x[u].d.push( v );
				}
			}
			
			x = so(x);
			for(let e in x) {
				
				add(l, e, x[e].c, x[e].d).setAttribute('tooltiptext',x[e].d.join("\n"));
			}
			
		}, 123);
		
		document.getElementById('Filter').focus();
	};
	
	function IterateList(id,m,f) {
		let l = $(id+'_list'), n, i, e = [], tc = 0,
			next = m ? (function() {
				let i = l.getSelectedItem(0);
				return i && l.removeItemAt(l.getIndexOfItem(i));
			}) : (n = l.getRowCount(), function() {
				return n-- && l.getItemAtIndex(n);
			});
		while ((i = next())) {
			
			try {
				let n = i.firstElementChild;
				let r = f(n,n.getAttribute('label'),JSON.parse(n.getAttribute('data')));
				tc += r;
			} catch(ex) {
				e.push(ex.message);
			}
		}
		
		if(!m) {
			if(e.length) {
				Services.console.logStringMessage(pkg+'\n\n'+e.join("\n"));
			}
			return l;
		}
		
		i = tc + ' '+m+'.\n\n';
		if (e.length < 1) {
			i += "Operation completed successfully!";
		} else {
			i += "The following errors occured:\n\n" + e.join("\n");
		}
		Services.prompt.alert(w, pkg, i+"\n");
	}
	
	ecleaner.a = function() ldr();
	ecleaner.f = function() flt();
	ecleaner.z = function() {
		switch($('tabbox').selectedIndex) {
			case 0:
				IterateList('extension','values cleared',function(n,l,d) {
					let s = l.split(':');
					if (s[1] && s[1].charAt(0) == '{')
						l = s[1];
					
					l = (d ? d + '.':'') + l + '.';
					
					let c = 0,
						p = Services.prefs.getBranch(l);
					for each(let k in p.getChildList("", {})) {
						if (p.prefHasUserValue(k))
							try {
								p.clearUserPref(k);
							} catch (u) {}
						c++;
					}
					p.deleteBranch(l);
					return c;
				});
				break;
			case 1:
				IterateList('profile','items removed',function(n,l,d) {
					nf(d).remove(true);
					return parseInt(n.nextElementSibling.label) || 1;
				});
				break;
			case 2:
				let nhs = Cc["@mozilla.org/browser/nav-history-service;1"]
					.getService(Ci.nsINavHistoryService);
				IterateList('downloads','downloads cleared',function(n,l,d) {
					nhs.removePage(newURI(d.u));
					return 1;
				});
				break;
			case 3: {
				IterateList('localstore','nodes removed',function(n,l,d) {
					let c = 0, f = LS.Unassert.bind(LS);
					d.forEach(function(u)c += lsf(u,f));
					return c;
				});
			}	break;
		}
	};
})(window);

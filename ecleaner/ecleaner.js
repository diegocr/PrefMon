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
		pkg = 'eCleaner v2.0';
	
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
		'xpinstall','clipboard','toolbar','signed','pref','print_printer','storage'
	];
	let pReserved = [
		'addons.sqlite','blocklist.xml','bookmarkbackups','cert8.db','compatibility.ini','content-prefs.sqlite',
		'cookies.sqlite','cookies.sqlite-shm','cookies.sqlite-wal','downloads.sqlite','extensions','extensions.ini',
		'extensions.sqlite','extensions.sqlite-journal','formhistory.sqlite','key3.db','localstore.rdf','mimeTypes.rdf',
		'minidumps','parent.lock','permissions.sqlite','places.sqlite','places.sqlite-shm','places.sqlite-wal',
		'pluginreg.dat','prefs.js','search.json','secmod.db','sessionstore.bak','sessionstore.js','signons.sqlite',
		'urlclassifierkey3.txt','webapps','webappsstore.sqlite','bookmarks.html','cert_override.txt','chrome',
		'chromeappsstore.sqlite','lightweighttheme-footer','lightweighttheme-header','localstore-safe.rdf',
		'search-metadata.json','search.sqlite','urlclassifier3.sqlite','user.js','searchplugins','signons3.txt',
		'history.dat','hostperm.1','lwtheme','addons.sqlite-journal','persdict.dat'
	];
	
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
			label: g,
			data: e || ''
		};
		if( i ) {
			g.image = 'chrome://prefmon-ecleaner/content/'+i+'.png';
			g.class = 'listcell-iconic';
		}
		b.appendChild(c('listitem',0,[c('listcell',g),c('listcell',{label:n})]))
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
		
		let u = base + q;
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
			ns = triggerNode.firstElementChild.getAttribute('data'),
			pl = /^profile_/.test(triggerNode.parentNode.id);
		n = encodeURIComponent((ns?(pl?'Mozilla Firefox Profile ':ns+'.'):'')+(n[1] || n[0]));
		switch(parseInt(ev.target.id)) {
			case 1:
				if(pl) {
					try {
						nf(ns).reveal();
					} catch(e) {
						x(d, e);
					}
				} else {
					OpenURL('about:config','?filter='+n);
				}
				break;
			case 2:
				OpenURL('https://www.google.com/search','?q='+n)
		}
	};
	
	function ldr() {
		let l = $('extension_list'), n, t,
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
		
		t = c('tabbox',{flex:1,id:'tabbox'},[
			c('tabs',0,[
				c('tab',{label:'  Extensions  '}),
				c('tab',{label:'  Profile  '})
			]),
			c('tabpanels',{flex:1,class:'xul_nosp'},[
				c('tabpanel',0,[  l.cloneNode(true)]),
				c('tabpanel',0,[n=l.cloneNode(true)])
			])
		]);
		n.id = 'profile_list';
		n.firstElementChild.firstElementChild.setAttribute('label','Entry');
		n.firstElementChild.lastElementChild.setAttribute('label','Items');
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
	};
	
	function IterateList(id,m,f) {
		let l = $(id+'_list'), i, e = [], tc = 0;
		while (i = l.getSelectedItem(0)) {
			l.removeItemAt(l.getIndexOfItem(i));
			
			try {
				let n = i.firstElementChild;
				let r = f(n,n.getAttribute('label'),n.getAttribute('data'));
				tc += r;
			} catch(ex) {
				e.push(ex.message);
			}
		}
		
		i = tc + ' '+m+'.\n\n';
		if (e.length < 1) {
			i += "Operation completed successfully!";
		} else {
			i += "The following errors occured:\n\n" + e.join("\n");
		}
		Services.prompt.alert(w, pkg, i+"\n");
	}
	
	ecleaner.a = function() {
		ldr();
	};
	ecleaner.z = function () {
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
		}
	};
})(window);

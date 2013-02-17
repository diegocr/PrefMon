/* ***** BEGIN LICENSE BLOCK *****
 * Version: BSD License
 *
 * Copyright (c) 2013, Diego Casorran <dcasorran@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 ** Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 *
 ** Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation
 *  and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

(function (scope) {
	let {classes:Cc,interfaces:Ci,utils:Cu} = Components;
	
	Cu.import("resource://gre/modules/Services.jsm");
	
	let readDir = function (dir, out, ex) {
		while (dir.hasMoreElements()) {
			let entry = dir.getNext().QueryInterface(Ci.nsIFile);
			if(ex && ~ex.indexOf(entry.path.split(/[\\\/]/).pop()))
				continue;
			out.push(entry);
			if (entry.isDirectory())
				readDir(entry.directoryEntries, out);
		}
	};
	
	let A_CH = '/';
	
	let formatBytes = function(b) {
		let kb = 1024, mb = 1024*kb, gb = 1024*mb;
		
		if(b > gb) {
			return Math.round(b/gb) + 'GB';
		}
		if(b > mb) {
			return Math.round(b/mb) + 'MB';
		}
		if(b > kb) {
			return Math.round(b/kb) + 'KB';
		}
		return b + 'B';
	};
	
	let listCount = function (list, out) {
		for (let e in list) {
			if (e[0] === A_CH) {
				continue;
			}
			let attrs = out || {
				files : 0,
				dirs : 0,
				size : 0
			};
			if (list[e][A_CH+'entry'].isDirectory()) {
				attrs.dirs++;
				attrs = listCount(list[e], attrs);
			} else {
				attrs.files++;
				attrs.size += list[e][A_CH+'entry'].fileSize;
			}
			for (let a in attrs)
				list[e][A_CH + a] = attrs[a];
			
			list[e][A_CH + 'sizeFmt'] = formatBytes(attrs.size);
		}
		return out;
	};
	
	scope.readDir = function (ds,ex) {
		ds = ds || Services.dirsvc.get('ProfD', Ci.nsIFile);
		
		let out = [], list = {};
		readDir(ds.directoryEntries, out, ex);
		out.forEach(function (e) {
			let parent = null;
			e.path.replace(ds.path, '').split(/[\\\/]+/).forEach(function (p) {
				if (!p)
					return;
				let lst = parent || list;
				if (!(p in lst))
					lst[p] = {};
				parent = lst[p];
			});
			parent[A_CH+'entry'] = e;
		});
		listCount(list);
		
		return list;
	};
	scope.readDir.ctl = A_CH;
	
})(this);

if (typeof exports !== "undefined") {
	exports.readDir = this.readDir;
}

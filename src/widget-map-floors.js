/* eslint-disable no-useless-escape */
/* <nowiki> */
/**
 * widget-map-floors
 * https://github.com/GW2Wiki/widget-map-floors
 *
 * Created by Smiley on 11.06.2016.
 * https://github.com/codemasher
 * https://wiki.guildwars2.com/wiki/User:Smiley-1
 *
 * scripts & libraries used:
 *
 * https://leafletjs.com/
 * http://vanilla-js.com/
 */

'use strict';

const GW2MapOptions = {
//	errorTile         : 'https://wiki.guildwars2.com/images/a/af/Widget_Map_floors_blank_tile.png',
	initLayers        : [
		'region_label','map_label','task_icon','heropoint_icon','waypoint_icon','landmark_icon','vista_icon',
		'unlock_icon','masterypoint_icon','adventure_icon','jumpingpuzzle_icon', 'sector_label',
	],
};


/**
 * Class GW2Map
 */
class GW2Map{

	errorTile = 'data:image/png;base64,'
		+'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAADHUlEQVR4nO3UMQEAIAzAsIF/zyBjRxMF'
		+'vXpm5g2QdLcDgD0GAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEG'
		+'AGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEGAGEfdCIC/5Nk'
		+'Vo8AAAAASUVORK5CYII=';


	// common settings for all maps
	options = {
		containerClassName: 'gw2map',
		linkboxClassName  : 'gw2map-linkbox', // additional to containerClassName
		navClassName      : 'gw2map-nav',
		lang              : 'en',
		initLayers        : null,
		mapAttribution    : true,
		attributionText   : ' &copy; <a href="http://www.arena.net/" target="_blank">ArenaNet</a>',
		errorTile         : this.errorTile,
		padding           : 0.5,
		defaultZoom       : 4,
		minZoom           : 0,
		maxZoom           : 7,
		fullscreenControl : true,
		coordView         : true,
		apiBase           : 'https://api.guildwars2.com',
		tileBase          : 'https://tiles.guildwars2.com/',
		tileExt           : '.jpg',
		colors            : {
			map_poly   : 'rgba(255, 255, 255, 0.5)',
			region_poly: 'rgba(255, 155, 255, 0.5)',
			sector_poly: 'rgba(40, 140, 25, 0.5)',
			task_poly  : 'rgba(250, 250, 30, 0.5)',
			event_poly : 'rgba(210, 125, 40, 0.5)',
		},
	};

	// @todo: un-hardcode
	iconZoomLayers = [
		'waypoint_icon',
		'landmark_icon',
		'vista_icon',
		'heropoint_icon',
		'task_icon',
		'unlock_icon',
		'masterypoint_icon',
		'adventure_icon',
		'jumpingpuzzle_icon',
		'region_label',
		'map_label',
		'sector_label',
		'event_icon',
		'lavatubes',
		'guild_bounty',
	];

	linkboxExclude = [
		'region_label',
		'region_poly',
		'map_poly',
		'sector_poly',
		'task_poly',
		'event_poly',
	];

	// per-map options parsed from the container's dataset
	dataset = {};
	layers  = {};

	/**
	 * GW2Map constructor.
	 *
	 * @param {HTMLElement} container
	 * @param {string}      id
	 * @param {Object}      options
	 * @returns {GW2Map}
	 */
	constructor(container, id, options){
		this.container = container;
		this.id        = id;
		this.options   = GW2MapUtil.extend(this.options, options);
		this.dataset   = new GW2MapDataset(this.container.dataset, this.options).getData();
	}

	/**
	 * @returns {GW2Map}
	 * @public
	 */
	init(){

		if(this.dataset.linkbox){
			this.linkbox = document.createElement('div');
			this.linkbox.className = this.options.navClassName;
			this.linkbox.style = 'max-height:'+this.container.clientHeight+'px;';
			this.container.className += ' '+this.options.linkboxClassName;
			this.container.parentNode.insertBefore(this.linkbox, this.container.nextSibling);
		}

		this._setBaseMap();

		// build the request path @todo
		let url = this.options.apiBase + '/v2/continents/' + this.dataset.continentId + '/floors/' + this.dataset.floorId;
		url += this.dataset.regionId ? '/regions/' + this.dataset.regionId : '';
		url += this.dataset.regionId && this.dataset.mapId ? '/maps/' + this.dataset.mapId : '';
		url += '?wiki=1&lang=' + this.dataset.language;
		this._request(url, '_renderFloor');

		return this;
	}

	/**
	 * @param {string} url
	 * @param {string} callback
	 * @protected
	 */
	_request(url, callback){
		// xhr > fetch. DON'T @ ME
		let request = new XMLHttpRequest();

		request.open('GET', url, true);
		request.addEventListener('load', ev => {

			if(request.readyState === 4 && request.status === 200){
				let json = JSON.parse(request.responseText);
				if(typeof callback === 'string'){
					return this[callback](json);
				}

				return callback(json);
			}

			console.log('(╯°□°）╯彡┻━┻ ', request.status);
		});

		request.send();
	}

	/**
	 * sets the base tiles and adds an optional copyright info
	 *
	 * @returns {GW2Map}
	 * @protected
	 */
	_setBaseMap(){

		// the map object
		this.map = L.map(this.container, {
			crs               : L.CRS.Simple,
			minZoom           : this.options.minZoom,
			maxZoom           : this.options.maxZoom,
			attributionControl: this.options.mapAttribution,
			zoomControl       : this.dataset.mapControls,
			fullscreenControl : this.options.fullscreenControl,
			coordView         : this.options.coordView,
		});

		// the main tile layer
		L.tileLayer(null, {
			// use the custom tile getter
			tileGetter      : (coords, zoom) => this._tileGetter(coords, zoom),
			continuousWorld : true,
			minZoom         : this.options.minZoom,
			maxZoom         : this.options.maxZoom,
			attribution     : this.options.mapAttribution === true
				? GW2MAP_I18N.attribution + this.options.attributionText
				: false,
		}).addTo(this.map);

		// add the layer controls
		if(this.dataset.mapControls){
			this.controls = L.control.layers().addTo(this.map);
		}

		return this;
	}

	/**
	 * @todo https://github.com/arenanet/api-cdi/pull/61
	 * @todo https://github.com/arenanet/api-cdi/pull/62
	 * @todo https://github.com/arenanet/api-cdi/issues/308
	 *
	 * @param {*} json
	 * @protected
	 */
	_renderFloor(json){
		// transform the response to GeoJSON - polyfill for https://github.com/arenanet/api-cdi/pull/62
		this.floorGeoJSON = new GW2FloorGeoJSON(
			json,
			this.dataset.customRect,
			this.dataset.extraLayers,
			this.dataset.includeMaps
		);

		let geojson   = this.floorGeoJSON.getData();
		this.viewRect = geojson.viewRect; // set viewRect for the tile getter

		let rect   = new GW2ContinentRect(this.viewRect).getBounds();
		let bounds = new L.LatLngBounds(this._p2ll(rect[0]), this._p2ll(rect[1])).pad(this.options.padding);
		let center = bounds.getCenter();
		let coords = this.dataset.centerCoords || [];

		if(coords.length === 2){
			if(coords[0] > 0 && coords[0] <= 49152 && coords[1] > 0 && coords[1] <= 49152){
				center = this._p2ll(coords);
			}
		}

		this.map.setMaxBounds(bounds).setView(center, this.dataset.zoom);

		let panes = Object.keys(geojson.featureCollections);
		let initLayers = this.dataset.initLayers || this.options.initLayers || panes;
		panes.forEach(pane => this._createPane(geojson.featureCollections[pane].getJSON(), pane, initLayers));

		this.map.on('zoomend', ev => this._zoomEndEvent());
		this._zoomEndEvent(); // invoke once to set the icon zoom on the newly created map

		if(this.dataset.events){
			this._renderEvents();
		}
	}

	/**
	 * @protected
	 */
	_zoomEndEvent(){
		let zoom = this.map.getZoom();

		this.iconZoomLayers.forEach(layer => {

			if(!this.layers[layer]){
				return;
			}

			let element = this.layers[layer].options.pane;

			if(zoom >= 5){
				PrototypeElement.removeClassName(element, 'half');
			}
			else if(zoom < 5 && zoom >= 3){
				PrototypeElement.removeClassName(element, 'quarter');
				PrototypeElement.addClassName(element, 'half');
			}

			else if(zoom < 3 && zoom >= 1){
				PrototypeElement.removeClassName(element, 'half');
				PrototypeElement.removeClassName(element, 'invis');
				PrototypeElement.addClassName(element, 'quarter');
			}
			else if(zoom < 1){
				PrototypeElement.removeClassName(element, 'quarter');
				PrototypeElement.addClassName(element, 'invis');
			}

			// i hate this.
			if(GW2MapUtil.in_array(layer, ['region_label','map_label','sector_label'])){
				Object.keys(element.children).forEach(c => {
					let e = element.children[c];
					let origin = window.getComputedStyle(e).perspectiveOrigin.split(' ');

					e.style.left = '-'+origin[0];
					e.style.top = '-'+origin[1];
				});
			}

		});

	}

	/**
	 * @protected
	 */
	_renderEvents(){

		this._request(this.options.apiBase + '/v1/event_details.json?lang=' + this.dataset.language, event_details => {
			this._request(this.options.apiBase + '/v1/maps.json?lang=' + this.dataset.language, maps => {
				let eventGeoJSON = new GW2EventGeoJSON(event_details.events, maps.maps, this.floorGeoJSON.maps).getData();
				let panes = Object.keys(eventGeoJSON.featureCollections);
				let initLayers = this.dataset.initLayers || this.options.initLayers || panes;

				panes.forEach(pane => {this._createPane(eventGeoJSON.featureCollections[pane].getJSON(), pane, initLayers)});
			});
		});

	}

	/**
	 * @param {GW2FloorGeoJSON[]} geojson
	 * @param {string} pane
	 * @param {string[]}initLayers
	 * @protected
	 */
	_createPane(geojson, pane, initLayers){
		let name = '<span class="gw2map-layer-control '+pane+'">&nbsp;</span> ' + GW2MAP_I18N.layers[pane];

		if(!this.layers[pane]){
			this.layers[pane] = L.geoJson(geojson, {
				pane          : this.map.createPane(pane),
				coordsToLatLng: coords => this._p2ll(coords),
				pointToLayer  : (feature, coords) => this._pointToLayer(feature, coords, pane),
				onEachFeature : (feature, layer) => this._onEachFeature(feature, layer, pane),
				style         : (feature) => this._layerStyle(feature, pane),
			});

			this.controls.addOverlay(this.layers[pane], name)
					}
		else{
			this.layers[pane].addData(geojson);
		}

		if(GW2MapUtil.in_array(pane, initLayers)){
			this.layers[pane].addTo(this.map);
		}

	}

	/**
	 * @link  http://leafletjs.com/reference-1.5.0.html#geojson-oneachfeature
	 * @param {*}      feature
	 * @param {L.Layer}  layer
	 * @param {string} pane
	 * @protected
	 */
	_onEachFeature(feature, layer, pane){
		let p       = feature.properties;
		let content = '';

		// no popup for event circles
//		if(p.layertype === 'poly' && p.type === 'event'){
//			return;
//		}

		if(p.layertype === 'icon'){

			content +=
			p.icon
				? '<img class="gw2map-popup-icon gw2map-layer-control" src="'+ p.icon +'" alt="'+ p.name +'"/>'
				: '<span class="gw2map-layer-control '+pane+'" ></span>';

		}

		if(p.name){

			if(!GW2MapUtil.in_array(p.type, ['vista'])){
				//noinspection RegExpRedundantEscape
				let wikiname = p.name.toString()
					.replace(/\.$/, '')
					.replace(/\s/g, '_')
					.replace(/(Mount\:_|Raid—)/, '');

				content += '<a class="gw2map-wikilink" href="'
					+ GW2MAP_I18N.wiki+encodeURIComponent(wikiname)
					+ '" target="_blank">' + p.name + '</a>';
			}
			else{
				content += p.name;
			}

		}

		if(p.level){
			content += ' (' + p.level + ')';
		}
		else if(p.min_level && p.max_level){
			content += ' (' + (p.min_level === p.max_level ? p.max_level : p.min_level + '-' + p.max_level) + ')';
		}

		if(p.chat_link){
			if(content){
				content += '<br>';
			}
			content += '<input class="gw2map-chatlink" type="text" value="' + p.chat_link
				+ '" readonly="readonly" onclick="this.select();return false;" />';
		}

		if(p.description){
			if(content){
				content += '<br>';
			}
			content += '<div class="gw2map-description">' + this._parseWikilinks(p.description) + '</div>';
		}

		if(content){
			layer.bindPopup(content);
		}

		if(this.dataset.linkbox){
			this._linkboxItem(feature, layer, pane)
		}
	}

	/**
	 *
	 * @param {string} str
	 * @returns {string}
	 * @protected
	 */
	_parseWikilinks(str){
		// noinspection RegExpRedundantEscape
		return str
			.replace(/\[\[([^\]\|]+)\]\]/gi, '<a href="'+GW2MAP_I18N.wiki+'$1" target="_blank">$1</a>')
			.replace(/\[\[([^\|]+)(\|)([^\]]+)\]\]/gi, '<a href="'+GW2MAP_I18N.wiki+'$1" target="_blank">$3</a>');
	}

	/**
	 * @param {*}       feature
	 * @param {L.Layer} layer
	 * @param {string}  pane
	 * @protected
	 */
	_linkboxItem(feature, layer, pane){
		let p = feature.properties;

		if(GW2MapUtil.in_array(pane, this.linkboxExclude) || p.mapID === -1){
			return;
		}

		let navid = 'gw2map-navbox-map-'+p.mapID;
		let nav   = document.getElementById(navid);

		if(!nav){
			nav = document.createElement('div');
			nav.id = navid;
			nav.className = 'gw2map-navbox';
			this.linkbox.appendChild(nav);
		}

		let paneContentID =  'gw2map-navbox-'+p.mapID+'-'+pane;
		let paneContent   = document.getElementById(paneContentID);

		if(!paneContent && pane !== 'map_label'){
			paneContent = document.createElement('div');
			paneContent.id = paneContentID;
			nav.appendChild(paneContent);
		}

		let item = document.createElement('span');

		if(pane !== 'map_label'){
			item.innerHTML = '<span class="gw2map-layer-control '+ pane +'"></span>';
		}

		item.innerHTML += (p.name || p.id || '-');

		if(typeof layer.getLatLng === 'function'){

			item.addEventListener('click', ev => {
				let latlng = layer.getLatLng();
				this.map
					.panTo(latlng)
					.openPopup(layer.getPopup(), latlng);
			});

			// insert the map label as first item
			pane === 'map_label'
				? nav.insertBefore(item, nav.firstChild)
				: paneContent.appendChild(item);
		}

	}


	/**
	 * @link  http://leafletjs.com/reference-1.5.0.html#geojson-pointtolayer
	 * @param {*}      feature
	 * @param {LatLng} coords
	 * @param {string} pane
	 * @protected
	 */
	_pointToLayer(feature, coords, pane){
		let icon;
		let p          = feature.properties;

		if(p.layertype === 'poly' && p.type === 'event'){
			return new L.Circle(coords, feature.properties.radius);
		}


		let iconParams = {
			pane: pane,
			iconSize   : null,
			popupAnchor: 'auto',
			// temporarily adding the "completed" classname
			// https://discordapp.com/channels/384735285197537290/384735523521953792/623750587921465364
			className: 'gw2map-' + p.layertype + ' gw2map-' + p.type + '-' + p.layertype + ' completed'
		};

		if(p.icon){
			iconParams.iconUrl = p.icon;

			if(p.className){
				iconParams.className += ' '+p.className;
			}

			icon = L.icon(iconParams);
		}
		else if(p.layertype === 'label'){
			iconParams.html       = p.name;
			iconParams.iconAnchor = 'auto';

			icon = new L.LabelIcon(iconParams);

			return new L.LabelMarker(coords, {
				pane: pane,
				title: p.name,
				icon: icon
			});
		}
		else{

			if(p.type === 'masterypoint'){
				iconParams.className += ' ' + p.region.toLowerCase()
			}
			else if(p.type === 'heropoint'){
				iconParams.className += p.id.split('-')[0] === '0' ? ' core' : ' expac';
			}

			icon = L.divIcon(iconParams);
		}

		return L.marker(coords, {
			pane: pane,
			title: p.layertype === 'icon' ? p.name : null,
			icon: icon
		});
	}

	/**
	 * @link  http://leafletjs.com/reference-1.5.0.html#geojson-style
	 * @param {*}      feature
	 * @param {string} pane
	 * @protected
	 */
	_layerStyle(feature, pane){
		let p = feature.properties;

		if(GW2MapUtil.in_array(pane, ['region_poly', 'map_poly', 'sector_poly', 'task_poly', 'event_poly'])){
			return {
				pane: pane,
				stroke: true,
				opacity: 0.6,
				color: this.options.colors[pane] || 'rgb(255, 255, 255)',
				weight: 2,
				interactive: false,
			}
		}

		return {
			pane: pane,
			stroke: true,
			opacity: 0.6,
			color: p.color || 'rgb(255, 255, 255)',
			weight: 3,
			interactive: true,
		}
	}

	/**
	 * @param {[*,*]} coords
	 * @returns {LatLng}
	 * @protected
	 */
	_p2ll(coords){
		return this.map.unproject(coords, this.options.maxZoom);
	}

	/**
	 * @param {[*,*]}  coords
	 * @param {number} zoom
	 * @returns {[*,*]}
	 * @protected
	 */
	_project(coords, zoom){
		return coords.map(c => Math.floor((c / (1 << (this.options.maxZoom - zoom))) / 256));
	}

	/**
	 * @param {[*,*]}  coords
	 * @param {number} zoom
	 * @returns {string}
	 * @protected
	 */
	_tileGetter(coords, zoom){
		let clamp = this.viewRect.map(c => this._project(c, zoom));
		let ta    = this.dataset.tileAdjust;

		if(
			coords.x < clamp[0][0] - ta
			|| coords.x > clamp[1][0] + ta
			|| coords.y < clamp[0][1] - ta
			|| coords.y > clamp[1][1] + ta
		){
			return this.options.errorTile;
		}

		return this.options.tileBase
			+ this.dataset.continentId + '/'
			+ (this.dataset.customFloor || this.dataset.floorId) + '/'
			+ zoom + '/' + coords.x + '/' + coords.y + this.options.tileExt;
	}

}

class GW2MapLocal extends GW2Map{

	localTileZoomedRects = {};

	constructor(container, id, options){
		super(container, id, options);

		// pre-calculate zoomed/projected rects for local tiles
		for(let z = this.options.minZoom; z <= this.options.maxZoom; z++){
			this.localTileZoomedRects[z] = this.options.localTileRects.map(r => r.map(c => this._project(c, z)));
		}

	}

	// allow custom local tiles to be used direct from the wiki
	_tileGetter(coords, zoom){
		let clamp = this.viewRect.map(c => this._project(c, zoom));
		let ta    = this.dataset.tileAdjust;

		if(
			coords.x < clamp[0][0] - ta
			|| coords.x > clamp[1][0] + ta
			|| coords.y < clamp[0][1] - ta
			|| coords.y > clamp[1][1] + ta
		){
			return this.options.errorTile;
		}


		for(let i = 0; i < this.localTileZoomedRects[zoom].length; i++){
			clamp    = this.localTileZoomedRects[zoom][i];
			let file = 'World_map_tile_C' + this.dataset.continentId;

			if(!(
				coords.x < clamp[0][0]
				|| coords.x > clamp[1][0]
				|| coords.y < clamp[0][1]
				|| coords.y > clamp[1][1]
			)){
				file += ('_Z' + zoom + '_X' + coords.x + '_Y' + coords.y + '.jpg');
				let md5file = this.md5(file);

				return 'https://wiki.guildwars2.com/images/' + md5file.slice(0,1) + '/'+ md5file.slice(0,2) + '/' + file;
			}
		}

		return this.options.tileBase
			+ this.dataset.continentId + '/'
			+ (this.dataset.customFloor || this.dataset.floorId) + '/'
			+ zoom + '/' + coords.x + '/' + coords.y + this.options.tileExt;
		}

	/**
	 * @link https://locutus.io/php/md5/
	 *
	 * @param str
	 * @returns {string}
	 */
	md5(str){
		let hash, xl;

		let _rotateLeft = function(lValue, iShiftBits){
			return (lValue << iShiftBits)|(lValue >>> (32 - iShiftBits));
		};

		let _addUnsigned = function(lX, lY){
			let lX4, lY4, lX8, lY8, lResult;
			lX8 = (lX&0x80000000);
			lY8 = (lY&0x80000000);
			lX4 = (lX&0x40000000);
			lY4 = (lY&0x40000000);
			lResult = (lX&0x3FFFFFFF) + (lY&0x3FFFFFFF);
			if(lX4&lY4){
				return (lResult^0x80000000^lX8^lY8);
			}
			if(lX4|lY4){
				if(lResult&0x40000000){
					return (lResult^0xC0000000^lX8^lY8);
				}
				else{
					return (lResult^0x40000000^lX8^lY8);
				}
			}
			else{
				return (lResult^lX8^lY8);
			}
		};

		let _F = function(x, y, z){
			return (x&y)|((~x)&z);
		};
		let _G = function(x, y, z){
			return (x&z)|(y&(~z));
		};
		let _H = function(x, y, z){
			return (x^y^z);
		};
		let _I = function(x, y, z){
			return (y^(x|(~z)));
		};

		let _FF = function(a, b, c, d, x, s, ac){
			a = _addUnsigned(a, _addUnsigned(_addUnsigned(_F(b, c, d), x), ac));
			return _addUnsigned(_rotateLeft(a, s), b);
		};

		let _GG = function(a, b, c, d, x, s, ac){
			a = _addUnsigned(a, _addUnsigned(_addUnsigned(_G(b, c, d), x), ac));
			return _addUnsigned(_rotateLeft(a, s), b);
		};

		let _HH = function(a, b, c, d, x, s, ac){
			a = _addUnsigned(a, _addUnsigned(_addUnsigned(_H(b, c, d), x), ac));
			return _addUnsigned(_rotateLeft(a, s), b);
		};

		let _II = function(a, b, c, d, x, s, ac){
			a = _addUnsigned(a, _addUnsigned(_addUnsigned(_I(b, c, d), x), ac));
			return _addUnsigned(_rotateLeft(a, s), b);
		};

		let _convertToWordArray = function(str){
			let lWordCount;
			let lMessageLength = str.length;
			let lNumberOfWordsTemp1 = lMessageLength + 8;
			let lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
			let lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
			let lWordArray = new Array(lNumberOfWords - 1);
			let lBytePosition = 0;
			let lByteCount = 0;
			while(lByteCount < lMessageLength){
				lWordCount = (lByteCount - (lByteCount % 4)) / 4;
				lBytePosition = (lByteCount % 4) * 8;
				lWordArray[lWordCount] = (lWordArray[lWordCount]|(str.charCodeAt(lByteCount) << lBytePosition));
				lByteCount++;
			}
			lWordCount = (lByteCount - (lByteCount % 4)) / 4;
			lBytePosition = (lByteCount % 4) * 8;
			lWordArray[lWordCount] = lWordArray[lWordCount]|(0x80 << lBytePosition);
			lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
			lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
			return lWordArray;
		};

		let _wordToHex = function(lValue){
			let wordToHexValue = '';
			let wordToHexValueTemp = '';
			let lByte;
			let lCount;

			for(lCount = 0; lCount <= 3; lCount++){
				lByte = (lValue >>> (lCount * 8))&255;
				wordToHexValueTemp = '0' + lByte.toString(16);
				wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
			}
			return wordToHexValue;
		};

		let k, AA, BB, CC, DD, a, b, c, d;
		let S11 = 7;
		let S12 = 12;
		let S13 = 17;
		let S14 = 22;
		let S21 = 5;
		let S22 = 9;
		let S23 = 14;
		let S24 = 20;
		let S31 = 4;
		let S32 = 11;
		let S33 = 16;
		let S34 = 23;
		let S41 = 6;
		let S42 = 10;
		let S43 = 15;
		let S44 = 21;

		let x = _convertToWordArray(this.utf8_encode(str));
		a = 0x67452301;
		b = 0xEFCDAB89;
		c = 0x98BADCFE;
		d = 0x10325476;

		xl = x.length;
		for(k = 0; k < xl; k += 16){
			AA = a;
			BB = b;
			CC = c;
			DD = d;
			a = _FF(a, b, c, d, x[k], S11, 0xD76AA478);
			d = _FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
			c = _FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
			b = _FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
			a = _FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
			d = _FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
			c = _FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
			b = _FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
			a = _FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
			d = _FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
			c = _FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
			b = _FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
			a = _FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
			d = _FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
			c = _FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
			b = _FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
			a = _GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
			d = _GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
			c = _GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
			b = _GG(b, c, d, a, x[k], S24, 0xE9B6C7AA);
			a = _GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
			d = _GG(d, a, b, c, x[k + 10], S22, 0x2441453);
			c = _GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
			b = _GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
			a = _GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
			d = _GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
			c = _GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
			b = _GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
			a = _GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
			d = _GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
			c = _GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
			b = _GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
			a = _HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
			d = _HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
			c = _HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
			b = _HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
			a = _HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
			d = _HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
			c = _HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
			b = _HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
			a = _HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
			d = _HH(d, a, b, c, x[k], S32, 0xEAA127FA);
			c = _HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
			b = _HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
			a = _HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
			d = _HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
			c = _HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
			b = _HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
			a = _II(a, b, c, d, x[k], S41, 0xF4292244);
			d = _II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
			c = _II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
			b = _II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
			a = _II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
			d = _II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
			c = _II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
			b = _II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
			a = _II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
			d = _II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
			c = _II(c, d, a, b, x[k + 6], S43, 0xA3014314);
			b = _II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
			a = _II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
			d = _II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
			c = _II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
			b = _II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
			a = _addUnsigned(a, AA);
			b = _addUnsigned(b, BB);
			c = _addUnsigned(c, CC);
			d = _addUnsigned(d, DD);
		}

		let temp = _wordToHex(a) + _wordToHex(b) + _wordToHex(c) + _wordToHex(d);

		return temp.toLowerCase();
	}

	/**
	 * @link https://locutus.io/php/utf8_encode/
	 *
	 * @param argString
	 * @returns {string}
	 */
	utf8_encode(argString){

		if(argString === null || typeof argString === 'undefined'){
			return '';
		}

		// .replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		let string = (argString + '');
		let utftext = '';
		let start;
		let end;

		start = end = 0;
		let stringl = string.length;
		for(let n = 0; n < stringl; n++){
			let c1 = string.charCodeAt(n);
			let enc = null;

			if(c1 < 128){
				end++;
			}
			else if(c1 > 127 && c1 < 2048){
				enc = String.fromCharCode(
					(c1 >> 6)|192, (c1&63)|128,
				);
			}
			else if((c1&0xF800) !== 0xD800){
				enc = String.fromCharCode(
					(c1 >> 12)|224, ((c1 >> 6)&63)|128, (c1&63)|128,
				);
			}
			else{
				// surrogate pairs
				if((c1&0xFC00) !== 0xD800){
					throw new RangeError('Unmatched trail surrogate at ' + n);
				}
				let c2 = string.charCodeAt(++n);
				if((c2&0xFC00) !== 0xDC00){
					throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
				}
				c1 = ((c1&0x3FF) << 10) + (c2&0x3FF) + 0x10000;
				enc = String.fromCharCode(
					(c1 >> 18)|240, ((c1 >> 12)&63)|128, ((c1 >> 6)&63)|128, (c1&63)|128,
				);
			}
			if(enc !== null){
				if(end > start){
					utftext += string.slice(start, end);
				}
				utftext += enc;
				start = end = n + 1;
			}
		}

		if(end > start){
			utftext += string.slice(start, stringl);
		}

		return utftext;
	}

}

/**
 * Class GW2MapDataset
 *
 * reads the dataset from the container element, validates and stores the values in this.dataset
 *
 * i hate all of this.
 */
class GW2MapDataset{

	//noinspection RegExpRedundantEscape
	metadata = {
		continentId : {type: 'int',   default: 1},
		floorId     : {type: 'int',   default: 1},
		regionId    : {type: 'int',   default: null},
		mapId       : {type: 'int',   default: null},
		customFloor : {type: 'int',   default: null},
		language    : {type: 'int',   default: null},
		zoom        : {type: 'int',   default: -1},
		tileAdjust  : {type: 'int',   default: 0},
		mapControls : {type: 'bool',  default: true},
		linkbox     : {type: 'bool',  default: false},
		events      : {type: 'bool',  default: false},
		initLayers  : {type: 'array', default: null, regex: /^([a-z_,\s]+)$/i},
		extraLayers : {type: 'array', default: [],   regex: /^([a-z_,\s]+)$/i},
		centerCoords: {type: 'array', default: null, regex: /^([\[\]\s\d\.,]+)$/},
		customRect  : {type: 'array', default: null, regex: /^([\[\]\s\d\.,]+)$/},
		includeMaps : {type: 'array', default: [],   regex: /^([\s\d,]+)$/},
	};

	dataset = {};

	/**
	 * @param {Object} dataset
	 * @param {Object} options
	 */
	constructor(dataset, options){
		this.options = options;

		this._parse(dataset);
	}

	/**
	 * @returns {Object}
	 */
	getData(){
		return this.dataset;
	}

	/**
	 * @param {Object} dataset
	 * @private
	 */
	_parse(dataset){

		Object.keys(this.metadata).forEach(k => {

			if(typeof dataset[k] === 'undefined' || dataset[k] === ''){
				this.dataset[k] = this.metadata[k].default;
			}
			else{
				['int', 'bool', 'array', 'string'].forEach(t => {
					if(this.metadata[k].type === t){
						this.dataset[k] = this['_parse_'+t](dataset[k], this.metadata[k]);
					}
				});
			}

			if(typeof this['_parse_'+k] === 'function'){
				this.dataset[k] = this['_parse_'+k](this.dataset[k], this.metadata[k]);
			}
		});

	}

	/**
	 * @param {Object} data
	 * @returns {number}
	 * @private
	 */
	_parse_int(data){
		return GW2MapUtil.intval(data);
	}

	/**
	 * @param {Object} data
	 * @returns {boolean}
	 * @private
	 */
	_parse_bool(data){
		return GW2MapUtil.in_array(data.toLowerCase(), ['1', 'true', 't', 'yes', 'y']);
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {*}
	 * @private
	 */
	_parse_array(data, meta){
		let match = data.match(meta.regex);

		if(match){
			return match
		}

		return meta.default;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {*}
	 * @private
	 */
	_parse_string(data, meta){
		return this._parse_array(data, meta);
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {number}
	 * @private
	 */
	_parse_continentId(data, meta){
		return GW2MapUtil.in_array(data, [1, 2]) ? data : meta.default;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {number}
	 * @private
	 */
	_parse_regionId(data, meta){
		return data > 0 ? data : meta.default;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {number}
	 * @private
	 */
	_parse_mapId(data, meta){
		return data > 0 ? data : meta.default;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {string}
	 * @private
	 */
	_parse_language(data, meta){
		return ['de', 'en', 'es', 'fr', 'zh'][data] || this.options.lang;
	}

	/**
	 * @param {Object} data
	 * @returns {number}
	 * @private
	 */
	_parse_zoom(data){
		return data < this.options.minZoom || data > this.options.maxZoom ? this.options.defaultZoom : data
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {[]}
	 * @private
	 */
	_parse_includeMaps(data, meta){

		if(data === meta.default){
			return data;
		}

		let ret = [];

		data[0].replace(/[^\d,]/g, '').split(',').forEach(v => {
			if(v){
				ret.push(GW2MapUtil.intval(v));
			}
		});

		return ret
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {number[][]}
	 * @private
	 */
	_parse_customRect(data, meta){

		if(data === meta.default){
			return data;
		}

		data = JSON.parse(data[0]);

		if(data.length < 2 || data[0].length < 2 || data[1].length < 2){
			return meta.default;
		}

		return data;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {number[]}
	 * @private
	 */
	_parse_centerCoords(data, meta){

		if(data === meta.default){
			return data;
		}

		data = JSON.parse(data[0]);

		if(data.length < 2 || typeof data[0] !== 'number' || typeof data[1] !== 'number'){
			return meta.default;
		}

		return data;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {string[]}
	 * @private
	 */
	_parse_extraLayers(data, meta){

		if(data === meta.default){
			return data;
		}

		let ret = [];

		data[0].replace(/\s/g, '').split(',').forEach(v => {
			if(v){
				ret.push(v.toLowerCase());
			}
		});

		return ret;
	}

	/**
	 * @param {Object} data
	 * @param {Object} meta
	 * @returns {string[]}
	 * @private
	 */
	_parse_initLayers(data, meta){
		return this._parse_extraLayers(data, meta);
	}

	/**
	 * @param {Object} data
	 * @returns {number}
	 * @private
	 */
	_parse_tileAdjust(data){
		return data < 0 ? 0 : data;
	}

}

/**
 * Class GW2MapUtil
 */
class GW2MapUtil{

	/**
	 * @param {Object} target
	 * @param {Object} source
	 * @returns {Object}
	 */
	static extend(target, source) {

		for(let property in source) {
			// eslint-disable-next-line no-prototype-builtins
			if(source.hasOwnProperty(property)) {
				target[property] = source[property];
			}
		}

		return target;
	}

	/**
	 * @link  http://locutus.io/php/var/intval/
	 *
	 * @param {*}      mixed_var
	 * @param {number} base
	 * @returns {*}
	 */
	static intval(mixed_var, base){
		let tmp;
		let type = typeof(mixed_var);

		if(type === 'boolean'){
			return +mixed_var;
		}
		else if(type === 'string'){
			tmp = parseInt(mixed_var, base || 10);
			return (isNaN(tmp) || !isFinite(tmp)) ? 0 : tmp;
		}
		else if(type === 'number' && isFinite(mixed_var)){
			return mixed_var|0;
		}
		else{
			return 0;
		}
	}

	/**
	 * @param {*} needle
	 * @param {*} haystack
	 * @returns {boolean}
	 */
	static in_array(needle, haystack){
		for(let key in haystack){
			// eslint-disable-next-line no-prototype-builtins
			if(haystack.hasOwnProperty(key)){
				if(haystack[key] === needle){
					return true;
				}
			}
		}

		return false;
	}

}

/**
 * Class GW2GeoJSONAbstract
 */
class GW2GeoJSONAbstract{

	featureCollections = {};
	includeMaps = [];

	constructor(includeMaps){
		this.includeMaps = includeMaps;
	}

	/**
	 * @param {string} layer
	 * @param {string|number} id
	 * @param {number} mapID
	 * @param {string} name
	 * @param {*} properties
	 * @param {*} geometry
	 * @param {string} [geometryType]
	 * @returns {GW2FloorGeoJSON}
	 * @protected
	 */
	_addFeature(layer, id, mapID, name, properties, geometry, geometryType){

		if(!this.featureCollections[layer]){
			this.featureCollections[layer] = new GeoJSONFeatureCollection();
		}

		this.featureCollections[layer]
			.addFeature(GW2MapUtil.extend({
				name     : name,
				mapID    : mapID,
				layertype: 'icon',
			}, properties))
			.setID(id)
			.setGeometry(geometry, geometryType)
		;

		return this;
	}

}

/**
 * Class GW2FloorGeoJSON
 *
 * polyfill for https://github.com/arenanet/api-cdi/pull/62
 */
class GW2FloorGeoJSON extends GW2GeoJSONAbstract{

	floordata = {};
	maps = [];

	/**
	 * GW2FloorGeoJSON constructor
	 *
	 * @param {*} floordata
	 * @param {[[],[]]} customRect
	 * @param {string[]} extraMarkers
	 * @param {number[]} includeMaps
	 */
	constructor(floordata, customRect, extraMarkers, includeMaps){
		super(includeMaps);

		this.floordata    = floordata;
		this.extraMarkers = ['adventure_icon', 'jumpingpuzzle_icon', 'polylines'].concat(extraMarkers);

		this.setView(customRect);
	}

	/**
	 * @returns {GW2FloorGeoJSON}
	 */
	setView(customRect){

		if(customRect){
			this.viewRect = customRect; // @todo
		}
		else if(this.floordata.continent_rect){
			this.viewRect = this.floordata.continent_rect;
		}
		else if(this.floordata.clamped_view){
			this.viewRect = this.floordata.clamped_view;
		}
		else if(this.floordata.texture_dims){
			this.viewRect = [[0, 0], this.floordata.texture_dims];
		}
		else{
			this.viewRect = [[0, 0], [49152, 49152]];
		}

		return this;
	}

	/**
	 * @returns {*}
	 */
	getData(){

		// a response to floors
		if(this.floordata.regions){
			this.continent(this.floordata.regions);
		}
		// a regions response
		else if(this.floordata.maps){
			this.region(this.floordata);
		}
		// an actual map response
		else if(this.floordata.points_of_interest){
			this.map(this.floordata);
		}

		return {
			viewRect: this.viewRect,
			featureCollections: this.featureCollections,
		};

	}

	/**
	 * @param {*} continent
	 * @returns {GW2FloorGeoJSON}
	 */
	continent(continent){
		Object.keys(continent).forEach(regionID => this.region(continent[regionID]));

		return this;
	}

	/**
	 * @param {*} region
	 * @returns {GW2FloorGeoJSON}
	 */
	region(region){

		this._addFeature('region_label', region.id, -1, region.name, {
			type     : 'region',
			layertype: 'label',
		}, region.label_coord);
/*
		this._addFeature('region_poly', region.id, -1, region.name, {
			type     : 'region',
			layertype: 'poly',
		}, new GW2ContinentRect(region.continent_rect).getPoly(), 'Polygon');
*/
		Object.keys(region.maps).forEach(mapID => {
			let map = region.maps[mapID];
			map.id  = GW2MapUtil.intval(mapID);

//			console.log('map', map.id, map.name);
			// @todo
			if(this.includeMaps.length > 0){
				if(!GW2MapUtil.in_array(map.id, this.includeMaps)){
					return this;
				}
			}

			this.map(map);
		});

		return this;
	}

	/**
	 * @param {*} map
	 * @returns {GW2FloorGeoJSON}
	 */
	map(map){
		this.maps.push(map.id);

		let rect = new GW2ContinentRect(map.continent_rect);

		// https://github.com/arenanet/api-cdi/issues/334
		this._addFeature('map_label', map.id, map.id, map.name, {
			min_level     : map.min_level,
			max_level     : map.max_level,
			type          : 'map',
			layertype     : 'label',
		}, map.label_coord || rect.getCenter());
/*
		this._addFeature('map_poly', map.id, map.id, map.name, {
			type     : 'map',
			layertype: 'poly',
		}, rect.getPoly(), 'Polygon');
*/
		this
			.sectors(map.sectors, map.id)
			.poi(map.points_of_interest, map.id)
			.task(map.tasks, map.id)
			.heropoint(map.skill_challenges, map.id)
			.masteryPoint(map.mastery_points, map.id)
			.adventure(map.adventures || [], map.id)
		;

		if(this.extraMarkers.length){

			this.extraMarkers.forEach(layer => {

				if(!GW2W_EXTRA_DATA[layer] || !GW2W_EXTRA_DATA[layer].data[map.id]){
					return;
				}

				this.extra(GW2W_EXTRA_DATA[layer], layer, map.id);
			});
		}

		return this;
	}

	/**
	 * @param {*} extra
	 * @param {string} layer
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	extra(extra, layer, mapID){

		extra.data[mapID].forEach(e => {

			let extraOptions = {
				icon       : e.icon || extra.icon || null,
				className  : extra.className,
				type       : extra.type,
				color      : e.color || extra.color,
				layertype  : e.layertype || extra.layertype || 'icon',
				description: e.description || extra.description || null
			};

			if(e.antPath || extra.antPath){
				extraOptions.antPath = e.antPath || extra.antPath;
				extraOptions.antColor = e.antColor || extra.antColor;
				extraOptions.antOpacity = e.antOpacity || extra.antOpacity;
				extraOptions.antDashArray = e.antDashArray || extra.antDashArray;
			}

			this._addFeature(
				layer,
				e.id,
				mapID,
				(e.name || extra.name),
				extraOptions,
				e.coord,
				(e.featureType ||extra.featureType || 'Point')
			);
		});

	}

	/**
	 * @param {*} sectors
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	sectors(sectors, mapID){

		Object.keys(sectors).forEach(sectorId =>{
			let sector = sectors[sectorId];

			if(GW2W_SECTOR_NAMES[sectorId]){
				sector = GW2MapUtil.extend(sector, GW2W_SECTOR_NAMES[sectorId]);
			}

			this._addFeature('sector_label', sector.id, mapID, sector.name, {
				chat_link: sector.chat_link,
				level    : sector.level,
				type     : 'sector',
				layertype: 'label',
			}, sector.coord);

			this._addFeature('sector_poly', sector.id, mapID, sector.name, {
				type     : 'sector',
				layertype: 'poly',
			}, [sector.bounds], 'Polygon');
		});

		return this;
	}

	/**
	 * @param {*} pois
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	poi(pois, mapID){

		Object.keys(pois).forEach(poiID =>{
			let poi = pois[poiID];

			if(GW2W_POIDATA[poi.type] && GW2W_POIDATA[poi.type][poiID]){
				poi = GW2MapUtil.extend(poi, GW2W_POIDATA[poi.type][poiID]);
			}

			this._addFeature(poi.type + '_icon', poi.id || null, mapID, null, {
				name     : poi.name || poi.id ||  '',
				type     : poi.type,
				chat_link: poi.chat_link || false,
//				floor    : poi.floor, // ???
				icon     : poi.icon
			}, poi.coord);
		});

		return this;
	}

	/**
	 * @param {*} tasks
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	task(tasks, mapID){

		Object.keys(tasks).forEach(taskID =>{
			let task = tasks[taskID];

			this._addFeature('task_icon', task.id, mapID, task.objective, {
				chat_link: task.chat_link,
				level    : task.level,
				type     : 'task',
			}, task.coord);

			this._addFeature('task_poly', task.id, mapID, task.objective, {
				type     : 'task',
				layertype: 'poly',
			}, [task.bounds], 'Polygon');

		});

		return this;
	}

	/**
	 * @param {*} heropoints
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	heropoint(heropoints, mapID){

		if(!heropoints.length){
			return this;
		}

		heropoints.forEach(heropoint =>{
			// https://github.com/arenanet/api-cdi/issues/329
			this._addFeature('heropoint_icon', heropoint.id, mapID, null, {
				name     : GW2W_HEROPOINT_NAMES[heropoint.id] || '',
				type     : 'heropoint',
			}, heropoint.coord)
		});

		return this;
	}

	/**
	 * @param {*} masterypoints
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	masteryPoint(masterypoints, mapID){

		if(!masterypoints.length){
			return this;
		}

		masterypoints.forEach(masterypoint =>{
			this._addFeature('masterypoint_icon', masterypoint.id, mapID, null, {
				name     : GW2W_MASTERYPOINT_NAMES[masterypoint.id] || '',
				region   : masterypoint.region,
				type     : 'masterypoint',
			}, masterypoint.coord)
		});

		return this;
	}

	/**
	 * @param {*} adventures
	 * @param {number} mapID
	 * @returns {GW2FloorGeoJSON}
	 */
	adventure(adventures, mapID){

		if(!adventures.length){
			return this;
		}

		adventures.forEach(adventure =>{
			this._addFeature('adventure_icon', null, mapID, adventure.name, {
				description: adventure.description || '',
				type       : 'adventure',
			}, adventure.coord);
		});

		return this;
	}

}

/**
 * Class GW2EventGeoJSON
 */
class GW2EventGeoJSON extends GW2GeoJSONAbstract{

	event_details = {};
	map_details = {};
	map = {};

	constructor(event_details, map_details, includeMaps){
		super(includeMaps);

		this.event_details = event_details;
		this.map_details = map_details;
	}

	getData(){

		Object.keys(this.event_details).forEach(id => {
			let event = this.event_details[id];

			if(!GW2MapUtil.in_array(event.map_id, this.includeMaps)){
				delete this.event_details[id];
				delete this.map_details[event.map_id];

				return;
			}

			let map = this.map_details[event.map_id];

			if(!this.map[event.map_id]){
				this.map[event.map_id]      = map;
				this.map[event.map_id].rect = new GW2ContinentRect(map.continent_rect, map.map_rect);
			}

			map = this.map[event.map_id];

			this._addFeature('event_icon', id, event.map_id, event.name, {
				icon     : event.icon ? 'https://render.guildwars2.com/file/'+event.icon.signature+'/'+event.icon.file_id+'.png' : null,
				flags    : event.flags,
				type     : 'event',
				layertype: 'icon',
			}, map.rect.scaleCoords(event.location.center));

			if(event.location.type === 'poly'){
				this._addFeature('event_poly', id, event.map_id, event.name, {
					type     : 'event',
					layertype: 'poly',
				}, [event.location.points.map(point => map.rect.scaleCoords(point))], 'Polygon');
			}
			else{

				this._addFeature('event_poly', id, event.map_id, event.name, {
					type     : 'event',
					layertype: 'poly',
					radius   : map.rect.scaleLength(event.location.radius),
				}, map.rect.scaleCoords(event.location.center), 'Point');

			}

		});

		return {
			featureCollections: this.featureCollections,
		};
	}

}

/**
 * Class GW2ContinentRect
 */
class GW2ContinentRect{

	/**
	 * GW2ContinentRect constructor
	 *
	 * @param continent_rect
	 * @param map_rect
	 */
	constructor(continent_rect, map_rect){
		this.rect     = continent_rect;
		this.map_rect = map_rect;
	}

	/**
	 * returns bounds for L.LatLngBounds()
	 *
	 * @returns {*[]}
	 */
	getBounds(){
		return [
			[this.rect[0][0], this.rect[1][1]],
			[this.rect[1][0], this.rect[0][1]]
		]
	}

	/**
	 * returns the center of the rectangle
	 *
	 * @returns {*[]}
	 */
	getCenter(){
		return [
			(this.rect[0][0] + this.rect[1][0]) / 2,
			(this.rect[0][1] + this.rect[1][1]) / 2
		]
	}

	/**
	 * returns a polygon made of the rectangles corners
	 *
	 * @returns {*[]}
	 */
	getPoly(){
		return [[
			[this.rect[0][0], this.rect[0][1]],
			[this.rect[1][0], this.rect[0][1]],
			[this.rect[1][0], this.rect[1][1]],
			[this.rect[0][0], this.rect[1][1]]
		]]
	}

	/**
	 * @param {[]} coords    from event_details.json or Mumble Link data.
	 * @param {[]} [mr]  map_rect taken from maps.json or map_floor.json
	 * @returns {*[]}
	 */
	scaleCoords(coords, mr){
		mr = this.map_rect || mr;

		return [
			Math.round(this.rect[0][0]+(this.rect[1][0]-this.rect[0][0])*(coords[0]-mr[0][0])/(mr[1][0]-mr[0][0])),
			Math.round(this.rect[0][1]+(this.rect[1][1]-this.rect[0][1])*(1-(coords[1]-mr[0][1])/(mr[1][1]-mr[0][1])))
		]
	}

	/**
	 * @param {number} length    from event_details.json or Mumble Link data
	 * @param {[]}     [map_rect]  taken from maps.json or map_floor.json
	 * @returns {number}
	 */
	scaleLength(length, map_rect){
		// still unsure about the correct values here
		length = length / (1/24);
		map_rect = this.map_rect || map_rect;

		let scalex = (length - map_rect[0][0]) / (map_rect[1][0] - map_rect[0][0]);
		let scaley = (length - map_rect[0][1]) / (map_rect[1][1] - map_rect[0][1]);

		return Math.sqrt((scalex * scalex) + (scaley * scaley));
	}

}

/**
 * Class GeoJSONFeatureCollection
 */
class GeoJSONFeatureCollection{

	/**
	 * GeoJSONFeatureCollection constructor
	 */
	constructor(){
		this.json = {
			type:     'FeatureCollection',
			features: [],
		};
	}

	/**
	 * @returns {{type: string, features: Array}|*}
	 */
	getJSON(){
		this.json.features.forEach((feature, i) => this.json.features[i] = feature.getJSON());

		return this.json;
	}

	/**
	 * @param type
	 * @param properties
	 * @returns {GeoJSONFeatureCollection}
	 */
	setCRS(type, properties){
		this.json.crs = {
			type:       type,
			properties: properties,
		};

		return this;
	}

	/**
	 * @param properties
	 * @returns {GeoJSONFeature}
	 */
	addFeature(properties){
		let feature = new GeoJSONFeature(properties);
		this.json.features.push(feature);

		return feature;
	}
}

/**
 * Class GeoJSONFeature
 */
class GeoJSONFeature{

	/**
	 * GeoJSONFeature constructor
	 *
	 * @param properties
	 */
	constructor(properties){
		this.json = {
			type:       'Feature',
			geometry:   {
				type       : '',
				coordinates: [],
			},
			properties: properties || {},
		};
	}

	/**
	 * @returns {{type: string, geometry: {type: string, coordinates: Array}, properties: (*|{})}|*}
	 */
	getJSON(){
		return this.json;
	}

	/**
	 * @param id
	 * @returns {GeoJSONFeature}
	 */
	setID(id){

		if(id){
			this.json.id = id; // gmaps
			this.json.properties.id = id; // leaflet
		}

		return this;
	}

	/**
	 * @param coords
	 * @param type
	 * @returns {GeoJSONFeature}
	 */
	setGeometry(coords, type){
		this.json.geometry.coordinates = coords;
		this.json.geometry.type = GW2MapUtil.in_array(type, [
			'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'
		]) ? type : 'Point';

		return this;
	}

}



/**
 * prototype DOM rewrite inc
 * @link https://github.com/prototypejs/prototype/blob/master/src/prototype/dom/dom.js
 */
class PrototypeElement{

	static addClassName(element, className){

		if(!this.hasClassName(element, className)){
			element.className += (element.className ? ' ' : '') + className;
		}

		return element;
	}

	static removeClassName(element, className){
		element.className = element.className
			.replace(this.getRegExpForClassName(className), ' ')
			.replace(/^\s+/, '')
			.replace(/\s+$/, '');

		return element;
	}

	static toggleClassName(element, className, bool) {

		if(typeof bool === 'undefined'){
			bool = !this.hasClassName(element, className);
		}

		return this[bool ? 'addClassName' : 'removeClassName'](element, className);
	}

	static hasClassName(element, className){
		let elementClassName = element.className;

		if(elementClassName.length === 0){
			return false;
		}

		if(elementClassName === className){
			return true;
		}

		return this.getRegExpForClassName(className).test(elementClassName);
	}

	static getRegExpForClassName(className){
		return new RegExp('(^|\\s+)' + className + '(\\s+|$)');
	}

}

// invoke the maps
(($options, $containers) => {
	$containers = $containers || document.getElementsByClassName($options.containerClassName);

	// no map, no scripts.
	if(!$containers.length){
		return;
	}

	$options = GW2MapUtil.extend({
		containerClassName: 'gw2map',
		linkboxClassName  : 'gw2map-linkbox',
		navClassName      : 'gw2map-nav',
		scriptContainerId : 'gw2map-script',
		localTiles        : false,
		localTileRects    : [],
		scripts:[
			'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet-src.js',
			'https://wiki.guildwars2.com/index.php?title=Widget:Map_floors/data&action=raw&ctype=text/javascript',
		],
		stylesheets: [
			'https://wiki.guildwars2.com/index.php?title=Widget:Map_floors/style&action=raw&ctype=text/css',
		],
	}, $options);

	// scripts to <body>
	$options.scripts.forEach(script => {
		let s    = document.getElementById($options.scriptContainerId);
		let node = document.createElement('script');
		node.src = script;

		s.parentNode.insertBefore(node, s);
	});

	// stylesheets to the <head>
	$options.stylesheets.forEach(stylesheet => {
		let node = document.createElement('link');
		node.rel  = 'stylesheet';
		node.href = stylesheet;
		document.getElementsByTagName('head')[0].appendChild(node);
	});

	// ogogog
	window.addEventListener('load', () => {

		// check if leaflet is loaded (paranoid)
		if(typeof L === 'undefined' || !L.version){
			console.log('GW2Map error: leaflet not loaded!');

			return;
		}

		// https://github.com/Leaflet/Leaflet.fullscreen
		L.Control.Fullscreen = L.Control.extend({

			options: {
				position: 'topleft',
				title   : {
					'false': 'View Fullscreen',
					'true' : 'Exit Fullscreen',
				},
			},

			onAdd: function(map){
				let container = L.DomUtil.create('div', 'leaflet-control-fullscreen leaflet-bar leaflet-control');

				this.link = L.DomUtil.create('a', 'leaflet-control-fullscreen-button leaflet-bar-part', container);
				this.link.href = '#';

				this._map = map;
				this._map.on('fullscreenchange', this._toggleTitle, this);
				this._toggleTitle();

				L.DomEvent.on(this.link, 'click', this._click, this);

				return container;
			},

			_click: function(e){
				L.DomEvent.stopPropagation(e);
				L.DomEvent.preventDefault(e);
				this._map.toggleFullscreen(this.options);
			},

			_toggleTitle: function(){
				this.link.title = this.options.title[this._map.isFullscreen()];
			},

		});

		L.Map.include({

			isFullscreen: function(){
				return this._isFullscreen || false;
			},

			toggleFullscreen: function(options){
				let container = this.getContainer();

				if(this.isFullscreen()){
					if(options && options.pseudoFullscreen){
						this._disablePseudoFullscreen(container);
					}
					else if(document.exitFullscreen){
						document.exitFullscreen();
					}
					else if(document.mozCancelFullScreen){
						document.mozCancelFullScreen();
					}
					else if(document.webkitCancelFullScreen){
						document.webkitCancelFullScreen();
					}
					else if(document.msExitFullscreen){
						document.msExitFullscreen();
					}
					else{
						this._disablePseudoFullscreen(container);
					}
				}
				else{
					if(options && options.pseudoFullscreen){
						this._enablePseudoFullscreen(container);
					}
					else if(container.requestFullscreen){
						container.requestFullscreen();
					}
					else if(container.mozRequestFullScreen){
						container.mozRequestFullScreen();
					}
					else if(container.webkitRequestFullscreen){
						container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
					}
					else if(container.msRequestFullscreen){
						container.msRequestFullscreen();
					}
					else{
						this._enablePseudoFullscreen(container);
					}
				}

			},

			_enablePseudoFullscreen: function(container){
				L.DomUtil.addClass(container, 'leaflet-pseudo-fullscreen');
				this._setFullscreen(true);
				this.fire('fullscreenchange');
			},

			_disablePseudoFullscreen: function(container){
				L.DomUtil.removeClass(container, 'leaflet-pseudo-fullscreen');
				this._setFullscreen(false);
				this.fire('fullscreenchange');
			},

			_setFullscreen: function(fullscreen){
				this._isFullscreen = fullscreen;
				let container = this.getContainer();

				if(fullscreen){
					L.DomUtil.addClass(container, 'leaflet-fullscreen-on');
				}
				else{
					L.DomUtil.removeClass(container, 'leaflet-fullscreen-on');
				}

				this.invalidateSize();
			},

			_onFullscreenChange: function(e){
				let fullscreenElement =
					document.fullscreenElement ||
					document.mozFullScreenElement ||
					document.webkitFullscreenElement ||
					document.msFullscreenElement;

				if(fullscreenElement === this.getContainer() && !this._isFullscreen){
					this._setFullscreen(true);
					this.fire('fullscreenchange');
				}
				else if(fullscreenElement !== this.getContainer() && this._isFullscreen){
					this._setFullscreen(false);
					this.fire('fullscreenchange');
				}
			},

		});

		L.Map.mergeOptions({fullscreenControl: false});

		L.Map.addInitHook(function(){

			if(this.options.fullscreenControl){
				this.fullscreenControl = new L.Control.Fullscreen(this.options.fullscreenControl);
				this.addControl(this.fullscreenControl);
			}

			let fullscreenchange;

			if('onfullscreenchange' in document){
				fullscreenchange = 'fullscreenchange';
			}
			else if('onmozfullscreenchange' in document){
				fullscreenchange = 'mozfullscreenchange';
			}
			else if('onwebkitfullscreenchange' in document){
				fullscreenchange = 'webkitfullscreenchange';
			}
			else if('onmsfullscreenchange' in document){
				fullscreenchange = 'MSFullscreenChange';
			}

			if(fullscreenchange){
				let onFullscreenChange = L.bind(this._onFullscreenChange, this);

				this.whenReady(function(){
					L.DomEvent.on(document, fullscreenchange, onFullscreenChange);
				});

				this.on('unload', function(){
					L.DomEvent.off(document, fullscreenchange, onFullscreenChange);
				});
			}
		});

		L.control.fullscreen = function(options){
			return new L.Control.Fullscreen(options);
		};


		// coordinate view with selectable input (eases gw2wiki use)
		L.Control.Coordview = L.Control.extend({

			options: {
				position: 'bottomleft',
			},

			onAdd: function(map){
				let container     = L.DomUtil.create('div', 'leaflet-control-coordview leaflet-control');
				let input         = L.DomUtil.create('input');
				input.type        = 'text';
				input.placeholder = '<coords>';
				input.readOnly    = true;

				container.appendChild(input);

				L.DomEvent.disableClickPropagation(container);
				L.DomEvent.on(input, 'click', ev => ev.target.select());

				map.on('click', ev => {
					let point = map.project(ev.latlng, map.options.maxZoom);

					input.value = '['+Math.round(point.x)+', '+Math.round(point.y)+']';

					// ckeckbox: copy to clipboard
					// navigator.clipboard.writeText(input.value);
				});

				return container;
			},

		});

		L.Map.mergeOptions({coordView: true});

		L.Map.addInitHook(function () {
			if (this.options.coordView) {
				new L.Control.Coordview().addTo(this);
			}
		});

		L.control.coordview = function(options){
			return new L.Control.Coordview(options);
		};


		// override L.TileLayer.getTileUrl() and add a custom tile getter
		L.TileLayer.include({
			getTileUrl: function(coords){
				let tileGetter = this.options.tileGetter;

				if(typeof tileGetter === 'function'){
					return tileGetter(coords, this._getZoomForUrl());
				}

				return false;
			}
		});


		// auto center popups and align div/html icons
		L.Popup.include({
			_getAnchor: function(){
				let anchor = this._source && this._source._getPopupAnchor
					? this._source._getPopupAnchor()
					: [0, 0];

				if(typeof anchor === 'string' && anchor.toLowerCase() === 'auto'){
					let style = {left: 0, top: 0, width: 0};

					// is the layer active?
					if(this._source._icon){
						style = window.getComputedStyle(this._source._icon);
					}

					anchor = [
						GW2MapUtil.intval(style.left) + Math.round(GW2MapUtil.intval(style.width) / 2),
						GW2MapUtil.intval(style.top)
					];
				}

				return L.point(anchor);
			}
		});

		// i hate this so much. all of it. but it's necessary :(
		L.LabelMarker = L.Marker.extend({
			_initIcon: function(){
				let options    = this.options;
				let classToAdd = 'leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');
				let icon       = options.icon.createIcon(this._icon);
				let addIcon    = false;

				// if we're not reusing the icon, remove the old one and init new one
				if(icon !== this._icon){

					if(this._icon){
						this._removeIcon();
					}

					addIcon = true;

					if(options.title){
						icon.title = options.title;
					}

				}

				L.DomUtil.addClass(icon, classToAdd);

				if(options.keyboard){
					icon.tabIndex = '0';
				}

				this._icon = icon;

				if(options.riseOnHover){
					this.on({
						mouseover: this._bringToFront,
						mouseout : this._resetZIndex,
					});
				}

				if(options.opacity < 1){
					this._updateOpacity();
				}


				if(addIcon){
					this.getPane().appendChild(this._icon);
					// set icon styles after the node is appended to properly get the computed dimensions
					options.icon._setIconStyles(this._icon, 'icon');
				}

				this._initInteraction();
			},

		});

		L.LabelIcon = L.DivIcon.extend({
			_setIconStyles: function(img, name){
				img.className = 'leaflet-marker-icon ' + (this.options.className || '');

				let sizeOption = this.options.iconSize;
				let anchor     = this.options.iconAnchor;

				if(typeof sizeOption === 'number'){
					sizeOption = [sizeOption, sizeOption];
				}

				let size = L.point(sizeOption);

				if(anchor && anchor.toString().toLowerCase() === 'auto'){
					let origin = window.getComputedStyle(img).perspectiveOrigin.split(' ');

					img.style.left = '-'+origin[0];
					img.style.top = '-'+origin[1];
				}
				else{
					anchor = L.point(anchor || size && size.divideBy(2, true));

					if(anchor){
						img.style.marginLeft = (-anchor.x) + 'px';
						img.style.marginTop  = (-anchor.y) + 'px';
					}
				}

				if(size){
					img.style.width  = size.x + 'px';
					img.style.height = size.y + 'px';
				}

			},

		});

		// leaflet-ant-path, but different
		// https://github.com/rubenspgcavalcante/leaflet-ant-path
		L.AntPath = L.FeatureGroup.extend({

			_antOptions: {
				interactive: false,
				className: 'leaflet-ant-path',
				color: 'rgb(255, 255, 255)',
				opacity: 0.7,
				dashArray: [10 ,20],
			},

			_optionsMap:{
				antColor: 'color',
				antOpacity: 'opacity',
				antDashArray: 'dashArray',
			},

			_latLng: null,
			_antLayers: {main: null, ants: null},

			initialize: function (latLng, options, type){
				L.FeatureGroup.prototype.initialize.call(this);

				this._latLng = latLng;

				this._parseOptions(options);
				this._add(type);
			},

			_parseOptions(options){
				this.options = L.Util.extend(this.options, options || {});

				Object.keys(this._optionsMap).forEach(k => {
					if(this.options[k]){
						this._antOptions[this._optionsMap[k]] = this.options[k];

						delete this.options[k];
					}
				});

				delete this.options.antPath;

				this._antOptions.pane = this.options.pane;
			},

			_add: function(type){
				this._antLayers.ants = new L[type](this._latLng, this._antOptions);
				this._antLayers.main = new L[type](this._latLng, this.options);

				this.addLayer(this._antLayers.ants);
				this.addLayer(this._antLayers.main);
			},

			// @todo: extend the L.Layer/L.FeatureGroup interface if you need it...
		});


		L.GeoJSON.include({

			_pathTypes: ['Circle', 'CircleMarker', 'Polygon', 'Polyline'],

			addLayer: function(layer){

				if(layer instanceof L.Path){
					let type = this._guessPathType(layer);
					let o = layer.options;
					let p = layer.feature.properties;

					if((o.antPath || p.antPath) && type){
						let ll    = type.match(/Circle/) ? layer.getLatLng() : layer.getLatLngs();
						let popup = layer.getPopup();

						// allow setting antPath options from the feature's properties
						if(p.antPath){
							['antColor', 'antOpacity', 'antDashArray', ]
								.forEach(e => o[e] = p[e] || o[e] || null);
						}

						layer = new L.AntPath(ll, o, type);

						if(popup){
							layer.bindPopup(popup);
						}
					}
				}

				this._layers[this.getLayerId(layer)] = layer;

				if(this._map){
					this._map.addLayer(layer);
				}

				return this;
			},

			_guessPathType: function(layer){

				for(let i = 0; i < this._pathTypes.length; i++){
					if(layer instanceof L[this._pathTypes[i]]){
						return this._pathTypes[i];
					}
				}

				return false;
			}

		});


		// save the GW2Map objects for later usage
		// noinspection JSMismatchedCollectionQueryUpdate
		let maps = [];
		let mapOptions = GW2MapUtil.extend(GW2MapOptions, $options);

		Object.keys($containers).forEach(id => {
			let gw2map = $options.localTiles
				? new GW2MapLocal($containers[id], id, mapOptions)
				: new GW2Map($containers[id], id, mapOptions);

			maps[id] = gw2map.init();
		});

//		console.log(maps);
	});

})(GW2MapInvokerOptions, GW2MapContainers);

/* </nowiki> */

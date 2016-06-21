/**
 * Created by Smiley on 11.06.2016.
 *
 * scripts & libraries used:
 *
 * https://github.com/github/fetch
 * https://github.com/MaxArt2501/object-observe
 * http://leafletjs.com/
 * http://vanilla-js.com/
 *
 * https://github.com/codemasher
 * https://wiki.guildwars2.com/wiki/User:Smiley-1
 */

'use strict';

class GW2Map {

	/**
	 * GW2Map constructor.
	 *
	 * @todo: https://github.com/arenanet/api-cdi/issues/337
	 *
	 * @param container
	 * @param id
	 * @param settings
	 * @returns {GW2Map}
	 */
	constructor(container, id, settings){
		this.container = container;
		this.id        = id;
		this.settings  = settings; // common settings for all maps

		this.options   = {}; // per map options
		this.layers    = {};
		this.viewRect = [[0, 0], [32768, 32768]];

		// constants
		this.minZoom  = 0;
		this.maxZoom  = 7;
		this.apiBase  = 'https://api.guildwars2.com/v2/';
		this.tileBase = 'https://tiles.guildwars2.com/';
		this.tileExt  = '.jpg';

		this.getOptions().setBaseMap();
	}

	/**
	 * fires the API request and draws the map
	 *
	 * @returns {GW2Map}
	 */
	render(){

		// use the fetch polyfill if needed
		fetch(this.options.mapUrl, {mode: 'cors'})
			.then(r =>{
				if(r.status === 200){
					return r.json();
				}

				throw new Error(r.statusText);
			})
			.then(r => new GW2GeoJSON(r).getData())
			.then(r =>{
				this.setView(r.viewRect);

				this.layerNames = Object.keys(r.featureCollections);
				this.layerNames.forEach(pane =>{
					var GeoJSON = r.featureCollections[pane];
//					console.log(layerName, GeoJSON);

					this.layers[pane] = L.geoJson(GeoJSON, {
						pane: this.map.createPane(pane),
						coordsToLatLng: coords => this.p2ll(coords),
						pointToLayer: (feature, coords) => this.pointToLayer(feature, coords, pane),
						onEachFeature: (feature, layer) => this.onEachFeature(feature, layer, pane),
						style: feature => this.layerStyle(feature, pane),
					}).addTo(this.map);

				});

			})
			.catch(error => console.log('(╯°□°）╯彡┻━┻ ', error));

		return this;
	}

	/**
	 * set bounds and view
	 *
	 * @todo https://github.com/arenanet/api-cdi/issues/308
	 *
	 * @returns {GW2Map}
	 */
	setView(viewRect){

		if(this.options.continent_id === 2 && this.options.floor_id === 3 && this.options.region_id === 7){ // workaround for #308
			viewRect = [[5118, 6922], [16382, 16382]];
		}

		var bounds = new GW2ContinentRect(viewRect).getBounds();
		bounds = new L.LatLngBounds(this.p2ll(bounds[0]), this.p2ll(bounds[1])).pad(0.1);
		// todo: center coords
		this.map.setMaxBounds(bounds).setView(bounds.getCenter(), this.options.zoom);

		// set viewRect for the tile getter
		this.viewRect = viewRect;

		return this;
	}

	/**
	 * reads the dataset from the container element and stores the values in this.options
	 *
	 * @returns {GW2Map}
	 */
	getOptions(){
		var dataset = this.container.dataset;

		// intval() all the things. again, a mix of paranoia and laziness.
		var continent_id = Tools.intval(dataset.continentId);
		var floor_id     = !dataset.floorId ? 1 : Tools.intval(dataset.floorId); // default to floor 1 if none is given
		var region_id    = Tools.intval(dataset.regionId);
		var map_id       = Tools.intval(dataset.mapId);
		var zoom         = Tools.intval(dataset.zoom);
		var lang         = Tools.intval(dataset.language);

		continent_id = Tools.in_array(continent_id, [1, 2]) ? continent_id : 1;
		region_id    = region_id > 0 ? region_id : false;
		map_id       = map_id > 0 ? map_id : false;
		lang         = ['de', 'en', 'es', 'fr', 'zh'][lang >= 0 && lang <= 4 ? lang : 1];

		// build the request path
		var path = 'continents/' + continent_id + '/floors/' + floor_id;
		path += region_id ? '/regions/' + region_id : '';
		path += region_id && map_id ? '/maps/' + map_id : '';
		path += '?lang=' + lang;

		// save the strings for the current language
		this.i18n = i18n[lang];

		// stuff
		this.options = {
			continent_id: continent_id,
			floor_id    : floor_id,
			region_id   : region_id,
			map_id      : map_id,
			zoom        : zoom >= this.minZoom && zoom <= this.maxZoom ? zoom : this.maxZoom,
			lang        : lang,
			controls    : dataset.controls != false,
			mapUrl      : this.apiBase + path,
			polylines   : dataset.polyline && dataset.polyline.length > 7 ? dataset.polyline : false,
			markers     : dataset.markers && dataset.markers.length > 2 ? dataset.markers : false,
		};

		return this;
	}

	/**
	 * sets the base tiles and adds an optional copyright info
	 *
	 * @returns {GW2Map}
	 */
	setBaseMap(){

		// the map object
		this.map = L.map(this.container, {
			crs  : L.CRS.Simple,
			minZoom           : this.minZoom,
			maxZoom           : this.maxZoom,
			zoomControl       : this.options.controls,
			attributionControl: this.settings.mapAttribution,
		});

		// the main tile layer
		L.tileLayer(null, {
			continuousWorld       : true,
			zoomAnimationThreshold: 8,
			minZoom               : this.minZoom,
			maxZoom               : this.maxZoom,
			attribution           : this.settings.mapAttribution
				? this.i18n.attribution + this.settings.mapAttributionHTML
				: false,
			// use the custom tile getter
			tileGetter            : (coords, zoom) => this.tileGetter(coords, zoom)

		}).addTo(this.map);

		return this;
	}

	/**
	 * @link  http://leafletjs.com/reference-1.0.0.html#geojson-pointtolayer
	 * @param feature
	 * @param coords
	 * @param pane
	 */
	pointToLayer(feature, coords, pane){

		// todo
		if(feature.properties.layertype === 'icon'){
			return L.marker(coords, {
				pane: pane,
				title: feature.properties.name,
				icon: L.icon({
					pane: pane,
					iconUrl: feature.properties.icon,
					iconSize: [32, 32],
					iconAnchor: [16, 16],
					popupAnchor: [0, -16]
				})
			});
		}
		else if(feature.properties.layertype === 'label'){
			return L.marker(coords, {
				pane: pane,
				icon: L.divIcon({
					pane: pane,
					iconSize   : [200, 20],
					popupAnchor: [0, -10],
					className  : feature.properties.type + '-label',
					html       : feature.properties.name
				})
			});
		}
//		else{console.log(feature, coords, pane)}
	}

	/**
	 * @link  http://leafletjs.com/reference-1.0.0.html#geojson-oneachfeature
	 * @param feature
	 * @param layer
	 * @param pane
	 */
	onEachFeature(feature, layer, pane){
//		console.log(feature, layer, pane);
		var p = feature.properties;

		var content = '';

		if(p.icon){
			content += '<img class="layer-contol-icon" src="' + p.icon + '" />';
		}

		if(p.name){
			content += '<a href="' + this.i18n.wiki+encodeURIComponent(p.name.replace(/\.$/, '').replace(/\s/g, '_')) + '" target="_blank">' + p.name + '</a>';
		}

		if(p.level){
			content += ' (' + p.level + ')';
		}

		if(p.chat_link){
			if(content){
				content += '<br>';
			}
			content += '<input class="chatlink" type="text" value="' + p.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';
		}

		if(content){
			layer.bindPopup(content);
		}

	}

	/**
	 * @link  http://leafletjs.com/reference-1.0.0.html#geojson-style
	 * @param feature
	 * @param pane
	 */
	layerStyle(feature, pane){
//		console.log(feature, pane);

//		console.log(feature.properties.type + '_' + feature.properties.layertype, pane);


		if(Tools.in_array(pane, ['region_poly','map_poly','sector_poly','task_poly'])){
			return {
				pane: pane,
				stroke: true,
				opacity: 0.7,
				color: this.settings.colors[pane],
				weight: 2,
				interactive: false,
			}
		}

		return {};
	}

	/**
	 * @param coords
	 * @returns {LatLng}
	 */
	p2ll(coords){
		return this.map.unproject(coords, this.maxZoom);
	}

	/**
	 * @param point
	 * @param zoom
	 * @returns {*[]}
	 */
	project(point, zoom){
		var div = 1 << (this.maxZoom - zoom);

		return [point[0] / div, point[1] / div];
	}

	/**
	 * @param coords
	 * @param zoom
	 * @returns {*}
	 */
	tileGetter(coords, zoom){
		var nw = this.project(this.viewRect[0], zoom);
		var se = this.project(this.viewRect[1], zoom);

		if(coords.x < Math.ceil(se[0] / 256) && coords.y < Math.ceil(se[1] / 256)
			&& coords.x >= Math.floor(nw[0] / 256) && coords.y >= Math.floor(nw[1] / 256)
		){
			return this.tileBase + this.options.continent_id + '/' + this.options.floor_id +
				'/' + zoom + '/' + coords.x + '/' + coords.y + this.tileExt;
		}

		return this.settings.errorTile;
	}

}


/**
 * Class Tools
 */
class Tools{

	/**
	 * @param target {*}
	 * @param source {*}
	 * @returns {*}
	 */
	static extend(target, source) {
		for(var property in source) {
			if(source.hasOwnProperty(property)) {
				target[property] = source[property];
			}
		}

		return target;
	}

	/**
	 * @link  http://phpjs.org/functions/intval/
	 *
	 * @param mixed_var
	 * @param base
	 * @returns {*}
	 */
	static intval(mixed_var, base){
		var tmp;
		var type = typeof(mixed_var);

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
	 * @link  http://phpjs.org/functions/in_array/
	 *
	 * @param needle
	 * @param haystack
	 * @returns {boolean}
	 */
	static in_array(needle, haystack){

		for(var key in haystack){
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
 * TODO: add es & fr language snippets, layers
 */
var i18n = {
	de: {
		wiki       : 'https://wiki-de.guildwars2.com/wiki/',
		attribution: 'Kartendaten und -bilder',
		layers     : {
			event     : 'Events',
			landmark  : 'Sehenswürdigkeiten',
			map       : 'Kartennamen',
			markers   : 'Marker',
			polylines : 'Polylinien',
			region    : 'Regionen',
			sector    : 'Zonen',
			heropoint : 'Fertigkeitspunkte',
			task      : 'Aufgaben',
			unlock    : 'unlock',
			vista     : 'Aussichtspunkte',
			waypoint  : 'Wegpunkte',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	en: {
		wiki       : 'https://wiki.guildwars2.com/wiki/',
		attribution: 'Map data and imagery',
		layers     : {
			// test
			event     : 'Events',
			landmark  : 'Landmarks',
			map       : 'Map Names',
			markers   : 'Markers',
			polylines : 'Polylines',
			region    : 'Region Names',
			sector    : 'Sectors',
			heropoint : 'Skill Challenges',
			task      : 'Tasks',
			unlock    : 'unlock',
			vista     : 'Vistas',
			waypoint  : 'Waypoints',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	es: {
		wiki       : 'https://wiki-es.guildwars2.com/wiki/',
		attribution: 'attribution-es',
		layers     : {
			event     : 'event-es',
			landmark  : 'poi-es',
			map       : 'map-es',
			markers   : 'markers-es',
			polylines : 'polyline-es',
			region    : 'region-es',
			sector    : 'sector-es',
			heropoint : 'skill-es',
			task      : 'task-es',
			unlock    : 'unlock',
			vista     : 'vista-es',
			waypoint  : 'waypoint-es',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	fr: {
		wiki       : 'https://wiki-fr.guildwars2.com/wiki/',
		attribution: 'attribution-fr',
		layers     : {
			event     : 'event-fr',
			landmark  : 'Sites remarquables',
			map       : 'map-fr',
			markers   : 'markers-fr',
			polylines : 'polyline-fr',
			region    : 'region-fr',
			sector    : 'Secteurs',
			heropoint : 'Défis de compétences',
			unlock    : 'unlock',
			task      : 'Cœurs',
			vista     : 'Panoramas',
			waypoint  : 'Points de passage',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
	zh: {
		wiki       : '',
		attribution: 'attribution-zh',
		layers     : {
			event     : 'event-zh',
			landmark  : 'poi-zh',
			map       : 'map-zh',
			markers   : 'markers-zh',
			polylines : 'polyline-zh',
			region    : 'region-zh',
			sector    : 'sector-zh',
			heropoint : 'skill-zh',
			task      : 'task-zh',
			unlock    : 'unlock',
			vista     : 'vista-zh',
			waypoint  : 'waypoint-zh',
			Camp      : 'wvw_camp',
			Tower     : 'wvw_tower',
			Keep      : 'wvw_keep',
			Castle    : 'wvw_castle',
			Ruins     : 'wvw_ruins',
			Generic   : 'wvw_generic',
			Resource  : 'wvw_resource',
		}
	},
};


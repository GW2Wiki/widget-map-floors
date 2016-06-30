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

		this.options  = {}; // per map options
		this.layers   = {};
		this.panes    = {};
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
	 * @todo https://github.com/arenanet/api-cdi/pull/62
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
			// transform the response to GeoJSON - polyfill for #62
			.then(r => new GW2GeoJSON(r).getData())
			// add additional GeoJSON layers
			.then(r =>{
				r.featureCollections.jumpingpuzzle_icon = this.mergeJPs();
				r.featureCollections.masterypoint_icon  = this.mergeMPs();

				this.layerNames = Object.keys(r.featureCollections);

				this.setView(r.viewRect);

				return r;
			})
			// draw the map from the GeoJson data
			.then(r =>{

				this.layerNames.forEach(pane =>{
					let GeoJSON = r.featureCollections[pane];
//					console.log(layerName, GeoJSON);
					this.panes[pane] = L.geoJson(GeoJSON, {
						pane          : this.map.createPane(pane),
						coordsToLatLng: coords => this.p2ll(coords),
						pointToLayer  : (feature, coords) => this.pointToLayer(feature, coords, pane),
						onEachFeature : (feature, layer) => this.onEachFeature(feature, layer, pane),
						style         : feature => this.layerStyle(feature, pane),
					}).addTo(this.map);

					this.layers[pane] = L.layerGroup();
				});
			})
			// do stuff
			.then(() =>{
				// add the layer controls
				L.control.layers(null, this.panes).addTo(this.map);

				// add a coordinate debugger
				this.map.on('click', point => console.log(this.map.project(point.latlng, this.maxZoom).toString()));
			})
			// i can haz error? kthxbye!
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

		let bounds = new GW2ContinentRect(viewRect).getBounds();
		bounds = new L.LatLngBounds(this.p2ll(bounds[0]), this.p2ll(bounds[1])).pad(0.1);

		let center = bounds.getCenter();
		let coords = this.options.centerCoords;

		if(coords.length === 2){
			coords.forEach((pos, i) => coords[i] = Tools.intval(pos));

			if(coords[0] !== 0 && coords[1] !== 0){
				center = this.p2ll(coords);
			}
		}

		this.map.setMaxBounds(bounds).setView(center, this.options.zoom);

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
		let dataset = this.container.dataset;

		// intval() all the things. again, a mix of paranoia and laziness.
		let continent_id = Tools.intval(dataset.continentId);
		let floor_id     = !dataset.floorId ? 1 : Tools.intval(dataset.floorId); // default to floor 1 if none is given
		let region_id    = Tools.intval(dataset.regionId);
		let map_id       = Tools.intval(dataset.mapId);
		let zoom         = Tools.intval(dataset.zoom);
		let lang         = Tools.intval(dataset.language);

		continent_id = Tools.in_array(continent_id, [1, 2]) ? continent_id : 1;
		region_id    = region_id > 0 ? region_id : false;
		map_id       = map_id > 0 ? map_id : false;
		lang         = ['de', 'en', 'es', 'fr', 'zh'][lang >= 0 && lang <= 4 ? lang : 1];

		// build the request path
		let path = 'continents/' + continent_id + '/floors/' + floor_id;
		path += region_id ? '/regions/' + region_id : '';
		path += region_id && map_id ? '/maps/' + map_id : '';
		path += '?lang=' + lang;

		// save the strings for the current language
		this.i18n = i18n[lang];

		// stuff
		this.options = {
			centerCoords: dataset.centerCoords.split(','),
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
		let p = feature.properties;

		// merge Alex's Heropoint data
		if(p.type === 'heropoint'){
			GW2Heropoints.forEach(hp => {
				if(p.coords[0] === hp.coord[0] && p.coords[1] === hp.coord[1]){
					p.name = hp.link;
					p.id   = hp.id;
				}
			});
		}

		if(p.type === 'vista' && GW2Vistas[p.id]){
			p.name = GW2Vistas[p.id].link;
		}

		return L.marker(coords, {
			pane: pane,
			title: p.layertype === 'icon' ? p.name : null,
			icon: L.divIcon({
				pane: pane,
				iconSize   : [null, null],
				popupAnchor: [null, null], // todo: fix popup center -> L.Marker
				className  : 'gw2map-' + p.layertype + ' gw2map-' + p.type + '-' + p.layertype,
				html       : p.layertype === 'label' ? p.name : '',
			})
		});
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
		let p = feature.properties;

		let content = '';

		if(p.layertype === 'icon'){
			content += '<span class="gw2map-popup-icon gw2map-'+ p.type +'-icon" ></span>';
		}

		if(p.name){
			let displayname = p.name;

			// merge Alex's vista data
			if(p.type === 'vista' && GW2Vistas[p.id]){
				displayname = GW2Vistas[p.id].name;
			}

			content += '<a class="gw2map-wikilink" href="' + this.i18n.wiki+encodeURIComponent(p.name.replace(/\.$/, '').replace(/\s/g, '_')) + '" target="_blank">' + displayname + '</a>';
		}

		if(p.level){
			content += ' (' + p.level + ')';
		}

		if(p.chat_link){
			if(content){
				content += '<br>';
			}
			content += '<input class="gw2map-chatlink" type="text" value="' + p.chat_link + '" readonly="readonly" onclick="this.select();return false;" />';
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
	 * merge Alex's JP data
	 *
	 * @returns {{type: string, features: Array}|*}
	 */
	mergeJPs(){
		let jpFeatures = new GeoJSONFeatureCollection();

		GW2JumpingPuzzles.forEach(jp =>{
			jpFeatures.addFeature({
				name     : jp.link,
				type     : 'jumpingpuzzle',
				layertype: 'icon',
			}).setGeometry(jp.coord);
		});

		return jpFeatures.getJSON();
	}

	/**
	 * merge Alex's MP data
	 *
	 * @returns {{type: string, features: Array}|*}
	 */
	mergeMPs(){
		let mpFeatures = new GeoJSONFeatureCollection();

		GW2MasteryPoints.forEach(mp =>{
			mpFeatures.addFeature({
				name     : mp.name,
				type     : 'masterypoint',
				layertype: 'icon',
			}).setGeometry(mp.coord);
		});

		return mpFeatures.getJSON();
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
		let div = 1 << (this.maxZoom - zoom);

		return [point[0] / div, point[1] / div];
	}

	/**
	 * @param coords
	 * @param zoom
	 * @returns {*}
	 */
	tileGetter(coords, zoom){
		let nw = this.project(this.viewRect[0], zoom);
		let se = this.project(this.viewRect[1], zoom);

		if(coords.x < Math.ceil(se[0] / 256)
		   && coords.y < Math.ceil(se[1] / 256)
		   && coords.x >= Math.floor(nw[0] / 256)
		   && coords.y >= Math.floor(nw[1] / 256)
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
		for(let property in source) {
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
	 * @param needle
	 * @param haystack
	 * @returns {boolean}
	 */
	static in_array(needle, haystack){
		for(let key in haystack){
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
const i18n = {
	de: {
		wiki       : 'https://wiki-de.guildwars2.com/wiki/',
		attribution: 'Kartendaten und -bilder',
		layers     : {

		},
	},
	en: {
		wiki       : 'https://wiki.guildwars2.com/wiki/',
		attribution: 'Map data and imagery',
		layers     : {

		},
	},
	es: {
		wiki       : 'https://wiki-es.guildwars2.com/wiki/',
		attribution: 'attribution-es',
		layers     : {

		},
	},
	fr: {
		wiki       : 'https://wiki-fr.guildwars2.com/wiki/',
		attribution: 'attribution-fr',
		layers     : {

		},
	},
	zh: {
		wiki       : '',
		attribution: 'attribution-zh',
		layers     : {

		},
	},
};


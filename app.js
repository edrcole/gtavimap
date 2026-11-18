/**
 * VICE CITY ATLAS — YANIS V17 LEONIDA INTERACTIVE OS (PC & MOBILE SPLIT EDITION)
 * Powered by Yanis V17 Clean Tile Engine + 3,485 Real Landmarks & Media Spots
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. CONFIGURATION: YANIS V17 CLEAN ENGINE & TROPICAL CATEGORIES
    // =========================================================================
    const BASE_CDN = 'https://map.stateofleonida.net/';

    const YANIS_CONFIG = {
        id: 'v17',
        name: 'Yanis V17 Clean PRO',
        originalSize: { width: 21000, height: 20000 },
        // Full mathematical tile bounds
        tileBounds: [[-9000, -17000], [11000, 4000]],
        // Full western & vertical bounds of Leonida (including Gulf of Leonida & Kelly County at -10500, and Redhill at +10750 down to Keys at -9000)
        // while keeping the baked-in Yanis legend (west of -10550) completely outside!
        islandBounds: [[-9000, -10550], [10750, 4000]],
        maxNativeZoom: 6,
        maxZoom: 8,
        urls: {
            'nocams-dark': `${BASE_CDN}tiles/YANIS/v17/nocams/dark/{z}/{x}/{y}.png`,
            'nocams-normal': `${BASE_CDN}tiles/YANIS/v17/nocams/normal/{z}/{x}/{y}.png`,
        }
    };

    const CATEGORY_META = {
        enterable:  { label: 'Interno Esplorabile', color: '#FF6B2B', emoji: '🚪' },
        hotel:      { label: 'Hotel & Resort',      color: '#FF2A85', emoji: '🏨' },
        nightlife:  { label: 'Nightlife & Club',    color: '#FF8E3C', emoji: '🍸' },
        shop:       { label: 'Negozio & Armi',      color: '#B537F2', emoji: '🛍️' },
        trailer:    { label: 'Rockstar Trailer',    color: '#FF4D8D', emoji: '🎬' },
        screenshot: { label: 'Screenshot Rockstar', color: '#FFD166', emoji: '📸' },
        transit:    { label: 'Trasporti & Ponti',   color: '#D946EF', emoji: '✈️' },
        landmark:   { label: 'Landmark & Edificio', color: '#A78BFA', emoji: '🌴' },
        leak:       { label: 'Leak Verificato',     color: '#FBBF24', emoji: '👁️' },
        custom:     { label: 'Spot Personale',      color: '#FF0055', emoji: '⭐' }
    };

    // Curated Teleport Regions & Neon Map Labels
    const TELEPORT_REGIONS = [
        { id: 'ocean_beach', name: 'Ocean Beach & Ocean Drive', sub: 'Art Deco District, Hotel & Neon', emoji: '🌴', lat: 699, lng: 1744, zoom: 5 },
        { id: 'vice_beach', name: 'Vice Beach & Washington', sub: 'Spiagge Tropicali & Resort', emoji: '🏖️', lat: 1450, lng: 1700, zoom: 5 },
        { id: 'downtown', name: 'Downtown Vice City', sub: 'Grattacieli, Finanza & Autostrade', emoji: '🏙️', lat: -102, lng: -662, zoom: 5 },
        { id: 'crosstown', name: 'Crosstown & Little Haiti', sub: 'Cuore Urbano di Vice City', emoji: '🌺', lat: 1157, lng: -636, zoom: 5 },
        { id: 'vcia', name: 'Vice City Int. Airport (VCIA)', sub: 'Terminal Aerei & Hangar', emoji: '✈️', lat: -706, lng: -2330, zoom: 5 },
        { id: 'leonida_keys', name: 'Leonida Keys & Key Lento', sub: 'Arcipelago Tropicale & Ponti sul Mare', emoji: '🏝️', lat: -5893, lng: -2508, zoom: 4 },
        { id: 'grassrivers', name: 'Grassrivers (Everglades)', sub: 'Paludi, Airboat & Alligatori', emoji: '🐊', lat: -4502, lng: -3477, zoom: 4 },
        { id: 'port_gellhorn', name: 'Port Gellhorn', sub: 'Costa Ovest, Motel, Circuito & Porto', emoji: '⚓', lat: 3669, lng: -6549, zoom: 4 },
        { id: 'raceway', name: 'Gellhorn Int. Raceway', sub: 'Autodromo & Pista da Corsa', emoji: '🏎️', lat: 1983, lng: -6462, zoom: 5 },
        { id: 'ambrosia', name: 'Lake Leonida & Ambrosia', sub: 'Grande Lago Centrale & Colline', emoji: '🌅', lat: 3981, lng: -2785, zoom: 4 },
        { id: 'hamlet', name: 'Hamlet & Homestead', sub: 'Sud Leonida & Campi Agricoli', emoji: '🌾', lat: -3193, lng: -2691, zoom: 4 }
    ];

    // =========================================================================
    // 2. APPLICATION STATE & STORAGE
    // =========================================================================
    const state = {
        map: null,
        tileLayer: null,
        oceanMaskLayer: null,
        clusterGroup: null,
        districtLabelsLayer: null,
        gridLayer: null,
        rockstarOverlays: {},
        measureLayer: null,
        measurePoints: [],
        isMeasuring: false,
        isPinDropping: false,
        pendingPinCoords: null,
        lightboxSpot: null,

        currentMapStyle: 'nocams-dark',
        galleryFilter: 'all',

        activeCategories: new Set(['enterable', 'hotel', 'nightlife', 'shop', 'trailer', 'screenshot', 'transit', 'landmark', 'leak', 'custom']),
        subFilter: 'all', // 'all' | 'photo' | 'saved' | 'found'
        searchQuery: '',
        selectedSpot: null,
        savedTab: 'custom',

        allSpots: [],
        markerMap: new Map(),

        favorites: new Set(JSON.parse(localStorage.getItem('vc_atlas_favorites') || '[]')),
        foundSpots: new Set(JSON.parse(localStorage.getItem('vc_atlas_found') || '[]')),
        customSpots: JSON.parse(localStorage.getItem('vc_atlas_custom_spots') || '[]')
    };

    // =========================================================================
    // 3. CUSTOM LEAFLET CRS & EXACT VERTICAL FULL-HEIGHT CLAMP (PC & MOBILE)
    // =========================================================================
    function createYanisCRS(cfg) {
        const { originalSize, tileBounds, maxNativeZoom } = cfg;
        const south = tileBounds[0][0];
        const west = tileBounds[0][1];
        const north = tileBounds[1][0];
        const east = tileBounds[1][1];
        const boundsWidth = east - west;
        const boundsHeight = north - south;
        const pxPerUnitX0 = originalSize.width / boundsWidth / Math.pow(2, maxNativeZoom);
        const pxPerUnitY0 = originalSize.height / boundsHeight / Math.pow(2, maxNativeZoom);

        return L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(
                pxPerUnitX0,
                -west * pxPerUnitX0,
                -pxPerUnitY0,
                north * pxPerUnitY0
            ),
            scale: function (zoom) {
                return Math.pow(2, zoom);
            },
            zoom: function (scale) {
                return Math.log(scale) / Math.LN2;
            }
        });
    }

    /**
     * Computes the minimum zoom:
     * - On Desktop (> 860px): Exact vertical fit so the map touches top & bottom screen borders with zero vertical scrolling.
     * - On Mobile (<= 860px): Allows zooming out slightly further so the whole island fits comfortably above the bottom overlay,
     *   and allows vertical panning up/down so the southern Leonida Keys can be scrolled well above the bottom widget!
     */
    function computeExactFitVerticalZoom() {
        const mapEl = document.getElementById('map');
        const mapH = (mapEl && mapEl.clientHeight) ? mapEl.clientHeight : window.innerHeight;
        const totalUnitsY = YANIS_CONFIG.tileBounds[1][0] - YANIS_CONFIG.tileBounds[0][0]; // 20000
        const islandUnitsY = YANIS_CONFIG.islandBounds[1][0] - YANIS_CONFIG.islandBounds[0][0]; // 19750
        const islandHeightAtZoom0 = (YANIS_CONFIG.originalSize.height * (islandUnitsY / totalUnitsY)) / Math.pow(2, YANIS_CONFIG.maxNativeZoom);
        const exactFitZ = Math.log2(mapH / islandHeightAtZoom0);
        if (window.innerWidth <= 860) {
            return exactFitZ - 0.55; // Zoom out more on mobile so the map fits nicely above the bottom HUD!
        }
        return exactFitZ;
    }

    function computeCurrentMaxBounds() {
        const cfg = YANIS_CONFIG;
        if (window.innerWidth <= 860) {
            // On mobile, allow generous vertical panning down to -16500 and up to +14500 so the user can freely drag
            // the southernmost Leonida Keys up into the top half of the screen above the bottom widget even at minZoom!
            return L.latLngBounds(L.latLng(-16500, -16500), L.latLng(14500, 11500));
        }
        return L.latLngBounds(L.latLng(cfg.islandBounds[0][0], -16000), L.latLng(cfg.islandBounds[1][0], 11000));
    }

    // =========================================================================
    // 4. INITIALIZE MAP & LAYERS (FAST WHEEL ZOOM + CLICK OUTSIDE WIDGETS)
    // =========================================================================
    function initMap() {
        const cfg = YANIS_CONFIG;
        const customCRS = createYanisCRS(cfg);
        const exactMinZ = computeExactFitVerticalZoom();

        const maxPanBounds = computeCurrentMaxBounds();

        // Initialize with minZoom: 0 so MarkerCluster builds all integer zoom grids [0..8] cleanly
        state.map = L.map('map', {
            crs: customCRS,
            zoomControl: false,
            attributionControl: false,
            minZoom: 0,
            maxZoom: cfg.maxZoom,
            maxBounds: maxPanBounds,
            maxBoundsViscosity: 1.0,
            // Allow exact fractional zoom while disables default slow wheel zoom (we use our ultra-fast custom wheel handler!)
            zoomSnap: 0,
            scrollWheelZoom: false,
            preferCanvas: true
        });

        // Custom smooth, well-controlled mouse-wheel & trackpad zoom (reduced speed by ~70% + smooth zoomAround without center jumps!)
        const mapContainerEl = document.getElementById('map');
        mapContainerEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (!state.map) return;
            const minZ = computeExactFitVerticalZoom();
            const maxZ = cfg.maxZoom;
            const currentZ = state.map.getZoom();
            const rawDelta = -e.deltaY;
            if (Math.abs(rawDelta) < 0.5) return;
            // Gentle, precise step: ~30% of previous speed (capped at 0.28 per wheel tick, smooth proportional scaling for trackpads)
            const step = Math.sign(rawDelta) * Math.min(0.28, Math.max(0.06, Math.abs(rawDelta) * 0.0022));
            const targetZ = Math.max(minZ, Math.min(maxZ, currentZ + step));
            if (Math.abs(targetZ - currentZ) > 0.002) {
                const rect = mapContainerEl.getBoundingClientRect();
                const containerPt = L.point(e.clientX - rect.left, e.clientY - rect.top);
                state.map.setZoomAround(containerPt, targetZ, { animate: false });
            }
        }, { passive: false });

        updateBaseTileLayer();
        initMarkerLayers();
        initDistrictLabels();
        initTacticalGrid();

        // Lock minimum zoom to exact vertical map fit
        state.map.setMinZoom(exactMinZ);

        // Start centered on Vice City & Leonida (on mobile, shift center slightly south so the whole island sits above the bottom widget)
        const startCenter = window.innerWidth <= 860 ? [-1400, -2400] : [875, -1800];
        state.map.setView(startCenter, window.innerWidth <= 860 ? exactMinZ + 0.35 : Math.max(exactMinZ + 1.2, 2.75));

        window.addEventListener('resize', () => {
            if (!state.map) return;
            state.map.invalidateSize();
            const newMinZ = computeExactFitVerticalZoom();
            state.map.setMinZoom(newMinZ);
            state.map.setMaxBounds(computeCurrentMaxBounds());
            if (state.map.getZoom() < newMinZ) {
                state.map.setZoom(newMinZ);
            }
        });

        // Throttled GPS Coordinates on mousemove for zero lag
        let rafPending = false;
        state.map.on('mousemove', (e) => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                const x = Math.round(e.latlng.lng);
                const y = Math.round(e.latlng.lat);
                const gpsEl = document.getElementById('liveGpsCoords');
                if (gpsEl) gpsEl.textContent = `X: ${x} · Y: ${y}`;
                rafPending = false;
            });
        });

        state.map.on('zoomend', () => {
            const z = state.map.getZoom();
            const zEl = document.getElementById('zoomLevelText');
            if (zEl) zEl.textContent = `Z${Math.round(z * 10) / 10}`;
        });

        state.map.on('click', onMapClick);
    }

    function updateBaseTileLayer() {
        const cfg = YANIS_CONFIG;
        const url = cfg.urls[state.currentMapStyle] || cfg.urls['nocams-dark'];
        // Render full tileBounds so NO western island/ocean tiles are skipped, while the oceanMaskLayer hides the legend cleanly!
        const latLngBounds = L.latLngBounds(
            L.latLng(cfg.tileBounds[0][0], cfg.tileBounds[0][1]),
            L.latLng(cfg.tileBounds[1][0], cfg.tileBounds[1][1])
        );

        if (state.tileLayer) {
            state.map.removeLayer(state.tileLayer);
        }

        const isDay = state.currentMapStyle.includes('normal');
        // Exact sampled hex color of Yanis V17 ocean so the mask blends 100% invisibly with zero seam line!
        const oceanColor = isDay ? '#265F9C' : '#36454C';
        const mapContainer = document.getElementById('map');
        mapContainer.style.background = oceanColor;

        if (!state.oceanMaskPane) {
            state.oceanMaskPane = state.map.createPane('oceanMaskPane');
            // Always sit above the tilePane (200) and below overlays/markers (400) so the baked-in legend NEVER flashes for 1ms!
            state.oceanMaskPane.style.zIndex = '250';
            state.oceanMaskPane.style.pointerEvents = 'none';
        }

        if (state.oceanMaskLayer) {
            state.map.removeLayer(state.oceanMaskLayer);
        }

        // Seamless SVG ocean cover with padding: 1.5 so fast panning left NEVER exposes the baked-in legend before redrawing!
        const maskRenderer = L.svg({ pane: 'oceanMaskPane', padding: 1.5 });
        state.oceanMaskLayer = L.layerGroup([
            L.rectangle([[-25000, -45000], [25000, -10550]], {
                pane: 'oceanMaskPane',
                renderer: maskRenderer,
                stroke: false,
                fillColor: oceanColor,
                fillOpacity: 1,
                interactive: false
            }),
            L.rectangle([[-25000, -45000], [-8350, -4500]], {
                pane: 'oceanMaskPane',
                renderer: maskRenderer,
                stroke: false,
                fillColor: oceanColor,
                fillOpacity: 1,
                interactive: false
            })
        ]).addTo(state.map);

        const CustomYanisTileLayer = L.TileLayer.extend({
            createTile: function (coords, done) {
                const z = coords.z;
                const x = coords.x;
                const y = coords.y;
                const scale = Math.pow(2, z);
                // The baked-in Yanis legend sits in the leftmost 30.6% of the 21000px image (x / 2^z < 0.306).
                // Any tile strictly inside the legend column (or bottom-left interiors box) is replaced with a pure ocean tile so the legend NEVER loads or flashes!
                const tileRightRatio = (x + 1) / scale;
                const tileTopRatio = y / scale;
                const isPureLeftLegend = tileRightRatio <= 0.307;
                const isBottomLeftInteriors = (tileRightRatio <= 0.58) && (tileTopRatio >= 0.968);

                if (isPureLeftLegend || isBottomLeftInteriors) {
                    const emptyTile = document.createElement('div');
                    emptyTile.style.width = '256px';
                    emptyTile.style.height = '256px';
                    emptyTile.style.background = oceanColor;
                    setTimeout(() => done(null, emptyTile), 0);
                    return emptyTile;
                }
                return L.TileLayer.prototype.createTile.call(this, coords, done);
            }
        });

        state.tileLayer = new CustomYanisTileLayer(url, {
            minZoom: 0,
            maxZoom: cfg.maxZoom,
            maxNativeZoom: cfg.maxNativeZoom,
            tileSize: 256,
            bounds: latLngBounds,
            noWrap: true,
            keepBuffer: 6,
            updateWhenZooming: false,
            updateWhenIdle: true
        }).addTo(state.map);
    }

    // =========================================================================
    // 5. MARKERS & SMART CLUSTERING (OPTIMIZED FOR ZERO LAG)
    // =========================================================================
    function initMarkerLayers() {
        state.clusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 6,
            chunkedLoading: true,
            animate: false, // Instant crisp cluster zoom without frame drops
            iconCreateFunction: function (cluster) {
                const count = cluster.getChildCount();
                const isLarge = count >= 50;
                const size = count >= 100 ? 44 : count >= 20 ? 38 : 32;
                return L.divIcon({
                    html: `<div class="vc-cluster-icon ${isLarge ? 'vc-cluster-large' : ''}" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
                    className: '',
                    iconSize: L.point(size, size)
                });
            }
        });

        state.map.addLayer(state.clusterGroup);

        const baseSpots = Array.isArray(window.VICE_ATLAS_SPOTS) ? window.VICE_ATLAS_SPOTS : [];
        state.allSpots = [...state.customSpots, ...baseSpots];

        buildAllMarkers();
        refreshVisibleMarkers();
        updateCategoryCounts();
        updateFoundCounter();
    }

    function createSpotMarker(spot) {
        const meta = CATEGORY_META[spot.category] || CATEGORY_META.landmark;
        const isFav = state.favorites.has(spot.id);
        const isFound = state.foundSpots.has(spot.id);

        const iconHtml = `
            <div class="vc-marker-pin ${isFav ? 'is-fav' : ''} ${isFound ? 'is-found' : ''}" 
                 style="--mc: ${meta.color}" 
                 title="${escapeHtml(spot.title)}">
                <span>${meta.emoji}</span>
            </div>
        `;

        const marker = L.marker([spot.lat, spot.lng], {
            icon: L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        });

        marker.spotData = spot;
        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectSpot(spot, { pan: true });
        });

        return marker;
    }

    function buildAllMarkers() {
        state.markerMap.clear();
        for (const spot of state.allSpots) {
            const marker = createSpotMarker(spot);
            state.markerMap.set(spot.id, marker);
        }
    }

    function refreshSpotMarkerAppearance(spot) {
        const oldMarker = state.markerMap.get(spot.id);
        if (!oldMarker) return;
        const newMarker = createSpotMarker(spot);
        state.markerMap.set(spot.id, newMarker);
        refreshVisibleMarkers();
    }

    function matchesFilters(spot) {
        if (!state.activeCategories.has(spot.category)) return false;

        if (state.subFilter === 'photo' && !spot.igPhoto && !spot.rlPhoto) return false;
        if (state.subFilter === 'saved' && !state.favorites.has(spot.id)) return false;
        if (state.subFilter === 'found' && !state.foundSpots.has(spot.id)) return false;

        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            const hay = `${spot.id} ${spot.title} ${spot.district} ${spot.rlAddress || ''} ${(spot.tags || []).join(' ')}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    }

    function refreshVisibleMarkers() {
        state.clusterGroup.clearLayers();

        const filteredSpots = [];
        const markersToAdd = [];

        for (const spot of state.allSpots) {
            if (matchesFilters(spot)) {
                filteredSpots.push(spot);
                const m = state.markerMap.get(spot.id);
                if (m) markersToAdd.push(m);
            }
        }

        state.clusterGroup.addLayers(markersToAdd);

        const badge = document.getElementById('visibleSpotsBadge');
        if (badge) badge.textContent = `${filteredSpots.length.toLocaleString('it-IT')} attivi`;

        renderExploreList(filteredSpots);
    }

    // =========================================================================
    // 6. EXPLORE RIGHT WIDGET LIST, INSPECTOR CARD & PHOTO LIGHTBOX
    // =========================================================================
    function renderExploreList(spots) {
        const container = document.getElementById('spotListContainer');
        if (!container) return;

        const genericNames = new Set(['washington beach', 'ocean beach', 'vice beach', 'shore dr', 'vice city', 'port gellhorn', 'key lento', 'crosstown', 'downtown', 'ambrosia', 'hamlet', 'leonida keys']);
        const sortedSpots = [...spots].sort((a, b) => {
            const aClean = a.title.toLowerCase().trim();
            const bClean = b.title.toLowerCase().trim();
            const aNamed = !aClean.startsWith('edificio ') && !aClean.startsWith('?') && !genericNames.has(aClean);
            const bNamed = !bClean.startsWith('edificio ') && !bClean.startsWith('?') && !genericNames.has(bClean);
            const aScore = (aNamed ? 6 : 0) + (a.igPhoto ? 3 : 0) + (a.enterable ? 2 : 0);
            const bScore = (bNamed ? 6 : 0) + (b.igPhoto ? 3 : 0) + (b.enterable ? 2 : 0);
            return bScore - aScore;
        });
        const prioritized = sortedSpots.slice(0, 100);

        if (prioritized.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 32px 12px; color: var(--text-muted); font-size: 12.5px;">
                    Nessuno spot trovato con questi filtri.<br>Prova a cambiare ricerca o clicca su "Filtri" in alto.
                </div>
            `;
            return;
        }

        container.innerHTML = prioritized.map(spot => {
            const meta = CATEGORY_META[spot.category] || CATEGORY_META.landmark;
            const isSelected = state.selectedSpot && state.selectedSpot.id === spot.id;
            const hasPhoto = Boolean(spot.igPhoto || spot.rlPhoto);
            const isFav = state.favorites.has(spot.id);
            const isFound = state.foundSpots.has(spot.id);

            return `
                <div class="spot-item ${isSelected ? 'selected' : ''}" data-spot-id="${escapeHtml(spot.id)}">
                    <div class="spot-item-icon" style="--spot-c: ${meta.color}">
                        ${meta.emoji}
                    </div>
                    <div class="spot-item-main">
                        <div class="spot-item-title">${escapeHtml(spot.title)}</div>
                        <div class="spot-item-sub">${escapeHtml(spot.district)}</div>
                    </div>
                    <div class="spot-item-badges">
                        ${isFav ? '<span class="mini-badge badge-fav" title="Preferito">★</span>' : ''}
                        ${isFound ? '<span class="mini-badge badge-found" title="Visitato">✓</span>' : ''}
                        ${hasPhoto ? '<span class="mini-badge badge-photo" title="Con Foto">📸</span>' : ''}
                        <span class="mini-badge">${escapeHtml(spot.id)}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.spot-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-spot-id');
                const spot = state.allSpots.find(s => String(s.id) === String(id));
                if (spot) selectSpot(spot, { pan: true, zoom: 6 });
            });
        });
    }

    function selectSpot(spot, options = {}) {
        state.selectedSpot = spot;

        if (options.pan && state.map) {
            const maxAutoZoom = window.innerWidth <= 860 ? 5.0 : 6.0;
            const targetZoom = Math.min(maxAutoZoom, options.zoom || Math.max(state.map.getZoom(), 5.0));
            state.map.flyTo([spot.lat, spot.lng], targetZoom, {
                duration: 0.7
            });
        }
        if (window.innerWidth <= 860) {
            // Close mobile search sheet when a spot is selected so the Inspector Card shines cleanly in the center!
            document.querySelector('.right-main-column')?.classList.remove('mobile-search-open');
            document.getElementById('btnMobileSearchOrb')?.classList.remove('active');
        }

        const card = document.getElementById('inspectorCard');
        const img = document.getElementById('inspectorImg');
        const placeholder = document.getElementById('inspectorPlaceholder');
        const catBadge = document.getElementById('inspectorCatBadge');
        const idBadge = document.getElementById('inspectorIdBadge');
        const modeSwitch = document.getElementById('mediaModeSwitch');
        const districtEl = document.getElementById('inspectorDistrict');
        const titleEl = document.getElementById('inspectorTitle');
        const tagsEl = document.getElementById('inspectorTags');
        const coordsEl = document.getElementById('inspectorCoords');
        const sourceEl = document.getElementById('inspectorSource');
        const rlBox = document.getElementById('inspectorRlBox');
        const rlAddress = document.getElementById('inspectorRlAddress');
        const gmapsLink = document.getElementById('inspectorGmapsLink');
        const btnDeleteCustom = document.getElementById('btnDeleteCustomSpot');

        const meta = CATEGORY_META[spot.category] || CATEGORY_META.landmark;

        card.hidden = false;
        catBadge.textContent = meta.label;
        catBadge.style.color = meta.color;
        catBadge.style.borderColor = meta.color;
        idBadge.textContent = `#${spot.id}`;

        districtEl.textContent = spot.district || 'Vice City, Leonida';
        titleEl.textContent = spot.title;
        coordsEl.textContent = `X: ${spot.lng}, Y: ${spot.lat}`;
        sourceEl.textContent = spot.source || 'Yanis V17 / GTADB';

        const tagsList = [...(spot.tags || [])];
        if (spot.enterable && !tagsList.includes('enterable')) tagsList.unshift('enterable');

        tagsEl.innerHTML = tagsList.map(t => {
            const isEnt = t.toLowerCase() === 'enterable';
            return `<span class="tag-chip ${isEnt ? 'enterable-tag' : ''}">${isEnt ? '🚪 INTERNO ESPLORABILE' : escapeHtml(t)}</span>`;
        }).join('');

        const hasIg = Boolean(spot.igPhoto);
        const hasRl = Boolean(spot.rlPhoto);

        modeSwitch.hidden = !(hasIg && hasRl);
        const setPhotoMode = (mode) => {
            const url = mode === 'rl' ? spot.rlPhoto : (spot.igPhoto || spot.rlPhoto);
            if (url) {
                img.style.display = 'block';
                placeholder.style.display = 'none';
                img.src = url;
                img.onerror = () => {
                    img.style.display = 'none';
                    placeholder.style.display = 'flex';
                };
            } else {
                img.style.display = 'none';
                placeholder.style.display = 'flex';
            }
            modeSwitch.querySelectorAll('.media-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-photo') === mode);
            });
        };

        setPhotoMode(hasIg ? 'ig' : 'rl');

        modeSwitch.querySelectorAll('.media-btn').forEach(btn => {
            btn.onclick = (ev) => {
                ev.stopPropagation();
                setPhotoMode(btn.getAttribute('data-photo'));
            };
        });

        document.getElementById('inspectorMedia').onclick = (ev) => {
            if (ev.target.closest('button')) return;
            const currentSrc = img.style.display !== 'none' ? img.src : null;
            if (currentSrc) {
                openLightbox(spot, currentSrc);
            }
        };

        if (spot.rlAddress || spot.rlCoords) {
            rlBox.hidden = false;
            rlAddress.textContent = spot.rlAddress || 'Coordinate Reali Florida verificate';
            if (spot.rlCoords && spot.rlCoords.length >= 2) {
                gmapsLink.hidden = false;
                gmapsLink.href = `https://www.google.com/maps?q=${spot.rlCoords[0]},${spot.rlCoords[1]}`;
            } else if (spot.rlAddress && spot.rlAddress.includes('FL')) {
                gmapsLink.hidden = false;
                gmapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.rlAddress)}`;
            } else {
                gmapsLink.hidden = true;
            }
        } else {
            rlBox.hidden = true;
        }

        btnDeleteCustom.hidden = spot.category !== 'custom' && !String(spot.id).startsWith('USER_');

        updateInspectorActionButtons();

        document.querySelectorAll('.spot-item').forEach(el => {
            el.classList.toggle('selected', el.getAttribute('data-spot-id') === String(spot.id));
        });
    }

    function closeInspector() {
        document.getElementById('inspectorCard').hidden = true;
        state.selectedSpot = null;
        document.querySelectorAll('.spot-item').forEach(el => el.classList.remove('selected'));
    }

    function updateInspectorActionButtons() {
        if (!state.selectedSpot) return;
        const id = state.selectedSpot.id;
        const btnFav = document.getElementById('btnToggleFavorite');
        const btnFound = document.getElementById('btnToggleFound');

        const isFav = state.favorites.has(id);
        const isFound = state.foundSpots.has(id);

        btnFav.classList.toggle('active-fav', isFav);
        btnFav.querySelector('span').textContent = isFav ? 'Salvato ★' : 'Preferito';

        btnFound.classList.toggle('active-found', isFound);
        btnFound.querySelector('span').textContent = isFound ? 'Trovato ✓' : 'Visitato';
    }

    // =========================================================================
    // 7. LEGEND & REFERENCE PHOTO GALLERY WIDGET + LIGHTBOX
    // =========================================================================
    function renderLegendGallery() {
        const grid = document.getElementById('legendPhotoGrid');
        if (!grid) return;

        const mediaSpots = state.allSpots.filter(s => {
            if (!s.igPhoto) return false;
            if (state.galleryFilter === 'trailer') return s.category === 'trailer';
            if (state.galleryFilter === 'screenshot') return s.category === 'screenshot';
            return s.category === 'trailer' || s.category === 'screenshot';
        });

        grid.innerHTML = mediaSpots.map(spot => `
            <div class="photo-card-item" data-gallery-id="${escapeHtml(spot.id)}">
                <img src="${escapeHtml(spot.igPhoto)}" alt="${escapeHtml(spot.title)}" loading="lazy">
                <div class="photo-card-caption">${escapeHtml(spot.title)} · #${escapeHtml(spot.id)}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.photo-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-gallery-id');
                const spot = state.allSpots.find(s => String(s.id) === String(id));
                if (spot && spot.igPhoto) {
                    openLightbox(spot, spot.igPhoto);
                }
            });
        });
    }

    function openLightbox(spot, imgUrl) {
        state.lightboxSpot = spot;
        const modal = document.getElementById('lightboxModal');
        const img = document.getElementById('lightboxImg');
        const title = document.getElementById('lightboxTitle');
        const sub = document.getElementById('lightboxSub');
        const flyBtn = document.getElementById('btnLightboxFlyTo');

        img.src = imgUrl;
        title.textContent = spot.id ? `${spot.title} (#${spot.id})` : spot.title;
        sub.textContent = `${spot.district || 'Leonida'} · ${spot.source || 'Yanis V17'}`;
        flyBtn.hidden = !spot.lat && !spot.lng;
        modal.hidden = false;
    }

    function closeLightbox() {
        document.getElementById('lightboxModal').hidden = true;
        state.lightboxSpot = null;
    }

    // =========================================================================
    // 8. DISTRICT NEON LABELS, GRID & ROCKSTAR OVERLAYS
    // =========================================================================
    function initDistrictLabels() {
        state.districtLabelsLayer = L.layerGroup();

        TELEPORT_REGIONS.forEach(reg => {
            const labelMarker = L.marker([reg.lat, reg.lng], {
                interactive: false,
                icon: L.divIcon({
                    className: '',
                    html: `
                        <div class="vc-district-label">
                            <span class="d-title">${escapeHtml(reg.name.split('&')[0].trim())}</span>
                            <span class="d-sub">${escapeHtml(reg.sub)}</span>
                        </div>
                    `,
                    iconSize: [0, 0]
                })
            });
            state.districtLabelsLayer.addLayer(labelMarker);
        });

        state.districtLabelsLayer.addTo(state.map);
    }

    function initTacticalGrid() {
        state.gridLayer = L.layerGroup();
        const style = { color: 'rgba(255, 107, 43, 0.18)', weight: 1, dashArray: '4, 6', interactive: false };

        for (let lat = -8000; lat <= 10000; lat += 2000) {
            state.gridLayer.addLayer(L.polyline([[lat, -9650], [lat, 4000]], style));
        }
        for (let lng = -9000; lng <= 4000; lng += 2000) {
            state.gridLayer.addLayer(L.polyline([[-9000, lng], [10750, lng]], style));
        }
    }

    function toggleRockstarOverlay(key, enabled) {
        const configs = {
            vc2002: {
                url: `${BASE_CDN}assets/maps/gtavc.png`,
                bounds: [[-1185, -1185], [1185, 1185]]
            },
            gtav: {
                url: `${BASE_CDN}assets/maps/GTAV.svg`,
                bounds: [[-3600.698, -5000], [7679.719, 5000]]
            },
            gtaiv: {
                url: `${BASE_CDN}assets/maps/GTAIV.svg`,
                bounds: [[-2500, -5000], [3500, 5000]]
            }
        };

        if (!enabled) {
            if (state.rockstarOverlays[key]) {
                state.map.removeLayer(state.rockstarOverlays[key]);
            }
            return;
        }

        const cfg = configs[key];
        if (!cfg) return;

        if (!state.rockstarOverlays[key]) {
            state.rockstarOverlays[key] = L.imageOverlay(cfg.url, cfg.bounds, {
                opacity: 0.68,
                interactive: false
            });
        }
        state.rockstarOverlays[key].addTo(state.map);
        showToast('Sovrapposizione in scala 1:1 attivata!');
    }

    // =========================================================================
    // 9. INTERACTIVE TOOLS: PIN DROP CREATOR, RULER & CLICK-OUTSIDE TO DISMISS
    // =========================================================================
    function closeAllTransientWidgets() {
        // Close Left Drawer
        const leftDrawer = document.getElementById('leftDrawer');
        if (leftDrawer && !leftDrawer.classList.contains('collapsed')) {
            leftDrawer.classList.add('collapsed');
            document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
        }
        // Close Legend Widget
        const legendWidget = document.getElementById('legendAtlasWidget');
        if (legendWidget && !legendWidget.hidden) {
            legendWidget.hidden = true;
            document.getElementById('btnToggleLegendWidget').classList.remove('active');
        }
        // Close Filter Popout
        const filterPopout = document.getElementById('filterPopoutWidget');
        if (filterPopout && filterPopout.classList.contains('open')) {
            filterPopout.classList.remove('open');
            const btnFiltri = document.getElementById('btnToggleFiltersPopup');
            if (btnFiltri) {
                btnFiltri.classList.remove('active');
                btnFiltri.setAttribute('aria-expanded', 'false');
            }
            const btnMobFilter = document.getElementById('btnMobileFilterOrb');
            if (btnMobFilter) btnMobFilter.classList.remove('active');
        }
        // Close Mobile Search / Explore Widget
        const rightMainCol = document.querySelector('.right-main-column');
        if (rightMainCol && rightMainCol.classList.contains('mobile-search-open')) {
            rightMainCol.classList.remove('mobile-search-open');
            const btnMobSearch = document.getElementById('btnMobileSearchOrb');
            if (btnMobSearch) btnMobSearch.classList.remove('active');
        }
        // Close Spot Inspector Card
        const inspectorCard = document.getElementById('inspectorCard');
        if (inspectorCard && !inspectorCard.hidden) {
            closeInspector();
        }
    }

    function onMapClick(e) {
        const lat = Math.round(e.latlng.lat * 10) / 10;
        const lng = Math.round(e.latlng.lng * 10) / 10;

        if (state.isPinDropping) {
            state.pendingPinCoords = { lat, lng };
            stopPinDropMode();

            openDrawerTab('myspots');
            const form = document.getElementById('spotCreatorForm');
            const badge = document.getElementById('creatorCoordBadge');
            form.hidden = false;
            badge.textContent = `X: ${lng}, Y: ${lat}`;
            document.getElementById('customSpotTitle').focus();
            return;
        }

        if (state.isMeasuring) {
            addMeasurePoint(e.latlng);
            return;
        }

        // Clicking on empty map canvas automatically closes any open transient widget!
        closeAllTransientWidgets();
    }

    function startPinDropMode() {
        state.isPinDropping = true;
        state.isMeasuring = false;
        document.getElementById('map').classList.add('pin-drop-cursor');
        document.getElementById('pinDropBanner').hidden = false;
    }

    function stopPinDropMode() {
        state.isPinDropping = false;
        document.getElementById('map').classList.remove('pin-drop-cursor');
        document.getElementById('pinDropBanner').hidden = true;
    }

    function toggleMeasureMode() {
        state.isMeasuring = !state.isMeasuring;
        const btn = document.getElementById('btnMeasureTool');
        const banner = document.getElementById('measureBanner');
        const mapEl = document.getElementById('map');

        btn.classList.toggle('active', state.isMeasuring);
        banner.hidden = !state.isMeasuring;
        mapEl.classList.toggle('measure-cursor', state.isMeasuring);

        if (!state.isMeasuring) {
            clearMeasurePoints();
        } else {
            stopPinDropMode();
            showToast('Righello attivo: clicca due o più punti sulla mappa');
        }
    }

    function addMeasurePoint(latlng) {
        if (!state.measureLayer) {
            state.measureLayer = L.layerGroup().addTo(state.map);
        }
        state.measurePoints.push(latlng);

        L.circleMarker(latlng, {
            radius: 6,
            color: '#FF6B2B',
            fillColor: '#FF2A85',
            fillOpacity: 1,
            weight: 2
        }).addTo(state.measureLayer);

        if (state.measurePoints.length > 1) {
            L.polyline(state.measurePoints, {
                color: '#FF6B2B',
                weight: 3,
                dashArray: '6, 6'
            }).addTo(state.measureLayer);

            let totalMeters = 0;
            for (let i = 1; i < state.measurePoints.length; i++) {
                const p1 = state.measurePoints[i - 1];
                const p2 = state.measurePoints[i];
                totalMeters += Math.hypot(p2.lng - p1.lng, p2.lat - p1.lat);
            }

            const km = (totalMeters / 1000).toFixed(2);
            const miles = (totalMeters / 1609.34).toFixed(2);
            const driveTimeMin = Math.max(1, Math.round((totalMeters / 1000) / 1.8));
            document.getElementById('measureStats').textContent = `${km} km (${miles} mi) · ~${driveTimeMin} min in auto`;
        }
    }

    function clearMeasurePoints() {
        state.measurePoints = [];
        if (state.measureLayer) state.measureLayer.clearLayers();
        const stats = document.getElementById('measureStats');
        if (stats) stats.textContent = 'Clicca due o più punti sulla mappa...';
    }

    // =========================================================================
    // 10. UI BINDINGS & COUNTERS
    // =========================================================================
    function updateCategoryCounts() {
        const counts = {};
        for (const spot of state.allSpots) {
            counts[spot.category] = (counts[spot.category] || 0) + 1;
        }

        const totalEl = document.getElementById('count-all');
        if (totalEl) totalEl.textContent = state.allSpots.length;

        Object.keys(CATEGORY_META).forEach(cat => {
            const el = document.getElementById(`count-${cat}`);
            if (el) el.textContent = counts[cat] || 0;
        });
    }

    function updateFoundCounter() {
        const el = document.getElementById('foundProgressText');
        if (el) el.textContent = `${state.foundSpots.size} / ${state.allSpots.length}`;

        document.getElementById('tabCountCustom').textContent = state.customSpots.length;
        document.getElementById('tabCountFav').textContent = state.favorites.size;
        document.getElementById('tabCountFound').textContent = state.foundSpots.size;
    }

    function renderTeleportGrid() {
        const grid = document.getElementById('regionGrid');
        if (!grid) return;

        grid.innerHTML = TELEPORT_REGIONS.map(r => `
            <div class="region-card" data-region-id="${r.id}">
                <div class="region-card-left">
                    <span class="region-emoji">${r.emoji}</span>
                    <div class="region-card-info">
                        <strong>${escapeHtml(r.name)}</strong>
                        <span>${escapeHtml(r.sub)}</span>
                    </div>
                </div>
                <span class="region-go-badge">VOLA →</span>
            </div>
        `).join('');

        grid.querySelectorAll('.region-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-region-id');
                const reg = TELEPORT_REGIONS.find(r => r.id === id);
                if (reg && state.map) {
                    state.map.flyTo([reg.lat, reg.lng], reg.zoom, { duration: 0.85 });
                    showToast(`Teletrasporto: ${reg.name}`);
                    if (window.innerWidth <= 860) {
                        document.getElementById('leftDrawer').classList.add('collapsed');
                        document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
                    }
                }
            });
        });
    }

    function renderUserSavedList() {
        const container = document.getElementById('userSpotsList');
        if (!container) return;

        let list = [];
        if (state.savedTab === 'custom') {
            list = state.customSpots;
        } else if (state.savedTab === 'favorites') {
            list = state.allSpots.filter(s => state.favorites.has(s.id));
        } else if (state.savedTab === 'found') {
            list = state.allSpots.filter(s => state.foundSpots.has(s.id));
        }

        if (list.length === 0) {
            const msg = state.savedTab === 'custom'
                ? 'Non hai ancora creato spot personali. Clicca il pallino "+ Spot" o "Piazza Nuovo Spot"!'
                : state.savedTab === 'favorites'
                ? 'Nessuno spot nei Preferiti. Clicca la stella ★ nella scheda di uno spot.'
                : 'Nessuno spot segnato come visitato.';
            container.innerHTML = `<div style="text-align:center;padding:24px 10px;color:var(--text-muted);font-size:12px;">${msg}</div>`;
            return;
        }

        container.innerHTML = list.map(spot => {
            const meta = CATEGORY_META[spot.category] || CATEGORY_META.custom;
            const isFav = state.favorites.has(spot.id);
            const isFound = state.foundSpots.has(spot.id);
            return `
                <div class="spot-item" data-user-spot="${escapeHtml(spot.id)}">
                    <div class="spot-item-icon" style="--spot-c: ${meta.color}">${meta.emoji}</div>
                    <div class="spot-item-main">
                        <div class="spot-item-title">${escapeHtml(spot.title)}</div>
                        <div class="spot-item-sub">${escapeHtml(spot.district || 'Leonida')} · X:${spot.lng} Y:${spot.lat}</div>
                    </div>
                    <div class="spot-item-badges">
                        ${isFav ? '<span class="mini-badge badge-fav">★</span>' : ''}
                        ${isFound ? '<span class="mini-badge badge-found">✓</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.spot-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-user-spot');
                const spot = state.allSpots.find(s => String(s.id) === String(id));
                if (spot) selectSpot(spot, { pan: true, zoom: 6 });
            });
        });
    }

    function openDrawerTab(tabName) {
        document.getElementById('legendAtlasWidget').hidden = true;
        document.getElementById('btnToggleLegendWidget').classList.remove('active');
        if (window.innerWidth <= 860) {
            document.getElementById('filterPopoutWidget').classList.remove('open');
            document.getElementById('btnMobileFilterOrb')?.classList.remove('active');
            document.querySelector('.right-main-column')?.classList.remove('mobile-search-open');
            document.getElementById('btnMobileSearchOrb')?.classList.remove('active');
        }

        const drawer = document.getElementById('leftDrawer');
        drawer.classList.remove('collapsed');

        document.querySelectorAll('.dock-btn[data-drawer]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-drawer') === tabName);
        });

        document.querySelectorAll('.drawer-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `pane-${tabName}`);
        });

        if (tabName === 'myspots') renderUserSavedList();
    }

    function bindUIEvents() {
        // Brand Capsule click -> fly to Vice City
        document.getElementById('brandCapsule').addEventListener('click', () => {
            state.map.flyTo([650, -500], Math.max(computeExactFitVerticalZoom() + 1.2, 3.0), { duration: 0.85 });
        });

        // Top-Left Orange Orb -> Toggle Legend & Reference Photos Widget
        const btnLegendOrb = document.getElementById('btnToggleLegendWidget');
        const legendWidget = document.getElementById('legendAtlasWidget');
        btnLegendOrb.addEventListener('click', () => {
            const willOpen = legendWidget.hidden;
            if (willOpen) {
                document.getElementById('leftDrawer').classList.add('collapsed');
                document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
                if (window.innerWidth <= 860) {
                    document.getElementById('filterPopoutWidget').classList.remove('open');
                    document.getElementById('btnMobileFilterOrb')?.classList.remove('active');
                    document.querySelector('.right-main-column')?.classList.remove('mobile-search-open');
                    document.getElementById('btnMobileSearchOrb')?.classList.remove('active');
                }
                renderLegendGallery();
            }
            legendWidget.hidden = !willOpen;
            btnLegendOrb.classList.toggle('active', willOpen);
        });

        document.getElementById('btnCloseLegendWidget').addEventListener('click', () => {
            legendWidget.hidden = true;
            btnLegendOrb.classList.remove('active');
        });

        // Open full original Yanis V17 Legend Sheet in Lightbox
        document.getElementById('btnOpenOriginalLegendSheet').addEventListener('click', () => {
            openLightbox({
                title: 'Tavola Legenda Originale Yanis V17',
                district: 'Features, Terrain, Buildings & Labels',
                source: 'Yanis GTA VI Community Map'
            }, 'assets/legend/yanis-legend-day.png');
        });

        // Explicit X close buttons on all Left Drawer panes
        document.querySelectorAll('.js-close-left-drawer').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('leftDrawer').classList.add('collapsed');
                document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
            });
        });

        // Legend Widget Sub-Tabs
        document.querySelectorAll('.legend-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.legend-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-ltab');
                document.querySelectorAll('.legend-tab-pane').forEach(p => {
                    p.classList.toggle('active', p.id === `ltab-${target}`);
                });
                if (target === 'gallery') renderLegendGallery();
            });
        });

        document.querySelectorAll('.g-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.g-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.galleryFilter = pill.getAttribute('data-gfilter');
                renderLegendGallery();
            });
        });

        // Lightbox Events
        document.getElementById('btnCloseLightbox').addEventListener('click', closeLightbox);
        document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
        document.getElementById('btnLightboxFlyTo').addEventListener('click', () => {
            if (state.lightboxSpot && (state.lightboxSpot.lat || state.lightboxSpot.lng)) {
                const spot = state.lightboxSpot;
                closeLightbox();
                document.getElementById('legendAtlasWidget').hidden = true;
                document.getElementById('btnToggleLegendWidget').classList.remove('active');
                selectSpot(spot, { pan: true, zoom: 6 });
            }
        });

        // Right "Filtri" Toggle Button (PC) & Mobile Filter Orb (#btnMobileFilterOrb) & Explicit X Close Button
        const btnFiltri = document.getElementById('btnToggleFiltersPopup');
        const btnMobileFilterOrb = document.getElementById('btnMobileFilterOrb');
        const filterPopout = document.getElementById('filterPopoutWidget');

        const toggleFiltersWidget = () => {
            const isOpen = filterPopout.classList.toggle('open');
            if (btnFiltri) {
                btnFiltri.classList.toggle('active', isOpen);
                btnFiltri.setAttribute('aria-expanded', String(isOpen));
            }
            if (btnMobileFilterOrb) {
                btnMobileFilterOrb.classList.toggle('active', isOpen);
            }
            if (isOpen && window.innerWidth <= 860) {
                // Close other open mobile drawers so they don't stack
                document.getElementById('leftDrawer').classList.add('collapsed');
                document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
                document.getElementById('legendAtlasWidget').hidden = true;
                document.getElementById('btnToggleLegendWidget').classList.remove('active');
                const rightMainCol = document.querySelector('.right-main-column');
                if (rightMainCol) rightMainCol.classList.remove('mobile-search-open');
                const btnMobSearch = document.getElementById('btnMobileSearchOrb');
                if (btnMobSearch) btnMobSearch.classList.remove('active');
            }
        };

        btnFiltri.addEventListener('click', toggleFiltersWidget);
        if (btnMobileFilterOrb) {
            btnMobileFilterOrb.addEventListener('click', toggleFiltersWidget);
        }

        document.getElementById('btnCloseFilterPopout').addEventListener('click', () => {
            filterPopout.classList.remove('open');
            btnFiltri.classList.remove('active');
            btnFiltri.setAttribute('aria-expanded', 'false');
            if (btnMobileFilterOrb) btnMobileFilterOrb.classList.remove('active');
        });

        // Mobile Search / Explore Orb (#btnMobileSearchOrb) & Mobile Close Button (#btnCloseMobileExplore)
        const btnMobileSearchOrb = document.getElementById('btnMobileSearchOrb');
        const btnCloseMobileExplore = document.getElementById('btnCloseMobileExplore');
        const rightMainColumn = document.querySelector('.right-main-column');

        if (btnMobileSearchOrb && rightMainColumn) {
            btnMobileSearchOrb.addEventListener('click', () => {
                const isOpen = rightMainColumn.classList.toggle('mobile-search-open');
                btnMobileSearchOrb.classList.toggle('active', isOpen);
                if (isOpen) {
                    // Close other open mobile drawers
                    filterPopout.classList.remove('open');
                    if (btnMobileFilterOrb) btnMobileFilterOrb.classList.remove('active');
                    document.getElementById('leftDrawer').classList.add('collapsed');
                    document.querySelectorAll('.dock-btn[data-drawer]').forEach(b => b.classList.remove('active'));
                    document.getElementById('legendAtlasWidget').hidden = true;
                    document.getElementById('btnToggleLegendWidget').classList.remove('active');
                }
            });
        }

        if (btnCloseMobileExplore && rightMainColumn) {
            btnCloseMobileExplore.addEventListener('click', () => {
                rightMainColumn.classList.remove('mobile-search-open');
                if (btnMobileSearchOrb) btnMobileSearchOrb.classList.remove('active');
            });
        }

        // Prevent iOS Safari pinch-zoom and double-tap zoom on all HUD controls & buttons
        document.querySelectorAll('.hud-top-left, .hud-left, .hud-right-center, .hud-bottom-right, .lightbox-modal, .pindrop-banner').forEach(hudEl => {
            hudEl.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
            hudEl.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
            hudEl.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
        });

        // Pop-out Filter Chips
        document.querySelectorAll('.v-filter-chip[data-cat]').forEach(chip => {
            chip.addEventListener('click', () => {
                const cat = chip.getAttribute('data-cat');
                if (cat === 'all') {
                    const allActive = state.activeCategories.size === Object.keys(CATEGORY_META).length;
                    if (allActive) {
                        state.activeCategories.clear();
                    } else {
                        Object.keys(CATEGORY_META).forEach(k => state.activeCategories.add(k));
                    }
                    syncCategoryFilterUI();
                    refreshVisibleMarkers();
                    return;
                }

                if (state.activeCategories.has(cat)) {
                    state.activeCategories.delete(cat);
                } else {
                    state.activeCategories.add(cat);
                }
                syncCategoryFilterUI();
                refreshVisibleMarkers();
            });
        });

        // Bottom Dock-Style 3 Symbol Buttons Under Esplora Spot (Con Foto, Preferiti, Trovati)
        document.querySelectorAll('.dock-symbol-btn[data-subfilter]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSub = btn.getAttribute('data-subfilter');
                if (state.subFilter === targetSub) {
                    state.subFilter = 'all';
                } else {
                    state.subFilter = targetSub;
                }
                document.querySelectorAll('.dock-symbol-btn[data-subfilter]').forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-subfilter') === state.subFilter);
                });
                refreshVisibleMarkers();
            });
        });

        // Add Spot Circular Orb Button (Left Dock) & Drawer Button
        document.getElementById('btnAddSpotMode').addEventListener('click', startPinDropMode);
        document.getElementById('btnStartPinDrop').addEventListener('click', startPinDropMode);
        document.getElementById('btnCancelPinDropBanner').addEventListener('click', stopPinDropMode);

        // Left Dock Buttons
        document.querySelectorAll('.dock-btn[data-drawer]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-drawer');
                const drawer = document.getElementById('leftDrawer');
                const isAlreadyActive = btn.classList.contains('active') && !drawer.classList.contains('collapsed');
                if (isAlreadyActive) {
                    drawer.classList.add('collapsed');
                    btn.classList.remove('active');
                } else {
                    openDrawerTab(target);
                }
            });
        });

        // Search Input in Right Esplora Spot Widget
        const searchInput = document.getElementById('spotSearchInput');
        const clearBtn = document.getElementById('btnClearSearch');
        searchInput.addEventListener('input', () => {
            state.searchQuery = searchInput.value.trim();
            clearBtn.hidden = !state.searchQuery;
            refreshVisibleMarkers();
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            state.searchQuery = '';
            clearBtn.hidden = true;
            refreshVisibleMarkers();
        });

        // Yanis Clean Map Style Cards (Dark vs Day)
        document.querySelectorAll('.theme-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                state.currentMapStyle = card.getAttribute('data-map-style');
                updateBaseTileLayer();
                showToast(`Tema mappa: ${card.querySelector('strong').textContent}`);
            });
        });

        // Rockstar Comparison Overlays
        document.getElementById('toggleOverlayVC2002').addEventListener('change', (e) => toggleRockstarOverlay('vc2002', e.target.checked));
        document.getElementById('toggleOverlayGTAV').addEventListener('change', (e) => toggleRockstarOverlay('gtav', e.target.checked));
        document.getElementById('toggleOverlayGTAIV').addEventListener('change', (e) => toggleRockstarOverlay('gtaiv', e.target.checked));

        // Radar Visual Toggles
        document.getElementById('toggleDistrictLabels').addEventListener('change', (e) => {
            if (e.target.checked) {
                state.districtLabelsLayer.addTo(state.map);
            } else {
                state.map.removeLayer(state.districtLabelsLayer);
            }
        });

        document.getElementById('toggleCoordinateGrid').addEventListener('change', (e) => {
            if (e.target.checked) {
                state.gridLayer.addTo(state.map);
            } else {
                state.map.removeLayer(state.gridLayer);
            }
        });

        // Measure Tool
        document.getElementById('btnMeasureTool').addEventListener('click', toggleMeasureMode);
        document.getElementById('btnClearMeasure').addEventListener('click', clearMeasurePoints);
        document.getElementById('btnExitMeasure').addEventListener('click', toggleMeasureMode);

        // Random Iconic Spot ("Surprise Me")
        document.getElementById('btnSurpriseMe').addEventListener('click', () => {
            const richSpots = state.allSpots.filter(s => s.igPhoto && !s.title.startsWith('Edificio'));
            const pool = richSpots.length > 0 ? richSpots : state.allSpots;
            const randomSpot = pool[Math.floor(Math.random() * pool.length)];
            if (randomSpot) {
                selectSpot(randomSpot, { pan: true, zoom: 6 });
                showToast(`Spot Casuale: ${randomSpot.title}`);
            }
        });

        // Inspector Actions
        document.getElementById('btnCloseInspector').addEventListener('click', closeInspector);

        document.getElementById('btnCopyCoords').addEventListener('click', () => {
            if (!state.selectedSpot) return;
            const text = `${state.selectedSpot.lng}, ${state.selectedSpot.lat}`;
            navigator.clipboard?.writeText(text);
            showToast(`Coordinate copiate: ${text}`);
        });

        document.getElementById('btnToggleFavorite').addEventListener('click', () => {
            if (!state.selectedSpot) return;
            const id = state.selectedSpot.id;
            if (state.favorites.has(id)) {
                state.favorites.delete(id);
                showToast('Rimosso dai Preferiti');
            } else {
                state.favorites.add(id);
                showToast('Aggiunto ai Preferiti ★');
            }
            localStorage.setItem('vc_atlas_favorites', JSON.stringify([...state.favorites]));
            updateInspectorActionButtons();
            refreshSpotMarkerAppearance(state.selectedSpot);
            updateFoundCounter();
            renderUserSavedList();
        });

        document.getElementById('btnToggleFound').addEventListener('click', () => {
            if (!state.selectedSpot) return;
            const id = state.selectedSpot.id;
            if (state.foundSpots.has(id)) {
                state.foundSpots.delete(id);
            } else {
                state.foundSpots.add(id);
                showToast('Spot segnato come Visitato ✓');
            }
            localStorage.setItem('vc_atlas_found', JSON.stringify([...state.foundSpots]));
            updateInspectorActionButtons();
            refreshSpotMarkerAppearance(state.selectedSpot);
            updateFoundCounter();
            renderUserSavedList();
        });

        document.getElementById('btnCenterSpot').addEventListener('click', () => {
            if (!state.selectedSpot) return;
            state.map.flyTo([state.selectedSpot.lat, state.selectedSpot.lng], 7, { duration: 0.65 });
        });

        document.getElementById('btnDeleteCustomSpot').addEventListener('click', () => {
            if (!state.selectedSpot) return;
            const id = state.selectedSpot.id;
            state.customSpots = state.customSpots.filter(s => s.id !== id);
            state.allSpots = state.allSpots.filter(s => s.id !== id);
            state.markerMap.delete(id);
            localStorage.setItem('vc_atlas_custom_spots', JSON.stringify(state.customSpots));

            closeInspector();
            updateCategoryCounts();
            updateFoundCounter();
            refreshVisibleMarkers();
            renderUserSavedList();
            showToast('Spot personalizzato eliminato');
        });

        // Custom Spot Creator Form
        document.getElementById('btnCancelCustomSpot').addEventListener('click', () => {
            document.getElementById('spotCreatorForm').hidden = true;
        });

        document.getElementById('spotCreatorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const coords = state.pendingPinCoords || {
                lat: Math.round(state.map.getCenter().lat * 10) / 10,
                lng: Math.round(state.map.getCenter().lng * 10) / 10
            };

            const newSpot = {
                id: `USER_${Date.now().toString().slice(-5)}`,
                title: document.getElementById('customSpotTitle').value.trim(),
                category: document.getElementById('customSpotCategory').value || 'custom',
                district: document.getElementById('customSpotDistrict').value.trim() || 'Vice City Custom',
                lat: coords.lat,
                lng: coords.lng,
                tags: ['custom', 'community'],
                enterable: document.getElementById('customSpotCategory').value === 'enterable',
                rlAddress: document.getElementById('customSpotDesc').value.trim() || 'Spot creato dall\'utente',
                igPhoto: document.getElementById('customSpotImage').value.trim() || null,
                rlPhoto: null,
                source: 'Creazione Utente'
            };

            state.customSpots.unshift(newSpot);
            state.allSpots.unshift(newSpot);
            localStorage.setItem('vc_atlas_custom_spots', JSON.stringify(state.customSpots));

            const marker = createSpotMarker(newSpot);
            state.markerMap.set(newSpot.id, marker);

            e.target.reset();
            document.getElementById('spotCreatorForm').hidden = true;

            updateCategoryCounts();
            updateFoundCounter();
            refreshVisibleMarkers();
            renderUserSavedList();
            selectSpot(newSpot, { pan: true, zoom: 6 });
            showToast('Nuovo Spot salvato sulla mappa!');
        });

        // Saved Tabs
        document.querySelectorAll('.saved-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.saved-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                state.savedTab = tab.getAttribute('data-savedtab');
                renderUserSavedList();
            });
        });

        // Export / Import JSON
        document.getElementById('btnExportSpots').addEventListener('click', () => {
            const payload = {
                app: 'Vice City Atlas Yanis17',
                exportedAt: new Date().toISOString(),
                customSpots: state.customSpots,
                favorites: [...state.favorites],
                foundSpots: [...state.foundSpots]
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'vice-city-atlas-spots.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('File JSON esportato con successo!');
        });

        document.getElementById('inputImportSpots').addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (Array.isArray(data.customSpots)) {
                        state.customSpots = data.customSpots;
                        localStorage.setItem('vc_atlas_custom_spots', JSON.stringify(state.customSpots));
                    }
                    if (Array.isArray(data.favorites)) {
                        state.favorites = new Set(data.favorites);
                        localStorage.setItem('vc_atlas_favorites', JSON.stringify([...state.favorites]));
                    }
                    if (Array.isArray(data.foundSpots)) {
                        state.foundSpots = new Set(data.foundSpots);
                        localStorage.setItem('vc_atlas_found', JSON.stringify([...state.foundSpots]));
                    }
                    const baseSpots = Array.isArray(window.VICE_ATLAS_SPOTS) ? window.VICE_ATLAS_SPOTS : [];
                    state.allSpots = [...state.customSpots, ...baseSpots];
                    buildAllMarkers();
                    updateCategoryCounts();
                    updateFoundCounter();
                    refreshVisibleMarkers();
                    renderUserSavedList();
                    showToast('Spot importati con successo!');
                } catch (err) {
                    showToast('Errore nel formato del file JSON');
                }
            };
            reader.readAsText(file);
        });

        // Zoom Dock Controls
        document.getElementById('btnZoomIn').addEventListener('click', () => {
            const target = Math.min(YANIS_CONFIG.maxZoom, state.map.getZoom() + 0.75);
            state.map.setZoom(target);
        });
        document.getElementById('btnZoomOut').addEventListener('click', () => {
            const minZ = computeExactFitVerticalZoom();
            const target = Math.max(minZ, state.map.getZoom() - 0.75);
            state.map.setZoom(target);
        });
        document.getElementById('btnResetView').addEventListener('click', () => {
            const minZ = computeExactFitVerticalZoom();
            if (window.innerWidth <= 860) {
                state.map.flyTo([-1400, -2400], minZ, { duration: 0.75 });
            } else {
                state.map.flyTo([875, -2400], minZ, { duration: 0.75 });
            }
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                stopPinDropMode();
                closeLightbox();
                if (state.isMeasuring) toggleMeasureMode();
                closeAllTransientWidgets();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                document.getElementById('spotSearchInput').focus();
            }
        });
    }

    function syncCategoryFilterUI() {
        document.querySelectorAll('.v-filter-chip[data-cat]').forEach(chip => {
            const cat = chip.getAttribute('data-cat');
            if (cat === 'all') {
                chip.classList.toggle('active', state.activeCategories.size === Object.keys(CATEGORY_META).length);
            } else {
                chip.classList.toggle('active', state.activeCategories.has(cat));
            }
        });
    }

    // =========================================================================
    // 11. HELPERS
    // =========================================================================
    let toastTimeout = null;
    function showToast(msg) {
        const toast = document.getElementById('toastNotification');
        const text = document.getElementById('toastMessage');
        if (!toast || !text) return;
        text.textContent = msg;
        toast.hidden = false;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.hidden = true;
        }, 2800);
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // =========================================================================
    // BOOTSTRAP
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        if (window.lucide) window.lucide.createIcons();
        initMap();
        renderTeleportGrid();
        bindUIEvents();
    });
})();

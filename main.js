/*********************************
 * 4.1. Importación de los módulos principales
 *********************************/

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/renderers/UniqueValueRenderer",
    "esri/widgets/LayerList",
    "esri/widgets/Sketch",
    "esri/layers/GraphicsLayer",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
], function (
    Map,
    MapView,
    FeatureLayer,
    UniqueValueRenderer,
    LayerList,
    Sketch,
    GraphicsLayer,
    BasemapGallery,
    Expand,
) {
    /*********************************
     * 4.2. MAPA Y VISTA
     *********************************/
    const map = new Map({ basemap: "gray-vector" });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [-3.7, 40.4],
        zoom: 5,
    });

    /*********************************
     * 4.3. CAPA RED NATURA 2000
     *********************************/
    const naturaRenderer = new UniqueValueRenderer({
        field: "TIPO_NUEVO",
        uniqueValueInfos: [
            {
                value: "LIC",
                symbol: {
                    type: "simple-fill",
                    color: "#cbf3f0",
                    outline: { color: "#333", width: 1 },
                },
            },
            {
                value: "ZEPA",
                symbol: {
                    type: "simple-fill",
                    color: "#ffbf69",
                    outline: { color: "#333", width: 1 },
                },
            },
        ],
    });

    const redNaturaLayer = new FeatureLayer({
        url: "https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/Red_Natura_2000/FeatureServer/0",
        renderer: naturaRenderer,
        opacity: 0.8,
        outFields: ["*"],
        title: "Red Natura 2000",
    });
    map.add(redNaturaLayer);

    /*********************************
     * 4.4. CAPA PLAYAS
     *********************************/
    const playasLayer = new FeatureLayer({
        url: "https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/Playas_2015/FeatureServer/0",
        title: "Playas 2015",
        outFields: ["*"],
        popupTemplate: {
            title: "{Nombre}",
            content: [{
                type: "fields",
                fieldInfos: [
                    { fieldName: "Comunidad_", label: "Comunidad Autónoma" },
                    { fieldName: "Provincia", label: "Provincia" },
                    { fieldName: "Descripci", label: "Descripción" },
                    { fieldName: "Longitud", label: "Longitud" },
                    { fieldName: "Anchura", label: "Anchura" },
                    { fieldName: "Condicione", label: "Condiciones" },
                    { fieldName: "Submarinis", label: "Submarinismo" }
                ]
            }]
        }
    });
    map.add(playasLayer);

    // Renderer submarinismo
    playasLayer.when(() => {
        playasLayer.queryFeatures({ where: "1=1", outFields: ["submarinis"], returnGeometry: false })
            .then(() => {
                playasLayer.renderer = {
                    type: "unique-value",
                    field: "submarinis",
                    uniqueValueInfos: [
                        { value: "Sí", symbol: { type: "picture-marker", url: "https://cdn-icons-png.flaticon.com/128/4864/4864355.png", width: "30px", height: "30px" }, label: "Zona con Submarinismo" },
                        { value: "No", symbol: { type: "simple-marker", style: "circle", color: "#0077b6", size: "8px", outline: { color: "white", width: 1 } }, label: "Zona sin Submarinismo" }
                    ]
                };

                playasLayer.featureEffect = {
                    filter: { where: "submarinis = 'Sí'" },
                    includedEffect: "bloom(0.1, 0.2px, 0.0)",
                    excludedEffect: "bloom(2, 0.5px, 0.0)"
                };
            });
    });

    /*********************************
     * 4.5 WIDGETS
     *********************************/
    const layerList = new LayerList({ view });
    view.ui.add(layerList, "bottom-left");

    const sketchLayer = new GraphicsLayer({ title: "Zona de Estudio" });
    map.add(sketchLayer);

    const sketch = new Sketch({ layer: sketchLayer, view });
    view.ui.add(sketch, "top-right");

    const basemapGallery = new BasemapGallery({ view });
    const bgExpand = new Expand({
        view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap"
    });
    view.ui.add(bgExpand, "top-left");
    
    /*********************************
     * 4.6. RESALTADO DINÁMICO DE INTERSECCIÓN
     *********************************/
    function applyRedNaturaEffect(geometry) {
        if (!geometry) return;

        redNaturaLayer.featureEffect = {
            filter: {
                geometry: geometry,
                spatialRelationship: "intersects"
            },
            includedEffect: "brightness(180%) saturate(150%) drop-shadow(0 0 10px #ff0000)",
            excludedEffect: "grayscale(30%) opacity(40%)"
        };
    }

    function clearRedNaturaEffect() {
        redNaturaLayer.featureEffect = null;
    }

    // Eventos del Sketch
    sketch.on("create", event => {
        if (event.state === "complete" && event.graphic?.geometry) {
            applyRedNaturaEffect(event.graphic.geometry);
        }
    });

    sketch.on("update", event => {
        if (event.state === "complete" && event.graphics?.length > 0) {
            applyRedNaturaEffect(event.graphics[0].geometry);
        }
    });

    sketch.on("delete", () => clearRedNaturaEffect());
    sketch.on("cancel", () => clearRedNaturaEffect());

});


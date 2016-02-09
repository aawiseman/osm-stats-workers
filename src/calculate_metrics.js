// This module calculates all the metrics for a given changeset

// require metric functions
var country = require('./metrics/country');
var roadCount = require('./metrics/road_count');
var roadCountMod = require('./metrics/road_count_mod');
var buildingCount = require('./metrics/building_count');
var buildingCountMod = require('./metrics/building_count_mod');
var waterwayCount = require('./metrics/river_count');
var poiCount = require('./metrics/poi_count');
var roadLength = require('./metrics/road_length');
var roadLengthMod = require('./metrics/road_length_mod');
var waterwayLength = require('./metrics/river_length');
var extentBuffer = require('./metrics/geo_extent_buffer');

module.exports = function (changeset, precision) {
  changeset.elements = changeset.elements.filter(function(element) {
    return ((element.type !== 'relation') && element.tags &&
        ((element.type == 'way') && 
          (element.tags.hasOwnProperty('waterway') ||
          element.tags.hasOwnProperty('highway') ||
          element.tags.hasOwnProperty('building'))) ||
        ((element.type == 'node') &&
          element.tags.hasOwnProperty('amenity'))
    );
  });

  if (changeset.elements.length > 0) {
    var metadata = changeset.metadata;
    var buf = extentBuffer(500)(changeset);
    return {
      id: +metadata.id,
      hashtags: metadata.comment.split(' '),
      countries: country(buf),
      user: {
        id: +metadata.uid,
        name: metadata.user,
        avatar: '?', // todo: add avatar lookup
        geo_extent: buf
      },
      metrics: {
        road_count: roadCount(changeset),
        road_count_mod: roadCountMod(changeset),
        building_count: buildingCount(changeset),
        building_count_mod: buildingCountMod(changeset),
        waterway_count: waterwayCount(changeset),
        poi_count: poiCount(changeset),
        road_km: roadLength(changeset),
        road_km_mod: roadLengthMod(changeset),
        waterway_km: waterwayLength(changeset)
        // todo: add GPS trace lookup; placeholder functions return 0
      },
      editor: metadata.created_by,
      created_at: metadata.created_at
    };
  } else {
    return {};
  };
};

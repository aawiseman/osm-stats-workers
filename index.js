var Promise = require('bluebird');
var getHashtags = require('./src/common/get_hashtags.js');

var calculateMetrics = require('./src/calculate_metrics');

var User = require('./src/models/User');
var Changeset = require('./src/models/Changeset');
var Hashtag = require('./src/models/Hashtag');
var Country = require('./src/models/Country');

var Worker = function (loggingFn) {
  loggingFn = loggingFn || function (data) { console.log('>', data); };
  this.bookshelf = require('./src/common/bookshelf_init');
  this.logger = loggingFn;
};

Worker.prototype.destroy = function () {
  return this.bookshelf.knex.destroy();
};

Worker.prototype.addToDB = function (changeset) {
  var component = this;
  var metrics = {};

  return this.bookshelf.transaction(function (t) {
    return Changeset.where({id: changeset.metadata.id}).fetch({transacting: t}).then(function (result) {
      if (result) {
        return ('Changeset ' + changeset.metadata.id + ' already in database');
      } else {
        metrics = calculateMetrics(changeset);
        if (metrics.id) {
          var hashtags = getHashtags(changeset.metadata.comment);
          return User.createUserIfNotExists(metrics.user, t)
          .then(function (user) {
            return Promise.join(
              Changeset.createChangesetIfNotExists(metrics, t),
              Hashtag.createHashtags(hashtags, t),
              Country.query('where', 'name', 'in', metrics.countries).fetch({transacting: t}),
              function (changeset, hashtags, countries) {
                return changeset.hashtags().attach(hashtags, {transacting: t})
                  .then(function () {
                    return changeset.countries().attach(countries, {transacting: t});
                  })
                  .then(function () {
                    return user.updateUserMetrics(metrics.metrics, metrics.user.geo_extent, t);
                  });
              })
              .then(function (user) {
                return Promise.join(
                  user.getNumCountries(t),
                  user.getHashtags(t),
                  user.getTimestamps(t),
                  function (numCountries, hashtags, timestamps) {
                    metrics.metrics.numCountries = numCountries;
                    metrics.metrics.hashtags = hashtags;
                    metrics.metrics.timestamps = timestamps;
                    return user.updateBadges(metrics.metrics, t);
                  });
              });
          });
        } else {
          return ('No tracked changes in changeset ' + changeset.metadata.id);
        }
      } // else
    }); // Changeset.where
  })
  .catch(function (err) {
    component.logger(err, changeset);
    return Promise.reject(err);
  });
};

module.exports = Worker;

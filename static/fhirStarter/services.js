angular.module('fhirStarter').factory('fhirSettings', function($rootScope, oauth2) {

  var servers = [
    {
      name: 'Local FHIR dev server, oauth',
      serviceUrl: 'http://localhost:9080',
      auth: {
        type: 'oauth2',
      }
    }, {
      name: "SMART on FHIR (smartplatforms.org)",
      serviceUrl: "https://fhir-api.smartplatforms.org",
      auth: {
        type: "basic",
        username: "client",
        password: "secret"
      }
    }, {
      name: 'SMART on FHIR (fhir.me)',
      serviceUrl: 'https://api.fhir.me',
      auth: {
        type: 'basic',
        username: 'client',
        password: 'secret'
      }
    }, {
      name: 'Health Intersections Server (Grahame)',
      serviceUrl: 'http://fhir.healthintersections.com.au/open/',
      auth: {
        type: 'none'
      }
    }, {
      name: 'Furore Server (Ewout)',
      serviceUrl: 'http://spark.furore.com/fhir',
      auth: {
        type: 'none'
      }
    }, {
      name: 'Local FHIR dev server, basic auth',
      serviceUrl: 'http://localhost:9080',
      auth: {
        type: 'basic',
        username: 'client',
        password: 'secret'
      }
    }, {
      name: 'Local FHIR dev server, no auth',
      serviceUrl: 'http://localhost:9080',
      auth: {
        type: 'none'
      }
    }
  ];

  var settings = localStorage.fhirSettings ? 
  JSON.parse(localStorage.fhirSettings) : servers[0];

  return {
    servers: servers,
    get: function(){return settings;},
    set: function(s){
      settings = s;
      localStorage.fhirSettings = JSON.stringify(settings);
      $rootScope.$emit('new-settings');
    }
  }

});

angular.module('fhirStarter').factory('oauth2', function($rootScope, $location) {

  var authorizing = false;

  return {
    authorizing: function(){
      return authorizing;
    },
    authorize: function(s){
      var thisUri = window.location.origin + window.location.pathname +'/';
      thisUrl = thisUri.replace(/\/+$/, "/");
      // TODO : remove registration step
      var client = {
        "client_id": "fhir_starter",
        "redirect_uri": thisUrl,
        "scope":  "smart/orchestrate_launch user/*.*"
      };
      authorizing = true;
      FHIR.oauth2.authorize({
        client: client,
        server: s.serviceUrl,
        from: $location.url()
      });
    }
  };

});

angular.module('fhirStarter').factory('patientSearch', function($route, $routeParams, $location, $window, $rootScope, $q, fhirSettings, oauth2) {

  console.log('initialzing pt search service');
  var smart;
  var didOauth = false;

  function  getClient(){
    if ($routeParams.code){
      FHIR.oauth2.ready($routeParams, function(smartNew){
        smart = smartNew;
        window.smaht = smart;
        didOauth = true;
        $rootScope.$emit('new-client');
      });
    } else if (!didOauth && $routeParams.iss){
      oauth2.authorize({
        "name": "OAuth server issuing launch context request",
        "serviceUrl": decodeURIComponent($routeParams.iss),
        "auth": {
          "type": "oauth2"
        }
      });
    } else if (fhirSettings.get().auth && fhirSettings.get().auth.type == 'oauth2'){
      oauth2.authorize(fhirSettings.get());
    } else {
      smart = new FHIR.client(fhirSettings.get());
      $rootScope.$emit('new-client');
    }
  }
  
   function onNewClient(){
      if (smart && smart.state && smart.state.from !== undefined){
        console.log(smart, 'back to from', smart.state.from);
        $location.url(smart.state.from);
        $rootScope.$digest();
      }
   }

  $rootScope.$on('$routeChangeSuccess', function (scope, next, current) {
    console.log('route changed', scope, next, current);
    console.log('so params', $routeParams);
    if (current === undefined) {
      getClient();
    }
  });

  $rootScope.$on('new-client', onNewClient);

  $rootScope.$on('new-settings', function(e){
    getClient()
  });


  var currentSearch;
  var pages = [];
  var atPage;

  return {
    atPage: function(){
      return atPage;
    },

    registerContext: function(app, params){
      d = $q.defer();

      var req =smart.authenticated({
        url: smart.server.serviceUrl + '/_services/smart/Launch',
        type: 'POST',
        contentType: "application/json",
        data: JSON.stringify({
          client_id: app.client_id,
          parameters:  params
        })
      });

      $.ajax(req)
      .done(d.resolve)
      .fail(d.reject);

      return d.promise;
    },

    search: function(p){
      d = $q.defer();
      if (!smart){
        d.resolve([]);
        return d.promise;
      };
      smart.api.Patient.where
      .nameAll(p.tokens)
      ._count(10)
      ._sortAsc("family")
      ._sortAsc("given")
      .search()
      .done(function(r, search){
        currentSearch = search;
        atPage = 0;
        pages = [r];
        d.resolve(r)
        $rootScope.$digest();
      }).fail(function(){
        $rootScope.$emit('error', 'Search failed (see console)');
        console.log("Search failed.");
        console.log(arguments);
        $rootScope.$digest();
      });
      return d.promise;
    },

    previous: function(p){
      atPage -= 1;
      return pages[atPage];
    },

    next: function(p){
      atPage++;

      d = $q.defer();

      if (pages.length > atPage) {
        d.resolve(pages[atPage]);
      } else {

        currentSearch.next().done(function(r){
          pages.push(r);
          d.resolve(r);
          $rootScope.$digest();
        });
      }

      return d.promise;
    },
    getOne: function(pid){
      // If it's already in our resource cache, return it.
      // Otherwise fetch a new copy and return that.
      d = $q.defer();
      var p = smart.cache.get({resource:'Patient', id:pid});
      if (p !== null) {
        d.resolve(p);
        return d.promise;
      }
      smart.api.Patient.read(pid).done(function(p){
        d.resolve(p);
        $rootScope.$digest();
      });
      return d.promise;
    },
    smart: function(){
      return smart;
    },
    getClient: getClient
  };
});

angular.module('fhirStarter').factory('random', function() {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return function randomString(length) {
    var result = '';
    for (var i = length; i > 0; --i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    return result;
  }
});

angular.module('fhirStarter').factory('patient', function() {
  return {
    id: function(p){
      return p.resourceId;
    },
    name: function(p){
      var name = p && p.name && p.name[0];
      if (!name) return null;

      return name.given.join(" ") + " " + name.family.join(" ");
    }
  };
});

angular.module('fhirStarter').factory('app', ['$http',function($http) {
  var apps = $http.get('fhirStarter/apps.json');
  return apps;
}]);



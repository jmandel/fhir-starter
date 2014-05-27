angular.module('fhirStarter').factory('fhirSettings', function($rootScope, oauth2) {

  var servers = [
    {
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
      serviceUrl: 'http://hl7connect.healthintersections.com.au/svc/fhir',
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
      name: 'Local FHIR dev server with auth',
      serviceUrl: 'http://localhost:8080',
      auth: {
        type: 'oauth2',
      }
    },  {
      name: 'Local FHIR dev server',
      serviceUrl: 'http://localhost:8001',
      auth: {
        type: 'basic',
        username: 'client',
        password: 'secret'
      }
    }, {
      name: 'Local FHIR Tomcat server',
      serviceUrl: 'http://localhost:8080/fhir-server',
      auth: {
        type: 'basic',
        username: 'client',
        password: 'secret'
      }
    }];

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

angular.module('fhirStarter').factory('oauth2', function() {

  return {
    authorize: function(s){
      // TODO : remove registration step
      var client = {
        "client_id": "fhir_starter",
        "redirect_uri": window.location.origin + window.location.pathname +'/',
        "scope":  "smart/orchestrate_launch user/*.*"
      };

      FHIR.oauth2.authorize({
        client: client,
        server: s.serviceUrl
      });
    }
  };

});

angular.module('fhirStarter').factory('patientSearch', function($rootScope, $q, fhirSettings, oauth2) {

  var smart;

  function  getClient(){

    if (window.initialHash !== undefined && window.initialHash != "" && !(window.initialHash.match(new RegExp('^%23%2Fui')))){
      FHIR.oauth2.ready(decodeURIComponent(window.initialHash),
      function(smartNew){
        delete window.initialHash;
        smart = smartNew;
        window.smaht = smart;
        $rootScope.$emit('new-client');
      });
    } else {

      if (fhirSettings.get().auth.type == 'oauth2'){
        oauth2.authorize(fhirSettings.get());
      }

      smart = new FHIR.client(fhirSettings.get());
      $rootScope.$emit('new-client');
    }
  }

  getClient();
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
    }
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

angular.module('fhirStarter').factory('app', ['$resource',function($resource) {
  var apps = $resource('fhirStarter/apps.json');
  return apps;
}]);



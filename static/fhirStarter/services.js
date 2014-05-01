angular.module('fhirStarter').factory('fhirSettings', function($rootScope) {

  var servers = [{
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

angular.module('fhirStarter').factory('patientSearch', function($rootScope, $q, fhirSettings) {

  var smart;

  function  setup(){
    smart = new FHIR.client(fhirSettings.get());
  }

  setup();

  $rootScope.$on('new-settings', function(e){
    setup()
  });


  var currentSearch;
  var pages = [];
  var atPage;

  return {
    atPage: function(){
      return atPage;
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
    }  
  };
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
  return {
    getApps: function(){
      return [
        {
          "client_name": "Cardiac Risk",
          "launch_uri": "./apps/cardiac-risk/launch.html",
          "logo_uri": "http://smartplatforms.org/wp-content/uploads/2012/09/cardiac-risk-216x300.png"
        }, {
          "client_name": "Growth Chart",
          "launch_uri": "./apps/growth-chart/launch.html",
          "logo_uri": "http://smartplatforms.org/wp-content/uploads/pgc-male-healthyweight-os.png"
        }, {
          "client_name": "BP Centiles",
          "launch_uri": "./apps/bp-centiles/launch.html",
          "logo_uri": "http://vectorblog.org/wp-content/uploads/2012/09/BP-Centiles-screengrab-300x211.jpg"
        } 
      ]
    }
  };
}]);



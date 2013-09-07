angular.module('fhirStarter').factory('fhirSettings', function($rootScope) {

  var servers = [{
    name: 'Health Intersections Server (Grahame)',
    serviceUrl: 'http://hl7connect.healthintersections.com.au/svc/fhir',
    auth: {
      type: 'none'
    }
  }, {
    name: 'Furore Server (Ewout)',
    serviceUrl: 'http://fhir.furore.com/fhir',
    auth: {
      type: 'none'
    }
  }, {
    name: 'Local FHIR dev server',
    serviceUrl: 'http://localhost:9090/fhir',
    auth: {
      type: 'basic',
      username: 'client',
      password: 'secret'
    }
  }, {
    name: 'Local FHIR Tomcat server',
    serviceUrl: 'http://localhost:8080/fhir-server/fhir',
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
      console.log("set called on", s);
      settings = s;
      localStorage.fhirSettings = JSON.stringify(settings);
      $rootScope.$emit('new-settings');
    }
  }

});

angular.module('fhirStarter').factory('patientSearch', function($rootScope, $q, fhirSettings) {

  var fhir;

  function  setup(){
    console.log("Create new fhir client object", fhirSettings.get());
    fhir = new FhirClient(fhirSettings.get());
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
      fhir.search({
        resource: 'patient',
        searchTerms: {name: p.tokens.map(function(t){return '"'+t+'"'}), sort: "family"},
        count: 10
      }).done(function(r, search){
        currentSearch = search;
        atPage = 0;
        pages = [r];
        d.resolve(r)
        $rootScope.$digest();
      }).fail(function(){
        console.log(arguments);
        alert("Search failed.");
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
      return fhir.resources.get({resource: 'patient', id: pid})
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
      if (!name) return "Nameless";

      return name.given.join(" ") + " " + name.family.join(" ");
    }
  };
});

angular.module('fhirStarter').factory('user', function() {
  return {
    getPatients: function(){
      return $.ajax({
        url:publicUri+"/internal/getPatients/"+user._id, 
        dataType:"json"
      });
    },
    getAuthorizations: function(){
      return $.ajax({
        url:publicUri+"/internal/getAuthorizations/"+user._id, 
        dataType:"json"
      });
    }
  };
});

angular.module('fhirStarter').factory('app', ['$http',function($http) {
  return {
    getApps: function(){
      return [
        {
          "client_name": "Growth-tastic",
          "client_uri": "http://growth.bluebuttonpl.us",
          "launch_uri": "http://localhost:3000/launch",
          "logo_uri": "http://growth.bluebuttonpl.us/static/growth_charts/img/icon.png",
          "contacts": [ "info@growth.bluebuttonpl.us" ],
          "redirect_uris": [ "http://growth-pull.bluebuttonpl.us/static/growth_charts/" ],
            "response_types": ["token"],
            "grant_types": ["implicit"],
            "token_endpoint_auth_method": "none",
            "scope":  "summary"
        }  
      ]
    }
  };
}]);


